import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Sl, ChTip, fmtE, full } from "./ui.jsx";
import { CY, ASSET_CLASS_DEFAULTS } from "../constants.js";

export default function TabProjektion({ s, T, upd, cf, agg, projection, final, loanSummary, setModal, projClassFilter, toggleProjClass, resetProjClass, availClasses, currentAge }) {
  const isFiltered = projClassFilter.length > 0;

  // Dynamic milestones based on current net worth
  const milestones = (() => {
    const thresholds = [250000,500000,750000,1000000,1500000,2000000,3000000,5000000,7500000,10000000,15000000,20000000,30000000,50000000];
    return thresholds.filter(t => t > agg.net * 0.9).slice(0, 4);
  })();

  const chipStyle = (active, color) => ({
    fontSize:8, padding:"2px 9px", borderRadius:10,
    border:"1px solid "+(active ? (color||T.accent) : T.border),
    background: active ? (color||T.accent)+"22" : "transparent",
    color: active ? (color||T.accent) : T.textMid,
    cursor:"pointer", fontWeight: active ? 700 : 500,
    WebkitTapHighlightColor:"transparent",
  });

  const toggleBtn = (active, color, label, onClick) => (
    <button onClick={onClick}
      style={{ padding:"6px 13px", borderRadius:6, border:"1px solid "+(active?color:T.border), background:active?color+"18":"transparent", color:active?color:T.textMid, cursor:"pointer", fontSize:11, fontWeight:700, WebkitTapHighlightColor:"transparent" }}>
      {label}
    </button>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* Asset class filter */}
      {availClasses.length > 1 && (
        <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:"10px 12px" }}>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Projektion filtern nach Asset-Klasse</div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            <button onClick={resetProjClass} style={chipStyle(projClassFilter.length === 0)}>Alle</button>
            {availClasses.map(cls => (
              <button key={cls} onClick={() => toggleProjClass(cls)}
                style={chipStyle(projClassFilter.includes(cls), ASSET_CLASS_DEFAULTS[cls]?.color)}>
                {cls}
              </button>
            ))}
          </div>
          {isFiltered && (
            <div style={{ fontSize:9, color:T.amber, marginTop:6 }}>
              Nur: {projClassFilter.join(", ")} — Sparrate wirkt nur auf investierbare Klassen in der Auswahl
            </div>
          )}
        </div>
      )}

      {/* Planning parameters */}
      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14, display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          {toggleBtn(s.inflationAdj, T.amber, "Inflation "+(s.inflationAdj?s.inflation+"% ein":"aus"), () => upd({ inflationAdj:!s.inflationAdj }))}
          {toggleBtn(s.sparRateGrowth, T.green, "Sparrate wächst "+(s.sparRateGrowth?s.sparGrowthPct+"%/J. ein":"aus"), () => upd({ sparRateGrowth:!s.sparRateGrowth }))}
          {toggleBtn(s.taxOnReturns, T.red, s.taxOnReturns?"nach Steuern":"vor Steuern", () => upd({ taxOnReturns:!s.taxOnReturns }))}
        </div>

        {s.inflationAdj && (
          <Sl label="Inflationsrate" value={s.inflation} min={0.5} max={6} step={0.25} onChange={v => upd({ inflation:v })} fmt={v => v+"%"} color={T.amber} T={T} />
        )}
        {s.sparRateGrowth && (
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
      <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:"10px 13px", fontSize:10, color:T.textMid, lineHeight:1.7 }}>
        <strong style={{ color:T.text }}>Berechnungslogik:</strong> Jede Position wächst mit der Rendite ihrer Asset-Klasse. Sparrate ({full(cf.eff)}/Mo.) fließt proportional in nicht-gesperrte, investierbare Positionen.
        {s.taxOnReturns && <span style={{ color:T.red }}> Renditen nach Abgeltungsteuer (KeSt 26,4% / ETF-Teilfreistellung 30% / PE-Teileinkünfte / Immo steuerfrei).</span>}
        {s.inflationAdj && <span> Alle Werte real (inflationsbereinigt).</span>}
        {" "}Szenarien: ±2% auf alle Klassenrenditen.
      </div>

      {/* Scenario tiles */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
        {[{ k:"cons", l:"Konservativ", c:T.textMid }, { k:"base", l:"Basis", c:T.accent }, { k:"opt", l:"Optimistisch", c:T.green }].map(({ k, l, c }) => (
          <div key={k} style={{ background:T.surface, border:"1px solid "+c+"33", borderRadius:9, padding:11 }}>
            <div style={{ fontSize:8, color:c, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>{l}</div>
            <div style={{ fontSize:18, fontWeight:900, color:T.text }}>{fmtE(final[k])}</div>
            <div style={{ fontSize:8, color:T.textDim, marginTop:2 }}>{s.inflationAdj?"real":"nominal"}{s.taxOnReturns?" · n.St.":""}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:"13px 4px 8px" }}>
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
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="age" tick={{ fill:T.textLow, fontSize:9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:T.textLow, fontSize:9 }} tickFormatter={fmtE} width={50} axisLine={false} tickLine={false} />
            <Tooltip content={(props) => <ChTip {...props} T={T} />} />
            <Area type="monotone" dataKey="cons" name="Konservativ" stroke={T.textMid} fill="url(#pgcons)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="base" name="Basis" stroke={T.accent} fill="url(#pgbase)" strokeWidth={2.5} dot={false} />
            <Area type="monotone" dataKey="opt"  name="Optimistisch" stroke={T.green} fill="url(#pgopt)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Affordability */}
      <button onClick={() => setModal({ type:"afford" })}
        style={{ background:T.surface, border:"1px solid "+T.purple+"33", borderRadius:10, padding:14, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", WebkitTapHighlightColor:"transparent" }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.purple }}>Was kann ich mir leisten?</div>
          <div style={{ fontSize:10, color:T.textLow, marginTop:2 }}>Wachstum vs. Substanz — Affordability</div>
        </div>
        <div style={{ fontSize:20, color:T.purple }}>{">"}</div>
      </button>

      {/* Milestones */}
      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
        <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Meilensteine — Basis-Szenario</div>
        {milestones.map(t => {
          const hit = projection.find(d => d.base >= t);
          return (
            <div key={t} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid "+T.border, paddingBottom:8, marginBottom:8 }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.accent }}>{fmtE(t)}</div>
              {hit
                ? <div style={{ textAlign:"right" }}><div style={{ fontSize:12, fontWeight:700, color:T.green }}>Alter {hit.age}</div><div style={{ fontSize:9, color:T.textDim }}>in {hit.age-currentAge} J.</div></div>
                : <div style={{ fontSize:10, color:T.red }}>Nicht im Horizont</div>}
            </div>
          );
        })}
        {loanSummary.map(l => l.yrsLeft && (
          <div key={l.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid "+T.border, paddingBottom:8, marginBottom:8 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:T.purple }}>{l.name} schuldenfrei</div>
              <div style={{ fontSize:9, color:T.textDim }}>+{full(l.annuitat)}/Mo. frei</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.purple }}>{CY+l.yrsLeft}</div>
              <div style={{ fontSize:9, color:T.textDim }}>Alter {currentAge+l.yrsLeft}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
