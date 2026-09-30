// Pure derivations of a profile state. Moved verbatim from AppInner.jsx (no behaviour change).
import { LIQUIDITY_DEFAULT, CY } from "../constants.js";
import { ownerShare, yearsUntilPaidOff } from "./finance.js";
import { cashflowAt } from "./cashflow.js";
import { projectWealth } from "./projection.js";

/**
 * Computes every derived figure the UI shows for one profile state.
 * @param {object} s               profile state (see README → Datenmodell)
 * @param {object} opts
 * @param {string[]} opts.ownerFilter      selected owner ids ([] = all)
 * @param {string[]} opts.projClassFilter  asset classes included in the projection ([] = all)
 */
export function deriveAll(s, { ownerFilter = [], projClassFilter = [] } = {}) {
  const currentAge = (() => {
    if (ownerFilter.length === 1) {
      const o = (s.owners||[]).find(o => o.id === ownerFilter[0]);
      if (o?.birthYear) return CY - o.birthYear;
    }
    return CY - (s.birthYear || CY - 35);
  })();

  const filteredAssets = (() => {
    if (ownerFilter.length === 0) return s.assets;
    return s.assets.filter(a => {
      const ownership = a.ownership || (a.owner ? [{ ownerId: a.owner }] : []);
      return ownership.some(o => ownerFilter.includes(o.ownerId));
    });
  })();

  const filteredIncomeStreams = (ownerFilter.length === 0
      ? (s.incomeStreams||[])
      : (s.incomeStreams||[]).filter(st => !st.owner || ownerFilter.includes(st.owner)));

  const projAssets = (projClassFilter.length === 0 ? filteredAssets : filteredAssets.filter(a => projClassFilter.includes(a.class)));

  // Current month's split of each loan payment into interest and repayment (Tilgung)
  const loanSummary = (() => {
    const row = (l, share, extra = {}) => {
      const annuitat = (l.loanAnnuitat||0) * share;
      const zinsen   = (l.debt||0) * (l.loanRate||0) / 1200 * share;
      const loanType = l.loanType || "annuitat";
      const tilgung  = loanType === "endfaellig" ? 0 : Math.max(0, annuitat - zinsen);
      return { id:l.id, name:l.name, loanType, debt:(l.debt||0)*share, annuitat, tilgung, zinsen, yrsLeft: yearsUntilPaidOff(l), ...extra };
    };
    const fromAssets = filteredAssets.filter(a => (a.debt||0) > 0).map(a => row(a, ownerShare(a, ownerFilter)));
    const fromStandalone = (s.standaloneLoans||[])
      .filter(l => ownerFilter.length === 0 || !l.owner || ownerFilter.includes(l.owner))
      .map(l => row(l, 1, { standalone:true }));
    return [...fromAssets, ...fromStandalone];
  })();

  const totalMonthlyLoanPayment = (loanSummary.reduce((t, l) => t + l.annuitat, 0));

  const cfNow = cashflowAt(0, { s, assets: filteredAssets, incomeStreams: filteredIncomeStreams, ownerFilter });
  const cf = {
    ...cfNow,
    eff: cfNow.sp,
    saldo: cfNow.avail - cfNow.bound - cfNow.sp,
    quote: cfNow.avail > 0 ? (cfNow.sp / cfNow.avail) * 100 : 0,
    // Buffer balance from flagged Cash assets
    bufferBalance: filteredAssets.filter(a => a.isHaushaltsPuffer && a.class === "Cash").reduce((t, a) => t + (a.value||0), 0),
  };

  const agg = (() => {
    let gross = 0, debt = 0;
    const byClass = {}, byLiquidity = { "Liquide":0, "Semi-liquide":0, "Illiquide":0 };
    filteredAssets.forEach(a => {
      const sh = ownerShare(a, ownerFilter);
      const v = (a.value||0) * sh, d = (a.debt||0) * sh;
      gross += v; debt += d;
      const net = v - d;
      byClass[a.class] = (byClass[a.class]||0) + net;
      const liq = a.liquidity || LIQUIDITY_DEFAULT[a.class] || "Semi-liquide";
      byLiquidity[liq] = (byLiquidity[liq]||0) + net;
    });
    // Standalone loans reduce net worth (no corresponding asset value)
    (s.standaloneLoans||[])
      .filter(l => ownerFilter.length === 0 || !l.owner || ownerFilter.includes(l.owner))
      .forEach(l => { debt += l.debt || 0; });
    const totalNet = gross - debt;
    let wavg = 0;
    if (totalNet > 0) Object.entries(byClass).forEach(([cls, val]) => { if (val > 0) wavg += (val/totalNet)*(s.classReturns[cls]||0); });
    return { gross, debt, net:totalNet, byClass, byLiquidity, wavgReturn:wavg };
  })();

  const sparDist = (() => {
    const shS = (a) => ownerShare(a, ownerFilter);
    const investable = filteredAssets.filter(a => !a.locked && a.class!=="Cash" && a.class!=="Immobilien" && a.class!=="Forderung" && a.class!=="Sonstiges");
    const total = investable.reduce((t, a) => t+(a.value||0)*shS(a), 0) || 1;

    // Active Einnahmenänderung scenarios for current year
    const activeSparScn = (s.buckets||[]).filter(b => {
      if (b.active === false || b.type !== "Sparrate") return false;
      const from = +(b.startsAt||CY), to = b.endsAt ? +b.endsAt : Infinity;
      return CY >= from && CY <= to;
    });

    // Base sparrate before scenario deltas
    const baseEff = cf.eff - (cf.scnSpDelta||0);

    // Base allocation by class
    const byClass = {};
    if (s.sparDistMode === "manual") {
      Object.entries(s.manualSparDist||{}).forEach(([cls, amt]) => {
        if ((amt||0) > 0) byClass[cls] = (byClass[cls]||0) + (+amt||0);
      });
    } else {
      investable.forEach(a => {
        const wt = (a.value||0)*shS(a)/total;
        byClass[a.class] = (byClass[a.class]||0) + baseEff * wt;
      });
    }

    // Add scenario deltas by their own spartopf settings
    activeSparScn.forEach(b => {
      const delta = +b.delta||0;
      if (b.spartopfMode === "manuell" && b.spartopfAmounts) {
        Object.entries(b.spartopfAmounts).forEach(([cls, amt]) => {
          byClass[cls] = (byClass[cls]||0) + (+amt||0);
        });
      } else {
        investable.forEach(a => {
          const wt = (a.value||0)*shS(a)/total;
          byClass[a.class] = (byClass[a.class]||0) + delta * wt;
        });
      }
    });

    const totalEff = cf.eff || 1;
    return Object.entries(byClass)
      .filter(([, v]) => (v||0) > 0)
      .map(([cls, monthly]) => ({ cls, share: monthly/totalEff, monthly }));
  })();

  // Cash flow for year offset y over the projection's assets (class filter applies)
  const computeCF = (y) => {
    const c = cashflowAt(y, { s, assets: projAssets, incomeStreams: filteredIncomeStreams, ownerFilter });
    return {
      inc: c.streamIncome, streamExp: c.streamExpense, immoGross: c.immoGross, immoRunning: c.immoRunning, immoAnnu: c.immoAnnuitat,
      immoNetCF: c.immoNetCF, fordInc: c.forderungIncome, runCosts: c.assetRunningCosts, otherAnnu: c.otherAnnuitat,
      assetYield: c.assetYieldIncome, financed: c.scnFinanced, spDelta: c.scnSpDelta, avail: c.avail, bound: c.bound,
      sp: c.sp, deficitMonthly: c.deficitMonthly, bufferContribMonthly: c.effectiveBufferContrib,
    };
  };

  const { projection, cashflowProjection } = projectWealth({
    s, projAssets, ownerFilter, sparDist, computeCF, currentAge,
    includeStandaloneLoans: projClassFilter.length === 0,
  });

  return { currentAge, filteredAssets, filteredIncomeStreams, projAssets, loanSummary, totalMonthlyLoanPayment, cf, agg, sparDist, projection, cashflowProjection };
}
