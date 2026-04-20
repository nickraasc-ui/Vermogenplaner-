import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, full, uid } from "../ui.jsx";
import { EXPENSE_CATEGORIES, CY } from "../../constants.js";

export default function ExpenseStreamModal({ data, s, T, setModal, updArr }) {
  const [f, setF] = useState(data
    ? { ...data, endsAt: data.endsAt ?? "" }
    : { label:"", category:"Lebenshaltung", amount:"", startsAt:CY, endsAt:"", owner:"", isBufferContribution:false }
  );
  const hasPuffer = (s.assets||[]).some(a => a.isHaushaltsPuffer && a.class === "Cash");
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const amt = +f.amount || 0;
  const ownerOpts = [{ value:"", label:"Kein Eigentümer" }, ...(s.owners||[]).map(o => ({ value:o.id, label:o.label }))];

  return (
    <Sheet title={data?.id ? "Ausgabenstrom bearbeiten" : "Ausgabenstrom anlegen"} onClose={() => setModal(null)} T={T}>
      <Inp label="Bezeichnung" value={f.label} onChange={v => set("label",v)} placeholder="z.B. Kindergarten, Miete..." T={T} />
      <SelEl label="Kategorie" value={f.category} onChange={v => set("category",v)} options={EXPENSE_CATEGORIES} T={T} />
      {(s.owners||[]).length > 0 && (
        <SelEl label="Eigentümer" value={f.owner||""} onChange={v => set("owner",v)} options={ownerOpts} T={T} />
      )}
      <Inp label="Betrag/Mo. (€)" value={f.amount} onChange={v => set("amount",v)} type="number" placeholder="0" T={T} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label="Startjahr" value={f.startsAt} onChange={v => set("startsAt",v)} type="number" placeholder={String(CY)} T={T} />
        <Inp label="Endjahr (leer = dauerhaft)" value={f.endsAt} onChange={v => set("endsAt",v)} type="number" placeholder="offen" T={T} />
      </div>
      {amt > 0 && (
        <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:"10px 13px", marginBottom:12 }}>
          <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Vorschau</div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:11, color:T.textMid }}>Monatlich</span>
            <span style={{ fontSize:13, fontWeight:800, color:T.red }}>{full(amt)}/Mo.</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
            <span style={{ fontSize:11, color:T.textMid }}>Jährlich</span>
            <span style={{ fontSize:12, fontWeight:700, color:T.red }}>{full(amt*12)}/J.</span>
          </div>
          {f.endsAt && <div style={{ fontSize:9, color:T.green, marginTop:4 }}>Läuft aus: {f.endsAt} (zeitlich begrenzt)</div>}
        </div>
      )}
      {hasPuffer && (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, padding:"10px 12px", background:T.surfaceHigh, borderRadius:8, border:"1px solid "+(f.isBufferContribution?T.green:T.border) }}>
          <input type="checkbox" checked={!!f.isBufferContribution} onChange={e => set("isBufferContribution", e.target.checked)} id="buf" style={{ accentColor:T.green, width:18, height:18 }} />
          <div>
            <label htmlFor="buf" style={{ fontSize:13, color:T.textMid, cursor:"pointer" }}>Fließt in Haushaltspuffer</label>
            <div style={{ fontSize:9, color:T.textDim, marginTop:1 }}>Betrag wird dem Pufferkonto gutgeschrieben statt konsumiert</div>
          </div>
        </div>
      )}
      <Btn full color={T.red} T={T} onClick={() => {
        const st = { ...f, id:f.id||uid(), amount:+f.amount||0, startsAt:+f.startsAt||CY, endsAt:f.endsAt?+f.endsAt:null, owner:f.owner||null, isBufferContribution:!!f.isBufferContribution };
        if (data?.id) updArr("expenseStreams", (s.expenseStreams||[]).map(x => x.id===st.id ? st : x));
        else updArr("expenseStreams", [...(s.expenseStreams||[]), st]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
