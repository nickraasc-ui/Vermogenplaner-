export const IMMO_CF_GROSS = 1200;
export const IMMO_HAUSGELD = 220;
export const IMMO_GRUNDSTEUER = 10;

export const ASSET_CLASS_DEFAULTS = {
  "Aktien":         { return: 9,   color: "#f59e0b" },
  "Aktien-ETF":     { return: 8,   color: "#38bdf8" },
  "Anleihen":       { return: 3,   color: "#a78bfa" },
  "Anleihen-ETF":   { return: 3.5, color: "#818cf8" },
  "Immobilien":     { return: 3,   color: "#10b981" },
  "Cash":           { return: 2,   color: "#64748b" },
  "Rohstoffe":      { return: 5,   color: "#fb923c" },
  "Krypto":         { return: 12,  color: "#f472b6" },
  "Private Equity": { return: 11,  color: "#34d399" },
  "Forderung":      { return: 5,   color: "#22d3ee" },
  "Sonstiges":      { return: -5,  color: "#94a3b8" },
};
export const ASSET_CLASSES = Object.keys(ASSET_CLASS_DEFAULTS);

export const LIQUIDITY_CATS = ["Liquide", "Semi-liquide", "Illiquide"];
export const LIQUIDITY_DEFAULT = {
  "Aktien": "Liquide", "Aktien-ETF": "Liquide",
  "Anleihen": "Semi-liquide", "Anleihen-ETF": "Liquide",
  "Immobilien": "Illiquide", "Cash": "Liquide",
  "Rohstoffe": "Semi-liquide", "Krypto": "Liquide",
  "Private Equity": "Illiquide", "Forderung": "Semi-liquide",
  "Sonstiges": "Illiquide",
};
export const LIQ_CLR = { "Liquide": "#10b981", "Semi-liquide": "#f59e0b", "Illiquide": "#ef4444" };
export const BCK_CLRS = ["#f59e0b","#10b981","#38bdf8","#a78bfa","#f472b6","#fb923c","#ef4444","#34d399"];

export const CY = new Date().getFullYear();
export const CM = new Date().toISOString().slice(0, 7);

export const INCOME_TYPES = ["Gehalt","Freelance","Selbstständig","Rente","Mieteinnahmen","Kapitalerträge","Sonstiges"];
export const EXPENSE_CATEGORIES = ["Lebenshaltung","Versicherung","Bildung","Wohnen","Freizeit","Sonstiges"];
