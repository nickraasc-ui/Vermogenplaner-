// Pure derivations of a profile state. Moved verbatim from AppInner.jsx (no behaviour change).
import { LIQUIDITY_DEFAULT, CY } from "../constants.js";
import { KEST_RATES, kestRate, computeRemDebt, ownerShare } from "./finance.js";
import { cashflowAt } from "./cashflow.js";

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

  const loanSummary = (() => {
    const fromAssets = filteredAssets.filter(a => (a.debt||0) > 0).map(a => {
      const sh = ownerShare(a, ownerFilter);
      const annuitat = (a.loanAnnuitat||0) * sh;
      const tilgung  = (a.loanTilgung||0)  * sh;
      const zinsen   = annuitat - tilgung;
      const loanType = a.loanType || "annuitat";
      const yrsLeft  = loanType === "endfaellig"
        ? (a.loanTermYears || null)
        : (a.loanTilgung||0) > 0
          ? Math.ceil((a.debt||0) / ((a.loanTilgung||0)*12))
          : (a.loanTermYears || null);
      return { id:a.id, name:a.name, loanType, debt:(a.debt||0)*sh, annuitat, tilgung, zinsen, yrsLeft };
    });
    const fromStandalone = (s.standaloneLoans||[])
      .filter(l => ownerFilter.length === 0 || !l.owner || ownerFilter.includes(l.owner))
      .map(l => {
        const annuitat = l.loanAnnuitat || 0;
        const zinsen   = (l.debt||0) * (l.loanRate||0) / 100 / 12;
        const tilgung  = Math.max(0, annuitat - zinsen);
        const loanType = l.loanType || "annuitat";
        const yrsLeft  = loanType === "endfaellig"
          ? (l.loanTermYears || null)
          : tilgung > 0
            ? Math.ceil((l.debt||0) / (tilgung * 12))
            : (l.loanTermYears || null);
        return { id:l.id, name:l.name, loanType, debt:l.debt||0, annuitat, tilgung, zinsen, yrsLeft, standalone:true };
      });
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

  const { projection, cashflowProjection } = (() => {
    const sh = (a) => ownerShare(a, ownerFilter);

    // Forderung: track declining principal balance per year to prevent double-counting with V0
    const fordBalance = (a, y) => {
      const D = (a.value||0) * sh(a);
      const r = (a.loanRate||0) / 1200;
      const M = (a.monthlyRepayment||0) * sh(a);
      const mo = y * 12;
      if (r > 0 && M > 0) return Math.max(0, D * Math.pow(1+r, mo) - M * (Math.pow(1+r,mo)-1)/r);
      return M > 0 ? Math.max(0, D - M * mo) : D;
    };
    const fordAssets = projAssets.filter(a => a.class === "Forderung");
    const totalFordBal = (y) => fordAssets.reduce((t, a) => t + fordBalance(a, y), 0);


    // Returns all cashflow components for year y — single source of truth for both projection and export
    const computeCF = (y) => {
      const c = cashflowAt(y, { s, assets: projAssets, incomeStreams: filteredIncomeStreams, ownerFilter });
      return {
        inc: c.streamIncome, streamExp: c.streamExpense, immoGross: c.immoGross, immoRunning: c.immoRunning, immoAnnu: c.immoAnnuitat,
        immoNetCF: c.immoNetCF, fordInc: c.forderungIncome, runCosts: c.assetRunningCosts, otherAnnu: c.otherAnnuitat,
        assetYield: c.assetYieldIncome, financed: c.scnFinanced, spDelta: c.scnSpDelta, avail: c.avail, bound: c.bound,
        sp: c.sp, deficitMonthly: c.deficitMonthly, bufferContribMonthly: c.effectiveBufferContrib,
      };
    };

    // Fixed: default ty to CY so buckets without year/age still fire; respect endsAt for recurring types
    const bucketDrain = (year) => {
      let d = 0;
      (s.buckets||[]).filter(b => b.active !== false).forEach(b => {
        if (b.fundingMode === "financed") return;
        if (b.type === "Sparrate") return;
        const ty = b.year ? +b.year : b.age ? CY+(+b.age-currentAge) : CY;
        const sign = b.type === "Zufluss" ? -1 : 1;
        if (b.type==="Einmalig" || b.type==="Zufluss") { if (year===ty) d += sign*(b.amount||0); return; }
        if (b.type==="Jährlich" || b.type==="Jahrlich") {
          if (year>=ty && (!b.endsAt || year<=+b.endsAt)) d += b.amount||0; return;
        }
        if (b.type==="Monatlich" && year>=ty && (!b.endsAt || year<=+b.endsAt)) d += (b.amount||0)*12;
      });
      return d;
    };

    // Haushaltspuffer: tracked separately (Cash asset flagged isHaushaltsPuffer)
    const bufferAssets = projAssets.filter(a => a.isHaushaltsPuffer && a.class === "Cash");
    const bufferV0 = bufferAssets.reduce((t, a) => t + (a.value||0)*sh(a), 0);

    // V0: investable assets only — Forderung + buffer tracked separately
    const V0_invest = projAssets.reduce((t, a) => {
      if (a.class === "Forderung") return t;
      if (a.isHaushaltsPuffer) return t; // buffer tracked separately
      const share = sh(a);
      if (a.class === "Immobilien") return t + Math.max(0, (a.value||0) - (a.debt||0)) * share;
      return t + (a.value||0) * share;
    }, 0);
    const V0 = V0_invest + bufferV0 + totalFordBal(0);

    // Blended net annual return rate — buffer excluded (earns Cash rate separately)
    const computeBlendedRM = (adj) => {
      let totalV = 0, wtdR = 0;
      projAssets.forEach(a => {
        if (a.class === "Forderung") return;
        if (a.isHaushaltsPuffer) return;
        const share = sh(a);
        const netV = (a.class === "Immobilien"
          ? Math.max(0, (a.value||0) - (a.debt||0))
          : (a.value||0)) * share;
        if (netV <= 0) return;
        const pretaxR  = (s.classReturns[a.class] ?? 5) + adj;
        const capApprR = pretaxR - (a.yieldPct||0);
        const kest     = s.taxOnReturns ? kestRate(a) : 0;
        // FIX: Verluste werden nicht steuerlich reduziert (keine KeSt auf negative KWS)
        let netAnnR = capApprR > 0 ? capApprR * (1 - kest) : capApprR;
        // Vorabpauschale-Drag für thesaurierende ETFs (yieldPct=0)
        if (s.taxOnReturns && (a.yieldPct||0) === 0 && a.class.includes("ETF")) {
          const bz = (s.basiszins ?? 2.29) / 100;
          const tf = a.class === "Aktien-ETF" ? 0.7 : 1.0; // Teilfreistellung
          netAnnR -= bz * 0.7 * tf * 0.26375 * 100; // jährl. %-Drag
        }
        totalV += netV;
        wtdR   += netV * netAnnR;
      });
      if (totalV === 0) {
        const def = ((s.classReturns?.["Aktien-ETF"] ?? 8) + adj) * (s.taxOnReturns ? (1-KEST_RATES["Aktien-ETF"]) : 1);
        return def / 100 / 12;
      }
      return (wtdR / totalV) / 100 / 12;
    };

    const cashRm  = (s.classReturns?.["Cash"] ?? 2) / 100 / 12;
    const cashG12 = Math.pow(1 + cashRm, 12);

    const runScenario = (adj) => {
      const rm  = computeBlendedRM(adj);
      const g12 = Math.pow(1 + rm, 12);
      const spF = rm !== 0 ? (g12 - 1) / rm : 12;
      let V_invest = V0_invest;
      let bufferV  = bufferV0;
      const vals = [V0];
      for (let y = 1; y <= s.horizon; y++) {
        const { sp, deficitMonthly, bufferContribMonthly } = computeCF(y);
        const bucketD = bucketDrain(CY + y);
        const annualDeficit = deficitMonthly * 12;

        // Buffer grows with Cash return + contributions; covers deficit before V_invest
        bufferV = bufferV * cashG12 + bufferContribMonthly * 12;
        const bufferDrain = Math.min(bufferV, annualDeficit);
        const investDrain = annualDeficit - bufferDrain;
        bufferV = Math.max(0, bufferV - bufferDrain);

        V_invest = Math.max(0, V_invest * g12 + sp * spF - investDrain - bucketD);
        vals.push(V_invest + bufferV + totalFordBal(y));
      }
      return vals;
    };

    const consVals = runScenario(-(s.projSpreadCons ?? 2));
    const baseVals = runScenario(0);
    const optVals  = runScenario(+(s.projSpreadOpt  ?? 2));

    const projection = Array.from({ length: s.horizon+1 }, (_, y) => {
      const { sp } = computeCF(y);
      let cons = consVals[y], base = baseVals[y], opt = optVals[y];
      if (s.inflationAdj) {
        const inf = Math.pow(1 + s.inflation/100, y);
        cons /= inf; base /= inf; opt /= inf;
      }
      return { age: currentAge + y, sp: Math.round(sp), cons: Math.round(cons), base: Math.round(base), opt: Math.round(opt) };
    });

    const cashflowProjection = Array.from({ length: s.horizon+1 }, (_, y) => {
      const row = computeCF(y);
      return { year: CY + y, age: currentAge + y, ...row };
    });

    return { projection, cashflowProjection };
  })();

  return { currentAge, filteredAssets, filteredIncomeStreams, projAssets, loanSummary, totalMonthlyLoanPayment, cf, agg, sparDist, projection, cashflowProjection };
}
