import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, full, uid } from "../ui.jsx";
import { INCOME_TYPES, CY } from "../../constants.js";

export default function IncomeStreamModal({ data, s, T, setModal, updArr }) {
  const [f, setF] = useState(data
    ? { ...data, endsAt: data.endsAt ?? "" }
    : { label:"", type:"Gehalt", owner:"", amount:"", growthPct:0, startsAt:CY, endsAt:"" }
  );
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const ownerOpts = [{ value:"", label:"Kein Eigentümer" }, ...(s.owners||[]).map(o => ({ value:o.id, label:o.label }))];
  const amt = +f.amount || 0;

  return (
    <Sheet title={data?.id ? "Einkommensstrom bearbeiten" : "Einkommensstrom anlegen"} onClose={() => setModal(null)} T={T}>
      <Inp label="Bezeichnung" value={f.label} onChange={v => set("label",v)} placeholder="z.B. Gehalt Ehemann" T={T} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <SelEl label="Typ" value={f.type} onChange={v => set("type",v)} options={INCOME_TYPES} T={T} />
        <SelEl label="Eigentümer" value={f.owner||""} onChange={v => set("owner",v)} options={ownerOpts} T={T} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label="Betrag/Mo. (€)" value={f.amount} onChange={v => set("amount",v)} type="number" placeholder="0" T={T} />
        <Inp label="Wachstum %/J." value={f.growthPct} onChange={v => set("growthPct",v)} type="number" placeholder="0" T={T} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label="Startjahr" value={f.startsAt} onChange={v => set("startsAt",v)} type="number" placeholder={String(CY)} T={T} />
        <Inp label="Endjahr (leer = dauerhaft)" value={f.endsAt} onChange={v => set("endsAt",v)} type="number" placeholder="offen" T={T} />
      </div>
      {amt > 0 && (
        <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:"10px 13px", marginBottom:12 }}>
          <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Vorschau</div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:11, color:T.textMid }}>Heute</span>
            <span style={{ fontSize:13, fontWeight:800, color:T.green }}>{full(amt)}/Mo.</span>
          </div>
          {(+f.growthPct||0) > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              <span style={{ fontSize:11, color:T.textMid }}>In 10 Jahren (+{f.growthPct}%/J.)</span>
              <span style={{ fontSize:13, fontWeight:800, color:T.green }}>{full(amt * Math.pow(1+(+f.growthPct)/100, 10))}/Mo.</span>
            </div>
          )}
          {f.endsAt && <div style={{ fontSize:9, color:T.amber, marginTop:4 }}>Läuft aus: {f.endsAt}</div>}
        </div>
      )}
      <Btn full color={T.green} T={T} onClick={() => {
        const st = { ...f, id:f.id||uid(), amount:+f.amount||0, growthPct:+f.growthPct||0, startsAt:+f.startsAt||CY, endsAt:f.endsAt?+f.endsAt:null, owner:f.owner||null };
        if (data?.id) updArr("incomeStreams", (s.incomeStreams||[]).map(x => x.id===st.id ? st : x));
        else updArr("incomeStreams", [...(s.incomeStreams||[]), st]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
