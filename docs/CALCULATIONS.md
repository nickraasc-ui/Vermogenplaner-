# Berechnungen


Alle Berechnungen liegen als reine Funktionen in `src/model/` (ohne React) und sind mit Vitest getestet (`npm test`, Tests in `tests/`).

## 1. Überblick

| Datei | Inhalt |
|---|---|
| `src/model/derive.js` | `deriveAll(state, { ownerFilter, projClassFilter })` — alle Werte, die die Oberfläche zeigt |
| `src/model/cashflow.js` | `cashflowAt(y)` — monatlicher Cashflow eines Jahres (siehe 4.) |
| `src/model/projection.js` | `projectWealth` — Vermögensprojektion in drei Szenarien (siehe 3.) |
| `src/model/finance.js` | KeSt-Sätze, Eigentumsanteil |
| `src/model/loan.js` | Tilgungsplan je Darlehen: Restschuld, Rate pro Jahr, Zinsbindung, Sondertilgung, Dialog-Eingabe |
| `src/model/schema.js` | Datenmodell, Migrationen, Eigentums-Helfer (siehe `DATA_MODEL.md`) |

Der Cashflow des laufenden Monats (`cf`, Haushalt-Tab und Sparquote im Header) ist `cashflowAt(0)` plus Anzeigewerte:

```
saldo = avail − bound − eff          Sparquote = eff / avail × 100
```

## 2. KeSt-Faktoren

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
| Krypto | 26,375% | Volle Abgeltungsteuer (Haltedauer < 1 Jahr) |
| Krypto (>1 Jahr) | 0% | §23 EStG — Steuertyp `krypto_langfristig` setzen |
| Private Equity | 15,825% | Teileinkünfteverfahren: 60% × 26,375% |
| Forderung | 26,375% | Volle Abgeltungsteuer |

KeSt wird angewendet auf:
- **Ausschüttungsrenditen** im Cashflow: `yieldIncome × (1 - KeSt-Rate)`
- **Kapitalzuwachs** in der Projektion: nur bei positiver Kurswertsteigerung (`capApprR > 0`); Verluste werden nicht steuerlich reduziert

**Sparer-Pauschbetrag:** Das erste Kontingent an Kapitalerträgen ist steuerfrei: Summe von `owner.tax.sparerpauschbetrag` (Standard 1.000 €/Person) über alle Eigentümer — bei aktivem Eigentümer-Filter nur über die gefilterten. Übersteigendes wird mit der gewichteten KeSt-Rate belastet.

**Vorabpauschale (thesaurierende ETFs):** Bei aktiviertem `taxOnReturns` und `yieldPct = 0` wird für ETFs ein jährlicher Rendite-Drag berechnet:
```
drag = Basiszins × 0,7 × Teilfreistellung × 26,375%
     Aktien-ETF: Teilfreistellung = 0,7
     Anleihen-ETF: Teilfreistellung = 1,0
```
Basiszins ist einstellbar im Projektions-Tab (Standard: 2,29% / 2024).

## 3. Vermögensprojektion (`src/model/projection.js`)

Jede Position, Immobilie und jedes Darlehen wird **einzeln** fortgeschrieben (monatliche Verzinsung, Jahresschritte). Drei Durchläufe: Basis, konservativ (`−projSpreadCons` %-Punkte) und optimistisch (`+projSpreadOpt`).

```
Nettovermögen(y) = Σ Depot-Positionen(y) + Σ Immobilien(y) + Haushaltspuffer(y)
                 + Σ Forderungen(y) − Σ Restschulden(y)
```

Im Jahr 0 entspricht das exakt dem Nettovermögen im Header (inkl. Wertpapierkrediten und separaten Verbindlichkeiten).

**Depot-Positionen** (alle Klassen außer Immobilien, Forderung, Haushaltspuffer) wachsen mit ihrer Netto-Rendite:
```
r = classReturn + Szenario-Abschlag − yieldPct          // Ausschüttung fließt in den Cashflow
r = r > 0 ? r × (1 − KeSt) : r                          // nur bei taxOnReturns; Verluste unversteuert
r −= Vorabpauschale-Drag                                // thesaurierende ETFs, siehe 2.
V(y) = V(y−1) × (1 + r/1200)^12
```

**Immobilien** wachsen auf den **vollen Marktwert** (nicht nur auf das Eigenkapital): `value × (1 + r/1200)^(12y)`.

**Darlehen** (Asset-Darlehen × Eigentumsanteil, separate Verbindlichkeiten voll) folgen ihrem **Tilgungsplan** (`loanSchedule` in `src/model/loan.js`). Er wird Monat für Monat gerechnet und pro Jahr zusammengefasst (Zinsen, Tilgung, Sondertilgung, Schlusszahlung, Restschuld):

```
Zinsen  = Restschuld × Zins / 1200
Tilgung = Rate − Zinsen                     (letzte Rate: nur der Rest)
Jahresende: Restschuld −= Sondertilgung     (höchstens die Restschuld)
```

| Typ | Verlauf |
|---|---|
| Annuität / Volltilger | gleichbleibende Rate, der Zinsanteil sinkt, der Tilgungsanteil steigt |
| Endfällig | Rate = Zinsen; die Restschuld bleibt bis zur Fälligkeit (`loanTermYears`) und wird dann in einer Summe aus dem Depot bezahlt |
| Altdaten ohne Rate | lineare Tilgung über `loanTilgung` plus Zinsen |

**Zinsbindung:** Mit `loanFixedUntil` (letztes Jahr) und `loanFollowUpRate` gilt ab dem Folgejahr der Anschlusszins. Die neue Rate wird so gewählt, dass das Darlehen im **ursprünglich geplanten Monat** abbezahlt ist (bei Sondertilgungen per Bisektion); ohne Tilgungsende bleibt die Rate. Bei endfälligen Darlehen folgen nur die Zinsen dem neuen Satz. Ohne Anschlusszins zeigt der Dialog nur die Restschuld am Ende der Zinsbindung.

Die Zahlungen eines Jahres (Zinsen + Tilgung + Sondertilgung) mindern den Cashflow (siehe 4.) und damit die Sparrate; Tilgung und Sondertilgung senken die Restschuld und erhöhen so das Nettovermögen. Nach Tilgungsende wird die Rate frei und fließt in die Sparrate. „Schuldenfrei" (Übersicht, Projektion, Liste) = erstes Jahr ohne Restschuld.

**Dialog-Eingabe** (`resolveLoanForm`): Rate bekannt → `loanAnnuitat` direkt · anfängliche Tilgung `t` → `D × (Zins + t) / 1200` · Laufzeit `n` Jahre → `D × r / (1 − (1+r)^(−12n))` mit `r = Zins/1200`.

**Sparrate** (aus dem Cashflow, siehe 4.) wird nach der **Sparraten-Verteilung** (siehe 5.) auf die Klassen verteilt, innerhalb einer Klasse proportional zu den Positionswerten. Gesperrte Positionen, Cash und Sonstiges erhalten nichts. Gibt es für eine Klasse noch keine Position (oder gar keine investierbare Position), entsteht ein virtueller Topf mit der Klassenrendite (Fallback: Aktien-ETF).

**Abflüsse** (Defizit nach Puffer, Szenario-Ausgaben, endfällige Rückzahlungen) werden anteilig aus dem Depot entnommen; **Zuflüsse** (Erbschaft etc.) werden wie die Sparrate investiert.

**Haushaltspuffer:** wächst mit der Cash-Rendite plus Puffer-Beiträgen und deckt Defizite zuerst.

**Forderungen:** `max(0, value × (1+r)^mo − rep × ((1+r)^mo − 1)/r)` — die Rückzahlungen fließen als Einnahme in den Cashflow.

Die Basis-Projektion liefert zusätzlich eine Aufschlüsselung pro Position und Jahr (`breakdown`), die der CSV-Export und Snapshots mit zukünftigem Datum verwenden.

## 4. Cashflow pro Jahr (`src/model/cashflow.js`)

`cashflowAt(y)` ist die **einzige** Cashflow-Berechnung — für das laufende Jahr (Haushalt-Tab, Sparquote) und jedes Projektionsjahr:

```
avail = Σ incomeStreams(Jahr) × (1+growthPct)^(Jahre seit max(heute, Start))
      + Immo-Netto-CF (Miete × (1+immoRentGrowthPct)^y − Hausgeld − Grundsteuer − Darlehenszahlungen des Jahres / 12)
      + Forderungs-Rückflüsse + Ausschüttungen (nach KeSt und Pauschbetrag)
bound = Σ expenseStreams(Jahr) × (1+growthPct)^(Jahre seit max(heute, Start))
      + Nicht-Immo-Darlehenszahlungen des Jahres / 12 (Rate laut Tilgungsplan inkl. Sondertilgung)
      + laufende Asset-Kosten + finanzierte Szenarien
sp    = autoSpar ? max(0, avail − bound + Sparraten-Szenarien)
                 : min(manuellSparrate (+ Szenarien, optional × Wachstum), max(0, avail − bound))
```

Die Sparrate kann nie den tatsächlichen Überschuss übersteigen. Leere Immobilienfelder (Altdaten) werden mit Standardwerten gefüllt; ein eingetragener Wert **0** bleibt 0 (selbstgenutzte Immobilie).

## 5. Sparverteilung

**Auto-Modus:** proportional zu den Marktwerten der nicht-gesperrten, investierbaren Assets (exkl. Cash, Immo, Forderung, Sonstiges).

**Manuell:** feste monatliche Beträge pro Asset-Klasse. In der Projektion werden daraus Anteile (Betrag ÷ Summe), die auf die jeweilige Sparrate angewendet werden. Einnahmenänderungs-Szenarien mit eigenem Spartopf fließen mit ihrer heutigen Verteilung ein.

## 6. Szenarien

| `kind` | Wirkung |
|---|---|
| `ausgabe` | Abfluss aus dem Depot: `einmalig` im Zieljahr, `jaehrlich` / `monatlich` (×12) vom Zieljahr bis `endsAt` |
| `zufluss` | Einmaliger Zufluss im Zieljahr, investiert wie die Sparrate |
| `sparrate` | Ändert die Sparrate um `delta` €/Monat von `startsAt` bis `endsAt` (inklusive) |
| `finanziert` | Monatliche Rate `monthlyPayment` mindert ab `financingStart` für `ceil(financingMonths/12)` Jahre den Cashflow |

Zieljahr = `year`, sonst aus `age` über das Alter der Hauptperson (`s.birthYear`) — unabhängig vom Eigentümer-Filter.

**Wirkung eines Szenarios** (Szenarien-Tab und Szenario-Dialog): Basis-Projektion am Horizont mit dem Szenario minus ohne das Szenario (`scenarioImpact`). Die Gesamtwirkung ist die Projektion mit allen aktiven Szenarien minus mit allen ausgeschaltet. Im manuellen Sparmodus kann ein finanziertes Szenario 0 € Wirkung haben, wenn der Überschuss die feste Sparrate weiter deckt.

## 7. Inflationsbereinigung

Optional, deaktiviert per Default:
```
FV_real = FV_nominal / (1 + inflation/100)^y
```

## 8. Milestones

Dynamisch: Aus einem Satz vordefinierter Schwellen (250k, 500k, 750k, 1M, 1.5M, 2M, 3M, 5M, 7.5M, 10M, 15M, 20M, 30M, 50M) werden die vier nächsten Schwellen oberhalb von `0.9 × currentNet` angezeigt. Das Erreicungsjahr wird interpoliert (erste Projektion-Zeile, die die Schwelle überschreitet).

## 9. Eigentümer-Filter

| Datensatz | Unter dem Filter |
|---|---|
| Positionen | nur Positionen mit einem gefilterten Eigentümer, Werte × Summe der gefilterten Anteile |
| Einnahmen, Ausgaben, separate Darlehen | voll, wenn ein gefilterter Eigentümer beteiligt ist; ohne Eigentümer (gemeinsam) immer voll |
| Sparer-Pauschbetrag | Summe der gefilterten Eigentümer |
| Alter (Diagramm-Achsen) | Geburtsjahr des Eigentümers, wenn genau einer gefiltert ist; sonst Hauptperson |

