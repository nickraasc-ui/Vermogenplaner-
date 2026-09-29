export const fmtE = (v) => {
  if (!v && v !== 0) return "\u20AC0";
  const a = Math.abs(v);
  if (a >= 1_000_000) return "\u20AC" + (v / 1_000_000).toFixed(2) + "M";
  if (a >= 1_000) return "\u20AC" + (v / 1_000).toFixed(0) + "k";
  return "\u20AC" + Math.round(v);
};
export const full = (v) => "\u20AC" + Math.round(v ?? 0).toLocaleString("de-DE");
export const uid = () => Math.random().toString(36).slice(2, 9);
export const mlbl = (ym) => {
  const [y, m] = ym.split("-");
  return ["","Jan","Feb","Mar","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][+m] + " " + y;
};
export const pct = (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";

// Shared label style: sentence case, readable size
export const labelStyle = (T) => ({ fontSize:12, color:T.textMid, fontWeight:500, display:"block", marginBottom:6 });

const ICONS = {
  edit:  "M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3zM13.5 6.5l3 3",
  close: "M6 6l12 12M18 6L6 18",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3",
  back:  "M15 18l-6-6 6-6",
  plus:  "M12 5v14M5 12h14",
  sun:   "M12 4V2M12 22v-2M4.9 4.9 3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  moon:  "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
  home:  "M3 11l9-7 9 7M5 10v10h14V10",
  wallet:"M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7zm0 0V6a2 2 0 0 1 2-2h11M16 14h.01",
  pie:   "M12 3v9h9M21 12a9 9 0 1 1-9-9",
  chart: "M3 20h18M6 16l4-5 4 3 5-7",
  layers:"M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  help:  "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  chevron:"M9 18l6-6-6-6",
};
export const Icon = ({ name, size=18, color="currentColor", stroke=1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink:0, display:"block" }}>
    <path d={ICONS[name]} />
  </svg>
);

export const IconBtn = ({ icon, onClick, label, danger=false, T, size=32 }) => (
  <button type="button" onClick={onClick} aria-label={label} title={label} className="vp-iconbtn"
    style={{ width:size, height:size, display:"inline-flex", alignItems:"center", justifyContent:"center",
      borderRadius:8, border:"1px solid "+T.border, background:T.surface, cursor:"pointer", flexShrink:0,
      color: danger ? T.red : T.textMid, padding:0, WebkitTapHighlightColor:"transparent" }}>
    <Icon name={icon} size={15} />
  </button>
);

export const Sl = ({ label, value, min, max, step, onChange, fmt: f, color, note, warn, T, sub }) => (
  <div>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
      <label style={{ fontSize:13, color:T.textMid, fontWeight:500 }}>{label}</label>
      <span className="vp-num" style={{ fontSize:15, fontWeight:600, color: warn ? T.red : (color || T.text) }}>{f(value)}</span>
    </div>
    {note && <div style={{ fontSize:12, color:T.textLow, marginBottom:4 }}>{note}</div>}
    {sub && <div style={{ fontSize:12, color:T.accent, marginBottom:4 }}>{sub}</div>}
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="vp-range"
      style={{
        "--vp-fill": warn ? T.red : (color || T.accent),
        "--vp-track": T.border,
        "--vp-pct": `${Math.min(100, Math.max(0, ((value - min) / ((max - min) || 1)) * 100))}%`,
        "--vp-thumb-ring": T.surface,
      }} />
    <div className="vp-num" style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:T.textDim, marginTop:2 }}>
      <span>{f(min)}</span><span>{f(max)}</span>
    </div>
  </div>
);

export const Tile = ({ label, value, sub, color, warn=false, onClick, T }) => (
  <div onClick={onClick} className={onClick ? "vp-hover" : undefined}
    style={{ background:T.surface, border:"1px solid "+(warn?T.red+"55":T.border), borderRadius:12, padding:"12px 14px", cursor:onClick?"pointer":"default", boxShadow:T.shadow, minWidth:0 }}>
    <div style={{ fontSize:12, color:T.textLow, fontWeight:500, marginBottom:4 }}>{label}</div>
    <div className="vp-num" style={{ fontSize:17, fontWeight:600, letterSpacing:"-0.01em", color: warn ? T.red : (color || T.text) }}>{value}</div>
    {sub && <div style={{ fontSize:12, color:T.textLow, marginTop:3, lineHeight:1.4 }}>{sub}</div>}
  </div>
);

export const ChTip = ({ active, payload, label, T }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.surface, border:"1px solid "+T.border, boxShadow:T.shadow, borderRadius:14, padding:"10px 12px", fontSize:12, boxShadow:"0 8px 24px rgba(0,0,0,0.18)" }}>
      <div style={{ fontWeight:600, color:T.text, marginBottom:6 }}>Alter {label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display:"flex", justifyContent:"space-between", gap:16, marginBottom:3 }}>
          <span style={{ display:"flex", alignItems:"center", gap:6, color:T.textMid }}>
            <span style={{ width:8, height:8, borderRadius:2, background:p.color }} />{p.name}
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
      style={{ background:T.surface, border:"1px solid "+T.border }}>
      <div style={{ padding:"10px 20px 0", position:"sticky", top:0, background:T.surface, zIndex:1 }}>
        <div className="vp-grabber" style={{ background:T.borderHigh }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, padding:"6px 0 14px" }}>
          <div style={{ fontWeight:600, fontSize:17, color:T.text, letterSpacing:"-0.01em" }}>{title}</div>
          <IconBtn icon="close" label="Schließen" onClick={onClose} T={T} />
        </div>
      </div>
      <div style={{ padding:"4px 20px 24px" }}>{children}</div>
    </div>
  </div>
);

const fieldStyle = (T) => ({ width:"100%", background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:10, padding:"11px 12px", color:T.text, fontSize:16, outline:"none", fontFamily:"inherit", WebkitAppearance:"none" });

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

export const Btn = ({ children, onClick, color, full=false, sm=false, danger=false, T }) => {
  const iconName = typeof children === "string" ? ICON_CHILD[children] : null;
  if (iconName) {
    return <IconBtn icon={iconName} danger={danger} label={iconName === "edit" ? "Bearbeiten" : "Entfernen"}
      onClick={onClick} T={T} size={sm ? 32 : 40} />;
  }
  const c = danger ? T.red : (color || T.accent);
  return (
    <button type="button" onClick={onClick} className="vp-btn" style={{
      padding: sm ? "6px 12px" : "11px 18px", borderRadius: sm ? 8 : 10,
      border:"1px solid "+c+"33",
      background: c+"14",
      color: c,
      cursor:"pointer", fontSize:sm?13:15, fontWeight:600, fontFamily:"inherit", lineHeight:1.3,
      width:full?"100%":"auto", WebkitTapHighlightColor:"transparent", whiteSpace:"nowrap",
    }}>{children}</button>
  );
};

export const Card = ({ children, T, style={} }) => (
  <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:14, padding:16, boxShadow:T.shadow, ...style }}>
    {children}
  </div>
);

export const CardLabel = ({ children, T, mb=12 }) => (
  <div style={{ fontSize:14, color:T.text, fontWeight:600, marginBottom:mb, letterSpacing:"-0.005em" }}>
    {children}
  </div>
);

export const Row = ({ label, value, type="neutral", bold=false, sub, T }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"9px 0", borderBottom:"1px solid "+T.border }}>
    <div style={{ minWidth:0 }}>
      <div style={{ fontSize:14, color:bold?T.text:T.textMid, fontWeight:bold?600:400 }}>{label}</div>
      {sub && <div style={{ fontSize:12, color:T.textLow, marginTop:2 }}>{sub}</div>}
    </div>
    <div className="vp-num" style={{ fontSize:bold?15:14, fontWeight:bold?650:500, color:type==="in"?T.green:type==="out"?T.red:type==="warn"?T.red:(bold?T.text:T.text), marginLeft:12, whiteSpace:"nowrap" }}>
      {value}
    </div>
  </div>
);
