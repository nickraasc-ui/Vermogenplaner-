import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, Row, fmtE, full, uid } from "../ui.jsx";
import { CY, BCK_CLRS } from "../../constants.js";

export default function AffordModal({ s, cf, agg, final, T, setModal, updArr }) {
  const [amt, setAmt] = useState("");
  const [type, setType] = useState("Einmalig");
  const [lbl, setLbl] = useState("");
  const amount = parseFloat(amt) || 0;
  const monthly = type === "Monatlich" ? amount : type === "Jahrlich" ? amount / 12 : 0;
  const baseEnd = final.base || 0;
  const r = agg.wavgReturn / 100;
  const rm = r / 12;
  const impact = type === "Einmalig"
    ? amount * Math.pow(1 + r, s.horizon)
    : monthly > 0 && rm > 0 ? monthly * ((Math.pow(1 + rm, s.horizon * 12) - 1) / rm) : monthly * s.horizon * 12;
  const newEnd = Math.max(0, baseEnd - impact);
  const pctI = baseEnd > 0 ? (impact / baseEnd) * 100 : 0;
  const canAfford = type === "Einmalig" || monthly <= (cf.saldo || 0);
  return (
    <Sheet title="Was kann ich mir leisten?" onClose={() => setModal(null)} T={T}>
      <Inp label="Bezeichnung" value={lbl} onChange={setLbl} placeholder="z.B. Neues Auto..." T={T} />
      <SelEl label="Typ" value={type} onChange={setType} options={["Einmalig","Monatlich","Jahrlich"]} T={T} />
      <Inp label="Betrag (EUR)" value={amt} onChange={setAmt} type="number" placeholder="0" T={T} />
      {amount > 0 && (
        <>
          <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:13, marginBottom:10 }}>
            <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Machbarkeit</div>
            {type === "Einmalig" ? (
              <div style={{ fontSize:11, color:T.textMid, lineHeight:1.7 }}>
                Aus Liquiditat ({fmtE(s.assets.filter(a => a.class === "Cash").reduce((t, a) => t + a.value, 0))}) oder {Math.ceil(amount / (cf.eff || 1))} Monate ansparen.
              </div>
            ) : (
              <>
                <Row label="Monatlicher Betrag" value={full(monthly)+"/Mo."} T={T} />
                <Row label="Aktueller Saldo" value={full(cf.saldo)+"/Mo."} type={cf.saldo >= 0 ? "in" : "out"} T={T} />
                <Row label="Neue Sparrate" value={full(cf.eff - monthly)+"/Mo."} type={cf.eff - monthly >= 0 ? "in" : "out"} T={T} />
                <div style={{ marginTop:10, background:canAfford?T.green+"15":T.red+"15", border:"1px solid "+(canAfford?T.green:T.red)+"44", borderRadius:7, padding:"9px 12px", fontSize:13, fontWeight:700, color:canAfford?T.green:T.red, textAlign:"center" }}>
                  {canAfford ? "Finanzierbar" : "Ubersteigt Saldo um "+full(monthly-(cf.saldo||0))+"/Mo."}
                </div>
              </>
            )}
          </div>
          <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:13, marginBottom:12 }}>
            <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Langfristiger Effekt ({s.horizon} J.)</div>
            <div style={{ fontSize:9, color:T.textDim, marginBottom:8 }}>Opportunitatskosten bei {agg.wavgReturn.toFixed(1)}% gew. Ø-Rendite</div>
            <Row label="Projektion ohne" value={fmtE(baseEnd)} T={T} />
            <Row label="Entgangenes Wachstum" value={"-"+fmtE(impact)} type="out" T={T} />
            <Row label="Projektion mit" value={fmtE(newEnd)} type="in" bold T={T} />
            <div style={{ marginTop:10 }}>
              <div style={{ background:T.border, borderRadius:5, overflow:"hidden", height:7, marginBottom:5 }}>
                <div style={{ height:"100%", background:T.accent, width:Math.max(2, 100-pctI)+"%", transition:"width 0.4s" }} />
              </div>
              <div style={{ fontSize:10, color:T.textLow, textAlign:"center" }}>Kostet {pctI.toFixed(1)}% des projizierten Endvermoegens</div>
            </div>
          </div>
          {lbl && <Btn full color={T.purple} T={T} onClick={() => {
            updArr("buckets", [...(s.buckets||[]), { id:uid(), name:lbl, type, amount, year:String(CY), color:BCK_CLRS[0], note:"via Affordability" }]);
            setModal(null);
          }}>Als Bucket speichern</Btn>}
        </>
      )}
    </Sheet>
  );
}
