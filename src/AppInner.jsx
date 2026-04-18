import { useState, useMemo, useEffect, useCallback } from "react";
import { DARK, LIGHT } from "./theme.js";
import { IMMO_CF_GROSS, IMMO_HAUSGELD, IMMO_GRUNDSTEUER, LIQUIDITY_DEFAULT, CY } from "./constants.js";
import { saveState, loadProfileState } from "./storage.js";
import { fmtE } from "./components/ui.jsx";
import TabDashboard  from "./components/TabDashboard.jsx";
import TabHaushalt   from "./components/TabHaushalt.jsx";
import TabVermogen   from "./components/TabVermogen.jsx";
import TabProjektion from "./components/TabProjektion.jsx";
import TabBuckets    from "./components/TabBuckets.jsx";
import CheckinModal  from "./components/modals/CheckinModal.jsx";
import SnapshotModal from "./components/modals/SnapshotModal.jsx";
import AffordModal   from "./components/modals/AffordModal.jsx";
import AssetModal    from "./components/modals/AssetModal.jsx";
import BucketModal   from "./components/modals/BucketModal.jsx";

const TABS = [
  { k:"dashboard",  lbl:"Ubersicht"  },
  { k:"haushalt",   lbl:"Haushalt"   },
  { k:"vermogen",   lbl:"Vermogen"   },
  { k:"projektion", lbl:"Projektion" },
  { k:"buckets",    lbl:"Ausgaben"   },
];

export default function AppInner({ profileId, darkMode: initialDark }) {
  const LS_KEY = "wealth-pwa-v3-" + profileId;
  const [s, setS]       = useState(() => loadProfileState(profileId, initialDark));
  const [tab, setTab]   = useState("dashboard");
  const [modal, setModal] = useState(null);
  const T = initialDark ? DARK : LIGHT;

  useEffect(() => { saveState(s, LS_KEY); }, [s, LS_KEY]);

  const upd      = useCallback(patch => setS(p => ({ ...p, ...patch })), []);
  const updArr   = useCallback((key, arr) => setS(p => ({ ...p, [key]: arr })), []);
  const updClass = useCallback((cls, val) => setS(p => ({ ...p, classReturns: { ...p.classReturns, [cls]: val } })), []);

  const loanSummary = useMemo(() =>
    s.assets.filter(a => (a.debt||0) > 0).map(a => {
      const annuitat = a.loanAnnuitat || 0;
      const tilgung  = a.loanTilgung  || 0;
      const zinsen   = annuitat - tilgung;
      const yrsLeft  = tilgung > 0 ? Math.ceil((a.debt||0) / (tilgung * 12)) : null;
      return { id:a.id, name:a.name, debt:a.debt||0, annuitat, tilgung, zinsen, yrsLeft };
    }), [s.assets]);

  const totalMonthlyLoanPayment = useMemo(() =>
    loanSummary.reduce((t, l) => t + l.annuitat, 0), [loanSummary]);

  const cf = useMemo(() => {
    const immoGross   = s.assets.filter(a => a.class==="Immobilien" && (a.debt||0)>0).reduce(t => t + IMMO_CF_GROSS, 0);
    const immoRunning = s.assets.filter(a => a.class==="Immobilien" && (a.debt||0)>0).reduce(t => t + IMMO_HAUSGELD + IMMO_GRUNDSTEUER, 0);
    const immoNetCF   = immoGross - totalMonthlyLoanPayment - immoRunning;
    const avail = s.nettoGesamt + immoNetCF;
    const bound = s.ausgaben + s.reservenMonthly;
    const rest  = avail - bound;
    const eff   = s.autoSpar ? Math.max(0, rest) : s.manuellSparrate;
    const saldo = avail - bound - eff;
    const quote = avail > 0 ? (eff / avail) * 100 : 0;
    return { avail, bound, rest, eff, saldo, quote, immoNetCF, immoGross, immoRunning };
  }, [s.nettoGesamt, s.ausgaben, s.reservenMonthly, s.autoSpar, s.manuellSparrate, totalMonthlyLoanPayment, s.assets]);

  const agg = useMemo(() => {
    let gross = 0, debt = 0;
    const byClass = {}, byLiquidity = { "Liquide":0, "Semi-liquide":0, "Illiquide":0 };
    s.assets.forEach(a => {
      gross += a.value||0; debt += a.debt||0;
      const net = (a.value||0) - (a.debt||0);
      byClass[a.class] = (byClass[a.class]||0) + net;
      const liq = a.liquidity || LIQUIDITY_DEFAULT[a.class] || "Semi-liquide";
      byLiquidity[liq] = (byLiquidity[liq]||0) + net;
    });
    const totalNet = gross - debt;
    let wavg = 0;
    if (totalNet > 0) Object.entries(byClass).forEach(([cls, val]) => { if (val > 0) wavg += (val/totalNet) * (s.classReturns[cls]||0); });
    return { gross, debt, net:totalNet, byClass, byLiquidity, wavgReturn:wavg };
  }, [s.assets, s.classReturns]);

  const sparDist = useMemo(() => {
    const investable = s.assets.filter(a => !a.locked && a.class !== "Cash");
    const total = investable.reduce((t, a) => t + (a.value||0), 0) || 1;
    const byClass = {};
    investable.forEach(a => { byClass[a.class] = (byClass[a.class]||0) + (a.value||0); });
    return Object.entries(byClass).map(([cls, val]) => ({ cls, share:val/total, monthly:cf.eff*(val/total) }));
  }, [s.assets, cf.eff]);

  const projection = useMemo(() => {
    const sp0 = cf.eff || 0;
    const investable = s.assets.filter(a => !a.locked && a.class!=="Cash" && a.class!=="Immobilien");
    const invTotal = investable.reduce((t, a) => t + (a.value||0), 0) || 1;
    const bucketDrain = (year) => {
      let d = 0;
      (s.buckets||[]).forEach(b => {
        const ty = b.year ? +b.year : b.age ? CY+(+b.age-30) : null;
        if (!ty) return;
        if (b.type==="Einmalig"  && year===ty) d += b.amount||0;
        if (b.type==="Jahrlich"  && year>=ty)  d += b.amount||0;
        if (b.type==="Monatlich" && year>=ty)  d += (b.amount||0)*12;
      });
      return d;
    };
    return Array.from({ length:s.horizon+1 }, (_, y) => {
      const row = { age:30+y };
      [["cons",-2],["base",0],["opt",2]].forEach(([key, adj]) => {
        let total = 0;
        const sp = s.sparRateGrowth ? sp0*Math.pow(1+(s.sparGrowthPct||0)/100,y) : sp0;
        s.assets.forEach(a => {
          const baseR = (s.classReturns[a.class]||5) + adj;
          const r = Math.max(0, baseR/100), rm = r/12, mo = y*12;
          if (a.class==="Immobilien") {
            const growR  = Math.max(0, (s.classReturns["Immobilien"]+adj)/100);
            const grossFV = (a.value||0)*Math.pow(1+growR,y);
            const remDebt = (a.loanTilgung||0)>0 ? Math.max(0,(a.debt||0)-(a.loanTilgung||0)*12*y) : (a.debt||0);
            total += grossFV - remDebt; return;
          }
          if (a.class==="Cash") { total += (a.value||0)*Math.pow(1+Math.max(0,(s.classReturns["Cash"]+adj)/100),y); return; }
          const add = !a.locked ? sp*((a.value||0)/invTotal) : 0;
          total += rm>0 ? (a.value||0)*Math.pow(1+r,y)+add*((Math.pow(1+rm,mo)-1)/rm) : (a.value||0)+add*mo;
        });
        let drain = 0;
        for (let i=0; i<=y; i++) drain += bucketDrain(CY+i);
        total = Math.max(0, total-drain);
        if (s.inflationAdj) total /= Math.pow(1+s.inflation/100,y);
        row[key] = Math.round(total);
      });
      return row;
    });
  }, [s, cf.eff]);

  const final  = projection[projection.length-1] || {};
  const lastCI = useMemo(() => [...(s.checkins||[])].sort((a,b) => b.month.localeCompare(a.month))[0] ?? null, [s.checkins]);
  const snaps  = useMemo(() => [...(s.snapshots||[])].sort((a,b) => a.date.localeCompare(b.date)), [s.snapshots]);

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"system-ui,-apple-system,'Helvetica Neue',sans-serif", paddingBottom:"calc(64px + env(safe-area-inset-bottom,0px))", transition:"background 0.2s,color 0.2s" }}>

      {modal?.type==="checkin"  && <CheckinModal  s={s} cf={cf} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="snapshot" && <SnapshotModal agg={agg} s={s} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="afford"   && <AffordModal   s={s} cf={cf} agg={agg} final={final} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="asset"    && <AssetModal    data={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="bucket"   && <BucketModal   data={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}

      {/* Header */}
      <div style={{ background:T.header, borderBottom:"1px solid "+T.tabBorder, padding:"14px 16px 10px", paddingTop:"calc(14px + env(safe-area-inset-top,0px))", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:8, letterSpacing:"0.22em", color:T.textDim, fontWeight:700, textTransform:"uppercase" }}>Vermogensplaner</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:10, marginTop:2 }}>
              <div style={{ fontSize:22, fontWeight:900, color:T.text, letterSpacing:"-0.02em" }}>{fmtE(agg.net)}</div>
              <div style={{ fontSize:11, color:cf.quote>=20?T.green:cf.quote>=10?T.amber:T.red, fontWeight:700 }}>{cf.quote.toFixed(1)}% Sparquote</div>
            </div>
            <div style={{ fontSize:9, color:T.textDim, marginTop:1 }}>Gew. Ø-Rendite: {agg.wavgReturn.toFixed(1)}%</div>
          </div>
          <button onClick={() => upd({ dark:!s.dark })}
            style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:20, padding:"6px 12px", cursor:"pointer", fontSize:13, color:T.textMid, WebkitTapHighlightColor:"transparent", marginTop:4 }}>
            {s.dark ? "Light" : "Dark"}
          </button>
        </div>
      </div>

      <div style={{ padding:"14px 14px 4px", maxWidth:600, margin:"0 auto" }}>
        {tab==="dashboard"  && <TabDashboard  s={s} T={T} setModal={setModal} agg={agg} cf={cf} loanSummary={loanSummary} lastCI={lastCI} snaps={snaps} totalMonthlyLoanPayment={totalMonthlyLoanPayment} projection={projection} final={final} />}
        {tab==="haushalt"   && <TabHaushalt   s={s} T={T} upd={upd} updArr={updArr} setModal={setModal} cf={cf} sparDist={sparDist} totalMonthlyLoanPayment={totalMonthlyLoanPayment} />}
        {tab==="vermogen"   && <TabVermogen   s={s} T={T} updClass={updClass} updArr={updArr} setModal={setModal} agg={agg} />}
        {tab==="projektion" && <TabProjektion s={s} T={T} upd={upd} cf={cf} agg={agg} projection={projection} final={final} loanSummary={loanSummary} setModal={setModal} />}
        {tab==="buckets"    && <TabBuckets    s={s} T={T} updArr={updArr} setModal={setModal} />}
      </div>

      {/* Tab bar */}
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
