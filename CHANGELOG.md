# Changelog


## v1.16 — Neues Design, korrigierte Projektion, sauberes Datenmodell (Oktober 2026)

**Design**
- Neues Erscheinungsbild im Trade-Republic-Stil: schwarz/weiß, flache Listen, große Kennzahlen, Lucide-Icons, Schrift Inter (lokal)

**Berechnungen**
- Berechnungen aus `AppInner.jsx` nach `src/model/` verschoben, Vitest-Tests
- Eine Cashflow-Implementierung für heute und alle Projektionsjahre
- Projektion: Tilgung erhöht das Vermögen, Immobilien wachsen auf den vollen Wert, Startwert = Nettovermögen, Sparraten-Verteilung und „gesperrt" wirken, endfällige Darlehen werden bei Fälligkeit bezahlt, gesperrte Positionen werden nie verkauft
- „Schuldenfrei"-Datum aus dem exakten Tilgungsplan; CSV-Export, Zukunfts-Snapshots und Szenario-Wirkung nutzen die Projektion
- Sparer-Pauschbetrag und Szenario-Alter berücksichtigen den Eigentümer-Filter korrekt
- Fix: Miete/Hausgeld 0 € werden nicht mehr durch Standardwerte ersetzt; 0-%-Darlehen behalten ihren Zins; gelöschte Einnahmen/Ausgaben werden nicht mehr neu angelegt

**Datenmodell (Schema v2)**
- Versioniertes Schema mit Migration und automatischer Sicherungskopie
- Einheitliches Eigentum (`ownership`) für Positionen, Ströme und Darlehen; Szenarien mit `kind` + `frequency`
- Validierung: Anteile = 100 %, Eigentümer nur löschbar wenn unbenutzt; eindeutige IDs; Theme als Geräteeinstellung; Warnung bei Speicherfehler

**Setup**
- PWA: Icons, Manifest, Service Worker (offline nutzbar, installierbar)
- Excel über ExcelJS statt xlsx (Sicherheitslücke), nur `.xlsx`
- Vite 7, Vitest, ESLint, GitHub Actions, Node-Version fixiert, `npm audit` ohne Befund
- Dokumentation aufgeteilt (README, `docs/`, CHANGELOG); Netlify-Konfiguration entfernt

## v1.15 — Organogramm: Familien- & Beteiligungsstruktur (Mai 2026)
- **OrgChart-Komponente** (`src/components/OrgChart.jsx`): interaktives SVG-Organogramm im Dashboard-Tab (collapsible)
- **Vertikale Tier-Darstellung**: Personen in Tier 0, Gesellschaften nach Beteiligungstiefe (rekursiv, zyklusgeschützt via `Set`)
- **Gesellschaftsformen**: `OWNER_TYPES` erweitert um KG, GmbH & Co. KG, GbR, Stiftung, AG — mit Typ-Icon je Entität
- **Beteiligungskanten** (solid): Kurvenpfade zwischen Eigentümer und Gesellschaft mit %-Beschriftung
- **Familienbeziehungskanten** (gestrichelt): farblich je Typ (Ehepartner, Kind, Elternteil, Geschwister, Treuhänder, Begünstigter)
- **Datenmodell**: `owner.relations[]` — `{ targetId, type }` — neu; Migration in `storage.js` ergänzt; Duplikate beim Rendern dedupliziert
- **RelationModal** (`src/components/modals/RelationModal.jsx`): separates Modal zum Pflegen von Familienbeziehungen (✏-Button je Knoten)
- **Asset-Detailpanel**: Tippen auf Knoten öffnet zugeordnete Positionen mit anteiligem Nettowert unterhalb des Charts
- **`RELATION_TYPES`** in `constants.js`: typsichere Werteliste mit Farben für UI und SVG-Rendering

## v1.14 — Steuergenauigkeit: Pauschbetrag, Vorabpauschale, Krypto-Langfrist (Mai 2026)
- **Krypto > 1 Jahr**: neuer Steuertyp `krypto_langfristig` (0% KeSt, §23 EStG) im Asset-Modal auswählbar
- **Sparer-Pauschbetrag**: erstes Ertrags-Kontingent je Eigentümer (`owner.tax.sparerpauschbetrag`) steuerfrei — Kapitalerträge werden erst darüber mit KeSt belastet; wirkt in Cashflow und Projektion
- **Vorabpauschale**: jährlicher Rendite-Drag für thesaurierende ETFs (`yieldPct = 0`) bei aktivierter Nachsteuer-Berechnung; Basiszins im Projektions-Tab einstellbar (Standard 2,29% / 2024)
- **KeSt-Fix**: negative Kurswertsteigerung wird nicht steuerlich reduziert (vorher wurde KeSt-Multiplikator fälschlich auf Verluste angewendet)
- **Rentenlücke**: Hinweistext macht explizit, dass gesetzliche Rente als Einkommensstrom mit Startdatum eingetragen werden muss
- **Tragfähigkeit**: Reichweite-Metrik umbenannt zu "Tragfähigkeit (0% Rendite)" mit 4%-Regel-Indikator
- **Sparraten-Verteilung**: sichtbare Warnung wenn manuelle Zuteilung die effektive Sparrate übersteigt
- **Git**: doppelter `Src/`-Eintrag (Groß-/Kleinschreibungsfehler macOS) aus git-Index entfernt

## v1.13 — Projektion UX: Szenario-Tiles klickbar, Inflation hinter Expand (April 2026)
- Rendite-Spreads für Konservativ/Optimistisch-Szenarien nur noch zugänglich via Klick auf das jeweilige Tile (kein immer-sichtbarer Slider)
- Basis-Tile zeigt gewichtete Durchschnittsrendite und Link zu Vermögen-Tab
- Inflation als eigenes klickbares Panel: zeigt Status (nominal/real + Rate), öffnet bei Klick Toggle + Rate-Slider
- Planning-Parameter-Block bereinigt: nur noch Sparraten-Wachstum, Steuern, Alter, Zeithorizont, Mietpreissteigerung

## v1.12 — Sparraten-Integrität: kein Kapitalfluss aus dem Nichts (April 2026)
- Sparrate kann strukturell nie den tatsächlichen Einkommensüberschuss übersteigen — gilt für Haushalt-`cf.eff` und Projektions-`sp`
- `freed`-Annuität aus manuellem Modus entfernt (war Doppelzählung: `otherAnnu` sinkt natürlich wenn Kredit abbezahlt)
- Haushalt-Tab zeigt Warnung wenn manuelles Sparziel den verfügbaren Überschuss übersteigt
- Zugehöriges `effTarget`-Feld in `cf` für Zielanzeige ohne Modell-Verfälschung

## v1.11 — Standalone-Darlehen & Eigentümer-Geburtsjahr (April 2026)
- **Standalone Loans** (`StandaloneLoanModal`): Verbindlichkeiten ohne Asset-Bindung (KFZ-Kredit, Privatdarlehen etc.)
- TabVermogen: neue "Verbindlichkeiten"-Karte mit Add/Edit/Delete; Restschuld in Gesamtschulden und Nettowert eingerechnet
- Standalone Loans vollständig in `loanSummary`, `cf.otherAnnuitat`, `agg.debt/net`, Projektions-`nonImmoLoans` + `computeCF.otherAnnu` verdrahtet; `computeRemDebt` korrekt angewendet
- **Owner birthYear**: Geburtsjahr-Feld für Personen (Neu-Anlage + Bearbeitung)
- `currentAge` in Projektion owner-aware: bei Einzeleigentümer-Filter wird dessen Geburtsjahr für die Altersachse verwendet

## v1.10 — Haushaltspuffer, Sparraten-Szenarien & Projektion-Fixes (April 2026)
- **Haushaltspuffer**: Cash-Asset mit `isHaushaltsPuffer`-Flag; negative Haushaltssalden werden zuerst daraus gedeckt; Puffer wächst mit Cash-Rendite; in Projektion separat von V_invest getrackt
- Ausgabenströme: `isBufferContribution`-Flag leitet Beiträge an Pufferkonto weiter statt Konsum
- Ausgabenströme: `owner`-Zuordnung; Haushalt-Tab filtert nach Eigentümer
- **Fix 0%-Rendite-Bug**: `||` durch `??` (nullish coalescing) ersetzt — 0% Rendite wurde fälschlich auf 5% gesetzt
- Konfigurierbare Szenario-Spreads (`projSpreadCons`, `projSpreadOpt`) statt fest verdrahteter ±2%
- `assetYield` in Projektion: nutzt projected Asset-Value statt gefrorenem Startwert
- CSV-Export: Jahreswerte korrekt (monatliche CF × 12 im annual-discrete Modell)
- Haushalt: Monat/Jahr-Toggle, "Portfolioentnahme"-Zeile, Owner-Filter-Warnung

## v1.9 — Dashboard-Aufräumung & Darlehen-Annuität manuell (April 2026)
- Dashboard-Schnellbutton "Leisten?" umbenannt zu **"Szenarien"** mit direktem Link zum Szenarien-Tab
- "Aktive Buckets"-Kachel zeigt nur aktive Szenarien (Szenarien können deaktiviert werden)
- Check-in-Anzeige auf Dashboard: nutzt `streamExp_ist` (neues Feld) statt `ausgaben_ist`; zeigt `inc_ist` wenn vorhanden
- **AssetModal**: Für Annuitätendarlehen kann die monatliche Rate jetzt manuell eingegeben werden — überschreibt die Auto-Berechnung aus Zins + Laufzeit (nützlich wenn Bank-Rate bekannt ist)

## v1.8 — Haushalt-Restrukturierung & erweiterter Check-in (April 2026)
- Haushalt-Tab komplett neu geordnet: Auswertungen oben (Tiles, Cashflow-Vorschau, Monatsübersicht), Konfiguration unten
- **Cashflow-Vorschau**: Jahres-Regler wählt beliebiges Jahr im Horizont; Monatsübersicht zeigt projizierte Werte für dieses Jahr (inkl. Darlehensfreifällen)
- Schieberegler und Chart-Klick synchron: Klick auf Balken im Chart wählt das Jahr, Regler zeigt Position
- **Erweiterter Check-in**: IST-Daten für jeden Zeitpunkt erfassen — Einnahmen, Ausgaben, Sparrate, Immo-CF; Live-Delta vs. Projektion; projizierte Werte als Referenz vorausgefüllt
- Bestehende Check-ins werden in der Chart-Vorschau als Markierungen angezeigt
- "+ IST erfassen"-Button im Tab kontextbezogen für das ausgewählte Jahr

## v1.7 — Inkrementelle Projektion, CSV-Export & Szenario-Planer (April 2026)
- **Projektions-Fix**: Umstellung von geschlossener Formel auf inkrementelle Jahres-Simulation — Portfolio fällt korrekt auf 0, negative Szenarien werden sauber abgebildet
- Buckets: `endsAt`-Feld für wiederkehrende Ausgaben (Jährlich/Monatlich) — Szenario endet in definiertem Jahr
- Buckets: Zieljahr-Bug behoben (kein Bucket-Jahr → defaultet auf aktuelles Jahr statt null)
- **CSV-Export** der Projektion: pro Jahr mit Zeitstempel, Cashflow-Spalten (Einnahmen, Ausgaben, Sparrate, Immo-CF, Kapitalerträge, Kreditraten), proportionale Aufschlüsselung nach Asset-Klasse und Eigentümer
- **Szenario-Planer** (Tab "Szenarien" umbenannt): 4 Typen — Ausgabe, Zufluss, Sparratenänderung, Finanziert; `active`-Toggle zum Ein-/Ausschalten ohne Löschen
- `cashflowProjection`-Array als zentrale Datenquelle: versorgt Haushalt-Tab, Projektion-Tab und Check-in-Modal

## v1.6 — Darlehenstypen & exakte Tilgungsberechnung (April 2026)
- Drei Darlehenstypen pro Asset: **Annuität** (gleichbleibende Rate), **Volltilger** (vollständige Tilgung in der Laufzeit), **Endfällig** (nur Zinsen, Kapital am Ende)
- Annuität und Tilgung werden automatisch aus Zinssatz + Laufzeit + Restschuld berechnet (kein manuelles Einpflegen mehr)
- Anzeige: monatliche Rate, anfängliche Tilgung %, Gesamtzinsaufwand
- Projektion verwendet exakte Tilgungsformel (`D × (1+r)^n - M × ((1+r)^n - 1)/r`) statt linearer Näherung
- Endfällige Darlehen: konstante Zinszahlung in CF-Projektion, Restschuld fällt zum Laufzeitende auf 0
- Datenmodell-Dokumentation: vollständige Feldnutzungs-Matrix (welche Felder wo wirken)

## v1.5 — Excel Export & Import (April 2026)
- Excel-Export aller Assets als `.xlsx` mit Datum-Stempel (Datum, Name, Klasse, Eigentümer, Wert, Schulden, Nettowert, Liquidität, Ausschüttungsrendite, Bewertungsmethode, Notiz)
- Excel-Import: Abgleich via Asset-Name, Vorschau-Modal mit Update/Neu-Kennzeichnung und Wertveränderung, selektive Übernahme per Toggle
- Eigentümeranteil wird als "Ehemann 60%, Ehefrau 40%" serialisiert und beim Import zurückgeparst

## v1.4 — Yield-Cashflow-Integration (April 2026)
- `yieldPct` auf Assets: Ausschüttungsrendite in % p.a. (Dividenden, Kupons, PE-Distributions)
- Yield fließt monatlich als Cashflow in den Haushalt (nach KeSt wenn aktiviert)
- Projektion trennt Kapitalzuwachs (`capApprR = totalReturn - yieldPct`) von Ausschüttung — keine Doppelzählung
- Haushalt-Tab zeigt Kapitalerträge-Block mit Auflistung je Asset

## v1.3 — Steuer, Alter & Projektion-Erweiterungen (März 2026)
- Konfigurierbares Geburtsalter (`birthYear`) statt hardcoded 35
- KeSt-Toggle: Kapitalertragsteuer per Asset-Klasse (Teilfreistellung ETFs, Teileinkünfteverfahren PE)
- Mietpreissteigerung in der Projektion (`immoRentGrowthPct`)
- Dynamische Milestones statt statischer Schwellen
- Sparrate wächst optional mit (`sparRateGrowth`, `sparGrowthPct`)
- Alle Umlaute (ü, ö, ä, ß) in der gesamten UI korrigiert

## v1.2 — Vollständiges Datenmodell (Februar 2026)
- `ownership[]`-Array für Miteigentümer mit Bruchteilen (löst `owner`-String ab)
- Asset-Modal: Ownership-Editor, Tax-Section (Anschaffungspreis, Steuerstatus), PE-Felder (Commitment/Called/Distributed), Lifecycle (Fälligkeit), Bewertungsmethode
- Owner-Modal: Typ (Person/GmbH/GbR/...), Gesellschafter-Editor, Steuerprofile per Eigentümer, Güterstand und Steuerveranlagung auf Profil-Ebene
- Einkommens- und Ausgabenströme: zeitbegrenzt, per Eigentümer, mit Wachstumsrate
- Bucket-Finanzierungsmodus: Einmalzahlung vs. monatliche Finanzierungsrate

## v1.1 — Haushalt & Cashflow (Januar 2026)
- Eigentümer-Filter (Chips im Header): filtert Assets und Haushalt auf Teilhaber-Ebene
- Forderungen als Asset-Klasse mit monatlicher Rückzahlung
- Per-Asset Immo-Cashflow (Bruttomiete, Hausgeld, Grundsteuer, Annuität)
- Manuelle Sparratenverteilung auf Asset-Klassen
- Nettowert-Snapshots mit Asset-Einzelwerten

## v1.0 — Grundstruktur (Dezember 2025)
- Multi-Profil-System mit localStorage-Isolation
- 5-Tab-Struktur: Übersicht, Haushalt, Vermögen, Projektion, Ausgaben
- 11 Asset-Klassen mit konfigurierbaren Rendite-Slidern
- 3-Szenario-Projektion (konservativ/Basis/optimistisch)
- Bucket-System für geplante Ausgaben
- Dark/Light Mode
