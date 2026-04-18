import { Sl, Tile, Row, Btn, full, mlbl } from "./ui.jsx";
import { ASSET_CLASS_DEFAULTS } from "../constants.js";

export default function TabHaushalt({ s, T, upd, updArr, setModal, cf, sparDist, totalMonthlyLoanPayment }) {
  const investableClasses = [...new Set(
    s.assets.filter(a => !a.locked && a.class !== "Cash" && a.class !== "Immobilien").map(a => a.class)
  )];
  const totalManual = investableClasses.reduce((t, cls) => t + (s.manualSparDist[cls]||0), 0);
  const manualDiff  = cf.eff - totalManual;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {cf.rest < 0 && (
        <div style={{ background:T.red+"15", border:"1px solid "+T.red+"44", borderRadius:8, padding:"9px 13px", fontSize:11, color:T.red }}>
          Ausgaben ubersteigen Einkommen um {full(Math.abs(cf.rest))}/Mo.
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <Tile label="Gesamtzufluss" value={full(cf.avail)} sub={"Netto + Immo "+full(cf.immoNetCF)} color={T.green} T={T} />
        <Tile label="Sparrate" value={full(cf.eff)} sub={s.autoSpar?"Auto":"Manuell"} color={T.accent} T={T} />
      </div>
      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:16, display:"flex", flexDirection:"column", gap:20 }}>
        <Sl label="Netto-Haushaltseinkommen/Mo." value={s.nettoGesamt} min={2000} max={25000} step={100} onChange={v => upd({ nettoGesamt:v })} fmt={full} color={T.green} T={T} />
        <Sl label="Laufende Haushaltsausgaben/Mo." value={s.ausgaben} min={500} max={8000} step={100} onChange={v => upd({ ausgaben:v })} fmt={full} color={T.red} note="Miete, Kita, Versicherungen, lfd. Kosten" T={T} />
        <Sl label="Reserven / Unregelmassiges" value={s.reservenMonthly} min={0} max={3000} step={50} onChange={v => upd({ reservenMonthly:v })} fmt={full} color={T.amber} T={T} />
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Sparrate</div>
            <button onClick={() => upd({ autoSpar:!s.autoSpar })} style={{ fontSize:11, padding:"5px 12px", borderRadius:6, border:"1px solid "+(s.autoSpar?T.accent:T.border), background:s.autoSpar?T.accent+"18":"transparent", color:s.autoSpar?T.accent:T.textMid, cursor:"pointer", fontWeight:700, WebkitTapHighlightColor:"transparent" }}>
              {s.autoSpar ? "Auto" : "Manuell"}
            </button>
          </div>
          {s.autoSpar ? (
            <div style={{ background:T.surfaceHigh, borderRadius:7, padding:"11px 13px", fontSize:12, color:T.textMid, lineHeight:1.7 }}>
              {full(cf.avail)} - {full(s.ausgaben)} - {full(s.reservenMonthly)} = <strong style={{ color:cf.eff>0?T.accent:T.red, fontSize:15 }}>{full(cf.eff)}/Mo.</strong>
            </div>
          ) : (
            <Sl label="" value={s.manuellSparrate} min={0} max={6000} step={100} onChange={v => upd({ manuellSparrate:v })} fmt={full} color={T.accent} warn={s.manuellSparrate>cf.rest} note={s.manuellSparrate>cf.rest?"Ubersteigt Rest ("+full(cf.rest)+")":"Saldo: "+full(cf.saldo)+"/Mo."} T={T} />
          )}
        </div>
      </div>

      {/* Sparrate distribution */}
      {cf.eff > 0 && investableClasses.length > 0 && (
        <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Sparraten-Verteilung</div>
              <div style={{ fontSize:9, color:T.textDim, marginTop:2 }}>{s.sparDistMode==="auto" ? "Proportional zur Gewichtung" : "Manuell je Klasse"}</div>
            </div>
            <button onClick={() => upd({ sparDistMode:s.sparDistMode==="auto"?"manual":"auto" })}
              style={{ fontSize:11, padding:"5px 12px", borderRadius:6, border:"1px solid "+(s.sparDistMode==="manual"?T.purple:T.border), background:s.sparDistMode==="manual"?T.purple+"18":"transparent", color:s.sparDistMode==="manual"?T.purple:T.textMid, cursor:"pointer", fontWeight:700, WebkitTapHighlightColor:"transparent" }}>
              {s.sparDistMode==="auto" ? "Auto" : "Manuell"}
            </button>
          </div>

          {s.sparDistMode === "manual" ? (
            <>
              {investableClasses.map(cls => (
                <div key={cls} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:ASSET_CLASS_DEFAULTS[cls]?.color||T.textMid, flexShrink:0 }} />
                  <div style={{ fontSize:10, color:T.text, flex:1 }}>{cls}</div>
                  <input
                    type="number"
                    value={s.manualSparDist[cls]||0}
                    onChange={e => upd({ manualSparDist:{ ...s.manualSparDist, [cls]:parseFloat(e.target.value)||0 } })}
                    style={{ width:90, background:T.bg, border:"1px solid "+T.border, borderRadius:7, padding:"7px 10px", color:T.text, fontSize:14, outline:"none", fontFamily:"inherit", WebkitAppearance:"none", textAlign:"right" }}
                  />
                  <span style={{ fontSize:10, color:T.textDim, width:20 }}>/Mo</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0 4px", borderTop:"1px solid "+T.border, marginTop:4 }}>
                <span style={{ fontSize:10, color:T.textMid }}>Verteilt</span>
                <div style={{ textAlign:"right" }}>
                  <span style={{ fontSize:13, fontWeight:900, color:Math.abs(manualDiff)<1?T.green:T.amber }}>{full(totalManual)}</span>
                  <span style={{ fontSize:9, color:T.textDim }}> / {full(cf.eff)}</span>
                  {Math.abs(manualDiff) >= 1 && (
                    <div style={{ fontSize:9, color:T.amber }}>{manualDiff>0?"+ "+full(manualDiff)+" offen":full(-manualDiff)+" zu viel"}</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize:9, color:T.textDim, marginBottom:10 }}>Proportional zur aktuellen Gewichtung der investierbaren Positionen</div>
              {sparDist.map(({ cls, share, monthly }) => (
                <div key={cls} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:ASSET_CLASS_DEFAULTS[cls]?.color||T.textMid, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                      <span style={{ fontSize:10, color:T.textMid }}>{cls}</span>
                      <span style={{ fontSize:10, fontWeight:700, color:T.text }}>{full(monthly)}/Mo.</span>
                    </div>
                    <div style={{ background:T.border, borderRadius:3, height:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", background:ASSET_CLASS_DEFAULTS[cls]?.color||T.accent, width:(share*100)+"%" }} />
                    </div>
                  </div>
                  <span style={{ fontSize:9, color:T.textDim, width:32, textAlign:"right" }}>{(share*100).toFixed(0)}%</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
        <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Monatsubersicht</div>
        <Row label="Netto-Einkommen" value={"+" + full(s.nettoGesamt)} type="in" T={T} />
        <Row label="Immo-Mieteinnahmen" value={"+" + full(cf.immoGross)} type="in" sub="Brutto-Kaltmiete" T={T} />
        <Row label="Darlehen Annuitat" value={"-" + full(totalMonthlyLoanPayment)} type="out" sub="Zins + Tilgung" T={T} />
        <Row label="Immo-Nebenkosten" value={"-" + full(cf.immoRunning)} type="out" sub="Hausgeld + Grundsteuer" T={T} />
        <Row label="Gesamtzufluss" value={"+" + full(cf.avail)} type="in" bold T={T} />
        <Row label="Haushaltsausgaben" value={"-" + full(s.ausgaben)} type="out" T={T} />
        <Row label="Reserven" value={"-" + full(s.reservenMonthly)} type="out" T={T} />
        <Row label="Sparrate" value={"-" + full(cf.eff)} type="out" T={T} />
        <Row label="Monatssaldo" value={(cf.saldo>=0?"+":"")+full(cf.saldo)} type={cf.saldo>=0?"in":"warn"} bold T={T} />
      </div>

      {s.checkins?.length > 0 && (
        <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Check-in Verlauf</div>
          {[...s.checkins].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6).map(ci => {
            const dA = ci.ausgaben_ist - s.ausgaben, dS = ci.sparrate_ist - cf.eff;
            return (
              <div key={ci.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid "+T.border, paddingBottom:8, marginBottom:8 }}>
                <div style={{ fontSize:11, color:T.textMid, fontWeight:600 }}>{mlbl(ci.month)}</div>
                <div style={{ display:"flex", gap:12, fontSize:10 }}>
                  <span style={{ color:dA>0?T.red:T.green }}>HH {dA>0?"+":""}{full(dA)}</span>
                  <span style={{ color:dS>=0?T.green:T.amber }}>Spar {dS>=0?"+":""}{full(dS)}</span>
                </div>
                <Btn sm danger T={T} onClick={() => updArr("checkins", s.checkins.filter(c => c.id !== ci.id))}>x</Btn>
              </div>
            );
          })}
        </div>
      )}
      <Btn full color={T.accent} T={T} onClick={() => setModal({ type:"checkin" })}>+ Monatliches Check-in</Btn>
    </div>
  );
}
