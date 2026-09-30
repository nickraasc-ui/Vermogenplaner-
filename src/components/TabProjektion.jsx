import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Sl, ChTip, Icon, Btn, fmtE, full } from "./ui.jsx";
import { CY, ASSET_CLASS_DEFAULTS } from "../constants.js";

const exportCSV = (projection, cashflowProjection, s) => {
  // Class columns come from the projection's per-position breakdown (base scenario).
  // Owner columns split the base value by each owner's share of today's net worth (approximation).
  const assets = s.assets || [];
  const ownerNet = {};
  let totalNet0 = 0;
  assets.forEach(a => {
    const v = (a.value||0) - (a.debt||0);
    totalNet0 += v;
    const ownership = a.ownership || (a.owner ? [{ownerId:a.owner, share:1}] : []);
    ownership.forEach(o => { ownerNet[o.ownerId] = (ownerNet[o.ownerId]||0) + v*(o.share||0); });
  });
  const classes = [...new Set(projection.flatMap(r => Object.keys(r.breakdown?.byClass || {})))];
  const hasStandalone = projection.some(r => (r.breakdown?.standaloneDebt || 0) > 0);
  const owners  = s.owners || [];

  const hdr = [
    "Jahr","Datum","Alter",
    "Einnahmen_jährl_EUR","Ausgaben_jährl_EUR","Sparrate_jährl_EUR",
    "Immo_NetCF_jährl_EUR","Kapitalertraege_jährl_EUR","Kreditraten_jährl_EUR",
    "Portfolio_Basis_EUR","Portfolio_Konservativ_EUR","Portfolio_Optimistisch_EUR",
    ...classes.map(c => `Klasse_${c.replace(/ /g,"_")}_netto_EUR`),
    ...(hasStandalone ? ["Verbindlichkeiten_EUR"] : []),
    ...owners.map(o => `Eigentümer_${o.label.replace(/ /g,"_")}_EUR`),
  ];

  const rows = projection.map((row, y) => {
    const cf    = cashflowProjection?.[y] || {};
    const year  = CY + y;
    const scale = totalNet0 > 0 ? row.base / totalNet0 : 0;
    const defl  = s.inflationAdj ? 1 / Math.pow(1 + s.inflation/100, y) : 1; // breakdown is nominal
    const bd    = row.breakdown || { byClass:{}, standaloneDebt:0 };
    return [
      year,
      `31.12.${year}`,
      row.age,
      Math.round((cf.avail   ?? 0) * 12),
      Math.round((cf.bound   ?? 0) * 12),
      Math.round((cf.sp      ?? row.sp ?? 0) * 12),
      Math.round((cf.immoNetCF  ?? 0) * 12),
      Math.round((cf.assetYield ?? 0) * 12),
      Math.round((cf.otherAnnu  ?? 0) * 12),
      row.base, row.cons, row.opt,
      ...classes.map(c => Math.round((bd.byClass[c]||0) * defl)),
      ...(hasStandalone ? [Math.round(-(bd.standaloneDebt||0) * defl)] : []),
      ...owners.map(o => Math.round((ownerNet[o.id]||0) * scale)),
    ];
  });

  const csv = [hdr, ...rows].map(r => r.join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `Vermogenplaner_${CY}.csv`; a.click();
  URL.revokeObjectURL(url);
};

export default function TabProjektion({ s, T, upd, cf, agg, projection, final, loanSummary, setModal, projClassFilter, toggleProjClass, resetProjClass, availClasses, currentAge, cashflowProjection }) {
  const isFiltered = projClassFilter.length > 0;
  const [activePane, setActivePane] = useState(null);
  const togglePane = (k) => setActivePane(p => p === k ? null : k);

  // Dynamic milestones based on current net worth
  const milestones = (() => {
    const thresholds = [250000,500000,750000,1000000,1500000,2000000,3000000,5000000,7500000,10000000,15000000,20000000,30000000,50000000];
    return thresholds.filter(t => t > agg.net * 0.9).slice(0, 4);
  })();

  // Lifecycle maturity events from assets (Anleihen, PE)
  const maturityEvents = (s.assets||[])
    .filter(a => a.lifecycle?.maturity)
    .map(a => {
      const yr = parseInt((a.lifecycle.maturity||"").slice(0,4), 10);
      return isNaN(yr) ? null : { name: a.name, year: yr, class: a.class, value: a.value || 0 };
    })
    .filter(Boolean)
    .filter(e => e.year >= CY && e.year <= CY + (s.horizon||35))
    .sort((a,b) => a.year - b.year);

  const chipStyle = (active) => ({
    fontSize:14, padding:"7px 14px", borderRadius:999, border:"none",
    background: active ? T.accent : T.surfaceHigh,
    color: active ? T.onAccent : T.text,
    cursor:"pointer", fontWeight:600, whiteSpace:"nowrap", flexShrink:0,
    WebkitTapHighlightColor:"transparent",
  });

  const toggleBtn = (active, color, label, onClick) => (
    <button onClick={onClick} style={chipStyle(active)}>{label}</button>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28 }}>


      {/* Asset class filter */}
      {availClasses.length > 1 && (
        <div style={{ padding:"4px 0" }}>
          <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:8 }}>Asset-Klassen</div>
          <div className="vp-noscroll" style={{ display:"flex", gap:8, overflowX:"auto" }}>
            <button onClick={resetProjClass} style={chipStyle(projClassFilter.length === 0)}>Alle</button>
            {availClasses.map(cls => (
              <button key={cls} onClick={() => toggleProjClass(cls)}
                style={chipStyle(projClassFilter.includes(cls))}>
                {cls}
              </button>
            ))}
          </div>
          {isFiltered && (
            <div style={{ fontSize:11, color:T.amber, marginTop:6 }}>
              Nur: {projClassFilter.join(", ")} — Sparrate wirkt nur auf investierbare Klassen in der Auswahl
            </div>
          )}
        </div>
      )}

      {/* Planning parameters */}
      <div style={{ padding:"4px 0", display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          {s.autoSpar
            ? <span style={{ fontSize:12, color:T.textDim, fontStyle:"italic" }}>Sparrate wächst mit Einkommensströmen</span>
            : toggleBtn(s.sparRateGrowth, T.green, "Sparrate wächst "+(s.sparRateGrowth?s.sparGrowthPct+"%/J. ein":"aus"), () => upd({ sparRateGrowth:!s.sparRateGrowth }))
          }
          {toggleBtn(s.taxOnReturns, T.red, s.taxOnReturns?"nach Steuern":"vor Steuern", () => upd({ taxOnReturns:!s.taxOnReturns }))}
        </div>
        {s.taxOnReturns && (
          <Sl label="Basiszins (BMF)" value={s.basiszins??2.29} min={0.5} max={4} step={0.01} onChange={v => upd({ basiszins:v })} fmt={v => v.toFixed(2)+"%"}
            color={T.red} note="Vorabpauschale-Berechnung für thesaurierende ETFs — aktuell 2,29% (2024)" T={T} />
        )}
        {!s.autoSpar && s.sparRateGrowth && (
          <Sl label="Sparraten-Wachstum p.a." value={s.sparGrowthPct||2} min={0.5} max={10} step={0.5} onChange={v => upd({ sparGrowthPct:v })} fmt={v => v+"%"} color={T.green}
            note="Sparrate steigt jährlich (z.B. mit Gehaltserhöhungen)"
            sub={"In 10 Jahren: "+full(cf.eff*Math.pow(1+(s.sparGrowthPct||2)/100,10))+"/Mo."}
            T={T} />
        )}
        <Sl label="Aktuelles Alter" value={currentAge} min={18} max={75} step={1}
          onChange={v => upd({ birthYear: CY - v })} fmt={v => v+" Jahre"} color={T.textMid} T={T} />
        <Sl label="Zeithorizont" value={s.horizon} min={10} max={45} step={5} onChange={v => upd({ horizon:v })} fmt={v => v+"J (bis Alter "+(currentAge+v)+")"} color={T.purple} T={T} />
        <Sl label="Mietpreissteigerung p.a." value={s.immoRentGrowthPct??2} min={0} max={5} step={0.25} onChange={v => upd({ immoRentGrowthPct:v })} fmt={v => v+"%"} color={T.green}
          note="Jährliches Mietwachstum aller Immobilien in der Projektion" T={T} />
      </div>

      {/* Info box */}
      <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:"10px 13px", fontSize:12, color:T.textMid, lineHeight:1.7 }}>
        <strong style={{ color:T.text }}>Berechnungslogik:</strong> Sparrate ({full(cf.eff)}/Mo.) wird gemäß Sparraten-Verteilung investiert, jede Position wächst mit ihrer Klassenrendite. Tilgungen senken die Restschuld und erhöhen so das Vermögen. Szenarien: −{s.projSpreadCons??2}%/+{s.projSpreadOpt??2}% auf alle Klassenrenditen.
        {s.taxOnReturns && <span style={{ color:T.red }}> Nach Abgeltungsteuer (KeSt 26,4% / ETF-Teilfreistellung / Immo steuerfrei).</span>}
        {s.inflationAdj && <span style={{ color:T.amber }}> Werte real ({s.inflation}% Inflation bereinigt).</span>}
      </div>

      {/* Starting value */}
      {projection[0] && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:-16 }}>
          <span style={{ fontSize:14, color:T.textLow }}>Startwert heute</span>
          <span className="vp-num" style={{ fontSize:15, fontWeight:600, color:T.text }}>{full(projection[0].base)}</span>
        </div>
      )}

      {/* Scenario tiles — click to configure */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4 }}>
        {[
          { k:"cons", l:"Konservativ", c:T.textDim, spread:"−"+(s.projSpreadCons??2)+" %" },
          { k:"base", l:"Basis",       c:T.text,    spread:"Basisrendite" },
          { k:"opt",  l:"Optimistisch",c:T.green,   spread:"+"+(s.projSpreadOpt??2)+" %" },
        ].map(({ k, l, c, spread }) => {
          const active = activePane === k;
          return (
            <div key={k} onClick={() => togglePane(k)}
              style={{ background: active ? T.surfaceHigh : "transparent", borderRadius:14, padding:"10px 10px", margin:"0 -2px", cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
              <div style={{ fontSize:13, color:T.textLow, fontWeight:500, marginBottom:3, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:c, flexShrink:0 }} />{l}
              </div>
              <div className="vp-num" style={{ fontSize:18, fontWeight:700, color:T.text, letterSpacing:"-0.015em" }}>{fmtE(final[k])}</div>
              <div style={{ fontSize:12, color:T.textLow, marginTop:2 }}>{spread} · {s.inflationAdj?"real":"nominal"}{s.taxOnReturns?" · n. St.":""}</div>
            </div>
          );
        })}
      </div>

      {/* Inline scenario settings pane */}
      {(activePane === "cons" || activePane === "base" || activePane === "opt") && (
        <div style={{ padding:"4px 0" }}>
          {activePane === "cons" && (
            <Sl label="Konservativ-Abschlag" value={s.projSpreadCons??2} min={0.5} max={8} step={0.5}
              onChange={v => upd({ projSpreadCons:v })} fmt={v => "−"+v+"%"} color={T.textMid}
              note="Rendite-Abschlag für das konservative Szenario" T={T} />
          )}
          {activePane === "base" && (
            <div>
              <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:8 }}>Basisrendite</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:12, color:T.textMid }}>Gewichteter Ø aller Klassen</span>
                <span style={{ fontSize:15, fontWeight:650, color:T.accent }}>{agg.wavgReturn.toFixed(1)}% p.a.</span>
              </div>
              <div style={{ fontSize:11, color:T.textDim }}>Renditeannahmen pro Asset-Klasse einstellbar im Tab Vermögen.</div>
            </div>
          )}
          {activePane === "opt" && (
            <Sl label="Optimistisch-Aufschlag" value={s.projSpreadOpt??2} min={0.5} max={8} step={0.5}
              onChange={v => upd({ projSpreadOpt:v })} fmt={v => "+"+v+"%"} color={T.green}
              note="Rendite-Aufschlag für das optimistische Szenario" T={T} />
          )}
        </div>
      )}

      {/* Inflation — click to expand */}
      <div onClick={() => togglePane("inflation")}
        style={{ padding:"4px 0", cursor:"pointer", WebkitTapHighlightColor:"transparent", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em" }}>Inflation</div>
          <div style={{ fontSize:14, color:T.textLow, marginTop:2 }}>
            {s.inflationAdj ? s.inflation+"% p.a. · Werte real bereinigt" : "Nicht berücksichtigt · nominal"}
          </div>
        </div>
        <span style={{ fontSize:12, color:T.textMid }}><span style={{ display:"inline-block", transform:(activePane === "inflation")?"rotate(180deg)":"none", transition:"transform .2s" }}><Icon name="down" size={18} /></span></span>
      </div>
      {activePane === "inflation" && (
        <div style={{ background:T.surfaceHigh, borderRadius:14, padding:16, display:"flex", flexDirection:"column", gap:14, marginTop:-12 }}>
          <div style={{ display:"flex", gap:8 }}>
            {toggleBtn(s.inflationAdj, T.amber,
              s.inflationAdj ? "Inflationsbereinigung ein" : "Inflationsbereinigung aus",
              () => upd({ inflationAdj: !s.inflationAdj }))}
          </div>
          {s.inflationAdj && (
            <Sl label="Inflationsrate" value={s.inflation} min={0.5} max={6} step={0.25}
              onChange={v => upd({ inflation:v })} fmt={v => v+"%"} color={T.amber} T={T} />
          )}
        </div>
      )}

      {/* Chart */}
      <div style={{ padding:"4px 0" }}>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={projection} margin={{ top:4, right:10, left:0, bottom:0 }}>
            <defs>
              {[["cons",T.textMid],["base",T.accent],["opt",T.green]].map(([k, c]) => (
                <linearGradient key={k} id={"pg"+k} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={c} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey="age" tick={{ fill:T.textDim, fontSize:11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:T.textDim, fontSize:11 }} tickFormatter={fmtE} width={58} axisLine={false} tickLine={false} orientation="right" />
            <Tooltip cursor={{ stroke:T.textDim, strokeWidth:1 }} content={(props) => <ChTip {...props} T={T} />} />
            <Area type="monotone" dataKey="cons" name="Konservativ" stroke={T.textDim} fill="none" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="opt"  name="Optimistisch" stroke={T.green} fill="none" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="base" name="Basis" stroke={T.text} fill="none" strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Rentenlücken-Analyse */}
      {(() => {
        const retAge     = s.retirementAge || Math.min(currentAge + 30, 67);
        const retIdx     = Math.max(0, Math.min(retAge - currentAge, (cashflowProjection?.length || 1) - 1));
        const retCF      = cashflowProjection?.[retIdx] || {};
        const retProj    = projection?.[retIdx];
        const monthlyGap = Math.max(0, (retCF.bound || 0) - (retCF.avail || 0));
        const annualGap  = monthlyGap * 12;
        const required25x = annualGap * 25;
        const projBase   = retProj?.base || 0;
        const covered    = annualGap > 0 ? projBase / annualGap : Infinity;
        const surplus    = projBase - required25x;
        const isOpen     = activePane === "rentenlucke";
        return (
          <div>
            <div onClick={() => togglePane("rentenlucke")}
              style={{ padding:"4px 0", cursor:"pointer", WebkitTapHighlightColor:"transparent", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em" }}>Rentenlückenanalyse</div>
                <div style={{ fontSize:12, color:T.text, marginTop:2 }}>
                  {monthlyGap > 0
                    ? <span>Alter {retAge}: <strong style={{ color:T.red }}>{full(monthlyGap)}/Mo. Lücke</strong></span>
                    : <span>Alter {retAge}: <strong style={{ color:T.green }}>kein Defizit</strong></span>
                  }
                </div>
              </div>
              <span style={{ fontSize:12, color:T.textMid }}><span style={{ display:"inline-block", transform:isOpen?"rotate(180deg)":"none", transition:"transform .2s" }}><Icon name="down" size={18} /></span></span>
            </div>
            {isOpen && (
              <div style={{ padding:"4px 0", marginTop:4, display:"flex", flexDirection:"column", gap:14 }}>
                <Sl label="Renteneintrittsalter" value={retAge} min={55} max={75} step={1}
                  onChange={v => upd({ retirementAge: v })} fmt={v => v+" Jahre"} color={T.purple} T={T} />

                <div style={{ background:T.surfaceHigh, borderRadius:8, padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:2 }}>
                    Prognose Alter {retAge} · Jahr {CY + retIdx}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    <div>
                      <div style={{ fontSize:11, color:T.textDim }}>Einnahmen</div>
                      <div style={{ fontSize:15, fontWeight:650, color:T.green }}>{full(retCF.avail || 0)}/Mo.</div>
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:T.textDim }}>Ausgaben</div>
                      <div style={{ fontSize:15, fontWeight:650, color:T.red }}>{full(retCF.bound || 0)}/Mo.</div>
                    </div>
                  </div>

                  {monthlyGap > 0 ? (
                    <>
                      <div style={{ borderTop:"1px solid "+T.border, paddingTop:10 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                          <div>
                            <div style={{ fontSize:11, color:T.textDim }}>Monatliche Lücke</div>
                            <div style={{ fontSize:16, fontWeight:650, color:T.red }}>{full(monthlyGap)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:11, color:T.textDim }}>Projektion Portfolio</div>
                            <div style={{ fontSize:16, fontWeight:650, color:T.accent }}>{fmtE(projBase)}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ borderTop:"1px solid "+T.border, paddingTop:10 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                          <div>
                            <div style={{ fontSize:11, color:T.textDim }}>Kapitalbedarf (25×)</div>
                            <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{fmtE(required25x)}</div>
                            <div style={{ fontSize:11, color:T.textDim }}>4%-Regel (SWR)</div>
                          </div>
                          <div>
                            <div style={{ fontSize:11, color:T.textDim }}>Tragfähigkeit (0% Rendite)</div>
                            <div style={{ fontSize:13, fontWeight:600, color:covered >= 25 ? T.green : covered >= 15 ? T.amber : T.red }}>
                              {isFinite(covered) ? covered.toFixed(0)+" Jahre" : "unbegrenzt"}
                            </div>
                            <div style={{ fontSize:11, color:T.textDim }}>{covered >= 25 ? "4%-Regel erfüllt" : "< 25 = Lücke"}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ background: surplus >= 0 ? T.green+"12" : T.red+"12", border:"1px solid "+(surplus>=0?T.green:T.red)+"44", borderRadius:7, padding:"9px 12px" }}>
                        <div style={{ fontSize:11, color:surplus>=0?T.green:T.red, fontWeight:600, marginBottom:2 }}>
                          {surplus >= 0 ? "Kapitalpuffer" : "Kapitallücke"}
                        </div>
                        <div style={{ fontSize:14, fontWeight:650, color:surplus>=0?T.green:T.red }}>
                          {surplus >= 0 ? "+" : ""}{fmtE(surplus)}
                        </div>
                        <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>
                          {surplus >= 0
                            ? "Portfolio übersteigt 25× Jahresdefizit — Rente gut gedeckt"
                            : `Noch ${fmtE(Math.abs(surplus))} Vermögen aufbauen für volle Deckung`}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ background:T.surfaceHigh, border:"none", borderRadius:14, padding:"9px 12px" }}>
                      <div style={{ fontSize:12, fontWeight:600, color:T.green, marginBottom:2 }}>Kein Defizit im Rentenalter</div>
                      <div style={{ fontSize:12, color:T.textDim }}>Laufende Einnahmen decken alle Ausgaben — Portfolio bleibt vollständig erhalten.</div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize:11, color:T.textDim, lineHeight:1.6 }}>
                  <strong style={{ color:T.amber }}>Wichtig:</strong> Gesetzliche Rente, Betriebsrente etc. als Einkommensstrom mit Startdatum (z.B. Alter 67) im Haushalt-Tab eintragen — nur dann fließen sie hier in die Lückenberechnung ein. Lücke = projizierte Ausgaben − Einnahmen im gewählten Alter.
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Affordability */}
      <button onClick={() => setModal({ type:"afford" })}
        style={{ width:"100%", background:"none", border:"none", borderTop:"1px solid "+T.border, borderBottom:"1px solid "+T.border, padding:"14px 0", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:14, textAlign:"left", color:T.text, WebkitTapHighlightColor:"transparent" }}>
        <span style={{ width:40, height:40, borderRadius:"50%", background:T.surfaceHigh, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="wallet" size={18} /></span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:600, color:T.text }}>Was kann ich mir leisten?</div>
          <div style={{ fontSize:13, color:T.textLow, marginTop:2 }}>Wachstum vs. Substanz</div>
        </div>
        <span style={{ color:T.textDim }}><Icon name="chevron" size={18} /></span>
      </button>

      {/* Milestones */}
      <div style={{ padding:"4px 0" }}>
        <div style={{ fontSize:20, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:12 }}>Meilensteine</div>
        {milestones.map(t => {
          const hit = projection.find(d => d.base >= t);
          return (
            <div key={t} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid "+T.border, paddingBottom:8, marginBottom:8 }}>
              <div style={{ fontSize:15, fontWeight:600, color:T.text }}>{fmtE(t)}</div>
              {hit
                ? <div style={{ textAlign:"right" }}><div style={{ fontSize:15, fontWeight:600, color:T.text }}>Alter {hit.age}</div><div style={{ fontSize:13, color:T.textLow }}>in {hit.age-currentAge} J.</div></div>
                : <div style={{ fontSize:12, color:T.red }}>Nicht im Horizont</div>}
            </div>
          );
        })}
        {loanSummary.map(l => l.yrsLeft && (
          <div key={l.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid "+T.border, paddingBottom:8, marginBottom:8 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:T.text }}>{l.name} schuldenfrei</div>
              <div style={{ fontSize:13, color:T.textLow }}>+{full(l.annuitat)}/Mo. frei</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:15, fontWeight:600, color:T.text }}>{CY+l.yrsLeft}</div>
              <div style={{ fontSize:13, color:T.textLow }}>Alter {currentAge+l.yrsLeft}</div>
            </div>
          </div>
        ))}
        {maturityEvents.map(e => (
          <div key={e.name+e.year} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid "+T.border, paddingBottom:8, marginBottom:8 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:T.text }}>{e.name} fällig</div>
              <div style={{ fontSize:13, color:T.textLow }}>{e.class} · {fmtE(e.value)} Rückfluss</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:15, fontWeight:600, color:T.text }}>{e.year}</div>
              <div style={{ fontSize:13, color:T.textLow }}>Alter {currentAge + (e.year - CY)}</div>
            </div>
          </div>
        ))}
      </div>
      <Btn full color={T.textMid} T={T} onClick={() => exportCSV(projection, cashflowProjection, s)}>Excel-Export (CSV)</Btn>
    </div>
  );
}
