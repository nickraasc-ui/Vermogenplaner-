import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Sl, Tile, Row, Btn, Icon, Section, ListRow, Avatar, LinkBtn, full, mlbl, ChTip } from "./ui.jsx";
import { primaryOwnerId } from "../model/schema.js";
import { ASSET_CLASS_DEFAULTS, ASSET_CLASSES, CY } from "../constants.js";

const ALL_INVEST_CLASSES = ASSET_CLASSES.filter(cls => cls !== "Cash" && cls !== "Immobilien" && cls !== "Forderung");

export default function TabHaushalt({ s, T, upd, updArr, setModal, cf, sparDist, ownerFilter, filteredAssets, cashflowProjection, currentAge }) {
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
  const ownerLabel = (x) => (s.owners||[]).find(o => o.id === primaryOwnerId(x))?.label;
  const isActiveNow = st => CY >= (st.startsAt||CY) && (!st.endsAt || CY <= st.endsAt);
  const val = (cur, fut) => isCurrent ? cur : fut;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28 }}>

      {/* Warnings */}
      {isFiltered && (
        <div style={{ background:T.surfaceHigh, border:"none", borderRadius:14, padding:"7px 12px", fontSize:12, color:T.accent }}>
          Gefiltert: {ownerFilter.map(id => (s.owners||[]).find(o => o.id===id)?.label||id).join(", ")} — Einnahmen- und Ausgabenströme des Eigentümers
        </div>
      )}
      {cf.rest < 0 && isCurrent && (
        <div style={{ background:T.surfaceHigh, border:"none", borderRadius:14, padding:"10px 13px" }}>
          <div style={{ fontSize:12, color:T.red, fontWeight:600, marginBottom:5 }}>
            Ausgaben übersteigen Einkommen um {full(Math.abs(cf.rest) * vm)}/{annualView?"J.":"Mo."}
          </div>
          <div style={{ fontSize:12, color:T.textMid, lineHeight:1.7 }}>
            {cf.bufferBalance > 0 && cf.bound > 0 && (
              <div>· Puffer deckt ca. <strong style={{ color:T.amber }}>{(cf.bufferBalance / Math.abs(cf.rest)).toFixed(0)} Monate</strong></div>
            )}
            <div>· Ausgaben um <strong>{full(Math.abs(cf.rest))}/Mo.</strong> reduzieren</div>
            <div>· oder neue Einnahmequelle anlegen</div>
          </div>
        </div>
      )}
      {cf.effTarget != null && cf.effTarget > cf.rest && isCurrent && (
        <div style={{ background:T.surfaceHigh, border:"none", borderRadius:14, padding:"9px 13px", fontSize:12, color:T.amber }}>
          Sparziel {full(cf.effTarget * vm)}/{annualView?"J.":"Mo."} übersteigt verfügbaren Überschuss {full(Math.max(0, cf.rest) * vm)}/{annualView?"J.":"Mo."} — Projektion verwendet {full(Math.max(0, cf.rest) * vm)}/{annualView?"J.":"Mo."}
        </div>
      )}

      {/* Haushaltspuffer status */}
      {cf.bufferBalance > 0 && isCurrent && (
        <div style={{ padding:"4px 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em" }}>Haushaltspuffer</div>
              <div style={{ fontSize:15, fontWeight:650, color:T.text, marginTop:2 }}>{full(cf.bufferBalance * vm)}</div>
              {cf.bound > 0 && (
                <div style={{ fontSize:11, color:T.textDim, marginTop:1 }}>
                  {(cf.bufferBalance / cf.bound).toFixed(1)} Monatsausgaben Deckung
                </div>
              )}
            </div>
            {cf.bufferContribMonthly > 0 && (
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:11, color:T.textDim }}>Monatl. Zufluss</div>
                <div style={{ fontSize:13, fontWeight:600, color:T.green }}>+{full(cf.bufferContribMonthly * vm)}</div>
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
        <div style={{ padding:"4px 0" }}>
          <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:3 }}>Cashflow-Vorschau</div>
          <div style={{ fontSize:11, color:T.textDim, marginBottom:10 }}>Tippe auf ein Jahr für die Monatsübersicht dieses Jahres</div>

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
              <CartesianGrid vertical={false} stroke={T.border} />
              <XAxis dataKey="age" tick={{ fill:T.textLow, fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:T.textLow, fontSize:11 }} tickFormatter={v => full(v)} width={64} axisLine={false} tickLine={false} />
              <Tooltip content={props => <ChTip {...props} T={T} />} />
              <ReferenceLine x={selAge} stroke={T.accent} strokeWidth={2} strokeDasharray="5 3" label={{ value: selAbsYear, fill:T.accent, fontSize:11, position:"top" }} />
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
      <div style={{ padding:"4px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em" }}>{annualView ? "Jahresübersicht" : "Monatsübersicht"}</div>
              <button onClick={() => setAnnualView(v => !v)}
                style={{ fontSize:11, padding:"2px 8px", borderRadius:999, border:"none", background:annualView?T.accent:T.surfaceHigh, color:annualView?T.onAccent:T.text, cursor:"pointer", fontWeight:600, WebkitTapHighlightColor:"transparent" }}>
                {annualView ? "p.a." : "pro Monat"}
              </button>
            </div>
            {!isCurrent && (
              <div style={{ fontSize:11, color:T.accent, marginTop:2, fontWeight:600 }}>
                Prognose {selAbsYear} · Alter {selAge}
                {selCF.otherAnnu === 0 && (cf.otherAnnuitat||0) > 0 && <span style={{ color:T.green, marginLeft:6 }}>· Kredite abbezahlt</span>}
              </div>
            )}
          </div>
          {!isCurrent && (
            <button onClick={() => setModal({ type:"checkin", year: selAbsYear })}
              style={{ padding:"5px 10px", borderRadius:999, border:"none", background:T.surfaceHigh, color:T.accent, cursor:"pointer", fontSize:12, fontWeight:600, WebkitTapHighlightColor:"transparent", flexShrink:0 }}>
              {selCheckin ? "IST bearbeiten" : "+ IST erfassen"}
            </button>
          )}
        </div>

        {/* Income streams */}
        {(isCurrent ? (s.incomeStreams||[]).filter(isActiveNow) : selIncStreams.filter(st => st.active)).map(st => (
          <Row key={st.id} label={st.label}
            value={"+" + full((isCurrent ? st.amount : st.amt) * vm)}
            type="in"
            sub={[ownerLabel(st), !isCurrent && (st.growthPct||0)>0 ? `+${st.growthPct}%/J.` : ""].filter(Boolean).join(" · ")}
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
            sub={[st.isBufferContribution ? "→ Puffer" : st.category, ownerLabel(st)].filter(Boolean).join(" · ")} T={T} />
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
            <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:8 }}>IST-Daten {mlbl(selCheckin.month)}</div>
            {[
              ["Einnahmen", selCheckin.inc_ist, selCF.avail, T.green, false],
              ["Ausgaben",  selCheckin.streamExp_ist, selCF.bound, T.red, true],
              ["Sparrate",  selCheckin.sparrate_ist, selCF.sp, T.accent, false],
            ].filter(([,ist]) => ist != null && ist !== "").map(([label, ist, proj, color, invertDelta]) => {
              const delta = (+ist||0) - (proj||0);
              const good  = invertDelta ? delta <= 0 : delta >= 0;
              return (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                  <span style={{ fontSize:12, color:T.textMid }}>{label} IST</span>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:12, fontWeight:600, color }}>{full((+ist||0)*vm)}</span>
                    {Math.abs(delta) > 1 && (
                      <span style={{ fontSize:11, color:good?T.green:T.red }}>{delta>0?"+":""}{full(delta*vm)}</span>
                    )}
                  </div>
                </div>
              );
            })}
            {selCheckin.note && <div style={{ fontSize:11, color:T.textDim, marginTop:4 }}>Notiz: {selCheckin.note}</div>}
          </div>
        )}
      </div>

      {/* ── KONFIGURATION ── */}
      <Section title="Einnahmen" T={T}
        action={<LinkBtn T={T} onClick={() => setModal({ type:"incomeStream", data:null })}><Icon name="plus" size={16} /> Hinzufügen</LinkBtn>}>
        <div className="vp-num" style={{ fontSize:14, color:T.textLow, marginTop:-4, marginBottom:4 }}>Aktiv {full(cf.streamIncome)}/Mo.</div>
        {(s.incomeStreams||[]).length === 0 && (
          <div style={{ fontSize:14, color:T.textLow, padding:"8px 0" }}>Noch keine Einnahmen angelegt.</div>
        )}
        {(s.incomeStreams||[]).map((st, i, arr) => {
          const active = isActiveNow(st);
          const sub = [st.type, ownerLabel(st), (st.growthPct||0) > 0 ? "+"+st.growthPct+" %/J." : null,
            st.startsAt > CY ? "ab "+st.startsAt : null, st.endsAt ? "bis "+st.endsAt : null, !active ? "inaktiv" : null].filter(Boolean);
          return (
            <div key={st.id} style={{ opacity:active?1:0.45 }}>
              <ListRow T={T} last={i === arr.length - 1} onClick={() => setModal({ type:"incomeStream", data:st })}
                leading={<Avatar icon="arrowDown" color={T.surfaceHigh} fg={T.green} />}
                title={st.label} subtitle={sub.join(" · ")}
                value={"+"+full(st.amount)} valueSub="pro Monat" />
            </div>
          );
        })}
      </Section>

      <Section title="Ausgaben" T={T}
        action={<LinkBtn T={T} onClick={() => setModal({ type:"expenseStream", data:null })}><Icon name="plus" size={16} /> Hinzufügen</LinkBtn>}>
        <div className="vp-num" style={{ fontSize:14, color:T.textLow, marginTop:-4, marginBottom:4 }}>Aktiv {full(cf.streamExpense)}/Mo.</div>
        {(s.expenseStreams||[]).length === 0 && (
          <div style={{ fontSize:14, color:T.textLow, padding:"8px 0" }}>Noch keine Ausgaben angelegt.</div>
        )}
        {(s.expenseStreams||[]).map((st, i, arr) => {
          const active = isActiveNow(st);
          const sub = [st.category, st.startsAt > CY ? "ab "+st.startsAt : null, st.endsAt ? "endet "+st.endsAt : null, !active ? "inaktiv" : null].filter(Boolean);
          return (
            <div key={st.id} style={{ opacity:active?1:0.45 }}>
              <ListRow T={T} last={i === arr.length - 1} onClick={() => setModal({ type:"expenseStream", data:st })}
                leading={<Avatar icon="arrowUp" color={T.surfaceHigh} fg={T.text} />}
                title={st.label} subtitle={sub.join(" · ")}
                value={"−"+full(st.amount)} valueSub="pro Monat" />
            </div>
          );
        })}
      </Section>

      {/* Sparrate */}
      <div style={{ padding:"4px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em" }}>Sparrate</div>
          <button onClick={() => upd({ autoSpar:!s.autoSpar })}
            style={{ fontSize:12, padding:"5px 12px", borderRadius:999, border:"none", background:s.autoSpar?T.accent:T.surfaceHigh, color:s.autoSpar?T.onAccent:T.text, cursor:"pointer", fontWeight:600, WebkitTapHighlightColor:"transparent" }}>
            {s.autoSpar ? "Auto" : "Manuell"}
          </button>
        </div>
        {s.autoSpar ? (
          <div style={{ background:T.surfaceHigh, borderRadius:7, padding:"11px 13px", fontSize:12, color:T.textMid, lineHeight:1.7 }}>
            {full(cf.avail)} − {full(cf.bound)} = <strong style={{ color:cf.eff>0?T.accent:T.red, fontSize:15 }}>{full(cf.eff)}/Mo.</strong>
            <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>
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
        <div style={{ padding:"4px 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em" }}>Sparraten-Verteilung</div>
              <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>{s.sparDistMode==="auto" ? "Proportional zur Gewichtung" : "Manuell je Klasse"}</div>
            </div>
            <button onClick={() => upd({ sparDistMode:s.sparDistMode==="auto"?"manual":"auto" })}
              style={{ fontSize:12, padding:"5px 12px", borderRadius:999, border:"none", background:s.sparDistMode==="manual"?T.accent:T.surfaceHigh, color:s.sparDistMode==="manual"?T.onAccent:T.text, cursor:"pointer", fontWeight:600, WebkitTapHighlightColor:"transparent" }}>
              {s.sparDistMode==="auto" ? "Auto" : "Manuell"}
            </button>
          </div>
          {s.sparDistMode === "manual" ? (
            <>
              {ALL_INVEST_CLASSES.map(cls => (
                <div key={cls} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:ASSET_CLASS_DEFAULTS[cls]?.color||T.textMid, flexShrink:0 }} />
                  <div style={{ fontSize:12, color:T.text, flex:1 }}>{cls}</div>
                  <input type="number" value={s.manualSparDist[cls]||0}
                    onChange={e => upd({ manualSparDist:{ ...s.manualSparDist, [cls]:parseFloat(e.target.value)||0 } })}
                    style={{ width:90, background:T.field, border:"1px solid transparent", borderRadius:10, padding:"9px 12px", color:T.text, fontSize:15, outline:"none", fontFamily:"inherit", WebkitAppearance:"none", textAlign:"right" }} />
                  <span style={{ fontSize:12, color:T.textDim, width:20 }}>/Mo</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0 4px", borderTop:"1px solid "+T.border, marginTop:4 }}>
                <span style={{ fontSize:12, color:T.textMid }}>Verteilt</span>
                <div style={{ textAlign:"right" }}>
                  <span style={{ fontSize:13, fontWeight:650, color:Math.abs(manualDiff)<1?T.green:T.amber }}>{full(totalManual)}</span>
                  <span style={{ fontSize:11, color:T.textDim }}> / {full(cf.eff)}</span>
                  {Math.abs(manualDiff) >= 1 && (
                    <div style={{ fontSize:11, color:T.amber }}>{manualDiff>0?"+ "+full(manualDiff)+" offen":full(-manualDiff)+" zu viel"}</div>
                  )}
                </div>
              </div>
              {totalManual > cf.eff + 1 && (
                <div style={{ background:T.surfaceHigh, border:"none", borderRadius:14, padding:"8px 10px", fontSize:12, color:T.amber, lineHeight:1.5 }}>
                  Zuviel verteilt ({full(totalManual - cf.eff)}/Mo. über Sparrate) — Projektion verwendet nur {full(cf.eff)}/Mo. Bitte Verteilung auf max. {full(cf.eff)}/Mo. reduzieren.
                </div>
              )}
            </>
          ) : sparDist.length > 0 ? (
            <>
              <div style={{ fontSize:11, color:T.textDim, marginBottom:8 }}>Proportional zur aktuellen Gewichtung der investierbaren Positionen</div>
              {sparDist.map(({ cls, share, monthly }) => (
                <div key={cls} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:ASSET_CLASS_DEFAULTS[cls]?.color||T.textMid, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                      <span style={{ fontSize:12, color:T.textMid }}>{cls}</span>
                      <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{full(monthly)}/Mo.</span>
                    </div>
                    <div style={{ background:T.border, borderRadius:3, height:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", background:ASSET_CLASS_DEFAULTS[cls]?.color||T.accent, width:(share*100)+"%" }} />
                    </div>
                  </div>
                  <span style={{ fontSize:11, color:T.textDim, width:32, textAlign:"right" }}>{(share*100).toFixed(0)}%</span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ background:T.surfaceHigh, border:"none", borderRadius:14, padding:"10px 12px" }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.amber, marginBottom:3 }}>Keine investierbaren Positionen</div>
              <div style={{ fontSize:12, color:T.textMid, lineHeight:1.5 }}>Wechsle zu "Manuell" oder leg eine investierbare Position an.</div>
            </div>
          )}
        </div>
      )}

      {/* Details: Immo / Erträge / Kosten (collapsible) */}
      {(hasImmo || hasForderung || hasYield || hasRunCosts) && (
        <div>
          <button onClick={() => setDetailsOpen(!detailsOpen)}
            style={{ width:"100%", background:"none", border:"none", borderTop:"1px solid "+T.border, borderBottom:"1px solid "+T.border, padding:"14px 0", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", color:T.text, WebkitTapHighlightColor:"transparent" }}>
            <span style={{ fontSize:15, color:T.text, fontWeight:600 }}>Details: Immobilien, Erträge, Kosten</span>
            <span style={{ fontSize:12, color:T.textMid }}><span style={{ display:"inline-block", transform:detailsOpen?"rotate(180deg)":"none", transition:"transform .2s" }}><Icon name="down" size={18} /></span></span>
          </button>
          {detailsOpen && (
            <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:8 }}>
              {hasImmo && (
                <div style={{ padding:"4px 0" }}>
                  <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:10 }}>Immobilien-Cashflow</div>
                  <Row label="Brutto-Mieteinnahmen" value={"+" + full(cf.immoGross)} type="in" sub="Kaltmiete aller Objekte" T={T} />
                  <Row label="Immo-Annuitäten" value={"-" + full(cf.immoAnnuitat)} type="out" sub="Zins + Tilgung" T={T} />
                  <Row label="Nebenkosten" value={"-" + full(cf.immoRunning)} type="out" sub="Hausgeld + Grundsteuer" T={T} />
                  <Row label="Netto-Immo-CF" value={(cf.immoNetCF>=0?"+":"")+full(cf.immoNetCF)} type={cf.immoNetCF>=0?"in":"warn"} bold T={T} />
                </div>
              )}
              {hasForderung && (
                <div style={{ padding:"4px 0" }}>
                  <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:10 }}>Forderungen / Darlehenszuflüsse</div>
                  {forderungen.map(a => (
                    <Row key={a.id} label={a.name} value={"+" + full(a.monthlyRepayment)} type="in" sub="Monatl. Rückzahlung" T={T} />
                  ))}
                </div>
              )}
              {hasYield && (
                <div style={{ padding:"4px 0" }}>
                  <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:10 }}>Kapitalerträge / Ausschüttungen</div>
                  {yieldAssets.map(a => {
                    const monthly = (a.value||0) * (a.yieldPct||0) / 100 / 12;
                    return <Row key={a.id} label={a.name} value={"+" + full(monthly)} type="in" sub={a.yieldPct+"% · "+a.class} T={T} />;
                  })}
                </div>
              )}
              {hasRunCosts && (
                <div style={{ padding:"4px 0" }}>
                  <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:10 }}>Laufende Vermögenskosten</div>
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
        <div style={{ padding:"4px 0" }}>
          <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:10 }}>Check-in Verlauf</div>
          {[...s.checkins].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 8).map(ci => {
            const dS = (ci.sparrate_ist||0) - cf.eff;
            const dA = (ci.streamExp_ist || 0) - cf.streamExpense;
            const hasInc = ci.inc_ist != null;
            return (
              <div key={ci.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", borderBottom:"1px solid "+T.border, paddingBottom:8, marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:12, color:T.textMid, fontWeight:600 }}>{mlbl(ci.month)}</div>
                  {ci.note && <div style={{ fontSize:11, color:T.textDim }}>{ci.note}</div>}
                </div>
                <div style={{ display:"flex", gap:8, fontSize:11, flexWrap:"wrap", justifyContent:"flex-end" }}>
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
