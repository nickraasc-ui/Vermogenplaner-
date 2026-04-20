import { useState, useMemo, useEffect, useCallback } from "react";
import { DARK, LIGHT } from "./theme.js";
import { IMMO_CF_GROSS, IMMO_HAUSGELD, IMMO_GRUNDSTEUER, LIQUIDITY_DEFAULT, CY } from "./constants.js";
import { saveState, loadProfileState } from "./storage.js";
import { fmtE } from "./components/ui.jsx";
import TabDashboard     from "./components/TabDashboard.jsx";
import TabHaushalt      from "./components/TabHaushalt.jsx";
import TabVermogen      from "./components/TabVermogen.jsx";
import TabProjektion    from "./components/TabProjektion.jsx";
import TabBuckets       from "./components/TabBuckets.jsx";
import CheckinModal     from "./components/modals/CheckinModal.jsx";
import SnapshotModal    from "./components/modals/SnapshotModal.jsx";
import AffordModal      from "./components/modals/AffordModal.jsx";
import AssetModal       from "./components/modals/AssetModal.jsx";
import BucketModal      from "./components/modals/BucketModal.jsx";
import OwnerModal       from "./components/modals/OwnerModal.jsx";
import IncomeStreamModal    from "./components/modals/IncomeStreamModal.jsx";
import ExpenseStreamModal   from "./components/modals/ExpenseStreamModal.jsx";
import ImportPreviewModal   from "./components/modals/ImportPreviewModal.jsx";

const TABS = [
  { k:"dashboard",  lbl:"Übersicht"  },
  { k:"haushalt",   lbl:"Haushalt"   },
  { k:"vermogen",   lbl:"Vermögen"   },
  { k:"projektion", lbl:"Projektion" },
  { k:"buckets",    lbl:"Szenarien"  },
];

// Default KeSt rate by asset class (after Teilfreistellung where applicable)
const KEST_RATES = {
  "Aktien":         0.2638, // 26.375% voll
  "Aktien-ETF":     0.1846, // 30% Teilfreistellung → 26.375% × 0.7
  "Anleihen":       0.2638,
  "Anleihen-ETF":   0.1846,
  "Immobilien":     0.0,    // 10-Jahres-Regel vereinfacht
  "Cash":           0.2638,
  "Rohstoffe":      0.2638,
  "Krypto":         0.2638,
  "Private Equity": 0.1583, // Teileinkünfteverfahren: 60% × 26.375%
  "Forderung":      0.2638,
  "Sonstiges":      0.2638,
};

// tax.taxType per asset overrides the class default when set explicitly
const KEST_BY_TAX_TYPE = {
  "abgeltung":      null,   // → use class default
  "teileinkuenfte": 0.1583, // Teileinkünfteverfahren: 60% × 26.375%
  "immobilien":     0.0,
  "steuerfrei":     0.0,
};

// Effective KeSt rate for one asset: taxType overrides class default
const kestRate = (a) => {
  const byType = KEST_BY_TAX_TYPE[a.tax?.taxType];
  if (byType !== null && byType !== undefined) return byType;
  return KEST_RATES[a.class] ?? 0.2638;
};

// Remaining debt at year y, using exact amortization schedule per loan type
const computeRemDebt = (a, y) => {
  const D = a.debt || 0;
  if (!D) return 0;
  const mo = y * 12;
  const loanType = a.loanType || "annuitat";
  const r = (a.loanRate || 0) / 1200; // monthly rate
  const M = a.loanAnnuitat || 0;
  const n = (a.loanTermYears || 0) * 12; // total months in term

  if (loanType === "endfaellig") {
    // Interest-only: principal stays constant until term end
    return n > 0 && mo >= n ? 0 : D;
  }
  // Annuität / Volltilger: standard amortization formula
  if (r > 0 && M > 0) {
    return Math.max(0, D * Math.pow(1 + r, mo) - M * (Math.pow(1 + r, mo) - 1) / r);
  }
  // Legacy fallback: linear decay via loanTilgung
  const til = a.loanTilgung || 0;
  return til > 0 ? Math.max(0, D - til * 12 * y) : D;
};

// Returns combined ownership share for filtered owners (1.0 if no filter)
const ownerShare = (asset, ownerFilter) => {
  if (ownerFilter.length === 0) return 1;
  const ownership = asset.ownership || (asset.owner ? [{ ownerId: asset.owner, share: 1 }] : []);
  return ownership.filter(o => ownerFilter.includes(o.ownerId)).reduce((t, o) => t + (o.share || 0), 0);
};

export default function AppInner({ profileId, darkMode: initialDark, onBack }) {
  const LS_KEY = "wealth-pwa-v3-" + profileId;
  const [s, setS]         = useState(() => loadProfileState(profileId, initialDark));
  const [tab, setTab]     = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [ownerFilter, setOwnerFilter]         = useState([]);
  const [projClassFilter, setProjClassFilter] = useState([]);
  const T = s.dark ? DARK : LIGHT;
  const currentAge = CY - (s.birthYear || CY - 35);

  useEffect(() => { saveState(s, LS_KEY); }, [s, LS_KEY]);

  const upd      = useCallback(patch => setS(p => ({ ...p, ...patch })), []);
  const updArr   = useCallback((key, arr) => setS(p => ({ ...p, [key]: arr })), []);
  const updClass = useCallback((cls, val) => setS(p => ({ ...p, classReturns: { ...p.classReturns, [cls]: val } })), []);
  const toggleOwner     = useCallback(id  => setOwnerFilter(prev => prev.includes(id)  ? prev.filter(x => x !== id)  : [...prev, id]), []);
  const toggleProjClass = useCallback(cls => setProjClassFilter(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]), []);

  const filteredAssets = useMemo(() => {
    if (ownerFilter.length === 0) return s.assets;
    return s.assets.filter(a => {
      const ownership = a.ownership || (a.owner ? [{ ownerId: a.owner }] : []);
      return ownership.some(o => ownerFilter.includes(o.ownerId));
    });
  }, [s.assets, ownerFilter]);

  const filteredIncomeStreams = useMemo(() =>
    ownerFilter.length === 0
      ? (s.incomeStreams||[])
      : (s.incomeStreams||[]).filter(st => !st.owner || ownerFilter.includes(st.owner)),
    [s.incomeStreams, ownerFilter]
  );

  const projAssets = useMemo(() =>
    projClassFilter.length === 0 ? filteredAssets : filteredAssets.filter(a => projClassFilter.includes(a.class)),
    [filteredAssets, projClassFilter]
  );

  const loanSummary = useMemo(() =>
    filteredAssets.filter(a => (a.debt||0) > 0).map(a => {
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
    }), [filteredAssets, ownerFilter]);

  const totalMonthlyLoanPayment = useMemo(() =>
    loanSummary.reduce((t, l) => t + l.annuitat, 0), [loanSummary]);

  const cf = useMemo(() => {
    const sh = (a) => ownerShare(a, ownerFilter);
    const immoAssets    = filteredAssets.filter(a => a.class === "Immobilien");
    const immoGross     = immoAssets.reduce((t, a) => t + (a.monthlyRent||IMMO_CF_GROSS)*sh(a), 0);
    const immoRunning   = immoAssets.reduce((t, a) => t + ((a.hausgeld||IMMO_HAUSGELD)+(a.grundsteuer||IMMO_GRUNDSTEUER))*sh(a), 0);
    const immoAnnuitat  = immoAssets.filter(a => (a.debt||0)>0).reduce((t, a) => t+(a.loanAnnuitat||0)*sh(a), 0);
    const otherAnnuitat = filteredAssets.filter(a => a.class!=="Immobilien" && a.class!=="Forderung" && (a.debt||0)>0).reduce((t, a) => t+(a.loanAnnuitat||0)*sh(a), 0);
    const forderungIncome   = filteredAssets.filter(a => a.class==="Forderung").reduce((t, a) => t+(a.monthlyRepayment||0)*sh(a), 0);
    const assetRunningCosts = filteredAssets.filter(a => a.class!=="Immobilien" && (a.monthlyRunningCost||0)>0).reduce((t, a) => t+(a.monthlyRunningCost||0)*sh(a), 0);
    const immoNetCF = immoGross - immoAnnuitat - immoRunning;

    // Ausschüttungsrenditen: Dividenden, Kupons, Distributions (nicht Immo/Forderung — die haben eigene CF-Felder)
    const assetYieldIncome = filteredAssets
      .filter(a => (a.yieldPct||0) > 0 && a.class !== "Immobilien" && a.class !== "Forderung")
      .reduce((t, a) => t + (a.value||0) * (a.yieldPct||0) / 100 / 12 * (s.taxOnReturns ? (1 - kestRate(a)) : 1) * sh(a), 0);

    const streamIncome = filteredIncomeStreams
      .filter(st => CY >= (st.startsAt||CY) && (!st.endsAt || CY <= st.endsAt))
      .reduce((t, st) => t + (st.amount||0)*Math.pow(1+(st.growthPct||0)/100, Math.max(0, CY-(st.startsAt||CY))), 0);
    const streamExpense = (s.expenseStreams||[])
      .filter(st => CY >= (st.startsAt||CY) && (!st.endsAt || CY <= st.endsAt))
      .filter(st => ownerFilter.length === 0 || !st.owner || ownerFilter.includes(st.owner))
      .reduce((t, st) => t+(st.amount||0), 0);

    // Active scenario effects for current year
    const activeB = (s.buckets||[]).filter(b => b.active !== false);
    const scnFinanced = activeB.reduce((t, b) => {
      if (b.fundingMode !== "financed") return t;
      const sy = +(b.financingStart||b.year||CY);
      return CY >= sy && CY < sy + Math.ceil((+b.financingMonths||12)/12) ? t + (+b.monthlyPayment||0) : t;
    }, 0);
    const scnSpDelta = activeB.filter(b => b.type === "Sparrate").reduce((t, b) => {
      const from = +(b.startsAt||CY), to = b.endsAt ? +b.endsAt : Infinity;
      return CY >= from && CY <= to ? t + (b.delta||0) : t;
    }, 0);
    // Active finanziert scenarios (for display)
    const scnFinancedItems = activeB.filter(b => {
      if (b.fundingMode !== "financed") return false;
      const sy = +(b.financingStart||b.year||CY);
      return CY >= sy && CY < sy + Math.ceil((+b.financingMonths||12)/12);
    });
    // Active Einnahmenänderung scenarios (for display)
    const scnSpItems = activeB.filter(b => {
      if (b.type !== "Sparrate") return false;
      const from = +(b.startsAt||CY), to = b.endsAt ? +b.endsAt : Infinity;
      return CY >= from && CY <= to;
    });

    // Buffer contributions: expense streams that flow into the Haushaltspuffer instead of being consumed
    const bufferContribMonthly = (s.expenseStreams||[])
      .filter(st => st.isBufferContribution && CY >= (st.startsAt||CY) && (!st.endsAt || CY <= st.endsAt))
      .filter(st => ownerFilter.length === 0 || !st.owner || ownerFilter.includes(st.owner))
      .reduce((t, st) => t + (st.amount||0), 0);

    const avail = streamIncome + immoNetCF + forderungIncome + assetYieldIncome;
    const bound = streamExpense + otherAnnuitat + assetRunningCosts + scnFinanced;
    const rest  = avail - bound;
    const eff   = s.autoSpar ? Math.max(0, rest + scnSpDelta) : Math.max(0, (s.manuellSparrate||0) + scnSpDelta);
    const saldo = avail - bound - eff;
    const quote = avail > 0 ? (eff / avail) * 100 : 0;
    // Deficit: only fires for real expense shortfall, not for buffer contributions (those go to buffer)
    const nonBufferBound = bound - bufferContribMonthly;
    const deficitMonthly = Math.max(0, nonBufferBound - avail);
    // Buffer balance from flagged Cash assets
    const bufferBalance = filteredAssets
      .filter(a => a.isHaushaltsPuffer && a.class === "Cash")
      .reduce((t, a) => t + (a.value||0), 0);
    return { avail, bound, rest, eff, saldo, quote, deficitMonthly, bufferContribMonthly, bufferBalance, immoNetCF, immoGross, immoRunning, immoAnnuitat, otherAnnuitat, forderungIncome, assetRunningCosts, streamIncome, streamExpense, assetYieldIncome, scnFinanced, scnSpDelta, scnFinancedItems, scnSpItems };
  }, [filteredAssets, filteredIncomeStreams, s.expenseStreams, s.autoSpar, s.manuellSparrate, s.buckets, ownerFilter]);

  const agg = useMemo(() => {
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
    const totalNet = gross - debt;
    let wavg = 0;
    if (totalNet > 0) Object.entries(byClass).forEach(([cls, val]) => { if (val > 0) wavg += (val/totalNet)*(s.classReturns[cls]||0); });
    return { gross, debt, net:totalNet, byClass, byLiquidity, wavgReturn:wavg };
  }, [filteredAssets, s.classReturns, ownerFilter]);

  const sparDist = useMemo(() => {
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
  }, [filteredAssets, s.sparDistMode, s.manualSparDist, s.buckets, cf.eff, cf.scnSpDelta, ownerFilter]);

  const { projection, cashflowProjection } = useMemo(() => {
    const rentGrowth = s.immoRentGrowthPct || 0;
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

    const nonImmoLoans = projAssets
      .filter(a => a.class!=="Immobilien" && a.class!=="Forderung" && (a.debt||0)>0 && (a.loanAnnuitat||0)>0)
      .map(a => {
        const loanType = a.loanType || "annuitat";
        const yrsLeft = loanType === "endfaellig"
          ? (a.loanTermYears || null)
          : (a.loanTilgung||0) > 0 ? (a.debt||0)/((a.loanTilgung||0)*12) : (a.loanTermYears || null);
        return { a, annuitat:(a.loanAnnuitat||0)*sh(a), yrsLeft };
      });

    // Returns all cashflow components for year y — single source of truth for both projection and export
    const computeCF = (y) => {
      const absYear = CY + y;
      const activeB = (s.buckets||[]).filter(b => b.active !== false);

      const inc = filteredIncomeStreams
        .filter(st => absYear >= (st.startsAt||CY) && (!st.endsAt || absYear <= st.endsAt))
        .reduce((t, st) => t + (st.amount||0)*Math.pow(1+(st.growthPct||0)/100, Math.max(0, absYear-(st.startsAt||CY))), 0);
      const streamExp = (s.expenseStreams||[])
        .filter(st => absYear >= (st.startsAt||CY) && (!st.endsAt || absYear <= st.endsAt))
        .filter(st => ownerFilter.length === 0 || !st.owner || ownerFilter.includes(st.owner))
        .reduce((t, st) => t+(st.amount||0), 0);
      const financed = activeB.reduce((t, b) => {
        if (b.fundingMode !== "financed") return t;
        const sy = +(b.financingStart||b.year||CY);
        return absYear >= sy && absYear < sy+Math.ceil((+b.financingMonths||12)/12) ? t+(+b.monthlyPayment||0) : t;
      }, 0);
      const spDelta = activeB.filter(b => b.type === "Sparrate").reduce((t, b) => {
        const from = +(b.startsAt||CY), to = b.endsAt ? +b.endsAt : Infinity;
        return absYear >= from && absYear <= to ? t + (b.delta||0) : t;
      }, 0);

      const immoAssets   = projAssets.filter(a => a.class==="Immobilien");
      const immoGross    = immoAssets.reduce((t, a) => t+(a.monthlyRent||IMMO_CF_GROSS)*Math.pow(1+rentGrowth/100, y)*sh(a), 0);
      const immoRunning  = immoAssets.reduce((t, a) => t+((a.hausgeld||IMMO_HAUSGELD)+(a.grundsteuer||IMMO_GRUNDSTEUER))*sh(a), 0);
      const immoAnnu     = immoAssets.filter(a => (a.debt||0)>0).reduce((t, a) =>
        t + (computeRemDebt(a, y) > 0 ? (a.loanAnnuitat||0)*sh(a) : 0), 0);
      const immoNetCF    = immoGross - immoRunning - immoAnnu;
      const fordInc      = fordAssets.reduce((t, a) => t+(a.monthlyRepayment||0)*sh(a), 0);
      const runCosts     = projAssets.filter(a => a.class!=="Immobilien" && (a.monthlyRunningCost||0)>0).reduce((t, a) => t+(a.monthlyRunningCost||0)*sh(a), 0);
      const otherAnnu    = projAssets.filter(a => a.class!=="Immobilien" && a.class!=="Forderung" && (a.debt||0)>0).reduce((t, a) =>
        t + (computeRemDebt(a, y) > 0 ? (a.loanAnnuitat||0)*sh(a) : 0), 0);
      const assetYield   = projAssets
        .filter(a => (a.yieldPct||0) > 0 && a.class !== "Immobilien" && a.class !== "Forderung")
        .reduce((t, a) => {
          // Asset grows at capital-appreciation rate (total return minus distributed yield)
          const capR = (s.classReturns[a.class] ?? 5) - (a.yieldPct||0);
          const projValue = (a.value||0) * sh(a) * Math.pow(1 + capR / 100, y);
          return t + projValue * (a.yieldPct||0) / 100 / 12 * (s.taxOnReturns ? (1 - kestRate(a)) : 1);
        }, 0);

      const avail = inc + immoNetCF + fordInc + assetYield;
      const bound = streamExp + runCosts + otherAnnu + financed;

      let sp;
      if (!s.autoSpar) {
        const freed = nonImmoLoans.filter(l => l.yrsLeft !== null && y >= l.yrsLeft).reduce((t, l) => t+l.annuitat, 0);
        const base  = (s.manuellSparrate||0) + freed + spDelta;
        sp = Math.max(0, s.sparRateGrowth ? base*Math.pow(1+(s.sparGrowthPct||0)/100, y) : base);
      } else {
        sp = Math.max(0, avail + spDelta - bound);
      }

      const bufferContribMonthly = (s.expenseStreams||[])
        .filter(st => st.isBufferContribution && absYear >= (st.startsAt||CY) && (!st.endsAt || absYear <= st.endsAt))
        .filter(st => ownerFilter.length === 0 || !st.owner || ownerFilter.includes(st.owner))
        .reduce((t, st) => t + (st.amount||0), 0);
      const nonBufferBound = bound - bufferContribMonthly;
      // Effective buffer contribution: capped by income surplus over non-buffer expenses
      const effectiveBufferContrib = Math.min(bufferContribMonthly, Math.max(0, avail - nonBufferBound));
      const deficitMonthly = Math.max(0, nonBufferBound - avail);
      return { inc, streamExp, immoGross, immoRunning, immoAnnu, immoNetCF, fordInc, runCosts, otherAnnu, assetYield, financed, spDelta, avail, bound, sp, deficitMonthly, bufferContribMonthly: effectiveBufferContrib };
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
        const netAnnR  = capApprR * (1 - kest);
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
  }, [s, projAssets, filteredIncomeStreams, currentAge, ownerFilter]);

  const final  = projection[projection.length-1] || {};
  const lastCI = useMemo(() => [...(s.checkins||[])].sort((a,b) => b.month.localeCompare(a.month))[0] ?? null, [s.checkins]);
  const snaps  = useMemo(() =>
    [...(s.snapshots||[])].sort((a,b) => a.date.localeCompare(b.date)).map(sn => ({ ...sn, value:sn.totalNet??sn.value })), [s.snapshots]);

  const chipStyle = (active) => ({
    fontSize:8, padding:"2px 9px", borderRadius:10,
    border:"1px solid "+(active ? T.accent : T.border),
    background: active ? T.accent+"22" : "transparent",
    color: active ? T.accent : T.textMid,
    cursor:"pointer", fontWeight: active ? 700 : 500,
    WebkitTapHighlightColor:"transparent",
  });

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"system-ui,-apple-system,'Helvetica Neue',sans-serif", paddingBottom:"calc(64px + env(safe-area-inset-bottom,0px))", transition:"background 0.2s,color 0.2s" }}>

      {modal?.type==="checkin"       && <CheckinModal       s={s} cf={cf} T={T} setModal={setModal} updArr={updArr} cashflowProjection={cashflowProjection} initialYear={modal.year} />}
      {modal?.type==="snapshot"      && <SnapshotModal      s={s} cf={cf} agg={agg} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="afford"        && <AffordModal        s={s} cf={cf} agg={agg} final={final} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="asset"         && <AssetModal         data={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="bucket"        && <BucketModal        data={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="owner"         && <OwnerModal         s={s} T={T} setModal={setModal} upd={upd} updArr={updArr} />}
      {modal?.type==="incomeStream"  && <IncomeStreamModal  data={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="expenseStream"  && <ExpenseStreamModal  data={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="importPreview"  && <ImportPreviewModal  preview={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}

      <div style={{ background:T.header, borderBottom:"1px solid "+T.tabBorder, padding:"14px 16px 10px", paddingTop:"calc(14px + env(safe-area-inset-top,0px))", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, flex:1, minWidth:0 }}>
            {onBack && <button onClick={onBack} style={{ background:"none", border:"none", color:T.textMid, cursor:"pointer", fontSize:22, lineHeight:1, padding:"3px 0", WebkitTapHighlightColor:"transparent" }}>←</button>}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:8, letterSpacing:"0.22em", color:T.textDim, fontWeight:700, textTransform:"uppercase" }}>Vermögensplaner</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:10, marginTop:2 }}>
                <div style={{ fontSize:22, fontWeight:900, color:T.text, letterSpacing:"-0.02em" }}>{fmtE(agg.net)}</div>
                <div style={{ fontSize:11, color:cf.quote>=20?T.green:cf.quote>=10?T.amber:T.red, fontWeight:700 }}>{cf.quote.toFixed(1)}% Sparquote</div>
              </div>
              <div style={{ fontSize:9, color:T.textDim, marginTop:1 }}>Gew. Ø-Rendite: {agg.wavgReturn.toFixed(1)}%{s.taxOnReturns ? " (nach KeSt)" : ""}</div>
              {s.owners?.length > 0 && (
                <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:7 }}>
                  <button onClick={() => setOwnerFilter([])} style={chipStyle(ownerFilter.length===0)}>Alle</button>
                  {s.owners.map(o => (
                    <button key={o.id} onClick={() => toggleOwner(o.id)} style={chipStyle(ownerFilter.includes(o.id))}>{o.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={() => upd({ dark:!s.dark })}
            style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:20, padding:"6px 12px", cursor:"pointer", fontSize:13, color:T.textMid, WebkitTapHighlightColor:"transparent", marginTop:4, flexShrink:0 }}>
            {s.dark ? "Light" : "Dark"}
          </button>
        </div>
      </div>

      <div style={{ padding:"14px 14px 4px", maxWidth:600, margin:"0 auto" }}>
        {tab==="dashboard"  && <TabDashboard  s={s} T={T} setModal={setModal} setTab={setTab} agg={agg} cf={cf} loanSummary={loanSummary} lastCI={lastCI} snaps={snaps} totalMonthlyLoanPayment={totalMonthlyLoanPayment} projection={projection} final={final} currentAge={currentAge} />}
        {tab==="haushalt"   && <TabHaushalt   s={s} T={T} upd={upd} updArr={updArr} setModal={setModal} cf={cf} sparDist={sparDist} ownerFilter={ownerFilter} filteredAssets={filteredAssets} cashflowProjection={cashflowProjection} />}
        {tab==="vermogen"   && <TabVermogen   s={s} T={T} updClass={updClass} updArr={updArr} setModal={setModal} agg={agg} filteredAssets={filteredAssets} ownerFilter={ownerFilter} />}
        {tab==="projektion" && <TabProjektion s={s} T={T} upd={upd} cf={cf} agg={agg} projection={projection} final={final} loanSummary={loanSummary} setModal={setModal} projClassFilter={projClassFilter} toggleProjClass={toggleProjClass} resetProjClass={() => setProjClassFilter([])} availClasses={[...new Set(filteredAssets.map(a => a.class))]} currentAge={currentAge} cashflowProjection={cashflowProjection} />}
        {tab==="buckets"    && <TabBuckets    s={s} T={T} upd={upd} updArr={updArr} setModal={setModal} agg={agg} final={final} currentAge={currentAge} />}
      </div>

      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:T.tabBar, borderTop:"1px solid "+T.tabBorder, display:"flex", zIndex:50, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
        {TABS.map(({ k, lbl }) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex:1, padding:"10px 4px 8px", border:"none", cursor:"pointer", background:"transparent", color:tab===k?T.accent:T.textLow, display:"flex", flexDirection:"column", alignItems:"center", gap:3, borderTop:"2px solid "+(tab===k?T.accent:"transparent"), WebkitTapHighlightColor:"transparent", transition:"color 0.15s" }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.04em" }}>{lbl}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
