import { useMemo } from "react";
import { fmtE, full, Section, ListRow, Avatar, LinkBtn, Icon, Btn, Tile } from "./ui.jsx";
import { CY } from "../constants.js";
import { profileAge } from "../model/schema.js";
import { scenarioImpact, scenariosTotalImpact } from "../model/derive.js";

const KIND_META = {
  ausgabe:    { icon:"arrowUp",   label:"Ausgabe" },
  zufluss:    { icon:"arrowDown", label:"Zufluss" },
  sparrate:   { icon:"swap",      label:"Einnahmenänderung" },
  finanziert: { icon:"card",      label:"Finanziert" },
};
const FREQ_LABEL = { einmalig:"einmalig", jaehrlich:"jährlich", monatlich:"monatlich" };

const getMeta = (b) => {
  const m = KIND_META[b.kind] || { icon:"layers", label:b.kind };
  return b.kind === "ausgabe" ? { ...m, label: m.label + " " + (FREQ_LABEL[b.frequency] || "") } : m;
};

const getDesc = (b, s) => {
  const ty = b.year ? +b.year : b.age ? CY + (+b.age - profileAge(s)) : null;
  const away = ty ? ty - CY : null;
  const when = ty ? " · " + ty + (away !== null ? " (in " + away + " J.)" : "") : "";
  if (b.kind === "finanziert") {
    const sy = +(b.financingStart||b.year||CY);
    const endY = sy + Math.ceil((+b.financingMonths||0)/12);
    return `${full(+b.monthlyPayment||0)}/Mo. × ${b.financingMonths} Mo. · ${sy}–${endY}${b.amount>0?" · "+full(b.amount)+" Kaufpreis":""}`;
  }
  if (b.kind === "sparrate") {
    const sign = (+b.delta||0) >= 0 ? "+" : "";
    const topf = b.spartopfMode === "manuell" ? " · Spartöpfe manuell" : "";
    return `${sign}${full(+b.delta||0)}/Mo.${b.startsAt?" ab "+b.startsAt:""}${b.endsAt?" bis "+b.endsAt:" dauerhaft"}${topf}`;
  }
  if (b.kind === "zufluss") return `${full(b.amount||0)} einmalig${when}`;
  return `${full(b.amount||0)}${b.frequency==="monatlich"?"/Mo.":b.frequency==="jaehrlich"?"/J.":""}${when}`;
};

export default function TabBuckets({ s, T, upd, updArr, setModal, agg, final, currentAge }) {
  const buckets = s.buckets || [];
  const active   = buckets.filter(b => b.active !== false);
  const inactive = buckets.filter(b => b.active === false);

  // Exact effect of each scenario on the base projection (with vs. without it)
  const impacts = useMemo(() => Object.fromEntries(buckets.map(b => [b.id, scenarioImpact(s, b)])), [s]);
  const totalImpact = useMemo(() => scenariosTotalImpact(s), [s]);

  const toggle = (id) => {
    updArr("buckets", buckets.map(b => b.id===id ? {...b, active: b.active===false} : b));
  };

  const Switch = ({ on, onClick, label }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ width:46, height:28, borderRadius:14, border:"none", padding:0, background:on?T.green:T.borderHigh, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
      <span style={{ position:"absolute", top:3, left:on?21:3, width:22, height:22, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }}/>
    </button>
  );

  const renderRow = (b, i, arr) => {
    const meta = getMeta(b);
    const impact = impacts[b.id] || 0;
    const isActive = b.active !== false;
    return (
      <div key={b.id} style={{ opacity:isActive?1:0.5, transition:"opacity 0.2s" }}>
        <ListRow T={T} last={i === arr.length - 1} onClick={() => setModal({ type:"bucket", data:b })}
          leading={<Avatar icon={meta.icon} color={T.surfaceHigh} fg={T.text} />}
          title={b.name || "Unbenannt"}
          subtitle={meta.label+" · "+getDesc(b, s)}
          valueSub={Math.abs(impact) > 100 ? (impact > 0 ? "+" : "")+fmtE(impact) : undefined}
          valueSubColor={impact > 0 ? T.green : T.red}
          trailing={<Switch on={isActive} onClick={() => toggle(b.id)} label={(isActive ? "Deaktivieren: " : "Aktivieren: ")+(b.name||"Szenario")} />} />
      </div>
    );
  };

  const addAction = <LinkBtn T={T} onClick={() => setModal({ type:"bucket", data:null })}><Icon name="plus" size={16} /> Hinzufügen</LinkBtn>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28 }}>

      {buckets.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          <Tile label="Aktiv" value={active.length+" / "+buckets.length} T={T} />
          <Tile label="Effekt" value={(totalImpact>=0?"+":"")+fmtE(totalImpact)} T={T} />
          <Tile label="Prognose" value={fmtE(final?.base||0)} T={T} />
        </div>
      )}

      {buckets.length === 0 ? (
        <Section title="Szenarien" action={addAction} T={T}>
          <div style={{ fontSize:14, color:T.textLow, marginBottom:8, lineHeight:1.5 }}>
            Plane Ereignisse und sieh, wie sie dein Vermögen verändern.
          </div>
          {[
            ["arrowUp","Ausgabe","Autokauf, Renovierung, Schulgeld"],
            ["arrowDown","Zufluss","Erbschaft, Bonus, Immobilienverkauf"],
            ["swap","Einnahmenänderung","Gehaltserhöhung, Rente, Teilzeit"],
            ["card","Finanziert","Kreditrate reduziert die Sparrate"],
          ].map(([icon, label, ex], i, arr) => (
            <ListRow key={label} T={T} last={i === arr.length - 1}
              leading={<Avatar icon={icon} color={T.surfaceHigh} fg={T.text} />} title={label} subtitle={ex} />
          ))}
          <div style={{ marginTop:20 }}>
            <Btn full T={T} onClick={() => setModal({ type:"bucket", data:null })}>Erstes Szenario anlegen</Btn>
          </div>
        </Section>
      ) : (
        <>
          {active.length > 0 && (
            <Section title="Aktiv" action={addAction} T={T}>
              {active.map(renderRow)}
            </Section>
          )}
          {inactive.length > 0 && (
            <Section title="Deaktiviert" action={active.length === 0 ? addAction : undefined} T={T}>
              {inactive.map(renderRow)}
            </Section>
          )}
          <div style={{ fontSize:13, color:T.textLow, lineHeight:1.5 }}>
            Aktive Szenarien fließen in die Projektion ein. Zum Vergleich einfach aus- und wieder einschalten.
          </div>
        </>
      )}
    </div>
  );
}
