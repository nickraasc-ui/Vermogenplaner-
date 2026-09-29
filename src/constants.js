export const IMMO_CF_GROSS = 1200;
export const IMMO_HAUSGELD = 220;
export const IMMO_GRUNDSTEUER = 10;

export const ASSET_CLASS_DEFAULTS = {
  "Aktien":         { return: 9,   color: "#e3aa45" },
  "Aktien-ETF":     { return: 8,   color: "#5b8def" },
  "Anleihen":       { return: 3,   color: "#a28bf6" },
  "Anleihen-ETF":   { return: 3.5, color: "#7d8bf2" },
  "Immobilien":     { return: 3,   color: "#3cbf8a" },
  "Cash":           { return: 2,   color: "#8a93a6" },
  "Rohstoffe":      { return: 5,   color: "#ea8a50" },
  "Krypto":         { return: 12,  color: "#e27aa8" },
  "Private Equity": { return: 11,  color: "#4fc6a0" },
  "Forderung":      { return: 5,   color: "#3fb3d6" },
  "Sonstiges":      { return: -5,  color: "#9aa3b5" },
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
export const LIQ_CLR = { "Liquide": "#3cbf8a", "Semi-liquide": "#e3aa45", "Illiquide": "#ec6a6a" };
export const BCK_CLRS = ["#e3aa45","#3cbf8a","#5b8def","#a28bf6","#e27aa8","#ea8a50","#ec6a6a","#4fc6a0"];

export const CY = new Date().getFullYear();
export const CM = new Date().toISOString().slice(0, 7);

export const INCOME_TYPES = ["Gehalt","Freelance","Selbstständig","Rente","Mieteinnahmen","Kapitalerträge","Sonstiges"];
export const EXPENSE_CATEGORIES = ["Lebenshaltung","Versicherung","Bildung","Wohnen","Freizeit","Sonstiges"];

export const OWNER_TYPES = ["Person","GmbH","GmbH & Co. KG","KG","GbR","Stiftung","AG","Sonstiges"];
export const RELATION_TYPES = [
  { value:"Ehepartner",   label:"Ehepartner/in", color:"#e27aa8" },
  { value:"Kind",         label:"Kind",           color:"#5b8def" },
  { value:"Elternteil",   label:"Elternteil",     color:"#5b8def" },
  { value:"Geschwister",  label:"Geschwister",    color:"#a28bf6" },
  { value:"Treuhänder",   label:"Treuhänder",     color:"#e3aa45" },
  { value:"Begünstigter", label:"Begünstigter",   color:"#3cbf8a" },
];
export const ASSET_TAX_TYPES = [
  { value:"abgeltung",          label:"Abgeltungsteuer (Aktien/ETF/Zinsen)" },
  { value:"teileinkuenfte",     label:"Teileinkünfteverfahren (GmbH-Anteile)" },
  { value:"immobilien",         label:"Immobilien (10-Jahres-Regel)" },
  { value:"krypto_langfristig", label:"Krypto > 1 Jahr (steuerfrei §23 EStG)" },
  { value:"steuerfrei",         label:"Steuerfrei" },
];
export const VALUATION_METHODS = [
  { value:"market",         label:"Marktwert (Börse/Kurs)" },
  { value:"nav",            label:"NAV (Fondswert)" },
  { value:"appraisal",      label:"Gutachterwert" },
  { value:"lastround",      label:"Letzter Financing Round" },
  { value:"selbstauskunft", label:"Selbstauskunft / geschätzt" },
];
export const LOAN_TYPES = [
  { value: "annuitat",   label: "Annuität",   desc: "Gleichbleibende Rate, sinkender Zinsanteil" },
  { value: "volltilger", label: "Volltilger",  desc: "Vollständige Tilgung innerhalb der Laufzeit" },
  { value: "endfaellig", label: "Endfällig",   desc: "Nur Zinsen lfd., Kapital am Ende fällig" },
];

export const MARITAL_PROPERTY_OPTIONS = [
  { value:"zugewinn",         label:"Zugewinngemeinschaft" },
  { value:"gutertrennung",    label:"Gütertrennung" },
  { value:"gutergemeinschaft",label:"Gütergemeinschaft" },
];
