# Vermögensplaner

Ein privates Finanzplanungs-Tool für HNWI (High-Net-Worth Individuals) und komplexe Vermögensstrukturen. Läuft vollständig im Browser, keine Cloud-Abhängigkeit, keine Datenweitergabe.

---

## Inhaltsverzeichnis

1. [Use Cases](#use-cases)
2. [Architektur](#architektur)
3. [Setup & Entwicklung](#setup--entwicklung)
4. [Datenmodell](#datenmodell)
5. [Berechnungsmethoden](#berechnungsmethoden)
6. [Versionshistorie](#versionshistorie)
7. [Geplante Features](#geplante-features)

---

## Use Cases

### Primäre Zielgruppe

Das Tool richtet sich an wohlhabende Privatpersonen und Berater, die Vermögen jenseits klassischer Banksoftware planen wollen — mit realer Struktur statt vereinfachter Buchführung.

### Typische Szenarien

**Ehepaare mit gemischtem Vermögen**
Direktaktien (teilweise gesperrt/geschenkt), Immobilien mit Darlehen, ETF-Depots bei verschiedenen Banken, gemeinsame und getrennte Liquidität. Das Tool bildet Miteigentumsquoten ab (z.B. 60/40 Anteil), rechnet auf Teilhaber-Ebene und ermöglicht getrennte Steuerveranlagung pro Eigentümer.

**Unternehmer mit Holding-Struktur**
Beteiligungen über GmbH oder GbR, Gesellschafter-Anteile mit Durchblick auf natürliche Personen, Teileinkünfteverfahren für Dividenden aus GmbH-Anteilen, private Entnahmeplanung neben Unternehmensebene.

**Immobilien-lastige Portfolios**
Mehrere Objekte mit je eigenem Darlehen, Mieteinnahmen, Hausgeld und Grundsteuer. Automatische Cashflow-Rechnung (Bruttomiete minus Annuität minus laufende Kosten), Mietpreissteigerung in der Projektion, Schuldenfreiheitszeitpunkt je Objekt.

**Private-Equity-Anleger**
Commitment/Called/Distributed-Tracking, illiquide Klassifizierung, J-Curve-Verhalten durch negativen Sonstiges-Slider, letzter Financing Round als Bewertungsmethode.

**Ruhestandsplanung**
Altersbezogene Milestones, Rentenplanung als befristeter Einkommensstrom, Entnahmeplanung via Buckets (Einmalig/Jährlich/Monatlich), Inflationsbereinigung in der Projektion, Zeithorizont bis 50 Jahre.

**Schenkung und Erbschaft**
Gesperrte Assets (locked-Flag), stille Reserven (Anschaffungspreis vs. Marktwert), Güterstand-Verwaltung (Zugewinngemeinschaft / Gütertrennung / Gütergemeinschaft).

---

## Architektur

### Technologie-Stack

| Schicht | Technologie |
|---|---|
| UI Framework | React 18 (Hooks) |
| Build Tool | Vite 5 |
| Charts | Recharts 2.10 |
| Excel | SheetJS (xlsx 0.18.5) |
| Persistenz | localStorage (multi-profile) |
| Deployment | Netlify (static) |
| Styling | Inline-Styles mit Theme-Objekt |

### Dateistruktur

```
src/
├── app.jsx                    # Einstiegspunkt: Profilverwaltung
├── AppInner.jsx               # Haupt-App: State, Berechnungen, Tab-Routing
├── theme.js                   # DARK/LIGHT-Themes, DEFAULT-State, DEFAULT_OWNERS
├── storage.js                 # loadProfileState (mit Migrations-Logik), saveState
├── constants.js               # ASSET_CLASS_DEFAULTS, KeSt-Typen, Enums
│
├── components/
│   ├── ui.jsx                 # Shared UI: Tile, Btn, Sl (Slider), fmtE, full
│   ├── TabDashboard.jsx       # Übersicht: KPIs, Loan-Summary, Nettowert-Chart
│   ├── TabHaushalt.jsx        # Cashflow: Einnahmen, Ausgaben, Sparrate, Sparverteilung
│   ├── TabVermogen.jsx        # Asset-Liste: Rendite-Sliders, Positionen, Snapshots
│   ├── TabProjektion.jsx      # 3-Szenario-Projektion, Milestones, Parameter
│   ├── TabBuckets.jsx         # Geplante Ausgaben (Einmalig/Jährlich/Monatlich)
│   │
│   └── modals/
│       ├── AssetModal.jsx     # Asset anlegen/bearbeiten: Ownership, Tax, PE, Lifecycle
│       ├── OwnerModal.jsx     # Eigentümer + Güterstand + Steuerprofile
│       ├── BucketModal.jsx    # Ausgaben-Bucket: Betrag, Typ, Finanzierungsmodus
│       ├── CheckinModal.jsx   # Monatlicher Haushalt-Check-in
│       ├── SnapshotModal.jsx  # Nettowert-Snapshot mit Asset-Einzelwerten
│       ├── AffordModal.jsx    # Leistbarkeitsrechner (Substanz vs. Wachstum)
│       ├── ImportPreviewModal.jsx  # Excel-Import Vorschau und Bestätigung
│       ├── IncomeStreamModal.jsx   # Einkommensstrom anlegen/bearbeiten
│       └── ExpenseStreamModal.jsx  # Ausgabenstrom anlegen/bearbeiten
│
└── utils/
    └── excelIO.js             # exportAssetsToExcel, parseImportFile
```

### State-Architektur

Der gesamte App-State lebt in einem einzigen `useState`-Objekt (`s`) in `AppInner.jsx`. Ableitungen (Cashflow `cf`, Aggregierung `agg`, Projektion `projection`, Sparverteilung `sparDist`) werden als `useMemo` berechnet und bei Änderungen reaktiv neu berechnet.

```
s (Profil-State)
├── assets[]          — Positionen mit Wert, Eigentümer, Steuer, Lifecycle
├── owners[]          — Eigentümer mit Typ, Steuerprofile, Gesellschafter
├── incomeStreams[]    — zeitbegrenzte Einkommensströme pro Eigentümer
├── expenseStreams[]   — zeitbegrenzte Ausgabenströme
├── buckets[]         — geplante Ausgaben (Einmalig/Jährlich/Monatlich)
├── checkins[]        — monatliche Haushalt-Check-ins
├── snapshots[]       — Nettowert-Zeitreihe mit Asset-Einzelwerten
├── classReturns{}    — überschriebene Renditen pro Asset-Klasse
└── Konfiguration     — birthYear, maritalProperty, taxFiling, horizon, etc.
```

Änderungen werden über drei Callbacks propagiert:
- `upd(patch)` — flacher Merge für skalare Felder
- `updArr(key, arr)` — Ersatz eines kompletten Arrays
- `updClass(cls, val)` — Rendite-Override für eine Asset-Klasse

Bei jeder State-Änderung schreibt ein `useEffect` den State sofort in `localStorage`.

### Multi-Profil-System

`app.jsx` verwaltet eine Liste von Profilen im `localStorage` unter dem Key `wealth-profiles-v1`. Jedes Profil bekommt eine eigene ID; der vollständige Profil-State liegt unter `wealth-pwa-v3-{profileId}`. Profile sind vollständig isoliert.

### Theme-System

Zwei Theme-Objekte (`DARK`, `LIGHT`) in `theme.js` — jeweils ca. 15 Farbwerte. Das aktive Theme `T` wird als Prop durch alle Komponenten gereicht. Kein CSS, kein Klassensystem — ausschließlich Inline-Styles mit `T.accent`, `T.surface`, etc.

### Eigentümer-Filter

Ein `ownerFilter[]`-Array im AppInner-State filtert alle Berechnungen auf bestimmte Eigentümer. `filteredAssets` enthält nur Assets, an denen mindestens ein gefilterter Eigentümer beteiligt ist. `ownerShare(asset, ownerFilter)` gibt den skalierten Anteil zurück (z.B. 0.6 bei 60%-Beteiligung), der in alle Cashflow- und Aggregierungsrechnungen einfließt.

---

## Setup & Entwicklung

### Voraussetzungen

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/nickraasc-ui/Vermogenplaner-.git
cd Vermogenplaner-
npm install
npm run dev
```

Die App läuft dann auf `http://localhost:5173`.

### Build & Deployment

```bash
npm run build     # Erstellt dist/
npm run preview   # Lokale Vorschau des Builds
```

Netlify deployt automatisch bei Push auf `main`. Build-Command: `npm run build`, Publish-Verzeichnis: `dist/`.

### Bekannte Besonderheit: macOS vs. Linux Dateipfade

macOS nutzt ein case-insensitives Dateisystem. Git auf macOS bildet `src/` und `Src/` auf denselben Pfad ab. Auf Netlify (Linux) sind diese Pfade unterschiedlich. Bei neuen Dateien unter `src/` müssen diese via git-Plumbing staged werden, damit der Linux-Build sie korrekt findet:

```bash
HASH=$(git hash-object -w "src/MeineDatei.jsx")
git update-index --add --cacheinfo "100644,${HASH},src/MeineDatei.jsx"
```

---

## Datenmodell

### Asset

```js
{
  id: string,
  name: string,
  class: AssetClass,               // "Aktien" | "Aktien-ETF" | "Immobilien" | ...
  ownership: [{ ownerId, share }], // Bruchteile, Summe = 1.0
  value: number,                   // Bruttowert in €
  debt: number,                    // Verbindlichkeiten in €
  liquidity: "Liquide" | "Semi-liquide" | "Illiquide",
  yieldPct: number,                // Ausschüttungsrendite in % p.a. (Dividenden, Kupons)
  valuationMethod: string,         // "market" | "nav" | "appraisal" | "lastround" | "selbstauskunft"
  locked: boolean,                 // gesperrtes Asset — nimmt nicht an Sparverteilung teil
  note: string,

  // Steuer
  tax: {
    taxType: "abgeltung" | "teileinkuenfte" | "immobilien" | "steuerfrei",
    acquisitionPrice: number,      // für stille Reserven
    acquisitionDate: string,       // YYYY-MM-DD
  },

  // Immobilien
  monthlyRent: number,
  hausgeld: number,
  grundsteuer: number,
  loanRate: number,                // Zinssatz in %
  loanTilgung: number,             // monatliche Tilgung in €
  loanAnnuitat: number,            // monatliche Annuität (Zins + Tilgung) in €

  // Private Equity
  commitment: number,
  called: number,
  distributed: number,

  // Lifecycle (Anleihen, PE)
  lifecycle: { maturity: string | null },
}
```

### Owner

```js
{
  id: string,
  label: string,
  type: "Person" | "GmbH" | "Stiftung" | "GbR" | "AG" | "Sonstiges",
  ownedBy: [{ ownerId, share }],   // Gesellschafter (für GmbH, GbR, etc.)
  tax: {
    personalTaxRate: number,       // Grenzsteuersatz in %
    churchTax: boolean,
    sparerpauschbetrag: number,    // in €
    zusammenveranlagung: boolean,
  },
}
```

### Income/Expense Stream

```js
{
  id: string,
  label: string,
  type: IncomeType,               // "Gehalt" | "Rente" | "Freelance" | ...
  owner: string | null,           // ownerId (nur incomeStreams)
  amount: number,                 // monatlicher Betrag in €
  growthPct: number,              // jährliches Wachstum in % (nur incomeStreams)
  startsAt: number,               // Jahr (z.B. 2024)
  endsAt: number | null,          // Jahr oder null (unbegrenzt)
}
```

### Bucket (geplante Ausgabe)

```js
{
  id: string,
  label: string,
  amount: number,
  type: "Einmalig" | "Jährlich" | "Monatlich",
  year: number | null,            // Zieljahr (absolut)
  age: number | null,             // Ziellebensalter (alternativ zu year)
  fundingMode: "lump_sum" | "financed",
  monthlyPayment: number,         // bei fundingMode="financed"
  financingMonths: number,
  financingStart: number,         // Startjahr der Finanzierungsphase
}
```

---

## Berechnungsmethoden

### 1. Cashflow-Rechnung (Haushalt)

Der monatliche Cashflow `cf` wird aus allen laufenden Einnahmen und Ausgaben des aktuellen Jahres berechnet.

**Einnahmen:**
```
streamIncome        = Σ incomeStreams (aktiv im CY, mit Wachstumszins)
immoGross           = Σ monthlyRent × ownerShare
forderungIncome     = Σ monthlyRepayment × ownerShare
assetYieldIncome    = Σ value × yieldPct/100/12 × kestFactor × ownerShare
                      (nicht Immobilien, nicht Forderungen)

avail = streamIncome + (immoGross - immoAnnuität - immoRunning)
        + forderungIncome + assetYieldIncome
```

**Ausgaben (gebundener Cashflow):**
```
bound = streamExpense + otherAnnuität (Nicht-Immo-Darlehen) + assetRunningCosts
```

**Sparrate:**
```
rest = avail - bound
eff  = autoSpar ? max(0, rest) : manuellSparrate
```

**Sparquote:** `eff / avail × 100`

### 2. KeSt-Faktoren

Die Kapitalertragsteuer wird per Asset-Klasse mit der effektiven Rate nach Teilfreistellung berechnet:

| Asset-Klasse | Effektivrate | Grundlage |
|---|---|---|
| Aktien | 26,375% | Volle Abgeltungsteuer + SolZ |
| Aktien-ETF | 18,46% | 30% Teilfreistellung → 26,375% × 0,70 |
| Anleihen | 26,375% | Volle Abgeltungsteuer |
| Anleihen-ETF | 18,46% | 30% Teilfreistellung |
| Immobilien | 0% | 10-Jahres-Regel (vereinfacht) |
| Cash | 26,375% | Volle Abgeltungsteuer |
| Rohstoffe | 26,375% | Volle Abgeltungsteuer |
| Krypto | 26,375% | Volle Abgeltungsteuer |
| Private Equity | 15,825% | Teileinkünfteverfahren: 60% × 26,375% |
| Forderung | 26,375% | Volle Abgeltungsteuer |

KeSt wird angewendet auf:
- **Ausschüttungsrenditen** im Cashflow: `yieldIncome × (1 - KeSt-Rate)`
- **Kapitalzuwachs** in der Projektion: `capApprR × (1 - KeSt-Rate)`

### 3. Kapitalwachstum in der Projektion

Die Projektion berechnet für jeden Jahr-Offset `y` drei Szenarien (konservativ −2%, Basis, optimistisch +2%).

**Standardassets (Aktien, ETFs, etc.):**

Entscheidend ist die Trennung zwischen Kapitalzuwachs und Ausschüttungsrendite, um Doppelzählung zu vermeiden — die Ausschüttung fließt bereits über die Sparrate:

```
capApprR = classReturn + scenarioAdj - yieldPct
kest     = taxOnReturns ? KEST_RATES[class] : 0
baseR    = capApprR × (1 - kest)          // realer Netto-Wachstumssatz

FV = value × (1+r)^(y×12) + sp/mo × [(1+r/mo)^(y×12) - 1] / (r/mo)
```

Dabei ist `sp` die monatliche Sparrate `computeSp(y)` (zeitabhängig), `r/mo = baseR/100/12`.

**Immobilien:**
```
FV = value × (1 + classReturn/100)^y - remDebt
remDebt = max(0, debt - tilgung×12×y)
```
Keine Sparrate-Zufuhr, kein KeSt (10-Jahres-Regel).

**Cash:**
```
FV = value × (1 + r)^y
```
Keine Sparrate-Zufuhr (Cash ist Puffer, keine Anlage).

**Forderungen:**
```
FV = max(0, value × (1+r/mo)^mo - rep × [(1+r/mo)^mo - 1] / (r/mo))
```
Schrumpft durch monatliche Rückzahlung `rep = monthlyRepayment`.

**Sonstiges (Verbrauchsgüter, abschreibungsgefährdete Assets):**
```
FV = max(0, value × (1 + min(0, baseR/100))^y)
```
Nur Abschreibung, kein Wachstum über 0%.

### 4. Sparrate in der Projektion `computeSp(y)`

Im Auto-Modus wird die Sparrate für jedes Jahr dynamisch berechnet:

```
sp(y) = max(0,
    Σ incomeStreams(absYear) × wachstum
  + immoNetCF(y)            × mietpreissteigerung
  + forderungIncome
  + assetYield(y)           × kestFactor
  - Σ expenseStreams(absYear)
  - otherAnnuität(y)        (fällt weg wenn Darlehen abbezahlt)
  - finanzierte Buckets(y)
)
```

Beendete Darlehen setzen automatisch Cashflow frei: `if remDebt(y) ≤ 0: Annuität = 0`.

Mietpreissteigerung: `monthlyRent × (1 + immoRentGrowthPct/100)^y`

Im manuellen Modus: fester Betrag `manuellSparrate`, optional mit jährlichem Wachstum `sparGrowthPct`.

### 5. Sparverteilung

**Auto-Modus:** proportional zu den Marktwerten der nicht-gesperrten, investierbaren Assets (exkl. Cash, Immo, Forderung, Sonstiges). Gesperrte Assets nehmen nicht teil.

**Manuell:** feste monatliche Beträge pro Asset-Klasse. Skalieren proportional mit der tatsächlichen Sparrate, wenn diese vom Basisjahr abweicht.

### 6. Bucket-Drainage

Buckets ziehen einmalig oder wiederkehrend vom projizierten Vermögen ab:

```
bucketDrain(year) =
  Σ Einmalig:  amount  wenn year == targetYear
  Σ Jährlich:  amount  wenn year >= targetYear
  Σ Monatlich: amount×12 wenn year >= targetYear
```

Finanzierte Buckets (`fundingMode="financed"`) reduzieren stattdessen die Sparrate in der Finanzierungsphase.

### 7. Inflationsbereinigung

Optional, deaktiviert per Default:
```
FV_real = FV_nominal / (1 + inflation/100)^y
```

### 8. Milestones

Dynamisch: Aus einem Satz vordefinierter Schwellen (250k, 500k, 750k, 1M, 1.5M, 2M, 3M, 5M, 7.5M, 10M, 15M, 20M, 30M, 50M) werden die vier nächsten Schwellen oberhalb von `0.9 × currentNet` angezeigt. Das Erreicungsjahr wird interpoliert (erste Projektion-Zeile, die die Schwelle überschreitet).

---

## Versionshistorie

### v1.5 — Excel Export & Import (April 2026)
- Excel-Export aller Assets als `.xlsx` mit Datum-Stempel (Datum, Name, Klasse, Eigentümer, Wert, Schulden, Nettowert, Liquidität, Ausschüttungsrendite, Bewertungsmethode, Notiz)
- Excel-Import: Abgleich via Asset-Name, Vorschau-Modal mit Update/Neu-Kennzeichnung und Wertveränderung, selektive Übernahme per Toggle
- Eigentümeranteil wird als "Ehemann 60%, Ehefrau 40%" serialisiert und beim Import zurückgeparst

### v1.4 — Yield-Cashflow-Integration (April 2026)
- `yieldPct` auf Assets: Ausschüttungsrendite in % p.a. (Dividenden, Kupons, PE-Distributions)
- Yield fließt monatlich als Cashflow in den Haushalt (nach KeSt wenn aktiviert)
- Projektion trennt Kapitalzuwachs (`capApprR = totalReturn - yieldPct`) von Ausschüttung — keine Doppelzählung
- Haushalt-Tab zeigt Kapitalerträge-Block mit Auflistung je Asset

### v1.3 — Steuer, Alter & Projektion-Erweiterungen (März 2026)
- Konfigurierbares Geburtsalter (`birthYear`) statt hardcoded 35
- KeSt-Toggle: Kapitalertragsteuer per Asset-Klasse (Teilfreistellung ETFs, Teileinkünfteverfahren PE)
- Mietpreissteigerung in der Projektion (`immoRentGrowthPct`)
- Dynamische Milestones statt statischer Schwellen
- Sparrate wächst optional mit (`sparRateGrowth`, `sparGrowthPct`)
- Alle Umlaute (ü, ö, ä, ß) in der gesamten UI korrigiert

### v1.2 — Vollständiges Datenmodell (Februar 2026)
- `ownership[]`-Array für Miteigentümer mit Bruchteilen (löst `owner`-String ab)
- Asset-Modal: Ownership-Editor, Tax-Section (Anschaffungspreis, Steuerstatus), PE-Felder (Commitment/Called/Distributed), Lifecycle (Fälligkeit), Bewertungsmethode
- Owner-Modal: Typ (Person/GmbH/GbR/...), Gesellschafter-Editor, Steuerprofile per Eigentümer, Güterstand und Steuerveranlagung auf Profil-Ebene
- Einkommens- und Ausgabenströme: zeitbegrenzt, per Eigentümer, mit Wachstumsrate
- Bucket-Finanzierungsmodus: Einmalzahlung vs. monatliche Finanzierungsrate

### v1.1 — Haushalt & Cashflow (Januar 2026)
- Eigentümer-Filter (Chips im Header): filtert Assets und Haushalt auf Teilhaber-Ebene
- Forderungen als Asset-Klasse mit monatlicher Rückzahlung
- Per-Asset Immo-Cashflow (Bruttomiete, Hausgeld, Grundsteuer, Annuität)
- Manuelle Sparratenverteilung auf Asset-Klassen
- Nettowert-Snapshots mit Asset-Einzelwerten

### v1.0 — Grundstruktur (Dezember 2025)
- Multi-Profil-System mit localStorage-Isolation
- 5-Tab-Struktur: Übersicht, Haushalt, Vermögen, Projektion, Ausgaben
- 11 Asset-Klassen mit konfigurierbaren Rendite-Slidern
- 3-Szenario-Projektion (konservativ/Basis/optimistisch)
- Bucket-System für geplante Ausgaben
- Dark/Light Mode

---

## Geplante Features

### Kurzfristig (nächste Iteration)

**Steuerrechner pro Eigentümer**
Tatsächliche KeSt-Berechnung mit Sparerpauschbetrag je natürlicher Person, Kirchensteuer, Güterstand-Effekte auf Zugewinnausgleich. Heute wird der Steuersatz einheitlich pro Klasse angewendet — künftig soll er je Eigentümer und Veranlagungsart differieren.

**Rollierender Nettowert-Chart im Dashboard**
Snapshots als Zeitreihe mit Linienchart (Recharts) statt nur tabellarischer Ansicht. Zeigt historische Entwicklung gegen Projektionspfad.

**Check-in Auswertung**
Monatliche Check-ins werden heute gespeichert, aber kaum ausgewertet. Sparquoten-Verlauf, Abweichung vom Plan, Trend-Visualisierung.

**Asset-Import aus CSV/PDF**
Depotauszüge von Banken (comdirect, ING, DKB) direkt als CSV importieren, Positionen matchen und Werte aktualisieren.

### Mittelfristig

**Nachlassplanung / Erbschaftsteuer**
Freibeträge (400k Ehegatte, 400k Kind je Elternteil, 10-Jahres-Schenkungsregel), geschätzter Erbschaftsteuerbetrag auf Portfolioebene, Schenkungsplanung über Zeit.

**GmbH / Holding-Ebene**
Separate Buchhaltungsebene für operative GmbH vs. Holding vs. Privatvermögen. Steuereffekte bei Gewinnausschüttung (KESt auf Dividenden aus der GmbH) vs. Thesaurierung.

**Renten- und Versorgungsrechnung**
Integration von gesetzlicher Rente (Auskunft manuell eingeben), Beamtenversorgung, betriebliche Altersvorsorge als zeitgesteuerte Einkommensströme mit Lebenserwartungsszenarien.

**Monte-Carlo-Simulation**
Statt fixer Rendite-Offsets: stochastische Simulation mit Normalverteilung um die erwartete Rendite (σ basierend auf historischer Volatilität je Klasse). Zeigt Konfidenzintervalle statt drei Linien.

**Währungsrisiko**
Assets in Fremdwährung (USD, CHF) mit Wechselkurs-Eingabe und optionaler Hedging-Simulation.

### Langfristig

**Cloud-Sync (optional)**
Ende-zu-Ende-verschlüsselte Synchronisation über einen selbst gehosteten Backend (z.B. Supabase) — nur auf expliziten Wunsch, kein Zwang.

**Berater-Modus**
Separate Ansicht für Mandanten ohne Bearbeitungsrechte, PDF-Report-Export (Zusammenfassung Vermögen + Projektion + Haushalt auf 2 Seiten).

**Immobilien-DCF**
Vollständige Discounted-Cashflow-Bewertung einer Immobilie: Bruttomietmultiplikator, Leerstandsrisiko, Instandhaltungsrücklage, Steuer auf Mieteinnahmen (§ 21 EStG).

**KI-gestützte Szenarienanalyse**
Natürlichsprachliche Eingabe ("Was passiert wenn ich mit 55 aufhöre zu arbeiten?") die automatisch Streams, Buckets und Horizont anpasst und eine Vergleichsansicht zeigt.
