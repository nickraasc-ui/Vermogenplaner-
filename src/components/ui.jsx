import {
  Pencil, X, Trash2, ChevronLeft, ChevronRight, ChevronDown, Plus, Sun, Moon, CircleHelp,
  House, Wallet, PieChart as PieIcon, ChartLine, Layers, TrendingUp, Landmark, Gem, Bitcoin,
  Briefcase, HandCoins, Package, Download, Upload, Users, Camera, CalendarCheck, ArrowDown, ArrowUp,
  ArrowLeftRight, CreditCard, User, Building2, Handshake,
} from "lucide-react";
export const fmtE = (v) => {
  if (!v && v !== 0) return "\u20AC0";
  const a = Math.abs(v);
  if (a >= 1_000_000) return "\u20AC" + (v / 1_000_000).toFixed(2) + "M";
  if (a >= 1_000) return "\u20AC" + (v / 1_000).toFixed(0) + "k";
  return "\u20AC" + Math.round(v);
};
export const full = (v) => "\u20AC" + Math.round(v ?? 0).toLocaleString("de-DE");
export { uid } from "../model/ids.js";
export const mlbl = (ym) => {
  const [y, m] = ym.split("-");
  return ["","Jan","Feb","Mar","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][+m] + " " + y;
};
export const pct = (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";



// Shared label style for form fields
export const labelStyle = (T) => ({ fontSize:13, color:T.textMid, fontWeight:500, display:"block", marginBottom:6 });

const ICONS = {
  edit:Pencil, close:X, trash:Trash2, back:ChevronLeft, chevron:ChevronRight, down:ChevronDown, plus:Plus,
  sun:Sun, moon:Moon, help:CircleHelp, home:House, wallet:Wallet, pie:PieIcon, chart:ChartLine, layers:Layers,
  download:Download, upload:Upload, users:Users, camera:Camera, checkin:CalendarCheck,
  arrowDown:ArrowDown, arrowUp:ArrowUp, swap:ArrowLeftRight, card:CreditCard, user:User, building:Building2,
  handshake:Handshake, trend:TrendingUp, bank:Landmark,
};
export const Icon = ({ name, size=18, color="currentColor", stroke=1.8 }) => {
  const C = ICONS[name] || Package;
  return <C size={size} color={color} strokeWidth={stroke} aria-hidden="true" style={{ flexShrink:0, display:"block" }} />;
};

// Asset-class "logo": filled circle with an icon, like broker app instrument logos
const CLASS_ICONS = {
  "Aktien":TrendingUp, "Aktien-ETF":PieIcon, "Anleihen":Landmark, "Anleihen-ETF":Layers, "Immobilien":House,
  "Cash":Wallet, "Rohstoffe":Gem, "Krypto":Bitcoin, "Private Equity":Briefcase, "Forderung":HandCoins, "Sonstiges":Package,
};
export const Avatar = ({ cls, icon, text, color, fg="#fff", size=40 }) => {
  const C = icon ? (ICONS[icon] || Package) : (CLASS_ICONS[cls] || null);
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:color, color:fg, flexShrink:0,
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:700 }}>
      {C ? <C size={size*0.46} strokeWidth={2} aria-hidden="true" /> : text}
    </div>
  );
};

export const IconBtn = ({ icon, onClick, label, danger=false, T, size=32 }) => (
  <button type="button" onClick={e => { e.stopPropagation(); onClick?.(e); }} aria-label={label} title={label}
    style={{ width:size, height:size, display:"inline-flex", alignItems:"center", justifyContent:"center",
      borderRadius:"50%", border:"none", background:"transparent", cursor:"pointer", flexShrink:0,
      color: danger ? T.textDim : T.textMid, padding:0, WebkitTapHighlightColor:"transparent" }}>
    <Icon name={icon} size={17} />
  </button>
);

// Round filled icon button (header actions, quick actions)
export const RoundBtn = ({ icon, onClick, label, T, size=40 }) => (
  <button type="button" onClick={onClick} aria-label={label} title={label}
    style={{ width:size, height:size, borderRadius:"50%", border:"none", background:T.surfaceHigh, color:T.text,
      display:"inline-flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, padding:0,
      WebkitTapHighlightColor:"transparent" }}>
    <Icon name={icon} size={18} />
  </button>
);

// Section: bold heading on the page background, optional action on the right
export const Section = ({ title, action, children, T, style={} }) => (
  <section style={{ marginTop:8, ...style }}>
    {(title || action) && (
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:8, minHeight:32 }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:T.text, letterSpacing:"-0.02em", margin:0 }}>{title}</h2>
        {action}
      </div>
    )}
    {children}
  </section>
);

// Flat list row: leading avatar, title/subtitle, value on the right
export const ListRow = ({ leading, title, subtitle, value, valueSub, valueSubColor, onClick, trailing, T, last=false }) => (
  <div onClick={onClick} className={onClick ? "vp-row" : undefined}
    style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", cursor:onClick?"pointer":"default",
      borderBottom: last ? "none" : "1px solid "+T.border, WebkitTapHighlightColor:"transparent" }}>
    {leading}
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:15, fontWeight:600, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</div>
      {subtitle && <div style={{ fontSize:13, color:T.textLow, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{subtitle}</div>}
    </div>
    {(value !== undefined || valueSub) && (
      <div style={{ textAlign:"right", flexShrink:0 }}>
        {value !== undefined && <div className="vp-num" style={{ fontSize:15, fontWeight:600, color:T.text }}>{value}</div>}
        {valueSub && <div className="vp-num" style={{ fontSize:13, color:valueSubColor || T.textLow, marginTop:2 }}>{valueSub}</div>}
      </div>
    )}
    {trailing}
  </div>
);

// Text-style action in section headers ("Hinzufügen")
export const LinkBtn = ({ children, onClick, T }) => (
  <button type="button" onClick={onClick}
    style={{ background:"none", border:"none", padding:"6px 0", color:T.text, fontSize:14, fontWeight:600, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 }}>
    {children}
  </button>
);

export const Sl = ({ label, value, min, max, step, onChange, fmt: f, color, note, warn, T, sub, hideHead=false }) => (
  <div>
    {!hideHead && <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
      <label style={{ fontSize:14, color:T.textMid, fontWeight:500 }}>{label}</label>
      <span className="vp-num" style={{ fontSize:15, fontWeight:600, color: warn ? T.red : T.text }}>{f(value)}</span>
    </div>}
    {note && <div style={{ fontSize:13, color:T.textLow, marginBottom:4 }}>{note}</div>}
    {sub && <div style={{ fontSize:13, color:T.textMid, marginBottom:4 }}>{sub}</div>}
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="vp-range"
      style={{
        "--vp-fill": warn ? T.red : T.text,
        "--vp-track": T.borderHigh,
        "--vp-pct": `${Math.min(100, Math.max(0, ((value - min) / ((max - min) || 1)) * 100))}%`,
        "--vp-thumb-ring": T.bg,
      }} />
    <div className="vp-num" style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:T.textDim, marginTop:2 }}>
      <span>{f(min)}</span><span>{f(max)}</span>
    </div>
  </div>
);

// Stat: plain label + number, no box
export const Tile = ({ label, value, sub, warn=false, onClick, T }) => (
  <div onClick={onClick} style={{ padding:"4px 0", cursor:onClick?"pointer":"default", minWidth:0 }}>
    <div style={{ fontSize:13, color:T.textLow, fontWeight:500, marginBottom:3 }}>{label}</div>
    <div className="vp-num" style={{ fontSize:18, fontWeight:650, letterSpacing:"-0.015em", color: warn ? T.red : T.text }}>{value}</div>
    {sub && <div style={{ fontSize:13, color:T.textLow, marginTop:2, lineHeight:1.4 }}>{sub}</div>}
  </div>
);

export const ChTip = ({ active, payload, label, T }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.sheet, border:"1px solid "+T.border, borderRadius:12, padding:"10px 12px", fontSize:13, boxShadow:"0 8px 24px rgba(0,0,0,0.25)" }}>
      <div style={{ fontWeight:600, color:T.text, marginBottom:6 }}>Alter {label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display:"flex", justifyContent:"space-between", gap:16, marginBottom:3 }}>
          <span style={{ display:"flex", alignItems:"center", gap:6, color:T.textMid }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:p.color }} />{p.name}
          </span>
          <span className="vp-num" style={{ fontWeight:600, color:T.text }}>{fmtE(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export const Sheet = ({ title, onClose, children, T }) => (
  <div className="vp-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="vp-sheet" role="dialog" aria-label={typeof title === "string" ? title : undefined}
      style={{ background:T.sheet }}>
      <div style={{ padding:"10px 20px 0", position:"sticky", top:0, background:T.sheet, zIndex:1 }}>
        <div className="vp-grabber" style={{ background:T.borderHigh }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, padding:"8px 0 16px" }}>
          <div style={{ fontWeight:700, fontSize:22, color:T.text, letterSpacing:"-0.02em" }}>{title}</div>
          <RoundBtn icon="close" label="Schließen" onClick={onClose} T={T} size={34} />
        </div>
      </div>
      <div style={{ padding:"0 20px 28px" }}>{children}</div>
    </div>
  </div>
);

const fieldStyle = (T) => ({ width:"100%", background:T.field, border:"1px solid transparent", borderRadius:12, padding:"13px 14px", color:T.text, fontSize:16, outline:"none", fontFamily:"inherit", WebkitAppearance:"none" });

export const Inp = ({ label, value, onChange, type="text", placeholder="", T, ...rest }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={labelStyle(T)}>{label}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      inputMode={type==="number" ? "decimal" : undefined}
      className="vp-field"
      {...rest}
      style={fieldStyle(T)} />
  </div>
);

export const SelEl = ({ label, value, onChange, options, T }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={labelStyle(T)}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)} className="vp-field vp-select"
      style={fieldStyle(T)}>
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  </div>
);

// Legacy call sites pass "edit" / "x" / "×" as children — render those as icons
const ICON_CHILD = { edit:"edit", x:"close", "×":"close" };
// Legacy labels start with text arrows / plus signs — drop them, pills carry no glyph prefixes
const cleanLabel = (c) => typeof c === "string" ? c.replace(/^[+↓↑]\s*/, "") : c;

// Pill button. Primary (accent/default) = solid; others = neutral grey fill; danger = red text.
export const Btn = ({ children, onClick, color, full=false, sm=false, danger=false, T }) => {
  const iconName = typeof children === "string" ? ICON_CHILD[children] : null;
  if (iconName) {
    return <IconBtn icon={iconName === "close" ? "trash" : "edit"} danger={danger} label={iconName === "edit" ? "Bearbeiten" : "Entfernen"}
      onClick={onClick} T={T} size={sm ? 32 : 40} />;
  }
  // textMid marks a deliberately neutral (secondary) button; other colours on full-width buttons are legacy "save" styling
  const primary = !danger && color !== T.textMid && (full || !color || color === T.accent);
  return (
    <button type="button" onClick={onClick} style={{
      padding: sm ? "7px 14px" : "14px 20px", borderRadius:999, border:"none",
      background: primary ? T.accent : danger && full ? "transparent" : T.surfaceHigh,
      color: primary ? T.onAccent : danger ? T.red : T.text,
      cursor:"pointer", fontSize:sm?13:16, fontWeight:600, fontFamily:"inherit", lineHeight:1.25,
      width:full?"100%":"auto", WebkitTapHighlightColor:"transparent", whiteSpace:"nowrap",
    }}>{cleanLabel(children)}</button>
  );
};

// Former card container: now an unboxed block (spacing does the grouping)
export const Card = ({ children, T, style={} }) => {
  const { padding, border, background, borderRadius, boxShadow, ...rest } = style;
  return <div style={{ padding:"4px 0", ...rest }}>{children}</div>;
};

export const CardLabel = ({ children, T, mb=10 }) => (
  <h2 style={{ fontSize:20, color:T.text, fontWeight:700, margin:0, marginBottom:mb, letterSpacing:"-0.02em" }}>
    {children}
  </h2>
);

export const Row = ({ label, value, type="neutral", bold=false, sub, T }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"11px 0", borderBottom:"1px solid "+T.border }}>
    <div style={{ minWidth:0 }}>
      <div style={{ fontSize:15, color:bold?T.text:T.textMid, fontWeight:bold?650:400 }}>{label}</div>
      {sub && <div style={{ fontSize:13, color:T.textLow, marginTop:2 }}>{sub}</div>}
    </div>
    <div className="vp-num" style={{ fontSize:15, fontWeight:bold?700:500, color:type==="in"?T.green:(type==="out"||type==="warn")?T.red:T.text, marginLeft:12, whiteSpace:"nowrap" }}>
      {value}
    </div>
  </div>
);
