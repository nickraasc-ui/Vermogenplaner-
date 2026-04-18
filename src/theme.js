import { ASSET_CLASS_DEFAULTS, CY } from "./constants.js";

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

const TAX_PERSON = { personalTaxRate:42, churchTax:false, sparerpauschbetrag:1000, zusammenveranlagung:true };
const TAX_ENTITY = { personalTaxRate:30, churchTax:false, sparerpauschbetrag:0,    zusammenveranlagung:false };

export const DEFAULT_OWNERS = [
  { id:"ehemann",      label:"Ehemann",      type:"Person", ownedBy:[], tax:{ ...TAX_PERSON } },
  { id:"ehefrau",      label:"Ehefrau",      type:"Person", ownedBy:[], tax:{ ...TAX_PERSON } },
  { id:"gemeinschaft", label:"Gemeinschaft", type:"GbR",    ownedBy:[{ ownerId:"ehemann", share:0.5 }, { ownerId:"ehefrau", share:0.5 }], tax:{ ...TAX_ENTITY } },
];

const ASSET_TAX_DEFAULT = (taxType = "abgeltung") => ({ acquisitionPrice:0, acquisitionDate:"", taxType });
const LIFECYCLE_DEFAULT  = { maturity:null };

export const DEFAULT = {
  dark: true,
  maritalProperty: "zugewinn",
  taxFiling: "gemeinsam",

  incomeStreams: [
    { id:"i1", owner:"ehemann", label:"Gehalt Ehemann", type:"Gehalt", amount:5000, growthPct:2, startsAt:CY, endsAt:null },
    { id:"i2", owner:"ehefrau", label:"Gehalt Ehefrau", type:"Gehalt", amount:3500, growthPct:2, startsAt:CY, endsAt:null },
  ],
  expenseStreams: [
    { id:"e1", label:"Lebenshaltungskosten",     category:"Lebenshaltung", amount:2000, startsAt:CY, endsAt:null },
    { id:"e2", label:"Reserven / Unregelmäßiges", category:"Sonstiges",    amount:500,  startsAt:CY, endsAt:null },
  ],

  autoSpar: true, manuellSparrate: 1500,
  classReturns: DEFAULT_CLASS_RETURNS,
  horizon: 35,
  inflationAdj: false, inflation: 2.5,
  sparRateGrowth: false, sparGrowthPct: 2.0,
  sparDistMode: "auto", manualSparDist: {},
  owners: DEFAULT_OWNERS,

  assets: [
    { id:"a1", name:"Direktaktien Schenkung",  ownership:[{ ownerId:"ehemann", share:1 }],      class:"Aktien",     liquidity:"Liquide",   value:850000, debt:0, locked:true,  note:"Bedingte Schenkung",  tax:{ ...ASSET_TAX_DEFAULT("abgeltung"),  acquisitionPrice:200000, acquisitionDate:"2015-01-01" }, lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"market",  commitment:0, called:0, distributed:0 },
    { id:"a2", name:"Depot Ehemann (frei)",     ownership:[{ ownerId:"ehemann", share:1 }],      class:"Aktien-ETF", liquidity:"Liquide",   value:170000, debt:0, locked:false, note:"",                    tax:{ ...ASSET_TAX_DEFAULT("abgeltung"),  acquisitionPrice:120000, acquisitionDate:"2018-06-01" }, lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"market",  commitment:0, called:0, distributed:0 },
    { id:"a3", name:"Depot Ehefrau",            ownership:[{ ownerId:"ehefrau", share:1 }],      class:"Aktien-ETF", liquidity:"Liquide",   value:70000,  debt:0, locked:false, note:"95% Aktien",          tax:{ ...ASSET_TAX_DEFAULT("abgeltung"),  acquisitionPrice:50000,  acquisitionDate:"2019-03-01" }, lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"market",  commitment:0, called:0, distributed:0 },
    { id:"a4", name:"Gemeinschaftsdepot",       ownership:[{ ownerId:"gemeinschaft", share:1 }], class:"Aktien-ETF", liquidity:"Liquide",   value:15000,  debt:0, locked:false, note:"",                    tax:{ ...ASSET_TAX_DEFAULT("abgeltung"),  acquisitionPrice:12000,  acquisitionDate:"2021-01-01" }, lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"market",  commitment:0, called:0, distributed:0 },
    { id:"a5", name:"Liquidität Ehefrau",       ownership:[{ ownerId:"ehefrau", share:1 }],      class:"Cash",       liquidity:"Liquide",   value:10000,  debt:0, locked:false, note:"",                    tax:{ ...ASSET_TAX_DEFAULT("steuerfrei") },                                                          lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"market",  commitment:0, called:0, distributed:0 },
    { id:"a6", name:"Liquidität Gemeinschaft",  ownership:[{ ownerId:"gemeinschaft", share:1 }], class:"Cash",       liquidity:"Liquide",   value:15000,  debt:0, locked:false, note:"",                    tax:{ ...ASSET_TAX_DEFAULT("steuerfrei") },                                                          lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"market",  commitment:0, called:0, distributed:0 },
    { id:"a7", name:"Immobilie München",        ownership:[{ ownerId:"ehemann", share:1 }],      class:"Immobilien", liquidity:"Illiquide", value:430000, debt:130000, locked:false, note:"Kaufpreis 230k",  tax:{ ...ASSET_TAX_DEFAULT("immobilien"), acquisitionPrice:230000, acquisitionDate:"2017-09-01" }, lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"appraisal", commitment:0, called:0, distributed:0, loanRate:3.5, loanTilgung:450, loanAnnuitat:850, monthlyRent:1200, hausgeld:220, grundsteuer:10 },
  ],
  buckets: [], checkins: [], snapshots: [],
};
