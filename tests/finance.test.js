import { describe, it, expect } from "vitest";
import { computeRemDebt, ownerShare, kestRate, KEST_RATES } from "../src/model/finance.js";

// Standard annuity: monthly payment that clears debt D over n months at monthly rate r
const annuity = (D, ratePct, years) => {
  const r = ratePct / 1200, n = years * 12;
  return D * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
};

describe("computeRemDebt", () => {
  it("returns 0 without debt", () => {
    expect(computeRemDebt({ debt: 0 }, 5)).toBe(0);
  });

  it("amortises an annuity loan to ~0 at the end of its term", () => {
    const loan = { debt: 100000, loanType: "annuitat", loanRate: 4, loanTermYears: 10, loanAnnuitat: annuity(100000, 4, 10) };
    expect(computeRemDebt(loan, 0)).toBeCloseTo(100000, 6);
    expect(computeRemDebt(loan, 5)).toBeGreaterThan(50000);   // front-loaded interest
    expect(computeRemDebt(loan, 5)).toBeLessThan(60000);
    expect(computeRemDebt(loan, 10)).toBeCloseTo(0, 0);
    expect(computeRemDebt(loan, 12)).toBe(0);                  // never negative
  });

  it("keeps an interest-only loan constant until maturity", () => {
    const loan = { debt: 200000, loanType: "endfaellig", loanRate: 3.8, loanTermYears: 10 };
    expect(computeRemDebt(loan, 9)).toBe(200000);
    expect(computeRemDebt(loan, 10)).toBe(0);
  });

  it("falls back to linear repayment via loanTilgung when rate or payment is missing", () => {
    const loan = { debt: 12000, loanRate: 0, loanAnnuitat: 0, loanTilgung: 100 };
    expect(computeRemDebt(loan, 5)).toBe(6000);
    expect(computeRemDebt(loan, 20)).toBe(0);
  });
});

describe("ownerShare", () => {
  const asset = { ownership: [{ ownerId: "a", share: 0.6 }, { ownerId: "b", share: 0.4 }] };
  it("is 1 without a filter", () => expect(ownerShare(asset, [])).toBe(1));
  it("sums the shares of the filtered owners", () => {
    expect(ownerShare(asset, ["a"])).toBe(0.6);
    expect(ownerShare(asset, ["a", "b"])).toBe(1);
    expect(ownerShare(asset, ["x"])).toBe(0);
  });
  it("understands the legacy single `owner` field", () => {
    expect(ownerShare({ owner: "a" }, ["a"])).toBe(1);
  });
});

describe("kestRate", () => {
  it("uses the class default for Abgeltungsteuer assets", () => {
    expect(kestRate({ class: "Aktien-ETF", tax: { taxType: "abgeltung" } })).toBe(KEST_RATES["Aktien-ETF"]);
  });
  it("lets an explicit tax type override the class", () => {
    expect(kestRate({ class: "Krypto", tax: { taxType: "krypto_langfristig" } })).toBe(0);
    expect(kestRate({ class: "Aktien", tax: { taxType: "teileinkuenfte" } })).toBeCloseTo(0.1583);
  });
});
