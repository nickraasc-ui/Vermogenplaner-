import { useState } from "react";
import { Sheet, Inp, Btn, full, uid } from "../ui.jsx";
import { ASSET_CLASS_DEFAULTS } from "../../constants.js";
import { deriveAll } from "../../model/derive.js";

// Values for a future date come from the main projection (base scenario, all owners)
function projectedValues(s, yearsFromNow) {
  const { projection } = deriveAll(s);
  const y = Math.min(projection.length - 1, Math.max(0, Math.round(yearsFromNow)));
  const bd = projection[y].breakdown;
  return {
    assetVals: [
      ...s.assets.map(a => ({ assetId:a.id, name:a.name, class:a.class,
        value: Math.round(bd.values[a.id] ?? a.value ?? 0), debt: Math.round(bd.debts[a.id] ?? 0) })),
      // savings invested in classes without a position today
      ...Object.keys(bd.values).filter(id => id.startsWith("virtual:")).map(id => ({
        assetId:id, name:"Neue Sparanlage "+id.slice(8), class:id.slice(8), value: Math.round(bd.values[id]), debt:0 })),
    ],
    standaloneDebt: Math.round(bd.standaloneDebt || 0),
  };
}

export default function SnapshotModal({ s, cf, agg, T, setModal, updArr }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const todayVals = () => ({
    assetVals: s.assets.map(a => ({ assetId:a.id, name:a.name, class:a.class, value:a.value||0, debt:a.debt||0 })),
    standaloneDebt: (s.standaloneLoans||[]).reduce((t, l) => t + (l.debt||0), 0),
  });
  const [assetVals, setAssetVals] = useState(() => todayVals().assetVals);
  const [standaloneDebt, setStandaloneDebt] = useState(() => todayVals().standaloneDebt);

  const handleDateChange = (d) => {
    setDate(d);
    const years = (new Date(d) - new Date()) / (365.25 * 24 * 3600 * 1000);
    const v = years > 0 ? projectedValues(s, years) : todayVals();
    setAssetVals(v.assetVals);
    setStandaloneDebt(v.standaloneDebt);
  };

  const setVal = (assetId, field, raw) =>
    setAssetVals(prev => prev.map(a => a.assetId === assetId ? { ...a, [field]: parseFloat(raw)||0 } : a));

  // Net worth like the header: positions − their loans − standalone loans
  const totalNet = assetVals.reduce((t, a) => t + (a.value||0) - (a.debt||0), 0) - standaloneDebt;
  const isFuture = date > today;

  return (
    <Sheet title="Vermögens-Snapshot" onClose={() => setModal(null)} T={T}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label="Datum" value={date} onChange={handleDateChange} type="date" T={T} />
        <Inp label="Notiz" value={note} onChange={setNote} placeholder="z.B. Q1 2025" T={T} />
      </div>

      <div style={{ background:"transparent", border:"1px solid "+T.border, borderRadius:16, padding:12, marginBottom:14 }}>
        <div style={{ fontSize:11, color:T.textLow, marginBottom:3 }}>
          Nettowert {isFuture ? "hochgerechnet auf "+new Date(date).toLocaleDateString("de-DE") : "erfasst"}
        </div>
        <div style={{ fontSize:22, fontWeight:650, color:T.accent }}>{full(totalNet)}</div>
        <div style={{ fontSize:13, color:T.textMid, marginTop:2 }}>aktuell: {full(agg.net)}</div>
      </div>

      <div style={{ fontSize:11, color:T.textMid, fontWeight:600, letterSpacing:0, marginBottom:8 }}>
        Werte pro Position {isFuture && <span style={{ color:T.amber }}>— hochgerechnet, bitte prüfen</span>}
      </div>

      {assetVals.map(av => {
        const isImmo = av.class === "Immobilien" || (av.debt||0) > 0;
        const net    = (av.value||0) - (av.debt||0);
        const color  = ASSET_CLASS_DEFAULTS[av.class]?.color || T.textMid;
        return (
          <div key={av.assetId} style={{ background:"transparent", border:"1px solid "+T.border, borderRadius:16, padding:"10px 12px", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:color, flexShrink:0 }} />
              <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{av.name}</div>
              <div style={{ fontSize:11, color:T.textDim }}>{av.class}</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:isImmo?"1fr 1fr":"1fr", gap:8 }}>
              <Inp label="Marktwert (EUR)" value={String(av.value)} onChange={v => setVal(av.assetId,"value",v)} type="number" T={T} />
              {isImmo && <Inp label="Restschuld (EUR)" value={String(av.debt)} onChange={v => setVal(av.assetId,"debt",v)} type="number" T={T} />}
            </div>
            {isImmo && <div style={{ fontSize:11, color:T.green, marginTop:2 }}>Netto: {full(net)}</div>}
          </div>
        );
      })}

      <Btn full color={T.green} T={T} onClick={() => {
        updArr("snapshots", [...(s.snapshots||[]), { id:uid(), date, note, totalNet, standaloneDebt, assetValues:assetVals }]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
