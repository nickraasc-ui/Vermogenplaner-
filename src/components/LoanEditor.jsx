// Loan input shared by the asset dialog (Immobilie, Lombard …) and the standalone loan dialog.
// The form keeps raw input strings; resolveLoanForm turns them into the stored fields.
import { useState } from "react";
import { Inp, full, fmtNum } from "./ui.jsx";
import { LOAN_TYPES, CY } from "../constants.js";
import { LOAN_INPUT_MODES, resolveLoanForm, loanSchedule, yearsUntilRepaid, totalInterest, tilgungPctFromPayment, inputModeOf } from "../model/loan.js";

const MAX_PLAN_ROWS = 40;

/** Form fields for an existing loan record (or empty defaults). */
export const loanFormOf = (l = {}) => ({
  loanType: l.loanType || "annuitat",
  loanRate: l.loanRate ?? "",
  loanInputMode: inputModeOf(l),
  loanAnnuitat: (l.manualAnnuitat || 0) > 0 ? l.manualAnnuitat : (l.loanAnnuitat || ""),
  loanTilgungPct: l.loanTilgungPct ?? "",
  loanTermYears: l.loanTermYears || "",
  loanFixedUntil: l.loanFixedUntil || "",
  loanFollowUpRate: l.loanFollowUpRate ?? "",
  loanSpecialPerYear: l.loanSpecialPerYear || "",
});

function Pills({ options, value, onChange, T }) {
  return (
    <div style={{ display:"flex", gap:6, marginBottom:12 }}>
      {options.map(o => {
        const on = value === o.value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            style={{ flex:1, padding:"9px 4px", borderRadius:999, border:"none", background:on ? T.accent : T.field,
              color:on ? T.onAccent : T.text, cursor:"pointer", fontSize:13, fontWeight:600, WebkitTapHighlightColor:"transparent" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Fact({ label, value, sub, color, T }) {
  return (
    <div style={{ background:T.field, borderRadius:12, padding:"10px 11px", minWidth:0 }}>
      <div style={{ fontSize:12, color:T.textLow, marginBottom:3 }}>{label}</div>
      <div className="vp-num" style={{ fontSize:15, fontWeight:700, color:color || T.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.textLow, marginTop:2 }}>{sub}</div>}
    </div>
  );
}

/**
 * @param {object} f     form state incl. debt
 * @param {(patch:object)=>void} set
 */
export default function LoanEditor({ f, set, T }) {
  const [showPlan, setShowPlan] = useState(false);
  const loan = resolveLoanForm(f);
  const endfaellig = loan.loanType === "endfaellig";
  const mode = f.loanInputMode || "rate";
  const sched = loanSchedule(loan);
  const yrs = yearsUntilRepaid(loan);
  const interestNow = loan.debt * loan.loanRate / 1200;
  const coversInterest = endfaellig || loan.loanAnnuitat > interestNow + 0.005;
  const hasPayment = loan.debt > 0 && loan.loanAnnuitat > 0;
  const tilgPct = tilgungPctFromPayment(loan.debt, loan.loanRate, loan.loanAnnuitat);
  const fixedYear = loan.loanFixedUntil && loan.loanFixedUntil >= CY ? loan.loanFixedUntil : null;
  const followSet = loan.loanFollowUpRate !== null;

  // Switching the input mode keeps the current payment: prefill the new field from it
  const switchMode = (v) => {
    const patch = { loanInputMode: v };
    if (hasPayment && coversInterest) {
      if (v === "rate") patch.loanAnnuitat = String(Math.round(loan.loanAnnuitat * 100) / 100);
      if (v === "tilgung") patch.loanTilgungPct = String(Math.round(tilgPct * 100) / 100);
      if (v === "laufzeit" && yrs) patch.loanTermYears = String(yrs);
    }
    set(patch);
  };

  const modeInput = endfaellig
    ? <Inp label="Fällig in (Jahren)" value={f.loanTermYears} onChange={v => set({ loanTermYears: v })} type="number" placeholder="z. B. 10" T={T} />
    : mode === "tilgung"
      ? <Inp label="Anfängliche Tilgung % p.a." value={f.loanTilgungPct} onChange={v => set({ loanTilgungPct: v })} type="number" placeholder="z. B. 2" T={T} />
      : mode === "laufzeit"
        ? <Inp label="Schuldenfrei in (Jahren)" value={f.loanTermYears} onChange={v => set({ loanTermYears: v })} type="number" placeholder="z. B. 20" T={T} />
        : <Inp label="Monatliche Rate (€)" value={f.loanAnnuitat} onChange={v => set({ loanAnnuitat: v })} type="number" placeholder="z. B. 1.200" T={T} />;

  const planRows = sched.years.slice(0, MAX_PLAN_ROWS);
  const cell = { padding:"6px 4px", textAlign:"right", whiteSpace:"nowrap" };

  return (
    <div>
      <Pills T={T} value={loan.loanType} options={LOAN_TYPES}
        onChange={v => set(v === "volltilger" ? { loanType: v, loanInputMode: "laufzeit" } : { loanType: v })} />
      <div style={{ fontSize:13, color:T.textLow, marginTop:-4, marginBottom:12 }}>
        {LOAN_TYPES.find(l => l.value === loan.loanType)?.desc}
      </div>

      {!endfaellig && (
        <>
          <div style={{ fontSize:13, color:T.textMid, marginBottom:6 }}>Was weißt du über die Rate?</div>
          <Pills T={T} value={mode} options={LOAN_INPUT_MODES} onChange={switchMode} />
        </>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label="Zinssatz % p.a." value={f.loanRate} onChange={v => set({ loanRate: v })} type="number" placeholder="z. B. 3,5" T={T} />
        {modeInput}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label="Zinsbindung bis" value={f.loanFixedUntil} onChange={v => set({ loanFixedUntil: v })} type="number" placeholder={"z. B. " + (CY + 5)} T={T} />
        <Inp label="Anschlusszins %" value={f.loanFollowUpRate} onChange={v => set({ loanFollowUpRate: v })} type="number" placeholder="leer = gleich" T={T} />
      </div>
      <div style={{ fontSize:12, color:T.textLow, marginTop:-6, marginBottom:12 }}>
        Jahr, in dem die Zinsbindung endet, und deine Annahme für den Zins danach.
      </div>
      {!endfaellig && (
        <Inp label="Sondertilgung pro Jahr (€, opt.)" value={f.loanSpecialPerYear} onChange={v => set({ loanSpecialPerYear: v })} type="number" placeholder="0" T={T} />
      )}

      {loan.debt > 0 && !coversInterest && loan.loanRate > 0 && (
        <div role="alert" style={{ fontSize:13, color:T.red, marginBottom:10 }}>
          Die Rate deckt nicht einmal die Zinsen ({full(interestNow)}/Mo.) — so wird das Darlehen nie getilgt.
        </div>
      )}

      {hasPayment && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <Fact T={T} label={endfaellig ? "Zinsen/Mo." : "Rate/Mo."} value={full(loan.loanAnnuitat)}
            sub={endfaellig ? null : "davon Zinsen " + full(interestNow)} />
          {endfaellig
            ? <Fact T={T} label="Rückzahlung" value={loan.loanTermYears ? String(CY + loan.loanTermYears - 1) : "offen"}
                sub={loan.loanTermYears ? full(sched.years.reduce((t, r) => t + r.balloon, 0)) + " aus dem Depot" : "Laufzeit eintragen"} color={T.amber} />
            : <Fact T={T} label="Anfängliche Tilgung" value={fmtNum(Math.max(0, tilgPct), 2) + " % p.a."}
                sub={full(Math.max(0, loan.loanAnnuitat - interestNow)) + "/Mo."} color={T.green} />}
          {!endfaellig && (
            <Fact T={T} label="Letzte Rate" value={yrs ? String(CY + yrs - 1) : "nie"}
              sub={yrs ? "in " + yrs + (yrs === 1 ? " Jahr" : " Jahren") : null} color={yrs ? T.green : T.red} />
          )}
          <Fact T={T} label="Zinsen gesamt" value={full(totalInterest(loan))} sub={yrs ? null : "über 100 Jahre"} />
          {fixedYear && (
            <Fact T={T} label={"Restschuld Ende " + fixedYear} value={full(sched.debtAtFixEnd ?? 0)} sub="Ende Zinsbindung" />
          )}
          {fixedYear && followSet && (sched.debtAtFixEnd || 0) > 0 && (
            <Fact T={T} label={"Rate ab " + (fixedYear + 1)}
              value={full(endfaellig ? (sched.debtAtFixEnd || 0) * loan.loanFollowUpRate / 1200 : (sched.followPayment || 0))}
              sub={"bei " + fmtNum(loan.loanFollowUpRate, 2) + " % Anschlusszins"} color={T.amber} />
          )}
        </div>
      )}
      {hasPayment && fixedYear && followSet && !endfaellig && (sched.debtAtFixEnd || 0) > 0 && (
        <div style={{ fontSize:12, color:T.textLow, marginTop:8 }}>
          Annahme: Nach der Zinsbindung wird die Rate so angepasst, dass das Darlehen im selben Jahr abbezahlt ist wie geplant.
        </div>
      )}

      {hasPayment && (
        <button type="button" onClick={() => setShowPlan(v => !v)}
          style={{ marginTop:12, width:"100%", padding:"10px 14px", borderRadius:999, border:"none", background:T.field,
            color:T.text, fontWeight:600, fontSize:14, cursor:"pointer" }}>
          {showPlan ? "Tilgungsplan ausblenden" : "Tilgungsplan anzeigen"}
        </button>
      )}
      {hasPayment && showPlan && (
        <div style={{ marginTop:10, overflowX:"auto" }}>
          <table className="vp-num" style={{ width:"100%", borderCollapse:"collapse", fontSize:13, color:T.text }}>
            <thead>
              <tr style={{ color:T.textLow, fontSize:12 }}>
                <th style={{ ...cell, textAlign:"left", fontWeight:500 }}>Jahr</th>
                <th style={{ ...cell, fontWeight:500 }}>Zinsen</th>
                <th style={{ ...cell, fontWeight:500 }}>Tilgung</th>
                <th style={{ ...cell, fontWeight:500 }}>Restschuld</th>
              </tr>
            </thead>
            <tbody>
              {planRows.map((r, i) => {
                const rateChange = i > 0 && r.rate !== planRows[i - 1].rate;
                return (
                  <tr key={r.year} style={{ borderTop:"1px solid " + (rateChange ? T.amber : T.border) }}>
                    <td style={{ ...cell, textAlign:"left" }}>
                      {r.year}
                      {rateChange && <div style={{ fontSize:11, color:T.amber }}>{fmtNum(r.rate, 2)} %</div>}
                    </td>
                    <td style={{ ...cell, color:T.red }}>{fmtNum(r.interest, 0)}</td>
                    <td style={{ ...cell, color:T.green }}>
                      {fmtNum(r.principal + r.special + r.balloon, 0)}
                      {(r.special > 0 || r.balloon > 0) && <div style={{ fontSize:11, color:T.textLow }}>{r.balloon > 0 ? "Schlusszahlung" : "inkl. " + fmtNum(r.special, 0) + " Sonder"}</div>}
                    </td>
                    <td style={{ ...cell, fontWeight:600 }}>{fmtNum(r.endDebt, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontSize:12, color:T.textLow, marginTop:6 }}>
            Beträge in € pro Jahr.{sched.years.length > MAX_PLAN_ROWS ? " Gezeigt sind die ersten " + MAX_PLAN_ROWS + " Jahre." : ""}
          </div>
        </div>
      )}
    </div>
  );
}
