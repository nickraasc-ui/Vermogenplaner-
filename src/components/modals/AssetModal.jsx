import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, full, uid } from "../ui.jsx";
import { ASSET_CLASSES, LIQUIDITY_CATS, LIQUIDITY_DEFAULT, LIQ_CLR, IMMO_CF_GROSS, IMMO_HAUSGELD, IMMO_GRUNDSTEUER } from "../../constants.js";

export default function AssetModal({ data, s, T, setModal, updArr }) {
  const owners = s.owners || [];
  const [f, setF] = useState(data || {
    name:"", owner:owners[0]?.id||"ehemann", class:"Aktien-ETF", liquidity:"Liquide",
    value:"", debt:"", locked:false, note:"",
    loanRate:"3.5", loanTilgung:"0", loanAnnuitat:"0",
    monthlyRent:"", hausgeld:"", grundsteuer:"",
    monthlyRepayment:"", monthlyRunningCost:"",
  });
  const set = (patch) => setF(p => ({ ...p, ...patch }));
  const handleClassChange = (cls) => { set({ class:cls, liquidity:LIQUIDITY_DEFAULT[cls]||"Semi-liquide" }); };

  const hasDebt  = (parseFloat(f.debt)||0) > 0;
  const isImmo   = f.class === "Immobilien";
  const isFord   = f.class === "Forderung";
  const isSonst  = f.class === "Sonstiges";
  const showRunningCost = !isImmo && !isFord && ((f.monthlyRunningCost||"") !== "" || isSonst);

  const immoNetCF  = isImmo ? (parseFloat(f.monthlyRent)||0) - (parseFloat(f.hausgeld)||0) - (parseFloat(f.grundsteuer)||0) - (parseFloat(f.loanAnnuitat)||0) : 0;
  const fordPrincipal = isFord && (parseFloat(f.monthlyRepayment)||0) > 0 && (parseFloat(f.loanRate)||0) > 0
    ? (parseFloat(f.monthlyRepayment)||0) - (parseFloat(f.value)||0) * (parseFloat(f.loanRate)||0) / 1200
    : null;

  return (
    <Sheet title={data?.id ? "Position bearbeiten" : "Position hinzufugen"} onClose={() => setModal(null)} T={T}>
      <Inp label="Bezeichnung" value={f.name} onChange={v => set({ name:v })} placeholder="z.B. MSCI World ETF" T={T} />
      <SelEl label="Eigentumer" value={f.owner} onChange={v => set({ owner:v })}
        options={owners.map(o => ({ value:o.id, label:o.label }))} T={T} />
      <SelEl label="Asset-Klasse" value={f.class} onChange={handleClassChange} options={ASSET_CLASSES} T={T} />
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {LIQUIDITY_CATS.map(l => (
          <div key={l} onClick={() => set({ liquidity:l })}
            style={{ flex:1, padding:"7px 4px", borderRadius:7, border:"2px solid "+(f.liquidity===l?LIQ_CLR[l]:T.border), background:f.liquidity===l?LIQ_CLR[l]+"18":"transparent", cursor:"pointer", textAlign:"center" }}>
            <div style={{ fontSize:9, fontWeight:700, color:f.liquidity===l?LIQ_CLR[l]:T.textLow }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label={isFord ? "Ausstehend (EUR)" : "Marktwert (EUR)"} value={f.value} onChange={v => set({ value:v })} type="number" T={T} />
        {!isFord && <Inp label="Schulden (EUR)" value={f.debt||""} onChange={v => set({ debt:v })} type="number" placeholder="0" T={T} />}
      </div>

      {/* Immobilien: Mieteinnahmen & Nebenkosten */}
      {isImmo && (
        <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:12, marginBottom:12 }}>
          <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Mieteinnahmen & Nebenkosten</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            <Inp label="Kaltmiete/Mo." value={f.monthlyRent} onChange={v => set({ monthlyRent:v })} type="number" placeholder={String(IMMO_CF_GROSS)} T={T} />
            <Inp label="Hausgeld/Mo." value={f.hausgeld} onChange={v => set({ hausgeld:v })} type="number" placeholder={String(IMMO_HAUSGELD)} T={T} />
            <Inp label="Grundsteuer/Mo." value={f.grundsteuer} onChange={v => set({ grundsteuer:v })} type="number" placeholder={String(IMMO_GRUNDSTEUER)} T={T} />
          </div>
          <div style={{ fontSize:9, color:immoNetCF>=0?T.green:T.red, marginTop:6 }}>
            Netto-CF vor Annuitat: {full((parseFloat(f.monthlyRent)||0) - (parseFloat(f.hausgeld)||0) - (parseFloat(f.grundsteuer)||0))}/Mo.
            {hasDebt && <span> | nach Annuitat: {full(immoNetCF)}/Mo.</span>}
          </div>
        </div>
      )}

      {/* Forderung: Darlehensvergabe */}
      {isFord && (
        <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:12, marginBottom:12 }}>
          <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Darlehensvergabe</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <Inp label="Zinssatz %" value={f.loanRate} onChange={v => set({ loanRate:v })} type="number" T={T} />
            <Inp label="Ruckzahlung/Mo." value={f.monthlyRepayment} onChange={v => set({ monthlyRepayment:v })} type="number" placeholder="0" T={T} />
          </div>
          {(parseFloat(f.monthlyRepayment)||0) > 0 && (
            <div style={{ fontSize:9, color:T.green, marginTop:6 }}>
              Monatlicher Zufluss: {full(parseFloat(f.monthlyRepayment)||0)}/Mo.
              {fordPrincipal !== null && fordPrincipal > 0 && (
                <span style={{ color:T.textDim }}> ({full(fordPrincipal)}/Mo. Tilgung)</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Darlehensdetails (fur Immobilien und andere mit Schulden) */}
      {hasDebt && !isFord && (
        <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:12, marginBottom:12 }}>
          <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Darlehensdetails</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            <Inp label="Zinssatz %" value={f.loanRate} onChange={v => set({ loanRate:v })} type="number" T={T} />
            <Inp label="Tilgung/Mo." value={f.loanTilgung} onChange={v => set({ loanTilgung:v })} type="number" T={T} />
            <Inp label="Annuitat/Mo." value={f.loanAnnuitat} onChange={v => set({ loanAnnuitat:v })} type="number" T={T} />
          </div>
          {(parseFloat(f.loanTilgung)||0) > 0 && (parseFloat(f.debt)||0) > 0 && (
            <div style={{ fontSize:9, color:T.accent, marginTop:4 }}>
              Schuldenfrei in ca. {Math.ceil((parseFloat(f.debt)||0)/((parseFloat(f.loanTilgung)||1)*12))} Jahren
            </div>
          )}
        </div>
      )}

      {/* Laufende Kosten (Sonstiges / alle non-Immo, non-Forderung) */}
      {!isImmo && !isFord && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Inp label="Lfd. Kosten/Mo." value={f.monthlyRunningCost||""} onChange={v => set({ monthlyRunningCost:v })} type="number" placeholder="0 (opt.)" T={T} />
          <div />
        </div>
      )}

      <Inp label="Notiz" value={f.note} onChange={v => set({ note:v })} placeholder="Optional" T={T} />
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, padding:"10px 12px", background:T.surfaceHigh, borderRadius:8, border:"1px solid "+T.border }}>
        <input type="checkbox" checked={!!f.locked} onChange={e => set({ locked:e.target.checked })} id="lck" style={{ accentColor:T.amber, width:18, height:18 }} />
        <label htmlFor="lck" style={{ fontSize:13, color:T.textMid, cursor:"pointer" }}>Gesperrt / unumschichtbar</label>
      </div>
      <Btn full color={T.green} T={T} onClick={() => {
        const asset = {
          ...f, id:f.id||uid(),
          value:+f.value||0, debt:+f.debt||0,
          loanRate:+f.loanRate||0, loanTilgung:+f.loanTilgung||0, loanAnnuitat:+f.loanAnnuitat||0,
          liquidity:f.liquidity||"Liquide",
          monthlyRent:+f.monthlyRent||0, hausgeld:+f.hausgeld||0, grundsteuer:+f.grundsteuer||0,
          monthlyRepayment:+f.monthlyRepayment||0, monthlyRunningCost:+f.monthlyRunningCost||0,
        };
        if (data?.id) updArr("assets", s.assets.map(a => a.id===asset.id ? asset : a));
        else updArr("assets", [...s.assets, asset]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
