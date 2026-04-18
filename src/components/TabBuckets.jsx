import { Btn, full } from "./ui.jsx";
import { CY } from "../constants.js";

export default function TabBuckets({ s, T, updArr, setModal }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontWeight:900, color:T.text, fontSize:15 }}>Ausgaben-Buckets</div>
          <div style={{ fontSize:10, color:T.textDim, marginTop:2 }}>Fliesst in Projektion ein</div>
        </div>
        <Btn color={T.green} T={T} onClick={() => setModal({ type:"bucket", data:null })}>+ Bucket</Btn>
      </div>
      {!s.buckets?.length && (
        <div style={{ background:T.surface, border:"1px dashed "+T.border, borderRadius:10, padding:30, textAlign:"center" }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.textMid }}>Noch keine Buckets</div>
          <div style={{ fontSize:10, color:T.textDim, marginTop:4, marginBottom:18 }}>Urlaub, Autokauf, Renovierung...</div>
          <Btn color={T.accent} T={T} onClick={() => setModal({ type:"bucket", data:null })}>Ersten Bucket anlegen</Btn>
        </div>
      )}
      {(s.buckets||[]).map(b => {
        const isFinanced = b.fundingMode === "financed";
        const ty = b.year ? +b.year : b.age ? CY+(+b.age-30) : null;
        const away = ty ? ty - CY : null;
        const sy = isFinanced ? (+b.financingStart||CY) : null;
        const endY = sy ? sy + Math.ceil((+b.financingMonths||0)/12) : null;
        return (
          <div key={b.id} style={{ background:T.surface, border:"1px solid "+b.color+"33", borderRadius:10, padding:13 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start", flex:1 }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:b.color, marginTop:4, flexShrink:0 }} />
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{b.name}</div>
                    <span style={{ fontSize:8, padding:"1px 6px", borderRadius:4, background:isFinanced?T.amber+"18":T.green+"18", color:isFinanced?T.amber:T.green, fontWeight:700 }}>{isFinanced?"Finanziert":"Einmalzahlung"}</span>
                  </div>
                  {isFinanced ? (
                    <div style={{ fontSize:9, color:T.textLow, marginTop:3, lineHeight:1.6 }}>
                      {full(b.monthlyPayment)}/Mo. × {b.financingMonths} Mo. = {full((+b.monthlyPayment||0)*(+b.financingMonths||0))} gesamt
                      {sy && ` | ${sy}–${endY}`}
                      {b.amount > 0 && ` | Kaufpreis ${full(b.amount)}`}
                    </div>
                  ) : (
                    <div style={{ fontSize:9, color:T.textLow, marginTop:3, lineHeight:1.6 }}>
                      {b.type} {full(b.amount)}{b.type==="Monatlich"?"/Mo.":b.type==="Jahrlich"?"/J.":""}
                      {ty&&" "+ty}{away!==null&&" (in "+away+" J.)"}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display:"flex", gap:5 }}>
                <Btn sm T={T} onClick={() => setModal({ type:"bucket", data:b })}>edit</Btn>
                <Btn sm danger T={T} onClick={() => updArr("buckets", s.buckets.filter(x => x.id !== b.id))}>x</Btn>
              </div>
            </div>
          </div>
        );
      })}
      {s.buckets?.length > 0 && (
        <button onClick={() => setModal({ type:"afford" })}
          style={{ background:T.surface, border:"1px solid "+T.purple+"33", borderRadius:10, padding:13, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", WebkitTapHighlightColor:"transparent" }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.purple }}>Neue Ausgabe prufen</div>
          <div style={{ fontSize:16, color:T.purple }}>{">"}</div>
        </button>
      )}
    </div>
  );
}
