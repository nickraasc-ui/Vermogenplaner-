// Test profiles. `complex` exercises every asset class, loan type, scenario type and owner-filter path.
import { CY } from "../src/constants.js";
export const owners = [
  { id:"a", label:"Anna", type:"Person", birthYear:CY-40, ownedBy:[], relations:[], tax:{ personalTaxRate:42, churchTax:false, sparerpauschbetrag:1000, zusammenveranlagung:true } },
  { id:"b", label:"Ben",  type:"Person", birthYear:CY-45, ownedBy:[], relations:[], tax:{ personalTaxRate:42, churchTax:false, sparerpauschbetrag:1000, zusammenveranlagung:true } },
  { id:"g", label:"GmbH", type:"GmbH", ownedBy:[{ownerId:"a",share:1}], relations:[], tax:{ personalTaxRate:30, churchTax:false, sparerpauschbetrag:0, zusammenveranlagung:false } },
];
export const complex = {
  birthYear: CY-40, horizon: 30, taxOnReturns: true, basiszins: 2.29, inflationAdj: false, inflation: 2.5,
  autoSpar: false, manuellSparrate: 2500, sparRateGrowth: true, sparGrowthPct: 1.5,
  immoRentGrowthPct: 2, projSpreadCons: 2, projSpreadOpt: 2, sparDistMode: "manual",
  manualSparDist: { "Aktien-ETF": 1500, "Anleihen-ETF": 500, "Krypto": 200 },
  classReturns: { "Aktien":8, "Aktien-ETF":7, "Anleihen":3, "Anleihen-ETF":3, "Immobilien":2.5, "Cash":2, "Rohstoffe":4, "Krypto":10, "Private Equity":10, "Forderung":5, "Sonstiges":-8 },
  owners,
  assets: [
    { id:"x1", name:"Welt-ETF", class:"Aktien-ETF", ownership:[{ownerId:"a",share:0.6},{ownerId:"b",share:0.4}], value:300000, debt:50000, loanType:"annuitat", loanRate:4, loanTermYears:5, loanAnnuitat:920.83, loanTilgung:754.16, yieldPct:0, liquidity:"Liquide", locked:false, tax:{acquisitionPrice:200000, acquisitionDate:"2019-01-01", taxType:"abgeltung"} },
    { id:"x2", name:"Dividenden-Depot", class:"Aktien", ownership:[{ownerId:"b",share:1}], value:120000, debt:0, yieldPct:3, liquidity:"Liquide", locked:true, tax:{acquisitionPrice:0, acquisitionDate:"", taxType:"abgeltung"} },
    { id:"x3", name:"Eigenheim", class:"Immobilien", ownership:[{ownerId:"a",share:0.5},{ownerId:"b",share:0.5}], value:650000, debt:380000, loanType:"annuitat", loanRate:3.2, loanTermYears:25, loanAnnuitat:1842, loanTilgung:828.67, monthlyRent:0, hausgeld:0, grundsteuer:40, liquidity:"Illiquide", tax:{acquisitionPrice:500000, acquisitionDate:"2020-05-01", taxType:"immobilien"} },
    { id:"x4", name:"Vermietete Wohnung", class:"Immobilien", ownership:[{ownerId:"g",share:1}], value:320000, debt:200000, loanType:"endfaellig", loanRate:3.8, loanTermYears:10, loanAnnuitat:633.33, loanTilgung:0, monthlyRent:1100, hausgeld:260, grundsteuer:25, liquidity:"Illiquide", tax:{acquisitionPrice:280000, acquisitionDate:"2018-03-01", taxType:"immobilien"} },
    { id:"x5", name:"Tagesgeld Puffer", class:"Cash", ownership:[{ownerId:"a",share:0.5},{ownerId:"b",share:0.5}], value:30000, debt:0, isHaushaltsPuffer:true, liquidity:"Liquide", tax:{acquisitionPrice:0, acquisitionDate:"", taxType:"steuerfrei"} },
    { id:"x6", name:"Darlehen an Bruder", class:"Forderung", ownership:[{ownerId:"b",share:1}], value:40000, debt:0, loanRate:2, monthlyRepayment:500, liquidity:"Semi-liquide", tax:{acquisitionPrice:0, acquisitionDate:"", taxType:"abgeltung"} },
    { id:"x7", name:"Boot", class:"Sonstiges", ownership:[{ownerId:"a",share:1}], value:25000, debt:0, monthlyRunningCost:150, liquidity:"Illiquide", tax:{acquisitionPrice:0, acquisitionDate:"", taxType:"steuerfrei"} },
    { id:"x8", name:"Bitcoin", class:"Krypto", ownership:[{ownerId:"a",share:1}], value:15000, debt:0, liquidity:"Liquide", tax:{acquisitionPrice:5000, acquisitionDate:"2021-01-01", taxType:"krypto_langfristig"} },
  ],
  standaloneLoans: [
    { id:"l1", name:"Autokredit", owner:"b", loanType:"annuitat", debt:18000, loanRate:5.9, loanAnnuitat:420, loanTermYears:4 },
    { id:"l2", name:"Familiendarlehen", owner:null, loanType:"annuitat", debt:10000, loanRate:0, loanAnnuitat:0, loanTermYears:null },
  ],
  incomeStreams: [
    { id:"i1", owner:"a", label:"Gehalt Anna", type:"Gehalt", amount:5200, growthPct:2.5, startsAt:CY, endsAt:CY+22 },
    { id:"i2", owner:"b", label:"Gehalt Ben", type:"Gehalt", amount:3900, growthPct:2, startsAt:CY, endsAt:CY+17 },
    { id:"i3", owner:"b", label:"Rente Ben", type:"Rente", amount:1800, growthPct:1, startsAt:CY+18, endsAt:null },
  ],
  expenseStreams: [
    { id:"e1", label:"Lebenshaltung", category:"Lebenshaltung", amount:3200, startsAt:CY, endsAt:null, owner:null },
    { id:"e2", label:"Kita", category:"Bildung", amount:450, startsAt:CY, endsAt:CY+3, owner:"a" },
    { id:"e3", label:"Puffer-Sparen", category:"Sonstiges", amount:200, startsAt:CY, endsAt:null, owner:null, isBufferContribution:true },
  ],
  buckets: [
    { id:"b1", name:"Neues Auto", type:"Einmalig", amount:35000, year:CY+4, fundingMode:"lump_sum", active:true },
    { id:"b2", name:"Urlaub", type:"Jährlich", amount:6000, year:CY, endsAt:CY+20, fundingMode:"lump_sum", active:true },
    { id:"b3", name:"Erbschaft", type:"Zufluss", amount:150000, age:55, fundingMode:"lump_sum", active:true },
    { id:"b4", name:"Teilzeit Anna", type:"Sparrate", delta:-800, startsAt:CY+2, endsAt:CY+6, fundingMode:"lump_sum", active:true, spartopfMode:"proportional" },
    { id:"b5", name:"Küche finanziert", type:"Einmalig", amount:20000, fundingMode:"financed", monthlyPayment:400, financingMonths:48, financingStart:CY+1, active:true },
    { id:"b6", name:"Inaktiv", type:"Monatlich", amount:300, year:CY, fundingMode:"lump_sum", active:false },
  ],
  checkins: [ { id:"c1", month: CY+"-01", inc_ist:9000, streamExp_ist:3900, sparrate_ist:2200, reserven_ist:0, note:"" } ],
  snapshots: [ { id:"s1", date:(CY-1)+"-06-30", note:"", totalNet:700000, assetValues:[] }, { id:"s2", date:(CY)+"-01-15", note:"", totalNet:760000, assetValues:[] } ],
  maritalProperty:"zugewinn", taxFiling:"gemeinsam", dark:true,
};
export const autoVariant = { ...complex, autoSpar: true, sparDistMode: "auto", taxOnReturns: false, inflationAdj: true };
