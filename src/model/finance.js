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

// Remaining debt after y years and payoff year: both come from the loan's repayment schedule (loan.js)
export { remainingDebt as computeRemDebt, yearsUntilRepaid as yearsUntilPaidOff } from "./loan.js";

// Returns combined ownership share for filtered owners (1.0 if no filter)
export const ownerShare = (asset, ownerFilter) => {
  if (ownerFilter.length === 0) return 1;
  const ownership = asset.ownership || [];
  return ownership.filter(o => ownerFilter.includes(o.ownerId)).reduce((t, o) => t + (o.share || 0), 0);
};
