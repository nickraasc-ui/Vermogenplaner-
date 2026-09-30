import { ASSET_CLASS_DEFAULTS, CY } from "./constants.js";

// Design tokens. Values must stay 6-digit hex: components append 2-digit alpha (e.g. T.accent+"22").
// Monochrome, Trade-Republic-like: content sits directly on the background; colour only carries meaning.
export const DARK = {
  bg:"#000000", surface:"#000000", surfaceHigh:"#141414", field:"#1c1c1e", sheet:"#0f0f10",
  border:"#1f1f21", borderHigh:"#2c2c2e",
  text:"#ffffff", textMid:"#a1a1a6", textLow:"#8e8e93", textDim:"#6c6c70",
  accent:"#ffffff", onAccent:"#000000",
  green:"#2fce75", red:"#ff5b52", amber:"#f5a623", purple:"#a594ff", pink:"#ff82b4",
  tabBar:"#000000", tabBorder:"#1f1f21", header:"#000000",
  shadow:"none",
};
export const LIGHT = {
  bg:"#ffffff", surface:"#ffffff", surfaceHigh:"#f4f4f5", field:"#f2f2f4", sheet:"#ffffff",
  border:"#ececee", borderHigh:"#dcdce0",
  text:"#0a0a0a", textMid:"#636366", textLow:"#6e6e73", textDim:"#a1a1a6",
  accent:"#0a0a0a", onAccent:"#ffffff",
  green:"#0d9c55", red:"#e0342b", amber:"#c27a0a", purple:"#6b52e0", pink:"#c0407e",
  tabBar:"#ffffff", tabBorder:"#ececee", header:"#ffffff",
  shadow:"none",
};

export const DEFAULT_CLASS_RETURNS = Object.fromEntries(
  Object.entries(ASSET_CLASS_DEFAULTS).map(([k, v]) => [k, v.return])
);

const TAX_PERSON = { personalTaxRate:42, churchTax:false, sparerpauschbetrag:1000, zusammenveranlagung:true };
const TAX_ENTITY = { personalTaxRate:30, churchTax:false, sparerpauschbetrag:0,    zusammenveranlagung:false };

export const DEFAULT_OWNERS = [
  { id:"ehemann",      label:"Ehemann",      type:"Person", ownedBy:[], relations:[{ targetId:"ehefrau", type:"Ehepartner" }], tax:{ ...TAX_PERSON } },
  { id:"ehefrau",      label:"Ehefrau",      type:"Person", ownedBy:[], relations:[],                                          tax:{ ...TAX_PERSON } },
  { id:"gemeinschaft", label:"Gemeinschaft", type:"GbR",    ownedBy:[{ ownerId:"ehemann", share:0.5 }, { ownerId:"ehefrau", share:0.5 }], relations:[], tax:{ ...TAX_ENTITY } },
];

const ASSET_TAX_DEFAULT = (taxType = "abgeltung") => ({ acquisitionPrice:0, acquisitionDate:"", taxType });
const LIFECYCLE_DEFAULT  = { maturity:null };

export const DEFAULT = {
  dark: true,
  birthYear: new Date().getFullYear() - 35,
  maritalProperty: "zugewinn",
  taxFiling: "gemeinsam",
  taxOnReturns: false,
  immoRentGrowthPct: 2,

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
  basiszins: 2.29,
  owners: DEFAULT_OWNERS,

  assets: [
    { id:"a1", name:"Direktaktien Schenkung",  ownership:[{ ownerId:"ehemann", share:1 }],      class:"Aktien",     liquidity:"Liquide",   value:850000, debt:0, locked:true,  note:"Bedingte Schenkung",  yieldPct:2,   tax:{ ...ASSET_TAX_DEFAULT("abgeltung"),  acquisitionPrice:200000, acquisitionDate:"2015-01-01" }, lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"market",  commitment:0, called:0, distributed:0 },
    { id:"a2", name:"Depot Ehemann (frei)",     ownership:[{ ownerId:"ehemann", share:1 }],      class:"Aktien-ETF", liquidity:"Liquide",   value:170000, debt:0, locked:false, note:"",                    yieldPct:0,   tax:{ ...ASSET_TAX_DEFAULT("abgeltung"),  acquisitionPrice:120000, acquisitionDate:"2018-06-01" }, lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"market",  commitment:0, called:0, distributed:0 },
    { id:"a3", name:"Depot Ehefrau",            ownership:[{ ownerId:"ehefrau", share:1 }],      class:"Aktien-ETF", liquidity:"Liquide",   value:70000,  debt:0, locked:false, note:"95% Aktien",          yieldPct:0,   tax:{ ...ASSET_TAX_DEFAULT("abgeltung"),  acquisitionPrice:50000,  acquisitionDate:"2019-03-01" }, lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"market",  commitment:0, called:0, distributed:0 },
    { id:"a4", name:"Gemeinschaftsdepot",       ownership:[{ ownerId:"gemeinschaft", share:1 }], class:"Aktien-ETF", liquidity:"Liquide",   value:15000,  debt:0, locked:false, note:"",                    yieldPct:0,   tax:{ ...ASSET_TAX_DEFAULT("abgeltung"),  acquisitionPrice:12000,  acquisitionDate:"2021-01-01" }, lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"market",  commitment:0, called:0, distributed:0 },
    { id:"a5", name:"Liquidität Ehefrau",       ownership:[{ ownerId:"ehefrau", share:1 }],      class:"Cash",       liquidity:"Liquide",   value:10000,  debt:0, locked:false, note:"",                    yieldPct:0,   tax:{ ...ASSET_TAX_DEFAULT("steuerfrei") },                                                          lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"market",  commitment:0, called:0, distributed:0 },
    { id:"a6", name:"Liquidität Gemeinschaft",  ownership:[{ ownerId:"gemeinschaft", share:1 }], class:"Cash",       liquidity:"Liquide",   value:15000,  debt:0, locked:false, note:"",                    yieldPct:0,   tax:{ ...ASSET_TAX_DEFAULT("steuerfrei") },                                                          lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"market",  commitment:0, called:0, distributed:0 },
    { id:"a7", name:"Immobilie München",        ownership:[{ ownerId:"ehemann", share:1 }],      class:"Immobilien", liquidity:"Illiquide", value:430000, debt:130000, locked:false, note:"Kaufpreis 230k",  tax:{ ...ASSET_TAX_DEFAULT("immobilien"), acquisitionPrice:230000, acquisitionDate:"2017-09-01" }, lifecycle:LIFECYCLE_DEFAULT, valuationMethod:"appraisal", commitment:0, called:0, distributed:0, loanRate:3.5, loanTilgung:450, loanAnnuitat:850, monthlyRent:1200, hausgeld:220, grundsteuer:10 },
  ],
  buckets: [], checkins: [], snapshots: [],
};
