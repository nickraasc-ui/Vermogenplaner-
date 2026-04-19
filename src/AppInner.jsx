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
      .reduce((t, st) => t+(st.amount||0), 0);

    const avail = streamIncome + immoNetCF + forderungIncome + assetYieldIncome;
    const bound = streamExpense + otherAnnuitat + assetRunningCosts;
    const rest  = avail - bound;
    const eff   = s.autoSpar ? Math.max(0, rest) : (s.manuellSparrate||0);
    const saldo = avail - bound - eff;
    const quote = avail > 0 ? (eff / avail) * 100 : 0;
    return { avail, bound, rest, eff, saldo, quote, immoNetCF, immoGross, immoRunning, immoAnnuitat, otherAnnuitat, forderungIncome, assetRunningCosts, streamIncome, streamExpense, assetYieldIncome };
  }, [filteredAssets, filteredIncomeStreams, s.expenseStreams, s.autoSpar, s.manuellSparrate, ownerFilter]);

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
    if (s.sparDistMode === "manual") {
      return Object.entries(s.manualSparDist)
        .filter(([, amt]) => (amt||0) > 0)
        .map(([cls, monthly]) => ({ cls, share: cf.eff > 0 ? monthly/cf.eff : 0, monthly }));
    }
    const investable = filteredAssets.filter(a => !a.locked && a.class!=="Cash" && a.class!=="Immobilien" && a.class!=="Forderung" && a.class!=="Sonstiges");
    const total = investable.reduce((t, a) => t+(a.value||0), 0) || 1;
    const byClass = {};
    investable.forEach(a => { byClass[a.class] = (byClass[a.class]||0)+(a.value||0); });
    return Object.entries(byClass).map(([cls, val]) => ({ cls, share:val/total, monthly:cf.eff*(val/total) }));
  }, [filteredAssets, s.sparDistMode, s.manualSparDist, cf.eff]);

  const projection = useMemo(() => {
    const investable  = projAssets.filter(a => !a.locked && a.class!=="Cash" && a.class!=="Immobilien" && a.class!=="Forderung" && a.class!=="Sonstiges");
    const invTotal    = investable.reduce((t, a) => t+(a.value||0), 0) || 1;
    const classTotals = {};
    investable.forEach(a => { classTotals[a.class] = (classTotals[a.class]||0)+(a.value||0); });
    const hasAnyInvestable = filteredAssets.some(a => !a.locked && a.class!=="Cash" && a.class!=="Immobilien" && a.class!=="Forderung" && a.class!=="Sonstiges");
    const sp0 = cf.eff || 0;
    const rentGrowth = s.immoRentGrowthPct || 0;

    const nonImmoLoans = projAssets
      .filter(a => a.class!=="Immobilien" && a.class!=="Forderung" && (a.debt||0)>0 && (a.loanAnnuitat||0)>0)
      .map(a => {
        const loanType = a.loanType || "annuitat";
        const yrsLeft = loanType === "endfaellig"
          ? (a.loanTermYears || null)
          : (a.loanTilgung||0) > 0 ? (a.debt||0)/((a.loanTilgung||0)*12) : (a.loanTermYears || null);
        return { a, annuitat:a.loanAnnuitat, yrsLeft };
      });

    const computeSp = (y) => {
      const absYearSp = CY + y;
      const spDeltaManual = (s.buckets||[]).filter(b => b.active !== false && b.type === "Sparrate").reduce((t, b) => {
        const from = +(b.startsAt||CY), to = b.endsAt ? +b.endsAt : Infinity;
        return absYearSp >= from && absYearSp <= to ? t + (b.delta||0) : t;
      }, 0);
      if (!s.autoSpar) {
        const freed = nonImmoLoans.filter(l => l.yrsLeft !== null && y >= l.yrsLeft).reduce((t, l) => t+l.annuitat, 0);
        const base  = (s.manuellSparrate||0) + freed + spDeltaManual;
        return Math.max(0, s.sparRateGrowth ? base*Math.pow(1+(s.sparGrowthPct||0)/100, y) : base);
      }
      const absYear = CY + y;
      const inc = filteredIncomeStreams
        .filter(st => absYear >= (st.startsAt||CY) && (!st.endsAt || absYear <= st.endsAt))
        .reduce((t, st) => t + (st.amount||0)*Math.pow(1+(st.growthPct||0)/100, Math.max(0, absYear-(st.startsAt||CY))), 0);
      const exp = (s.expenseStreams||[])
        .filter(st => absYear >= (st.startsAt||CY) && (!st.endsAt || absYear <= st.endsAt))
        .reduce((t, st) => t+(st.amount||0), 0);
      const activeB = (s.buckets||[]).filter(b => b.active !== false);
      const financed = activeB.reduce((t, b) => {
        if (b.fundingMode !== "financed") return t;
        const sy = +(b.financingStart||b.year||CY);
        return absYear >= sy && absYear < sy+Math.ceil((+b.financingMonths||12)/12) ? t+(+b.monthlyPayment||0) : t;
      }, 0);
      // Sparratenänderung-Szenarien
      const spDelta = activeB.filter(b => b.type === "Sparrate").reduce((t, b) => {
        const from = +(b.startsAt||CY), to = b.endsAt ? +b.endsAt : Infinity;
        return absYear >= from && absYear <= to ? t + (b.delta||0) : t;
      }, 0);
      const immoAssets   = projAssets.filter(a => a.class==="Immobilien");
      const yImmoGross   = immoAssets.reduce((t, a) => t+(a.monthlyRent||IMMO_CF_GROSS)*Math.pow(1+rentGrowth/100, y), 0);
      const yImmoRunning = immoAssets.reduce((t, a) => t+(a.hausgeld||IMMO_HAUSGELD)+(a.grundsteuer||IMMO_GRUNDSTEUER), 0);
      const yImmoAnnu    = immoAssets.filter(a => (a.debt||0)>0).reduce((t, a) =>
        t + (computeRemDebt(a, y) > 0 ? (a.loanAnnuitat||0) : 0), 0);
      const yImmoNetCF = yImmoGross - yImmoRunning - yImmoAnnu;
      const fordInc  = projAssets.filter(a => a.class==="Forderung").reduce((t, a) => t+(a.monthlyRepayment||0), 0);
      const runCosts = projAssets.filter(a => a.class!=="Immobilien" && (a.monthlyRunningCost||0)>0).reduce((t, a) => t+(a.monthlyRunningCost||0), 0);
      const otherAnnu = projAssets.filter(a => a.class!=="Immobilien" && a.class!=="Forderung" && (a.debt||0)>0).reduce((t, a) =>
        t + (computeRemDebt(a, y) > 0 ? (a.loanAnnuitat||0) : 0), 0);
      // Ausschüttungsrenditen aus Finanzassets (Dividenden, Kupons) — ggf. nach KeSt
      const assetYield = projAssets
        .filter(a => (a.yieldPct||0) > 0 && a.class !== "Immobilien" && a.class !== "Forderung")
        .reduce((t, a) => t + (a.value||0) * (a.yieldPct||0) / 100 / 12 * (s.taxOnReturns ? (1 - kestRate(a)) : 1), 0);
      return Math.max(0, (inc + yImmoNetCF + fordInc + assetYield + spDelta) - (exp + runCosts + otherAnnu + financed));
    };

    const getAdd = (asset, sp) => {
      if (asset.locked || asset.class==="Cash" || asset.class==="Immobilien" || asset.class==="Forderung" || asset.class==="Sonstiges") return 0;
      if (s.sparDistMode === "manual") {
        const cm = (s.manualSparDist[asset.class]||0) * (sp0 > 0 ? sp/sp0 : 1);
        return cm * ((asset.value||0)/(classTotals[asset.class]||1));
      }
      return sp * ((asset.value||0)/invTotal);
    };

    const bucketDrain = (year) => {
      let d = 0;
      (s.buckets||[]).filter(b => b.active !== false).forEach(b => {
        if (b.fundingMode === "financed") return;
        if (b.type === "Sparrate") return; // handled via spDelta in computeSp
        const ty = b.year ? +b.year : b.age ? CY+(+b.age-currentAge) : null;
        if (!ty) return;
        const sign = b.type === "Zufluss" ? -1 : 1; // Zufluss = negative drain (adds to wealth)
        if (b.type==="Einmalig" || b.type==="Zufluss") { if (year===ty) d += sign*(b.amount||0); return; }
        if (b.type==="Jährlich" || b.type==="Jahrlich") { if (year>=ty) d += b.amount||0; return; }
        if (b.type==="Monatlich" && year>=ty) d += (b.amount||0)*12;
      });
      return d;
    };

    return Array.from({ length:s.horizon+1 }, (_, y) => {
      const row = { age: currentAge + y };
      const sp = computeSp(y);
      [["cons",-2],["base",0],["opt",2]].forEach(([key, adj]) => {
        let total = 0;
        projAssets.forEach(a => {
          const pretaxR  = (s.classReturns[a.class]||5) + adj;
          const yieldPct = a.yieldPct || 0;
          // Capital appreciation = total return minus distributed yield (yield flows via sparrate/cashflow)
          const capApprR = pretaxR - yieldPct;
          const kest     = s.taxOnReturns ? kestRate(a) : 0;
          const baseR    = capApprR * (1 - kest);
          const r = Math.max(0, baseR/100), rm = r/12, mo = y*12;
          if (a.class==="Forderung") {
            const rep = a.monthlyRepayment||0;
            total += Math.max(0, rm>0 ? (a.value||0)*Math.pow(1+rm,mo)-rep*((Math.pow(1+rm,mo)-1)/rm) : (a.value||0)-rep*mo); return;
          }
          if (a.class==="Immobilien") {
            const growR = Math.max(0, ((s.classReturns["Immobilien"]||3)+adj) / 100);
            const remDebt = computeRemDebt(a, y);
            total += (a.value||0)*Math.pow(1+growR/12,mo) - remDebt; return;
          }
          if (a.class==="Cash") { total += (a.value||0)*Math.pow(1+rm,mo); return; }
          if (a.class==="Sonstiges") { total += Math.max(0,(a.value||0)*Math.pow(1+Math.min(0,baseR/100)/12,mo)); return; }
          const add = getAdd(a, sp);
          total += rm>0 ? (a.value||0)*Math.pow(1+rm,mo)+add*((Math.pow(1+rm,mo)-1)/rm) : (a.value||0)+add*mo;
        });
        if (!hasAnyInvestable && sp > 0) {
          const pretaxDef = (s.classReturns?.["Aktien-ETF"]||8) + adj;
          const kestDef   = s.taxOnReturns ? KEST_RATES["Aktien-ETF"] : 0;
          const defR = Math.max(0, pretaxDef * (1 - kestDef) / 100);
          const rm_def = defR/12, mo = y*12;
          total += rm_def>0 ? sp*((Math.pow(1+rm_def,mo)-1)/rm_def) : sp*mo;
        }
        let drain = 0;
        for (let i=0; i<=y; i++) drain += bucketDrain(CY+i);
        total = Math.max(0, total-drain);
        if (s.inflationAdj) total /= Math.pow(1+s.inflation/100,y);
        row[key] = Math.round(total);
      });
      return row;
    });
  }, [s, projAssets, filteredIncomeStreams, cf.eff, currentAge]);

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

      {modal?.type==="checkin"       && <CheckinModal       s={s} cf={cf} T={T} setModal={setModal} updArr={updArr} />}
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
        {tab==="dashboard"  && <TabDashboard  s={s} T={T} setModal={setModal} agg={agg} cf={cf} loanSummary={loanSummary} lastCI={lastCI} snaps={snaps} totalMonthlyLoanPayment={totalMonthlyLoanPayment} projection={projection} final={final} currentAge={currentAge} />}
        {tab==="haushalt"   && <TabHaushalt   s={s} T={T} upd={upd} updArr={updArr} setModal={setModal} cf={cf} sparDist={sparDist} ownerFilter={ownerFilter} filteredAssets={filteredAssets} />}
        {tab==="vermogen"   && <TabVermogen   s={s} T={T} updClass={updClass} updArr={updArr} setModal={setModal} agg={agg} filteredAssets={filteredAssets} ownerFilter={ownerFilter} />}
        {tab==="projektion" && <TabProjektion s={s} T={T} upd={upd} cf={cf} agg={agg} projection={projection} final={final} loanSummary={loanSummary} setModal={setModal} projClassFilter={projClassFilter} toggleProjClass={toggleProjClass} resetProjClass={() => setProjClassFilter([])} availClasses={[...new Set(filteredAssets.map(a => a.class))]} currentAge={currentAge} />}
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
