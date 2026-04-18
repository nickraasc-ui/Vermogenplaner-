import { Sl, Tile, Row, Btn, full, mlbl } from "./ui.jsx";
import { ASSET_CLASS_DEFAULTS, ASSET_CLASSES, CY } from "../constants.js";

const ALL_INVEST_CLASSES = ASSET_CLASSES.filter(cls => cls !== "Cash" && cls !== "Immobilien" && cls !== "Forderung");

export default function TabHaushalt({ s, T, upd, updArr, setModal, cf, sparDist, ownerFilter, filteredAssets }) {
  const totalManual = ALL_INVEST_CLASSES.reduce((t, cls) => t + (s.manualSparDist[cls]||0), 0);
  const manualDiff  = cf.eff - totalManual;
  const hasImmo       = filteredAssets.some(a => a.class === "Immobilien");
  const hasForderung  = filteredAssets.some(a => a.class === "Forderung" && (a.monthlyRepayment||0) > 0);
  const hasOtherLoans = cf.otherAnnuitat > 0;
  const hasRunCosts   = cf.assetRunningCosts > 0;
  const isFiltered    = ownerFilter.length > 0;

  const forderungen   = filteredAssets.filter(a => a.class === "Forderung" && (a.monthlyRepayment||0) > 0);
  const runCostAssets = filteredAssets.filter(a => a.class !== "Immobilien" && (a.monthlyRunningCost||0) > 0);

  // Active streams in current year
  const isActive = st => CY >= (st.startsAt||CY) && (!st.endsAt || CY <= st.endsAt);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {isFiltered && (
        <div style={{ background:T.accent+"12", border:"1px solid "+T.accent+"33", borderRadius:8, padding:"7px 12px", fontSize:10, color:T.accent }}>
          Gefiltert: {ownerFilter.map(id => (s.owners||[]).find(o => o.id===id)?.label||id).join(", ")} — Einkommensströme des Eigentümers, Ausgaben bleiben global
        </div>
      )}
      {cf.rest < 0 && (
        <div style={{ background:T.red+"15", border:"1px solid "+T.red+"44", borderRadius:8, padding:"9px 13px", fontSize:11, color:T.red }}>
          Ausgaben übersteigen Einkommen um {full(Math.abs(cf.rest))}/Mo.
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <Tile label="Gesamtzufluss" value={full(cf.avail)} sub={hasImmo ? "Einkommen + Immo-CF "+full(cf.immoNetCF) : "Aus Einkommensströmen"} color={T.green} T={T} />
        <Tile label="Sparrate" value={full(cf.eff)} sub={s.autoSpar?"Auto":"Manuell"} color={T.accent} T={T} />
      </div>

      {/* Income streams */}
      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Einkommensströme</div>
            <div style={{ fontSize:9, color:T.textDim, marginTop:2 }}>Gesamt aktiv: <strong style={{ color:T.green }}>{full(cf.streamIncome)}/Mo.</strong></div>
          </div>
          <Btn sm color={T.green} T={T} onClick={() => setModal({ type:"incomeStream", data:null })}>+ Strom</Btn>
        </div>
        {(s.incomeStreams||[]).length === 0 && (
          <div style={{ fontSize:11, color:T.textDim, textAlign:"center", padding:"10px 0" }}>Noch keine Einkommensströme — bitte anlegen</div>
        )}
        {(s.incomeStreams||[]).map(st => {
          const owner  = (s.owners||[]).find(o => o.id === st.owner);
          const active = isActive(st);
          return (
            <div key={st.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", borderBottom:"1px solid "+T.border, paddingBottom:9, marginBottom:9, opacity:active?1:0.4 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{st.label}</div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:2 }}>
                  <span style={{ fontSize:8, color:T.textDim }}>{st.type}</span>
                  {owner && <span style={{ fontSize:8, color:T.accent, background:T.accent+"15", padding:"1px 5px", borderRadius:3 }}>{owner.label}</span>}
                  {(st.growthPct||0) > 0 && <span style={{ fontSize:8, color:T.green }}>+{st.growthPct}%/J.</span>}
                  {st.startsAt > CY && <span style={{ fontSize:8, color:T.amber }}>ab {st.startsAt}</span>}
                  {st.endsAt && <span style={{ fontSize:8, color:T.amber }}>bis {st.endsAt}</span>}
                  {!active && <span style={{ fontSize:8, color:T.textDim }}>inaktiv</span>}
                </div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:T.green }}>{full(st.amount)}/Mo.</div>
                <Btn sm T={T} onClick={() => setModal({ type:"incomeStream", data:st })}>edit</Btn>
                <Btn sm danger T={T} onClick={() => updArr("incomeStreams", (s.incomeStreams||[]).filter(x => x.id !== st.id))}>x</Btn>
              </div>
            </div>
          );
        })}
      </div>

      {/* Immo-CF Block */}
      {hasImmo && (
        <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Immobilien-Cashflow</div>
          <Row label="Brutto-Mieteinnahmen" value={"+" + full(cf.immoGross)} type="in" sub="Kaltmiete aller Objekte" T={T} />
          <Row label="Immo-Annuitäten" value={"-" + full(cf.immoAnnuitat)} type="out" sub="Zins + Tilgung" T={T} />
          <Row label="Nebenkosten" value={"-" + full(cf.immoRunning)} type="out" sub="Hausgeld + Grundsteuer" T={T} />
          <Row label="Netto-Immo-CF" value={(cf.immoNetCF>=0?"+":"")+full(cf.immoNetCF)} type={cf.immoNetCF>=0?"in":"warn"} bold T={T} />
        </div>
      )}

      {/* Forderungen Block */}
      {hasForderung && (
        <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Forderungen / Darlehenszuflüsse</div>
          {forderungen.map(a => (
            <Row key={a.id} label={a.name} value={"+" + full(a.monthlyRepayment)} type="in" sub="Monatl. Rückzahlung" T={T} />
          ))}
          {forderungen.length > 1 && (
            <Row label="Gesamt" value={"+" + full(cf.forderungIncome)} type="in" bold T={T} />
          )}
        </div>
      )}

      {/* Laufende Kosten Block */}
      {hasRunCosts && (
        <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Laufende Vermögenskosten</div>
          {runCostAssets.map(a => (
            <Row key={a.id} label={a.name} value={"-" + full(a.monthlyRunningCost)} type="out" sub={a.class} T={T} />
          ))}
          {runCostAssets.length > 1 && (
            <Row label="Gesamt" value={"-" + full(cf.assetRunningCosts)} type="out" bold T={T} />
          )}
        </div>
      )}

      {/* Expense streams */}
      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Ausgabenströme</div>
            <div style={{ fontSize:9, color:T.textDim, marginTop:2 }}>Gesamt aktiv: <strong style={{ color:T.red }}>{full(cf.streamExpense)}/Mo.</strong></div>
          </div>
          <Btn sm color={T.red} T={T} onClick={() => setModal({ type:"expenseStream", data:null })}>+ Strom</Btn>
        </div>
        {(s.expenseStreams||[]).length === 0 && (
          <div style={{ fontSize:11, color:T.textDim, textAlign:"center", padding:"10px 0" }}>Noch keine Ausgabenströme</div>
        )}
        {(s.expenseStreams||[]).map(st => {
          const active = isActive(st);
          return (
            <div key={st.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", borderBottom:"1px solid "+T.border, paddingBottom:9, marginBottom:9, opacity:active?1:0.4 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{st.label}</div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:2 }}>
                  <span style={{ fontSize:8, color:T.textDim }}>{st.category}</span>
                  {st.startsAt > CY && <span style={{ fontSize:8, color:T.amber }}>ab {st.startsAt}</span>}
                  {st.endsAt && <span style={{ fontSize:8, color:T.green }}>endet {st.endsAt}</span>}
                  {!active && <span style={{ fontSize:8, color:T.textDim }}>inaktiv</span>}
                </div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:T.red }}>{full(st.amount)}/Mo.</div>
                <Btn sm T={T} onClick={() => setModal({ type:"expenseStream", data:st })}>edit</Btn>
                <Btn sm danger T={T} onClick={() => updArr("expenseStreams", (s.expenseStreams||[]).filter(x => x.id !== st.id))}>x</Btn>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sparrate */}
      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:16, display:"flex", flexDirection:"column", gap:16 }}>
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Sparrate</div>
            <button onClick={() => upd({ autoSpar:!s.autoSpar })} style={{ fontSize:11, padding:"5px 12px", borderRadius:6, border:"1px solid "+(s.autoSpar?T.accent:T.border), background:s.autoSpar?T.accent+"18":"transparent", color:s.autoSpar?T.accent:T.textMid, cursor:"pointer", fontWeight:700, WebkitTapHighlightColor:"transparent" }}>
              {s.autoSpar ? "Auto" : "Manuell"}
            </button>
          </div>
          {s.autoSpar ? (
            <div style={{ background:T.surfaceHigh, borderRadius:7, padding:"11px 13px", fontSize:12, color:T.textMid, lineHeight:1.7 }}>
              {full(cf.avail)} − {full(cf.bound)} = <strong style={{ color:cf.eff>0?T.accent:T.red, fontSize:15 }}>{full(cf.eff)}/Mo.</strong>
              <div style={{ fontSize:9, color:T.textDim, marginTop:2 }}>
                Zufluss ({full(cf.streamIncome)} Einkommen{hasImmo?" + "+full(cf.immoNetCF)+" Immo":""}{hasForderung?" + "+full(cf.forderungIncome)+" Ford.":""}) − Ausgaben ({full(cf.streamExpense)} Ströme{hasOtherLoans?" + "+full(cf.otherAnnuitat)+" Kredite":""}{hasRunCosts?" + "+full(cf.assetRunningCosts)+" Kosten":""})
              </div>
            </div>
          ) : (
            <Sl label="" value={s.manuellSparrate} min={0} max={6000} step={100} onChange={v => upd({ manuellSparrate:v })} fmt={full} color={T.accent} warn={s.manuellSparrate>cf.rest} note={s.manuellSparrate>cf.rest?"Übersteigt Rest ("+full(cf.rest)+")":"Saldo: "+full(cf.saldo)+"/Mo."} T={T} />
          )}
        </div>
      </div>

      {/* Sparrate distribution */}
      {cf.eff > 0 && (
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

          {s.sparDistMode !== "manual" && sparDist.length === 0 && (
            <div style={{ background:T.amber+"12", border:"1px solid "+T.amber+"33", borderRadius:7, padding:"10px 12px", marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.amber, marginBottom:3 }}>Keine investierbaren Positionen</div>
              <div style={{ fontSize:10, color:T.textMid, lineHeight:1.5 }}>Alle Positionen sind gesperrt, Cash oder Immobilien. Wechsle zu "Manuell" oder leg eine investierbare Position an.</div>
            </div>
          )}
          {s.sparDistMode === "manual" ? (
            <>
              {ALL_INVEST_CLASSES.map(cls => (
                <div key={cls} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:ASSET_CLASS_DEFAULTS[cls]?.color||T.textMid, flexShrink:0 }} />
                  <div style={{ fontSize:10, color:T.text, flex:1 }}>{cls}</div>
                  <input type="number" value={s.manualSparDist[cls]||0}
                    onChange={e => upd({ manualSparDist:{ ...s.manualSparDist, [cls]:parseFloat(e.target.value)||0 } })}
                    style={{ width:90, background:T.bg, border:"1px solid "+T.border, borderRadius:7, padding:"7px 10px", color:T.text, fontSize:14, outline:"none", fontFamily:"inherit", WebkitAppearance:"none", textAlign:"right" }} />
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
          ) : sparDist.length > 0 ? (
            <>
              <div style={{ fontSize:9, color:T.textDim, marginBottom:8 }}>
                Proportional zur aktuellen Gewichtung der investierbaren Positionen
                {cf.eff === 0 && <span style={{ color:T.amber }}> — Sparrate 0 €/Mo.</span>}
              </div>
              {sparDist.map(({ cls, share, monthly }) => (
                <div key={cls} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, opacity:cf.eff===0?0.5:1 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:ASSET_CLASS_DEFAULTS[cls]?.color||T.textMid, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                      <span style={{ fontSize:10, color:T.textMid }}>{cls}</span>
                      <span style={{ fontSize:10, fontWeight:700, color:T.text }}>{cf.eff>0 ? full(monthly)+"/Mo." : (share*100).toFixed(0)+"% — "+full(monthly)+"/Mo."}</span>
                    </div>
                    <div style={{ background:T.border, borderRadius:3, height:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", background:ASSET_CLASS_DEFAULTS[cls]?.color||T.accent, width:(share*100)+"%" }} />
                    </div>
                  </div>
                  <span style={{ fontSize:9, color:T.textDim, width:32, textAlign:"right" }}>{(share*100).toFixed(0)}%</span>
                </div>
              ))}
            </>
          ) : null}
        </div>
      )}

      {/* Monatsübersicht */}
      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
        <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Monatsübersicht</div>
        {(s.incomeStreams||[]).filter(isActive).map(st => (
          <Row key={st.id} label={st.label} value={"+" + full(st.amount)} type="in" sub={(s.owners||[]).find(o => o.id===st.owner)?.label} T={T} />
        ))}
        {hasImmo && <Row label="Netto-Immo-CF" value={(cf.immoNetCF>=0?"+":"")+full(cf.immoNetCF)} type={cf.immoNetCF>=0?"in":"warn"} sub={full(cf.immoGross)+" Miete − "+full(cf.immoAnnuitat)+" Annuität − "+full(cf.immoRunning)+" NK"} T={T} />}
        {hasForderung && <Row label="Forderungszuflüsse" value={"+" + full(cf.forderungIncome)} type="in" T={T} />}
        <Row label="Gesamtzufluss" value={"+" + full(cf.avail)} type="in" bold T={T} />
        {(s.expenseStreams||[]).filter(isActive).map(st => (
          <Row key={st.id} label={st.label} value={"-" + full(st.amount)} type="out" sub={st.category} T={T} />
        ))}
        {hasOtherLoans && <Row label="Konsumkredite" value={"-" + full(cf.otherAnnuitat)} type="out" sub="Annuitäten non-Immo" T={T} />}
        {hasRunCosts   && <Row label="Vermögenskosten" value={"-" + full(cf.assetRunningCosts)} type="out" sub="Auto, Boot, etc." T={T} />}
        <Row label="Sparrate" value={"-" + full(cf.eff)} type="out" T={T} />
        <Row label="Monatssaldo" value={(cf.saldo>=0?"+":"")+full(cf.saldo)} type={cf.saldo>=0?"in":"warn"} bold T={T} />
      </div>

      {/* Check-in history */}
      {s.checkins?.length > 0 && (
        <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Check-in Verlauf</div>
          {[...s.checkins].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6).map(ci => {
            const dA = ci.ausgaben_ist - cf.streamExpense;
            const dS = ci.sparrate_ist - cf.eff;
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
