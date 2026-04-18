import { useState } from "react";
import { Sheet, Inp, Btn, full, uid } from "../ui.jsx";

export default function SnapshotModal({ agg, s, T, setModal, updArr }) {
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), networth: String(agg.net), note: "" });
  return (
    <Sheet title="Nettowert-Snapshot" onClose={() => setModal(null)} T={T}>
      <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:12, marginBottom:14 }}>
        <div style={{ fontSize:9, color:T.textLow, marginBottom:3 }}>Aktueller Nettowert</div>
        <div style={{ fontSize:22, fontWeight:900, color:T.accent }}>{full(agg.net)}</div>
      </div>
      <Inp label="Datum" value={f.date} onChange={v => setF(p => ({ ...p, date: v }))} type="date" T={T} />
      <Inp label="Nettovermogen (EUR)" value={f.networth} onChange={v => setF(p => ({ ...p, networth: v }))} type="number" T={T} />
      <Inp label="Notiz" value={f.note} onChange={v => setF(p => ({ ...p, note: v }))} placeholder="z.B. Q1 Rebalancing" T={T} />
      <Btn full color={T.green} T={T} onClick={() => {
        updArr("snapshots", [...(s.snapshots || []), { id: uid(), date: f.date, value: +f.networth || 0, note: f.note }]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
