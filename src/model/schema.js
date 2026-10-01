// Data model: current schema version, record normalisers, ownership helpers and migrations.
// Field reference: docs/DATA_MODEL.md
import { CY, LIQUIDITY_DEFAULT, IMMO_CF_GROSS, IMMO_HAUSGELD, IMMO_GRUNDSTEUER } from "../constants.js";
import { DEFAULT, DEFAULT_CLASS_RETURNS, DEFAULT_OWNERS } from "./defaults.js";
import { uid } from "./ids.js";

export const SCHEMA_VERSION = 2;

// ── Small helpers ──────────────────────────────────────────────────────────
/** Number from user input; empty / invalid → fallback (0 stays 0). */
export const num = (x, fallback = 0) => (x === "" || x === null || x === undefined || Number.isNaN(+x)) ? fallback : +x;
const yearOrNull = (x) => (x === "" || x === null || x === undefined || !+x) ? null : +x;

/** Age of the profile's main person (s.birthYear). Scenario target ages refer to this. */
export const profileAge = (s) => CY - (s.birthYear || CY - 35);

// ── Ownership ──────────────────────────────────────────────────────────────
// Every owned record (asset, income/expense stream, standalone loan) uses ownership: [{ ownerId, share }].
// An empty list means "shared by the household": it is included under every owner filter.
export const ownershipOf = (x) => x?.ownership || [];
export const singleOwner = (ownerId) => ownerId ? [{ ownerId, share: 1 }] : [];
export const primaryOwnerId = (x) => ownershipOf(x)[0]?.ownerId || null;
/** True if the record belongs to one of the filtered owners (or is shared, or no filter is set). */
export const matchesOwnerFilter = (x, ownerFilter) => {
  const own = ownershipOf(x);
  return ownerFilter.length === 0 || own.length === 0 || own.some(o => ownerFilter.includes(o.ownerId));
};
/** Sum of shares; valid lists add up to 1 (100 %). */
export const shareTotal = (ownership) => (ownership || []).reduce((t, o) => t + (+o.share || 0), 0);
export const sharesValid = (ownership) => !ownership?.length || Math.abs(shareTotal(ownership) - 1) < 0.005;

// ── Scenarios ("buckets") ──────────────────────────────────────────────────
// kind: "ausgabe" | "zufluss" | "sparrate" | "finanziert"; frequency (ausgabe only): "einmalig" | "jaehrlich" | "monatlich"
export const SCENARIO_KINDS = ["ausgabe", "zufluss", "sparrate", "finanziert"];
export const FREQUENCIES = [
  { value: "einmalig", label: "Einmalig" },
  { value: "jaehrlich", label: "Jährlich" },
  { value: "monatlich", label: "Monatlich" },
];

// ── Normalisers: the one definition of each record's shape ─────────────────
export function normalizeAsset(a) {
  const cls = a.class || "Aktien-ETF";
  const { owner, ...rest } = a; // legacy single-owner field
  const out = {
    ...rest,
    id: a.id || uid(),
    name: a.name || "",
    class: cls,
    ownership: a.ownership || singleOwner(owner),
    value: num(a.value), debt: num(a.debt),
    liquidity: a.liquidity || LIQUIDITY_DEFAULT[cls] || "Semi-liquide",
    yieldPct: num(a.yieldPct),
    locked: !!a.locked,
    isHaushaltsPuffer: !!a.isHaushaltsPuffer,
    note: a.note || "",
    valuationMethod: a.valuationMethod || "market",
    loanType: a.loanType || "annuitat",
    loanRate: num(a.loanRate), loanTermYears: num(a.loanTermYears),
    loanAnnuitat: num(a.loanAnnuitat), loanTilgung: num(a.loanTilgung),
    monthlyRepayment: num(a.monthlyRepayment), monthlyRunningCost: num(a.monthlyRunningCost),
    tax: {
      acquisitionPrice: num(a.tax?.acquisitionPrice),
      acquisitionDate: a.tax?.acquisitionDate || "",
      taxType: a.tax?.taxType || (cls === "Immobilien" ? "immobilien" : "abgeltung"),
    },
    lifecycle: { maturity: a.lifecycle?.maturity || null },
    commitment: num(a.commitment), called: num(a.called), distributed: num(a.distributed),
  };
  if (cls === "Immobilien") {
    out.monthlyRent = num(a.monthlyRent); out.hausgeld = num(a.hausgeld); out.grundsteuer = num(a.grundsteuer);
  }
  if (a.manualAnnuitat !== undefined) out.manualAnnuitat = num(a.manualAnnuitat);
  return out;
}

export const normalizeIncomeStream = (st) => {
  const { owner, ...rest } = st;
  return { ...rest, id: st.id || uid(), label: st.label || "", type: st.type || "Gehalt",
    ownership: st.ownership || singleOwner(owner), amount: num(st.amount), growthPct: num(st.growthPct),
    startsAt: yearOrNull(st.startsAt) ?? CY, endsAt: yearOrNull(st.endsAt) };
};

export const normalizeExpenseStream = (st) => {
  const { owner, ...rest } = st;
  return { ...rest, id: st.id || uid(), label: st.label || "", category: st.category || "Sonstiges",
    ownership: st.ownership || singleOwner(owner), amount: num(st.amount),
    startsAt: yearOrNull(st.startsAt) ?? CY, endsAt: yearOrNull(st.endsAt),
    isBufferContribution: !!st.isBufferContribution };
};

export const normalizeLoan = (l) => {
  const { owner, ...rest } = l;
  return { ...rest, id: l.id || uid(), name: l.name || "", ownership: l.ownership || singleOwner(owner),
    loanType: l.loanType || "annuitat", debt: num(l.debt), loanRate: num(l.loanRate),
    loanAnnuitat: num(l.loanAnnuitat), loanTermYears: yearOrNull(l.loanTermYears) };
};

export function normalizeBucket(b) {
  // legacy: category spread over `type` (Einmalig/Jährlich/Monatlich/Zufluss/Sparrate) and `fundingMode`
  const { type, fundingMode, ...rest } = b;
  const kind = b.kind
    || (fundingMode === "financed" ? "finanziert" : type === "Zufluss" ? "zufluss" : type === "Sparrate" ? "sparrate" : "ausgabe");
  const legacyFreq = { "Jährlich": "jaehrlich", "Jahrlich": "jaehrlich", "Monatlich": "monatlich" }[type];
  return {
    ...rest,
    id: b.id || uid(),
    name: b.name || b.label || "",
    kind,
    frequency: b.frequency || legacyFreq || "einmalig",
    active: b.active !== false,
    amount: num(b.amount),
    year: yearOrNull(b.year), age: yearOrNull(b.age), endsAt: yearOrNull(b.endsAt),
    // Einnahmenänderung
    delta: num(b.delta), startsAt: yearOrNull(b.startsAt),
    // Finanziert
    monthlyPayment: num(b.monthlyPayment), financingMonths: num(b.financingMonths, 12),
    financingStart: yearOrNull(b.financingStart) ?? (b.year ? +b.year : CY),
  };
}

// ── Migrations ─────────────────────────────────────────────────────────────
// v1 = every profile stored before schema versions existed (app ≤ 1.15).
function migrateV1toV2(p) {
  p = { ...p };
  p.classReturns = { ...DEFAULT_CLASS_RETURNS, ...(p.classReturns || {}) };

  // Assets: defaults that old versions relied on when a field was missing
  p.assets = (p.assets || []).map(a => {
    const legacy = { loanRate: 3.5, ...a };
    if (a.class === "Immobilien") Object.assign(legacy, {
      monthlyRent: a.monthlyRent ?? IMMO_CF_GROSS, hausgeld: a.hausgeld ?? IMMO_HAUSGELD, grundsteuer: a.grundsteuer ?? IMMO_GRUNDSTEUER });
    return legacy;
  });

  if (!p.owners || p.owners.length === 0) p.owners = DEFAULT_OWNERS.map(o => ({ ...o }));
  p.owners = p.owners.map(o => ({
    type: "Person", ownedBy: [], relations: [],
    tax: { personalTaxRate: 42, churchTax: false, sparerpauschbetrag: 1000, zusammenveranlagung: true },
    ...o,
  }));

  // Very old profiles stored household income/expenses as single numbers
  if (p.incomeStreams === undefined) {
    p.incomeStreams = [{ label: "Haushaltseinkommen", type: "Gehalt", amount: p.nettoGesamt || 8500, growthPct: 0, startsAt: CY, endsAt: null }];
  }
  if (p.expenseStreams === undefined) {
    p.expenseStreams = [{ label: "Lebenshaltungskosten", category: "Lebenshaltung", amount: p.ausgaben || 2000, startsAt: CY, endsAt: null }];
    if ((p.reservenMonthly || 0) > 0) p.expenseStreams.push({ label: "Reserven / Unregelmäßiges", category: "Sonstiges", amount: p.reservenMonthly, startsAt: CY, endsAt: null });
  }
  delete p.nettoGesamt; delete p.ausgaben; delete p.reservenMonthly;

  // Check-ins: ausgaben_ist → streamExp_ist; snapshots: value → totalNet
  p.checkins = (p.checkins || []).map(({ ausgaben_ist, ...c }) => ({ ...c, streamExp_ist: c.streamExp_ist ?? ausgaben_ist ?? 0 }));
  p.snapshots = (p.snapshots || []).map(({ value, ...sn }) => ({ ...sn, totalNet: sn.totalNet ?? value ?? 0 }));

  // Theme is a device setting (stored globally), not part of a profile
  delete p.dark;
  return p;
}

const MIGRATIONS = { 1: migrateV1toV2 };

/**
 * Brings a stored profile of any version to the current schema and normalises every record.
 * Pure: no storage access. Unknown future versions are left as they are.
 */
export function migrateProfile(raw) {
  let p = { ...(raw || {}) };
  let v = p.schemaVersion || 1;
  while (v < SCHEMA_VERSION) { p = MIGRATIONS[v](p); v++; }

  const out = { ...DEFAULT, ...p, schemaVersion: Math.max(v, SCHEMA_VERSION) };
  out.classReturns = { ...DEFAULT_CLASS_RETURNS, ...(out.classReturns || {}) };
  out.assets = (out.assets || []).map(normalizeAsset);
  out.incomeStreams = (out.incomeStreams || []).map(normalizeIncomeStream);
  out.expenseStreams = (out.expenseStreams || []).map(normalizeExpenseStream);
  out.standaloneLoans = (out.standaloneLoans || []).map(normalizeLoan);
  out.buckets = (out.buckets || []).map(normalizeBucket);
  out.checkins = out.checkins || [];
  out.snapshots = out.snapshots || [];
  out.sparDistMode = out.sparDistMode || "auto";
  out.manualSparDist = out.manualSparDist || {};
  return out;
}

/** Ids of everything that still references an owner (to block deleting it). */
export function ownerReferences(s, ownerId) {
  const has = (x) => ownershipOf(x).some(o => o.ownerId === ownerId);
  return {
    assets: (s.assets || []).filter(has).length,
    incomeStreams: (s.incomeStreams || []).filter(has).length,
    expenseStreams: (s.expenseStreams || []).filter(has).length,
    loans: (s.standaloneLoans || []).filter(has).length,
    shareholders: (s.owners || []).filter(o => (o.ownedBy || []).some(ob => ob.ownerId === ownerId)).length,
  };
}
