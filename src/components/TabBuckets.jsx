import { fmtE, full } from "./ui.jsx";
import { CY } from "../constants.js";

const TYPE_META = {
  "Einmalig":  { icon:"↓", color:"#ef4444", label:"Ausgabe einmalig" },
  "Jährlich":  { icon:"↓", color:"#ef4444", label:"Ausgabe jährlich" },
  "Monatlich": { icon:"↓", color:"#ef4444", label:"Ausgabe monatlich" },
  "Zufluss":   { icon:"↑", color:"#10b981", label:"Zufluss" },
  "Sparrate":  { icon:"⇄", color:"#f59e0b", label:"Einnahmenänderung" },
  "financed":  { icon:"≡", color:"#38bdf8", label:"Finanziert" },
};

const getMeta = (b) => {
  if (b.fundingMode === "financed") return TYPE_META["financed"];
  return TYPE_META[b.type] || { icon:"◎", color:"#94a3b8", label:b.type };
};

const getDesc = (b, currentAge, s) => {
  const ty = b.year ? +b.year : b.age ? CY+(+b.age-(CY-(s.birthYear||CY-35))) : null;
  const away = ty ? ty - CY : null;
  if (b.fundingMode === "financed") {
    const sy = +(b.financingStart||b.year||CY);
    const endY = sy + Math.ceil((+b.financingMonths||0)/12);
    return `${full(+b.monthlyPayment||0)}/Mo. × ${b.financingMonths} Mo. · ${sy}–${endY}${b.amount>0?" · "+full(b.amount)+" Kaufpreis":""}`;
  }
  if (b.type === "Sparrate") {
    const sign = (+b.delta||0) >= 0 ? "+" : "";
    const topf = b.spartopfMode === "manuell"
      ? " · Spartöpfe manuell"
      : "";
    return `${sign}${full(+b.delta||0)}/Mo.${b.startsAt?" ab "+b.startsAt:""}${b.endsAt?" bis "+b.endsAt:" dauerhaft"}${topf}`;
  }
  if (b.type === "Zufluss") return `${full(b.amount||0)} einmalig${ty?" in "+ty+(away!==null?" (in "+away+" J.)":""):""}`;
  return `${full(b.amount||0)}${b.type==="Monatlich"?"/Mo.":b.type==="Jährlich"?"/J.":""}${ty?" · "+ty+(away!==null?" (in "+away+" J.)":""):""}`;
};

// Rough impact: how much does this scenario change the portfolio at horizon end?
const roughImpact = (b, s, currentAge) => {
  const horizon = s.horizon || 35;
  const cr = s.classReturns || {};
  const vals = Object.values(cr);
  const wavg = vals.length ? vals.reduce((a,v)=>a+v,0)/vals.length : 6;
  const growFactor = (yrs) => Math.pow(1 + wavg/100, Math.max(0, yrs));
  const ty = b.year ? +b.year : b.age ? CY+(+b.age-(CY-(s.birthYear||CY-35))) : CY;
  const impactYrs = Math.max(0, (CY+horizon) - ty);

  if (b.fundingMode === "financed") {
    const sp = (+b.monthlyPayment||0) * 12;
    const yrs = Math.ceil((+b.financingMonths||0)/12);
    return wavg > 0 ? -sp * ((Math.pow(1+wavg/100,yrs)-1)/(wavg/100)) : -sp*yrs;
  }
  if (b.type === "Zufluss") return (+b.amount||0) * growFactor(impactYrs);
  if (b.type === "Sparrate") {
    const d = +b.delta||0;
    const from = +(b.startsAt||CY), to = b.endsAt ? +b.endsAt : CY+horizon;
    const yrs = Math.max(0, Math.min(to, CY+horizon) - from);
    return wavg > 0 ? d * 12 * ((Math.pow(1+wavg/100,yrs)-1)/(wavg/100)) : d*12*yrs;
  }
  if (b.type==="Einmalig") return -(+b.amount||0) * growFactor(impactYrs);
  if (b.type==="Jährlich") return -(+b.amount||0) * impactYrs * growFactor(impactYrs/2);
  if (b.type==="Monatlich") return -(+b.amount||0)*12 * impactYrs * growFactor(impactYrs/2);
  return 0;
};

export default function TabBuckets({ s, T, upd, updArr, setModal, agg, final, currentAge }) {
  const buckets = s.buckets || [];
  const active   = buckets.filter(b => b.active !== false);
  const inactive = buckets.filter(b => b.active === false);

  const totalImpact = active.reduce((t, b) => t + roughImpact(b, s, currentAge), 0);

  const toggle = (id) => {
    updArr("buckets", buckets.map(b => b.id===id ? {...b, active: b.active===false} : b));
  };

  const ScenarioCard = ({ b }) => {
    const meta = getMeta(b);
    const impact = roughImpact(b, s, currentAge);
    const isActive = b.active !== false;
    return (
      <div style={{ background:T.surface, border:"1px solid "+(isActive?b.color+"44":T.border), borderRadius:10, padding:"11px 13px", opacity:isActive?1:0.55, transition:"opacity 0.2s" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
          {/* Color dot + type icon */}
          <div style={{ width:32, height:32, borderRadius:8, background:meta.color+"18", border:"1px solid "+meta.color+"44", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:14, color:meta.color }}>
            {meta.icon}
          </div>

          {/* Content */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{b.name||"Unbenannt"}</span>
              <span style={{ fontSize:8, padding:"1px 6px", borderRadius:4, background:meta.color+"18", color:meta.color, fontWeight:700 }}>{meta.label}</span>
            </div>
            <div style={{ fontSize:9, color:T.textDim, marginTop:3, lineHeight:1.5 }}>{getDesc(b, currentAge, s)}</div>
            {Math.abs(impact) > 100 && (
              <div style={{ fontSize:9, color:impact>0?T.green:T.red, marginTop:3, fontWeight:700 }}>
                {impact>0?"+" : ""}{fmtE(impact)} am Horizont
              </div>
            )}
          </div>

          {/* Toggle + actions */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
            {/* Toggle */}
            <div onClick={() => toggle(b.id)}
              style={{ width:40, height:22, borderRadius:11, background:isActive?T.green:T.border, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
              <div style={{ position:"absolute", top:2, left:isActive?20:2, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.25)" }}/>
            </div>
            {/* Edit/Delete */}
            <div style={{ display:"flex", gap:4 }}>
              <button onClick={() => setModal({ type:"bucket", data:b })}
                style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:5, padding:"3px 8px", cursor:"pointer", fontSize:9, color:T.textMid, fontWeight:600 }}>edit</button>
              <button onClick={() => updArr("buckets", buckets.filter(x => x.id !== b.id))}
                style={{ background:T.red+"10", border:"1px solid "+T.red+"22", borderRadius:5, padding:"3px 8px", cursor:"pointer", fontSize:9, color:T.red, fontWeight:600 }}>x</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontWeight:900, color:T.text, fontSize:15 }}>Szenario-Planer</div>
          <div style={{ fontSize:10, color:T.textDim, marginTop:2 }}>
            Aktive Szenarien fließen in die Projektion ein — toggle zum Vergleichen
          </div>
        </div>
        <button onClick={() => setModal({ type:"bucket", data:null })}
          style={{ padding:"7px 14px", borderRadius:8, border:"1px solid "+T.green+"44", background:T.green+"15", color:T.green, cursor:"pointer", fontSize:12, fontWeight:700, WebkitTapHighlightColor:"transparent", flexShrink:0 }}>
          + Szenario
        </button>
      </div>

      {/* Summary bar */}
      {buckets.length > 0 && (
        <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:"12px 14px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            <div>
              <div style={{ fontSize:8, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:3 }}>Szenarien</div>
              <div style={{ fontSize:16, fontWeight:900, color:T.text }}>{active.length}<span style={{ fontSize:9, color:T.textDim, fontWeight:400 }}>/{buckets.length}</span></div>
              <div style={{ fontSize:8, color:T.textDim }}>aktiv</div>
            </div>
            <div>
              <div style={{ fontSize:8, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:3 }}>Gesamteffekt</div>
              <div style={{ fontSize:16, fontWeight:900, color:totalImpact>=0?T.green:T.red }}>
                {totalImpact>=0?"+":""}{fmtE(totalImpact)}
              </div>
              <div style={{ fontSize:8, color:T.textDim }}>am Horizont (ca.)</div>
            </div>
            <div>
              <div style={{ fontSize:8, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:3 }}>Mit Szenarien</div>
              <div style={{ fontSize:16, fontWeight:900, color:T.accent }}>
                {fmtE((final?.base||0) )}
              </div>
              <div style={{ fontSize:8, color:T.textDim }}>Basis-Prognose</div>
            </div>
          </div>
        </div>
      )}

      {/* Hint box */}
      {buckets.length === 0 && (
        <div style={{ background:T.surface, border:"1px dashed "+T.border, borderRadius:10, padding:32, textAlign:"center" }}>
          <div style={{ fontSize:28, marginBottom:10 }}>⇄</div>
          <div style={{ fontSize:13, fontWeight:700, color:T.textMid, marginBottom:6 }}>Noch keine Szenarien</div>
          <div style={{ fontSize:10, color:T.textDim, marginBottom:6, lineHeight:1.7 }}>
            Definiere Ereignisse und vergleiche deren Auswirkung auf dein Vermögen.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:20, textAlign:"left", background:T.surfaceHigh, borderRadius:8, padding:"10px 14px" }}>
            {[
              ["↓","Ausgabe","Autokauf, Renovierung, Schulgeld"],
              ["↑","Zufluss","Erbschaft, Bonus, Immobilienverkauf"],
              ["⇄","Einnahmenänderung","Gehaltserhöhung, Rente, Teilzeit"],
              ["≡","Finanziert","Kreditrate reduziert Sparrate"],
            ].map(([icon, label, ex]) => (
              <div key={label} style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:12, width:18, textAlign:"center" }}>{icon}</span>
                <div>
                  <span style={{ fontSize:10, fontWeight:700, color:T.textMid }}>{label}</span>
                  <span style={{ fontSize:9, color:T.textDim }}> — {ex}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setModal({ type:"bucket", data:null })}
            style={{ padding:"10px 24px", borderRadius:8, border:"none", background:T.accent, color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700 }}>
            Erstes Szenario anlegen
          </button>
        </div>
      )}

      {/* Active scenarios */}
      {active.length > 0 && (
        <div>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
            Aktiv ({active.length}) — fließen in Projektion ein
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {active.map(b => <ScenarioCard key={b.id} b={b} />)}
          </div>
        </div>
      )}

      {/* Inactive scenarios */}
      {inactive.length > 0 && (
        <div>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
            Deaktiviert ({inactive.length}) — ausgeblendet aus Projektion
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {inactive.map(b => <ScenarioCard key={b.id} b={b} />)}
          </div>
        </div>
      )}

      {/* Tip */}
      {buckets.length > 0 && (
        <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:"10px 13px", fontSize:9, color:T.textDim, lineHeight:1.6 }}>
          Tip: Deaktiviere ein Szenario, wechsle in den Tab <strong style={{ color:T.text }}>Projektion</strong> und vergleiche den Endwert — dann aktiviere wieder. So siehst du den direkten Einfluss.
        </div>
      )}
    </div>
  );
}
