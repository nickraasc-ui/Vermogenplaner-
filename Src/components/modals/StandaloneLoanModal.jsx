import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, full, uid } from "../ui.jsx";

const LOAN_TYPES = [
  { value: "annuitat", label: "Annuitätendarlehen" },
  { value: "endfaellig", label: "Endfälliges Darlehen" },
];

export default function StandaloneLoanModal({ data, s, T, setModal, updArr }) {
  const [f, setF] = useState(data
    ? { ...data }
    : { name: "", debt: "", loanRate: "", loanAnnuitat: "", loanTermYears: "", loanType: "annuitat", owner: "" }
  );
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const ownerOpts = [{ value: "", label: "Kein Eigentümer" }, ...(s.owners||[]).map(o => ({ value: o.id, label: o.label }))];

  const debt = +f.debt || 0;
  const ann  = +f.loanAnnuitat || 0;
  const rate = +f.loanRate || 0;
  const monthlyInterest = debt * rate / 100 / 12;
  const monthlyTilgung  = ann - monthlyInterest;

  return (
    <Sheet title={data?.id ? "Darlehen bearbeiten" : "Darlehen anlegen"} onClose={() => setModal(null)} T={T}>
      <Inp label="Bezeichnung" value={f.name} onChange={v => set("name", v)} placeholder="z.B. Privatdarlehen, KFZ-Kredit..." T={T} />
      {(s.owners||[]).length > 0 && (
        <SelEl label="Eigentümer" value={f.owner||""} onChange={v => set("owner", v)} options={ownerOpts} T={T} />
      )}
      <SelEl label="Darlehensart" value={f.loanType} onChange={v => set("loanType", v)} options={LOAN_TYPES} T={T} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Inp label="Restschuld (€)" value={f.debt} onChange={v => set("debt", v)} type="number" placeholder="0" T={T} />
        <Inp label="Zinssatz (%)" value={f.loanRate} onChange={v => set("loanRate", v)} type="number" placeholder="3.5" T={T} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Inp label="Annuität/Mo. (€)" value={f.loanAnnuitat} onChange={v => set("loanAnnuitat", v)} type="number" placeholder="0" T={T} />
        <Inp label="Laufzeit (Jahre)" value={f.loanTermYears} onChange={v => set("loanTermYears", v)} type="number" placeholder="10" T={T} />
      </div>

      {debt > 0 && ann > 0 && (
        <div style={{ background: T.surfaceHigh, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 13px", marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: T.textMid, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Vorschau</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: T.textMid }}>Monatsrate</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: T.red }}>{full(ann)}/Mo.</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: T.textMid }}>davon Zinsen</span>
            <span style={{ fontSize: 11, color: T.red }}>{full(monthlyInterest)}/Mo.</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: T.textMid }}>davon Tilgung</span>
            <span style={{ fontSize: 11, color: monthlyTilgung >= 0 ? T.green : T.red }}>{full(Math.max(0, monthlyTilgung))}/Mo.</span>
          </div>
        </div>
      )}

      <Btn full color={T.red} T={T} onClick={() => {
        const st = {
          ...f,
          id: f.id || uid(),
          debt: +f.debt || 0,
          loanRate: +f.loanRate || 0,
          loanAnnuitat: +f.loanAnnuitat || 0,
          loanTermYears: +f.loanTermYears || null,
          owner: f.owner || null,
        };
        if (!st.name) return;
        if (data?.id) updArr("standaloneLoans", (s.standaloneLoans||[]).map(x => x.id === st.id ? st : x));
        else updArr("standaloneLoans", [...(s.standaloneLoans||[]), st]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
