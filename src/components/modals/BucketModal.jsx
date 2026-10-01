import { useState, useMemo } from "react";
import { Sheet, Inp, SelEl, Btn, Icon, full } from "../ui.jsx";
import { normalizeBucket, FREQUENCIES } from "../../model/schema.js";
import { scenarioImpact } from "../../model/derive.js";
import { CY, BCK_CLRS, ASSET_CLASSES } from "../../constants.js";

const SCENARIO_TYPES = [
  { key:"ausgabe",  label:"Ausgabe",              icon:"arrowUp", color:"#ec6a6a", desc:"Einmalige oder wiederkehrende Kosten aus dem Portfolio" },
  { key:"zufluss",  label:"Zufluss",               icon:"arrowDown", color:"#3cbf8a", desc:"Erbschaft, Bonus, Verkaufserlös — erhöht das Portfolio" },
  { key:"sparrate", label:"Einnahmenänderung",     icon:"swap", color:"#e3aa45", desc:"Gehaltserhöhung, Renteneintritt, Teilzeit — ändert den Spar-Cashflow" },
  { key:"finanziert",label:"Finanziert",           icon:"card", color:"#5b8def", desc:"Monatliche Rate reduziert Sparrate im Finanzierungszeitraum" },
];

const INVESTABLE_CLASSES = ASSET_CLASSES.filter(c => !["Cash","Immobilien","Forderung","Sonstiges"].includes(c));

export default function BucketModal({ data, s, T, setModal, updArr }) {
  const [category, setCategory] = useState(() => data?.kind || "ausgabe");
  const [f, setF] = useState(data ? {
    spartopfMode: "proportional", spartopfAmounts: {}, ...data,
  } : {
    name: "", amount: "", year: "", age: "", color: BCK_CLRS[0], note: "",
    frequency: "einmalig",
    monthlyPayment: "", financingMonths: "", financingStart: "",
    delta: "", startsAt: "", endsAt: "",
    spartopfMode: "proportional", spartopfAmounts: {},
    active: true,
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const ct = SCENARIO_TYPES.find(t => t.key === category);

  const totalCost = category === "finanziert"
    ? (+f.monthlyPayment||0) * (+f.financingMonths||0)
    : (+f.amount||0);

  // Exact effect on the base projection at the horizon (projection with vs. without this scenario)
  const draft = (() => {
    try { return normalizeBucket({ ...f, id: f.id || "__draft__", kind: category }); } catch { return null; }
  })();
  const impact = useMemo(() => draft ? scenarioImpact(s, draft) : 0, [s, JSON.stringify(draft)]);

  const sectionBox = { background:"transparent", border:"1px solid "+T.border, borderRadius:16, padding: 12, marginBottom: 12 };

  return (
    <Sheet title={data?.id ? "Szenario bearbeiten" : "Szenario anlegen"} onClose={() => setModal(null)} T={T}>

      {/* Active toggle */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"transparent", border:"1px solid "+T.border, borderRadius:16, padding:"10px 14px", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:T.text }}>Szenario aktiv</div>
          <div style={{ fontSize:11, color:T.textDim, marginTop:1 }}>Aktive Szenarien fließen in die Projektion ein</div>
        </div>
        <div onClick={() => set("active", !f.active)}
          style={{ width:44, height:24, borderRadius:12, background:f.active ? T.green : T.border, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
          <div style={{ position:"absolute", top:3, left:f.active?22:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }}/>
        </div>
      </div>

      <Inp label="Bezeichnung" value={f.name} onChange={v => set("name",v)} placeholder="z.B. Hauskauf, Erbschaft, Rente..." T={T} />

      {/* Category selector */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:16, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:8 }}>Szenario-Typ</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          {SCENARIO_TYPES.map(t => (
            <button key={t.key} onClick={() => setCategory(t.key)}
              style={{ padding:"8px 10px", borderRadius:8, border:"1px solid "+(category===t.key ? T.text : T.border),
                background: category===t.key ? T.surfaceHigh : "transparent",
                color: category===t.key ? T.text : T.textMid,
                cursor:"pointer", textAlign:"left", WebkitTapHighlightColor:"transparent" }}>
              <Icon name={t.icon} size={18} />
              <div style={{ fontSize:12, fontWeight:600, marginTop:3 }}>{t.label}</div>
            </button>
          ))}
        </div>
        {ct && <div style={{ fontSize:11, color:T.textDim, marginTop:6 }}>{ct.desc}</div>}
      </div>

      {/* AUSGABE */}
      {category === "ausgabe" && (
        <div style={sectionBox}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <SelEl label="Häufigkeit" value={f.frequency || "einmalig"}
              onChange={v => set("frequency",v)} options={FREQUENCIES} T={T} />
            <Inp label="Betrag (€)" value={f.amount} onChange={v => set("amount",v)} type="number" T={T} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Inp label="Startet im Jahr" value={f.year} onChange={v => set("year",v)} type="number" placeholder={String(CY)} T={T} />
            <Inp label="oder Alter" value={f.age} onChange={v => set("age",v)} type="number" placeholder="45" T={T} />
          </div>
          {(f.frequency==="jaehrlich"||f.frequency==="monatlich") && (
            <Inp label="Endet im Jahr (opt.)" value={f.endsAt||""} onChange={v => set("endsAt", v ? +v : null)} type="number" placeholder="unbegrenzt" T={T} />
          )}
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
          <div style={{ fontSize:11, color:T.green, marginTop:4 }}>
            Erhöht den Portfoliowert einmalig um {full(+f.amount||0)} zum Zieljahr
          </div>
        </div>
      )}

      {/* EINNAHMENÄNDERUNG */}
      {category === "sparrate" && (
        <div style={sectionBox}>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:16, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:6 }}>Monatliche Änderung</div>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              {[["positiv","+ Erhöhung","#3cbf8a"],["negativ","− Reduktion","#ec6a6a"]].map(([k,l,c]) => {
                const isPos = (+f.delta||0) >= 0;
                const active = k==="positiv" ? isPos : !isPos;
                return (
                  <button key={k} onClick={() => set("delta", k==="positiv" ? Math.abs(+f.delta||0) : -Math.abs(+f.delta||0))}
                    style={{ flex:1, padding:"7px 0", borderRadius:7, border:"1px solid "+(active?c:T.border), background:active?c+"18":"transparent", color:active?c:T.textMid, cursor:"pointer", fontSize:12, fontWeight:600, WebkitTapHighlightColor:"transparent" }}>
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
            <div style={{ fontSize:11, color:(+f.delta||0)>0?T.green:T.red, marginTop:4 }}>
              {(+f.delta||0)>0?"+" : ""}{full(+f.delta||0)}/Mo.
              {" "}{(+f.delta||0)>0?"erhöht":"reduziert"} die Sparrate
              {f.startsAt ? " ab "+f.startsAt : ""}
              {f.endsAt ? " bis "+f.endsAt : " dauerhaft"}
            </div>
          )}

          {/* Spartöpfe */}
          <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid "+T.border }}>
            <div style={{ fontSize:16, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:8 }}>Spartöpfe</div>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              {[["proportional","Proportional (auto)"],["manuell","Manuell je Klasse"]].map(([k,l]) => (
                <button key={k} onClick={() => set("spartopfMode", k)}
                  style={{ flex:1, padding:"6px 0", borderRadius:7, border:"1px solid "+(f.spartopfMode===k ? T.amber : T.border), background:f.spartopfMode===k ? T.amber+"18" : "transparent", color:f.spartopfMode===k ? T.amber : T.textMid, cursor:"pointer", fontSize:12, fontWeight:600, WebkitTapHighlightColor:"transparent" }}>
                  {l}
                </button>
              ))}
            </div>
            {f.spartopfMode === "manuell" && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <div style={{ fontSize:11, color:T.textDim, marginBottom:2 }}>
                  Wie soll die Sparratenänderung (+{full(Math.abs(+f.delta||0))}/Mo.) verteilt werden?
                </div>
                {INVESTABLE_CLASSES.map(cls => (
                  <div key={cls} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:12, color:T.textMid, flex:1 }}>{cls}</span>
                    <div style={{ width:110 }}>
                      <Inp label="" value={(f.spartopfAmounts||{})[cls]||""} onChange={v => set("spartopfAmounts", { ...(f.spartopfAmounts||{}), [cls]: +v||0 })} type="number" placeholder="0 €/Mo." T={T} />
                    </div>
                  </div>
                ))}
                {(() => {
                  const total = Object.values(f.spartopfAmounts||{}).reduce((t,v)=>t+(+v||0),0);
                  const rem = (Math.abs(+f.delta||0)) - total;
                  return total > 0 ? (
                    <div style={{ fontSize:11, color:Math.abs(rem)<1?T.green:T.amber, marginTop:2 }}>
                      Verteilt: {full(total)}/Mo.{Math.abs(rem)>1?" · "+full(Math.abs(rem))+" unzugewiesen":""}
                    </div>
                  ) : null;
                })()}
              </div>
            )}
            {f.spartopfMode === "proportional" && (
              <div style={{ fontSize:11, color:T.textDim }}>
                Die Erhöhung wird proportional zur aktuellen Portfoliogewichtung verteilt.
              </div>
            )}
          </div>
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
            <div style={{ fontSize:11, color:T.amber, marginTop:4 }}>
              {full(+f.monthlyPayment||0)}/Mo. × {f.financingMonths} Mo. = {full(totalCost)} gesamt
            </div>
          )}
        </div>
      )}

      {/* Impact preview */}
      {Math.abs(impact) >= 1 && (
        <div style={{ border:"1px solid "+T.border, borderRadius:16, padding:"12px 14px", marginBottom:12 }}>
          <div style={{ fontSize:13, color:T.textLow, marginBottom:2 }}>Wirkung auf die Basis-Prognose am Horizont</div>
          <div className="vp-num" style={{ fontSize:18, fontWeight:700, color:impact>0?T.green:T.red }}>
            {impact>0?"+":"−"}{full(Math.abs(impact))}
          </div>
        </div>
      )}

      {/* Color */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:16, color:T.text, fontWeight:700, letterSpacing:"-0.02em", marginBottom:8 }}>Farbe</div>
        <div style={{ display:"flex", gap:8 }}>
          {BCK_CLRS.map(c => (
            <div key={c} onClick={() => set("color",c)}
              style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", border:f.color===c?"3px solid "+T.text:"3px solid transparent" }} />
          ))}
        </div>
      </div>

      <Btn full color={T.green} T={T} onClick={() => {
        const b = normalizeBucket({
          ...f,
          kind: category,
          spartopfMode: category==="sparrate" ? (f.spartopfMode||"proportional") : undefined,
          spartopfAmounts: category==="sparrate" && f.spartopfMode==="manuell" ? (f.spartopfAmounts||{}) : undefined,
        });
        if (data?.id) updArr("buckets", s.buckets.map(x => x.id===b.id ? b : x));
        else updArr("buckets", [...(s.buckets||[]), b]);
        setModal(null);
      }}>Speichern</Btn>
      {data?.id && (s.buckets||[]).some(x => x.id === data.id) && (
        <div style={{ marginTop:10 }}>
          <Btn full danger T={T} onClick={() => { updArr("buckets", (s.buckets||[]).filter(x => x.id !== data.id)); setModal(null); }}>Szenario löschen</Btn>
        </div>
      )}
    </Sheet>
  );
}
