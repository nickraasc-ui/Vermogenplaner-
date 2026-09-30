import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Tile, Section, ListRow, Avatar, Icon, fmtE, full, mlbl } from "./ui.jsx";
import { LIQUIDITY_CATS, LIQ_CLR, CY } from "../constants.js";
import OrgChart from "./OrgChart.jsx";

const RANGES = [ { k:10, lbl:"10J" }, { k:20, lbl:"20J" }, { k:0, lbl:"Max" } ];

export default function TabDashboard({ s, T, setModal, setTab, agg, cf, loanSummary, lastCI, snaps, totalMonthlyLoanPayment, projection, final, currentAge }) {
  const activeBuckets = (s.buckets||[]).filter(b => b.active !== false).length;
  const [orgOpen, setOrgOpen] = useState(false);
  const [range, setRange] = useState(0);

  const series = range ? projection.slice(0, range + 1) : projection;
  const end = series[series.length - 1] || {};
  const growth = (end.base || 0) - agg.net;

  const pctOf = (v) => agg.net > 0 ? (v / agg.net * 100) : 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28 }}>

      {/* Hero: net worth + projection chart */}
      <div>
        <div style={{ fontSize:14, color:T.textLow, fontWeight:500 }}>Nettovermögen</div>
        <div className="vp-num" style={{ fontSize:38, fontWeight:700, color:T.text, letterSpacing:"-0.035em", lineHeight:1.15, marginTop:2 }}>
          {full(agg.net)}
        </div>
        <div className="vp-num" style={{ fontSize:14, marginTop:4, display:"flex", gap:6, flexWrap:"wrap" }}>
          <span style={{ color: growth >= 0 ? T.green : T.red, fontWeight:600 }}>
            {growth >= 0 ? "▲" : "▼"} {fmtE(Math.abs(growth))}
          </span>
          <span style={{ color:T.textLow }}>Prognose bis Alter {end.age ?? currentAge}</span>
        </div>

        <div style={{ height:170, margin:"16px -4px 0" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top:6, right:4, left:4, bottom:0 }}>
              <defs>
                <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.green} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={T.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="age" hide />
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip cursor={{ stroke:T.textDim, strokeWidth:1 }}
                content={({ active, payload }) => active && payload?.length ? (
                  <div style={{ background:T.sheet, border:"1px solid "+T.border, borderRadius:10, padding:"6px 10px", fontSize:13 }}>
                    <div style={{ color:T.textLow }}>Alter {payload[0].payload.age}</div>
                    <div className="vp-num" style={{ color:T.text, fontWeight:600 }}>{full(payload[0].value)}</div>
                  </div>
                ) : null} />
              <Area type="monotone" dataKey="base" stroke={T.green} strokeWidth={2} fill="url(#heroFill)" dot={false} activeDot={{ r:4, fill:T.green, stroke:T.bg, strokeWidth:2 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display:"flex", gap:6, marginTop:8 }}>
          {RANGES.map(r => (
            <button key={r.k} onClick={() => setRange(r.k)}
              style={{ flex:1, padding:"7px 0", borderRadius:999, border:"none", cursor:"pointer", fontSize:13, fontWeight:600,
                background: range === r.k ? T.surfaceHigh : "transparent", color: range === r.k ? T.text : T.textLow }}>
              {r.lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display:"flex", justifyContent:"space-around" }}>
        {[
          { lbl:"Check-in",  sub:lastCI ? mlbl(lastCI.month) : "Noch keiner", icon:"checkin", onClick:() => setModal({ type:"checkin" }) },
          { lbl:"Snapshot",  sub:(s.snapshots?.length||0)+" gespeichert",      icon:"camera",  onClick:() => setModal({ type:"snapshot" }) },
          { lbl:"Szenarien", sub:activeBuckets ? activeBuckets+" aktiv" : "Keine aktiv", icon:"layers", onClick:() => setTab("buckets") },
        ].map(({ lbl, sub, icon, onClick }) => (
          <button key={lbl} onClick={onClick}
            style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6, color:T.text, padding:0, minWidth:90 }}>
            <span style={{ width:52, height:52, borderRadius:"50%", background:T.surfaceHigh, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name={icon} size={22} />
            </span>
            <span style={{ fontSize:13, fontWeight:600 }}>{lbl}</span>
            <span style={{ fontSize:12, color:T.textLow, marginTop:-4 }}>{sub}</span>
          </button>
        ))}
      </div>

      <Section title="Kennzahlen" T={T}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"18px 16px" }}>
          <Tile label={"Prognose mit "+(final.age ?? "")} value={fmtE(final.base)} sub={"Konservativ "+fmtE(final.cons)} T={T} />
          <Tile label="Sparrate" value={full(cf.eff)+"/Mo."} sub={"Sparquote "+cf.quote.toFixed(1)+" %"} T={T} />
          <Tile label="Ø Rendite" value={agg.wavgReturn.toFixed(1)+" %"} sub="aktuelle Allokation" T={T} />
          <Tile label="Szenarien" value={String(activeBuckets)} sub={activeBuckets ? "in Projektion" : "keine aktiv"} onClick={() => setTab("buckets")} T={T} />
        </div>
      </Section>

      <Section title="Liquidität" T={T}>
        <div style={{ display:"flex", gap:3, height:6, marginBottom:6 }}>
          {LIQUIDITY_CATS.map(l => {
            const w = pctOf(agg.byLiquidity[l]||0);
            return w > 0 ? <div key={l} style={{ width:w+"%", background:LIQ_CLR[l], borderRadius:3 }} /> : null;
          })}
        </div>
        {LIQUIDITY_CATS.map((l, i) => (
          <ListRow key={l} T={T} last={i === LIQUIDITY_CATS.length - 1}
            leading={<span style={{ width:10, height:10, borderRadius:"50%", background:LIQ_CLR[l], flexShrink:0 }} />}
            title={l}
            value={full(agg.byLiquidity[l]||0)}
            valueSub={pctOf(agg.byLiquidity[l]||0).toFixed(0)+" %"} />
        ))}
      </Section>

      {loanSummary.length > 0 && (
        <Section title="Darlehen" T={T}>
          {loanSummary.map(l => (
            <ListRow key={l.id} T={T}
              leading={<Avatar icon="bank" color={T.surfaceHigh} fg={T.text} />}
              title={l.name}
              subtitle={"Rest "+fmtE(l.debt)+(l.yrsLeft ? " · frei "+(CY+l.yrsLeft)+" (Alter "+(currentAge+l.yrsLeft)+")" : "")}
              value={full(l.annuitat)+"/Mo."}
              valueSub={"Zins "+full(l.zinsen)} />
          ))}
          <ListRow T={T} last title="Gesamt pro Monat" value={full(totalMonthlyLoanPayment)} />
        </Section>
      )}

      {lastCI && (() => {
        const ausgaben = lastCI.streamExp_ist ?? lastCI.ausgaben_ist ?? 0;
        const dA = ausgaben - cf.streamExpense;
        const dS = (lastCI.sparrate_ist||0) - cf.eff;
        const hasInc = lastCI.inc_ist != null;
        const dI = hasInc ? (lastCI.inc_ist||0) - cf.avail : null;
        const rows = hasInc ? [
          { lbl:"Einnahmen", val:lastCI.inc_ist, delta:dI, inv:false },
          { lbl:"Ausgaben", val:ausgaben, delta:dA, inv:true },
          { lbl:"Investiert", val:lastCI.sparrate_ist, delta:dS, inv:false },
        ] : [
          { lbl:"Ausgaben", val:ausgaben, delta:dA, inv:true },
          { lbl:"Investiert", val:lastCI.sparrate_ist, delta:dS, inv:false },
          { lbl:"Reserven", val:lastCI.reserven_ist, delta:null },
        ];
        return (
          <Section title={"Check-in "+mlbl(lastCI.month)} T={T}>
            {rows.map(({ lbl, val, delta, inv }, i) => (
              <ListRow key={lbl} T={T} last={i === rows.length - 1} title={lbl} value={full(val)}
                valueSub={delta !== null ? (delta >= 0 ? "+" : "")+full(delta)+" vs. Plan" : undefined}
                valueSubColor={delta !== null ? ((inv ? delta > 0 : delta < 0) ? T.red : T.green) : undefined} />
            ))}
          </Section>
        );
      })()}

      {snaps.length >= 2 && (
        <Section title="Verlauf" T={T}>
          <div style={{ height:120, margin:"0 -4px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snaps} margin={{ top:4, right:4, left:4, bottom:0 }}>
                <XAxis dataKey="date" tick={{ fill:T.textDim, fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip formatter={v => [full(v), "Nettovermögen"]} contentStyle={{ background:T.sheet, border:"1px solid "+T.border, borderRadius:10, fontSize:13, color:T.text }} />
                <Area type="monotone" dataKey="value" stroke={T.text} fill="none" strokeWidth={2} dot={{ fill:T.text, r:2.5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      <Section title="Struktur" T={T}>
        <ListRow T={T} last onClick={() => setOrgOpen(o => !o)}
          leading={<Avatar icon="users" color={T.surfaceHigh} fg={T.text} />}
          title="Organogramm"
          subtitle={(s.owners||[]).length+" Eigentümer · Beteiligungen & Familie"}
          trailing={<span style={{ color:T.textDim, transform: orgOpen ? "rotate(180deg)" : "none", transition:"transform .2s" }}><Icon name="down" size={18} /></span>} />
        {orgOpen && (
          <div style={{ paddingTop:8 }}>
            <OrgChart s={s} T={T} setModal={setModal} />
          </div>
        )}
      </Section>
    </div>
  );
}
