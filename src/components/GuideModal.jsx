import { useState } from "react";
import { RoundBtn, ListRow, Avatar, Icon } from "./ui.jsx";
import { ASSET_CLASS_DEFAULTS } from "../constants.js";

const STEPS = [
  {
    key: "overview",
    title: "Was kann dieses Programm?",
    subtitle: "Ein Überblick",
  },
  {
    key: "vermoegen",
    title: "Vermögen erfassen",
    subtitle: "Positionen, Klassen & Eigentümer",
  },
  {
    key: "haushalt",
    title: "Haushalt & Cashflow",
    subtitle: "Einnahmen, Ausgaben, Sparrate",
  },
  {
    key: "projektion",
    title: "35-Jahres-Projektion",
    subtitle: "3 Szenarien & Milestones",
  },
  {
    key: "start",
    title: "Wie möchtest du starten?",
    subtitle: "Eigene Daten oder Beispiel",
  },
];

// ─── Building blocks ────────────────────────────────────────────────────────

const Lead = ({ children, T }) => (
  <p style={{ fontSize:16, color:T.textMid, lineHeight:1.55, margin:"0 0 20px" }}>{children}</p>
);

const H = ({ children, T }) => (
  <h3 style={{ fontSize:18, fontWeight:700, color:T.text, letterSpacing:"-0.02em", margin:"28px 0 6px" }}>{children}</h3>
);

const Rows = ({ items, T }) => items.map((it, i) => (
  <ListRow key={it.title} T={T} last={i === items.length - 1}
    leading={it.leading || <Avatar icon={it.icon} color={T.surfaceHigh} fg={T.text} />}
    title={it.title} subtitle={it.sub} value={it.value} valueSub={it.valueSub} valueSubColor={it.valueSubColor} />
));

// Mini projection chart in the app's own style (monochrome, line only)
const MiniProjection = ({ T }) => {
  const base = [1.0,1.47,2.16,3.17,4.66,6.85,10.06,14.79];
  const opt  = [1.0,1.61,2.59,4.17,6.72,10.82,17.45,28.10];
  const cons = [1.0,1.34,1.80,2.41,3.22,4.32,5.79,7.76];
  const x = i => 4 + i * (312 / 7), y = v => 116 - v * 3.9;
  const path = arr => arr.map((v,i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  return (
    <svg width="100%" viewBox="0 0 320 124" style={{ display:"block", margin:"4px 0 8px" }} aria-hidden="true">
      <path d={path(cons)} fill="none" stroke={T.textDim} strokeWidth="1.5" />
      <path d={path(opt)}  fill="none" stroke={T.green}   strokeWidth="1.5" />
      <path d={path(base)} fill="none" stroke={T.text}    strokeWidth="2.5" />
      <circle cx={x(7)} cy={y(base[7])} r="4" fill={T.text} />
    </svg>
  );
};

// ─── Step Content ───────────────────────────────────────────────────────────

const StepContent = ({ step, T, onSetupOwn, onUseDemo }) => {
  if (step === "overview") return (
    <div>
      <Lead T={T}>
        Ein privates Planungs-Tool für komplexe Vermögen – Immobilien, Depots, Beteiligungen, mehrere Eigentümer und lange Horizonte.
      </Lead>
      <Rows T={T} items={[
        { icon:"home",   title:"Übersicht",  sub:"Nettovermögen, Prognose, Darlehen" },
        { icon:"wallet", title:"Haushalt",   sub:"Einnahmen, Ausgaben, Sparrate" },
        { icon:"pie",    title:"Vermögen",   sub:"Positionen, Eigentümer, Renditen" },
        { icon:"chart",  title:"Projektion", sub:"Drei Szenarien über bis zu 45 Jahre" },
        { icon:"layers", title:"Szenarien",  sub:"Ereignisse planen und vergleichen" },
      ]} />
      <div style={{ fontSize:13, color:T.textLow, marginTop:20, lineHeight:1.5 }}>
        Alle Daten bleiben lokal auf deinem Gerät – keine Cloud, kein Konto, kein Tracking.
      </div>
    </div>
  );

  if (step === "vermoegen") return (
    <div>
      <Lead T={T}>
        Im Tab <strong style={{ color:T.text }}>Vermögen</strong> erfasst du jede Position. Die Asset-Klasse bestimmt, mit welcher Rendite sie in der Projektion wächst.
      </Lead>
      <Rows T={T} items={[
        { leading:<Avatar cls="Aktien-ETF" color={ASSET_CLASS_DEFAULTS["Aktien-ETF"].color} />, title:"MSCI World ETF", sub:"Aktien-ETF · Person A", value:"€245.000", valueSub:"+€38.000", valueSubColor:T.green },
        { leading:<Avatar cls="Immobilien" color={ASSET_CLASS_DEFAULTS["Immobilien"].color} />, title:"Eigentumswohnung", sub:"Immobilien · A 60 % · B 40 %", value:"€480.000", valueSub:"netto €310k" },
        { leading:<Avatar cls="Cash" color={ASSET_CLASS_DEFAULTS["Cash"].color} />, title:"Tagesgeld", sub:"Cash · Gemeinschaft", value:"€52.000" },
      ]} />
      <H T={T}>Eigentümer</H>
      <Lead T={T}>Positionen können mehreren Personen oder Gesellschaften gehören, mit eigenen Anteilen. Der Filter oben zeigt dann nur deren Teilvermögen.</Lead>
      <H T={T}>Darlehen</H>
      <Lead T={T}>Schulden mit Zins, Laufzeit und Typ (Annuität, Volltilger, Endfällig) hinterlegen – Rate und Tilgung werden berechnet.</Lead>
    </div>
  );

  if (step === "haushalt") return (
    <div>
      <Lead T={T}>
        Der Tab <strong style={{ color:T.text }}>Haushalt</strong> zeigt deinen monatlichen Geldfluss – heute und für jedes Jahr in der Zukunft.
      </Lead>
      <Rows T={T} items={[
        { icon:"arrowDown", title:"Einnahmen", sub:"Gehalt, Miete, Dividenden, Rückflüsse", value:"+€8.500", valueSubColor:T.green },
        { icon:"arrowUp",   title:"Ausgaben",  sub:"Lebenshaltung, Versicherung, Kreditraten", value:"−€3.200" },
        { icon:"trend",     title:"Sparrate",  sub:"Was übrig bleibt – oder fester Betrag", value:"€5.300" },
        { icon:"pie",       title:"Depot",     sub:"Sparrate fließt in investierbare Positionen" },
      ]} />
      <H T={T}>Jahr wählen & Check-in</H>
      <Lead T={T}>Mit dem Regler in der Cashflow-Vorschau wählst du ein Jahr. Per Check-in erfasst du echte Werte und vergleichst sie mit dem Plan.</Lead>
    </div>
  );

  if (step === "projektion") return (
    <div>
      <Lead T={T}>
        Der Tab <strong style={{ color:T.text }}>Projektion</strong> rechnet dein Vermögen bis zu 45 Jahre fort – in drei Szenarien.
      </Lead>
      <MiniProjection T={T} />
      <Rows T={T} items={[
        { leading:<span style={{ width:10, height:10, borderRadius:"50%", background:T.green, flexShrink:0 }} />, title:"Optimistisch", sub:"+2 % auf alle Klassenrenditen" },
        { leading:<span style={{ width:10, height:10, borderRadius:"50%", background:T.text, flexShrink:0 }} />, title:"Basis", sub:"Deine eingestellten Renditen" },
        { leading:<span style={{ width:10, height:10, borderRadius:"50%", background:T.textDim, flexShrink:0 }} />, title:"Konservativ", sub:"−2 % auf alle Klassenrenditen" },
      ]} />
      <H T={T}>Einstellbar</H>
      <Lead T={T}>Inflation, Kapitalertragsteuer, Mietsteigerung, Zeithorizont und Filter nach Asset-Klasse oder Eigentümer. Meilensteine zeigen, wann du 1 M, 2 M … erreichst.</Lead>
      <H T={T}>Szenarien</H>
      <Rows T={T} items={[
        { icon:"arrowUp",   title:"Ausgabe",           sub:"Einmalig, jährlich oder monatlich" },
        { icon:"arrowDown", title:"Zufluss",           sub:"Erbschaft, Bonus, Verkaufserlös" },
        { icon:"swap",      title:"Einnahmenänderung", sub:"Rente, Teilzeit, Gehaltserhöhung" },
        { icon:"card",      title:"Finanziert",        sub:"Kreditrate reduziert die Sparrate" },
      ]} />
    </div>
  );

  if (step === "start") return (
    <div>
      <Lead T={T}>
        Richte dein eigenes Vermögen in ein paar Fragen ein — oder schau dir die App zuerst mit Beispieldaten an. Beides lässt sich später jederzeit ändern.
      </Lead>
      <ListRow T={T} onClick={onSetupOwn}
        leading={<Avatar icon="user" color={T.accent} fg={T.onAccent} />}
        title="Eigene Daten einrichten" subtitle="8 kurze Fragen · ca. 3 Minuten"
        trailing={<span style={{ color:T.textDim }}><Icon name="chevron" size={18} /></span>} />
      <ListRow T={T} last onClick={onUseDemo}
        leading={<Avatar icon="users" color={T.surfaceHigh} fg={T.text} />}
        title="Mit Beispieldaten starten" subtitle="Musterfamilie mit Depot, Immobilie und Struktur"
        trailing={<span style={{ color:T.textDim }}><Icon name="chevron" size={18} /></span>} />
    </div>
  );

  return null;
};

// ─── Main Modal ─────────────────────────────────────────────────────────────

export default function GuideModal({ T, onClose, onSetupOwn, onUseDemo }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  const pill = (primary) => ({ flex: primary ? 2 : 1, padding:"15px", borderRadius:999, border:"none", cursor:"pointer", fontSize:16, fontWeight:600,
    background: primary ? T.accent : T.surfaceHigh, color: primary ? T.onAccent : T.text });

  return (
    <div className="vp-overlay" style={{ zIndex:300 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vp-sheet" role="dialog" aria-label="Anleitung" style={{ background:T.sheet, display:"flex", flexDirection:"column", overflowY:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"10px 20px 0", flexShrink:0 }}>
          <div className="vp-grabber" style={{ background:T.borderHigh }} />

          {/* Progress segments */}
          <div style={{ display:"flex", gap:4, margin:"8px 0 18px" }}>
            {STEPS.map((st, i) => (
              <button key={i} type="button" aria-label={"Schritt "+(i+1)+": "+st.title} onClick={() => setStep(i)}
                style={{ flex:1, height:4, borderRadius:2, border:"none", padding:0, cursor:"pointer", background: i <= step ? T.text : T.borderHigh, transition:"background 0.2s" }} />
            ))}
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:16 }}>
            <div>
              <div style={{ fontSize:13, color:T.textLow, fontWeight:500, marginBottom:4 }}>
                Schritt {step+1} von {STEPS.length} · {STEPS[step].subtitle}
              </div>
              <h2 style={{ fontSize:26, fontWeight:700, color:T.text, letterSpacing:"-0.03em", lineHeight:1.15, margin:0 }}>{STEPS[step].title}</h2>
            </div>
            <RoundBtn icon="close" label="Schließen" onClick={onClose} T={T} size={34} />
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY:"auto", flex:1, padding:"0 20px 12px" }}>
          <StepContent step={STEPS[step].key} T={T} onSetupOwn={() => { onClose(); onSetupOwn?.(); }} onUseDemo={() => { onClose(); onUseDemo?.(); }} />
        </div>

        {/* Footer */}
        <div style={{ padding:"12px 20px", paddingBottom:"calc(16px + env(safe-area-inset-bottom,0px))", display:"flex", gap:10, flexShrink:0 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s-1)} style={pill(false)}>Zurück</button>
          )}
          {!isLast ? (
            <button onClick={() => setStep(s => s+1)} style={pill(true)}>Weiter</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
