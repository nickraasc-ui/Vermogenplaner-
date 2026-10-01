# Vermögensplaner

Private Vermögens-, Haushalts- und Projektionsplanung für komplexe Vermögensstrukturen — mehrere Eigentümer, Immobilien mit Darlehen, Depots, Beteiligungen, 35-Jahres-Prognose. Läuft als installierbare Web-App (PWA) vollständig im Browser: keine Cloud, kein Konto, keine Datenweitergabe.

**Live:** https://vermogenplaner-plw2.vercel.app

## Schnellstart

Voraussetzung: Node.js 20 oder neuer (empfohlen 22, siehe `.nvmrc`).

```bash
git clone https://github.com/nickraasc-ui/Vermogenplaner-.git
cd Vermogenplaner-
npm ci
npm run dev          # http://localhost:5173
```

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver mit Hot Reload |
| `npm test` | Berechnungs- und Datenmodell-Tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run check` | Lint + Tests + Build — vor jedem Push |
| `npm run build` | Produktions-Build nach `dist/` |
| `npm run preview` | Produktions-Build lokal ansehen (inkl. Service Worker) |

## Deployment

Vercel baut automatisch aus GitHub:

- Push auf **`main`** → Produktion (die Live-Adresse oben).
- Push auf jeden anderen Branch → eigene **Preview**-Adresse (in Vercel unter *Deployments*).

Vercel erkennt Vite automatisch (Build `npm run build`, Ausgabe `dist/`); eine `vercel.json` ist nicht nötig. Im Vercel-Konto sind derzeit vier Projekte mit diesem Repository verbunden (`vermogenplaner`, `-gnpj`, `-xchn`, `-plw2`), die alle bei jedem Push bauen. Genutzt wird `-plw2`; die übrigen können in Vercel gelöscht werden.

GitHub Actions (`.github/workflows/ci.yml`) prüft jeden Push auf `main` und jeden Pull Request mit Lint, Tests und Build.

## Daten & Datenschutz

Alle Daten liegen im `localStorage` des Browsers, getrennt pro Adresse (Domain) und Profil. Es gibt keinen Server. Browserdaten löschen oder ein anderes Gerät/eine andere Adresse verwenden heißt: Daten sind dort nicht vorhanden. Vor einer Datenmodell-Migration legt die App automatisch eine Sicherungskopie im Browser an. Details: [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md).

## Projektstruktur

```
src/
├── main.jsx                 Einstieg, Service-Worker-Registrierung (nur Produktion)
├── app.jsx                  Profilauswahl, Theme
├── AppInner.jsx             geöffnetes Profil: Zustand, Tabs, Dialoge
├── storage.js               localStorage, Sicherungskopie vor Migration
├── constants.js             Asset-Klassen, Enums, Standardwerte
├── format.js                deutsches Zahlen-/Datumsformat, Eingaben parsen
├── theme.js                 Farb-Tokens (hell/dunkel)
├── model/                   reine Logik ohne React — getestet
│   ├── schema.js            Datenmodell, Normalisierer, Migrationen, Eigentums-Helfer
│   ├── defaults.js          Demo-Daten neuer Profile
│   ├── setup.js             Profil aus den Antworten des Einrichtungs-Quiz
│   ├── derive.js            deriveAll(): alle angezeigten Werte, Szenario-Wirkung
│   ├── cashflow.js          cashflowAt(y): Cashflow eines Jahres
│   ├── projection.js        Vermögensprojektion (3 Szenarien)
│   ├── finance.js           KeSt, Restschuld, Tilgungsdauer, Eigentumsanteil
│   └── ids.js               ID-Generator
├── components/              Tabs, OrgChart, Anleitung, gemeinsame UI (ui.jsx)
│   └── modals/              Bearbeitungs-Dialoge
└── utils/excelIO.js         Excel-Export/-Import (ExcelJS, bei Bedarf geladen)
public/                      Icons, Web-Manifest, Service Worker
tests/                       Vitest: Fixtures, Snapshots, Modell- und Migrations-Tests
docs/                        Datenmodell, Berechnungen, Roadmap
```

## Architektur in Kürze

- **Zustand:** ein Objekt pro Profil (`useState` in `AppInner.jsx`), bei jeder Änderung in `localStorage` gespeichert. Änderungen über `upd(patch)`, `updArr(key, array)`, `updClass(klasse, rendite)`.
- **Berechnung:** `deriveAll(state, { ownerFilter, projClassFilter })` liefert Cashflow, Aggregation, Darlehen, Sparverteilung und Projektion — reine Funktionen, siehe [`docs/CALCULATIONS.md`](docs/CALCULATIONS.md).
- **Datenmodell:** versioniert, jede Änderung über eine Migration, siehe [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md).
- **Oberfläche:** React 18, Inline-Styles mit Theme-Tokens (`theme.js`), globale Styles in `index.html`, Icons von Lucide, Schrift Inter (lokal eingebunden).

## Mitarbeiten

- Oberfläche und Dokumentation auf Deutsch, Code-Kommentare auf Englisch.
- Änderungen an Berechnungen nur in `src/model/` und immer mit Test. Die Snapshot-Tests in `tests/derive.test.js` zeigen jede Zahl, die sich ändert; gewollte Änderungen mit `npx vitest run -u` übernehmen und im Commit begründen.
- Änderungen am gespeicherten Format nur über eine neue Migration (siehe `docs/DATA_MODEL.md`).
- Vor dem Push: `npm run check`.

## Wofür

Das Tool richtet sich an wohlhabende Privatpersonen und Berater, die Vermögen jenseits klassischer Banksoftware planen wollen — mit realer Struktur statt vereinfachter Buchführung.

**Ehepaare mit gemischtem Vermögen**
Direktaktien (teilweise gesperrt/geschenkt), Immobilien mit Darlehen, ETF-Depots bei verschiedenen Banken, gemeinsame und getrennte Liquidität. Das Tool bildet Miteigentumsquoten ab (z.B. 60/40 Anteil), rechnet auf Teilhaber-Ebene und ermöglicht getrennte Steuerveranlagung pro Eigentümer.

**Unternehmer mit Holding-Struktur**
Beteiligungen über GmbH oder GbR, Gesellschafter-Anteile mit Durchblick auf natürliche Personen, Teileinkünfteverfahren für Dividenden aus GmbH-Anteilen, private Entnahmeplanung neben Unternehmensebene.

**Immobilien-lastige Portfolios**
Mehrere Objekte mit je eigenem Darlehen, Mieteinnahmen, Hausgeld und Grundsteuer. Automatische Cashflow-Rechnung (Bruttomiete minus Annuität minus laufende Kosten), Mietpreissteigerung in der Projektion, Schuldenfreiheitszeitpunkt je Objekt. Darlehen mit Rate, anfänglicher Tilgung oder Laufzeit, Zinsbindung mit Anschlusszins, Sondertilgung und Tilgungsplan pro Jahr.

**Private-Equity-Anleger**
Commitment/Called/Distributed-Tracking, illiquide Klassifizierung, J-Curve-Verhalten durch negativen Sonstiges-Slider, letzter Financing Round als Bewertungsmethode.

**Ruhestandsplanung**
Altersbezogene Milestones, Rentenplanung als befristeter Einkommensstrom, Entnahmeplanung via Szenarien (einmalig/jährlich/monatlich), Inflationsbereinigung in der Projektion, Zeithorizont bis 50 Jahre.

**Schenkung und Erbschaft**
Gesperrte Assets (locked-Flag), stille Reserven (Anschaffungspreis vs. Marktwert), Güterstand-Verwaltung (Zugewinngemeinschaft / Gütertrennung / Gütergemeinschaft).

## Weitere Dokumente

- [`CHANGELOG.md`](CHANGELOG.md) — Versionshistorie
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — Felder, Speicherung, Migrationen
- [`docs/CALCULATIONS.md`](docs/CALCULATIONS.md) — Cashflow, Steuern, Projektion
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — geplante Funktionen
