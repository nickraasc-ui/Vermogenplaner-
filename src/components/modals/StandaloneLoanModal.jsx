import { useState } from "react";
import { Sheet, Inp, SelEl, Btn } from "../ui.jsx";
import { normalizeLoan, singleOwner, primaryOwnerId } from "../../model/schema.js";
import { resolveLoanForm } from "../../model/loan.js";
import LoanEditor, { loanFormOf } from "../LoanEditor.jsx";

export default function StandaloneLoanModal({ data, s, T, setModal, updArr }) {
  const [f, setF] = useState(data
    ? { ...data, ...loanFormOf(data), owner: primaryOwnerId(data) || "" }
    : { name: "", debt: "", owner: "", ...loanFormOf({}) }
  );
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const patch = (p) => setF(prev => ({ ...prev, ...p }));
  const ownerOpts = [{ value: "", label: "Kein Eigentümer" }, ...(s.owners||[]).map(o => ({ value: o.id, label: o.label }))];

  return (
    <Sheet title={data?.id ? "Darlehen bearbeiten" : "Darlehen anlegen"} onClose={() => setModal(null)} T={T}>
      <Inp label="Bezeichnung" value={f.name} onChange={v => set("name", v)} placeholder="z.B. Privatdarlehen, KFZ-Kredit..." T={T} />
      {(s.owners||[]).length > 0 && (
        <SelEl label="Eigentümer" value={f.owner||""} onChange={v => set("owner", v)} options={ownerOpts} T={T} />
      )}
      <Inp label="Restschuld (€)" value={f.debt} onChange={v => set("debt", v)} type="number" placeholder="0" T={T} />
      <LoanEditor f={f} set={patch} T={T} />
      <div style={{ height:16 }} />

      <Btn full color={T.red} T={T} onClick={() => {
        const { owner, ...rest } = f;
        const st = normalizeLoan({ ...rest, ...resolveLoanForm(f), ownership: singleOwner(owner) });
        if (!st.name) return;
        if (data?.id) updArr("standaloneLoans", (s.standaloneLoans||[]).map(x => x.id === st.id ? st : x));
        else updArr("standaloneLoans", [...(s.standaloneLoans||[]), st]);
        setModal(null);
      }}>Speichern</Btn>
      {data?.id && (s.standaloneLoans||[]).some(x => x.id === data.id) && (
        <div style={{ marginTop:10 }}>
          <Btn full danger T={T} onClick={() => { updArr("standaloneLoans", (s.standaloneLoans||[]).filter(x => x.id !== data.id)); setModal(null); }}>Darlehen löschen</Btn>
        </div>
      )}
    </Sheet>
  );
}
