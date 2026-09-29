import { useState } from "react";
import { IconBtn } from "./ui.jsx";

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
    title: "Loslegen",
    subtitle: "Beispieldaten & erste Schritte",
  },
];

// ─── SVG Illustrations ─────────────────────────────────────────────────────

const IllustrationOverview = ({ T }) => (
  <svg width="100%" viewBox="0 0 320 140" style={{ display:"block" }}>
    {/* Background card */}
    <rect width="320" height="140" rx="12" fill={T.surfaceHigh} />

    {/* 5 tab icons */}
    {[
      { x:20,  label:"Übersicht",  icon:"◈", color:"#5b8def" },
      { x:76,  label:"Haushalt",   icon:"⇄",  color:"#3cbf8a" },
      { x:132, label:"Vermögen",   icon:"◉",  color:"#a28bf6" },
      { x:188, label:"Projektion", icon:"↗",  color:"#e3aa45" },
      { x:244, label:"Szenarien",  icon:"◎",  color:"#e27aa8" },
    ].map(t => (
      <g key={t.x}>
        <rect x={t.x} y="20" width="52" height="52" rx="10" fill={t.color+"22"} stroke={t.color+"55"} strokeWidth="1" />
        <text x={t.x+26} y="52" textAnchor="middle" fontSize="20" fill={t.color}>{t.icon}</text>
        <text x={t.x+26} y="90" textAnchor="middle" fontSize="8" fill={T.textMid} fontWeight="600">{t.label}</text>
      </g>
    ))}

    {/* Flow arrow */}
    <text x="160" y="125" textAnchor="middle" fontSize="9" fill={T.textDim}>
      Alle Tabs arbeiten zusammen — eine Quelle, alle Auswertungen
    </text>
  </svg>
);

const IllustrationVermoegen = ({ T }) => {
  const bars = [
    { label:"Aktien-ETF", pct:38, color:"#5b8def" },
    { label:"Immobilien", pct:30, color:"#3cbf8a" },
    { label:"Private Equity", pct:18, color:"#4fc6a0" },
    { label:"Cash", pct:9, color:"#8a93a6" },
    { label:"Krypto", pct:5, color:"#e27aa8" },
  ];
  const maxW = 200;
  return (
    <svg width="100%" viewBox="0 0 320 155" style={{ display:"block" }}>
      <rect width="320" height="155" rx="12" fill={T.surfaceHigh} />
      {bars.map((b, i) => (
        <g key={b.label}>
          <text x="14" y={26 + i*26} fontSize="9" fill={T.textMid} dominantBaseline="middle">{b.label}</text>
          <rect x="118" y={17 + i*26} width={maxW * b.pct / 100} height="14" rx="3" fill={b.color} opacity="0.85" />
          <text x={122 + maxW * b.pct / 100} y={26 + i*26} fontSize="9" fill={b.color} dominantBaseline="middle" fontWeight="700">{b.pct}%</text>
        </g>
      ))}
      {/* Owner tags */}
      <rect x="14" y="138" width="60" height="14" rx="7" fill="#5b8def" opacity="0.2" stroke="#5b8def" strokeWidth="0.5"/>
      <text x="44" y="145" textAnchor="middle" fontSize="8" fill="#5b8def">Person A 60%</text>
      <rect x="82" y="138" width="60" height="14" rx="7" fill="#a28bf6" opacity="0.2" stroke="#a28bf6" strokeWidth="0.5"/>
      <text x="112" y="145" textAnchor="middle" fontSize="8" fill="#a28bf6">Person B 40%</text>
    </svg>
  );
};

const IllustrationHaushalt = ({ T }) => (
  <svg width="100%" viewBox="0 0 320 145" style={{ display:"block" }}>
    <rect width="320" height="145" rx="12" fill={T.surfaceHigh} />

    {/* Income block */}
    <rect x="12" y="14" width="88" height="110" rx="8" fill="#3cbf8a" opacity="0.12" stroke="#3cbf8a" strokeWidth="1" strokeOpacity="0.4"/>
    <text x="56" y="36" textAnchor="middle" fontSize="9" fill="#3cbf8a" fontWeight="700">EINNAHMEN</text>
    {["Gehalt","Miete","Dividenden","Zinsen"].map((l,i) => (
      <text key={l} x="56" y={54+i*18} textAnchor="middle" fontSize="9" fill="#3cbf8a" opacity="0.9">{l}</text>
    ))}

    {/* Arrow */}
    <path d="M102 69 L135 69" stroke={T.textMid} strokeWidth="1.5" markerEnd="url(#arr)" opacity="0.5"/>
    <defs>
      <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill={T.textMid} opacity="0.5"/>
      </marker>
    </defs>

    {/* Expense block */}
    <rect x="137" y="14" width="80" height="72" rx="8" fill="#ec6a6a" opacity="0.1" stroke="#ec6a6a" strokeWidth="1" strokeOpacity="0.4"/>
    <text x="177" y="33" textAnchor="middle" fontSize="9" fill="#ec6a6a" fontWeight="700">AUSGABEN</text>
    {["Lebenskosten","Versicherung","Darlehen"].map((l,i) => (
      <text key={l} x="177" y={48+i*14} textAnchor="middle" fontSize="8" fill="#ec6a6a" opacity="0.9">{l}</text>
    ))}

    {/* Arrow down */}
    <path d="M177 88 L177 104" stroke={T.textMid} strokeWidth="1.5" markerEnd="url(#arr2)" opacity="0.5"/>
    <defs>
      <marker id="arr2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill={T.textMid} opacity="0.5"/>
      </marker>
    </defs>

    {/* Savings */}
    <rect x="137" y="105" width="80" height="22" rx="8" fill="#e3aa45" opacity="0.15" stroke="#e3aa45" strokeWidth="1" strokeOpacity="0.5"/>
    <text x="177" y="120" textAnchor="middle" fontSize="9" fill="#e3aa45" fontWeight="800">→ Sparrate</text>

    {/* Arrow to invest */}
    <path d="M219 116 L238 116" stroke={T.textMid} strokeWidth="1.5" markerEnd="url(#arr)" opacity="0.5"/>

    {/* Invest */}
    <rect x="240" y="14" width="68" height="130" rx="8" fill="#5b8def" opacity="0.1" stroke="#5b8def" strokeWidth="1" strokeOpacity="0.4"/>
    <text x="274" y="36" textAnchor="middle" fontSize="9" fill="#5b8def" fontWeight="700">DEPOT</text>
    {/* Mini bar chart inside */}
    {[40,55,48,70,62,85].map((h,i) => (
      <rect key={i} x={248+i*9} y={130-h*0.6} width="6" height={h*0.6} rx="2" fill="#5b8def" opacity={0.4+i*0.1}/>
    ))}
    <text x="274" y="140" textAnchor="middle" fontSize="8" fill="#5b8def" opacity="0.8">wächst</text>
  </svg>
);

const IllustrationProjektion = ({ T }) => {
  const years = [0,5,10,15,20,25,30,35];
  const base  = [1.0,1.47,2.16,3.17,4.66,6.85,10.06,14.79];
  const opt   = [1.0,1.61,2.59,4.17,6.72,10.82,17.45,28.10];
  const cons  = [1.0,1.34,1.80,2.41,3.22,4.32,5.79,7.76];

  const toX = (i) => 20 + i * 40;
  const toY = (v) => 120 - v * 3.5;

  const pathOf = (arr) => arr.map((v,i) => `${i===0?"M":"L"}${toX(i)},${toY(v)}`).join(" ");

  const milestones = [
    { v:5.0, label:"€1M", color:"#e3aa45" },
    { v:11.4, label:"€2M", color:"#3cbf8a" },
  ];

  return (
    <svg width="100%" viewBox="0 0 320 145" style={{ display:"block" }}>
      <rect width="320" height="145" rx="12" fill={T.surfaceHigh} />

      {/* Grid lines */}
      {[20,50,80,110].map(y => (
        <line key={y} x1="20" y1={y} x2="300" y2={y} stroke={T.border} strokeWidth="0.5" opacity="0.5"/>
      ))}

      {/* Paths */}
      <path d={pathOf(cons)} fill="none" stroke={T.textMid} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6"/>
      <path d={pathOf(base)} fill="none" stroke="#5b8def" strokeWidth="2.5" />
      <path d={pathOf(opt)}  fill="none" stroke="#3cbf8a" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6"/>

      {/* Milestone dots on base */}
      {milestones.map(m => {
        const i = base.findIndex(v => v >= m.v);
        if (i < 0) return null;
        const x = toX(i), y = toY(base[i]);
        return (
          <g key={m.label}>
            <circle cx={x} cy={y} r="5" fill={m.color} opacity="0.9"/>
            <text x={x+8} y={y+4} fontSize="9" fill={m.color} fontWeight="700">{m.label}</text>
          </g>
        );
      })}

      {/* X labels */}
      {years.map((yr,i) => (
        <text key={yr} x={toX(i)} y="135" textAnchor="middle" fontSize="8" fill={T.textDim}>
          +{yr}J
        </text>
      ))}

      {/* Legend */}
      <circle cx="30" cy="15" r="4" fill="#3cbf8a" opacity="0.7"/>
      <text x="38" y="19" fontSize="8" fill={T.textMid}>Optimistisch</text>
      <circle cx="120" cy="15" r="4" fill="#5b8def"/>
      <text x="128" y="19" fontSize="8" fill={T.textMid}>Basis</text>
      <circle cx="185" cy="15" r="4" fill={T.textMid} opacity="0.6"/>
      <text x="193" y="19" fontSize="8" fill={T.textMid}>Konservativ</text>
    </svg>
  );
};

const IllustrationDemoData = ({ T }) => (
  <svg width="100%" viewBox="0 0 320 130" style={{ display:"block" }}>
    <rect width="320" height="130" rx="12" fill={T.surfaceHigh} />

    {/* Demo profile card */}
    <rect x="14" y="12" width="140" height="106" rx="10" fill={T.surface} stroke="#5b8def" strokeWidth="1" strokeOpacity="0.5"/>
    <circle cx="40" cy="36" r="14" fill="#5b8def22" stroke="#5b8def" strokeWidth="1.5"/>
    <text x="40" y="41" textAnchor="middle" fontSize="11" fill="#5b8def" fontWeight="900">FM</text>
    <text x="62" y="31" fontSize="11" fill={T.text} fontWeight="800">Familie M.</text>
    <text x="62" y="44" fontSize="9" fill="#5b8def" fontWeight="700">€1,24M</text>

    {/* Pre-filled items */}
    {[
      { y:64,  label:"MSCI World ETF",   val:"€245k", color:"#5b8def" },
      { y:80,  label:"Eigentumswohnung", val:"€480k", color:"#3cbf8a" },
      { y:96,  label:"Tagesgeld",        val:"€52k",  color:"#8a93a6" },
      { y:112, label:"GmbH-Beteiligung", val:"€180k", color:"#4fc6a0" },
    ].map(r => (
      <g key={r.label}>
        <circle cx="26" cy={r.y} r="3" fill={r.color}/>
        <text x="34" y={r.y+4} fontSize="8" fill={T.textMid}>{r.label}</text>
        <text x="148" y={r.y+4} textAnchor="end" fontSize="8" fill={r.color} fontWeight="700">{r.val}</text>
      </g>
    ))}

    {/* Arrow + instruction */}
    <path d="M160 65 L182 65" stroke={T.accent} strokeWidth="1.5" opacity="0.6"/>
    <text x="192" y="40" fontSize="9" fill={T.textMid} fontWeight="700">Sofort</text>
    <text x="192" y="54" fontSize="9" fill={T.textMid} fontWeight="700">erforschen</text>
    <text x="192" y="72" fontSize="9" fill={T.textDim}>Klicke auf</text>
    <text x="192" y="84" fontSize="9" fill={T.textDim}>ein Profil</text>
    <text x="192" y="96" fontSize="9" fill={T.textDim}>und navigiere</text>
    <text x="192" y="108" fontSize="9" fill={T.textDim}>durch die Tabs</text>

    <rect x="186" y="114" width="114" height="12" rx="6" fill={T.accent} opacity="0.15"/>
    <text x="243" y="123" textAnchor="middle" fontSize="8" fill={T.accent} fontWeight="700">Beispieldaten bereits drin ✓</text>
  </svg>
);

// ─── Step Content ───────────────────────────────────────────────────────────

const StepContent = ({ step, T }) => {
  const box = {
    background: T.surface, border: "1px solid " + T.border,
    borderRadius: 8, padding: "10px 12px", marginBottom: 10, fontSize:12, color: T.textMid, lineHeight: 1.7,
  };
  const tag = (label, color) => (
    <span style={{ display:"inline-block", fontSize:11, padding:"2px 8px", borderRadius:10, background:color+"22", border:"1px solid "+color+"55", color, fontWeight:600, marginRight:5, marginBottom:4 }}>
      {label}
    </span>
  );

  if (step === "overview") return (
    <div>
      <IllustrationOverview T={T} />
      <div style={{ ...box, marginTop:12 }}>
        <strong style={{ color:T.text }}>Vermögensplaner</strong> ist ein privates Finanzplanungs-Tool für komplexe Vermögensstrukturen — ideal für Personen mit Immobilien, Beteiligungen, mehreren Eigentümern oder langen Planungshorizonten.
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[
          { icon:"◈", label:"Übersicht", desc:"Nettowert, Sparquote, Darlehen auf einen Blick", color:"#5b8def" },
          { icon:"⇄", label:"Haushalt", desc:"Einnahmen & Ausgaben, Sparrate, Mittelverteilung", color:"#3cbf8a" },
          { icon:"◉", label:"Vermögen", desc:"11 Asset-Klassen, Eigentümeranteile, Rendite-Slider", color:"#a28bf6" },
          { icon:"↗", label:"Projektion", desc:"3 Szenarien über 35 Jahre, Milestones, Inflation", color:"#e3aa45" },
        ].map(f => (
          <div key={f.label} style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:"10px 10px" }}>
            <div style={{ fontSize:16, color:f.color, marginBottom:4 }}>{f.icon}</div>
            <div style={{ fontSize:12, fontWeight:600, color:T.text, marginBottom:3 }}>{f.label}</div>
            <div style={{ fontSize:11, color:T.textDim, lineHeight:1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ ...box, marginTop:8, background:T.accent+"0d", border:"1px solid "+T.accent+"33", color:T.accent }}>
        Alle Daten bleiben lokal auf deinem Gerät — keine Cloud, kein Passwort, kein Tracking.
      </div>
    </div>
  );

  if (step === "vermoegen") return (
    <div>
      <IllustrationVermoegen T={T} />
      <div style={{ ...box, marginTop:12 }}>
        Im Tab <strong style={{ color:T.text }}>Vermögen</strong> erfasst du alle Positionen deines Portfolios. Jede Position bekommt eine <strong style={{ color:T.text }}>Asset-Klasse</strong>, die bestimmt, mit welcher Rendite sie in der Projektion wächst.
      </div>
      <div style={{ ...box }}>
        <div style={{ fontWeight:600, color:T.text, marginBottom:6 }}>Asset-Klassen:</div>
        {[
          ["Aktien-ETF","#5b8def"],["Aktien","#e3aa45"],["Immobilien","#3cbf8a"],
          ["Private Equity","#4fc6a0"],["Anleihen","#a28bf6"],["Cash","#8a93a6"],
          ["Krypto","#e27aa8"],["Forderung","#3fb3d6"],
        ].map(([l,c]) => tag(l,c))}
      </div>
      <div style={{ ...box }}>
        <strong style={{ color:T.text }}>Eigentümerstruktur:</strong> Jede Position kann mehreren Personen oder Gesellschaften gehören — mit individuellen Anteilen (z.B. 60/40). Der Eigentümer-Filter im Header zeigt dann nur das jeweilige Teilvermögen.
      </div>
      <div style={{ ...box }}>
        <strong style={{ color:T.text }}>Darlehen:</strong> Schulden werden mit Zinstyp und Laufzeit hinterlegt (Annuität, Volltilger, Endfällig). Annuität und Tilgung berechnen sich automatisch.
      </div>
    </div>
  );

  if (step === "haushalt") return (
    <div>
      <IllustrationHaushalt T={T} />
      <div style={{ ...box, marginTop:12 }}>
        Der Tab <strong style={{ color:T.text }}>Haushalt</strong> zeigt deinen monatlichen Geldfluss — heute und in der Zukunft. Die <strong style={{ color:"#e3aa45" }}>Cashflow-Vorschau</strong> rechnet Einnahmen und Ausgaben über den gesamten Zeithorizont fort.
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {[
          { icon:"↑", color:"#3cbf8a", title:"Einnahmen (Zuflüsse)", items:["Einkommensströme (Gehalt, Freelance, Rente)", "Immo-Netto-CF (Miete − Hausgeld − Annuität)", "Ausschüttungsrenditen (Dividenden, Kupons)", "Forderungs-Rückflüsse"] },
          { icon:"↓", color:"#ec6a6a", title:"Ausgaben (Abflüsse)", items:["Lebenshaltung, Versicherung, Bildung", "Darlehensannuitäten (fallen weg wenn abbezahlt)", "Laufende Asset-Kosten (Liegeplatz etc.)"] },
          { icon:"→", color:"#e3aa45", title:"Sparrate", items:["Auto-Modus: alles was übrig bleibt", "Manuell: fixer Betrag einstellbar", "Fließt proportional in investierbare Assets"] },
          { icon:"📅", color:"#5b8def", title:"Jahres-Regler & Check-in", items:["Regler in der Cashflow-Vorschau wählt beliebiges Jahr", "Monatsübersicht zeigt projizierte Werte für dieses Jahr", "IST-Daten erfassen und mit der Prognose vergleichen"] },
        ].map(s => (
          <div key={s.title} style={{ ...box, display:"flex", gap:10, marginBottom:0 }}>
            <div style={{ fontSize:18, color:s.color, flexShrink:0, lineHeight:1.2 }}>{s.icon}</div>
            <div>
              <div style={{ fontWeight:600, color:T.text, marginBottom:4 }}>{s.title}</div>
              {s.items.map(i => <div key={i} style={{ fontSize:11, color:T.textDim, marginBottom:2 }}>• {i}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (step === "projektion") return (
    <div>
      <IllustrationProjektion T={T} />
      <div style={{ ...box, marginTop:12 }}>
        Der Tab <strong style={{ color:T.text }}>Projektion</strong> zeigt, wie dein Vermögen über bis zu 45 Jahre wächst — in drei Szenarien basierend auf den Renditen deiner Asset-Klassen.
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {[
          { color:"#3cbf8a", label:"Optimistisch", desc:"+2% auf alle Klassenrenditen" },
          { color:"#5b8def", label:"Basis", desc:"Exakt deine eingestellten Renditen" },
          { color:T.textMid, label:"Konservativ", desc:"−2% auf alle Klassenrenditen" },
        ].map(s => (
          <div key={s.label} style={{ ...box, display:"flex", gap:10, alignItems:"center", marginBottom:0 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
            <div><strong style={{ color:T.text }}>{s.label}:</strong> {s.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ ...box, marginTop:4 }}>
        <strong style={{ color:T.text }}>Einstellbar:</strong> Inflationsbereinigung, Kapitalertragsteuer (KeSt), Mietpreissteigerung, Zeithorizont, Sparratenwachstum und Filtierung nach Asset-Klasse oder Eigentümer.
      </div>
      <div style={{ ...box }}>
        <strong style={{ color:T.text }}>Milestones</strong> zeigen, in welchem Lebensjahr du 250k, 500k, 1M, 2M … erreichen wirst. Darlehens-Enddaten werden ebenfalls angezeigt.
      </div>
      <div style={{ ...box }}>
        <strong style={{ color:T.text }}>Szenario-Planer</strong> (Tab "Szenarien"): Plane Einmalereignisse, Erbschaften, Gehaltssteigerungen oder finanzierte Käufe. Vier Typen:
        <div style={{ marginTop:4 }}>
          {[["↓ Ausgabe","Einmalig/Jährlich/Monatlich aus dem Portfolio"],["↑ Zufluss","Erbschaft, Bonus, Verkaufserlös"],["⇄ Sparratenänderung","Renteneintritt, Teilzeit, Gehaltserhöhung"],["≡ Finanziert","Kauf auf Kredit — Rate reduziert die Sparrate"]].map(([t,d]) => (
            <div key={t} style={{ fontSize:11, color:T.textDim, marginBottom:2 }}>• <strong style={{ color:T.textMid }}>{t}</strong> — {d}</div>
          ))}
        </div>
      </div>
    </div>
  );

  if (step === "start") return (
    <div>
      <IllustrationDemoData T={T} />
      <div style={{ ...box, marginTop:12, background:T.green+"0d", border:"1px solid "+T.green+"33" }}>
        <strong style={{ color:T.green }}>Neue Profile sind bereits mit Beispieldaten befüllt.</strong>
        {" "}Du siehst sofort wie das Programm funktioniert — ohne erst mühsam Daten eingeben zu müssen.
      </div>
      <div style={{ ...box }}>
        <div style={{ fontWeight:600, color:T.text, marginBottom:8 }}>So startest du:</div>
        {[
          ["1", "Profil anlegen", 'Klicke auf "Profil anlegen" und gib einen Namen ein.'],
          ["2", "Beispieldaten erkunden", "Navigiere durch alle Tabs — ETF, Immobilie, Haushalt, Projektion sind bereits befüllt."],
          ["3", "Eigene Daten einpflegen", "Im Tab Vermögen die Beispiel-Positionen durch deine echten Werte ersetzen."],
          ["4", "Haushalt anpassen", "Einkommens- und Ausgabenströme auf deine Situation anpassen."],
          ["5", "Projektion ablesen", "Im Tab Projektion siehst du sofort dein Langfrist-Szenario."],
        ].map(([n, title, desc]) => (
          <div key={n} style={{ display:"flex", gap:10, marginBottom:10 }}>
            <div style={{ width:22, height:22, borderRadius:"50%", background:T.accent+"22", border:"1px solid "+T.accent+"55", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontSize:12, fontWeight:650, color:T.accent }}>{n}</span>
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:T.text, marginBottom:2 }}>{title}</div>
              <div style={{ fontSize:11, color:T.textDim, lineHeight:1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return null;
};

// ─── Main Modal ─────────────────────────────────────────────────────────────

export default function GuideModal({ T, onClose, onCreateProfile }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  return (
    <div className="vp-overlay" style={{ zIndex:300 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vp-sheet" role="dialog" aria-label="Anleitung" style={{ background:T.surface, border:"1px solid "+T.border, display:"flex", flexDirection:"column", overflowY:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"12px 20px 0", flexShrink:0 }}>
          <div className="vp-grabber" style={{ background:T.borderHigh }} />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
            <div>
              <div style={{ fontSize:12, color:T.textLow, fontWeight:500, marginBottom:3 }}>
                Schritt {step+1} von {STEPS.length}
              </div>
              <div style={{ fontSize:18, fontWeight:650, color:T.text, letterSpacing:"-0.015em" }}>{STEPS[step].title}</div>
              <div style={{ fontSize:13, color:T.textMid, marginTop:2 }}>{STEPS[step].subtitle}</div>
            </div>
            <IconBtn icon="close" label="Schließen" onClick={onClose} T={T} />
          </div>

          {/* Step dots */}
          <div style={{ display:"flex", gap:5, marginTop:10, marginBottom:12 }}>
            {STEPS.map((_, i) => (
              <div key={i} onClick={() => setStep(i)} style={{ flex: i===step ? 2 : 1, height:3, borderRadius:2, background: i===step ? T.accent : i<step ? T.accent+"55" : T.border, cursor:"pointer", transition:"flex 0.2s, background 0.2s" }}/>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY:"auto", flex:1, padding:"0 20px" }}>
          <StepContent step={STEPS[step].key} T={T} />
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 20px", paddingBottom:"calc(14px + env(safe-area-inset-bottom,0px))", borderTop:"1px solid "+T.border, display:"flex", gap:10, flexShrink:0 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s-1)}
              style={{ flex:1, padding:"12px", borderRadius:10, border:"1px solid "+T.border, background:"transparent", color:T.textMid, cursor:"pointer", fontSize:15, fontWeight:600 }}>
              Zurück
            </button>
          )}
          {!isLast ? (
            <button onClick={() => setStep(s => s+1)}
              style={{ flex:2, padding:"12px", borderRadius:10, border:"none", background:T.accent, color:T.onAccent, cursor:"pointer", fontSize:15, fontWeight:600 }}>
              Weiter →
            </button>
          ) : (
            <button onClick={() => { onClose(); onCreateProfile?.(); }}
              style={{ flex:2, padding:"12px", borderRadius:10, border:"none", background:T.accent, color:T.onAccent, cursor:"pointer", fontSize:15, fontWeight:600 }}>
              Profil anlegen & loslegen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
