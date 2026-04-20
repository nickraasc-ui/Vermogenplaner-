import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Sl, Tile, Row, Btn, full, mlbl, ChTip } from "./ui.jsx";
import { ASSET_CLASS_DEFAULTS, ASSET_CLASSES, CY } from "../constants.js";

const ALL_INVEST_CLASSES = ASSET_CLASSES.filter(cls => cls !== "Cash" && cls !== "Immobilien" && cls !== "Forderung");

export default function TabHaushalt({ s, T, upd, updArr, setModal, cf, sparDist, ownerFilter, filteredAssets, cashflowProjection }) {
  const [selectedYear, setSelectedYear] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [annualView, setAnnualView] = useState(false);
  const vm = annualView ? 12 : 1;

  const totalManual = ALL_INVEST_CLASSES.reduce((t, cls) => t + (s.manualSparDist[cls]||0), 0);
  const manualDiff  = cf.eff - totalManual;
  const hasImmo       = filteredAssets.some(a => a.class === "Immobilien");
  const hasForderung  = filteredAssets.some(a => a.class === "Forderung" && (a.monthlyRepayment||0) > 0);
  const hasOtherLoans = cf.otherAnnuitat > 0;
  const hasRunCosts   = cf.assetRunningCosts > 0;
  const hasYield      = filteredAssets.some(a => (a.yieldPct||0) > 0 && a.class !== "Immobilien" && a.class !== "Forderung");
  const isFiltered    = ownerFilter.length > 0;
  const forderungen   = filteredAssets.filter(a => a.class === "Forderung" && (a.monthlyRepayment||0) > 0);
  const runCostAssets = filteredAssets.filter(a => a.class !== "Immobilien" && (a.monthlyRunningCost||0) > 0);
  const yieldAssets   = filteredAssets.filter(a => (a.yieldPct||0) > 0 && a.class !== "Immobilien" && a.class !== "Forderung");
  const currentAge    = CY - (s.birthYear || CY - 35);

  // Selected year derived values
  const selAbsYear  = CY + selectedYear;
  const selAge      = currentAge + selectedYear;
  const selCF       = cashflowProjection?.[selectedYear] || {};
  const isCurrent   = selectedYear === 0;
  const selCheckin  = (s.checkins||[]).find(ci => ci.month?.startsWith(String(selAbsYear)));

  // Per-stream amounts for the selected year
  const selIncStreams = (s.incomeStreams||[]).map(st => {
    const active = selAbsYear >= (st.startsAt||CY) && (!st.endsAt || selAbsYear <= st.endsAt);
    const amt    = active ? (st.amount||0) * Math.pow(1+(st.growthPct||0)/100, Math.max(0, selAbsYear-(st.startsAt||CY))) : 0;
    return { ...st, active, amt };
  });
  const selExpStreams = (s.expenseStreams||[]).map(st => ({
    ...st,
    active: selAbsYear >= (st.startsAt||CY) && (!st.endsAt || selAbsYear <= st.endsAt),
  }));

  // Helpers
  const isActiveNow = st => CY >= (st.startsAt||CY) && (!st.endsAt || CY <= st.endsAt);
  const val = (cur, fut) => isCurrent ? cur : fut;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* Warnings */}
      {isFiltered && (
        <div style={{ background:T.accent+"12", border:"1px solid "+T.accent+"33", borderRadius:8, padding:"7px 12px", fontSize:10, color:T.accent }}>
          Gefiltert: {ownerFilter.map(id => (s.owners||[]).find(o => o.id===id)?.label||id).join(", ")} — Einnahmen- und Ausgabenströme des Eigentümers
        </div>
      )}
      {cf.rest < 0 && isCurrent && (
        <div style={{ background:T.red+"15", border:"1px solid "+T.red+"44", borderRadius:8, padding:"9px 13px", fontSize:11, color:T.red }}>
          Ausgaben übersteigen Einkommen um {full(Math.abs(cf.rest) * vm)}/{annualView?"J.":"Mo."} — Portfolioentnahme nötig
        </div>
      )}

      {/* Haushaltspuffer status */}
      {cf.bufferBalance > 0 && isCurrent && (
        <div style={{ background:T.surface, border:"1px solid "+T.green+"44", borderRadius:10, padding:"11px 14px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:9, color:T.green, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Haushaltspuffer</div>
              <div style={{ fontSize:15, fontWeight:900, color:T.text, marginTop:2 }}>{full(cf.bufferBalance * vm)}</div>
              {cf.bound > 0 && (
                <div style={{ fontSize:9, color:T.textDim, marginTop:1 }}>
                  {(cf.bufferBalance / cf.bound).toFixed(1)} Monatsausgaben Deckung
                </div>
              )}
            </div>
            {cf.bufferContribMonthly > 0 && (
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:9, color:T.textDim }}>Monatl. Zufluss</div>
                <div style={{ fontSize:13, fontWeight:700, color:T.green }}>+{full(cf.bufferContribMonthly * vm)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AUSWERTUNG ── */}

      {/* Tiles */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <Tile label="Gesamtzufluss" value={full(val(cf.avail, selCF.avail||0) * vm)}
          sub={(isCurrent ? "Heute" : `${selAbsYear} · Alter ${selAge}`)+(annualView?" · p.a.":"/Mo.")} color={T.green} T={T} />
        <Tile label="Sparrate" value={full(val(cf.eff, selCF.sp||0) * vm)}
          sub={(s.autoSpar ? "Auto" : "Manuell")+(annualView?" · p.a.":"/Mo.")} color={T.accent} T={T} />
      </div>

      {/* Cashflow-Vorschau chart */}
      {cashflowProjection?.length > 1 && (
        <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Cashflow-Vorschau</div>
          <div style={{ fontSize:9, color:T.textDim, marginBottom:10 }}>Tippe auf ein Jahr für die Monatsübersicht dieses Jahres</div>

          <ResponsiveContainer width="100%" height={170}>
            <AreaChart
              data={cashflowProjection}
              margin={{ top:4, right:8, left:0, bottom:0 }}
              onClick={d => { if (d?.activeTooltipIndex !== undefined) setSelectedYear(d.activeTooltipIndex); }}
              style={{ cursor:"pointer" }}
            >
              <defs>
                {[["cfInc", T.green], ["cfBound", T.red], ["cfSp", T.accent]].map(([id, c]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={c} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="age" tick={{ fill:T.textLow, fontSize:9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:T.textLow, fontSize:9 }} tickFormatter={v => full(v)} width={52} axisLine={false} tickLine={false} />
              <Tooltip content={props => <ChTip {...props} T={T} />} />
              <ReferenceLine x={selAge} stroke={T.accent} strokeWidth={2} strokeDasharray="5 3" label={{ value: selAbsYear, fill:T.accent, fontSize:9, position:"top" }} />
              {(s.checkins||[]).map(ci => {
                const ciAge = currentAge + (parseInt(ci.month?.slice(0,4),10)||CY) - CY;
                return <ReferenceLine key={ci.id} x={ciAge} stroke={T.textMid} strokeWidth={1} strokeDasharray="2 3" />;
              })}
              <Area type="monotone" dataKey="avail" name="Einnahmen" stroke={T.green}  fill="url(#cfInc)"   strokeWidth={2}   dot={false} />
              <Area type="monotone" dataKey="bound" name="Ausgaben"  stroke={T.red}    fill="url(#cfBound)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="sp"    name="Sparrate"  stroke={T.accent} fill="url(#cfSp)"    strokeWidth={2}   dot={false} />
            </AreaChart>
          </ResponsiveContainer>

          <div style={{ marginTop:8 }}>
            <Sl label="" value={selectedYear} min={0} max={s.horizon||35} step={1}
              onChange={v => setSelectedYear(v)}
              fmt={v => `${CY+v} · Alter ${currentAge+v}`}
              color={T.accent} T={T} />
          </div>
        </div>
      )}

      {/* Monatsübersicht — dynamic based on selectedYear */}
      <div style={{ background:T.surface, border:"1px solid "+(isCurrent ? T.border : T.accent+"55"), borderRadius:10, padding:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>{annualView ? "Jahresübersicht" : "Monatsübersicht"}</div>
              <button onClick={() => setAnnualView(v => !v)}
                style={{ fontSize:8, padding:"2px 8px", borderRadius:5, border:"1px solid "+(annualView?T.amber:T.border), background:annualView?T.amber+"18":"transparent", color:annualView?T.amber:T.textMid, cursor:"pointer", fontWeight:700, WebkitTapHighlightColor:"transparent" }}>
                {annualView ? "p.a." : "pro Monat"}
              </button>
            </div>
            {!isCurrent && (
              <div style={{ fontSize:9, color:T.accent, marginTop:2, fontWeight:700 }}>
                Prognose {selAbsYear} · Alter {selAge}
                {selCF.otherAnnu === 0 && (cf.otherAnnuitat||0) > 0 && <span style={{ color:T.green, marginLeft:6 }}>· Kredite abbezahlt</span>}
              </div>
            )}
          </div>
          {!isCurrent && (
            <button onClick={() => setModal({ type:"checkin", year: selAbsYear })}
              style={{ padding:"5px 10px", borderRadius:6, border:"1px solid "+T.accent+"44", background:T.accent+"15", color:T.accent, cursor:"pointer", fontSize:10, fontWeight:700, WebkitTapHighlightColor:"transparent", flexShrink:0 }}>
              {selCheckin ? "IST bearbeiten" : "+ IST erfassen"}
            </button>
          )}
        </div>

        {/* Income streams */}
        {(isCurrent ? (s.incomeStreams||[]).filter(isActiveNow) : selIncStreams.filter(st => st.active)).map(st => (
          <Row key={st.id} label={st.label}
            value={"+" + full((isCurrent ? st.amount : st.amt) * vm)}
            type="in"
            sub={[(s.owners||[]).find(o => o.id===st.owner)?.label, !isCurrent && (st.growthPct||0)>0 ? `+${st.growthPct}%/J.` : ""].filter(Boolean).join(" · ")}
            T={T} />
        ))}

        {/* Immo */}
        {val(hasImmo, (selCF.immoGross||0) > 0) && (
          <Row label="Netto-Immo-CF"
            value={(val(cf.immoNetCF, selCF.immoNetCF)>=0?"+":"")+full(val(cf.immoNetCF, selCF.immoNetCF)*vm)}
            type={val(cf.immoNetCF, selCF.immoNetCF)>=0?"in":"warn"}
            sub={full(val(cf.immoGross, selCF.immoGross)*vm)+" Miete − "+full(val(cf.immoAnnuitat, selCF.immoAnnu)*vm)+" Annuität"+((!isCurrent && selCF.immoAnnu===0&&cf.immoAnnuitat>0)?" (abbezahlt)":"")}
            T={T} />
        )}

        {/* Forderungen */}
        {val(hasForderung, (selCF.fordInc||0) > 0) && (
          <Row label="Forderungszuflüsse" value={"+" + full(val(cf.forderungIncome, selCF.fordInc)*vm)} type="in" T={T} />
        )}

        {/* Asset yield */}
        {val(hasYield, (selCF.assetYield||0) > 0) && (
          <Row label="Kapitalerträge" value={"+" + full(val(cf.assetYieldIncome, selCF.assetYield)*vm)} type="in" sub="Dividenden, Kupons" T={T} />
        )}

        <Row label="Gesamtzufluss" value={"+" + full(val(cf.avail, selCF.avail)*vm)} type="in" bold T={T} />

        {/* Expense streams */}
        {(isCurrent ? (s.expenseStreams||[]).filter(isActiveNow) : selExpStreams.filter(st => st.active)).map(st => (
          <Row key={st.id} label={st.label} value={"-" + full(st.amount*vm)}
            type={st.isBufferContribution ? "in" : "out"}
            sub={[st.isBufferContribution ? "→ Puffer" : st.category, (s.owners||[]).find(o => o.id===st.owner)?.label].filter(Boolean).join(" · ")} T={T} />
        ))}

        {/* Loan payments */}
        {val(hasOtherLoans, (selCF.otherAnnu||0) > 0) && (
          <Row label="Kreditraten" value={"-" + full(val(cf.otherAnnuitat, selCF.otherAnnu)*vm)} type="out" sub="Non-Immo Annuitäten" T={T} />
        )}

        {/* Running costs */}
        {val(hasRunCosts, (selCF.runCosts||0) > 0) && (
          <Row label="Vermögenskosten" value={"-" + full(val(cf.assetRunningCosts, selCF.runCosts)*vm)} type="out" sub="Laufende Kosten" T={T} />
        )}

        {/* Active finanziert scenario payments */}
        {isCurrent && (cf.scnFinancedItems||[]).map(b => (
          <Row key={b.id} label={b.name||"Finanziert"} value={"-" + full((+b.monthlyPayment||0)*vm)} type="out" sub="Szenario · Finanzierung" T={T} />
        ))}

        <Row label="Sparrate" value={"-" + full(val(cf.eff, selCF.sp)*vm)} type="out"
          sub={isCurrent && (cf.scnSpItems||[]).length > 0
            ? (cf.scnSpItems||[]).map(b => `${(+b.delta||0)>=0?"+":""}${full((+b.delta||0)*vm)} ${b.name||""}`).join(" · ")
            : undefined}
          T={T} />

        {isCurrent && cf.deficitMonthly > 0 && (
          <Row label="Portfolioentnahme" value={"-" + full(cf.deficitMonthly*vm)} type="warn"
            sub="Ausgaben übersteigen Einkommen — Vermögen wird belastet" T={T} />
        )}

        {isCurrent && (
          <Row label={annualView?"Jahressaldo":"Monatssaldo"} value={(cf.saldo>=0?"+":"")+full(cf.saldo*vm)} type={cf.saldo>=0?"in":"warn"} bold T={T} />
        )}

        {/* IST-Daten overlay if check-in exists for selected year */}
        {selCheckin && !isCurrent && (
          <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid "+T.border }}>
            <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>IST-Daten {mlbl(selCheckin.month)}</div>
            {[
              ["Einnahmen", selCheckin.inc_ist, selCF.avail, T.green, false],
              ["Ausgaben",  selCheckin.streamExp_ist ?? selCheckin.ausgaben_ist, selCF.bound, T.red, true],
              ["Sparrate",  selCheckin.sparrate_ist, selCF.sp, T.accent, false],
            ].filter(([,ist]) => ist != null && ist !== "").map(([label, ist, proj, color, invertDelta]) => {
              const delta = (+ist||0) - (proj||0);
              const good  = invertDelta ? delta <= 0 : delta >= 0;
              return (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                  <span style={{ fontSize:10, color:T.textMid }}>{label} IST</span>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:12, fontWeight:800, color }}>{full((+ist||0)*vm)}</span>
                    {Math.abs(delta) > 1 && (
                      <span style={{ fontSize:9, color:good?T.green:T.red }}>{delta>0?"+":""}{full(delta*vm)}</span>
                    )}
                  </div>
                </div>
              );
            })}
            {selCheckin.note && <div style={{ fontSize:9, color:T.textDim, marginTop:4 }}>Notiz: {selCheckin.note}</div>}
          </div>
        )}
      </div>

      {/* ── KONFIGURATION ── */}
      <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", padding:"4px 2px" }}>Konfiguration</div>

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
          const active = isActiveNow(st);
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
          const active = isActiveNow(st);
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
      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Sparrate</div>
          <button onClick={() => upd({ autoSpar:!s.autoSpar })}
            style={{ fontSize:11, padding:"5px 12px", borderRadius:6, border:"1px solid "+(s.autoSpar?T.accent:T.border), background:s.autoSpar?T.accent+"18":"transparent", color:s.autoSpar?T.accent:T.textMid, cursor:"pointer", fontWeight:700, WebkitTapHighlightColor:"transparent" }}>
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
          <Sl label="" value={s.manuellSparrate} min={0} max={6000} step={100}
            onChange={v => upd({ manuellSparrate:v })} fmt={full} color={T.accent}
            warn={s.manuellSparrate>cf.rest}
            note={s.manuellSparrate>cf.rest ? "Übersteigt Rest ("+full(cf.rest)+")" : "Saldo: "+full(cf.saldo)+"/Mo."}
            T={T} />
        )}
      </div>

      {/* Sparraten-Verteilung */}
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
              <div style={{ fontSize:9, color:T.textDim, marginBottom:8 }}>Proportional zur aktuellen Gewichtung der investierbaren Positionen</div>
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
          ) : (
            <div style={{ background:T.amber+"12", border:"1px solid "+T.amber+"33", borderRadius:7, padding:"10px 12px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.amber, marginBottom:3 }}>Keine investierbaren Positionen</div>
              <div style={{ fontSize:10, color:T.textMid, lineHeight:1.5 }}>Wechsle zu "Manuell" oder leg eine investierbare Position an.</div>
            </div>
          )}
        </div>
      )}

      {/* Details: Immo / Erträge / Kosten (collapsible) */}
      {(hasImmo || hasForderung || hasYield || hasRunCosts) && (
        <div>
          <button onClick={() => setDetailsOpen(!detailsOpen)}
            style={{ width:"100%", background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:"10px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", WebkitTapHighlightColor:"transparent" }}>
            <span style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Details: Immo / Erträge / Kosten</span>
            <span style={{ fontSize:11, color:T.textMid }}>{detailsOpen ? "▲" : "▼"}</span>
          </button>
          {detailsOpen && (
            <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:8 }}>
              {hasImmo && (
                <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Immobilien-Cashflow</div>
                  <Row label="Brutto-Mieteinnahmen" value={"+" + full(cf.immoGross)} type="in" sub="Kaltmiete aller Objekte" T={T} />
                  <Row label="Immo-Annuitäten" value={"-" + full(cf.immoAnnuitat)} type="out" sub="Zins + Tilgung" T={T} />
                  <Row label="Nebenkosten" value={"-" + full(cf.immoRunning)} type="out" sub="Hausgeld + Grundsteuer" T={T} />
                  <Row label="Netto-Immo-CF" value={(cf.immoNetCF>=0?"+":"")+full(cf.immoNetCF)} type={cf.immoNetCF>=0?"in":"warn"} bold T={T} />
                </div>
              )}
              {hasForderung && (
                <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Forderungen / Darlehenszuflüsse</div>
                  {forderungen.map(a => (
                    <Row key={a.id} label={a.name} value={"+" + full(a.monthlyRepayment)} type="in" sub="Monatl. Rückzahlung" T={T} />
                  ))}
                </div>
              )}
              {hasYield && (
                <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Kapitalerträge / Ausschüttungen</div>
                  {yieldAssets.map(a => {
                    const monthly = (a.value||0) * (a.yieldPct||0) / 100 / 12;
                    return <Row key={a.id} label={a.name} value={"+" + full(monthly)} type="in" sub={a.yieldPct+"% · "+a.class} T={T} />;
                  })}
                </div>
              )}
              {hasRunCosts && (
                <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Laufende Vermögenskosten</div>
                  {runCostAssets.map(a => (
                    <Row key={a.id} label={a.name} value={"-" + full(a.monthlyRunningCost)} type="out" sub={a.class} T={T} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── VERLAUF ── */}
      {s.checkins?.length > 0 && (
        <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Check-in Verlauf</div>
          {[...s.checkins].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 8).map(ci => {
            const dS = (ci.sparrate_ist||0) - cf.eff;
            const dA = (ci.streamExp_ist ?? ci.ausgaben_ist ?? 0) - cf.streamExpense;
            const hasInc = ci.inc_ist != null;
            return (
              <div key={ci.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", borderBottom:"1px solid "+T.border, paddingBottom:8, marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMid, fontWeight:600 }}>{mlbl(ci.month)}</div>
                  {ci.note && <div style={{ fontSize:9, color:T.textDim }}>{ci.note}</div>}
                </div>
                <div style={{ display:"flex", gap:8, fontSize:9, flexWrap:"wrap", justifyContent:"flex-end" }}>
                  {hasInc && <span style={{ color:T.green }}>Einnahmen {full(ci.inc_ist)}</span>}
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
