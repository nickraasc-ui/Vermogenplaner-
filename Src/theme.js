import { ASSET_CLASS_DEFAULTS } from "./constants.js";

export const DARK = {
  bg:"#04080f", surface:"#06101a", surfaceHigh:"#07111e",
  border:"#0a1c2c", borderHigh:"#0f2535",
  text:"#c8ddf0", textMid:"#3a5570", textLow:"#1e3545", textDim:"#0f2030",
  accent:"#38bdf8", green:"#10b981", red:"#ef4444", amber:"#f59e0b",
  purple:"#a78bfa", pink:"#f472b6", tabBar:"#050d17", tabBorder:"#0a1825", header:"#050d17",
};
export const LIGHT = {
  bg:"#f0f4f8", surface:"#ffffff", surfaceHigh:"#f8fafc",
  border:"#dde5ed", borderHigh:"#c8d6e4",
  text:"#0f2535", textMid:"#4a6880", textLow:"#7a9ab8", textDim:"#a8c0d0",
  accent:"#0284c7", green:"#059669", red:"#dc2626", amber:"#d97706",
  purple:"#7c3aed", pink:"#db2777", tabBar:"#ffffff", tabBorder:"#dde5ed", header:"#ffffff",
};

export const DEFAULT_CLASS_RETURNS = Object.fromEntries(
  Object.entries(ASSET_CLASS_DEFAULTS).map(([k, v]) => [k, v.return])
);

export const DEFAULT = {
  dark: true,
  nettoGesamt: 8500, ausgaben: 2000, reservenMonthly: 500,
  autoSpar: true, manuellSparrate: 1500,
  classReturns: DEFAULT_CLASS_RETURNS,
  horizon: 35,
  inflationAdj: false, inflation: 2.5,
  sparRateGrowth: false, sparGrowthPct: 2.0,
  assets: [
    { id:"a1", name:"Direktaktien Schenkung", owner:"ehemann", class:"Aktien", liquidity:"Liquide", value:850000, debt:0, locked:true, note:"Bedingte Schenkung" },
    { id:"a2", name:"Depot Ehemann (frei)", owner:"ehemann", class:"Aktien-ETF", liquidity:"Liquide", value:170000, debt:0, locked:false, note:"" },
    { id:"a3", name:"Depot Ehefrau", owner:"ehefrau", class:"Aktien-ETF", liquidity:"Liquide", value:70000, debt:0, locked:false, note:"95% Aktien" },
    { id:"a4", name:"Gemeinschaftsdepot", owner:"gemeinschaft", class:"Aktien-ETF", liquidity:"Liquide", value:15000, debt:0, locked:false, note:"" },
    { id:"a5", name:"Liquiditat Ehefrau", owner:"ehefrau", class:"Cash", liquidity:"Liquide", value:10000, debt:0, locked:false, note:"" },
    { id:"a6", name:"Liquiditat Gemeinschaft", owner:"gemeinschaft", class:"Cash", liquidity:"Liquide", value:15000, debt:0, locked:false, note:"" },
    { id:"a7", name:"Immobilie Munchen", owner:"ehemann", class:"Immobilien", liquidity:"Illiquide", value:430000, debt:130000, locked:false, note:"Kaufpreis 230k", loanRate:3.5, loanTilgung:450, loanAnnuitat:850 },
  ],
  buckets: [], checkins: [], snapshots: [],
};
