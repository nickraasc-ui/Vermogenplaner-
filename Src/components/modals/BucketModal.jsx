import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, uid } from "../ui.jsx";
import { CY, BCK_CLRS } from "../../constants.js";

export default function BucketModal({ data, s, T, setModal, updArr }) {
  const [f, setF] = useState(data || { name:"", type:"Einmalig", amount:"", year:"", age:"", color:BCK_CLRS[0], note:"" });
  return (
    <Sheet title={data?.id ? "Bucket bearbeiten" : "Bucket anlegen"} onClose={() => setModal(null)} T={T}>
      <Inp label="Bezeichnung" value={f.name} onChange={v => setF(p => ({ ...p, name: v }))} placeholder="z.B. Urlaub 2026" T={T} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <SelEl label="Typ" value={f.type} onChange={v => setF(p => ({ ...p, type: v }))} options={["Einmalig","Jahrlich","Monatlich","Reserve"]} T={T} />
        <Inp label="Betrag (EUR)" value={f.amount} onChange={v => setF(p => ({ ...p, amount: v }))} type="number" T={T} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label="Zieljahr" value={f.year} onChange={v => setF(p => ({ ...p, year: v, age: "" }))} type="number" placeholder={String(CY+2)} T={T} />
        <Inp label="oder Alter" value={f.age} onChange={v => setF(p => ({ ...p, age: v, year: "" }))} type="number" placeholder="33" T={T} />
      </div>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Farbe</div>
        <div style={{ display:"flex", gap:10 }}>
          {BCK_CLRS.map(c => (
            <div key={c} onClick={() => setF(p => ({ ...p, color: c }))}
              style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", border:f.color===c?"3px solid "+T.text:"3px solid transparent" }} />
          ))}
        </div>
      </div>
      <Btn full color={T.green} T={T} onClick={() => {
        const b = { ...f, id:f.id||uid(), amount:+f.amount||0 };
        if (data?.id) updArr("buckets", s.buckets.map(x => x.id === b.id ? b : x));
        else updArr("buckets", [...(s.buckets||[]), b]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
