import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, full, uid } from "../ui.jsx";
import { normalizeExpenseStream, singleOwner, primaryOwnerId } from "../../model/schema.js";
import { EXPENSE_CATEGORIES, CY } from "../../constants.js";

export default function ExpenseStreamModal({ data, s, T, setModal, updArr }) {
  const [f, setF] = useState(data
    ? { ...data, owner: primaryOwnerId(data) || "", endsAt: data.endsAt ?? "" }
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
        <div style={{ background:"transparent", border:"1px solid "+T.border, borderRadius:16, padding:"10px 13px", marginBottom:12 }}>
          <div style={{ fontSize:16, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:6 }}>Vorschau</div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, color:T.textMid }}>Monatlich</span>
            <span style={{ fontSize:13, fontWeight:600, color:T.red }}>{full(amt)}/Mo.</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
            <span style={{ fontSize:12, color:T.textMid }}>Jährlich</span>
            <span style={{ fontSize:12, fontWeight:600, color:T.red }}>{full(amt*12)}/J.</span>
          </div>
          {f.endsAt && <div style={{ fontSize:11, color:T.green, marginTop:4 }}>Läuft aus: {f.endsAt} (zeitlich begrenzt)</div>}
        </div>
      )}
      {hasPuffer && (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, padding:"10px 12px", background:T.surfaceHigh, borderRadius:8, border:"1px solid "+(f.isBufferContribution?T.green:T.border) }}>
          <input type="checkbox" checked={!!f.isBufferContribution} onChange={e => set("isBufferContribution", e.target.checked)} id="buf" style={{ accentColor:T.green, width:18, height:18 }} />
          <div>
            <label htmlFor="buf" style={{ fontSize:13, color:T.textMid, cursor:"pointer" }}>Fließt in Haushaltspuffer</label>
            <div style={{ fontSize:11, color:T.textDim, marginTop:1 }}>Betrag wird dem Pufferkonto gutgeschrieben statt konsumiert</div>
          </div>
        </div>
      )}
      <Btn full color={T.red} T={T} onClick={() => {
        const { owner, ...rest } = f;
        const st = normalizeExpenseStream({ ...rest, ownership: singleOwner(owner) });
        if (data?.id) updArr("expenseStreams", (s.expenseStreams||[]).map(x => x.id===st.id ? st : x));
        else updArr("expenseStreams", [...(s.expenseStreams||[]), st]);
        setModal(null);
      }}>Speichern</Btn>
      {data?.id && (s.expenseStreams||[]).some(x => x.id === data.id) && (
        <div style={{ marginTop:10 }}>
          <Btn full danger T={T} onClick={() => { updArr("expenseStreams", (s.expenseStreams||[]).filter(x => x.id !== data.id)); setModal(null); }}>Ausgabe löschen</Btn>
        </div>
      )}
    </Sheet>
  );
}
