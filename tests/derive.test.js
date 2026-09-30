import { describe, it, expect } from "vitest";
import { deriveAll } from "../src/model/derive.js";
import { migrateProfileState } from "../src/storage.js";
import { DEFAULT } from "../src/theme.js";
import { complex, autoVariant } from "./fixtures.js";

const prepare = (raw) => raw ? migrateProfileState(structuredClone(raw), true) : { ...DEFAULT };
const round = (x) => typeof x === "number" ? Math.round(x * 100) / 100 : x;

// Key figures shown in the UI. Snapshots pin today's behaviour so refactors can't change results silently.
const summary = (d) => ({
  net: round(d.agg.net), gross: round(d.agg.gross), debt: round(d.agg.debt), wavgReturn: round(d.agg.wavgReturn),
  cf: Object.fromEntries(["avail", "bound", "eff", "saldo", "quote", "deficitMonthly", "immoNetCF", "assetYieldIncome", "streamIncome", "streamExpense"].map(k => [k, round(d.cf[k])])),
  loans: d.loanSummary.map(l => ({ id: l.id, annuitat: round(l.annuitat), yrsLeft: l.yrsLeft })),
  sparDist: d.sparDist.map(x => ({ cls: x.cls, monthly: round(x.monthly) })),
  projection: d.projection.filter((_, i) => i % 5 === 0 || i === d.projection.length - 1),
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
