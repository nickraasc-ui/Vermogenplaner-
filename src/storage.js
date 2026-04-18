import { DEFAULT, DEFAULT_CLASS_RETURNS, DEFAULT_OWNERS } from "./theme.js";
import { LIQUIDITY_DEFAULT, IMMO_CF_GROSS, IMMO_HAUSGELD, IMMO_GRUNDSTEUER, CY } from "./constants.js";

const rng = () => Math.random().toString(36).slice(2, 9);

export const saveState = (st, key) => { try { localStorage.setItem(key, JSON.stringify(st)); } catch {} };

export const loadProfileState = (profileId, initialDark) => {
  const LS_KEY = "wealth-pwa-v3-" + profileId;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (!p.classReturns) p.classReturns = { ...DEFAULT_CLASS_RETURNS };
      else p.classReturns = { ...DEFAULT_CLASS_RETURNS, ...p.classReturns };
      if (p.assets) {
        p.assets = p.assets.map(a => {
          const base = {
            loanRate: 3.5, loanTilgung: 0, loanAnnuitat: 0,
            monthlyRepayment: 0, monthlyRunningCost: 0,
            valuationMethod: "market",
            commitment: 0, called: 0, distributed: 0,
            ...a,
            // Migrate owner → ownership[]
            ownership: a.ownership || (a.owner ? [{ ownerId: a.owner, share: 1.0 }] : []),
            // Migrate tax basis
            tax: a.tax || { acquisitionPrice: 0, acquisitionDate: "", taxType: a.class === "Immobilien" ? "immobilien" : "abgeltung" },
            lifecycle: a.lifecycle || { maturity: null },
            liquidity: a.liquidity || LIQUIDITY_DEFAULT[a.class] || "Semi-liquide",
          };
          if (a.class === "Immobilien") {
            return { monthlyRent: IMMO_CF_GROSS, hausgeld: IMMO_HAUSGELD, grundsteuer: IMMO_GRUNDSTEUER, ...base };
          }
          return { yieldPct: 0, ...base };
        });
      }
      if (!p.owners || p.owners.length === 0) p.owners = [...DEFAULT_OWNERS];
      if (!p.sparDistMode) p.sparDistMode = "auto";
      if (!p.manualSparDist) p.manualSparDist = {};

      // Migrate owners: add type, tax profile, ownedBy
      p.owners = (p.owners||[]).map(o => ({
        type: "Person", ownedBy: [],
        tax: { personalTaxRate:42, churchTax:false, sparerpauschbetrag:1000, zusammenveranlagung:true },
        ...o,
      }));

      // Profile-level fields
      if (!p.maritalProperty) p.maritalProperty = "zugewinn";
      if (!p.taxFiling) p.taxFiling = "gemeinsam";
      if (!p.birthYear) p.birthYear = CY - 35;
      if (!("taxOnReturns" in p)) p.taxOnReturns = false;
      if (!("immoRentGrowthPct" in p)) p.immoRentGrowthPct = 2;

      // Migrate bucket type spelling
      if (p.buckets) p.buckets = p.buckets.map(b => ({ ...b, type: b.type === "Jahrlich" ? "Jährlich" : b.type }));

      // Migrate nettoGesamt / ausgaben → streams
      if (!p.incomeStreams || p.incomeStreams.length === 0) {
        p.incomeStreams = [{ id:rng(), owner:null, label:"Haushaltseinkommen", type:"Gehalt", amount:p.nettoGesamt||8500, growthPct:0, startsAt:CY, endsAt:null }];
      }
      if (!p.expenseStreams || p.expenseStreams.length === 0) {
        p.expenseStreams = [{ id:rng(), label:"Lebenshaltungskosten", category:"Lebenshaltung", amount:p.ausgaben||2000, startsAt:CY, endsAt:null }];
        if ((p.reservenMonthly||0) > 0) {
          p.expenseStreams.push({ id:rng(), label:"Reserven / Unregelmäßiges", category:"Sonstiges", amount:p.reservenMonthly, startsAt:CY, endsAt:null });
        }
      }

      // Migrate buckets: add fundingMode
      if (p.buckets) {
        p.buckets = p.buckets.map(b => ({
          fundingMode:"lump_sum", monthlyPayment:0, financingMonths:12,
          financingStart: b.year ? +b.year : CY,
          ...b,
        }));
      }

      return { ...DEFAULT, ...p, dark: initialDark };
    }
    return { ...DEFAULT, dark: initialDark };
  } catch { return { ...DEFAULT, dark: initialDark }; }
};
