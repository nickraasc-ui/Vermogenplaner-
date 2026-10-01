import { useState, useMemo, useEffect, useCallback } from "react";
import { DARK, LIGHT } from "./theme.js";
import { saveState, loadProfileState, profileKey } from "./storage.js";
import { deriveAll } from "./model/derive.js";
import { Icon, RoundBtn } from "./components/ui.jsx";
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
import StandaloneLoanModal  from "./components/modals/StandaloneLoanModal.jsx";
import RelationModal        from "./components/modals/RelationModal.jsx";

const TABS = [
  { k:"dashboard",  lbl:"Übersicht",  icon:"home"   },
  { k:"haushalt",   lbl:"Haushalt",   icon:"wallet" },
  { k:"vermogen",   lbl:"Vermögen",   icon:"pie"    },
  { k:"projektion", lbl:"Projektion", icon:"chart"  },
  { k:"buckets",    lbl:"Szenarien",  icon:"layers" },
];

export default function AppInner({ profileId, profileName, profileColor, darkMode, onToggleDark, onBack }) {
  const LS_KEY = profileKey(profileId);
  const [s, setS]         = useState(() => loadProfileState(profileId));
  const [saveFailed, setSaveFailed] = useState(false);
  const [tab, setTab]     = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [ownerFilter, setOwnerFilter]         = useState([]);
  const [projClassFilter, setProjClassFilter] = useState([]);
  const T = darkMode ? DARK : LIGHT;

  useEffect(() => { setSaveFailed(!saveState(s, LS_KEY)); }, [s, LS_KEY]);
  useEffect(() => {
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
    document.body.style.background = T.bg;
  }, [darkMode]);

  const upd      = useCallback(patch => setS(p => ({ ...p, ...patch })), []);
  const updArr   = useCallback((key, arr) => setS(p => ({ ...p, [key]: arr })), []);
  const updClass = useCallback((cls, val) => setS(p => ({ ...p, classReturns: { ...p.classReturns, [cls]: val } })), []);
  const toggleOwner     = useCallback(id  => setOwnerFilter(prev => prev.includes(id)  ? prev.filter(x => x !== id)  : [...prev, id]), []);
  const toggleProjClass = useCallback(cls => setProjClassFilter(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]), []);

  const { currentAge, filteredAssets, projection, cashflowProjection, cf, agg, sparDist, loanSummary, totalMonthlyLoanPayment } =
    useMemo(() => deriveAll(s, { ownerFilter, projClassFilter }), [s, ownerFilter, projClassFilter]);

  const final  = projection[projection.length-1] || {};
  const lastCI = useMemo(() => [...(s.checkins||[])].sort((a,b) => b.month.localeCompare(a.month))[0] ?? null, [s.checkins]);
  const snaps  = useMemo(() =>
    [...(s.snapshots||[])].sort((a,b) => a.date.localeCompare(b.date)).map(sn => ({ ...sn, value:sn.totalNet })), [s.snapshots]);

  const chipStyle = (active) => ({
    fontSize:14, padding:"7px 14px", borderRadius:999, border:"none",
    background: active ? T.accent : T.surfaceHigh,
    color: active ? T.onAccent : T.text,
    cursor:"pointer", fontWeight:600,
    WebkitTapHighlightColor:"transparent", whiteSpace:"nowrap", flexShrink:0,
  });

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"inherit", paddingBottom:"calc(76px + env(safe-area-inset-bottom,0px))", transition:"background 0.2s,color 0.2s" }}>

      {modal?.type==="checkin"       && <CheckinModal       s={s} cf={cf} T={T} setModal={setModal} updArr={updArr} cashflowProjection={cashflowProjection} initialYear={modal.year} />}
      {modal?.type==="snapshot"      && <SnapshotModal      s={s} cf={cf} agg={agg} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="afford"        && <AffordModal        s={s} cf={cf} agg={agg} final={final} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="asset"         && <AssetModal         data={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="bucket"        && <BucketModal        data={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="owner"         && <OwnerModal         s={s} T={T} setModal={setModal} upd={upd} updArr={updArr} />}
      {modal?.type==="incomeStream"  && <IncomeStreamModal  data={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="expenseStream"  && <ExpenseStreamModal  data={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="importPreview"    && <ImportPreviewModal    preview={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="standaloneLoan"  && <StandaloneLoanModal   data={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}
      {modal?.type==="relation"        && <RelationModal         data={modal.data} s={s} T={T} setModal={setModal} updArr={updArr} />}

      <div style={{ background:T.header+"f0", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", padding:"10px 16px 10px", paddingTop:"calc(10px + env(safe-area-inset-top,0px))", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:600, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
            {onBack ? <RoundBtn icon="back" label="Zurück zu den Profilen" onClick={onBack} T={T} size={36} /> : <span style={{ width:36 }} />}
            <div style={{ fontSize:16, color:T.text, fontWeight:650, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {profileName || "Vermögensplaner"}
            </div>
            <RoundBtn icon={darkMode ? "sun" : "moon"} label={darkMode ? "Helles Design" : "Dunkles Design"} onClick={onToggleDark} T={T} size={36} />
          </div>
          {s.owners?.length > 1 && (
            <div className="vp-noscroll" style={{ display:"flex", gap:8, overflowX:"auto", marginTop:12, scrollbarWidth:"none" }}>
              <button onClick={() => setOwnerFilter([])} style={chipStyle(ownerFilter.length===0)}>Alle</button>
              {s.owners.map(o => (
                <button key={o.id} onClick={() => toggleOwner(o.id)} style={chipStyle(ownerFilter.includes(o.id))}>{o.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {saveFailed && (
        <div role="alert" style={{ maxWidth:600, margin:"8px auto 0", padding:"12px 16px", borderRadius:14, background:T.red+"1f", color:T.red, fontSize:14, fontWeight:600 }}>
          Speichern fehlgeschlagen – der Browser-Speicher ist voll oder gesperrt. Änderungen gehen beim Schließen verloren.
        </div>
      )}

      <div style={{ padding:"8px 20px 24px", maxWidth:600, margin:"0 auto" }}>
        {tab==="dashboard"  && <TabDashboard  s={s} T={T} setModal={setModal} setTab={setTab} agg={agg} cf={cf} loanSummary={loanSummary} lastCI={lastCI} snaps={snaps} totalMonthlyLoanPayment={totalMonthlyLoanPayment} projection={projection} final={final} currentAge={currentAge} />}
        {tab==="haushalt"   && <TabHaushalt   s={s} T={T} upd={upd} updArr={updArr} setModal={setModal} cf={cf} sparDist={sparDist} ownerFilter={ownerFilter} filteredAssets={filteredAssets} cashflowProjection={cashflowProjection} currentAge={currentAge} />}
        {tab==="vermogen"   && <TabVermogen   s={s} T={T} updClass={updClass} updArr={updArr} setModal={setModal} agg={agg} filteredAssets={filteredAssets} loanSummary={loanSummary} ownerFilter={ownerFilter} />}
        {tab==="projektion" && <TabProjektion s={s} T={T} upd={upd} cf={cf} agg={agg} projection={projection} final={final} loanSummary={loanSummary} setModal={setModal} projClassFilter={projClassFilter} toggleProjClass={toggleProjClass} resetProjClass={() => setProjClassFilter([])} availClasses={[...new Set(filteredAssets.map(a => a.class))]} currentAge={currentAge} cashflowProjection={cashflowProjection} />}
        {tab==="buckets"    && <TabBuckets    s={s} T={T} upd={upd} updArr={updArr} setModal={setModal} agg={agg} final={final} currentAge={currentAge} />}
      </div>

      <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:T.tabBar+"f2", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderTop:"1px solid "+T.tabBorder, zIndex:50, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
        <div style={{ display:"flex", maxWidth:600, margin:"0 auto" }}>
          {TABS.map(({ k, lbl, icon }) => {
            const on = tab===k;
            return (
              <button key={k} onClick={() => setTab(k)} aria-current={on ? "page" : undefined}
                style={{ flex:1, padding:"9px 2px 8px", border:"none", cursor:"pointer", background:"transparent", color:on?T.text:T.textDim, display:"flex", flexDirection:"column", alignItems:"center", gap:3, WebkitTapHighlightColor:"transparent" }}>
                <Icon name={icon} size={22} stroke={on ? 2.2 : 1.7} />
                <span style={{ fontSize:11, fontWeight:on?650:500 }}>{lbl}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
