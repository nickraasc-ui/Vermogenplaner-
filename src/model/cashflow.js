// Monthly household cash flow for one year of the plan — the single implementation used
// both for "today" (Haushalt tab, header Sparquote) and for every projected year.
import { IMMO_CF_GROSS, IMMO_HAUSGELD, IMMO_GRUNDSTEUER, CY } from "../constants.js";
import { kestRate, computeRemDebt, ownerShare } from "./finance.js";

const activeInYear = (st, year) => year >= (st.startsAt || CY) && (!st.endsAt || year <= st.endsAt);
const ownerMatches = (ownerFilter, owner) => ownerFilter.length === 0 || !owner || ownerFilter.includes(owner);

/** Financed scenarios pay their monthly rate from financingStart for ceil(months/12) years. */
export const isFinancingActive = (b, year) => {
  if (b.fundingMode !== "financed") return false;
  const sy = +(b.financingStart || b.year || CY);
  return year >= sy && year < sy + Math.ceil((+b.financingMonths || 12) / 12);
};

/** "Einnahmenänderung" scenarios change the savings rate between startsAt and endsAt (inclusive). */
export const isSavingsChangeActive = (b, year) => {
  if (b.type !== "Sparrate") return false;
  const from = +(b.startsAt || CY), to = b.endsAt ? +b.endsAt : Infinity;
  return year >= from && year <= to;
};

/**
 * Cash flow for year offset y (0 = current year). All amounts are € per month.
 * @param {number} y
 * @param {object} ctx  { s, assets, incomeStreams, ownerFilter } — assets/streams already owner-filtered
 */
export function cashflowAt(y, { s, assets, incomeStreams, ownerFilter }) {
  const year = CY + y;
  const sh = (a) => ownerShare(a, ownerFilter);
  const rentGrowth = s.immoRentGrowthPct || 0;
  const activeB = (s.buckets || []).filter(b => b.active !== false);

  // Income streams grow from their start year
  const streamIncome = incomeStreams
    .filter(st => activeInYear(st, year))
    .reduce((t, st) => t + (st.amount || 0) * Math.pow(1 + (st.growthPct || 0) / 100, Math.max(0, year - (st.startsAt || CY))), 0);
  const expenseStreams = (s.expenseStreams || []).filter(st => activeInYear(st, year) && ownerMatches(ownerFilter, st.owner));
  const streamExpense = expenseStreams.reduce((t, st) => t + (st.amount || 0), 0);

  // Real estate: rent (with rent growth) − running costs − loan payments while the loan is outstanding
  const immoAssets   = assets.filter(a => a.class === "Immobilien");
  const immoGross    = immoAssets.reduce((t, a) => t + (a.monthlyRent || IMMO_CF_GROSS) * Math.pow(1 + rentGrowth / 100, y) * sh(a), 0);
  const immoRunning  = immoAssets.reduce((t, a) => t + ((a.hausgeld || IMMO_HAUSGELD) + (a.grundsteuer || IMMO_GRUNDSTEUER)) * sh(a), 0);
  const immoAnnuitat = immoAssets.filter(a => (a.debt || 0) > 0)
    .reduce((t, a) => t + (computeRemDebt(a, y) > 0 ? (a.loanAnnuitat || 0) * sh(a) : 0), 0);
  const immoNetCF    = immoGross - immoRunning - immoAnnuitat;

  const forderungIncome   = assets.filter(a => a.class === "Forderung").reduce((t, a) => t + (a.monthlyRepayment || 0) * sh(a), 0);
  const assetRunningCosts = assets.filter(a => a.class !== "Immobilien" && (a.monthlyRunningCost || 0) > 0)
    .reduce((t, a) => t + (a.monthlyRunningCost || 0) * sh(a), 0);
  const otherAnnuitat = assets.filter(a => a.class !== "Immobilien" && a.class !== "Forderung" && (a.debt || 0) > 0)
      .reduce((t, a) => t + (computeRemDebt(a, y) > 0 ? (a.loanAnnuitat || 0) * sh(a) : 0), 0)
    + (s.standaloneLoans || []).filter(l => ownerMatches(ownerFilter, l.owner))
      .reduce((t, l) => t + (computeRemDebt(l, y) > 0 ? (l.loanAnnuitat || 0) : 0), 0);

  // Distributions (dividends, coupons): paid on the projected value; capital growth excludes the yield
  const yieldAssets = assets.filter(a => (a.yieldPct || 0) > 0 && a.class !== "Immobilien" && a.class !== "Forderung");
  const projValue = (a) => {
    const capR = (s.classReturns[a.class] ?? 5) - (a.yieldPct || 0);
    return (a.value || 0) * sh(a) * Math.pow(1 + capR / 100, y);
  };
  const grossYield = yieldAssets.reduce((t, a) => t + projValue(a) * (a.yieldPct || 0) / 100 / 12, 0);
  let assetYieldIncome = grossYield;
  if (s.taxOnReturns && grossYield > 0) {
    const afterTax = yieldAssets.reduce((t, a) => t + projValue(a) * (a.yieldPct || 0) / 100 / 12 * (1 - kestRate(a)), 0);
    // Sparer-Pauschbetrag: sum over all owners (default 1.000 € per person)
    const totalPauschbetrag = (s.owners || []).reduce((t, o) => t + (o.tax?.sparerpauschbetrag || 0), 0);
    const avgKest = (grossYield - afterTax) / grossYield;
    assetYieldIncome = afterTax + Math.min(grossYield, totalPauschbetrag / 12) * avgKest;
  }

  // Scenarios
  const scnFinancedItems = activeB.filter(b => isFinancingActive(b, year));
  const scnSpItems       = activeB.filter(b => isSavingsChangeActive(b, year));
  const scnFinanced = scnFinancedItems.reduce((t, b) => t + (+b.monthlyPayment || 0), 0);
  const scnSpDelta  = scnSpItems.reduce((t, b) => t + (b.delta || 0), 0);

  const avail = streamIncome + immoNetCF + forderungIncome + assetYieldIncome;
  const bound = streamExpense + otherAnnuitat + assetRunningCosts + scnFinanced;
  const rest  = avail - bound;

  // Savings rate: auto = everything left over; manual = target (optionally growing), capped at the surplus
  let effTarget = null, sp;
  if (s.autoSpar) {
    sp = Math.max(0, rest + scnSpDelta);
  } else {
    const base = (s.manuellSparrate || 0) + scnSpDelta;
    effTarget = Math.max(0, s.sparRateGrowth ? base * Math.pow(1 + (s.sparGrowthPct || 0) / 100, y) : base);
    sp = Math.min(effTarget, Math.max(0, rest));
  }

  // Buffer contributions are expenses that flow into the Haushaltspuffer instead of being consumed
  const bufferContribMonthly = expenseStreams.filter(st => st.isBufferContribution).reduce((t, st) => t + (st.amount || 0), 0);
  const nonBufferBound = bound - bufferContribMonthly;
  const effectiveBufferContrib = Math.min(bufferContribMonthly, Math.max(0, avail - nonBufferBound));
  const deficitMonthly = Math.max(0, nonBufferBound - avail);

  return {
    year, avail, bound, rest, sp, effTarget, deficitMonthly,
    bufferContribMonthly, effectiveBufferContrib,
    streamIncome, streamExpense, immoGross, immoRunning, immoAnnuitat, immoNetCF,
    forderungIncome, assetRunningCosts, otherAnnuitat, assetYieldIncome,
    scnFinanced, scnSpDelta, scnFinancedItems, scnSpItems,
  };
}
