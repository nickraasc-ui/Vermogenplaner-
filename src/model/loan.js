// Loan maths. One month-by-month schedule per loan drives everything: remaining debt in the
// projection, the payment in the cash flow, "schuldenfrei" dates and the repayment plan in the dialog.
import { CY } from "../constants.js";

const MAX_MONTHS = 100 * 12;
const EPS = 0.005; // below half a cent the loan counts as repaid

const numOrNull = (x) => (x === "" || x === null || x === undefined || Number.isNaN(+x)) ? null : +x;

/** Monthly payment that repays `debt` in `months` at `ratePct` % p.a. */
export const annuityPayment = (debt, ratePct, months) => {
  if (!(debt > 0) || !(months > 0)) return 0;
  const r = (ratePct || 0) / 1200;
  return r > 0 ? debt * r / (1 - Math.pow(1 + r, -months)) : debt / months;
};

/** Monthly payment from the initial Tilgung (anfängliche Tilgung): (Zins % + Tilgung %) × Schuld / 12. */
export const paymentFromTilgungPct = (debt, ratePct, tilgungPct) => (debt || 0) * ((ratePct || 0) + (tilgungPct || 0)) / 1200;

/** Initial Tilgung % p.a. implied by a monthly payment. */
export const tilgungPctFromPayment = (debt, ratePct, payment) => debt > 0 ? (payment || 0) * 1200 / debt - (ratePct || 0) : 0;

/**
 * Months until the fixed-rate period (Zinsbindung) ends, counted from the start of the current year.
 * "Zinsbindung bis 2031" = the old rate applies through 2031, the follow-up rate from 2032 on.
 * null = no fixed-rate end in the future.
 */
export const fixedRateMonths = (loan) => {
  const until = +loan.loanFixedUntil || 0;
  return until >= CY ? (until - CY + 1) * 12 : null;
};

function simulate(loan, { switchAt = null, followRate = null, followPayment = null } = {}) {
  const endfaellig = loan.loanType === "endfaellig";
  const D = loan.debt || 0;
  let rate = loan.loanRate || 0;
  let M = loan.loanAnnuitat || 0;
  // Legacy records without a payment but with a monthly Tilgung: linear repayment plus interest
  const linear = !endfaellig && !(M > 0) && (loan.loanTilgung || 0) > 0 ? loan.loanTilgung : 0;
  const term = endfaellig ? (loan.loanTermYears || 0) * 12 : 0;
  const special = loan.loanSpecialPerYear || 0;

  const years = [];
  let debt = D, payoffMonth = null, cur = null, debtAtSwitch = null;
  for (let m = 1; m <= MAX_MONTHS; m++) {
    if ((m - 1) % 12 === 0) {
      cur = { year: CY + years.length, rate, interest: 0, principal: 0, special: 0, balloon: 0, endDebt: 0 };
      years.push(cur);
    }
    if (switchAt !== null && m === switchAt + 1) {
      debtAtSwitch = debt;
      rate = followRate;
      if (followPayment !== null) M = followPayment;
      cur.rate = rate;
    }
    if (debt > EPS) {
      const interest = debt * rate / 1200;
      let principal = endfaellig ? 0 : linear ? Math.min(linear, debt) : Math.min(M - interest, debt);
      cur.interest += interest;
      cur.principal += principal;
      debt -= principal;
      if (m % 12 === 0 && special > 0 && debt > EPS) {
        const sp = Math.min(special, debt);
        cur.special += sp; debt -= sp;
      }
      if (endfaellig && term > 0 && m === term && debt > EPS) { cur.balloon += debt; debt = 0; }
      if (debt <= EPS) { debt = 0; if (payoffMonth === null) payoffMonth = m; }
    }
    cur.endDebt = debt;
    if (debt === 0 && m % 12 === 0) break;
  }
  return { years, payoffMonth, debtAtSwitch };
}

const cache = new WeakMap();

/**
 * Full repayment schedule of a loan (asset loan or standalone loan), one row per plan year.
 * Rows: { year, rate, interest, principal, special, balloon, endDebt } — all € per year;
 * interest + principal + special is paid from the household cash flow, balloon (endfällig) from the portfolio.
 *
 * Zinsbindung: with loanFixedUntil and loanFollowUpRate the rate changes after the fixed period.
 * The new payment is chosen so the loan is still repaid in the originally planned year
 * (endfällig: the interest simply follows the new rate).
 */
export function loanSchedule(loan) {
  if (loan && typeof loan === "object" && cache.has(loan)) return cache.get(loan);
  const base = simulate(loan);
  const fixM = fixedRateMonths(loan);
  const followRate = numOrNull(loan.loanFollowUpRate);
  let res = { ...base, fixedMonths: fixM, followPayment: null };
  if (fixM !== null && (loan.debt || 0) > 0) {
    const atFixEnd = base.years[fixM / 12 - 1]?.endDebt ?? base.years.at(-1)?.endDebt ?? 0;
    res.debtAtFixEnd = atFixEnd;
    if (followRate !== null && atFixEnd > EPS) {
      let followPayment = null;
      if (loan.loanType !== "endfaellig") {
        followPayment = base.payoffMonth !== null && base.payoffMonth > fixM
          ? annuityPayment(atFixEnd, followRate, base.payoffMonth - fixM)
          : (loan.loanAnnuitat || 0);
        // With Sondertilgungen the plain annuity would overshoot: find the lowest payment that
        // still repays the loan in the planned month (payoff month falls as the payment rises).
        if ((loan.loanSpecialPerYear || 0) > 0 && base.payoffMonth !== null && base.payoffMonth > fixM) {
          let lo = 0, hi = followPayment;
          for (let i = 0; i < 40; i++) {
            const mid = (lo + hi) / 2;
            const { payoffMonth } = simulate(loan, { switchAt: fixM, followRate, followPayment: mid });
            if (payoffMonth !== null && payoffMonth <= base.payoffMonth) hi = mid; else lo = mid;
          }
          followPayment = hi;
        }
        if (!(loan.loanAnnuitat > 0) && (loan.loanTilgung || 0) > 0) followPayment = null; // legacy linear
      }
      const sw = simulate(loan, { switchAt: fixM, followRate, followPayment });
      res = { ...sw, fixedMonths: fixM, debtAtFixEnd: atFixEnd, followPayment };
    }
  }
  if (loan && typeof loan === "object") cache.set(loan, res);
  return res;
}

const rowAt = (loan, i) => {
  const { years } = loanSchedule(loan);
  return years[i] || null;
};

/** Remaining debt after y plan years (y = 0 → today's debt). */
export const remainingDebt = (loan, y) => {
  if (!((loan.debt || 0) > 0)) return 0;
  if (y <= 0) return loan.debt;
  const { years } = loanSchedule(loan);
  return (years[y - 1] || years.at(-1)).endDebt;
};

/** Average monthly payment from the cash flow in plan year y (interest + Tilgung + Sondertilgung). */
export const monthlyPaymentAt = (loan, y) => {
  if (!((loan.debt || 0) > 0)) return 0;
  const { years } = loanSchedule(loan);
  const row = years[y];
  return row ? (row.interest + row.principal + row.special) / 12 : 0;
};

/** One-off repayment at maturity (endfällig) in plan year y — paid from the portfolio. */
export const balloonInYear = (loan, y) => rowAt(loan, y)?.balloon || 0;

/** Whole years until the loan is repaid; null = not within 100 years. */
export const yearsUntilRepaid = (loan) => {
  if (!((loan.debt || 0) > 0)) return 0;
  const { payoffMonth } = loanSchedule(loan);
  return payoffMonth === null ? null : Math.ceil(payoffMonth / 12);
};

/** Total interest until the loan is repaid (or over 100 years). */
export const totalInterest = (loan) => loanSchedule(loan).years.reduce((t, r) => t + r.interest, 0);

// ── Dialog input ─────────────────────────────────────────────────────────────
// loanInputMode: how the payment was entered —
//   "rate"     the monthly payment is known (Kontoauszug / Vertrag)
//   "tilgung"  anfängliche Tilgung in % p.a. (typical for new mortgages)
//   "laufzeit" years until the loan should be repaid
export const LOAN_INPUT_MODES = [
  { value: "rate", label: "Rate" },
  { value: "tilgung", label: "Tilgung %" },
  { value: "laufzeit", label: "Laufzeit" },
];

/** Input mode to preselect when an existing loan is opened. */
export const inputModeOf = (loan) => loan.loanInputMode
  || ((loan.loanAnnuitat || 0) > 0 || !(loan.loanTermYears > 0) ? "rate" : "laufzeit");

/**
 * Turns the loan form of a dialog into the stored loan fields.
 * Pure: the same function feeds the live preview and the saved record.
 */
export function resolveLoanForm(f) {
  const debt = numOrNull(f.debt) || 0;
  const loanRate = numOrNull(f.loanRate) || 0;
  const loanType = f.loanType || "annuitat";
  const mode = f.loanInputMode || "rate";
  let loanAnnuitat = 0, loanTermYears = null, loanTilgungPct = null;
  if (loanType === "endfaellig") {
    loanAnnuitat = debt * loanRate / 1200;
    loanTermYears = numOrNull(f.loanTermYears);
  } else if (mode === "tilgung") {
    loanTilgungPct = numOrNull(f.loanTilgungPct) || 0;
    loanAnnuitat = paymentFromTilgungPct(debt, loanRate, loanTilgungPct);
  } else if (mode === "laufzeit") {
    loanTermYears = numOrNull(f.loanTermYears);
    loanAnnuitat = annuityPayment(debt, loanRate, (loanTermYears || 0) * 12);
  } else {
    loanAnnuitat = numOrNull(f.loanAnnuitat) || 0;
  }
  const fixedUntil = numOrNull(f.loanFixedUntil);
  return {
    debt, loanType, loanRate, loanAnnuitat, loanTermYears,
    loanTilgung: loanType === "endfaellig" ? 0 : Math.max(0, loanAnnuitat - debt * loanRate / 1200),
    loanInputMode: loanType === "endfaellig" ? "laufzeit" : mode,
    loanTilgungPct,
    loanFixedUntil: fixedUntil && fixedUntil > 1900 ? Math.round(fixedUntil) : null,
    loanFollowUpRate: numOrNull(f.loanFollowUpRate),
    loanSpecialPerYear: numOrNull(f.loanSpecialPerYear) || 0,
  };
}
