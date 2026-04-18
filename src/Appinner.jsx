import { useState, useMemo, useEffect, useCallback } from "react";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";

// ------------------------------------------------------------------ utils ---
const fmtE = (v) => {
  if (!v && v !== 0) return "\u20AC0";
  const a = Math.abs(v);
  if (a >= 1_000_000) return "\u20AC" + (v / 1_000_000).toFixed(2) + "M";
  if (a >= 1_000) return "\u20AC" + (v / 1_000).toFixed(0) + "k";
  return "\u20AC" + Math.round(v);
};
const full = (v) => "\u20AC" + Math.round(v ?? 0).toLocaleString("de-DE");
const uid = () => Math.random().toString(36).slice(2, 9);
const CY = new Date().getFullYear();
const CM = new Date().toISOString().slice(0, 7);
const mlbl = (ym) => {
  const [y, m] = ym.split("-");
  return ["","Jan","Feb","Mar","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][+m] + " " + y;
};
const pct = (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";

// ---------------------------------------------------------------- constants ---
const IMMO_CF_GROSS = 1200;
const IMMO_HAUSGELD = 220;
const IMMO_GRUNDSTEUER = 10;

// Asset classes with default returns
const ASSET_CLASS_DEFAULTS = {
  "Aktien":         { return: 9,  color: "#f59e0b" },
  "Aktien-ETF":     { return: 8,  color: "#38bdf8" },
  "Anleihen":       { return: 3,  color: "#a78bfa" },
  "Anleihen-ETF":   { return: 3.5,color: "#818cf8" },
  "Immobilien":     { return: 3,  color: "#10b981" },
  "Cash":           { return: 2,  color: "#64748b" },
  "Rohstoffe":      { return: 5,  color: "#fb923c" },
  "Krypto":         { return: 12, color: "#f472b6" },
  "Private Equity": { return: 11, color: "#34d399" },
  "Sonstiges":      { return: 5,  color: "#94a3b8" },
};
const ASSET_CLASSES = Object.keys(ASSET_CLASS_DEFAULTS);

const LIQUIDITY_CATS = ["Liquide", "Semi-liquide", "Illiquide"];
const LIQUIDITY_DEFAULT = {
  "Aktien": "Liquide", "Aktien-ETF": "Liquide",
  "Anleihen": "Semi-liquide", "Anleihen-ETF": "Liquide",
  "Immobilien": "Illiquide", "Cash": "Liquide",
  "Rohstoffe": "Semi-liquide", "Krypto": "Liquide",
  "Private Equity": "Illiquide", "Sonstiges": "Semi-liquide",
};
const LIQ_CLR = { "Liquide": "#10b981", "Semi-liquide": "#f59e0b", "Illiquide": "#ef4444" };
const BCK_CLRS = ["#f59e0b","#10b981","#38bdf8","#a78bfa","#f472b6","#fb923c","#ef4444","#34d399"];

// ------------------------------------------------------------------ themes ---
const DARK = {
  bg:"#04080f", surface:"#06101a", surfaceHigh:"#07111e",
  border:"#0a1c2c", borderHigh:"#0f2535",
  text:"#c8ddf0", textMid:"#3a5570", textLow:"#1e3545", textDim:"#0f2030",
  accent:"#38bdf8", green:"#10b981", red:"#ef4444", amber:"#f59e0b",
  purple:"#a78bfa", pink:"#f472b6", tabBar:"#050d17", tabBorder:"#0a1825", header:"#050d17",
};
const LIGHT = {
  bg:"#f0f4f8", surface:"#ffffff", surfaceHigh:"#f8fafc",
  border:"#dde5ed", borderHigh:"#c8d6e4",
  text:"#0f2535", textMid:"#4a6880", textLow:"#7a9ab8", textDim:"#a8c0d0",
  accent:"#0284c7", green:"#059669", red:"#dc2626", amber:"#d97706",
  purple:"#7c3aed", pink:"#db2777", tabBar:"#ffffff", tabBorder:"#dde5ed", header:"#ffffff",
};

// Default state
const DEFAULT_CLASS_RETURNS = Object.fromEntries(
  Object.entries(ASSET_CLASS_DEFAULTS).map(([k,v]) => [k, v.return])
);

const DEFAULT = {
  dark: true,
  nettoGesamt: 8500, ausgaben: 2000, reservenMonthly: 500,
  autoSpar: true, manuellSparrate: 1500,
  classReturns: DEFAULT_CLASS_RETURNS,
  horizon: 35,
  inflationAdj: false, inflation: 2.5,
  sparRateGrowth: false, sparGrowthPct: 2.0,
  assets: [
    { id:"a1", name:"Direktaktien Schenkung", owner:"ehemann", class:"Aktien", liquidity:"Liquide", value:850000, debt:0, locked:true, note:"Bedingte Schenkung" },
    { id:"a2", name:"Depot Ehemann (frei)", owner:"ehemann", class:"Aktien-ETF", liquidity:"Liquide", value:170000, debt:0, locked:false, note:"" },
    { id:"a3", name:"Depot Ehefrau", owner:"ehefrau", class:"Aktien-ETF", liquidity:"Liquide", value:70000, debt:0, locked:false, note:"95% Aktien" },
    { id:"a4", name:"Gemeinschaftsdepot", owner:"gemeinschaft", class:"Aktien-ETF", liquidity:"Liquide", value:15000, debt:0, locked:false, note:"" },
    { id:"a5", name:"Liquiditat Ehefrau", owner:"ehefrau", class:"Cash", liquidity:"Liquide", value:10000, debt:0, locked:false, note:"" },
    { id:"a6", name:"Liquiditat Gemeinschaft", owner:"gemeinschaft", class:"Cash", liquidity:"Liquide", value:15000, debt:0, locked:false, note:"" },
    { id:"a7", name:"Immobilie Munchen", owner:"ehemann", class:"Immobilien", liquidity:"Illiquide", value:430000, debt:130000, locked:false, note:"Kaufpreis 230k", loanRate:3.5, loanTilgung:450, loanAnnuitat:850 },
  ],
  buckets: [], checkins: [], snapshots: [],
};

// Persistence
// LS_KEY is set dynamically per profile - see below
const saveState = (st, key) => { try { localStorage.setItem(key, JSON.stringify(st)); } catch {} };

// ---------------------------------------------------------- ui primitives ---
const Sl = ({ label, value, min, max, step, onChange, fmt: f, color, note, warn, T, sub }) => (
  <div>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:2 }}>
      <label style={{ fontSize:9, color:T.textMid, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</label>
      <span style={{ fontSize:15, fontWeight:900, color: warn ? T.red : (color || T.accent) }}>{f(value)}</span>
    </div>
    {note && <div style={{ fontSize:9, color:T.textLow, marginBottom:3 }}>{note}</div>}
    {sub && <div style={{ fontSize:9, color:T.accent, marginBottom:3 }}>{sub}</div>}
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width:"100%", accentColor: warn ? T.red : (color || T.accent), cursor:"pointer" }} />
    <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, color:T.textDim, marginTop:1 }}>
      <span>{f(min)}</span><span>{f(max)}</span>
    </div>
  </div>
);

const Tile = ({ label, value, sub, color, warn=false, onClick, T }) => (
  <div onClick={onClick} style={{ background:T.surface, border:"1px solid "+(warn?T.red+"44":T.border), borderRadius:8, padding:"9px 11px", cursor:onClick?"pointer":"default" }}>
    <div style={{ fontSize:8, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>{label}</div>
    <div style={{ fontSize:13, fontWeight:900, color: warn ? T.red : (color || T.accent) }}>{value}</div>
    {sub && <div style={{ fontSize:9, color:T.textDim, marginTop:2, lineHeight:1.4 }}>{sub}</div>}
  </div>
);

const ChTip = ({ active, payload, label, T }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:6, padding:"8px 11px", fontSize:11 }}>
      <div style={{ fontWeight:700, color:T.textMid, marginBottom:4 }}>Alter {label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display:"flex", justifyContent:"space-between", gap:14, color:p.color, marginBottom:2 }}>
          <span>{p.name}</span><span style={{ fontWeight:700 }}>{fmtE(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const Sheet = ({ title, onClose, children, T }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"flex-end" }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:"18px 18px 0 0", padding:"0 0 env(safe-area-inset-bottom,16px)", width:"100%", maxHeight:"92vh", overflowY:"auto" }}>
      <div style={{ padding:"12px 20px 0" }}>
        <div style={{ width:36, height:4, background:T.border, borderRadius:2, margin:"0 auto 16px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div style={{ fontWeight:900, fontSize:15, color:T.text }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.textMid, cursor:"pointer", fontSize:22, lineHeight:1, padding:"0 4px" }}>x</button>
        </div>
      </div>
      <div style={{ padding:"0 20px 24px" }}>{children}</div>
    </div>
  </div>
);

const Inp = ({ label, value, onChange, type="text", placeholder="", T }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:4 }}>{label}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      inputMode={type==="number" ? "decimal" : undefined}
      style={{ width:"100%", background:T.bg, border:"1px solid "+T.border, borderRadius:8, padding:"11px 12px", color:T.text, fontSize:16, outline:"none", fontFamily:"inherit", WebkitAppearance:"none" }} />
  </div>
);

const SelEl = ({ label, value, onChange, options, T }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:4 }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width:"100%", background:T.bg, border:"1px solid "+T.border, borderRadius:8, padding:"11px 12px", color:T.text, fontSize:16, outline:"none", fontFamily:"inherit", WebkitAppearance:"none" }}>
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  </div>
);

const Btn = ({ children, onClick, color, full=false, sm=false, danger=false, T }) => (
  <button onClick={onClick} style={{
    padding: sm ? "6px 12px" : "12px 18px", borderRadius:8,
    border:"1px solid "+(danger ? T.red+"44" : (color||T.accent)+"44"),
    background: danger ? T.red+"15" : (color||T.accent)+"15",
    color: danger ? T.red : (color||T.accent),
    cursor:"pointer", fontSize:sm?11:14, fontWeight:700, fontFamily:"inherit",
    width:full?"100%":"auto", WebkitTapHighlightColor:"transparent",
  }}>{children}</button>
);

const Row = ({ label, value, type="neutral", bold=false, sub, T }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"6px 0", borderBottom:"1px solid "+T.border }}>
    <div>
      <div style={{ fontSize:bold?12:11, color:bold?T.text:T.textMid, fontWeight:bold?700:400 }}>{label}</div>
      {sub && <div style={{ fontSize:9, color:T.textDim, marginTop:1 }}>{sub}</div>}
    </div>
    <div style={{ fontSize:bold?14:12, fontWeight:bold?900:600, color:type==="in"?T.green:type==="out"?T.red:type==="warn"?T.red:T.accent, marginLeft:12, whiteSpace:"nowrap" }}>
      {value}
    </div>
  </div>
);

// ============================================================== MAIN APP ===
export default function AppInner({ profileId, profileName, profileColor, darkMode: initialDark, onBack, onToggleDark }) {
  const LS_KEY = "wealth-pwa-v3-" + profileId;
  const loadProfileState = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (!p.classReturns) p.classReturns = { ...DEFAULT_CLASS_RETURNS };
        else p.classReturns = { ...DEFAULT_CLASS_RETURNS, ...p.classReturns };
        if (p.assets) {
          p.assets = p.assets.map(a => ({
            loanRate: 3.5, loanTilgung: 0, loanAnnuitat: 0, ...a,
            liquidity: a.liquidity || LIQUIDITY_DEFAULT[a.class] || "Semi-liquide",
          }));
        }
        return { ...DEFAULT, ...p, dark: initialDark };
      }
      return { ...DEFAULT, dark: initialDark };
    } catch { return { ...DEFAULT, dark: initialDark }; }
  };
  const [s, setS] = useState(() => loadProfileState());
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const T = initialDark ? DARK : LIGHT;

  useEffect(() => { saveState(s, LS_KEY); }, [s, LS_KEY]);


  const upd = useCallback(patch => setS(p => ({ ...p, ...patch })), []);
  const updArr = useCallback((key, arr) => setS(p => ({ ...p, [key]: arr })), []);
  const updClass = useCallback((cls, val) => setS(p => ({
    ...p, classReturns: { ...p.classReturns, [cls]: val }
  })), []);

  // -------------------------------------------------------- loan helpers ---
  // For each asset with debt, compute monthly interest + tilgung
  const loanSummary = useMemo(() => {
    return s.assets
      .filter(a => (a.debt || 0) > 0)
      .map(a => {
        const annuitat = a.loanAnnuitat || 0;
        const tilgung  = a.loanTilgung  || 0;
        const zinsen   = annuitat - tilgung;
        const yrsLeft  = tilgung > 0 ? Math.ceil((a.debt||0) / (tilgung * 12)) : null;
        return { id: a.id, name: a.name, debt: a.debt||0, annuitat, tilgung, zinsen, yrsLeft };
      });
  }, [s.assets]);

  const totalMonthlyLoanPayment = useMemo(() =>
    loanSummary.reduce((t, l) => t + l.annuitat, 0), [loanSummary]);

  // -------------------------------------------------------- cash flow ---
  const cf = useMemo(() => {
    // Gross rental from all immo assets (fixed for now)
    const immoGross = s.assets
      .filter(a => a.class === "Immobilien" && (a.debt||0) > 0)
      .reduce((t) => t + IMMO_CF_GROSS, 0);
    const immoRunning = s.assets
      .filter(a => a.class === "Immobilien" && (a.debt||0) > 0)
      .reduce((t) => t + IMMO_HAUSGELD + IMMO_GRUNDSTEUER, 0);
    // Net immo cashflow after all loan payments and running costs
    const immoNetCF = immoGross - totalMonthlyLoanPayment - immoRunning;

    const avail = s.nettoGesamt + immoNetCF;
    const bound = s.ausgaben + s.reservenMonthly;
    const rest  = avail - bound;
    const eff   = s.autoSpar ? Math.max(0, rest) : s.manuellSparrate;
    const saldo = avail - bound - eff;
    const quote = avail > 0 ? (eff / avail) * 100 : 0;
    return { avail, bound, rest, eff, saldo, quote, immoNetCF, immoGross, immoRunning };
  }, [s.nettoGesamt, s.ausgaben, s.reservenMonthly, s.autoSpar, s.manuellSparrate, totalMonthlyLoanPayment, s.assets]);

  // -------------------------------------------------------- asset aggregates ---
  const agg = useMemo(() => {
    let gross=0, debt=0;
    const byClass={}, byLiquidity={"Liquide":0,"Semi-liquide":0,"Illiquide":0};
    s.assets.forEach(a => {
      gross += a.value||0; debt += a.debt||0;
      const net = (a.value||0)-(a.debt||0);
      byClass[a.class] = (byClass[a.class]||0) + net;
      const liq = a.liquidity || LIQUIDITY_DEFAULT[a.class] || "Semi-liquide";
      byLiquidity[liq] = (byLiquidity[liq]||0) + net;
    });
    // weighted average return
    const totalNet = gross - debt;
    let wavg = 0;
    if (totalNet > 0) {
      Object.entries(byClass).forEach(([cls, val]) => {
        if (val > 0) wavg += (val / totalNet) * (s.classReturns[cls] || 0);
      });
    }
    return { gross, debt, net: totalNet, byClass, byLiquidity, wavgReturn: wavg };
  }, [s.assets, s.classReturns]);

  // Sparrate distribution by class weight (excluding locked, cash)
  const sparDist = useMemo(() => {
    const investable = s.assets.filter(a => !a.locked && a.class !== "Cash");
    const total = investable.reduce((t,a) => t+(a.value||0),0) || 1;
    const byClass = {};
    investable.forEach(a => {
      byClass[a.class] = (byClass[a.class]||0) + (a.value||0);
    });
    return Object.entries(byClass).map(([cls, val]) => ({
      cls, share: val/total, monthly: cf.eff * (val/total)
    }));
  }, [s.assets, cf.eff]);

  // -------------------------------------------------------- projection ---
  const projection = useMemo(() => {
    const sp0 = cf.eff || 0;
    const investable = s.assets.filter(a => !a.locked && a.class !== "Cash" && a.class !== "Immobilien");
    const invTotal = investable.reduce((t,a) => t+(a.value||0),0) || 1;

    const bucketDrain = (year) => {
      let d = 0;
      (s.buckets||[]).forEach(b => {
        const ty = b.year ? +b.year : b.age ? CY+(+b.age-30) : null;
        if (!ty) return;
        if (b.type==="Einmalig"  && year===ty)  d += b.amount||0;
        if (b.type==="Jahrlich" && year>=ty)   d += b.amount||0;
        if (b.type==="Monatlich" && year>=ty)  d += (b.amount||0)*12;
      });
      return d;
    };

    return Array.from({ length: s.horizon+1 }, (_, y) => {
      const row = { age: 30+y };
      [["cons",-2],["base",0],["opt",2]].forEach(([key, adj]) => {
        let total = 0;

        // Sparrate with optional growth
        const sp = s.sparRateGrowth
          ? sp0 * Math.pow(1 + (s.sparGrowthPct||0)/100, y)
          : sp0;

        s.assets.forEach(a => {
          const baseR = (s.classReturns[a.class] || 5) + adj;
          const r = Math.max(0, baseR / 100);
          const rm = r / 12;
          const mo = y * 12;

          if (a.class === "Immobilien") {
            // Immo: gross value grows at classReturn rate
            const growR = Math.max(0, (s.classReturns["Immobilien"] + adj) / 100);
            const grossFV = (a.value||0) * Math.pow(1+growR, y);
            // Remaining debt
            const til = a.loanTilgung || 0;
            const remDebt = til > 0
              ? Math.max(0, (a.debt||0) - til*12*y)
              : (a.debt||0);
            total += grossFV - remDebt;
            return;
          }

          if (a.class === "Cash") {
            total += (a.value||0) * Math.pow(1 + Math.max(0,(s.classReturns["Cash"]+adj)/100), y);
            return;
          }

          // Monthly addition proportional to asset weight (skip locked)
          const add = !a.locked ? sp * ((a.value||0)/invTotal) : 0;
          const fv = rm > 0
            ? (a.value||0)*Math.pow(1+r,y) + add*((Math.pow(1+rm,mo)-1)/rm)
            : (a.value||0) + add*mo;
          total += fv;
        });

        // Bucket drains
        let drain=0;
        for (let i=0;i<=y;i++) drain += bucketDrain(CY+i);
        total = Math.max(0, total - drain);

        // Inflation adjustment (real purchasing power)
        if (s.inflationAdj) total /= Math.pow(1+s.inflation/100, y);

        row[key] = Math.round(total);
      });
      return row;
    });
  }, [s, cf.eff]);

  const final = projection[projection.length-1]||{};
  const lastCI = useMemo(() => [...(s.checkins||[])].sort((a,b)=>b.month.localeCompare(a.month))[0]??null,[s.checkins]);
  const snaps  = useMemo(() => [...(s.snapshots||[])].sort((a,b)=>a.date.localeCompare(b.date)),[s.snapshots]);

  // ============================================================ MODALS ===
  const CheckinModal = () => {
    const [f,setF]=useState({month:CM,ausgaben_ist:String(s.ausgaben),reserven_ist:"0",sparrate_ist:String(Math.round(cf.eff)),note:""});
    return (
      <Sheet title="Monatliches Check-in" onClose={()=>setModal(null)} T={T}>
        <Inp label="Monat" value={f.month} onChange={v=>setF(p=>({...p,month:v}))} type="month" T={T}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Ausgaben IST" value={f.ausgaben_ist} onChange={v=>setF(p=>({...p,ausgaben_ist:v}))} type="number" T={T}/>
          <Inp label="Reserven genutzt" value={f.reserven_ist} onChange={v=>setF(p=>({...p,reserven_ist:v}))} type="number" T={T}/>
        </div>
        <Inp label="Tatsachlich investiert" value={f.sparrate_ist} onChange={v=>setF(p=>({...p,sparrate_ist:v}))} type="number" T={T}/>
        <Inp label="Notiz" value={f.note} onChange={v=>setF(p=>({...p,note:v}))} placeholder="Besonderheiten..." T={T}/>
        <Btn full color={T.green} T={T} onClick={()=>{
          const ci={id:uid(),...f,ausgaben_ist:+f.ausgaben_ist||0,reserven_ist:+f.reserven_ist||0,sparrate_ist:+f.sparrate_ist||0};
          updArr("checkins",[...(s.checkins||[]).filter(c=>c.month!==f.month),ci]);
          setModal(null);
        }}>Speichern</Btn>
      </Sheet>
    );
  };

  const SnapshotModal = () => {
    const [f,setF]=useState({date:new Date().toISOString().slice(0,10),networth:String(agg.net),note:""});
    return (
      <Sheet title="Nettowert-Snapshot" onClose={()=>setModal(null)} T={T}>
        <div style={{background:T.surfaceHigh,border:"1px solid "+T.border,borderRadius:8,padding:12,marginBottom:14}}>
          <div style={{fontSize:9,color:T.textLow,marginBottom:3}}>Aktueller Nettowert</div>
          <div style={{fontSize:22,fontWeight:900,color:T.accent}}>{full(agg.net)}</div>
        </div>
        <Inp label="Datum" value={f.date} onChange={v=>setF(p=>({...p,date:v}))} type="date" T={T}/>
        <Inp label="Nettovermogen (EUR)" value={f.networth} onChange={v=>setF(p=>({...p,networth:v}))} type="number" T={T}/>
        <Inp label="Notiz" value={f.note} onChange={v=>setF(p=>({...p,note:v}))} placeholder="z.B. Q1 Rebalancing" T={T}/>
        <Btn full color={T.green} T={T} onClick={()=>{
          updArr("snapshots",[...(s.snapshots||[]),{id:uid(),date:f.date,value:+f.networth||0,note:f.note}]);
          setModal(null);
        }}>Speichern</Btn>
      </Sheet>
    );
  };

  const AffordModal = () => {
    const [amt,setAmt]=useState("");
    const [type,setType]=useState("Einmalig");
    const [lbl,setLbl]=useState("");
    const amount=parseFloat(amt)||0;
    const monthly=type==="Monatlich"?amount:type==="Jahrlich"?amount/12:0;
    const baseEnd=final.base||0;
    const r=agg.wavgReturn/100;
    const rm=r/12;
    const impact=type==="Einmalig"
      ? amount*Math.pow(1+r,s.horizon)
      : monthly>0&&rm>0 ? monthly*((Math.pow(1+rm,s.horizon*12)-1)/rm) : monthly*s.horizon*12;
    const newEnd=Math.max(0,baseEnd-impact);
    const pctI=baseEnd>0?(impact/baseEnd)*100:0;
    const canAfford=type==="Einmalig"||monthly<=(cf.saldo||0);
    return (
      <Sheet title="Was kann ich mir leisten?" onClose={()=>setModal(null)} T={T}>
        <Inp label="Bezeichnung" value={lbl} onChange={setLbl} placeholder="z.B. Neues Auto..." T={T}/>
        <SelEl label="Typ" value={type} onChange={setType} options={["Einmalig","Monatlich","Jahrlich"]} T={T}/>
        <Inp label="Betrag (EUR)" value={amt} onChange={setAmt} type="number" placeholder="0" T={T}/>
        {amount>0&&(
          <>
            <div style={{background:T.surfaceHigh,border:"1px solid "+T.border,borderRadius:8,padding:13,marginBottom:10}}>
              <div style={{fontSize:9,color:T.textMid,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Machbarkeit</div>
              {type==="Einmalig"?(
                <div style={{fontSize:11,color:T.textMid,lineHeight:1.7}}>
                  Aus Liquiditat ({fmtE(s.assets.filter(a=>a.class==="Cash").reduce((t,a)=>t+a.value,0))}) oder {Math.ceil(amount/(cf.eff||1))} Monate ansparen.
                </div>
              ):(
                <>
                  <Row label="Monatlicher Betrag" value={full(monthly)+"/Mo."} T={T}/>
                  <Row label="Aktueller Saldo" value={full(cf.saldo)+"/Mo."} type={cf.saldo>=0?"in":"out"} T={T}/>
                  <Row label="Neue Sparrate" value={full(cf.eff-monthly)+"/Mo."} type={cf.eff-monthly>=0?"in":"out"} T={T}/>
                  <div style={{marginTop:10,background:canAfford?T.green+"15":T.red+"15",border:"1px solid "+(canAfford?T.green:T.red)+"44",borderRadius:7,padding:"9px 12px",fontSize:13,fontWeight:700,color:canAfford?T.green:T.red,textAlign:"center"}}>
                    {canAfford?"Finanzierbar":"Ubersteigt Saldo um "+full(monthly-(cf.saldo||0))+"/Mo."}
                  </div>
                </>
              )}
            </div>
            <div style={{background:T.surfaceHigh,border:"1px solid "+T.border,borderRadius:8,padding:13,marginBottom:12}}>
              <div style={{fontSize:9,color:T.textMid,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Langfristiger Effekt ({s.horizon} J.)</div>
              <div style={{fontSize:9,color:T.textDim,marginBottom:8}}>Opportunitatskosten bei {agg.wavgReturn.toFixed(1)}% gew. Ø-Rendite</div>
              <Row label="Projektion ohne" value={fmtE(baseEnd)} T={T}/>
              <Row label="Entgangenes Wachstum" value={"-"+fmtE(impact)} type="out" T={T}/>
              <Row label="Projektion mit" value={fmtE(newEnd)} type="in" bold T={T}/>
              <div style={{marginTop:10}}>
                <div style={{background:T.border,borderRadius:5,overflow:"hidden",height:7,marginBottom:5}}>
                  <div style={{height:"100%",background:T.accent,width:Math.max(2,100-pctI)+"%",transition:"width 0.4s"}}/>
                </div>
                <div style={{fontSize:10,color:T.textLow,textAlign:"center"}}>Kostet {pctI.toFixed(1)}% des projizierten Endvermoegens</div>
              </div>
            </div>
            {lbl&&<Btn full color={T.purple} T={T} onClick={()=>{
              updArr("buckets",[...(s.buckets||[]),{id:uid(),name:lbl,type,amount,year:String(CY),color:BCK_CLRS[0],note:"via Affordability"}]);
              setModal(null);
            }}>Als Bucket speichern</Btn>}
          </>
        )}
      </Sheet>
    );
  };

  const AssetModal = ({ data }) => {
    const [f,setF]=useState(data||{name:"",owner:"ehemann",class:"Aktien-ETF",liquidity:"Liquide",value:"",debt:"",locked:false,note:"",loanRate:"3.5",loanTilgung:"0",loanAnnuitat:"0"});
    const handleClassChange=(cls)=>{setF(p=>({...p,class:cls,liquidity:LIQUIDITY_DEFAULT[cls]||"Semi-liquide"}));};
    const hasDebt = (parseFloat(f.debt)||0)>0;
    return (
      <Sheet title={data?.id?"Position bearbeiten":"Position hinzufugen"} onClose={()=>setModal(null)} T={T}>
        <Inp label="Bezeichnung" value={f.name} onChange={v=>setF(p=>({...p,name:v}))} placeholder="z.B. MSCI World ETF" T={T}/>
        <SelEl label="Eigentumer" value={f.owner} onChange={v=>setF(p=>({...p,owner:v}))}
          options={[{value:"ehemann",label:"Ehemann"},{value:"ehefrau",label:"Ehefrau"},{value:"gemeinschaft",label:"Gemeinschaft"}]} T={T}/>
        <SelEl label="Asset-Klasse" value={f.class} onChange={handleClassChange} options={ASSET_CLASSES} T={T}/>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {LIQUIDITY_CATS.map(l=>(
            <div key={l} onClick={()=>setF(p=>({...p,liquidity:l}))}
              style={{flex:1,padding:"7px 4px",borderRadius:7,border:"2px solid "+(f.liquidity===l?LIQ_CLR[l]:T.border),background:f.liquidity===l?LIQ_CLR[l]+"18":"transparent",cursor:"pointer",textAlign:"center"}}>
              <div style={{fontSize:9,fontWeight:700,color:f.liquidity===l?LIQ_CLR[l]:T.textLow}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Marktwert (EUR)" value={f.value} onChange={v=>setF(p=>({...p,value:v}))} type="number" T={T}/>
          <Inp label="Schulden (EUR)" value={f.debt||""} onChange={v=>setF(p=>({...p,debt:v}))} type="number" placeholder="0" T={T}/>
        </div>
        {hasDebt&&(
          <div style={{background:T.surfaceHigh,border:"1px solid "+T.border,borderRadius:8,padding:12,marginBottom:12}}>
            <div style={{fontSize:9,color:T.textMid,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Darlehensdetails</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <Inp label="Zinssatz %" value={f.loanRate} onChange={v=>setF(p=>({...p,loanRate:v}))} type="number" T={T}/>
              <Inp label="Tilgung/Mo." value={f.loanTilgung} onChange={v=>setF(p=>({...p,loanTilgung:v}))} type="number" T={T}/>
              <Inp label="Annuitat/Mo." value={f.loanAnnuitat} onChange={v=>setF(p=>({...p,loanAnnuitat:v}))} type="number" T={T}/>
            </div>
            {f.loanTilgung>0&&f.debt>0&&(
              <div style={{fontSize:9,color:T.accent,marginTop:4}}>
                Schuldenfrei in ca. {Math.ceil((parseFloat(f.debt)||0)/((parseFloat(f.loanTilgung)||1)*12))} Jahren
              </div>
            )}
          </div>
        )}
        <Inp label="Notiz" value={f.note} onChange={v=>setF(p=>({...p,note:v}))} placeholder="Optional" T={T}/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 12px",background:T.surfaceHigh,borderRadius:8,border:"1px solid "+T.border}}>
          <input type="checkbox" checked={!!f.locked} onChange={e=>setF(p=>({...p,locked:e.target.checked}))} id="lck" style={{accentColor:T.amber,width:18,height:18}}/>
          <label htmlFor="lck" style={{fontSize:13,color:T.textMid,cursor:"pointer"}}>Gesperrt / unumschichtbar</label>
        </div>
        <Btn full color={T.green} T={T} onClick={()=>{
          const asset={...f,id:f.id||uid(),value:+f.value||0,debt:+f.debt||0,loanRate:+f.loanRate||0,loanTilgung:+f.loanTilgung||0,loanAnnuitat:+f.loanAnnuitat||0,liquidity:f.liquidity||"Liquide"};
          if(data?.id) updArr("assets",s.assets.map(a=>a.id===asset.id?asset:a));
          else updArr("assets",[...s.assets,asset]);
          setModal(null);
        }}>Speichern</Btn>
      </Sheet>
    );
  };

  const BucketModal = ({ data }) => {
    const [f,setF]=useState(data||{name:"",type:"Einmalig",amount:"",year:"",age:"",color:BCK_CLRS[0],note:""});
    return (
      <Sheet title={data?.id?"Bucket bearbeiten":"Bucket anlegen"} onClose={()=>setModal(null)} T={T}>
        <Inp label="Bezeichnung" value={f.name} onChange={v=>setF(p=>({...p,name:v}))} placeholder="z.B. Urlaub 2026" T={T}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <SelEl label="Typ" value={f.type} onChange={v=>setF(p=>({...p,type:v}))} options={["Einmalig","Jahrlich","Monatlich","Reserve"]} T={T}/>
          <Inp label="Betrag (EUR)" value={f.amount} onChange={v=>setF(p=>({...p,amount:v}))} type="number" T={T}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Zieljahr" value={f.year} onChange={v=>setF(p=>({...p,year:v,age:""}))} type="number" placeholder={String(CY+2)} T={T}/>
          <Inp label="oder Alter" value={f.age} onChange={v=>setF(p=>({...p,age:v,year:""}))} type="number" placeholder="33" T={T}/>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:9,color:T.textMid,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Farbe</div>
          <div style={{display:"flex",gap:10}}>
            {BCK_CLRS.map(c=>(
              <div key={c} onClick={()=>setF(p=>({...p,color:c}))}
                style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:f.color===c?"3px solid "+T.text:"3px solid transparent"}}/>
            ))}
          </div>
        </div>
        <Btn full color={T.green} T={T} onClick={()=>{
          const b={...f,id:f.id||uid(),amount:+f.amount||0};
          if(data?.id) updArr("buckets",s.buckets.map(x=>x.id===b.id?b:x));
          else updArr("buckets",[...(s.buckets||[]),b]);
          setModal(null);
        }}>Speichern</Btn>
      </Sheet>
    );
  };

  // ============================================================ TABS ===
  const TABS=[
    {k:"dashboard",lbl:"Ubersicht"},
    {k:"haushalt", lbl:"Haushalt"},
    {k:"vermogen", lbl:"Vermogen"},
    {k:"projektion",lbl:"Projektion"},
    {k:"buckets",  lbl:"Ausgaben"},
  ];

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"system-ui,-apple-system,'Helvetica Neue',sans-serif",paddingBottom:"calc(64px + env(safe-area-inset-bottom,0px))",transition:"background 0.2s,color 0.2s"}}>

      {modal?.type==="checkin"  && <CheckinModal/>}
      {modal?.type==="snapshot" && <SnapshotModal/>}
      {modal?.type==="afford"   && <AffordModal/>}
      {modal?.type==="asset"    && <AssetModal data={modal.data}/>}
      {modal?.type==="bucket"   && <BucketModal data={modal.data}/>}

      {/* Header */}
      <div style={{background:T.header,borderBottom:"1px solid "+T.tabBorder,padding:"14px 16px 10px",paddingTop:"calc(14px + env(safe-area-inset-top,0px))",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:8,letterSpacing:"0.22em",color:T.textDim,fontWeight:700,textTransform:"uppercase"}}>Vermogensplaner</div>
            <div style={{display:"flex",alignItems:"baseline",gap:10,marginTop:2}}>
              <div style={{fontSize:22,fontWeight:900,color:T.text,letterSpacing:"-0.02em"}}>{fmtE(agg.net)}</div>
              <div style={{fontSize:11,color:cf.quote>=20?T.green:cf.quote>=10?T.amber:T.red,fontWeight:700}}>{cf.quote.toFixed(1)}% Sparquote</div>
            </div>
            <div style={{fontSize:9,color:T.textDim,marginTop:1}}>Gew. Ø-Rendite: {agg.wavgReturn.toFixed(1)}%</div>
          </div>
          <button onClick={()=>upd({dark:!s.dark})}
            style={{background:T.surface,border:"1px solid "+T.border,borderRadius:20,padding:"6px 12px",cursor:"pointer",fontSize:13,color:T.textMid,WebkitTapHighlightColor:"transparent",marginTop:4}}>
            {s.dark?"Light":"Dark"}
          </button>
        </div>
      </div>

      <div style={{padding:"14px 14px 4px",maxWidth:600,margin:"0 auto"}}>

        {/* ========== DASHBOARD ========== */}
        {tab==="dashboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[
                {lbl:"Check-in",sub:lastCI?mlbl(lastCI.month):"Noch keiner",type:"checkin",color:T.accent},
                {lbl:"Snapshot",sub:(s.snapshots?.length||0)+" gespeichert",type:"snapshot",color:T.green},
                {lbl:"Leisten?",sub:"Affordability",type:"afford",color:T.purple},
              ].map(({lbl,sub,type,color})=>(
                <button key={type} onClick={()=>setModal({type})}
                  style={{background:T.surface,border:"1px solid "+color+"22",borderRadius:12,padding:"13px 6px",cursor:"pointer",textAlign:"center",WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:11,fontWeight:700,color}}>{lbl}</div>
                  <div style={{fontSize:8,color:T.textLow,marginTop:3}}>{sub}</div>
                </button>
              ))}
            </div>

            {/* Liquidity breakdown */}
            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:14}}>
              <div style={{fontSize:9,color:T.textLow,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Liquiditat des Vermogens</div>
              <div style={{display:"flex",borderRadius:6,overflow:"hidden",height:10,marginBottom:10}}>
                {LIQUIDITY_CATS.map(l=>{
                  const w=agg.net>0?((agg.byLiquidity[l]||0)/agg.net*100):0;
                  return w>0?<div key={l} style={{width:w+"%",background:LIQ_CLR[l]}}/>:null;
                })}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {LIQUIDITY_CATS.map(l=>(
                  <div key={l} style={{borderTop:"3px solid "+LIQ_CLR[l],paddingTop:6}}>
                    <div style={{fontSize:9,color:LIQ_CLR[l],fontWeight:700}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:900,color:T.text}}>{fmtE(agg.byLiquidity[l]||0)}</div>
                    <div style={{fontSize:9,color:T.textDim}}>{agg.net>0?((agg.byLiquidity[l]||0)/agg.net*100).toFixed(0)+"%":"0%"}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Loan summary if any */}
            {loanSummary.length>0&&(
              <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:14}}>
                <div style={{fontSize:9,color:T.textLow,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Laufende Darlehen</div>
                {loanSummary.map(l=>(
                  <div key={l.id} style={{borderBottom:"1px solid "+T.border,paddingBottom:8,marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:T.text}}>{l.name}</div>
                        <div style={{fontSize:9,color:T.textDim,marginTop:1}}>
                          Restschuld {full(l.debt)} | Zinsen {full(l.zinsen)}/Mo. | Tilgung {full(l.tilgung)}/Mo.
                        </div>
                        {l.yrsLeft&&<div style={{fontSize:9,color:T.accent,marginTop:1}}>Schuldenfrei ca. {CY+l.yrsLeft} (Alter {30+l.yrsLeft})</div>}
                      </div>
                      <div style={{fontSize:12,fontWeight:800,color:T.red}}>{full(l.annuitat)}/Mo.</div>
                    </div>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:4}}>
                  <span style={{fontSize:10,color:T.textMid}}>Gesamt Annuitat/Mo.</span>
                  <span style={{fontSize:13,fontWeight:900,color:T.red}}>{full(totalMonthlyLoanPayment)}</span>
                </div>
              </div>
            )}

            {lastCI&&(()=>{
              const dA=(lastCI.ausgaben_ist||0)-s.ausgaben;
              const dS=(lastCI.sparrate_ist||0)-cf.eff;
              return (
                <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:14}}>
                  <div style={{fontSize:9,color:T.textLow,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Check-in {mlbl(lastCI.month)}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[{lbl:"Ausgaben IST",val:full(lastCI.ausgaben_ist),delta:dA,inv:true},{lbl:"Investiert",val:full(lastCI.sparrate_ist),delta:dS,inv:false},{lbl:"Reserven",val:full(lastCI.reserven_ist),delta:null}].map(({lbl,val,delta,inv})=>(
                      <div key={lbl}>
                        <div style={{fontSize:9,color:T.textDim}}>{lbl}</div>
                        <div style={{fontSize:13,fontWeight:800,color:T.text}}>{val}</div>
                        {delta!==null&&<div style={{fontSize:9,color:(inv?delta>0:delta<0)?T.red:T.green,marginTop:1}}>{delta>=0?"+":""}{full(delta)} vs Plan</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {snaps.length>=2&&(
              <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:"13px 4px 8px"}}>
                <div style={{paddingLeft:12,fontSize:9,color:T.textLow,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Nettovermogen-Verlauf</div>
                <ResponsiveContainer width="100%" height={110}>
                  <AreaChart data={snaps} margin={{top:4,right:8,left:0,bottom:0}}>
                    <defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.accent} stopOpacity={0.3}/><stop offset="95%" stopColor={T.accent} stopOpacity={0.02}/></linearGradient></defs>
                    <XAxis dataKey="date" tick={{fill:T.textLow,fontSize:8}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:T.textLow,fontSize:8}} tickFormatter={fmtE} width={46} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v=>[full(v),"Nettovermogen"]} contentStyle={{background:T.surface,border:"1px solid "+T.border,borderRadius:6,fontSize:10,color:T.text}}/>
                    <Area type="monotone" dataKey="value" stroke={T.accent} fill="url(#gs)" strokeWidth={2} dot={{fill:T.accent,r:3}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Tile label="Basis-Projektion" value={fmtE(final.base)} sub={"Konservativ: "+fmtE(final.cons)} color={T.accent} T={T}/>
              <Tile label="Eff. Sparrate" value={full(cf.eff)+"/Mo."} sub={"Sparquote "+cf.quote.toFixed(1)+"%"} color={T.green} T={T}/>
              <Tile label="Gew. Avg-Rendite" value={agg.wavgReturn.toFixed(1)+"%"} sub={"auf Basis aktueller Allokation"} color={T.amber} T={T}/>
              <Tile label="Aktive Buckets" value={String(s.buckets?.length||0)} sub={s.buckets?.length?"Fliesst in Projektion":"Noch keine"} color={T.purple} T={T}/>
            </div>
          </div>
        )}

        {/* ========== HAUSHALT ========== */}
        {tab==="haushalt"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {cf.rest<0&&(
              <div style={{background:T.red+"15",border:"1px solid "+T.red+"44",borderRadius:8,padding:"9px 13px",fontSize:11,color:T.red}}>
                Ausgaben ubersteigen Einkommen um {full(Math.abs(cf.rest))}/Mo.
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Tile label="Gesamtzufluss" value={full(cf.avail)} sub={"Netto + Immo "+full(cf.immoNetCF)} color={T.green} T={T}/>
              <Tile label="Sparrate" value={full(cf.eff)} sub={s.autoSpar?"Auto":"Manuell"} color={T.accent} T={T}/>
            </div>
            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:16,display:"flex",flexDirection:"column",gap:20}}>
              <Sl label="Netto-Haushaltseinkommen/Mo." value={s.nettoGesamt} min={2000} max={25000} step={100} onChange={v=>upd({nettoGesamt:v})} fmt={full} color={T.green} T={T}/>
              <Sl label="Laufende Haushaltsausgaben/Mo." value={s.ausgaben} min={500} max={8000} step={100} onChange={v=>upd({ausgaben:v})} fmt={full} color={T.red} note="Miete, Kita, Versicherungen, lfd. Kosten" T={T}/>
              <Sl label="Reserven / Unregelmassiges" value={s.reservenMonthly} min={0} max={3000} step={50} onChange={v=>upd({reservenMonthly:v})} fmt={full} color={T.amber} T={T}/>
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontSize:9,color:T.textMid,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Sparrate</div>
                  <button onClick={()=>upd({autoSpar:!s.autoSpar})} style={{fontSize:11,padding:"5px 12px",borderRadius:6,border:"1px solid "+(s.autoSpar?T.accent:T.border),background:s.autoSpar?T.accent+"18":"transparent",color:s.autoSpar?T.accent:T.textMid,cursor:"pointer",fontWeight:700,WebkitTapHighlightColor:"transparent"}}>
                    {s.autoSpar?"Auto":"Manuell"}
                  </button>
                </div>
                {s.autoSpar?(
                  <div style={{background:T.surfaceHigh,borderRadius:7,padding:"11px 13px",fontSize:12,color:T.textMid,lineHeight:1.7}}>
                    {full(cf.avail)} - {full(s.ausgaben)} - {full(s.reservenMonthly)} = <strong style={{color:cf.eff>0?T.accent:T.red,fontSize:15}}>{full(cf.eff)}/Mo.</strong>
                  </div>
                ):(
                  <Sl label="" value={s.manuellSparrate} min={0} max={6000} step={100} onChange={v=>upd({manuellSparrate:v})} fmt={full} color={T.accent} warn={s.manuellSparrate>cf.rest} note={s.manuellSparrate>cf.rest?"Ubersteigt Rest ("+full(cf.rest)+")":"Saldo: "+full(cf.saldo)+"/Mo."} T={T}/>
                )}
              </div>
            </div>

            {/* Sparrate distribution */}
            {cf.eff>0&&sparDist.length>0&&(
              <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:14}}>
                <div style={{fontSize:9,color:T.textLow,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Sparraten-Verteilung nach Klasse</div>
                <div style={{fontSize:9,color:T.textDim,marginBottom:10}}>Proportional zur aktuellen Gewichtung der investierbaren Positionen</div>
                {sparDist.map(({cls,share,monthly})=>(
                  <div key={cls} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:ASSET_CLASS_DEFAULTS[cls]?.color||T.textMid,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                        <span style={{fontSize:10,color:T.textMid}}>{cls}</span>
                        <span style={{fontSize:10,fontWeight:700,color:T.text}}>{full(monthly)}/Mo.</span>
                      </div>
                      <div style={{background:T.border,borderRadius:3,height:4,overflow:"hidden"}}>
                        <div style={{height:"100%",background:ASSET_CLASS_DEFAULTS[cls]?.color||T.accent,width:(share*100)+"%"}}/>
                      </div>
                    </div>
                    <span style={{fontSize:9,color:T.textDim,width:32,textAlign:"right"}}>{(share*100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:14}}>
              <div style={{fontSize:9,color:T.textLow,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Monatsubersicht</div>
              <Row label="Netto-Einkommen" value={"+" + full(s.nettoGesamt)} type="in" T={T}/>
              <Row label="Immo-Mieteinnahmen" value={"+" + full(cf.immoGross)} type="in" sub="Brutto-Kaltmiete" T={T}/>
              <Row label="Darlehen Annuitat" value={"-" + full(totalMonthlyLoanPayment)} type="out" sub="Zins + Tilgung" T={T}/>
              <Row label="Immo-Nebenkosten" value={"-" + full(cf.immoRunning)} type="out" sub="Hausgeld + Grundsteuer" T={T}/>
              <Row label="Gesamtzufluss" value={"+" + full(cf.avail)} type="in" bold T={T}/>
              <Row label="Haushaltsausgaben" value={"-" + full(s.ausgaben)} type="out" T={T}/>
              <Row label="Reserven" value={"-" + full(s.reservenMonthly)} type="out" T={T}/>
              <Row label="Sparrate" value={"-" + full(cf.eff)} type="out" T={T}/>
              <Row label="Monatssaldo" value={(cf.saldo>=0?"+":"")+full(cf.saldo)} type={cf.saldo>=0?"in":"warn"} bold T={T}/>
            </div>
            {s.checkins?.length>0&&(
              <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:14}}>
                <div style={{fontSize:9,color:T.textLow,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Check-in Verlauf</div>
                {[...s.checkins].sort((a,b)=>b.month.localeCompare(a.month)).slice(0,6).map(ci=>{
                  const dA=ci.ausgaben_ist-s.ausgaben,dS=ci.sparrate_ist-cf.eff;
                  return (
                    <div key={ci.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid "+T.border,paddingBottom:8,marginBottom:8}}>
                      <div style={{fontSize:11,color:T.textMid,fontWeight:600}}>{mlbl(ci.month)}</div>
                      <div style={{display:"flex",gap:12,fontSize:10}}>
                        <span style={{color:dA>0?T.red:T.green}}>HH {dA>0?"+":""}{full(dA)}</span>
                        <span style={{color:dS>=0?T.green:T.amber}}>Spar {dS>=0?"+":""}{full(dS)}</span>
                      </div>
                      <Btn sm danger T={T} onClick={()=>updArr("checkins",s.checkins.filter(c=>c.id!==ci.id))}>x</Btn>
                    </div>
                  );
                })}
              </div>
            )}
            <Btn full color={T.accent} T={T} onClick={()=>setModal({type:"checkin"})}>+ Monatliches Check-in</Btn>
          </div>
        )}

        {/* ========== VERMOGEN ========== */}
        {tab==="vermogen"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              <Tile label="Brutto" value={fmtE(agg.gross)} color={T.text} T={T}/>
              <Tile label="Schulden" value={"-"+fmtE(agg.debt)} color={T.red} T={T}/>
              <Tile label="Netto" value={fmtE(agg.net)} color={T.accent} T={T}/>
            </div>

            {/* CLASS RETURNS - per asset class */}
            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:16}}>
              <div style={{fontSize:9,color:T.textLow,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Renditeerwartungen nach Asset-Klasse</div>
              <div style={{fontSize:9,color:T.textDim,marginBottom:14}}>Gilt fur alle Positionen der jeweiligen Klasse. Gewichteter Durchschnitt: <strong style={{color:T.amber}}>{agg.wavgReturn.toFixed(1)}% p.a.</strong></div>
              {ASSET_CLASSES.filter(cls => s.assets.some(a=>a.class===cls)).map(cls=>{
                const clsAssets=s.assets.filter(a=>a.class===cls);
                const clsNet=clsAssets.reduce((t,a)=>t+(a.value||0)-(a.debt||0),0);
                const weight=agg.net>0?(clsNet/agg.net*100):0;
                return (
                  <div key={cls} style={{marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:ASSET_CLASS_DEFAULTS[cls]?.color||T.textMid}}/>
                        <span style={{fontSize:11,fontWeight:600,color:T.text}}>{cls}</span>
                        <span style={{fontSize:9,color:T.textDim}}>{fmtE(clsNet)} ({weight.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <Sl label="" value={s.classReturns[cls]||5} min={0} max={cls==="Aktien"||cls==="Krypto"||cls==="Private Equity"?30:15} step={0.5}
                      onChange={v=>updClass(cls,v)} fmt={v=>v.toFixed(1)+"%"} color={ASSET_CLASS_DEFAULTS[cls]?.color||T.accent} T={T}/>
                  </div>
                );
              })}
            </div>

            {/* Liquidity */}
            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:14}}>
              <div style={{fontSize:9,color:T.textLow,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Liquiditat</div>
              <div style={{display:"flex",borderRadius:6,overflow:"hidden",height:10,marginBottom:10}}>
                {LIQUIDITY_CATS.map(l=>{const w=agg.net>0?((agg.byLiquidity[l]||0)/agg.net*100):0;return w>0?<div key={l} style={{width:w+"%",background:LIQ_CLR[l]}}/>:null;})}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {LIQUIDITY_CATS.map(l=>(
                  <div key={l}>
                    <div style={{fontSize:9,color:LIQ_CLR[l],fontWeight:700}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:800,color:T.text}}>{fmtE(agg.byLiquidity[l]||0)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Asset list */}
            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:9,color:T.textLow,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Positionen</div>
                <Btn sm color={T.green} T={T} onClick={()=>setModal({type:"asset",data:null})}>+ Position</Btn>
              </div>
              {s.assets.map(a=>(
                <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:"1px solid "+T.border,paddingBottom:10,marginBottom:10}}>
                  <div style={{display:"flex",gap:9,alignItems:"flex-start",flex:1,minWidth:0}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:ASSET_CLASS_DEFAULTS[a.class]?.color||T.textMid,marginTop:4,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:T.text,fontWeight:600}}>
                        {a.name}
                        {a.locked&&<span style={{fontSize:7,color:T.amber,background:T.amber+"18",padding:"1px 4px",borderRadius:3,marginLeft:5}}>GESPERRT</span>}
                      </div>
                      <div style={{display:"flex",gap:5,marginTop:2,flexWrap:"wrap"}}>
                        <span style={{fontSize:8,color:T.textLow}}>{a.class}</span>
                        <span style={{fontSize:8,color:LIQ_CLR[a.liquidity||"Semi-liquide"],background:LIQ_CLR[a.liquidity||"Semi-liquide"]+"18",padding:"1px 5px",borderRadius:3}}>{a.liquidity||"Semi-liquide"}</span>
                        <span style={{fontSize:8,color:ASSET_CLASS_DEFAULTS[a.class]?.color||T.textDim}}>{(s.classReturns[a.class]||5).toFixed(1)}% p.a.</span>
                      </div>
                      {(a.debt||0)>0&&(
                        <div style={{fontSize:8,color:T.red,marginTop:2}}>
                          Schulden {full(a.debt)} | {full(a.loanAnnuitat||0)}/Mo. Annuitat
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:12,fontWeight:800,color:T.text}}>{fmtE(a.value)}</div>
                      {(a.debt||0)>0&&<div style={{fontSize:9,color:T.green}}>netto {fmtE((a.value||0)-(a.debt||0))}</div>}
                    </div>
                    <Btn sm T={T} onClick={()=>setModal({type:"asset",data:a})}>edit</Btn>
                    <Btn sm danger T={T} onClick={()=>updArr("assets",s.assets.filter(x=>x.id!==a.id))}>x</Btn>
                  </div>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid "+T.border}}>
                <span style={{fontSize:10,color:T.textLow}}>Schulden <strong style={{color:T.red}}>-{fmtE(agg.debt)}</strong></span>
                <span style={{fontSize:10,color:T.textLow}}>Netto <strong style={{color:T.accent}}>{fmtE(agg.net)}</strong></span>
              </div>
            </div>

            {/* Snapshots */}
            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:9,color:T.textLow,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Nettowert-Snapshots</div>
                <Btn sm color={T.green} T={T} onClick={()=>setModal({type:"snapshot"})}>+ Snapshot</Btn>
              </div>
              {!s.snapshots?.length
                ?<div style={{fontSize:11,color:T.textDim,textAlign:"center",padding:"8px 0"}}>Noch keine - einmal im Quartal eintragen</div>
                :[...(s.snapshots||[])].sort((a,b)=>b.date.localeCompare(a.date)).map(sn=>(
                  <div key={sn.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid "+T.border,paddingBottom:7,marginBottom:7}}>
                    <div>
                      <div style={{fontSize:11,color:T.textMid,fontWeight:600}}>{sn.date}</div>
                      {sn.note&&<div style={{fontSize:9,color:T.textDim}}>{sn.note}</div>}
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <div style={{fontSize:13,fontWeight:800,color:T.accent}}>{fmtE(sn.value)}</div>
                      <Btn sm danger T={T} onClick={()=>updArr("snapshots",s.snapshots.filter(x=>x.id!==sn.id))}>x</Btn>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ========== PROJEKTION ========== */}
        {tab==="projektion"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>

            {/* Toggles */}
            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:14,display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <button onClick={()=>upd({inflationAdj:!s.inflationAdj})}
                  style={{padding:"6px 13px",borderRadius:6,border:"1px solid "+(s.inflationAdj?T.amber:T.border),background:s.inflationAdj?T.amber+"18":"transparent",color:s.inflationAdj?T.amber:T.textMid,cursor:"pointer",fontSize:11,fontWeight:700,WebkitTapHighlightColor:"transparent"}}>
                  Inflation {s.inflationAdj?s.inflation+"% ein":"aus"}
                </button>
                <button onClick={()=>upd({sparRateGrowth:!s.sparRateGrowth})}
                  style={{padding:"6px 13px",borderRadius:6,border:"1px solid "+(s.sparRateGrowth?T.green:T.border),background:s.sparRateGrowth?T.green+"18":"transparent",color:s.sparRateGrowth?T.green:T.textMid,cursor:"pointer",fontSize:11,fontWeight:700,WebkitTapHighlightColor:"transparent"}}>
                  Sparrate wachst {s.sparRateGrowth?s.sparGrowthPct+"%/J. ein":"aus"}
                </button>
              </div>
              {s.inflationAdj&&(
                <Sl label="Inflationsrate" value={s.inflation} min={0.5} max={6} step={0.25} onChange={v=>upd({inflation:v})} fmt={v=>v+"%"} color={T.amber} T={T}/>
              )}
              {s.sparRateGrowth&&(
                <Sl label="Sparraten-Wachstum p.a." value={s.sparGrowthPct||2} min={0.5} max={10} step={0.5} onChange={v=>upd({sparGrowthPct:v})} fmt={v=>v+"%"} color={T.green}
                  note="Sparrate steigt jahrlich (z.B. mit Gehaltserhoehungen)"
                  sub={"In 10 Jahren: "+full(cf.eff*Math.pow(1+(s.sparGrowthPct||2)/100,10))+"/Mo."}
                  T={T}/>
              )}
              <Sl label="Zeithorizont" value={s.horizon} min={10} max={45} step={5} onChange={v=>upd({horizon:v})} fmt={v=>v+"J (Alter "+(30+v)+")"} color={T.purple} T={T}/>
            </div>

            {/* Methodology note */}
            <div style={{background:T.surfaceHigh,border:"1px solid "+T.border,borderRadius:8,padding:"10px 13px",fontSize:10,color:T.textMid,lineHeight:1.7}}>
              <strong style={{color:T.text}}>Berechnungslogik:</strong> Jede Position wachst mit der Rendite ihrer Asset-Klasse. Sparrate wird proportional zur aktuellen Gewichtung der investierbaren Positionen verteilt. Darlehen: Tilgung reduziert Restschuld jahrlich, nach Payoff entfallt die Annuitat aus dem Cashflow. {s.inflationAdj?"Alle Werte real (inflationsbereinigt).":"Alle Werte nominal."} Szenarien: +-2% Abweichung von der Klassenrendite.
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[{k:"cons",l:"Konservativ",c:T.textMid},{k:"base",l:"Basis",c:T.accent},{k:"opt",l:"Optimistisch",c:T.green}].map(({k,l,c})=>(
                <div key={k} style={{background:T.surface,border:"1px solid "+c+"33",borderRadius:9,padding:11}}>
                  <div style={{fontSize:8,color:c,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:2}}>{l}</div>
                  <div style={{fontSize:18,fontWeight:900,color:T.text}}>{fmtE(final[k])}</div>
                  <div style={{fontSize:8,color:T.textDim,marginTop:2}}>{s.inflationAdj?"real":"nominal"}</div>
                </div>
              ))}
            </div>

            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:"13px 4px 8px"}}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={projection} margin={{top:4,right:10,left:0,bottom:0}}>
                  <defs>
                    {[["cons",T.textMid],["base",T.accent],["opt",T.green]].map(([k,c])=>(
                      <linearGradient key={k} id={"pg"+k} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={c} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={c} stopOpacity={0.02}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis dataKey="age" tick={{fill:T.textLow,fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:T.textLow,fontSize:9}} tickFormatter={fmtE} width={50} axisLine={false} tickLine={false}/>
                  <Tooltip content={(props)=><ChTip {...props} T={T}/>}/>
                  <Area type="monotone" dataKey="cons" name="Konservativ" stroke={T.textMid} fill="url(#pgcons)" strokeWidth={1.5} dot={false}/>
                  <Area type="monotone" dataKey="base" name="Basis" stroke={T.accent} fill="url(#pgbase)" strokeWidth={2.5} dot={false}/>
                  <Area type="monotone" dataKey="opt"  name="Optimistisch" stroke={T.green} fill="url(#pgopt)" strokeWidth={1.5} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <button onClick={()=>setModal({type:"afford"})}
              style={{background:T.surface,border:"1px solid "+T.purple+"33",borderRadius:10,padding:14,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",WebkitTapHighlightColor:"transparent"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:T.purple}}>Was kann ich mir leisten?</div>
                <div style={{fontSize:10,color:T.textLow,marginTop:2}}>Pruft Budget + Langzeitauswirkung</div>
              </div>
              <div style={{fontSize:20,color:T.purple}}>{">"}</div>
            </button>

            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:14}}>
              <div style={{fontSize:9,color:T.textLow,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Meilensteine Basis-Szenario</div>
              {[1000000,2000000,3000000,5000000].map(t=>{
                const hit=projection.find(d=>d.base>=t);
                return (
                  <div key={t} style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid "+T.border,paddingBottom:8,marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:800,color:T.accent}}>{fmtE(t)}</div>
                    {hit?<div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:700,color:T.green}}>Alter {hit.age}</div><div style={{fontSize:9,color:T.textDim}}>in {hit.age-30} J.</div></div>
                      :<div style={{fontSize:10,color:T.red}}>Nicht im Horizont</div>}
                  </div>
                );
              })}
              {loanSummary.map(l=>l.yrsLeft&&(
                <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid "+T.border,paddingBottom:8,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:T.purple}}>{l.name} schuldenfrei</div>
                    <div style={{fontSize:9,color:T.textDim}}>+{full(l.annuitat)}/Mo. frei</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:12,fontWeight:700,color:T.purple}}>{CY+l.yrsLeft}</div>
                    <div style={{fontSize:9,color:T.textDim}}>Alter {30+l.yrsLeft}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== BUCKETS ========== */}
        {tab==="buckets"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:900,color:T.text,fontSize:15}}>Ausgaben-Buckets</div>
                <div style={{fontSize:10,color:T.textDim,marginTop:2}}>Fliesst in Projektion ein</div>
              </div>
              <Btn color={T.green} T={T} onClick={()=>setModal({type:"bucket",data:null})}>+ Bucket</Btn>
            </div>
            {!s.buckets?.length&&(
              <div style={{background:T.surface,border:"1px dashed "+T.border,borderRadius:10,padding:30,textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:600,color:T.textMid}}>Noch keine Buckets</div>
                <div style={{fontSize:10,color:T.textDim,marginTop:4,marginBottom:18}}>Urlaub, Autokauf, Renovierung...</div>
                <Btn color={T.accent} T={T} onClick={()=>setModal({type:"bucket",data:null})}>Ersten Bucket anlegen</Btn>
              </div>
            )}
            {(s.buckets||[]).map(b=>{
              const ty=b.year?+b.year:b.age?CY+(+b.age-30):null;
              const away=ty?ty-CY:null;
              return (
                <div key={b.id} style={{background:T.surface,border:"1px solid "+b.color+"33",borderRadius:10,padding:13}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start",flex:1}}>
                      <div style={{width:9,height:9,borderRadius:"50%",background:b.color,marginTop:4,flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:T.text}}>{b.name}</div>
                        <div style={{fontSize:9,color:T.textLow,marginTop:3,lineHeight:1.6}}>
                          {b.type} {full(b.amount)}{b.type==="Monatlich"?"/Mo.":b.type==="Jahrlich"?"/J.":""}
                          {ty&&" "+ty}{away!==null&&" (in "+away+" J.)"}
                        </div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:5}}>
                      <Btn sm T={T} onClick={()=>setModal({type:"bucket",data:b})}>edit</Btn>
                      <Btn sm danger T={T} onClick={()=>updArr("buckets",s.buckets.filter(x=>x.id!==b.id))}>x</Btn>
                    </div>
                  </div>
                </div>
              );
            })}
            {s.buckets?.length>0&&(
              <button onClick={()=>setModal({type:"afford"})}
                style={{background:T.surface,border:"1px solid "+T.purple+"33",borderRadius:10,padding:13,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",WebkitTapHighlightColor:"transparent"}}>
                <div style={{fontSize:12,fontWeight:700,color:T.purple}}>Neue Ausgabe prufen</div>
                <div style={{fontSize:16,color:T.purple}}>{">"}</div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:T.tabBar,borderTop:"1px solid "+T.tabBorder,display:"flex",zIndex:50,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {TABS.map(({k,lbl})=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"10px 4px 8px",border:"none",cursor:"pointer",background:"transparent",color:tab===k?T.accent:T.textLow,display:"flex",flexDirection:"column",alignItems:"center",gap:3,borderTop:"2px solid "+(tab===k?T.accent:"transparent"),WebkitTapHighlightColor:"transparent",transition:"color 0.15s"}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.04em"}}>{lbl}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
