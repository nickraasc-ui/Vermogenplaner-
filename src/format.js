// German number formatting — used for every number shown in the interface.
// 1.234.567 € · 1,43 Mio. € · 850 Tsd. € · 7,4 %
const nf = (digits) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const cache = {};

/** Number with fixed decimals, German separators: fmtNum(1234.5, 1) → "1.234,5" */
export const fmtNum = (v, digits = 0) => (cache[digits] ??= nf(digits)).format(Number.isFinite(+v) ? +v : 0);

/** Full euro amount: "1.430.000 €" */
export const full = (v) => fmtNum(Math.round(v ?? 0), 0) + " €";

/** Compact euro amount: "1,43 Mio. €", "850 Tsd. €", "120 €" */
export const fmtE = (v) => {
  if (!Number.isFinite(+v)) return "0 €";
  const a = Math.abs(v);
  if (a >= 1_000_000) return fmtNum(v / 1_000_000, 2) + " Mio. €";
  if (a >= 1_000) return fmtNum(v / 1_000, 0) + " Tsd. €";
  return fmtNum(v, 0) + " €";
};

/** Percentage: fmtPct(7.4) → "7,4 %" */
export const fmtPct = (v, digits = 1) => fmtNum(v, digits) + " %";

/** Signed percentage: pct(2) → "+2,0 %" */
export const pct = (v) => (v >= 0 ? "+" : "") + fmtPct(v, 1);

/** User-entered decimal without trailing zeros: fmtDec(3.85) → "3,85", fmtDec(2) → "2" */
export const fmtDec = (v, maxDigits = 2) =>
  new Intl.NumberFormat("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: maxDigits }).format(Number.isFinite(+v) ? +v : 0);

/** Short label for chart axes: "1,4 Mio.", "850 Tsd.", "0" */
export const fmtAxis = (v) => {
  const a = Math.abs(v);
  if (a >= 1_000_000) return fmtNum(v / 1_000_000, a >= 10_000_000 ? 0 : 1) + " Mio.";
  if (a >= 1_000) return fmtNum(v / 1_000, 0) + " Tsd.";
  return fmtNum(v, 0);
};

/** ISO date "2026-01-15" → "15.01.2026" */
export const fmtDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : (iso || "");
};

/**
 * Parses an amount typed by a German user: "1.234,56" → 1234.56, "250.000" → 250000, "3,5" → 3.5, "1234.5" → 1234.5.
 * Empty or invalid input → 0.
 */
export const parseAmount = (input) => {
  let t = String(input ?? "").trim().replace(/\s|€|%/g, "");
  if (!t) return 0;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");         // German decimal comma
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");      // German thousands dots only
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
};
