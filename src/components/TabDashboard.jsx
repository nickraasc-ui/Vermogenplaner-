import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Tile, fmtE, full, mlbl } from "./ui.jsx";
import { LIQUIDITY_CATS, LIQ_CLR, CY } from "../constants.js";

export default function TabDashboard({ s, T, setModal, agg, cf, loanSummary, lastCI, snaps, totalMonthlyLoanPayment, projection, final, currentAge }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
        {[
          { lbl:"Check-in", sub:lastCI ? mlbl(lastCI.month) : "Noch keiner", type:"checkin", color:T.accent },
          { lbl:"Snapshot", sub:(s.snapshots?.length||0)+" gespeichert", type:"snapshot", color:T.green },
          { lbl:"Leisten?", sub:"Affordability", type:"afford", color:T.purple },
        ].map(({ lbl, sub, type, color }) => (
          <button key={type} onClick={() => setModal({ type })}
            style={{ background:T.surface, border:"1px solid "+color+"22", borderRadius:12, padding:"13px 6px", cursor:"pointer", textAlign:"center", WebkitTapHighlightColor:"transparent" }}>
            <div style={{ fontSize:11, fontWeight:700, color }}>{lbl}</div>
            <div style={{ fontSize:8, color:T.textLow, marginTop:3 }}>{sub}</div>
          </button>
        ))}
      </div>

      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
        <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Liquidität des Vermögens</div>
        <div style={{ display:"flex", borderRadius:6, overflow:"hidden", height:10, marginBottom:10 }}>
          {LIQUIDITY_CATS.map(l => {
            const w = agg.net > 0 ? ((agg.byLiquidity[l]||0) / agg.net * 100) : 0;
            return w > 0 ? <div key={l} style={{ width:w+"%", background:LIQ_CLR[l] }} /> : null;
          })}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {LIQUIDITY_CATS.map(l => (
            <div key={l} style={{ borderTop:"3px solid "+LIQ_CLR[l], paddingTop:6 }}>
              <div style={{ fontSize:9, color:LIQ_CLR[l], fontWeight:700 }}>{l}</div>
              <div style={{ fontSize:13, fontWeight:900, color:T.text }}>{fmtE(agg.byLiquidity[l]||0)}</div>
              <div style={{ fontSize:9, color:T.textDim }}>{agg.net > 0 ? ((agg.byLiquidity[l]||0) / agg.net * 100).toFixed(0)+"%" : "0%"}</div>
            </div>
          ))}
        </div>
      </div>

      {loanSummary.length > 0 && (
        <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Laufende Darlehen</div>
          {loanSummary.map(l => (
            <div key={l.id} style={{ borderBottom:"1px solid "+T.border, paddingBottom:8, marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{l.name}</div>
                  <div style={{ fontSize:9, color:T.textDim, marginTop:1 }}>
                    Restschuld {full(l.debt)} | Zinsen {full(l.zinsen)}/Mo. | Tilgung {full(l.tilgung)}/Mo.
                  </div>
                  {l.yrsLeft && <div style={{ fontSize:9, color:T.accent, marginTop:1 }}>Schuldenfrei ca. {CY+l.yrsLeft} (Alter {currentAge+l.yrsLeft})</div>}
                </div>
                <div style={{ fontSize:12, fontWeight:800, color:T.red }}>{full(l.annuitat)}/Mo.</div>
              </div>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", paddingTop:4 }}>
            <span style={{ fontSize:10, color:T.textMid }}>Gesamt Annuität/Mo.</span>
            <span style={{ fontSize:13, fontWeight:900, color:T.red }}>{full(totalMonthlyLoanPayment)}</span>
          </div>
        </div>
      )}

      {lastCI && (() => {
        const dA = (lastCI.ausgaben_ist||0) - cf.streamExpense;
        const dS = (lastCI.sparrate_ist||0) - cf.eff;
        return (
          <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
            <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Check-in {mlbl(lastCI.month)}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[{ lbl:"Ausgaben IST", val:full(lastCI.ausgaben_ist), delta:dA, inv:true }, { lbl:"Investiert", val:full(lastCI.sparrate_ist), delta:dS, inv:false }, { lbl:"Reserven", val:full(lastCI.reserven_ist), delta:null }].map(({ lbl, val, delta, inv }) => (
                <div key={lbl}>
                  <div style={{ fontSize:9, color:T.textDim }}>{lbl}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:T.text }}>{val}</div>
                  {delta !== null && <div style={{ fontSize:9, color:(inv?delta>0:delta<0)?T.red:T.green, marginTop:1 }}>{delta >= 0 ? "+" : ""}{full(delta)} vs Plan</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {snaps.length >= 2 && (
        <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:"13px 4px 8px" }}>
          <div style={{ paddingLeft:12, fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Nettovermögen-Verlauf</div>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={snaps} margin={{ top:4, right:8, left:0, bottom:0 }}>
              <defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.accent} stopOpacity={0.3} /><stop offset="95%" stopColor={T.accent} stopOpacity={0.02} /></linearGradient></defs>
              <XAxis dataKey="date" tick={{ fill:T.textLow, fontSize:8 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:T.textLow, fontSize:8 }} tickFormatter={fmtE} width={46} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => [full(v), "Nettovermögen"]} contentStyle={{ background:T.surface, border:"1px solid "+T.border, borderRadius:6, fontSize:10, color:T.text }} />
              <Area type="monotone" dataKey="value" stroke={T.accent} fill="url(#gs)" strokeWidth={2} dot={{ fill:T.accent, r:3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <Tile label="Basis-Projektion" value={fmtE(final.base)} sub={"Konservativ: "+fmtE(final.cons)} color={T.accent} T={T} />
        <Tile label="Eff. Sparrate" value={full(cf.eff)+"/Mo."} sub={"Sparquote "+cf.quote.toFixed(1)+"%"} color={T.green} T={T} />
        <Tile label="Gew. Avg-Rendite" value={agg.wavgReturn.toFixed(1)+"%"} sub={"auf Basis aktueller Allokation"} color={T.amber} T={T} />
        <Tile label="Aktive Buckets" value={String(s.buckets?.length||0)} sub={s.buckets?.length?"Fließt in Projektion":"Noch keine"} color={T.purple} T={T} />
      </div>
    </div>
  );
}
