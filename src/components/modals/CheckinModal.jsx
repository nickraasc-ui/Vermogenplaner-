import { useState } from "react";
import { Sheet, Inp, Btn, uid } from "../ui.jsx";
import { CM } from "../../constants.js";

export default function CheckinModal({ s, cf, T, setModal, updArr }) {
  const [f, setF] = useState({ month: CM, ausgaben_ist: String(Math.round(cf.streamExpense||0)), reserven_ist: "0", sparrate_ist: String(Math.round(cf.eff)), note: "" });
  return (
    <Sheet title="Monatliches Check-in" onClose={() => setModal(null)} T={T}>
      <Inp label="Monat" value={f.month} onChange={v => setF(p => ({ ...p, month: v }))} type="month" T={T} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label="Ausgaben IST" value={f.ausgaben_ist} onChange={v => setF(p => ({ ...p, ausgaben_ist: v }))} type="number" T={T} />
        <Inp label="Reserven genutzt" value={f.reserven_ist} onChange={v => setF(p => ({ ...p, reserven_ist: v }))} type="number" T={T} />
      </div>
      <Inp label="Tatsachlich investiert" value={f.sparrate_ist} onChange={v => setF(p => ({ ...p, sparrate_ist: v }))} type="number" T={T} />
      <Inp label="Notiz" value={f.note} onChange={v => setF(p => ({ ...p, note: v }))} placeholder="Besonderheiten..." T={T} />
      <Btn full color={T.green} T={T} onClick={() => {
        const ci = { id: uid(), ...f, ausgaben_ist: +f.ausgaben_ist || 0, reserven_ist: +f.reserven_ist || 0, sparrate_ist: +f.sparrate_ist || 0 };
        updArr("checkins", [...(s.checkins || []).filter(c => c.month !== f.month), ci]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
