import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, full, uid } from "../ui.jsx";
import { CY, BCK_CLRS } from "../../constants.js";

export default function BucketModal({ data, s, T, setModal, updArr }) {
  const [f, setF] = useState(data || { name:"", type:"Einmalig", amount:"", year:"", age:"", color:BCK_CLRS[0], note:"", fundingMode:"lump_sum", monthlyPayment:"", financingMonths:"", financingStart:"" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const isFinanced = f.fundingMode === "financed";
  const totalCost   = isFinanced ? (+f.monthlyPayment||0) * (+f.financingMonths||0) : (+f.amount||0);

  return (
    <Sheet title={data?.id ? "Bucket bearbeiten" : "Bucket anlegen"} onClose={() => setModal(null)} T={T}>
      <Inp label="Bezeichnung" value={f.name} onChange={v => set("name",v)} placeholder="z.B. Neues Auto, Urlaub..." T={T} />

      {/* Funding mode toggle */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Finanzierungsart</div>
        <div style={{ display:"flex", gap:8 }}>
          {[["lump_sum","Einmalzahlung"],["financed","Finanziert"]].map(([k,lbl]) => (
            <button key={k} onClick={() => set("fundingMode",k)} style={{ flex:1, padding:"9px 0", borderRadius:8, border:"1px solid "+(f.fundingMode===k?T.accent:T.border), background:f.fundingMode===k?T.accent+"18":"transparent", color:f.fundingMode===k?T.accent:T.textMid, cursor:"pointer", fontSize:12, fontWeight:700, WebkitTapHighlightColor:"transparent" }}>{lbl}</button>
          ))}
        </div>
        <div style={{ fontSize:9, color:T.textDim, marginTop:5 }}>
          {isFinanced ? "Monatliche Rate läuft durch Cashflow — reduziert Sparrate im Finanzierungszeitraum" : "Einmalbetrag wird aus dem Portfoliowert zum Zieljahr abgezogen"}
        </div>
      </div>

      {isFinanced ? (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Inp label="Kaufpreis (€)" value={f.amount} onChange={v => set("amount",v)} type="number" placeholder="0" T={T} />
            <Inp label="Rate/Mo. (€)" value={f.monthlyPayment} onChange={v => set("monthlyPayment",v)} type="number" placeholder="0" T={T} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Inp label="Laufzeit (Monate)" value={f.financingMonths} onChange={v => set("financingMonths",v)} type="number" placeholder="48" T={T} />
            <Inp label="Finanzierungsstart (Jahr)" value={f.financingStart} onChange={v => set("financingStart",v)} type="number" placeholder={String(CY)} T={T} />
          </div>
          {(+f.monthlyPayment||0) > 0 && (+f.financingMonths||0) > 0 && (
            <div style={{ background:T.surfaceHigh, border:"1px solid "+T.amber+"44", borderRadius:8, padding:"10px 13px", marginBottom:12, fontSize:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ color:T.textMid }}>Gesamtkosten</span>
                <span style={{ fontWeight:800, color:T.amber }}>{full(totalCost)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:T.textMid }}>Laufzeit</span>
                <span style={{ color:T.textMid }}>{f.financingMonths} Monate ab {f.financingStart||CY}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <SelEl label="Typ" value={f.type} onChange={v => set("type",v)} options={["Einmalig","Jahrlich","Monatlich","Reserve"]} T={T} />
            <Inp label="Betrag (€)" value={f.amount} onChange={v => set("amount",v)} type="number" T={T} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Inp label="Zieljahr" value={f.year} onChange={v => set("year",v)} type="number" placeholder={String(CY+2)} T={T} />
            <Inp label="oder Alter" value={f.age} onChange={v => set("age",v)} type="number" placeholder="33" T={T} />
          </div>
        </>
      )}

      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Farbe</div>
        <div style={{ display:"flex", gap:10 }}>
          {BCK_CLRS.map(c => (
            <div key={c} onClick={() => set("color",c)} style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", border:f.color===c?"3px solid "+T.text:"3px solid transparent" }} />
          ))}
        </div>
      </div>

      <Btn full color={T.green} T={T} onClick={() => {
        const b = { ...f, id:f.id||uid(), amount:+f.amount||0, monthlyPayment:+f.monthlyPayment||0, financingMonths:+f.financingMonths||0, financingStart:+f.financingStart||CY };
        if (data?.id) updArr("buckets", s.buckets.map(x => x.id===b.id ? b : x));
        else updArr("buckets", [...(s.buckets||[]), b]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
