import { DEFAULT, DEFAULT_CLASS_RETURNS } from "./theme.js";
import { LIQUIDITY_DEFAULT } from "./constants.js";

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
        p.assets = p.assets.map(a => ({
          loanRate: 3.5, loanTilgung: 0, loanAnnuitat: 0, ...a,
          liquidity: a.liquidity || LIQUIDITY_DEFAULT[a.class] || "Semi-liquide",
        }));
      }
      return { ...DEFAULT, ...p, dark: initialDark };
    }
    return { ...DEFAULT, dark: initialDark };
  } catch { return { ...DEFAULT, dark: initialDark }; }
};
