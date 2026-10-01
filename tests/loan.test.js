import { describe, it, expect } from "vitest";
import {
  annuityPayment, paymentFromTilgungPct, loanSchedule, remainingDebt, monthlyPaymentAt, yearsUntilRepaid,
  balloonInYear, resolveLoanForm, inputModeOf,
} from "../src/model/loan.js";
import { cashflowAt, streamAmountAt } from "../src/model/cashflow.js";
import { migrateProfile } from "../src/model/schema.js";

// Clock is fixed to 2026 (tests/setup.js)
const closedForm = (D, ratePct, M, months) => { const r = ratePct / 1200; return D * Math.pow(1 + r, months) - M * (Math.pow(1 + r, months) - 1) / r; };
const mortgage = (over = {}) => ({ debt: 300000, loanType: "annuitat", loanRate: 3.5, loanAnnuitat: 1375, ...over });

describe("repayment schedule", () => {
  it("matches the closed annuity formula", () => {
    const l = mortgage();
    for (const y of [1, 5, 10, 20]) expect(remainingDebt(l, y)).toBeCloseTo(closedForm(300000, 3.5, 1375, y * 12), 2);
    expect(remainingDebt(l, 0)).toBe(300000);
  });

  it("repays a loan over the term it was calculated for", () => {
    const l = mortgage({ loanAnnuitat: annuityPayment(300000, 3.5, 25 * 12) });
    expect(yearsUntilRepaid(l)).toBe(25);
    expect(remainingDebt(l, 25)).toBe(0);
    expect(monthlyPaymentAt(l, 24)).toBeCloseTo(l.loanAnnuitat, 2);
    expect(monthlyPaymentAt(l, 25)).toBe(0);
  });

  it("charges only what is left in the payoff year", () => {
    const l = mortgage({ debt: 10000, loanRate: 0, loanAnnuitat: 1000 }); // 10 months
    expect(yearsUntilRepaid(l)).toBe(1);
    expect(monthlyPaymentAt(l, 0)).toBeCloseTo(10000 / 12, 6);
  });

  it("splits each year into interest and Tilgung", () => {
    const [y1] = loanSchedule(mortgage()).years;
    expect(y1.interest + y1.principal).toBeCloseTo(1375 * 12, 6);
    expect(y1.endDebt).toBeCloseTo(300000 - y1.principal, 6);
    expect(y1.interest).toBeGreaterThan(10000); // ~3,5 % of 300k, slowly falling
  });

  it("applies a yearly Sondertilgung and repays earlier", () => {
    const plain = mortgage(), extra = mortgage({ loanSpecialPerYear: 5000 });
    expect(remainingDebt(extra, 1)).toBeCloseTo(remainingDebt(plain, 1) - 5000, 6);
    expect(yearsUntilRepaid(extra)).toBeLessThan(yearsUntilRepaid(plain));
    expect(monthlyPaymentAt(extra, 0)).toBeCloseTo(1375 + 5000 / 12, 6);
  });

  it("switches to the follow-up rate after the Zinsbindung and keeps the payoff year", () => {
    const plain = mortgage();
    const fixed = mortgage({ loanFixedUntil: 2030, loanFollowUpRate: 5.5 }); // 2026–2030 = 5 years fixed
    const sched = loanSchedule(fixed);
    expect(sched.debtAtFixEnd).toBeCloseTo(remainingDebt(plain, 5), 6);
    expect(remainingDebt(fixed, 5)).toBeCloseTo(remainingDebt(plain, 5), 6);
    expect(sched.years[5].rate).toBe(5.5);
    expect(sched.followPayment).toBeGreaterThan(1375);
    expect(monthlyPaymentAt(fixed, 4)).toBeCloseTo(1375, 6);
    expect(monthlyPaymentAt(fixed, 5)).toBeCloseTo(sched.followPayment, 6);
    expect(yearsUntilRepaid(fixed)).toBe(yearsUntilRepaid(plain));
  });

  it("keeps the payoff year with Sondertilgung after the Zinsbindung, without overshooting", () => {
    const plain = mortgage({ loanSpecialPerYear: 5000 });
    const fixed = mortgage({ loanSpecialPerYear: 5000, loanFixedUntil: 2030, loanFollowUpRate: 5 });
    const { payoffMonth: target } = loanSchedule(plain);
    expect(loanSchedule(fixed).payoffMonth).toBe(target);
    const lower = { ...fixed, loanAnnuitat: 1375 };
    expect(loanSchedule(lower).followPayment).toBeLessThan(annuityPayment(loanSchedule(plain).years[4].endDebt, 5, target - 60));
  });

  it("shows the remaining debt at the end of the Zinsbindung even without a follow-up rate", () => {
    const l = mortgage({ loanFixedUntil: 2030 });
    expect(loanSchedule(l).debtAtFixEnd).toBeCloseTo(remainingDebt(mortgage(), 5), 6);
    expect(monthlyPaymentAt(l, 10)).toBeCloseTo(1375, 6);
  });

  it("ignores a Zinsbindung that has already ended", () => {
    const l = mortgage({ loanFixedUntil: 2020, loanFollowUpRate: 6 });
    expect(remainingDebt(l, 10)).toBeCloseTo(remainingDebt(mortgage(), 10), 6);
  });

  it("endfällig: interest only, follow-up rate changes the interest, repaid in one sum at maturity", () => {
    const l = { debt: 200000, loanType: "endfaellig", loanRate: 3, loanAnnuitat: 500, loanTermYears: 10, loanFixedUntil: 2028, loanFollowUpRate: 4.2 };
    expect(monthlyPaymentAt(l, 0)).toBeCloseTo(500, 6);
    expect(monthlyPaymentAt(l, 3)).toBeCloseTo(700, 6);
    expect(remainingDebt(l, 9)).toBe(200000);
    expect(balloonInYear(l, 9)).toBe(200000);
    expect(remainingDebt(l, 10)).toBe(0);
    expect(yearsUntilRepaid(l)).toBe(10);
  });

  it("never repays when the payment does not cover the interest", () => {
    expect(yearsUntilRepaid(mortgage({ loanAnnuitat: 800 }))).toBeNull();
  });

  it("keeps the legacy linear repayment for records without a payment", () => {
    const l = { debt: 12000, loanType: "annuitat", loanRate: 0, loanAnnuitat: 0, loanTilgung: 500 };
    expect(remainingDebt(l, 1)).toBeCloseTo(6000, 6);
    expect(yearsUntilRepaid(l)).toBe(2);
  });
});

describe("loan dialog input", () => {
  it("rate known", () => {
    const r = resolveLoanForm({ debt: "300000", loanRate: "3.5", loanInputMode: "rate", loanAnnuitat: "1375" });
    expect(r.loanAnnuitat).toBe(1375);
    expect(r.loanTilgung).toBeCloseTo(1375 - 875, 6);
  });
  it("anfängliche Tilgung %", () => {
    const r = resolveLoanForm({ debt: "300000", loanRate: "3.5", loanInputMode: "tilgung", loanTilgungPct: "2" });
    expect(r.loanAnnuitat).toBeCloseTo(paymentFromTilgungPct(300000, 3.5, 2), 6);
    expect(r.loanAnnuitat).toBeCloseTo(1375, 6);
  });
  it("Laufzeit bis schuldenfrei", () => {
    const r = resolveLoanForm({ debt: "300000", loanRate: "3.5", loanInputMode: "laufzeit", loanTermYears: "20" });
    expect(r.loanAnnuitat).toBeCloseTo(annuityPayment(300000, 3.5, 240), 6);
    expect(yearsUntilRepaid(r)).toBe(20);
  });
  it("keeps an entered 0 % rate (no silent 3,5 % default)", () => {
    const r = resolveLoanForm({ debt: "12000", loanRate: "0", loanInputMode: "laufzeit", loanTermYears: "4" });
    expect(r.loanRate).toBe(0);
    expect(r.loanAnnuitat).toBeCloseTo(250, 6);
  });
  it("endfällig pays the interest", () => {
    const r = resolveLoanForm({ debt: "200000", loanRate: "3", loanType: "endfaellig", loanTermYears: "10" });
    expect(r.loanAnnuitat).toBeCloseTo(500, 6);
    expect(r.loanTilgung).toBe(0);
  });
  it("stores Zinsbindung, Anschlusszins and Sondertilgung", () => {
    const r = resolveLoanForm({ debt: "1", loanFixedUntil: "2031", loanFollowUpRate: "4", loanSpecialPerYear: "" });
    expect(r).toMatchObject({ loanFixedUntil: 2031, loanFollowUpRate: 4, loanSpecialPerYear: 0 });
    expect(resolveLoanForm({ debt: "1", loanFollowUpRate: "" }).loanFollowUpRate).toBeNull();
  });
  it("opens an existing loan with a payment in 'rate' mode, so its payment is kept", () => {
    // regression: editing the demo property (payment, no term) used to save a payment of 0
    expect(inputModeOf({ loanAnnuitat: 850, loanTermYears: 0 })).toBe("rate");
    expect(inputModeOf({ loanAnnuitat: 0, loanTermYears: 20 })).toBe("laufzeit");
  });
});

describe("expense growth", () => {
  const s = migrateProfile({
    schemaVersion: 3, owners: [], assets: [], standaloneLoans: [], buckets: [], autoSpar: true,
    incomeStreams: [{ label: "Gehalt", amount: 5000, growthPct: 0, startsAt: 2020 }],
    expenseStreams: [{ label: "Leben", amount: 2000, growthPct: 2, startsAt: 2026 }],
  });
  const cf = (y) => cashflowAt(y, { s, assets: [], incomeStreams: s.incomeStreams, ownerFilter: [] });

  it("grows expenses yearly from today", () => {
    expect(cf(0).streamExpense).toBe(2000);
    expect(cf(10).streamExpense).toBeCloseTo(2000 * Math.pow(1.02, 10), 6);
  });
  it("does not inflate today's amount of a stream that started in the past", () => {
    expect(streamAmountAt({ amount: 1000, growthPct: 3, startsAt: 2020 }, 2026)).toBe(1000);
    expect(streamAmountAt({ amount: 1000, growthPct: 3, startsAt: 2030 }, 2031)).toBeCloseTo(1030, 6);
  });
  it("migrates older profiles to 2 % but keeps an explicit value", () => {
    const m = migrateProfile({ schemaVersion: 2, expenseStreams: [{ label: "A", amount: 1 }, { label: "B", amount: 1, growthPct: 0 }] });
    expect(m.expenseStreams.map(e => e.growthPct)).toEqual([2, 0]);
  });
});
