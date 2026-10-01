import { useState, useMemo } from "react";
import { Inp, RoundBtn, ListRow, Avatar, full } from "./ui.jsx";
import { parseAmount } from "../format.js";
import { CY, ASSET_CLASS_DEFAULTS } from "../constants.js";
import { INVESTMENT_FIELDS, emptyAnswers, buildProfileFromSetup } from "../model/setup.js";
import { deriveAll } from "../model/derive.js";

// Step-by-step setup of a new profile with the user's own data.
// onComplete(state, profileName) creates the profile; onSkip() falls back to the example data.
const STEPS = ["name", "people", "income", "expenses", "investments", "property", "loan", "summary"];

export default function SetupWizard({ T, initialName = "", onComplete, onSkip, onClose }) {
  // onSkip(profileName) creates a profile with the example data
  const [step, setStep] = useState(0);
  const [a, setA] = useState(() => ({ ...emptyAnswers(), profileName: initialName }));
  const set = (patch) => setA(p => ({ ...p, ...patch }));
  const couple = a.household === "couple";
  const key = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Answers → numbers → profile (used for the summary and on completion)
  const numeric = useMemo(() => ({
    ...a,
    income: a.income.map(parseAmount),
    expenses: parseAmount(a.expenses),
    investments: Object.fromEntries(Object.entries(a.investments).map(([k, v]) => [k, { ...v, amount: parseAmount(v.amount) }])),
    property: { ...a.property, value: parseAmount(a.property.value), debt: parseAmount(a.property.debt), rate: parseAmount(a.property.rate),
      payment: parseAmount(a.property.payment), rent: parseAmount(a.property.rent) },
    loan: { ...a.loan, debt: parseAmount(a.loan.debt), rate: parseAmount(a.loan.rate), payment: parseAmount(a.loan.payment) },
    people: a.people.map(p => ({ ...p, birthYear: parseAmount(p.birthYear) || "" })),
  }), [a]);
  const preview = useMemo(() => isLast ? deriveAll(buildProfileFromSetup(numeric)) : null, [isLast, numeric]);

  const personName = (i) => a.people[i].name.trim() || (couple ? `Person ${i + 1}` : "Ich");
  const ownerOptions = couple
    ? [{ v: "p1", l: personName(0) }, { v: "p2", l: personName(1) }, { v: "both", l: "Gemeinsam" }]
    : null;

  const pill = (active) => ({ padding: "9px 16px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 600,
    background: active ? T.accent : T.surfaceHigh, color: active ? T.onAccent : T.text });
  const Choice = ({ value, options, onChange }) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 16px" }}>
      {options.map(o => <button key={o.v} type="button" onClick={() => onChange(o.v)} style={pill(value === o.v)}>{o.l}</button>)}
    </div>
  );
  const money = (label, value, onChange, placeholder = "0") => (
    <Inp label={label} value={value} onChange={onChange} placeholder={placeholder} inputMode="decimal" T={T} />
  );
  const Lead = ({ children }) => <p style={{ fontSize: 16, color: T.textMid, lineHeight: 1.5, margin: "0 0 20px" }}>{children}</p>;

  const QUESTIONS = {
    name: { title: "Wie soll dein Profil heißen?", body: (
      <>
        <Lead>Zum Beispiel dein Name oder „Familie Müller". Du kannst ihn später ändern.</Lead>
        <Inp label="Profilname" value={a.profileName} onChange={v => set({ profileName: v })} placeholder="Mein Vermögen" T={T} />
      </>
    ) },
    people: { title: "Für wen planst du?", body: (
      <>
        <Choice value={a.household} onChange={v => set({ household: v })}
          options={[{ v: "single", l: "Nur für mich" }, { v: "couple", l: "Für uns zwei" }]} />
        {[0, ...(couple ? [1] : [])].map(i => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}>
            <Inp label={couple ? `Name Person ${i + 1}` : "Dein Name"} value={a.people[i].name}
              onChange={v => set({ people: a.people.map((p, j) => j === i ? { ...p, name: v } : p) })} placeholder={couple ? `Person ${i + 1}` : "Ich"} T={T} />
            <Inp label="Geburtsjahr" value={a.people[i].birthYear} inputMode="numeric"
              onChange={v => set({ people: a.people.map((p, j) => j === i ? { ...p, birthYear: v } : p) })} placeholder={String(CY - 35)} T={T} />
          </div>
        ))}
        <Lead>Das Geburtsjahr bestimmt die Altersachse der Prognose.</Lead>
      </>
    ) },
    income: { title: "Wie hoch ist das Nettoeinkommen pro Monat?", body: (
      <>
        <Lead>Gehalt nach Steuern und Sozialabgaben. Wir rechnen mit 2 % Steigerung pro Jahr — änderbar im Tab Haushalt.</Lead>
        {[0, ...(couple ? [1] : [])].map(i => (
          <div key={i}>{money(couple ? `Netto ${personName(i)} (€/Monat)` : "Netto (€/Monat)", a.income[i], v => set({ income: a.income.map((x, j) => j === i ? v : x) }))}</div>
        ))}
      </>
    ) },
    expenses: { title: "Was gebt ihr monatlich aus?", body: (
      <>
        <Lead>Alle laufenden Kosten zusammen: Miete, Lebensmittel, Versicherungen, Freizeit. Kreditraten fragen wir gleich separat ab.</Lead>
        {money("Ausgaben (€/Monat)", a.expenses, v => set({ expenses: v }))}
      </>
    ) },
    investments: { title: "Welche Geldanlagen hast du?", body: (
      <>
        <Lead>Ungefähre Werte reichen. Leer lassen, was nicht zutrifft.</Lead>
        {INVESTMENT_FIELDS.map(f => (
          <div key={f.key} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Avatar cls={f.cls} color={ASSET_CLASS_DEFAULTS[f.cls].color} size={28} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{f.name}</div>
                <div style={{ fontSize: 13, color: T.textLow }}>{f.hint}</div>
              </div>
            </div>
            {money("Wert (€)", a.investments[f.key].amount, v => set({ investments: { ...a.investments, [f.key]: { ...a.investments[f.key], amount: v } } }))}
            {ownerOptions && parseAmount(a.investments[f.key].amount) > 0 && (
              <div style={{ marginTop: -8 }}>
                <Choice value={a.investments[f.key].owner} options={ownerOptions}
                  onChange={v => set({ investments: { ...a.investments, [f.key]: { ...a.investments[f.key], owner: v } } })} />
              </div>
            )}
          </div>
        ))}
      </>
    ) },
    property: { title: "Besitzt du eine Immobilie?", body: (
      <>
        <Choice value={a.property.has ? "yes" : "no"} onChange={v => set({ property: { ...a.property, has: v === "yes" } })}
          options={[{ v: "no", l: "Nein" }, { v: "yes", l: "Ja" }]} />
        {a.property.has && (
          <>
            <Choice value={a.property.rented ? "rented" : "own"} onChange={v => set({ property: { ...a.property, rented: v === "rented" } })}
              options={[{ v: "own", l: "Selbst genutzt" }, { v: "rented", l: "Vermietet" }]} />
            {money("Aktueller Wert (€)", a.property.value, v => set({ property: { ...a.property, value: v } }))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {money("Restschuld (€)", a.property.debt, v => set({ property: { ...a.property, debt: v } }))}
              {money("Zins (% p.a.)", a.property.rate, v => set({ property: { ...a.property, rate: v } }), "3,5")}
            </div>
            {money("Monatliche Rate (€)", a.property.payment, v => set({ property: { ...a.property, payment: v } }), "leer = schätzen")}
            {a.property.rented && money("Kaltmiete (€/Monat)", a.property.rent, v => set({ property: { ...a.property, rent: v } }))}
            {ownerOptions && <Choice value={a.property.owner} options={ownerOptions} onChange={v => set({ property: { ...a.property, owner: v } })} />}
            <Lead>Weitere Immobilien kannst du danach im Tab Vermögen anlegen.</Lead>
          </>
        )}
      </>
    ) },
    loan: { title: "Gibt es weitere Kredite?", body: (
      <>
        <Lead>Zum Beispiel Autokredit oder Ratenkauf — ohne die Immobilienfinanzierung.</Lead>
        <Choice value={a.loan.has ? "yes" : "no"} onChange={v => set({ loan: { ...a.loan, has: v === "yes" } })}
          options={[{ v: "no", l: "Nein" }, { v: "yes", l: "Ja" }]} />
        {a.loan.has && (
          <>
            <Inp label="Bezeichnung" value={a.loan.name} onChange={v => set({ loan: { ...a.loan, name: v } })} placeholder="Autokredit" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {money("Restschuld (€)", a.loan.debt, v => set({ loan: { ...a.loan, debt: v } }))}
              {money("Zins (% p.a.)", a.loan.rate, v => set({ loan: { ...a.loan, rate: v } }))}
            </div>
            {money("Monatliche Rate (€)", a.loan.payment, v => set({ loan: { ...a.loan, payment: v } }))}
          </>
        )}
      </>
    ) },
    summary: { title: "Dein Ausgangspunkt", body: preview && (
      <>
        <div style={{ fontSize: 14, color: T.textLow }}>Nettovermögen</div>
        <div className="vp-num" style={{ fontSize: 34, fontWeight: 700, color: T.text, letterSpacing: "-0.03em", marginBottom: 16 }}>{full(preview.agg.net)}</div>
        {[
          { icon: "arrowDown", title: "Einnahmen", value: full(preview.cf.streamIncome + preview.cf.immoGross + preview.cf.forderungIncome + preview.cf.assetYieldIncome) + "/Mo." },
          { icon: "arrowUp", title: "Ausgaben & Kreditraten", value: full(preview.cf.streamExpense + preview.cf.otherAnnuitat + preview.cf.immoAnnuitat + preview.cf.immoRunning + preview.cf.assetRunningCosts + preview.cf.scnFinanced) + "/Mo." },
          { icon: "trend", title: "Sparrate", value: full(preview.cf.eff) + "/Mo." },
          { icon: "chart", title: "Prognose mit " + (preview.projection.at(-1)?.age ?? ""), value: full(preview.projection.at(-1)?.base ?? 0) },
        ].map((r, i, arr) => (
          <ListRow key={r.title} T={T} last={i === arr.length - 1} leading={<Avatar icon={r.icon} color={T.surfaceHigh} fg={T.text} />} title={r.title} value={r.value} />
        ))}
        <Lead>Alles lässt sich später in den Tabs verfeinern: weitere Positionen, Szenarien, Renditen.</Lead>
      </>
    ) },
  };

  const q = QUESTIONS[key];
  const footerBtn = (primary) => ({ flex: primary ? 2 : 1, padding: "15px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 600,
    background: primary ? T.accent : T.surfaceHigh, color: primary ? T.onAccent : T.text });

  return (
    <div className="vp-overlay" style={{ zIndex: 300 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vp-sheet" role="dialog" aria-label="Profil einrichten" style={{ background: T.sheet, display: "flex", flexDirection: "column", overflowY: "hidden" }}>
        <div style={{ padding: "10px 20px 0", flexShrink: 0 }}>
          <div className="vp-grabber" style={{ background: T.borderHigh }} />
          <div style={{ display: "flex", gap: 4, margin: "8px 0 18px" }}>
            {STEPS.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? T.text : T.borderHigh }} />)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: T.textLow, fontWeight: 500, marginBottom: 4 }}>Einrichtung · Frage {step + 1} von {STEPS.length}</div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: T.text, letterSpacing: "-0.03em", lineHeight: 1.15, margin: 0 }}>{q.title}</h2>
            </div>
            <RoundBtn icon="close" label="Schließen" onClick={onClose} T={T} size={34} />
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "0 20px 12px" }}>{q.body}</div>

        <div style={{ padding: "8px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom,0px))", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && <button type="button" onClick={() => setStep(s => s - 1)} style={footerBtn(false)}>Zurück</button>}
            {!isLast
              ? <button type="button" onClick={() => setStep(s => s + 1)} style={footerBtn(true)}>Weiter</button>
              : <button type="button" onClick={() => onComplete(buildProfileFromSetup(numeric), a.profileName.trim() || "Mein Vermögen")} style={footerBtn(true)}>Profil erstellen</button>}
          </div>
          <button type="button" onClick={() => onSkip(a.profileName.trim())}
            style={{ width: "100%", marginTop: 6, padding: "10px", background: "none", border: "none", color: T.textLow, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            Überspringen – mit Beispieldaten starten
          </button>
        </div>
      </div>
    </div>
  );
}
