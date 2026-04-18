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

export const Sl = ({ label, value, min, max, step, onChange, fmt: f, color, note, warn, T, sub }) => (
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

export const Tile = ({ label, value, sub, color, warn=false, onClick, T }) => (
  <div onClick={onClick} style={{ background:T.surface, border:"1px solid "+(warn?T.red+"44":T.border), borderRadius:8, padding:"9px 11px", cursor:onClick?"pointer":"default" }}>
    <div style={{ fontSize:8, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>{label}</div>
    <div style={{ fontSize:13, fontWeight:900, color: warn ? T.red : (color || T.accent) }}>{value}</div>
    {sub && <div style={{ fontSize:9, color:T.textDim, marginTop:2, lineHeight:1.4 }}>{sub}</div>}
  </div>
);

export const ChTip = ({ active, payload, label, T }) => {
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

export const Sheet = ({ title, onClose, children, T }) => (
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

export const Inp = ({ label, value, onChange, type="text", placeholder="", T }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:4 }}>{label}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      inputMode={type==="number" ? "decimal" : undefined}
      style={{ width:"100%", background:T.bg, border:"1px solid "+T.border, borderRadius:8, padding:"11px 12px", color:T.text, fontSize:16, outline:"none", fontFamily:"inherit", WebkitAppearance:"none" }} />
  </div>
);

export const SelEl = ({ label, value, onChange, options, T }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:4 }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width:"100%", background:T.bg, border:"1px solid "+T.border, borderRadius:8, padding:"11px 12px", color:T.text, fontSize:16, outline:"none", fontFamily:"inherit", WebkitAppearance:"none" }}>
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  </div>
);

export const Btn = ({ children, onClick, color, full=false, sm=false, danger=false, T }) => (
  <button onClick={onClick} style={{
    padding: sm ? "6px 12px" : "12px 18px", borderRadius:8,
    border:"1px solid "+(danger ? T.red+"44" : (color||T.accent)+"44"),
    background: danger ? T.red+"15" : (color||T.accent)+"15",
    color: danger ? T.red : (color||T.accent),
    cursor:"pointer", fontSize:sm?11:14, fontWeight:700, fontFamily:"inherit",
    width:full?"100%":"auto", WebkitTapHighlightColor:"transparent",
  }}>{children}</button>
);

export const Card = ({ children, T, style={} }) => (
  <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14, ...style }}>
    {children}
  </div>
);

export const CardLabel = ({ children, T, mb=10 }) => (
  <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:mb }}>
    {children}
  </div>
);

export const Row = ({ label, value, type="neutral", bold=false, sub, T }) => (
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
