// Finance helpers shared by the derivations. Moved verbatim from AppInner.jsx.

// Default KeSt rate by asset class (after Teilfreistellung where applicable)
export const KEST_RATES = {
  "Aktien":         0.2638, // 26.375% voll
  "Aktien-ETF":     0.1846, // 30% Teilfreistellung → 26.375% × 0.7
  "Anleihen":       0.2638,
  "Anleihen-ETF":   0.1846,
  "Immobilien":     0.0,    // 10-Jahres-Regel vereinfacht
  "Cash":           0.2638,
  "Rohstoffe":      0.2638,
  "Krypto":         0.2638,
  "Private Equity": 0.1583, // Teileinkünfteverfahren: 60% × 26.375%
  "Forderung":      0.2638,
  "Sonstiges":      0.2638,
};

// tax.taxType per asset overrides the class default when set explicitly
export const KEST_BY_TAX_TYPE = {
  "abgeltung":          null,   // → use class default
  "teileinkuenfte":     0.1583, // Teileinkünfteverfahren: 60% × 26.375%
  "immobilien":         0.0,
  "krypto_langfristig": 0.0,    // §23 EStG: steuerfrei nach > 1 Jahr Haltedauer
  "steuerfrei":         0.0,
};

// Effective KeSt rate for one asset: taxType overrides class default
export const kestRate = (a) => {
  const byType = KEST_BY_TAX_TYPE[a.tax?.taxType];
  if (byType !== null && byType !== undefined) return byType;
  return KEST_RATES[a.class] ?? 0.2638;
};

// Remaining debt at year y, using exact amortization schedule per loan type
export const computeRemDebt = (a, y) => {
  const D = a.debt || 0;
  if (!D) return 0;
  const mo = y * 12;
  const loanType = a.loanType || "annuitat";
  const r = (a.loanRate || 0) / 1200; // monthly rate
  const M = a.loanAnnuitat || 0;
  const n = (a.loanTermYears || 0) * 12; // total months in term

  if (loanType === "endfaellig") {
    // Interest-only: principal stays constant until term end
    return n > 0 && mo >= n ? 0 : D;
  }
  // Annuität / Volltilger: standard amortization formula
  if (r > 0 && M > 0) {
    return Math.max(0, D * Math.pow(1 + r, mo) - M * (Math.pow(1 + r, mo) - 1) / r);
  }
  // Legacy fallback: linear decay via loanTilgung
  const til = a.loanTilgung || 0;
  return til > 0 ? Math.max(0, D - til * 12 * y) : D;
};

// Returns combined ownership share for filtered owners (1.0 if no filter)
export const ownerShare = (asset, ownerFilter) => {
  if (ownerFilter.length === 0) return 1;
  const ownership = asset.ownership || [];
  return ownership.filter(o => ownerFilter.includes(o.ownerId)).reduce((t, o) => t + (o.share || 0), 0);
};

/**
 * Whole years until the loan is repaid, using the same schedule as computeRemDebt
 * (so "schuldenfrei" dates match the projection). null = not repaid within 100 years.
 */
export const yearsUntilPaidOff = (loan) => {
  if (!(loan.debt > 0)) return 0;
  if ((loan.loanType || "annuitat") === "endfaellig") return loan.loanTermYears || null;
  for (let y = 1; y <= 100; y++) if (computeRemDebt(loan, y) < 0.5) return y;
  return null;
};
