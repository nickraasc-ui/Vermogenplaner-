// Wealth projection. Every position, property and loan is tracked individually, so that
//  - properties appreciate on their full value (not only on the equity),
//  - loan repayments (Tilgung) show up as falling debt, i.e. as wealth,
//  - the savings rate is invested according to the savings distribution (Sparraten-Verteilung),
//  - year 0 equals the net worth shown in the header.
// Rates are annual percentages compounded monthly: (1 + r/1200)^12 per year.
import { CY } from "../constants.js";
import { kestRate, computeRemDebt, ownerShare } from "./finance.js";
import { balloonInYear } from "./loan.js";
import { matchesOwnerFilter, profileAge } from "./schema.js";

const ABGELTUNG = 0.26375; // 25 % + Soli

/**
 * Net annual return in % of one position after tax (if enabled).
 * Distributions (yieldPct) are paid out into the cash flow, so only capital growth compounds here.
 */
export function netAnnualReturn(a, s, adj) {
  const pretaxR  = (s.classReturns?.[a.class] ?? 5) + adj;
  const capApprR = pretaxR - (a.yieldPct || 0);
  const kest     = s.taxOnReturns ? kestRate(a) : 0;
  let r = capApprR > 0 ? capApprR * (1 - kest) : capApprR; // losses are not tax-reduced
  // Vorabpauschale drag for accumulating ETFs (yieldPct = 0)
  if (s.taxOnReturns && (a.yieldPct || 0) === 0 && a.class.includes("ETF")) {
    const bz = (s.basiszins ?? 2.29) / 100;
    const tf = a.class === "Aktien-ETF" ? 0.7 : 1.0; // Teilfreistellung
    r -= bz * 0.7 * tf * ABGELTUNG * 100;
  }
  return r;
}

const monthly = (annualPct) => annualPct / 100 / 12;
const growth12 = (rm) => Math.pow(1 + rm, 12);
// Future value after 12 months of a 1 €/month contribution
const annuityFactor = (rm) => rm !== 0 ? (growth12(rm) - 1) / rm : 12;

/**
 * Lump-sum drains/inflows from scenarios for a calendar year (positive = money out).
 * One-off expenses and inflows fire in their target year; yearly/monthly expenses from the target year to endsAt.
 * A target age is converted with the profile's age (s.birthYear), independent of the owner filter.
 */
export function bucketDrain(s, year, profileAge) {
  let d = 0;
  (s.buckets || []).filter(b => b.active !== false).forEach(b => {
    if (b.kind === "finanziert" || b.kind === "sparrate") return; // handled in the cash flow
    const ty = b.year ? +b.year : b.age ? CY + (+b.age - profileAge) : CY;
    if (b.kind === "zufluss") { if (year === ty) d -= b.amount || 0; return; }
    const inRange = year >= ty && (!b.endsAt || year <= +b.endsAt);
    if (b.frequency === "jaehrlich") { if (inRange) d += b.amount || 0; return; }
    if (b.frequency === "monatlich") { if (inRange) d += (b.amount || 0) * 12; return; }
    if (year === ty) d += b.amount || 0; // einmalig
  });
  return d;
}

/**
 * @param {object} ctx
 * @param {object} ctx.s                 profile state
 * @param {object[]} ctx.projAssets      owner- and class-filtered assets
 * @param {string[]} ctx.ownerFilter
 * @param {boolean} ctx.includeStandaloneLoans  false while an asset-class filter is active
 * @param {{cls:string, monthly:number}[]} ctx.sparDist  savings distribution (today)
 * @param {(y:number)=>object} ctx.computeCF   cash flow for year offset y
 * @param {number} ctx.currentAge
 */
export function projectWealth({ s, projAssets, ownerFilter, includeStandaloneLoans, sparDist, computeCF, currentAge }) {
  const sh = (a) => ownerShare(a, ownerFilter);
  const horizon = s.horizon;

  // ── Positions ────────────────────────────────────────────────────────────
  const isBuffer = (a) => a.isHaushaltsPuffer && a.class === "Cash";
  const portfolioAssets = projAssets.filter(a => a.class !== "Immobilien" && a.class !== "Forderung" && !isBuffer(a));
  const properties      = projAssets.filter(a => a.class === "Immobilien");
  const receivables     = projAssets.filter(a => a.class === "Forderung");
  const bufferAssets    = projAssets.filter(isBuffer);

  // Loans: asset-backed (scaled by ownership share) and standalone (owner-filtered, full amount)
  const loans = [
    ...projAssets.filter(a => a.class !== "Forderung" && (a.debt || 0) > 0).map(a => ({ loan: a, share: sh(a) })),
    ...(includeStandaloneLoans ? (s.standaloneLoans || []) : [])
      .filter(l => (l.debt || 0) > 0 && matchesOwnerFilter(l, ownerFilter))
      .map(l => ({ loan: l, share: 1 })),
  ];
  const debtAt = (y) => loans.reduce((t, { loan, share }) => t + computeRemDebt(loan, y) * share, 0);
  // Interest-only loans are repaid in one sum at maturity — from the portfolio
  const balloonAt = (y) => loans.reduce((t, { loan, share }) => t + balloonInYear(loan, y - 1) * share, 0);

  // Receivables (Forderung) shrink by their repayments, which flow into the cash flow as income
  const receivableOne = (a, y) => {
    const D = (a.value || 0) * sh(a), r = (a.loanRate || 0) / 1200, M = (a.monthlyRepayment || 0) * sh(a), mo = y * 12;
    if (r > 0 && M > 0) return Math.max(0, D * Math.pow(1 + r, mo) - M * (Math.pow(1 + r, mo) - 1) / r);
    return M > 0 ? Math.max(0, D - M * mo) : D;
  };
  const receivableAt = (y) => receivables.reduce((t, a) => t + receivableOne(a, y), 0);
  receivableAt.one = receivableOne;

  // ── Savings allocation: class shares from the savings distribution ──────
  const distTotal = sparDist.reduce((t, d) => t + (d.monthly || 0), 0);
  const classShares = distTotal > 0
    ? sparDist.filter(d => d.monthly > 0).map(d => ({ cls: d.cls, share: d.monthly / distTotal }))
    : [{ cls: "Aktien-ETF", share: 1 }]; // nothing investable yet → invest like a world ETF

  const cashRm = monthly(s.classReturns?.["Cash"] ?? 2);

  // record = true stores a per-position breakdown for every year (used by CSV export and future snapshots)
  const runScenario = (adj, record = false) => {
    // One pot per portfolio position; virtual pots for classes that receive savings but hold no position yet
    const pots = portfolioAssets.map(a => ({ id: a.id, cls: a.class, locked: !!a.locked, v: (a.value || 0) * sh(a), rm: monthly(netAnnualReturn(a, s, adj)) }));
    classShares.forEach(({ cls }) => {
      if (!pots.some(p => p.cls === cls && !p.locked))
        pots.push({ cls, locked: false, v: 0, rm: monthly(netAnnualReturn({ class: cls, yieldPct: 0, tax: { taxType: "abgeltung" } }, s, adj)), virtual: true });
    });
    const props = properties.map(a => ({ id: a.id, cls: a.class, v: (a.value || 0) * sh(a), g12: growth12(monthly(netAnnualReturn(a, s, adj))) }));
    let bufferV = bufferAssets.reduce((t, a) => t + (a.value || 0) * sh(a), 0);

    // Money in (inflows) follows the savings shares; money out is taken pro rata to current values
    const invest = (amount) => classShares.forEach(({ cls, share }) => {
      const targets = pots.filter(p => p.cls === cls && !p.locked);
      const tv = targets.reduce((t, p) => t + p.v, 0);
      targets.forEach(p => { p.v += amount * share * (tv > 0 ? p.v / tv : 1 / targets.length); });
    });
    // Withdrawals: liquid, unlocked positions first, "Sonstiges" (e.g. a boat) only if those are exhausted,
    // locked positions never. A shortfall beyond that is not modelled (wealth cannot go below the untouched pots).
    const withdrawFrom = (group, amount) => {
      const tv = group.reduce((t, p) => t + Math.max(0, p.v), 0);
      if (tv <= 0 || amount <= 0) return amount;
      const take = Math.min(amount, tv), f = take / tv;
      group.forEach(p => { p.v = Math.max(0, p.v - Math.max(0, p.v) * f); });
      return amount - take;
    };
    const withdraw = (amount) => {
      const rest = withdrawFrom(pots.filter(p => !p.locked && p.cls !== "Sonstiges"), amount);
      withdrawFrom(pots.filter(p => !p.locked && p.cls === "Sonstiges"), rest);
    };
    const total = (y) => pots.reduce((t, p) => t + p.v, 0) + props.reduce((t, p) => t + p.v, 0)
      + bufferV + receivableAt(y) - debtAt(y);

    const bufferV0 = bufferV;
    const breakdown = [];
    const snapshot = (y) => {
      if (!record) return;
      const values = {}, debts = {}, byClass = {};
      const add = (id, cls, v) => { values[id] = (values[id] || 0) + v; byClass[cls] = (byClass[cls] || 0) + v; };
      pots.forEach(p => add(p.id || "virtual:" + p.cls, p.cls, p.v));
      props.forEach(p => add(p.id, p.cls, p.v));
      bufferAssets.forEach(a => add(a.id, a.class, bufferV0 > 0 ? bufferV * (a.value || 0) * sh(a) / bufferV0 : 0));
      receivables.forEach(a => add(a.id, a.class, receivableAt.one(a, y)));
      let standaloneDebt = 0;
      loans.forEach(({ loan, share }) => {
        const d = computeRemDebt(loan, y) * share;
        if (loan.class) { debts[loan.id] = d; byClass[loan.class] = (byClass[loan.class] || 0) - d; }
        else standaloneDebt += d;
      });
      breakdown.push({ values, debts, standaloneDebt, byClass });
    };

    const vals = [total(0)];
    snapshot(0);
    for (let y = 1; y <= horizon; y++) {
      const { sp, deficitMonthly, bufferContribMonthly } = computeCF(y);

      // 1. Growth plus monthly savings, split by the savings distribution
      pots.forEach(p => { p.v *= growth12(p.rm); });
      classShares.forEach(({ cls, share }) => {
        const targets = pots.filter(p => p.cls === cls && !p.locked);
        const tv = targets.reduce((t, p) => t + p.v, 0);
        targets.forEach(p => { p.v += sp * share * (tv > 0 ? p.v / tv : 1 / targets.length) * annuityFactor(p.rm); });
      });
      props.forEach(p => { p.v *= p.g12; });

      // 2. Household buffer earns the cash rate and covers deficits first
      const annualDeficit = deficitMonthly * 12;
      bufferV = bufferV * growth12(cashRm) + bufferContribMonthly * 12;
      const fromBuffer = Math.min(bufferV, annualDeficit);
      bufferV -= fromBuffer;

      // 3. Remaining deficit, scenario payments and loan balloons come out of the portfolio; inflows go in
      const outflow = (annualDeficit - fromBuffer) + bucketDrain(s, CY + y, profileAge(s)) + balloonAt(y);
      if (outflow > 0) withdraw(outflow); else if (outflow < 0) invest(-outflow);

      vals.push(total(y));
      snapshot(y);
    }
    return record ? { vals, breakdown } : vals;
  };

  const consVals = runScenario(-(s.projSpreadCons ?? 2));
  const { vals: baseVals, breakdown } = runScenario(0, true);
  const optVals  = runScenario(+(s.projSpreadOpt ?? 2));

  const projection = Array.from({ length: horizon + 1 }, (_, y) => {
    const { sp } = computeCF(y);
    let cons = consVals[y], base = baseVals[y], opt = optVals[y];
    if (s.inflationAdj) {
      const inf = Math.pow(1 + s.inflation / 100, y);
      cons /= inf; base /= inf; opt /= inf;
    }
    return { age: currentAge + y, sp: Math.round(sp), cons: Math.round(cons), base: Math.round(base), opt: Math.round(opt), debt: Math.round(debtAt(y)), breakdown: breakdown[y] };
  });

  const cashflowProjection = Array.from({ length: horizon + 1 }, (_, y) => ({ year: CY + y, age: currentAge + y, ...computeCF(y) }));

  return { projection, cashflowProjection };
}
