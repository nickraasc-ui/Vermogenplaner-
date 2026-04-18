import { useState, useMemo, useEffect, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt = (v) => {
  if (!v && v !== 0) return "€0";
  const a = Math.abs(v);
  if (a >= 1_000_000) return `€${(v/1_000_000).toFixed(2)}M`;
  if (a >= 1_000)     return `€${(v/1_000).toFixed(0)}k`;
  return `€${Math.round(v)}`;
};
const full = (v) => `€${Math.round(v ?? 0).toLocaleString("de-DE")}`;
const uid  = () => Math.random().toString(36).slice(2, 9);
const CY   = new Date().getFullYear();
const CM   = new Date().toISOString().slice(0, 7);
const mlbl = (ym) => {
  const [y, m] = ym.split("-");
  return `${["","Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][+m]} ${y}`;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const IMMO_CF       = 120;   // 1200-850-220-10
const IMMO_TILGUNG  = 450;
const IMMO_ANNUITAET= 850;
const IMMO_DEBT     = 130_000;
const YRS_PAYOFF    = Math.ceil(IMMO_DEBT / (IMMO_TILGUNG * 12));
const debtAt        = (y) => Math.max(0, IMMO_DEBT - IMMO_TILGUNG * 12 * y);

const CLS_CLR = { "Aktien":"#f59e0b","Aktien-ETF":"#38bdf8","Anleihen":"#a78bfa","Immobilien":"#10b981","Cash":"#64748b","Rohstoffe":"#fb923c","Sonstiges":"#94a3b8" };
const OWN_CLR = { ehemann:"#38bdf8", ehefrau:"#f472b6", gemeinschaft:"#a78bfa" };
const OWN_LBL = { ehemann:"Ehemann", ehefrau:"Ehefrau", gemeinschaft:"Gemeinschaft" };
const ASSET_CLASSES = ["Aktien","Aktien-ETF","Anleihen","Immobilien","Cash","Rohstoffe","Sonstiges"];
const BCK_CLRS = ["#f59e0b","#10b981","#38bdf8","#a78bfa","#f472b6","#fb923c","#ef4444","#34d399"];
const EXP_CATS = ["Wohnen","Familie/Kind","Mobilität","Lebensmittel","Freizeit","Sonstiges"];

// ─── Default state ────────────────────────────────────────────────────────────
const DEFAULT = {
  nettoGesamt: 8500, ausgaben: 2000, reservenMonthly: 500,
  autoSpar: true, manuellSparrate: 1500,
  rLocked: 12, rFree: 8, rEhefrau: 8, rGemein: 5, rImmo: 3,
  horizon: 35, inflationAdj: false, inflation: 2.5,
  assets: [
    { id:"a1", name:"Direktaktien Schenkung", owner:"ehemann",      class:"Aktien",     value:850000, debt:0,      locked:true,  note:"Bedingte Schenkung" },
    { id:"a2", name:"Depot Ehemann (frei)",   owner:"ehemann",      class:"Aktien-ETF", value:170000, debt:0,      locked:false, note:"" },
    { id:"a3", name:"Depot Ehefrau",          owner:"ehefrau",      class:"Aktien-ETF", value:70000,  debt:0,      locked:false, note:"95% Aktien" },
    { id:"a4", name:"Gemeinschaftsdepot",     owner:"gemeinschaft", class:"Aktien-ETF", value:15000,  debt:0,      locked:false, note:"" },
    { id:"a5", name:"Liquidität Ehefrau",     owner:"ehefrau",      class:"Cash",       value:10000,  debt:0,      locked:false, note:"" },
    { id:"a6", name:"Liquidität Gemeinschaft",owner:"gemeinschaft", class:"Cash",       value:15000,  debt:0,      locked:false, note:"" },
    { id:"a7", name:"Immobilie München",      owner:"ehemann",      class:"Immobilien", value:430000, debt:130000, locked:false, note:"Kaufpreis €230k" },
  ],
  buckets: [], checkins: [], snapshots: [],
};

// ─── Persistence (localStorage) ───────────────────────────────────────────────
const LS_KEY = "wealth-pwa-v1";
const loadState = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch { return DEFAULT; }
};
const saveState = (s) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
};

// ─── Tiny UI components ───────────────────────────────────────────────────────
const Sl = ({ label, value, min, max, step, onChange, fmt: f, color="#38bdf8", note, warn }) => (
  <div>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:2 }}>
      <label style={{ fontSize:9, color:"#2e4a60", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</label>
      <span style={{ fontSize:15, fontWeight:900, color:warn?"#ef4444":color }}>{f(value)}</span>
    </div>
    {note && <div style={{ fontSize:9, color:"#1a3040", marginBottom:3 }}>{note}</div>}
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width:"100%", accentColor:warn?"#ef4444":color, cursor:"pointer" }} />
    <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, color:"#0f2030", marginTop:1 }}>
      <span>{f(min)}</span><span>{f(max)}</span>
    </div>
  </div>
);

const Tile = ({ label, value, sub, color="#38bdf8", warn=false, onClick }) => (
  <div onClick={onClick} style={{ background:"#06101a", border:`1px solid ${warn?"#7f1d1d":"#0a1c2c"}`, borderRadius:8, padding:"9px 11px", cursor:onClick?"pointer":"default" }}>
    <div style={{ fontSize:8, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>{label}</div>
    <div style={{ fontSize:13, fontWeight:900, color:warn?"#ef4444":color }}>{value}</div>
    {sub && <div style={{ fontSize:9, color:"#152535", marginTop:2, lineHeight:1.4 }}>{sub}</div>}
  </div>
);

const ChTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#05101a", border:"1px solid #0a1c2c", borderRadius:6, padding:"8px 11px", fontSize:11 }}>
      <div style={{ fontWeight:700, color:"#2e4a60", marginBottom:4 }}>Alter {label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display:"flex", justifyContent:"space-between", gap:14, color:p.color, marginBottom:2 }}>
          <span>{p.name}</span><span style={{ fontWeight:700 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// Bottom-sheet modal (iOS-native feel)
const Sheet = ({ title, onClose, children }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200, display:"flex", alignItems:"flex-end" }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background:"#06101a", border:"1px solid #0a1c2c", borderRadius:"18px 18px 0 0", padding:"0 0 env(safe-area-inset-bottom,16px)", width:"100%", maxHeight:"92vh", overflowY:"auto" }}>
      <div style={{ padding:"12px 20px 0" }}>
        <div style={{ width:36, height:4, background:"#0a1c2c", borderRadius:2, margin:"0 auto 16px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div style={{ fontWeight:900, fontSize:15, color:"#c8ddf0" }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#2e4a60", cursor:"pointer", fontSize:22, lineHeight:1, padding:"0 4px" }}>✕</button>
        </div>
      </div>
      <div style={{ padding:"0 20px 24px" }}>{children}</div>
    </div>
  </div>
);

const Inp = ({ label, value, onChange, type="text", placeholder="" }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:9, color:"#2e4a60", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:4 }}>{label}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      inputMode={type==="number"?"decimal":undefined}
      style={{ width:"100%", background:"#04080f", border:"1px solid #0a1c2c", borderRadius:8, padding:"11px 12px", color:"#c8ddf0", fontSize:16, outline:"none", fontFamily:"inherit", WebkitAppearance:"none" }} />
  </div>
);

const SelEl = ({ label, value, onChange, options }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:9, color:"#2e4a60", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:4 }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width:"100%", background:"#04080f", border:"1px solid #0a1c2c", borderRadius:8, padding:"11px 12px", color:"#c8ddf0", fontSize:16, outline:"none", fontFamily:"inherit", WebkitAppearance:"none" }}>
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  </div>
);

const Btn = ({ children, onClick, color="#38bdf8", full=false, sm=false, danger=false, disabled=false }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: sm ? "6px 12px" : "12px 18px",
    borderRadius: 8, border:`1px solid ${danger?"#7f1d1d44":color+"33"}`,
    background: danger?"#140505":`${color}15`, color:danger?"#ef4444":color,
    cursor:"pointer", fontSize:sm?11:14, fontWeight:700, fontFamily:"inherit",
    width:full?"100%":"auto", opacity:disabled?0.4:1,
    WebkitTapHighlightColor:"transparent",
  }}>{children}</button>
);

const Row = ({ label, value, type="neutral", bold=false, sub }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"6px 0", borderBottom:"1px solid #060d16" }}>
    <div>
      <div style={{ fontSize:bold?12:11, color:bold?"#c8ddf0":"#3a5570", fontWeight:bold?700:400 }}>{label}</div>
      {sub && <div style={{ fontSize:9, color:"#152535", marginTop:1 }}>{sub}</div>}
    </div>
    <div style={{ fontSize:bold?14:12, fontWeight:bold?900:600, color:type==="in"?"#10b981":type==="out"?"#ef4444":type==="warn"?"#fca5a5":"#38bdf8", marginLeft:12, whiteSpace:"nowrap", fontVariantNumeric:"tabular-nums" }}>
      {value}
    </div>
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [s,  setS]   = useState(() => loadState());
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);

  // Persist on every change
  useEffect(() => { saveState(s); }, [s]);

  const upd    = useCallback(patch => setS(p => ({ ...p, ...patch })), []);
  const updArr = useCallback((key, arr) => setS(p => ({ ...p, [key]: arr })), []);

  // ── Cash flow ──────────────────────────────────────────────────────────────
  const cf = useMemo(() => {
    const avail = s.nettoGesamt + IMMO_CF;
    const bound = s.ausgaben + s.reservenMonthly;
    const rest  = avail - bound;
    const eff   = s.autoSpar ? Math.max(0, rest) : s.manuellSparrate;
    const saldo = avail - bound - eff;
    const quote = avail > 0 ? (eff / avail) * 100 : 0;
    return { avail, bound, rest, eff, saldo, quote };
  }, [s.nettoGesamt, s.ausgaben, s.reservenMonthly, s.autoSpar, s.manuellSparrate]);

  // ── Asset aggregates ───────────────────────────────────────────────────────
  const agg = useMemo(() => {
    let gross=0, debt=0;
    s.assets.forEach(a => { gross += a.value||0; debt += a.debt||0; });
    return { gross, debt, net: gross - debt };
  }, [s.assets]);

  // ── Projection ────────────────────────────────────────────────────────────
  const projection = useMemo(() => {
    const sp = cf.eff || 0;
    const inv = s.assets.filter(a => !a.locked && a.class !== "Cash" && a.class !== "Immobilien");
    const invT = inv.reduce((t, a) => t + (a.value||0), 0) || 1;

    const getR = (a, adj=0) => {
      if (a.class === "Immobilien") return s.rImmo + adj;
      if (a.locked)                 return s.rLocked + adj;
      if (a.owner === "ehemann")    return s.rFree + adj;
      if (a.owner === "ehefrau")    return s.rEhefrau + adj;
      return s.rGemein + adj;
    };

    const bDrain = (year) => {
      let d = 0;
      (s.buckets||[]).forEach(b => {
        const ty = b.year ? +b.year : b.age ? CY+(+b.age-30) : null;
        if (!ty) return;
        if (b.type==="Einmalig" && year===ty)  d += b.amount||0;
        if (b.type==="Jährlich" && year>=ty)   d += b.amount||0;
        if (b.type==="Monatlich" && year>=ty)  d += (b.amount||0)*12;
      });
      return d;
    };

    return Array.from({ length: s.horizon + 1 }, (_, y) => {
      const row = { age: 30 + y };
      [["cons",-2.5],["base",0],["opt",2.5]].forEach(([key, adj]) => {
        let total = 0;
        s.assets.forEach(a => {
          const r  = Math.max(0, getR(a, adj) / 100);
          const rm = r / 12;
          const mo = y * 12;
          if (a.class === "Immobilien") {
            total += (a.value||0) * Math.pow(1+r, y) - debtAt(y);
            return;
          }
          const add = (!a.locked && a.class !== "Cash") ? sp * ((a.value||0) / invT) : 0;
          const fv  = rm > 0
            ? (a.value||0) * Math.pow(1+r, y) + add * ((Math.pow(1+rm, mo) - 1) / rm)
            : (a.value||0) + add * mo;
          total += fv;
        });
        let drain = 0;
        for (let i=0; i<=y; i++) drain += bDrain(CY+i);
        total = Math.max(0, total - drain);
        if (s.inflationAdj) total /= Math.pow(1 + s.inflation/100, y);
        row[key] = Math.round(total);
      });
      return row;
    });
  }, [s, cf.eff]);

  const final = projection[projection.length - 1] || {};

  const lastCI = useMemo(() =>
    [...(s.checkins||[])].sort((a,b) => b.month.localeCompare(a.month))[0] ?? null,
  [s.checkins]);

  const snaps = useMemo(() =>
    [...(s.snapshots||[])].sort((a,b) => a.date.localeCompare(b.date)),
  [s.snapshots]);

  // ── Modal: Check-in ────────────────────────────────────────────────────────
  const CheckinModal = () => {
    const [f, setF] = useState({ month:CM, ausgaben_ist:String(s.ausgaben), reserven_ist:"0", sparrate_ist:String(Math.round(cf.eff)), note:"" });
    return (
      <Sheet title="Monatliches Check-in" onClose={() => setModal(null)}>
        <Inp label="Monat" value={f.month} onChange={v => setF(p => ({...p,month:v}))} type="month"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Inp label="Ausgaben IST (€)" value={f.ausgaben_ist} onChange={v => setF(p => ({...p,ausgaben_ist:v}))} type="number"/>
          <Inp label="Reserven genutzt (€)" value={f.reserven_ist} onChange={v => setF(p => ({...p,reserven_ist:v}))} type="number"/>
        </div>
        <Inp label="Tatsächlich investiert (€)" value={f.sparrate_ist} onChange={v => setF(p => ({...p,sparrate_ist:v}))} type="number"/>
        <Inp label="Notiz" value={f.note} onChange={v => setF(p => ({...p,note:v}))} placeholder="Besonderheiten…"/>
        <Btn full color="#10b981" onClick={() => {
          const ci = { id:uid(), ...f, ausgaben_ist:+f.ausgaben_ist||0, reserven_ist:+f.reserven_ist||0, sparrate_ist:+f.sparrate_ist||0 };
          updArr("checkins", [...(s.checkins||[]).filter(c => c.month !== f.month), ci]);
          setModal(null);
        }}>Check-in speichern</Btn>
      </Sheet>
    );
  };

  // ── Modal: Snapshot ────────────────────────────────────────────────────────
  const SnapshotModal = () => {
    const [f, setF] = useState({ date:new Date().toISOString().slice(0,10), networth:String(agg.net), note:"" });
    return (
      <Sheet title="Nettowert-Snapshot" onClose={() => setModal(null)}>
        <div style={{ background:"#04080f", border:"1px solid #0a1c2c", borderRadius:8, padding:12, marginBottom:14 }}>
          <div style={{ fontSize:9, color:"#1a3040", marginBottom:3 }}>Aktueller Nettowert aus Positionen</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#38bdf8" }}>{full(agg.net)}</div>
        </div>
        <Inp label="Datum" value={f.date} onChange={v => setF(p => ({...p,date:v}))} type="date"/>
        <Inp label="Nettovermögen (€)" value={f.networth} onChange={v => setF(p => ({...p,networth:v}))} type="number"/>
        <Inp label="Notiz" value={f.note} onChange={v => setF(p => ({...p,note:v}))} placeholder="z.B. Q1 Rebalancing"/>
        <Btn full color="#10b981" onClick={() => {
          updArr("snapshots", [...(s.snapshots||[]), { id:uid(), date:f.date, value:+f.networth||0, note:f.note }]);
          setModal(null);
        }}>Snapshot speichern</Btn>
      </Sheet>
    );
  };

  // ── Modal: Affordability ───────────────────────────────────────────────────
  const AffordModal = () => {
    const [amt, setAmt]   = useState("");
    const [type, setType] = useState("Einmalig");
    const [lbl, setLbl]   = useState("");
    const amount  = parseFloat(amt) || 0;
    const monthly = type==="Monatlich" ? amount : type==="Jährlich" ? amount/12 : 0;
    const baseEnd = final.base || 0;
    const impact  = type==="Einmalig"
      ? amount * Math.pow(1 + s.rFree/100, s.horizon)
      : monthly * ((Math.pow(1 + s.rFree/1200, s.horizon*12) - 1) / (s.rFree/1200));
    const newEnd    = Math.max(0, baseEnd - impact);
    const pctImpact = baseEnd > 0 ? (impact / baseEnd) * 100 : 0;
    const canAfford = type==="Einmalig" || monthly <= (cf.saldo||0);

    return (
      <Sheet title="Was kann ich mir leisten?" onClose={() => setModal(null)}>
        <Inp label="Bezeichnung" value={lbl} onChange={setLbl} placeholder="z.B. Neues Auto…"/>
        <SelEl label="Typ" value={type} onChange={setType} options={["Einmalig","Monatlich","Jährlich"]}/>
        <Inp label={`Betrag (€)${type==="Monatlich"?"/Monat":type==="Jährlich"?"/Jahr":""}`} value={amt} onChange={setAmt} type="number" placeholder="0"/>

        {amount > 0 && (
          <>
            {/* Budget check */}
            <div style={{ background:"#04080f", border:"1px solid #0a1c2c", borderRadius:8, padding:13, marginBottom:10 }}>
              <div style={{ fontSize:9, color:"#2e4a60", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Monatliche Machbarkeit</div>
              {type==="Einmalig" ? (
                <div style={{ fontSize:11, color:"#2e4a60", lineHeight:1.7 }}>
                  Einmalausgabe. Aus Liquidität ({fmt(s.assets.filter(a=>a.class==="Cash").reduce((t,a)=>t+a.value,0))}) möglich,
                  oder über {Math.ceil(amount/(cf.eff||1))} Monate ansparen.
                </div>
              ) : (
                <>
                  <Row label="Monatlicher Betrag"   value={`${full(monthly)}/Mo.`}/>
                  <Row label="Aktueller Saldo"       value={`${full(cf.saldo)}/Mo.`} type={cf.saldo>=0?"in":"out"}/>
                  <Row label="Neue Sparrate"         value={`${full(cf.eff-monthly)}/Mo.`} type={cf.eff-monthly>=0?"in":"out"}/>
                  <div style={{ marginTop:10, background:canAfford?"#071810":"#140505", border:`1px solid ${canAfford?"#14532d":"#7f1d1d"}`, borderRadius:7, padding:"9px 12px", fontSize:13, fontWeight:700, color:canAfford?"#4ade80":"#fca5a5", textAlign:"center" }}>
                    {canAfford ? "✓ Finanzierbar" : `⚠ Übersteigt Saldo um ${full(monthly-(cf.saldo||0))}/Mo.`}
                  </div>
                </>
              )}
            </div>

            {/* Long-term impact */}
            <div style={{ background:"#04080f", border:"1px solid #0a1c2c", borderRadius:8, padding:13, marginBottom:12 }}>
              <div style={{ fontSize:9, color:"#2e4a60", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Langfristiger Effekt ({s.horizon} Jahre)</div>
              <Row label="Projektion ohne"      value={fmt(baseEnd)}  type="neutral"/>
              <Row label="Entgangenes Wachstum" value={`−${fmt(impact)}`} type="out"/>
              <Row label="Projektion mit"       value={fmt(newEnd)}   type="in" bold/>
              <div style={{ marginTop:10 }}>
                <div style={{ background:"#07111e", borderRadius:5, overflow:"hidden", height:7, marginBottom:5 }}>
                  <div style={{ height:"100%", background:"#38bdf8", width:`${Math.max(2,100-pctImpact)}%`, transition:"width 0.4s" }}/>
                </div>
                <div style={{ fontSize:10, color:"#1a3040", textAlign:"center" }}>
                  Kostet {pctImpact.toFixed(1)}% des projizierten Endvermögens
                </div>
              </div>
            </div>

            {lbl && (
              <Btn full color="#a78bfa" onClick={() => {
                updArr("buckets", [...(s.buckets||[]), { id:uid(), name:lbl, type, amount, year:String(CY), color:BCK_CLRS[0], note:"via Affordability" }]);
                setModal(null);
              }}>Als Bucket speichern</Btn>
            )}
          </>
        )}
      </Sheet>
    );
  };

  // ── Modal: Asset ───────────────────────────────────────────────────────────
  const AssetModal = ({ data }) => {
    const [f, setF] = useState(data || { name:"", owner:"ehemann", class:"Aktien-ETF", value:"", debt:"", locked:false, note:"" });
    return (
      <Sheet title={data?.id ? "Position bearbeiten" : "Position hinzufügen"} onClose={() => setModal(null)}>
        <Inp label="Bezeichnung" value={f.name} onChange={v => setF(p => ({...p,name:v}))} placeholder="z.B. MSCI World ETF"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <SelEl label="Eigentümer" value={f.owner} onChange={v => setF(p => ({...p,owner:v}))} options={Object.keys(OWN_LBL).map(k=>({value:k,label:OWN_LBL[k]}))}/>
          <SelEl label="Klasse" value={f.class} onChange={v => setF(p => ({...p,class:v}))} options={ASSET_CLASSES}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Inp label="Wert (€)" value={f.value} onChange={v => setF(p => ({...p,value:v}))} type="number"/>
          <Inp label="Schulden (€)" value={f.debt||""} onChange={v => setF(p => ({...p,debt:v}))} type="number" placeholder="0"/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, padding:"10px 12px", background:"#04080f", borderRadius:8, border:"1px solid #0a1c2c" }}>
          <input type="checkbox" checked={!!f.locked} onChange={e => setF(p => ({...p,locked:e.target.checked}))} id="lck" style={{ accentColor:"#f59e0b", width:18, height:18 }}/>
          <label htmlFor="lck" style={{ fontSize:13, color:"#2e4a60", cursor:"pointer" }}>Gesperrt / unumschichtbar</label>
        </div>
        <Btn full color="#10b981" onClick={() => {
          const asset = { ...f, id:f.id||uid(), value:+f.value||0, debt:+f.debt||0 };
          if (data?.id) updArr("assets", s.assets.map(a => a.id===asset.id ? asset : a));
          else          updArr("assets", [...s.assets, asset]);
          setModal(null);
        }}>Speichern</Btn>
      </Sheet>
    );
  };

  // ── Modal: Bucket ──────────────────────────────────────────────────────────
  const BucketModal = ({ data }) => {
    const [f, setF] = useState(data || { name:"", type:"Einmalig", amount:"", year:"", age:"", color:BCK_CLRS[0], note:"" });
    return (
      <Sheet title={data?.id ? "Bucket bearbeiten" : "Bucket anlegen"} onClose={() => setModal(null)}>
        <Inp label="Bezeichnung" value={f.name} onChange={v => setF(p => ({...p,name:v}))} placeholder="z.B. Urlaub 2026"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <SelEl label="Typ" value={f.type} onChange={v => setF(p => ({...p,type:v}))} options={["Einmalig","Jährlich","Monatlich","Reserve"]}/>
          <Inp label="Betrag (€)" value={f.amount} onChange={v => setF(p => ({...p,amount:v}))} type="number"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Inp label="Zieljahr" value={f.year} onChange={v => setF(p => ({...p,year:v,age:""}))} type="number" placeholder={String(CY+2)}/>
          <Inp label="oder Alter" value={f.age} onChange={v => setF(p => ({...p,age:v,year:""}))} type="number" placeholder="33"/>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:9, color:"#2e4a60", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Farbe</div>
          <div style={{ display:"flex", gap:10 }}>
            {BCK_CLRS.map(c => (
              <div key={c} onClick={() => setF(p => ({...p,color:c}))}
                style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", border:f.color===c?"3px solid #e2e8f0":"3px solid transparent" }}/>
            ))}
          </div>
        </div>
        <Btn full color="#10b981" onClick={() => {
          const b = { ...f, id:f.id||uid(), amount:+f.amount||0 };
          if (data?.id) updArr("buckets", s.buckets.map(x => x.id===b.id ? b : x));
          else          updArr("buckets", [...(s.buckets||[]), b]);
          setModal(null);
        }}>Speichern</Btn>
      </Sheet>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const TABS = [
    { k:"dashboard",  icon:"◉", lbl:"Übersicht"  },
    { k:"haushalt",   icon:"◈", lbl:"Haushalt"   },
    { k:"vermögen",   icon:"◆", lbl:"Vermögen"   },
    { k:"projektion", icon:"◇", lbl:"Projektion" },
    { k:"buckets",    icon:"○", lbl:"Ausgaben"   },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#04080f", color:"#c8ddf0", fontFamily:"system-ui,-apple-system,'Helvetica Neue',sans-serif", paddingBottom:"calc(64px + env(safe-area-inset-bottom,0px))" }}>

      {/* Modals */}
      {modal?.type==="checkin"  && <CheckinModal/>}
      {modal?.type==="snapshot" && <SnapshotModal/>}
      {modal?.type==="afford"   && <AffordModal/>}
      {modal?.type==="asset"    && <AssetModal  data={modal.data}/>}
      {modal?.type==="bucket"   && <BucketModal data={modal.data}/>}

      {/* ── Header ── */}
      <div style={{ background:"#050d17", borderBottom:"1px solid #0a1825", padding:"14px 16px 10px", paddingTop:"calc(14px + env(safe-area-inset-top,0px))", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ fontSize:8, letterSpacing:"0.22em", color:"#102030", fontWeight:700, textTransform:"uppercase" }}>Vermögensplaner · München</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginTop:2 }}>
          <div style={{ fontSize:22, fontWeight:900, color:"#e2e8f0", letterSpacing:"-0.02em" }}>{fmt(agg.net)}</div>
          <div style={{ fontSize:11, color:cf.quote>=20?"#10b981":cf.quote>=10?"#f59e0b":"#ef4444", fontWeight:700 }}>
            Sparquote {cf.quote.toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={{ padding:"14px 14px 4px", maxWidth:600, margin:"0 auto" }}>

        {/* ═══════ DASHBOARD ═══════ */}
        {tab==="dashboard" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

            {/* 3 quick actions */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[
                { icon:"📋", lbl:"Check-in", sub: lastCI ? mlbl(lastCI.month):"Noch keiner", type:"checkin", color:"#38bdf8" },
                { icon:"📸", lbl:"Snapshot",  sub:`${s.snapshots?.length||0} gespeichert`, type:"snapshot", color:"#10b981" },
                { icon:"🧮", lbl:"Leisten?",  sub:"Affordability", type:"afford", color:"#a78bfa" },
              ].map(({ icon,lbl,sub,type,color }) => (
                <button key={type} onClick={() => setModal({type})}
                  style={{ background:"#06101a", border:`1px solid ${color}22`, borderRadius:12, padding:"13px 6px", cursor:"pointer", textAlign:"center", WebkitTapHighlightColor:"transparent" }}>
                  <div style={{ fontSize:20, marginBottom:5 }}>{icon}</div>
                  <div style={{ fontSize:11, fontWeight:700, color }}>{lbl}</div>
                  <div style={{ fontSize:8, color:"#1a3040", marginTop:2 }}>{sub}</div>
                </button>
              ))}
            </div>

            {/* Last check-in */}
            {lastCI && (() => {
              const dA = (lastCI.ausgaben_ist||0) - s.ausgaben;
              const dS = (lastCI.sparrate_ist||0) - cf.eff;
              return (
                <div style={{ background:"#06101a", border:"1px solid #0a1c2c", borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:9, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Check-in · {mlbl(lastCI.month)}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                    <div>
                      <div style={{ fontSize:9, color:"#1a3040" }}>Ausgaben IST</div>
                      <div style={{ fontSize:13, fontWeight:800, color:"#c8ddf0" }}>{full(lastCI.ausgaben_ist)}</div>
                      <div style={{ fontSize:9, color:dA>0?"#ef4444":"#10b981", marginTop:1 }}>{dA>0?"+":""}{full(dA)} vs. Plan</div>
                    </div>
                    <div>
                      <div style={{ fontSize:9, color:"#1a3040" }}>Investiert</div>
                      <div style={{ fontSize:13, fontWeight:800, color:"#c8ddf0" }}>{full(lastCI.sparrate_ist)}</div>
                      <div style={{ fontSize:9, color:dS>=0?"#10b981":"#f59e0b", marginTop:1 }}>{dS>=0?"+":""}{full(dS)} vs. Plan</div>
                    </div>
                    <div>
                      <div style={{ fontSize:9, color:"#1a3040" }}>Reserven</div>
                      <div style={{ fontSize:13, fontWeight:800, color:"#c8ddf0" }}>{full(lastCI.reserven_ist)}</div>
                      <div style={{ fontSize:9, color:"#1a3040", marginTop:1 }}>Plan: {full(s.reservenMonthly)}</div>
                    </div>
                  </div>
                  {lastCI.note && <div style={{ marginTop:8, fontSize:10, color:"#1e3545", fontStyle:"italic" }}>"{lastCI.note}"</div>}
                </div>
              );
            })()}

            {/* Net worth mini chart */}
            {snaps.length >= 2 && (
              <div style={{ background:"#06101a", border:"1px solid #0a1c2c", borderRadius:10, padding:"13px 4px 8px" }}>
                <div style={{ paddingLeft:12, fontSize:9, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Nettovermögen-Verlauf</div>
                <ResponsiveContainer width="100%" height={110}>
                  <AreaChart data={snaps} margin={{ top:4,right:8,left:0,bottom:0 }}>
                    <defs>
                      <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill:"#1a3040", fontSize:8 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:"#1a3040", fontSize:8 }} tickFormatter={fmt} width={46} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v=>[full(v),"Nettovermögen"]} contentStyle={{ background:"#06101a", border:"1px solid #0a1c2c", borderRadius:6, fontSize:10 }}/>
                    <Area type="monotone" dataKey="value" stroke="#38bdf8" fill="url(#gs)" strokeWidth={2} dot={{ fill:"#38bdf8", r:3 }}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Key tiles */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <Tile label="Basis-Projektion" value={fmt(final.base)} sub={`Konservativ: ${fmt(final.cons)}`} color="#38bdf8"/>
              <Tile label="Eff. Sparrate" value={full(cf.eff)+"/Mo."} sub={`Sparquote ${cf.quote.toFixed(1)}%`} color="#10b981"/>
              <Tile label="Immo schuldenfrei" value={`Alter ${30+YRS_PAYOFF}`} sub={`+${full(IMMO_ANNUITAET)}/Mo. frei`} color="#a78bfa"/>
              <Tile label="Aktive Buckets" value={String(s.buckets?.length||0)} sub={s.buckets?.length?"Fließen in Projektion ein":"Noch keine"} color="#f59e0b"/>
            </div>
          </div>
        )}

        {/* ═══════ HAUSHALT ═══════ */}
        {tab==="haushalt" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {cf.rest < 0 && (
              <div style={{ background:"#140505", border:"1px solid #7f1d1d", borderRadius:8, padding:"9px 13px", fontSize:11, color:"#fca5a5" }}>
                ⚠ Ausgaben übersteigen Einkommen um {full(Math.abs(cf.rest))}/Mo.
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <Tile label="Gesamtzufluss" value={full(cf.avail)} sub={`Netto + Immo €${IMMO_CF}`} color="#10b981"/>
              <Tile label="Sparrate" value={full(cf.eff)} sub={s.autoSpar?"Auto":"Manuell"} color="#38bdf8"/>
            </div>

            <div style={{ background:"#06101a", border:"1px solid #0a1c2c", borderRadius:10, padding:16, display:"flex", flexDirection:"column", gap:20 }}>
              <Sl label="Netto-Haushaltseinkommen/Mo." value={s.nettoGesamt} min={2000} max={25000} step={100} onChange={v=>upd({nettoGesamt:v})} fmt={full} color="#10b981"/>
              <Sl label="Laufende Haushaltsausgaben/Mo." value={s.ausgaben} min={500} max={8000} step={100} onChange={v=>upd({ausgaben:v})} fmt={full} color="#ef4444" note="Miete/Lebenshaltung, Kita, Versicherungen"/>
              <Sl label="Reserven (Urlaub, Unregelmäßiges)" value={s.reservenMonthly} min={0} max={3000} step={50} onChange={v=>upd({reservenMonthly:v})} fmt={full} color="#f59e0b"/>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ fontSize:9, color:"#2e4a60", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Sparrate</div>
                  <button onClick={() => upd({autoSpar:!s.autoSpar})} style={{ fontSize:11, padding:"5px 12px", borderRadius:6, border:`1px solid ${s.autoSpar?"#38bdf8":"#0a1c2c"}`, background:s.autoSpar?"#071828":"transparent", color:s.autoSpar?"#38bdf8":"#2e4a60", cursor:"pointer", fontWeight:700, WebkitTapHighlightColor:"transparent" }}>
                    {s.autoSpar ? "● Auto" : "○ Manuell"}
                  </button>
                </div>
                {s.autoSpar ? (
                  <div style={{ background:"#04080f", borderRadius:7, padding:"11px 13px", fontSize:12, color:"#1e3545", lineHeight:1.7 }}>
                    {full(cf.avail)} − {full(s.ausgaben)} − {full(s.reservenMonthly)} = <strong style={{ color:cf.eff>0?"#38bdf8":"#ef4444", fontSize:15 }}>{full(cf.eff)}/Mo.</strong>
                  </div>
                ) : (
                  <Sl label="" value={s.manuellSparrate} min={0} max={6000} step={100} onChange={v=>upd({manuellSparrate:v})} fmt={full} color="#38bdf8" warn={s.manuellSparrate>cf.rest} note={s.manuellSparrate>cf.rest?`⚠ Übersteigt Rest (${full(cf.rest)})`:`Saldo: ${full(cf.saldo)}/Mo.`}/>
                )}
              </div>
            </div>

            {/* Monthly summary */}
            <div style={{ background:"#06101a", border:"1px solid #0a1c2c", borderRadius:10, padding:14 }}>
              <div style={{ fontSize:9, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Monatsübersicht</div>
              <Row label="Netto-Einkommen"      value={`+${full(s.nettoGesamt)}`}  type="in"/>
              <Row label="Immo-Netto-Cashflow"  value={`+€${IMMO_CF}`}            type="in" sub="Miete−Annuität−HG−GrSt"/>
              <Row label="Gesamtzufluss"         value={`+${full(cf.avail)}`}       type="in" bold/>
              <div style={{ height:1, background:"#0a1825", margin:"6px 0" }}/>
              <Row label="Haushaltsausgaben"     value={`−${full(s.ausgaben)}`}     type="out"/>
              <Row label="Reserven"              value={`−${full(s.reservenMonthly)}`} type="out"/>
              <Row label="Sparrate"              value={`−${full(cf.eff)}`}         type="out"/>
              <div style={{ height:1, background:"#0a1825", margin:"6px 0" }}/>
              <Row label="Monatssaldo"           value={`${cf.saldo>=0?"+":""}${full(cf.saldo)}`} type={cf.saldo>=0?"in":"warn"} bold/>
            </div>

            {/* Check-in history */}
            {s.checkins?.length > 0 && (
              <div style={{ background:"#06101a", border:"1px solid #0a1c2c", borderRadius:10, padding:14 }}>
                <div style={{ fontSize:9, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Check-in Verlauf</div>
                {[...s.checkins].sort((a,b)=>b.month.localeCompare(a.month)).slice(0,6).map(ci => {
                  const dA = ci.ausgaben_ist - s.ausgaben;
                  const dS = ci.sparrate_ist - cf.eff;
                  return (
                    <div key={ci.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #06101a", paddingBottom:8, marginBottom:8 }}>
                      <div style={{ fontSize:11, color:"#3a5570", fontWeight:600 }}>{mlbl(ci.month)}</div>
                      <div style={{ display:"flex", gap:12, fontSize:10 }}>
                        <span style={{ color:dA>0?"#ef4444":"#10b981" }}>HH {dA>0?"+":""}{full(dA)}</span>
                        <span style={{ color:dS>=0?"#10b981":"#f59e0b" }}>Spar {dS>=0?"+":""}{full(dS)}</span>
                      </div>
                      <Btn sm danger onClick={() => updArr("checkins", s.checkins.filter(c=>c.id!==ci.id))}>✕</Btn>
                    </div>
                  );
                })}
              </div>
            )}
            <Btn full color="#38bdf8" onClick={() => setModal({type:"checkin"})}>+ Monatliches Check-in</Btn>
          </div>
        )}

        {/* ═══════ VERMÖGEN ═══════ */}
        {tab==="vermögen" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              <Tile label="Brutto"  value={fmt(agg.gross)} color="#c8ddf0"/>
              <Tile label="Schulden" value={`−${fmt(agg.debt)}`} color="#ef4444"/>
              <Tile label="Netto"   value={fmt(agg.net)}  color="#38bdf8"/>
            </div>

            <div style={{ background:"#06101a", border:"1px solid #0a1c2c", borderRadius:10, padding:16, display:"flex", flexDirection:"column", gap:18 }}>
              <div style={{ fontSize:9, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Renditeerwartungen</div>
              <Sl label="Schenkungsblock €850k" value={s.rLocked} min={4} max={30} step={0.5} onChange={v=>upd({rLocked:v})} fmt={v=>`${v.toFixed(1)}%`} color="#f59e0b" note="Hist. 25% — Planungsrendite: 10–14%"/>
              <Sl label="Ehemann frei €170k"    value={s.rFree}   min={3} max={15} step={0.5} onChange={v=>upd({rFree:v})}   fmt={v=>`${v.toFixed(1)}%`} color="#38bdf8"/>
              <Sl label="Ehefrau €70k"          value={s.rEhefrau} min={3} max={15} step={0.5} onChange={v=>upd({rEhefrau:v})} fmt={v=>`${v.toFixed(1)}%`} color="#f472b6"/>
              <Sl label="Gemeinschaft €15k"     value={s.rGemein} min={1} max={10} step={0.5} onChange={v=>upd({rGemein:v})} fmt={v=>`${v.toFixed(1)}%`} color="#a78bfa"/>
              <Sl label="Immobilie München"     value={s.rImmo}   min={0} max={6}  step={0.5} onChange={v=>upd({rImmo:v})}   fmt={v=>`${v.toFixed(1)}%`} color="#10b981"/>
            </div>

            <div style={{ background:"#06101a", border:"1px solid #0a1c2c", borderRadius:10, padding:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontSize:9, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Positionen</div>
                <Btn sm color="#10b981" onClick={() => setModal({type:"asset",data:null})}>+ Position</Btn>
              </div>
              {s.assets.map(a => (
                <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", borderBottom:"1px solid #060d16", paddingBottom:10, marginBottom:10 }}>
                  <div style={{ display:"flex", gap:9, alignItems:"flex-start", flex:1, minWidth:0 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:CLS_CLR[a.class]||"#64748b", marginTop:4, flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:"#c8ddf0", fontWeight:600 }}>
                        {a.name} {a.locked && <span style={{ fontSize:7, color:"#f59e0b", background:"#1a1000", padding:"1px 4px", borderRadius:3 }}>GESPERRT</span>}
                      </div>
                      <div style={{ fontSize:9, color:"#1a3040", marginTop:1 }}>{a.class} · {OWN_LBL[a.owner]||a.owner}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:12, fontWeight:800, color:"#c8ddf0" }}>{fmt(a.value)}</div>
                      {a.debt > 0 && <div style={{ fontSize:9, color:"#10b981" }}>netto {fmt(a.value-a.debt)}</div>}
                    </div>
                    <Btn sm onClick={() => setModal({type:"asset",data:a})}>✎</Btn>
                    <Btn sm danger onClick={() => updArr("assets", s.assets.filter(x=>x.id!==a.id))}>✕</Btn>
                  </div>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, borderTop:"1px solid #0a1c2c" }}>
                <span style={{ fontSize:10, color:"#1e3545" }}>Schulden <strong style={{ color:"#ef4444" }}>−{fmt(agg.debt)}</strong></span>
                <span style={{ fontSize:10, color:"#1e3545" }}>Netto <strong style={{ color:"#38bdf8" }}>{fmt(agg.net)}</strong></span>
              </div>
            </div>

            {/* Snapshots */}
            <div style={{ background:"#06101a", border:"1px solid #0a1c2c", borderRadius:10, padding:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ fontSize:9, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Nettowert-Snapshots (quartalsweise)</div>
                <Btn sm color="#10b981" onClick={() => setModal({type:"snapshot"})}>+ Snapshot</Btn>
              </div>
              {!s.snapshots?.length
                ? <div style={{ fontSize:11, color:"#0f2030", textAlign:"center", padding:"8px 0" }}>Noch keine — einmal im Quartal eintragen</div>
                : [...(s.snapshots||[])].sort((a,b)=>b.date.localeCompare(a.date)).map(sn => (
                  <div key={sn.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #060d16", paddingBottom:7, marginBottom:7 }}>
                    <div>
                      <div style={{ fontSize:11, color:"#3a5570", fontWeight:600 }}>{sn.date}</div>
                      {sn.note && <div style={{ fontSize:9, color:"#1a3040" }}>{sn.note}</div>}
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <div style={{ fontSize:13, fontWeight:800, color:"#38bdf8" }}>{fmt(sn.value)}</div>
                      <Btn sm danger onClick={() => updArr("snapshots", s.snapshots.filter(x=>x.id!==sn.id))}>✕</Btn>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ═══════ PROJEKTION ═══════ */}
        {tab==="projektion" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <button onClick={() => upd({inflationAdj:!s.inflationAdj})}
                style={{ padding:"6px 13px", borderRadius:6, border:`1px solid ${s.inflationAdj?"#f59e0b":"#0a1c2c"}`, background:s.inflationAdj?"#1a1000":"transparent", color:s.inflationAdj?"#f59e0b":"#253545", cursor:"pointer", fontSize:11, fontWeight:700, WebkitTapHighlightColor:"transparent" }}>
                Inflation {s.inflationAdj?`${s.inflation}% ✓`:"aus"}
              </button>
              <div style={{ flex:1, minWidth:100 }}>
                <Sl label="Horizont" value={s.horizon} min={10} max={45} step={5} onChange={v=>upd({horizon:v})} fmt={v=>`${v}J · Alter ${30+v}`} color="#a78bfa"/>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              {[{k:"cons",l:"Konservativ",c:"#64748b"},{k:"base",l:"Basis",c:"#38bdf8"},{k:"opt",l:"Optimistisch",c:"#10b981"}].map(({k,l,c})=>(
                <div key={k} style={{ background:"#06101a", border:`1px solid ${c}33`, borderRadius:9, padding:11 }}>
                  <div style={{ fontSize:8, color:c, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:18, fontWeight:900, color:"#e2e8f0" }}>{fmt(final[k])}</div>
                  <div style={{ fontSize:8, color:"#1e3545", marginTop:2 }}>{s.inflationAdj?"real":"nominal"}</div>
                </div>
              ))}
            </div>

            <div style={{ background:"#06101a", border:"1px solid #0a1c2c", borderRadius:10, padding:"13px 4px 8px" }}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={projection} margin={{ top:4,right:10,left:0,bottom:0 }}>
                  <defs>
                    {[["cons","#64748b"],["base","#38bdf8"],["opt","#10b981"]].map(([k,c])=>(
                      <linearGradient key={k} id={`pg${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={c} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={c} stopOpacity={0.02}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0a1c2c"/>
                  <XAxis dataKey="age" tick={{ fill:"#1e3545",fontSize:9 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:"#1e3545",fontSize:9 }} tickFormatter={fmt} width={50} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChTip/>}/>
                  <Area type="monotone" dataKey="cons" name="Konservativ" stroke="#64748b" fill="url(#pgcons)" strokeWidth={1.5} dot={false}/>
                  <Area type="monotone" dataKey="base" name="Basis"       stroke="#38bdf8" fill="url(#pgbase)" strokeWidth={2.5} dot={false}/>
                  <Area type="monotone" dataKey="opt"  name="Optimistisch" stroke="#10b981" fill="url(#pgopt)"  strokeWidth={1.5} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <button onClick={() => setModal({type:"afford"})}
              style={{ background:"#06101a", border:"1px solid #a78bfa33", borderRadius:10, padding:14, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", WebkitTapHighlightColor:"transparent" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#a78bfa" }}>Was kann ich mir leisten?</div>
                <div style={{ fontSize:10, color:"#1e3545", marginTop:2 }}>Prüft Budget + Langzeitauswirkung</div>
              </div>
              <div style={{ fontSize:20, color:"#a78bfa" }}>→</div>
            </button>

            <div style={{ background:"#06101a", border:"1px solid #0a1c2c", borderRadius:10, padding:14 }}>
              <div style={{ fontSize:9, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Meilensteine · Basis-Szenario</div>
              {[1_000_000,2_000_000,3_000_000,5_000_000].map(t => {
                const hit = projection.find(d => d.base >= t);
                return (
                  <div key={t} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #060d16", paddingBottom:8, marginBottom:8 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:"#38bdf8" }}>{fmt(t)}</div>
                    {hit
                      ? <div style={{ textAlign:"right" }}><div style={{ fontSize:12, fontWeight:700, color:"#10b981" }}>Alter {hit.age}</div><div style={{ fontSize:9, color:"#1a3040" }}>in {hit.age-30} J.</div></div>
                      : <div style={{ fontSize:10, color:"#ef4444" }}>Nicht im Horizont</div>}
                  </div>
                );
              })}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#a78bfa" }}>Immo schuldenfrei</div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#a78bfa" }}>Alter {30+YRS_PAYOFF}</div>
                  <div style={{ fontSize:9, color:"#1a3040" }}>+{full(IMMO_ANNUITAET)}/Mo.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ BUCKETS ═══════ */}
        {tab==="buckets" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontWeight:900, color:"#e2e8f0", fontSize:15 }}>Ausgaben-Buckets</div>
                <div style={{ fontSize:10, color:"#1a3040", marginTop:2 }}>Fließen in Projektion ein</div>
              </div>
              <Btn color="#10b981" onClick={() => setModal({type:"bucket",data:null})}>+ Bucket</Btn>
            </div>

            {!s.buckets?.length && (
              <div style={{ background:"#06101a", border:"1px dashed #0a1c2c", borderRadius:10, padding:30, textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:10 }}>◻</div>
                <div style={{ fontSize:13, fontWeight:600, color:"#2e4a60" }}>Noch keine Buckets</div>
                <div style={{ fontSize:10, color:"#1a3040", marginTop:4, marginBottom:18 }}>Plane Urlaub, Autokauf, Renovierung…</div>
                <Btn color="#38bdf8" onClick={() => setModal({type:"bucket",data:null})}>Ersten Bucket anlegen</Btn>
              </div>
            )}

            {(s.buckets||[]).map(b => {
              const ty = b.year ? +b.year : b.age ? CY+(+b.age-30) : null;
              const away = ty ? ty - CY : null;
              return (
                <div key={b.id} style={{ background:"#06101a", border:`1px solid ${b.color}33`, borderRadius:10, padding:13 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ display:"flex", gap:10, alignItems:"flex-start", flex:1 }}>
                      <div style={{ width:9, height:9, borderRadius:"50%", background:b.color, marginTop:4, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#c8ddf0" }}>{b.name}</div>
                        <div style={{ fontSize:9, color:"#1e3545", marginTop:3, lineHeight:1.6 }}>
                          {b.type} · {full(b.amount)}{b.type==="Monatlich"?"/Mo.":b.type==="Jährlich"?"/J.":""}
                          {ty && ` · ${ty}`}{away!==null && ` (in ${away} J.)`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:5 }}>
                      <Btn sm onClick={() => setModal({type:"bucket",data:b})}>✎</Btn>
                      <Btn sm danger onClick={() => updArr("buckets", s.buckets.filter(x=>x.id!==b.id))}>✕</Btn>
                    </div>
                  </div>
                </div>
              );
            })}

            {s.buckets?.length > 0 && (
              <button onClick={() => setModal({type:"afford"})}
                style={{ background:"#06101a", border:"1px solid #a78bfa33", borderRadius:10, padding:13, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", WebkitTapHighlightColor:"transparent" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#a78bfa" }}>🧮 Neue Ausgabe prüfen</div>
                <div style={{ fontSize:16, color:"#a78bfa" }}>→</div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom tab bar ── */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#050d17", borderTop:"1px solid #0a1825", display:"flex", zIndex:50, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
        {TABS.map(({ k, icon, lbl }) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex:1, padding:"10px 4px 8px", border:"none", cursor:"pointer",
            background:"transparent",
            color: tab===k ? "#38bdf8" : "#1e3545",
            display:"flex", flexDirection:"column", alignItems:"center", gap:3,
            borderTop: `2px solid ${tab===k?"#38bdf8":"transparent"}`,
            WebkitTapHighlightColor:"transparent",
            transition:"color 0.15s",
          }}>
            <div style={{ fontSize:15 }}>{icon}</div>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.04em" }}>{lbl}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
