import { fmtE, full, Section, ListRow, Avatar, LinkBtn, Icon, Btn, Tile } from "./ui.jsx";
import { CY } from "../constants.js";

const TYPE_META = {
  "Einmalig":  { icon:"arrowUp",   label:"Ausgabe einmalig" },
  "Jährlich":  { icon:"arrowUp",   label:"Ausgabe jährlich" },
  "Monatlich": { icon:"arrowUp",   label:"Ausgabe monatlich" },
  "Zufluss":   { icon:"arrowDown", label:"Zufluss" },
  "Sparrate":  { icon:"swap",      label:"Einnahmenänderung" },
  "financed":  { icon:"card",      label:"Finanziert" },
};

const getMeta = (b) => {
  if (b.fundingMode === "financed") return TYPE_META["financed"];
  return TYPE_META[b.type] || { icon:"layers", label:b.type };
};

const getDesc = (b, currentAge, s) => {
  const ty = b.year ? +b.year : b.age ? CY+(+b.age-(CY-(s.birthYear||CY-35))) : null;
  const away = ty ? ty - CY : null;
  if (b.fundingMode === "financed") {
    const sy = +(b.financingStart||b.year||CY);
    const endY = sy + Math.ceil((+b.financingMonths||0)/12);
    return `${full(+b.monthlyPayment||0)}/Mo. × ${b.financingMonths} Mo. · ${sy}–${endY}${b.amount>0?" · "+full(b.amount)+" Kaufpreis":""}`;
  }
  if (b.type === "Sparrate") {
    const sign = (+b.delta||0) >= 0 ? "+" : "";
    const topf = b.spartopfMode === "manuell"
      ? " · Spartöpfe manuell"
      : "";
    return `${sign}${full(+b.delta||0)}/Mo.${b.startsAt?" ab "+b.startsAt:""}${b.endsAt?" bis "+b.endsAt:" dauerhaft"}${topf}`;
  }
  if (b.type === "Zufluss") return `${full(b.amount||0)} einmalig${ty?" in "+ty+(away!==null?" (in "+away+" J.)":""):""}`;
  return `${full(b.amount||0)}${b.type==="Monatlich"?"/Mo.":b.type==="Jährlich"?"/J.":""}${ty?" · "+ty+(away!==null?" (in "+away+" J.)":""):""}`;
};

// Rough impact: how much does this scenario change the portfolio at horizon end?
const roughImpact = (b, s, currentAge) => {
  const horizon = s.horizon || 35;
  const cr = s.classReturns || {};
  const vals = Object.values(cr);
  const wavg = vals.length ? vals.reduce((a,v)=>a+v,0)/vals.length : 6;
  const growFactor = (yrs) => Math.pow(1 + wavg/100, Math.max(0, yrs));
  const ty = b.year ? +b.year : b.age ? CY+(+b.age-(CY-(s.birthYear||CY-35))) : CY;
  const impactYrs = Math.max(0, (CY+horizon) - ty);

  if (b.fundingMode === "financed") {
    const sp = (+b.monthlyPayment||0) * 12;
    const yrs = Math.ceil((+b.financingMonths||0)/12);
    return wavg > 0 ? -sp * ((Math.pow(1+wavg/100,yrs)-1)/(wavg/100)) : -sp*yrs;
  }
  if (b.type === "Zufluss") return (+b.amount||0) * growFactor(impactYrs);
  if (b.type === "Sparrate") {
    const d = +b.delta||0;
    const from = +(b.startsAt||CY), to = b.endsAt ? +b.endsAt : CY+horizon;
    const yrs = Math.max(0, Math.min(to, CY+horizon) - from);
    return wavg > 0 ? d * 12 * ((Math.pow(1+wavg/100,yrs)-1)/(wavg/100)) : d*12*yrs;
  }
  if (b.type==="Einmalig") return -(+b.amount||0) * growFactor(impactYrs);
  if (b.type==="Jährlich") return -(+b.amount||0) * impactYrs * growFactor(impactYrs/2);
  if (b.type==="Monatlich") return -(+b.amount||0)*12 * impactYrs * growFactor(impactYrs/2);
  return 0;
};

export default function TabBuckets({ s, T, upd, updArr, setModal, agg, final, currentAge }) {
  const buckets = s.buckets || [];
  const active   = buckets.filter(b => b.active !== false);
  const inactive = buckets.filter(b => b.active === false);

  const totalImpact = active.reduce((t, b) => t + roughImpact(b, s, currentAge), 0);

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
    const impact = roughImpact(b, s, currentAge);
    const isActive = b.active !== false;
    return (
      <div key={b.id} style={{ opacity:isActive?1:0.5, transition:"opacity 0.2s" }}>
        <ListRow T={T} last={i === arr.length - 1} onClick={() => setModal({ type:"bucket", data:b })}
          leading={<Avatar icon={meta.icon} color={T.surfaceHigh} fg={T.text} />}
          title={b.name || "Unbenannt"}
          subtitle={meta.label+" · "+getDesc(b, currentAge, s)}
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
          <Tile label="Effekt (ca.)" value={(totalImpact>=0?"+":"")+fmtE(totalImpact)} T={T} />
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
