import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, uid } from "../ui.jsx";
import { ASSET_CLASSES, LIQUIDITY_CATS, LIQUIDITY_DEFAULT, LIQ_CLR } from "../../constants.js";

export default function AssetModal({ data, s, T, setModal, updArr }) {
  const [f, setF] = useState(data || { name:"", owner:"ehemann", class:"Aktien-ETF", liquidity:"Liquide", value:"", debt:"", locked:false, note:"", loanRate:"3.5", loanTilgung:"0", loanAnnuitat:"0" });
  const handleClassChange = (cls) => { setF(p => ({ ...p, class: cls, liquidity: LIQUIDITY_DEFAULT[cls] || "Semi-liquide" })); };
  const hasDebt = (parseFloat(f.debt) || 0) > 0;
  return (
    <Sheet title={data?.id ? "Position bearbeiten" : "Position hinzufugen"} onClose={() => setModal(null)} T={T}>
      <Inp label="Bezeichnung" value={f.name} onChange={v => setF(p => ({ ...p, name: v }))} placeholder="z.B. MSCI World ETF" T={T} />
      <SelEl label="Eigentumer" value={f.owner} onChange={v => setF(p => ({ ...p, owner: v }))}
        options={[{value:"ehemann",label:"Ehemann"},{value:"ehefrau",label:"Ehefrau"},{value:"gemeinschaft",label:"Gemeinschaft"}]} T={T} />
      <SelEl label="Asset-Klasse" value={f.class} onChange={handleClassChange} options={ASSET_CLASSES} T={T} />
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {LIQUIDITY_CATS.map(l => (
          <div key={l} onClick={() => setF(p => ({ ...p, liquidity: l }))}
            style={{ flex:1, padding:"7px 4px", borderRadius:7, border:"2px solid "+(f.liquidity===l?LIQ_CLR[l]:T.border), background:f.liquidity===l?LIQ_CLR[l]+"18":"transparent", cursor:"pointer", textAlign:"center" }}>
            <div style={{ fontSize:9, fontWeight:700, color:f.liquidity===l?LIQ_CLR[l]:T.textLow }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label="Marktwert (EUR)" value={f.value} onChange={v => setF(p => ({ ...p, value: v }))} type="number" T={T} />
        <Inp label="Schulden (EUR)" value={f.debt||""} onChange={v => setF(p => ({ ...p, debt: v }))} type="number" placeholder="0" T={T} />
      </div>
      {hasDebt && (
        <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:12, marginBottom:12 }}>
          <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Darlehensdetails</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            <Inp label="Zinssatz %" value={f.loanRate} onChange={v => setF(p => ({ ...p, loanRate: v }))} type="number" T={T} />
            <Inp label="Tilgung/Mo." value={f.loanTilgung} onChange={v => setF(p => ({ ...p, loanTilgung: v }))} type="number" T={T} />
            <Inp label="Annuitat/Mo." value={f.loanAnnuitat} onChange={v => setF(p => ({ ...p, loanAnnuitat: v }))} type="number" T={T} />
          </div>
          {f.loanTilgung > 0 && f.debt > 0 && (
            <div style={{ fontSize:9, color:T.accent, marginTop:4 }}>
              Schuldenfrei in ca. {Math.ceil((parseFloat(f.debt)||0) / ((parseFloat(f.loanTilgung)||1) * 12))} Jahren
            </div>
          )}
        </div>
      )}
      <Inp label="Notiz" value={f.note} onChange={v => setF(p => ({ ...p, note: v }))} placeholder="Optional" T={T} />
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, padding:"10px 12px", background:T.surfaceHigh, borderRadius:8, border:"1px solid "+T.border }}>
        <input type="checkbox" checked={!!f.locked} onChange={e => setF(p => ({ ...p, locked: e.target.checked }))} id="lck" style={{ accentColor:T.amber, width:18, height:18 }} />
        <label htmlFor="lck" style={{ fontSize:13, color:T.textMid, cursor:"pointer" }}>Gesperrt / unumschichtbar</label>
      </div>
      <Btn full color={T.green} T={T} onClick={() => {
        const asset = { ...f, id:f.id||uid(), value:+f.value||0, debt:+f.debt||0, loanRate:+f.loanRate||0, loanTilgung:+f.loanTilgung||0, loanAnnuitat:+f.loanAnnuitat||0, liquidity:f.liquidity||"Liquide" };
        if (data?.id) updArr("assets", s.assets.map(a => a.id === asset.id ? asset : a));
        else updArr("assets", [...s.assets, asset]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
