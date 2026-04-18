import { useState } from "react";
import { Sheet, Inp, Btn, full, fmtE, uid } from "../ui.jsx";
import { ASSET_CLASS_DEFAULTS } from "../../constants.js";

function computeProjection(assets, classReturns, sparrate, yearsFromNow) {
  const y = Math.max(0, yearsFromNow);
  const investable = assets.filter(a => !a.locked && a.class !== "Cash" && a.class !== "Immobilien");
  const invTotal   = investable.reduce((t, a) => t + (a.value||0), 0) || 1;

  return assets.map(a => {
    const r  = Math.max(0, (classReturns[a.class] || 5) / 100);
    const rm = r / 12;
    const mo = y * 12;

    if (a.class === "Immobilien") {
      const growR   = Math.max(0, (classReturns["Immobilien"] || 3) / 100);
      const grossFV = (a.value||0) * Math.pow(1 + growR, y);
      const remDebt = (a.loanTilgung||0) > 0
        ? Math.max(0, (a.debt||0) - (a.loanTilgung||0) * 12 * y)
        : (a.debt||0);
      return { assetId:a.id, name:a.name, class:a.class, value:Math.round(grossFV), debt:Math.round(remDebt) };
    }

    if (a.class === "Cash") {
      return { assetId:a.id, name:a.name, class:a.class, value:Math.round((a.value||0) * Math.pow(1 + r, y)), debt:0 };
    }

    const add = !a.locked ? sparrate * ((a.value||0) / invTotal) : 0;
    const fv  = rm > 0
      ? (a.value||0) * Math.pow(1+r, y) + add * ((Math.pow(1+rm, mo)-1) / rm)
      : (a.value||0) + add * mo;
    return { assetId:a.id, name:a.name, class:a.class, value:Math.round(fv), debt:0 };
  });
}

export default function SnapshotModal({ s, cf, agg, T, setModal, updArr }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [assetVals, setAssetVals] = useState(() =>
    s.assets.map(a => ({ assetId:a.id, name:a.name, class:a.class, value:a.value||0, debt:a.debt||0 }))
  );

  const handleDateChange = (d) => {
    setDate(d);
    const years = (new Date(d) - new Date()) / (365.25 * 24 * 3600 * 1000);
    setAssetVals(computeProjection(s.assets, s.classReturns, cf.eff, years));
  };

  const setVal = (assetId, field, raw) =>
    setAssetVals(prev => prev.map(a => a.assetId === assetId ? { ...a, [field]: parseFloat(raw)||0 } : a));

  const totalNet = assetVals.reduce((t, a) => t + (a.value||0) - (a.debt||0), 0);
  const isFuture = date > today;

  return (
    <Sheet title="Vermögens-Snapshot" onClose={() => setModal(null)} T={T}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label="Datum" value={date} onChange={handleDateChange} type="date" T={T} />
        <Inp label="Notiz" value={note} onChange={setNote} placeholder="z.B. Q1 2025" T={T} />
      </div>

      <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:12, marginBottom:14 }}>
        <div style={{ fontSize:9, color:T.textLow, marginBottom:3 }}>
          Nettowert {isFuture ? "hochgerechnet auf "+new Date(date).toLocaleDateString("de-DE") : "erfasst"}
        </div>
        <div style={{ fontSize:22, fontWeight:900, color:T.accent }}>{full(totalNet)}</div>
        <div style={{ fontSize:9, color:T.textDim, marginTop:2 }}>aktuell: {full(agg.net)}</div>
      </div>

      <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
        Werte pro Position {isFuture && <span style={{ color:T.amber }}>— hochgerechnet, bitte prüfen</span>}
      </div>

      {assetVals.map(av => {
        const isImmo = av.class === "Immobilien";
        const net    = (av.value||0) - (av.debt||0);
        const color  = ASSET_CLASS_DEFAULTS[av.class]?.color || T.textMid;
        return (
          <div key={av.assetId} style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:color, flexShrink:0 }} />
              <div style={{ fontSize:11, fontWeight:700, color:T.text }}>{av.name}</div>
              <div style={{ fontSize:9, color:T.textDim }}>{av.class}</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:isImmo?"1fr 1fr":"1fr", gap:8 }}>
              <Inp label="Marktwert (EUR)" value={String(av.value)} onChange={v => setVal(av.assetId,"value",v)} type="number" T={T} />
              {isImmo && <Inp label="Restschuld (EUR)" value={String(av.debt)} onChange={v => setVal(av.assetId,"debt",v)} type="number" T={T} />}
            </div>
            {isImmo && <div style={{ fontSize:9, color:T.green, marginTop:2 }}>Netto: {full(net)}</div>}
          </div>
        );
      })}

      <Btn full color={T.green} T={T} onClick={() => {
        updArr("snapshots", [...(s.snapshots||[]), { id:uid(), date, note, totalNet, assetValues:assetVals }]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
