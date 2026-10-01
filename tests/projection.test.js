import { describe, it, expect } from "vitest";
import { deriveAll } from "../src/model/derive.js";
import { migrateProfile } from "../src/model/schema.js";
import { yearsUntilPaidOff, computeRemDebt } from "../src/model/finance.js";
import { complex } from "./fixtures.js";

const ZERO_RETURNS = Object.fromEntries(["Aktien","Aktien-ETF","Anleihen","Anleihen-ETF","Immobilien","Cash","Rohstoffe","Krypto","Private Equity","Forderung","Sonstiges"].map(c => [c, 0]));
const annuity = (D, ratePct, years) => { const r = ratePct / 1200, n = years * 12; return D * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1); };

// Minimal profile: one owner, income exactly covering the given expenses → savings rate 0 unless stated
const profile = (over = {}) => migrateProfile({
  owners: [{ id: "a", label: "A", type: "Person", tax: { sparerpauschbetrag: 0 } }],
  classReturns: { ...ZERO_RETURNS }, projSpreadCons: 2, projSpreadOpt: 2,
  horizon: 30, autoSpar: true, taxOnReturns: false, inflationAdj: false,
  incomeStreams: [{ id: "i", owner: null, label: "Gehalt", type: "Gehalt", amount: 3000, growthPct: 0, startsAt: 2026, endsAt: null }],
  expenseStreams: [{ id: "e", label: "Leben", category: "Lebenshaltung", amount: 3000, growthPct: 0, startsAt: 2026, endsAt: null }],
  assets: [], buckets: [], standaloneLoans: [], ...over,
}, true);
const base = (s, y) => deriveAll(s).projection[y].base;

describe("projection model", () => {
  it("starts at the net worth shown in the header (incl. securities loans and standalone loans)", () => {
    for (const filter of [[], ["a"], ["b"]]) {
      const d = deriveAll(migrateProfile(structuredClone(complex)), { ownerFilter: filter });
      expect(d.projection[0].base).toBeCloseTo(d.agg.net, -1);
    }
  });

  it("counts mortgage repayment as wealth: a fully repaid property is worth its full value", () => {
    const M = annuity(200000, 3, 25);
    const s = profile({
      assets: [{ id: "h", name: "Haus", class: "Immobilien", ownership: [{ ownerId: "a", share: 1 }], value: 400000, debt: 200000,
        loanType: "annuitat", loanRate: 3, loanTermYears: 25, loanAnnuitat: M, monthlyRent: 0, hausgeld: 0, grundsteuer: 0 }],
      // income pays exactly living costs + mortgage → nothing left to save
      incomeStreams: [{ id: "i", owner: null, label: "Gehalt", type: "Gehalt", amount: 3000 + M, growthPct: 0, startsAt: 2026, endsAt: null }],
    });
    expect(base(s, 0)).toBeCloseTo(200000, -1);
    expect(base(s, 10)).toBeCloseTo(400000 - computeRemDebt(s.assets[0], 10), -1);
    expect(base(s, 24)).toBeCloseTo(400000 - computeRemDebt(s.assets[0], 24), -1);
    // year 25: loan repaid (old model: still 200.000) — the freed payment is saved from then on
    expect(base(s, 25)).toBeCloseTo(400000 + 12 * M, -1);
  });

  it("lets a property appreciate on its full value, not only on the equity", () => {
    const s = profile({
      classReturns: { ...ZERO_RETURNS, Immobilien: 3 },
      assets: [{ id: "h", name: "Haus", class: "Immobilien", ownership: [{ ownerId: "a", share: 1 }], value: 400000, debt: 200000,
        loanType: "endfaellig", loanRate: 0, loanTermYears: 40, loanAnnuitat: 0, monthlyRent: 0, hausgeld: 0, grundsteuer: 0 }],
    });
    const growth = Math.pow(1 + 3 / 1200, 12 * 10);
    expect(base(s, 10)).toBeCloseTo(400000 * growth - 200000, -1);
  });

  it("pays an interest-only (endfällig) loan from the portfolio at maturity — no jump in net worth", () => {
    const s = profile({
      assets: [
        { id: "h", name: "Haus", class: "Immobilien", ownership: [{ ownerId: "a", share: 1 }], value: 300000, debt: 100000,
          loanType: "endfaellig", loanRate: 0, loanTermYears: 10, loanAnnuitat: 0, monthlyRent: 0, hausgeld: 0, grundsteuer: 0 },
        { id: "d", name: "Depot", class: "Aktien-ETF", ownership: [{ ownerId: "a", share: 1 }], value: 150000, debt: 0 },
      ],
    });
    expect(base(s, 9)).toBeCloseTo(350000, -1);
    expect(base(s, 10)).toBeCloseTo(350000, -1);
    expect(deriveAll(s).projection[10].debt).toBe(0);
  });

  it("invests the savings rate according to the savings distribution", () => {
    const mk = (dist) => profile({
      classReturns: { ...ZERO_RETURNS, "Aktien-ETF": 8, "Anleihen-ETF": 2 },
      incomeStreams: [{ id: "i", owner: null, label: "Gehalt", type: "Gehalt", amount: 4000, growthPct: 0, startsAt: 2026, endsAt: null }],
      assets: [
        { id: "x", name: "Welt", class: "Aktien-ETF", ownership: [{ ownerId: "a", share: 1 }], value: 10000, debt: 0 },
        { id: "y", name: "Anleihen", class: "Anleihen-ETF", ownership: [{ ownerId: "a", share: 1 }], value: 10000, debt: 0 },
      ],
      sparDistMode: "manual", manualSparDist: dist,
    });
    const equities = base(mk({ "Aktien-ETF": 1000 }), 20);
    const bonds    = base(mk({ "Anleihen-ETF": 1000 }), 20);
    expect(equities).toBeGreaterThan(bonds * 1.3);
  });

  it("does not put savings into locked positions", () => {
    const s = profile({
      incomeStreams: [{ id: "i", owner: null, label: "Gehalt", type: "Gehalt", amount: 4000, growthPct: 0, startsAt: 2026, endsAt: null }],
      assets: [{ id: "x", name: "Gesperrt", class: "Aktien", ownership: [{ ownerId: "a", share: 1 }], value: 50000, debt: 0, locked: true }],
    });
    // 1.000 €/month saved, 0 % returns → +12.000 € per year, invested in a virtual ETF pot instead
    expect(base(s, 5)).toBeCloseTo(50000 + 5 * 12000, -1);
  });

  it("adds an inheritance (Zufluss) and deducts a one-off expense in their year", () => {
    const s = profile({
      assets: [{ id: "d", name: "Depot", class: "Aktien-ETF", ownership: [{ ownerId: "a", share: 1 }], value: 100000, debt: 0 }],
      buckets: [
        { id: "z", name: "Erbe", type: "Zufluss", amount: 50000, year: 2030, fundingMode: "lump_sum", active: true },
        { id: "o", name: "Auto", type: "Einmalig", amount: 30000, year: 2032, fundingMode: "lump_sum", active: true },
      ],
    });
    expect(base(s, 3)).toBeCloseTo(100000, -1);
    expect(base(s, 4)).toBeCloseTo(150000, -1);
    expect(base(s, 6)).toBeCloseTo(120000, -1);
  });

  it("keeps scenarios ordered and inflation adjustment lowers real values", () => {
    const s = migrateProfile(structuredClone(complex));
    const nominal = deriveAll(s).projection.at(-1);
    expect(nominal.cons).toBeLessThanOrEqual(nominal.base);
    expect(nominal.base).toBeLessThanOrEqual(nominal.opt);
    const real = deriveAll({ ...s, inflationAdj: true, inflation: 2 }).projection.at(-1);
    expect(real.base).toBeLessThan(nominal.base);
  });
});

describe("loan summary", () => {
  it("'schuldenfrei' uses the same schedule as the projection", () => {
    const loan = { debt: 100000, loanType: "annuitat", loanRate: 4, loanTermYears: 15, loanAnnuitat: annuity(100000, 4, 15) };
    expect(yearsUntilPaidOff(loan)).toBe(15);
    expect(yearsUntilPaidOff({ debt: 50000, loanType: "endfaellig", loanTermYears: 7 })).toBe(7);
    expect(yearsUntilPaidOff({ debt: 10000, loanRate: 0, loanAnnuitat: 0, loanTilgung: 0 })).toBeNull();
  });
});

describe("projection breakdown", () => {
  it("per-position values minus debts add up to the nominal base value every year", () => {
    const s = migrateProfile(structuredClone(complex));
    const { projection } = deriveAll(s);
    for (const row of projection) {
      const bd = row.breakdown;
      const sum = Object.values(bd.values).reduce((t, v) => t + v, 0) - Object.values(bd.debts).reduce((t, v) => t + v, 0) - bd.standaloneDebt;
      expect(sum).toBeCloseTo(row.base, -1);
    }
  });
});

describe("withdrawals", () => {
  it("never sell locked positions and use 'Sonstiges' only as a last resort", () => {
    const s = profile({
      assets: [
        { id: "l", name: "Gesperrt", class: "Aktien", ownership: [{ ownerId: "a", share: 1 }], value: 100000, debt: 0, locked: true },
        { id: "d", name: "Depot", class: "Aktien-ETF", ownership: [{ ownerId: "a", share: 1 }], value: 20000, debt: 0 },
        { id: "b", name: "Boot", class: "Sonstiges", ownership: [{ ownerId: "a", share: 1 }], value: 30000, debt: 0 },
      ],
      buckets: [{ id: "o", name: "Auto", type: "Einmalig", amount: 35000, year: 2027, fundingMode: "lump_sum", active: true }],
    });
    const v = deriveAll(s).projection[1].breakdown.values;
    expect(v.l).toBeCloseTo(100000);   // untouched
    expect(v.d).toBeCloseTo(0);        // depot used first
    expect(v.b).toBeCloseTo(15000);    // remaining 15.000 from the boat
  });
});
