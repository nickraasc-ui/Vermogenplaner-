// Builds a new profile from the answers of the setup quiz (SetupWizard).
import { CY } from "../constants.js";
import { migrateProfile, SCHEMA_VERSION } from "./schema.js";
import { uid } from "./ids.js";

export const INVESTMENT_FIELDS = [
  { key: "cash",   cls: "Cash",       name: "Tagesgeld & Konten", hint: "Girokonto, Tagesgeld, Festgeld" },
  { key: "etf",    cls: "Aktien-ETF", name: "ETF-Depot",          hint: "Fonds und ETFs" },
  { key: "stocks", cls: "Aktien",     name: "Einzelaktien",       hint: "Direkt gehaltene Aktien" },
  { key: "crypto", cls: "Krypto",     name: "Krypto",             hint: "Bitcoin, Ethereum, …" },
];

/** Monthly annuity rate for a loan (fallback when the user doesn't know the rate). */
const annuity = (debt, ratePct, years) => {
  const r = ratePct / 1200, n = years * 12;
  if (!debt || !n) return 0;
  return r === 0 ? debt / n : debt * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
};

export const emptyAnswers = () => ({
  profileName: "",
  household: "single",                                   // "single" | "couple"
  people: [{ name: "", birthYear: "" }, { name: "", birthYear: "" }],
  income: ["", ""],                                      // net €/month per person
  expenses: "",                                          // household €/month
  investments: { cash: { amount: "", owner: "p1" }, etf: { amount: "", owner: "p1" }, stocks: { amount: "", owner: "p1" }, crypto: { amount: "", owner: "p1" } },
  property: { has: false, value: "", debt: "", rate: "", payment: "", rented: false, rent: "", owner: "p1" },
  loan: { has: false, name: "", debt: "", rate: "", payment: "" },
});

/**
 * @param {object} a       answers (see emptyAnswers); amounts are already numbers
 * @returns {object}       complete profile state in the current schema — no demo data
 */
export function buildProfileFromSetup(a) {
  const couple = a.household === "couple";
  const people = (couple ? a.people : a.people.slice(0, 1)).map((p, i) => ({
    id: uid(),
    label: (p.name || "").trim() || (couple ? (i === 0 ? "Person 1" : "Person 2") : "Ich"),
    birthYear: +p.birthYear || null,
  }));
  const ownersById = { p1: people[0], p2: people[1] };

  // owner choice "p1" | "p2" | "both" → ownership list
  const ownership = (choice) => {
    if (choice === "both" && couple) return people.map(p => ({ ownerId: p.id, share: 0.5 }));
    const p = ownersById[choice] || people[0];
    return [{ ownerId: p.id, share: 1 }];
  };

  const owners = people.map((p, i) => ({
    id: p.id, label: p.label, type: "Person", ...(p.birthYear ? { birthYear: p.birthYear } : {}),
    ownedBy: [], relations: couple && i === 0 ? [{ targetId: people[1].id, type: "Ehepartner" }] : [],
    tax: { personalTaxRate: 42, churchTax: false, sparerpauschbetrag: 1000, zusammenveranlagung: couple },
  }));

  const incomeStreams = people.map((p, i) => ({ amount: +a.income[i] || 0, p }))
    .filter(x => x.amount > 0)
    .map(({ amount, p }) => ({ label: "Nettoeinkommen " + p.label, type: "Gehalt", ownership: [{ ownerId: p.id, share: 1 }],
      amount, growthPct: 2, startsAt: CY, endsAt: null }));

  const expenseStreams = (+a.expenses || 0) > 0
    ? [{ label: "Lebenshaltung", category: "Lebenshaltung", ownership: [], amount: +a.expenses, startsAt: CY, endsAt: null }]
    : [];

  const assets = INVESTMENT_FIELDS
    .filter(f => (+a.investments[f.key]?.amount || 0) > 0)
    .map(f => ({ name: f.name, class: f.cls, value: +a.investments[f.key].amount, ownership: ownership(a.investments[f.key].owner) }));

  const pr = a.property;
  if (pr?.has && (+pr.value || 0) > 0) {
    const debt = +pr.debt || 0, rate = +pr.rate || 0;
    const payment = +pr.payment || (debt ? annuity(debt, rate || 3.5, 25) : 0);
    assets.push({
      name: pr.rented ? "Vermietete Immobilie" : "Selbstgenutzte Immobilie", class: "Immobilien",
      value: +pr.value, debt, ownership: ownership(pr.owner),
      loanType: "annuitat", loanRate: rate, loanAnnuitat: payment, loanTilgung: Math.max(0, payment - debt * rate / 1200),
      monthlyRent: pr.rented ? (+pr.rent || 0) : 0, hausgeld: 0, grundsteuer: 0,
      tax: { taxType: "immobilien" },
    });
  }

  const ln = a.loan;
  const standaloneLoans = ln?.has && (+ln.debt || 0) > 0
    ? [{ name: (ln.name || "").trim() || "Kredit", ownership: [], loanType: "annuitat", debt: +ln.debt,
         loanRate: +ln.rate || 0, loanAnnuitat: +ln.payment || 0, loanTermYears: null }]
    : [];

  return migrateProfile({
    schemaVersion: SCHEMA_VERSION,
    birthYear: people[0].birthYear || CY - 35,
    owners, incomeStreams, expenseStreams, assets, standaloneLoans,
    buckets: [], checkins: [], snapshots: [],
  });
}
