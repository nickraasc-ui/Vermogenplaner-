import { describe, it, expect } from "vitest";
import { deriveAll } from "../src/model/derive.js";
import { migrateProfile } from "../src/model/schema.js";
import { complex, autoVariant } from "./fixtures.js";

const prepare = (raw) => migrateProfile(raw ? structuredClone(raw) : { schemaVersion: 2 });
const round = (x) => typeof x === "number" ? Math.round(x * 100) / 100 : x;

// Key figures shown in the UI. Snapshots pin today's behaviour so refactors can't change results silently.
const summary = (d) => ({
  net: round(d.agg.net), gross: round(d.agg.gross), debt: round(d.agg.debt), wavgReturn: round(d.agg.wavgReturn),
  cf: Object.fromEntries(["avail", "bound", "eff", "saldo", "quote", "deficitMonthly", "immoNetCF", "assetYieldIncome", "streamIncome", "streamExpense"].map(k => [k, round(d.cf[k])])),
  loans: d.loanSummary.map(l => ({ id: l.id, annuitat: round(l.annuitat), yrsLeft: l.yrsLeft })),
  sparDist: d.sparDist.map(x => ({ cls: x.cls, monthly: round(x.monthly) })),
  projection: d.projection.filter((_, i) => i % 5 === 0 || i === d.projection.length - 1).map(({ breakdown, ...row }) => row),
  cashflowSample: [0, 5, 10].map(y => d.cashflowProjection[y] && Object.fromEntries(["year", "avail", "bound", "sp", "deficitMonthly"].map(k => [k, round(d.cashflowProjection[y][k])]))),
});

describe("deriveAll – characterisation", () => {
  for (const [name, raw] of [["demo", null], ["complex", complex], ["auto", autoVariant]]) {
    it(`${name}: all owners`, () => {
      expect(summary(deriveAll(prepare(raw)))).toMatchSnapshot();
    });
  }
  it("complex: filtered to one owner", () => {
    expect(summary(deriveAll(prepare(complex), { ownerFilter: ["a"] }))).toMatchSnapshot();
  });
  it("complex: projection limited to one asset class", () => {
    expect(summary(deriveAll(prepare(complex), { projClassFilter: ["Aktien-ETF"] }))).toMatchSnapshot();
  });
});

describe("deriveAll – invariants", () => {
  it("net worth = gross − debt (incl. standalone loans)", () => {
    const d = deriveAll(prepare(complex));
    const gross = complex.assets.reduce((t, a) => t + a.value, 0);
    const debt = complex.assets.reduce((t, a) => t + (a.debt || 0), 0) + complex.standaloneLoans.reduce((t, l) => t + l.debt, 0);
    expect(d.agg.gross).toBeCloseTo(gross);
    expect(d.agg.net).toBeCloseTo(gross - debt);
  });
  it("projection covers horizon + 1 years and scenarios are ordered", () => {
    const s = prepare(complex);
    const d = deriveAll(s);
    expect(d.projection).toHaveLength(s.horizon + 1);
    const last = d.projection.at(-1);
    expect(last.cons).toBeLessThanOrEqual(last.base);
    expect(last.base).toBeLessThanOrEqual(last.opt);
  });
});

describe("bug fixes", () => {
  const base = () => migrateProfile({
    owners: [{ id: "a", label: "A", type: "Person" }],
    incomeStreams: [{ id: "i", owner: null, label: "Gehalt", type: "Gehalt", amount: 4000, growthPct: 0, startsAt: 2026, endsAt: null }],
    expenseStreams: [{ id: "e", label: "Leben", category: "Lebenshaltung", amount: 1500, startsAt: 2026, endsAt: null }],
    assets: [], buckets: [], standaloneLoans: [],
  });

  it("an owner-occupied property with 0 € rent adds no rental income", () => {
    const s = base();
    s.assets = [{ id: "h", name: "Eigenheim", class: "Immobilien", ownership: [{ ownerId: "a", share: 1 }], value: 500000, debt: 0,
      monthlyRent: 0, hausgeld: 0, grundsteuer: 0 }];
    const { cf } = deriveAll(s);
    expect(cf.immoGross).toBe(0);
    expect(cf.immoNetCF).toBe(0);
    expect(cf.avail).toBe(4000);
  });

  it("a property stored without rent fields by an old app version keeps the old defaults", () => {
    const legacy = { owners: [{ id: "a", label: "A" }], incomeStreams: [], expenseStreams: [],
      assets: [{ id: "h", name: "Alt", class: "Immobilien", owner: "a", value: 300000, debt: 0 }] }; // no schemaVersion = v1
    const { cf } = deriveAll(migrateProfile(legacy));
    expect(cf.immoGross).toBe(1200);
  });
});
