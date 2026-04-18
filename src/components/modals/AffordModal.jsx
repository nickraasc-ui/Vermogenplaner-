import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, Row, fmtE, full, uid } from "../ui.jsx";
import { CY, BCK_CLRS } from "../../constants.js";

function Verdict({ label, sub, color, T }) {
  return (
    <div style={{ background:color+"15", border:"1px solid "+color+"44", borderRadius:8, padding:"11px 14px", marginBottom:10 }}>
      <div style={{ fontSize:14, fontWeight:800, color }}>{label}</div>
      {sub && <div style={{ fontSize:10, color, opacity:0.8, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

export default function AffordModal({ s, cf, agg, final, T, setModal, updArr }) {
  const [amt, setAmt]   = useState("");
  const [type, setType] = useState("Einmalig");
  const [lbl, setLbl]   = useState("");

  const amount  = parseFloat(amt) || 0;
  const monthly = type === "Monatlich" ? amount : type === "Jährlich" ? amount / 12 : 0;

  // --- Wachstumsanalyse ---
  const annualGrowthEUR  = agg.net > 0 ? agg.net * (agg.wavgReturn / 100) : 0;
  const monthlyGrowthEUR = annualGrowthEUR / 12;
  const liquidCash = (s.assets||[]).filter(a => a.class === "Cash").reduce((t, a) => t + (a.value||0), 0);
  const liquidNet  = (agg.byLiquidity?.["Liquide"] || 0);

  // Opportunitätskosten: Endwert-Impact
  const r = agg.wavgReturn / 100;
  const rm = r / 12;
  const impact = type === "Einmalig"
    ? amount * Math.pow(1 + r, s.horizon)
    : monthly > 0 && rm > 0
      ? monthly * ((Math.pow(1 + rm, s.horizon * 12) - 1) / rm)
      : monthly * s.horizon * 12;
  const baseEnd = final.base || 0;
  const newEnd  = Math.max(0, baseEnd - impact);
  const pctI    = baseEnd > 0 ? (impact / baseEnd) * 100 : 0;

  // --- Verdicts ---
  let verdictLabel = "", verdictSub = "", verdictColor = T.green;

  if (type === "Einmalig" && amount > 0) {
    const monthsOfGrowth = monthlyGrowthEUR > 0 ? amount / monthlyGrowthEUR : Infinity;
    const monthsOfSaving = (cf.eff || 0) > 0 ? amount / cf.eff : Infinity;
    if (amount <= annualGrowthEUR) {
      verdictLabel = "Aus Wachstum finanzierbar";
      verdictSub   = `Entspricht ${monthsOfGrowth.toFixed(1)} Monaten Vermögenswachstum — keine Substanz betroffen`;
      verdictColor = T.green;
    } else if (amount <= liquidCash) {
      verdictLabel = "Aus Liquidität finanzierbar";
      verdictSub   = `Übersteigt das Jahreswachstum (${fmtE(annualGrowthEUR)}), aber Cash reicht aus`;
      verdictColor = T.amber;
    } else if (amount <= liquidNet) {
      verdictLabel = "Greift Vermögenssubstanz an";
      verdictSub   = `Erfordert Liquidierung von Assets — ${fmtE(amount - liquidCash)} über Cash-Bestand`;
      verdictColor = T.red;
    } else {
      verdictLabel = "Nicht sofort finanzierbar";
      verdictSub   = `Übersteigt liquides Vermögen (${fmtE(liquidNet)}). ${monthsOfSaving < Infinity ? Math.ceil(monthsOfSaving)+" Monate ansparen." : ""}`;
      verdictColor = T.red;
    }
  } else if ((type === "Monatlich" || type === "Jährlich") && monthly > 0) {
    if (monthly <= monthlyGrowthEUR) {
      verdictLabel = "Vollständig aus Wachstum finanziert";
      verdictSub   = `${full(monthly)}/Mo. Kosten vs. ${full(monthlyGrowthEUR)}/Mo. Wachstum — Substanz unberührt`;
      verdictColor = T.green;
    } else if (monthly <= (cf.saldo || 0)) {
      verdictLabel = "Aus aktuellem Cashflow finanzierbar";
      verdictSub   = `Übersteigt Wachstum (${full(monthlyGrowthEUR)}/Mo.), passt aber noch in den Monatssaldo`;
      verdictColor = T.amber;
    } else if (monthly <= cf.eff) {
      verdictLabel = "Reduziert die Sparrate";
      verdictSub   = `${full(monthly - (cf.saldo||0))}/Mo. mehr als der Saldo — neue Sparrate: ${full(cf.eff - monthly)}/Mo.`;
      verdictColor = T.amber;
    } else {
      verdictLabel = "Greift Vermögenssubstanz an";
      verdictSub   = `${full(monthly - cf.eff)}/Mo. über Sparrate — Substanz wird aufgezehrt`;
      verdictColor = T.red;
    }
  }

  return (
    <Sheet title="Was kann ich mir leisten?" onClose={() => setModal(null)} T={T}>
      <Inp label="Bezeichnung" value={lbl} onChange={setLbl} placeholder="z.B. Neues Auto..." T={T} />
      <SelEl label="Typ" value={type} onChange={setType} options={["Einmalig","Monatlich","Jährlich"]} T={T} />
      <Inp label="Betrag (EUR)" value={amt} onChange={setAmt} type="number" placeholder="0" T={T} />

      {/* Wachstumsbasis immer zeigen */}
      <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:"10px 13px", marginBottom:10 }}>
        <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Dein Vermögenswachstum</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div>
            <div style={{ fontSize:9, color:T.textDim }}>Jahreswachstum ({agg.wavgReturn.toFixed(1)}%)</div>
            <div style={{ fontSize:15, fontWeight:800, color:T.green }}>{fmtE(annualGrowthEUR)}/J.</div>
          </div>
          <div>
            <div style={{ fontSize:9, color:T.textDim }}>Monatswachstum</div>
            <div style={{ fontSize:15, fontWeight:800, color:T.green }}>{full(monthlyGrowthEUR)}/Mo.</div>
          </div>
          <div>
            <div style={{ fontSize:9, color:T.textDim }}>Cash-Liquidität</div>
            <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{fmtE(liquidCash)}</div>
          </div>
          <div>
            <div style={{ fontSize:9, color:T.textDim }}>Monatssaldo</div>
            <div style={{ fontSize:13, fontWeight:700, color:cf.saldo>=0?T.green:T.red }}>{full(cf.saldo)}/Mo.</div>
          </div>
        </div>
      </div>

      {amount > 0 && (
        <>
          {/* Hauptverdikt */}
          <Verdict label={verdictLabel} sub={verdictSub} color={verdictColor} T={T} />

          {/* Details je nach Typ */}
          {type === "Einmalig" && (
            <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:13, marginBottom:10 }}>
              <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Finanzierungswege</div>
              <Row label="Aus Wachstum (Monate)" value={monthlyGrowthEUR > 0 ? (amount/monthlyGrowthEUR).toFixed(1)+" Mo." : "—"} type={amount <= annualGrowthEUR ? "in" : "warn"} T={T} />
              <Row label="Aus Sparrate ansparen" value={(cf.eff||0) > 0 ? Math.ceil(amount/cf.eff)+" Mo." : "—"} T={T} />
              <Row label="Cash vorhanden" value={fmtE(liquidCash)} type={liquidCash >= amount ? "in" : "out"} T={T} />
            </div>
          )}
          {(type === "Monatlich" || type === "Jährlich") && (
            <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:13, marginBottom:10 }}>
              <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Cashflow-Impact</div>
              <Row label="Kosten/Mo." value={full(monthly)} type="out" T={T} />
              <Row label="Wachstum/Mo." value={full(monthlyGrowthEUR)} type="in" T={T} />
              <Row label="Aktueller Saldo" value={full(cf.saldo||0)} type={cf.saldo >= 0 ? "in" : "out"} T={T} />
              <Row label="Saldo danach" value={full((cf.saldo||0) - monthly)} type={(cf.saldo||0) - monthly >= 0 ? "in" : "warn"} bold T={T} />
            </div>
          )}

          {/* Langfristiger Effekt */}
          <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:13, marginBottom:12 }}>
            <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Langfristiger Effekt ({s.horizon} J.)</div>
            <div style={{ fontSize:9, color:T.textDim, marginBottom:8 }}>Opportunitätskosten bei {agg.wavgReturn.toFixed(1)}% gew. Ø-Rendite</div>
            <Row label="Projektion ohne" value={fmtE(baseEnd)} T={T} />
            <Row label="Entgangenes Wachstum" value={"−"+fmtE(impact)} type="out" T={T} />
            <Row label="Projektion mit" value={fmtE(newEnd)} type={pctI < 5 ? "in" : "warn"} bold T={T} />
            <div style={{ marginTop:10 }}>
              <div style={{ background:T.border, borderRadius:5, overflow:"hidden", height:7, marginBottom:5 }}>
                <div style={{ height:"100%", background:pctI < 5 ? T.green : pctI < 20 ? T.amber : T.red, width:Math.max(2, 100-pctI)+"%", transition:"width 0.4s" }} />
              </div>
              <div style={{ fontSize:10, color:T.textLow, textAlign:"center" }}>Kostet {pctI.toFixed(1)}% des projizierten Endvermoegens</div>
            </div>
          </div>

          {lbl && (
            <Btn full color={T.purple} T={T} onClick={() => {
              updArr("buckets", [...(s.buckets||[]), { id:uid(), name:lbl, type, amount, year:String(CY), color:BCK_CLRS[0], note:"via Affordability" }]);
              setModal(null);
            }}>Als Ausgaben-Bucket speichern</Btn>
          )}
        </>
      )}
    </Sheet>
  );
}
