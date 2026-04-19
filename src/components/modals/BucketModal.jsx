import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, full, uid } from "../ui.jsx";
import { CY, BCK_CLRS } from "../../constants.js";

const SCENARIO_TYPES = [
  { key:"ausgabe",  label:"Ausgabe",            icon:"↓", color:"#ef4444", desc:"Einmalige oder wiederkehrende Kosten aus dem Portfolio" },
  { key:"zufluss",  label:"Zufluss",             icon:"↑", color:"#10b981", desc:"Erbschaft, Bonus, Verkaufserlös — erhöht das Portfolio" },
  { key:"sparrate", label:"Sparratenänderung",   icon:"⇄", color:"#f59e0b", desc:"Gehaltserhöhung, Renteneintritt, Teilzeit — ändert den Spar-Cashflow" },
  { key:"finanziert",label:"Finanziert",         icon:"≡", color:"#38bdf8", desc:"Monatliche Rate reduziert Sparrate im Finanzierungszeitraum" },
];

export default function BucketModal({ data, s, T, setModal, updArr }) {
  const inferCategory = (d) => {
    if (!d) return "ausgabe";
    if (d.type === "Zufluss") return "zufluss";
    if (d.type === "Sparrate") return "sparrate";
    if (d.fundingMode === "financed") return "finanziert";
    return "ausgabe";
  };

  const [category, setCategory] = useState(() => inferCategory(data));
  const [f, setF] = useState(data || {
    name: "", amount: "", year: "", age: "", color: BCK_CLRS[0], note: "",
    type: "Einmalig", fundingMode: "lump_sum",
    monthlyPayment: "", financingMonths: "", financingStart: "",
    delta: "", startsAt: "", endsAt: "",
    active: true,
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const ct = SCENARIO_TYPES.find(t => t.key === category);
  const horizon = s.horizon || 35;

  const totalCost = category === "finanziert"
    ? (+f.monthlyPayment||0) * (+f.financingMonths||0)
    : (+f.amount||0);

  const impactYears = (() => {
    const ty = f.year ? +f.year : f.age ? CY + (+f.age - (CY - (s.birthYear||CY-35))) : CY;
    return Math.max(0, (CY + horizon) - ty);
  })();
  const wavg = (() => {
    const cr = s.classReturns || {};
    const vals = Object.values(cr);
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 6;
  })();
  const growFactor = (yrs) => Math.pow(1 + wavg/100, yrs);
  const roughImpact = (() => {
    if (category === "ausgabe") {
      if (f.type==="Einmalig") return -(+f.amount||0) * growFactor(impactYears);
      if (f.type==="Jährlich") return -(+f.amount||0) * impactYears * growFactor(impactYears/2);
      if (f.type==="Monatlich") return -(+f.amount||0)*12 * impactYears * growFactor(impactYears/2);
    }
    if (category === "zufluss") return (+f.amount||0) * growFactor(impactYears);
    if (category === "sparrate") {
      const d = +f.delta||0;
      const from = +f.startsAt||CY, to = f.endsAt ? +f.endsAt : CY+horizon;
      const yrs = Math.max(0, Math.min(to, CY+horizon) - from);
      return wavg > 0 ? d * 12 * ((Math.pow(1+wavg/100, yrs)-1) / (wavg/100)) : d*12*yrs;
    }
    return null;
  })();

  const sectionBox = { background: T.surfaceHigh, border: "1px solid "+T.border, borderRadius: 8, padding: 12, marginBottom: 12 };

  return (
    <Sheet title={data?.id ? "Szenario bearbeiten" : "Szenario anlegen"} onClose={() => setModal(null)} T={T}>

      {/* Active toggle */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:"10px 14px", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:T.text }}>Szenario aktiv</div>
          <div style={{ fontSize:9, color:T.textDim, marginTop:1 }}>Aktive Szenarien fließen in die Projektion ein</div>
        </div>
        <div onClick={() => set("active", !f.active)}
          style={{ width:44, height:24, borderRadius:12, background:f.active ? T.green : T.border, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
          <div style={{ position:"absolute", top:3, left:f.active?22:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }}/>
        </div>
      </div>

      <Inp label="Bezeichnung" value={f.name} onChange={v => set("name",v)} placeholder="z.B. Hauskauf, Erbschaft, Rente..." T={T} />

      {/* Category selector */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Szenario-Typ</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          {SCENARIO_TYPES.map(t => (
            <button key={t.key} onClick={() => setCategory(t.key)}
              style={{ padding:"8px 10px", borderRadius:8, border:"1px solid "+(category===t.key ? t.color : T.border),
                background: category===t.key ? t.color+"18" : "transparent",
                color: category===t.key ? t.color : T.textMid,
                cursor:"pointer", textAlign:"left", WebkitTapHighlightColor:"transparent" }}>
              <div style={{ fontSize:14, lineHeight:1 }}>{t.icon}</div>
              <div style={{ fontSize:10, fontWeight:700, marginTop:3 }}>{t.label}</div>
            </button>
          ))}
        </div>
        {ct && <div style={{ fontSize:9, color:T.textDim, marginTop:6 }}>{ct.desc}</div>}
      </div>

      {/* AUSGABE */}
      {category === "ausgabe" && (
        <div style={sectionBox}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <SelEl label="Häufigkeit" value={f.type==="Zufluss"||f.type==="Sparrate"?"Einmalig":f.type}
              onChange={v => set("type",v)} options={["Einmalig","Jährlich","Monatlich"]} T={T} />
            <Inp label="Betrag (€)" value={f.amount} onChange={v => set("amount",v)} type="number" T={T} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Inp label="Zieljahr" value={f.year} onChange={v => set("year",v)} type="number" placeholder={String(CY+2)} T={T} />
            <Inp label="oder Alter" value={f.age} onChange={v => set("age",v)} type="number" placeholder="45" T={T} />
          </div>
        </div>
      )}

      {/* ZUFLUSS */}
      {category === "zufluss" && (
        <div style={sectionBox}>
          <Inp label="Zufluss-Betrag (€)" value={f.amount} onChange={v => set("amount",v)} type="number" placeholder="z.B. 300000" T={T} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Inp label="Im Jahr" value={f.year} onChange={v => set("year",v)} type="number" placeholder={String(CY+5)} T={T} />
            <Inp label="oder Alter" value={f.age} onChange={v => set("age",v)} type="number" placeholder="50" T={T} />
          </div>
          <div style={{ fontSize:9, color:T.green, marginTop:4 }}>
            Erhöht den Portfoliowert einmalig um {full(+f.amount||0)} zum Zieljahr
          </div>
        </div>
      )}

      {/* SPARRATENÄNDERUNG */}
      {category === "sparrate" && (
        <div style={sectionBox}>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Monatliche Änderung</div>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              {[["positiv","+ Erhöhung","#10b981"],["negativ","− Reduktion","#ef4444"]].map(([k,l,c]) => {
                const isPos = (+f.delta||0) >= 0;
                const active = k==="positiv" ? isPos : !isPos;
                return (
                  <button key={k} onClick={() => set("delta", k==="positiv" ? Math.abs(+f.delta||0) : -Math.abs(+f.delta||0))}
                    style={{ flex:1, padding:"7px 0", borderRadius:7, border:"1px solid "+(active?c:T.border), background:active?c+"18":"transparent", color:active?c:T.textMid, cursor:"pointer", fontSize:11, fontWeight:700, WebkitTapHighlightColor:"transparent" }}>
                    {l}
                  </button>
                );
              })}
            </div>
            <Inp label="Betrag/Monat (€)" value={Math.abs(+f.delta||0)||""} onChange={v => {
              const sign = (+f.delta||0) < 0 ? -1 : 1;
              set("delta", sign * (+v||0));
            }} type="number" placeholder="500" T={T} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Inp label="Ab Jahr" value={f.startsAt} onChange={v => set("startsAt",v)} type="number" placeholder={String(CY+1)} T={T} />
            <Inp label="Bis Jahr (opt.)" value={f.endsAt} onChange={v => set("endsAt",v)} type="number" placeholder="unbegrenzt" T={T} />
          </div>
          {(+f.delta||0) !== 0 && (
            <div style={{ fontSize:9, color:(+f.delta||0)>0?T.green:T.red, marginTop:4 }}>
              {(+f.delta||0)>0?"+" : ""}{full(+f.delta||0)}/Mo.
              {" "}{(+f.delta||0)>0?"erhöht":"reduziert"} die Sparrate
              {f.startsAt ? " ab "+f.startsAt : ""}
              {f.endsAt ? " bis "+f.endsAt : " dauerhaft"}
            </div>
          )}
        </div>
      )}

      {/* FINANZIERT */}
      {category === "finanziert" && (
        <div style={sectionBox}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Inp label="Kaufpreis (€)" value={f.amount} onChange={v => set("amount",v)} type="number" placeholder="0" T={T} />
            <Inp label="Rate/Mo. (€)" value={f.monthlyPayment} onChange={v => set("monthlyPayment",v)} type="number" placeholder="0" T={T} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Inp label="Laufzeit (Monate)" value={f.financingMonths} onChange={v => set("financingMonths",v)} type="number" placeholder="48" T={T} />
            <Inp label="Finanzierungsstart" value={f.financingStart} onChange={v => set("financingStart",v)} type="number" placeholder={String(CY)} T={T} />
          </div>
          {(+f.monthlyPayment||0) > 0 && (+f.financingMonths||0) > 0 && (
            <div style={{ fontSize:9, color:T.amber, marginTop:4 }}>
              {full(+f.monthlyPayment||0)}/Mo. × {f.financingMonths} Mo. = {full(totalCost)} gesamt
            </div>
          )}
        </div>
      )}

      {/* Rough impact preview */}
      {roughImpact !== null && Math.abs(roughImpact) > 0 && (
        <div style={{ background: roughImpact>0?T.green+"0d":T.red+"0d", border:"1px solid "+(roughImpact>0?T.green:T.red)+"33", borderRadius:8, padding:"10px 13px", marginBottom:12 }}>
          <div style={{ fontSize:9, color:T.textDim, marginBottom:2 }}>Geschätzter Projektionseffekt (am Horizont, inkl. entgangener Rendite)</div>
          <div style={{ fontSize:15, fontWeight:900, color:roughImpact>0?T.green:T.red }}>
            {roughImpact>0?"+":""}{full(roughImpact)}
          </div>
          <div style={{ fontSize:8, color:T.textDim, marginTop:1 }}>Ø {wavg.toFixed(1)}% Wachstum angenommen — schalte Szenario aus/ein zum Vergleich</div>
        </div>
      )}

      {/* Color */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Farbe</div>
        <div style={{ display:"flex", gap:8 }}>
          {BCK_CLRS.map(c => (
            <div key={c} onClick={() => set("color",c)}
              style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", border:f.color===c?"3px solid "+T.text:"3px solid transparent" }} />
          ))}
        </div>
      </div>

      <Btn full color={T.green} T={T} onClick={() => {
        const finalType = category==="zufluss" ? "Zufluss"
          : category==="sparrate" ? "Sparrate"
          : category==="finanziert" ? (f.type||"Einmalig")
          : (f.type||"Einmalig");
        const b = {
          ...f, id:f.id||uid(),
          type: finalType,
          fundingMode: category==="finanziert" ? "financed" : "lump_sum",
          amount: +f.amount||0,
          monthlyPayment: +f.monthlyPayment||0,
          financingMonths: +f.financingMonths||0,
          financingStart: +f.financingStart||CY,
          delta: +f.delta||0,
          startsAt: +f.startsAt||0,
          endsAt: f.endsAt ? +f.endsAt : null,
          active: f.active !== false,
        };
        if (data?.id) updArr("buckets", s.buckets.map(x => x.id===b.id ? b : x));
        else updArr("buckets", [...(s.buckets||[]), b]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
