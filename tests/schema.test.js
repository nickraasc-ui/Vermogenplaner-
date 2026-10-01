import { describe, it, expect } from "vitest";
import { migrateProfile, SCHEMA_VERSION, normalizeBucket, sharesValid, ownerReferences, matchesOwnerFilter } from "../src/model/schema.js";
import { deriveAll } from "../src/model/derive.js";
import { complex } from "./fixtures.js";

describe("migration v1 → v2", () => {
  const v1 = {
    dark: false,
    owners: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
    assets: [{ id: "x", name: "Depot", class: "Aktien-ETF", owner: "a", value: 1000 }],
    incomeStreams: [{ id: "i", owner: "a", label: "Gehalt", amount: 3000, startsAt: 2026 }],
    expenseStreams: [{ id: "e", owner: null, label: "Leben", amount: 1000 }],
    standaloneLoans: [{ id: "l", owner: "b", name: "Kredit", debt: 5000 }],
    checkins: [{ id: "c", month: "2026-01", ausgaben_ist: 1200 }],
    snapshots: [{ id: "s", date: "2025-12-31", value: 99000 }],
    buckets: [
      { id: "1", type: "Einmalig", amount: 1 }, { id: "2", type: "Jahrlich", amount: 1 }, { id: "3", type: "Monatlich", amount: 1 },
      { id: "4", type: "Zufluss", amount: 1 }, { id: "5", type: "Sparrate", delta: -100 },
      { id: "6", type: "Einmalig", fundingMode: "financed", monthlyPayment: 300, financingMonths: 24 },
    ],
  };
  const m = migrateProfile(structuredClone(v1));

  it("stamps the current schema version", () => expect(m.schemaVersion).toBe(SCHEMA_VERSION));
  it("converts single owners to ownership lists everywhere", () => {
    expect(m.assets[0].ownership).toEqual([{ ownerId: "a", share: 1 }]);
    expect(m.incomeStreams[0].ownership).toEqual([{ ownerId: "a", share: 1 }]);
    expect(m.expenseStreams[0].ownership).toEqual([]);
    expect(m.standaloneLoans[0].ownership).toEqual([{ ownerId: "b", share: 1 }]);
    for (const x of [...m.assets, ...m.incomeStreams, ...m.expenseStreams, ...m.standaloneLoans]) expect(x).not.toHaveProperty("owner");
  });
  it("maps the old scenario type/fundingMode pair to kind + frequency", () => {
    expect(m.buckets.map(b => [b.kind, b.frequency])).toEqual([
      ["ausgabe", "einmalig"], ["ausgabe", "jaehrlich"], ["ausgabe", "monatlich"],
      ["zufluss", "einmalig"], ["sparrate", "einmalig"], ["finanziert", "einmalig"],
    ]);
    for (const b of m.buckets) { expect(b).not.toHaveProperty("type"); expect(b).not.toHaveProperty("fundingMode"); }
  });
  it("renames legacy check-in and snapshot fields", () => {
    expect(m.checkins[0]).toEqual({ id: "c", month: "2026-01", streamExp_ist: 1200 });
    expect(m.snapshots[0]).toEqual({ id: "s", date: "2025-12-31", totalNet: 99000 });
  });
  it("drops the per-profile theme flag", () => expect(m).not.toHaveProperty("dark"));
  it("is idempotent", () => expect(migrateProfile(structuredClone(m))).toEqual(m));

  it("does not re-create deleted income/expense streams", () => {
    const n = migrateProfile({ schemaVersion: 1, incomeStreams: [], expenseStreams: [] });
    expect(n.incomeStreams).toEqual([]);
    expect(n.expenseStreams).toEqual([]);
  });
  it("still converts very old single-number income/expenses", () => {
    const n = migrateProfile({ nettoGesamt: 6000, ausgaben: 2500 });
    expect(n.incomeStreams[0].amount).toBe(6000);
    expect(n.expenseStreams[0].amount).toBe(2500);
  });
  it("keeps every figure identical for the complex fixture when migrated twice", () => {
    const once = migrateProfile(structuredClone(complex));
    const a = deriveAll(once), b = deriveAll(migrateProfile(structuredClone(once)));
    expect(b.projection.map(r => r.base)).toEqual(a.projection.map(r => r.base));
    expect(b.cf.eff).toBe(a.cf.eff);
  });
});

describe("helpers", () => {
  it("validates ownership shares", () => {
    expect(sharesValid([])).toBe(true);
    expect(sharesValid([{ ownerId: "a", share: 0.6 }, { ownerId: "b", share: 0.4 }])).toBe(true);
    expect(sharesValid([{ ownerId: "a", share: 0.6 }, { ownerId: "b", share: 0.6 }])).toBe(false);
  });
  it("matches shared records under any owner filter", () => {
    expect(matchesOwnerFilter({ ownership: [] }, ["a"])).toBe(true);
    expect(matchesOwnerFilter({ ownership: [{ ownerId: "b", share: 1 }] }, ["a"])).toBe(false);
  });
  it("finds every reference to an owner", () => {
    const s = migrateProfile(structuredClone(complex));
    expect(ownerReferences(s, "b")).toEqual({ assets: 5, incomeStreams: 2, expenseStreams: 0, loans: 1, shareholders: 0 });
    expect(ownerReferences(s, "a").shareholders).toBe(1); // GmbH is owned by a
  });
  it("normalises a new scenario with sensible defaults", () => {
    const b = normalizeBucket({ kind: "ausgabe", amount: "500" });
    expect(b).toMatchObject({ kind: "ausgabe", frequency: "einmalig", amount: 500, active: true, financingMonths: 12 });
  });
});

describe("owner filter", () => {
  it("counts only the filtered owners' Sparer-Pauschbetrag", () => {
    const s = migrateProfile({
      schemaVersion: 2, taxOnReturns: true,
      owners: [{ id: "a", label: "A", tax: { sparerpauschbetrag: 1000 } }, { id: "b", label: "B", tax: { sparerpauschbetrag: 1000 } }],
      incomeStreams: [], expenseStreams: [],
      assets: [{ id: "d", name: "Div", class: "Aktien", ownership: [{ ownerId: "a", share: 1 }], value: 100000, yieldPct: 3 }],
    });
    const all = deriveAll(s).cf.assetYieldIncome, onlyA = deriveAll(s, { ownerFilter: ["a"] }).cf.assetYieldIncome;
    // 250 €/month dividends; allowance A+B = 2.000 €/yr (166,67 €/month) tax-free, rest taxed at 26,38 %
    expect(all).toBeCloseTo(166.667 + 83.333 * (1 - 0.2638), 1);
    // filtered to A: only A's 1.000 €/yr (83,33 €/month) allowance applies
    expect(onlyA).toBeCloseTo(83.333 + 166.667 * (1 - 0.2638), 1);
  });
});
