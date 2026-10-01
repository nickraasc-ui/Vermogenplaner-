# Datenmodell (Schema v2)

Quelle der Wahrheit ist `src/model/schema.js`: Schema-Version, Normalisierer (`normalizeAsset`, `normalizeIncomeStream`, …) und Migrationen. Demo-Daten neuer Profile: `src/model/defaults.js`. Profile aus dem Einrichtungs-Quiz: `buildProfileFromSetup` in `src/model/setup.js` (enthält nur die eigenen Angaben, keine Demo-Daten).

## Speicherung (localStorage)

| Schlüssel | Inhalt |
|---|---|
| `wealth-profiles-v1` | Liste der Profile: `{ id, name, kuerzel, color, note, createdAt }` |
| `wealth-active-profile` | ID des geöffneten Profils |
| `wealth-dark` | Theme (`true` = dunkel) — Geräteeinstellung, nicht Teil eines Profils |
| `wealth-pwa-v3-{id}` | Profil-Zustand (unten) |
| `wealth-pwa-v3-{id}-backup-v{n}` | unveränderte Kopie, bevor ein Profil von Schema-Version *n* migriert wurde |

Alle Daten bleiben im Browser der jeweiligen Adresse (Domain). Browserdaten löschen = Daten weg.

## Migrationen

`loadProfileState` liest das Profil, legt bei älterer Version eine Sicherungskopie an und ruft `migrateProfile` auf. Migrationen laufen schrittweise (`MIGRATIONS[v]`: v → v+1); danach wird jeder Datensatz normalisiert. Beim nächsten Speichern steht `schemaVersion: 2` im Profil.

| Von → nach | Änderungen |
|---|---|
| 1 → 2 | `owner` → `ownership[]` (Einnahmen, Ausgaben, Darlehen, Positionen) · Szenario `type`/`fundingMode` → `kind` + `frequency` · Check-in `ausgaben_ist` → `streamExp_ist` · Snapshot `value` → `totalNet` · `dark` entfernt · sehr alte Felder `nettoGesamt`/`ausgaben`/`reservenMonthly` → Ströme · fehlende Immobilienfelder erhalten die alten Standardwerte (1.200 € Miete, 220 € Hausgeld, 10 € Grundsteuer), fehlender Darlehenszins 3,5 % |

**Neue Migration hinzufügen:** `SCHEMA_VERSION` erhöhen, `MIGRATIONS[alteVersion] = (p) => neuerZustand` ergänzen, Test in `tests/schema.test.js` schreiben, Tabelle oben erweitern.

## Eigentum

Positionen, Einnahmen, Ausgaben und separate Darlehen haben `ownership: [{ ownerId, share }]` (Anteile 0–1, Summe = 1). Eine leere Liste bedeutet „gemeinsamer Haushalt" und zählt unter jedem Eigentümer-Filter voll. Beim Speichern einer Position müssen die Anteile 100 % ergeben. Ein Eigentümer kann nur gelöscht werden, wenn ihn nichts mehr referenziert (`ownerReferences`); Familienbeziehungen auf ihn werden dabei entfernt.

## Profil-Zustand

```js
{
  schemaVersion: 2,
  birthYear, horizon, inflationAdj, inflation, taxOnReturns, basiszins, immoRentGrowthPct,
  autoSpar, manuellSparrate, sparRateGrowth, sparGrowthPct,
  sparDistMode: "auto" | "manual", manualSparDist: { [Klasse]: €/Monat },
  projSpreadCons, projSpreadOpt, retirementAge?,
  maritalProperty, taxFiling,              // gespeichert, (noch) ohne Rechenwirkung
  classReturns: { [Klasse]: % p.a. },
  owners[], assets[], incomeStreams[], expenseStreams[], standaloneLoans[], buckets[], checkins[], snapshots[],
}
```

## Owner

```js
{
  id, label,
  type: "Person" | "GmbH" | "GmbH & Co. KG" | "KG" | "GbR" | "Stiftung" | "AG" | "Sonstiges",
  birthYear?,                                 // Altersachse bei Filter auf genau diesen Eigentümer
  ownedBy: [{ ownerId, share }],              // Gesellschafter (Organogramm)
  relations: [{ targetId, type }],            // Familie: Ehepartner, Kind, Elternteil, …
  tax: { personalTaxRate, churchTax, sparerpauschbetrag, zusammenveranlagung },  // nur sparerpauschbetrag wirkt
}
```

## Asset (Position)

```js
{
  id, name, class,                            // Klasse: siehe ASSET_CLASSES in constants.js
  ownership: [{ ownerId, share }],
  value, debt,                                // € brutto / Restschuld
  liquidity: "Liquide" | "Semi-liquide" | "Illiquide",
  yieldPct,                                   // Ausschüttung % p.a. (fließt in den Cashflow)
  locked,                                     // gesperrt: erhält keine Sparrate, wird nie verkauft
  isHaushaltsPuffer,                          // nur Cash: Haushaltspuffer, deckt Defizite zuerst
  valuationMethod, note,
  // Darlehen auf die Position
  loanType: "annuitat" | "volltilger" | "endfaellig", loanRate, loanTermYears, loanAnnuitat, loanTilgung, manualAnnuitat?,
  // Immobilien (nur class "Immobilien"): 0 ist ein gültiger Wert (selbstgenutzt)
  monthlyRent, hausgeld, grundsteuer,
  monthlyRepayment,                           // Forderung: monatliche Rückzahlung
  monthlyRunningCost,
  tax: { taxType, acquisitionPrice, acquisitionDate },   // taxType bestimmt den KeSt-Satz
  lifecycle: { maturity }, commitment, called, distributed,  // Metadaten
}
```

## Einnahme / Ausgabe

```js
// incomeStreams[]
{ id, label, type, ownership, amount /* €/Monat */, growthPct, startsAt /* Jahr */, endsAt /* Jahr | null */ }
// expenseStreams[]
{ id, label, category, ownership, amount, startsAt, endsAt, isBufferContribution }
```

## Separates Darlehen

```js
{ id, name, ownership, loanType: "annuitat" | "endfaellig", debt, loanRate, loanAnnuitat, loanTermYears /* | null */ }
```

## Szenario (`buckets[]`)

```js
{
  id, name, active, color?, note?,
  kind: "ausgabe" | "zufluss" | "sparrate" | "finanziert",
  frequency: "einmalig" | "jaehrlich" | "monatlich",   // nur ausgabe
  amount, year /* | null */, age /* | null */, endsAt,
  delta, startsAt,                                     // sparrate (€/Monat)
  spartopfMode?: "proportional" | "manuell", spartopfAmounts?,
  monthlyPayment, financingMonths, financingStart,     // finanziert
}
```

## Check-in und Snapshot

```js
// checkins[] — ein Eintrag pro Monat
{ id, month /* "YYYY-MM" */, inc_ist?, streamExp_ist, sparrate_ist, reserven_ist?, note }
// snapshots[]
{ id, date /* "YYYY-MM-DD" */, note, totalNet, standaloneDebt?, assetValues: [{ assetId, name, class, value, debt }] }
```

## Feldwirkung

| Feld | Projektion | Cashflow | Nur Anzeige |
|---|:---:|:---:|:---:|
| `value`, `debt`, `class`, `ownership` | ✓ | ✓ | |
| `loan*` | ✓ (Restschuld) | ✓ (Rate) | |
| `monthlyRent`, `hausgeld`, `grundsteuer`, `monthlyRepayment`, `monthlyRunningCost`, `yieldPct` | | ✓ | |
| `locked` | ✓ (keine Sparrate, nicht verkauft) | | |
| `tax.taxType` | ✓ (KeSt) | ✓ (KeSt auf Ausschüttung) | |
| `isHaushaltsPuffer` | ✓ | ✓ | |
| `liquidity`, `valuationMethod`, `note`, `tax.acquisition*`, `lifecycle`, `commitment/called/distributed` | | | ✓ |
| Owner `tax.*` außer `sparerpauschbetrag`, `maritalProperty`, `taxFiling` | | | gespeichert, ohne Wirkung |
