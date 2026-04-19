import { useState } from "react";
import { Sheet, Inp, Btn, full, uid } from "../ui.jsx";
import { CM, CY } from "../../constants.js";

export default function CheckinModal({ s, cf, T, setModal, updArr, cashflowProjection, initialYear }) {
  const defaultMonth = initialYear ? `${initialYear}-01` : CM;
  const existing = (s.checkins||[]).find(ci => ci.month === defaultMonth);

  const [f, setF] = useState(existing || {
    month:         defaultMonth,
    inc_ist:       "",
    streamExp_ist: String(Math.round(cf.streamExpense||0)),
    sparrate_ist:  String(Math.round(cf.eff||0)),
    immoNetCF_ist: "",
    reserven_ist:  "0",
    note:          "",
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  // Projected values for the selected month's year
  const year  = parseInt(f.month?.slice(0,4), 10);
  const projY = isNaN(year) ? 0 : Math.max(0, Math.min(year - CY, (cashflowProjection?.length||1) - 1));
  const proj  = cashflowProjection?.[projY] || {};
  const hasImmoProj = (proj.immoGross||0) > 0;

  const Delta = ({ ist, prj, invert }) => {
    if (!ist || ist === "") return null;
    const d = (+ist||0) - (prj||0);
    if (Math.abs(d) < 1) return null;
    const good = invert ? d <= 0 : d >= 0;
    return (
      <div style={{ fontSize:9, color:good ? T.green : T.red, marginTop:2 }}>
        {d > 0 ? "+" : ""}{full(d)} vs. Prognose
      </div>
    );
  };

  return (
    <Sheet title="Check-in erfassen" onClose={() => setModal(null)} T={T}>
      <Inp label="Monat" value={f.month} onChange={v => set("month", v)} type="month" T={T} />

      {/* Prognose-Referenz für das gewählte Jahr */}
      {proj.avail !== undefined && (
        <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:"10px 12px", marginBottom:14 }}>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
            Prognose {year}{proj.age ? ` · Alter ${proj.age}` : ""}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            <div>
              <div style={{ fontSize:8, color:T.textDim, marginBottom:2 }}>Einnahmen</div>
              <div style={{ fontSize:14, fontWeight:800, color:T.green }}>{full(proj.avail||0)}</div>
              <div style={{ fontSize:8, color:T.textDim }}>pro Monat</div>
            </div>
            <div>
              <div style={{ fontSize:8, color:T.textDim, marginBottom:2 }}>Ausgaben</div>
              <div style={{ fontSize:14, fontWeight:800, color:T.red }}>{full(proj.bound||0)}</div>
              <div style={{ fontSize:8, color:T.textDim }}>pro Monat</div>
            </div>
            <div>
              <div style={{ fontSize:8, color:T.textDim, marginBottom:2 }}>Sparrate</div>
              <div style={{ fontSize:14, fontWeight:800, color:T.accent }}>{full(proj.sp||0)}</div>
              <div style={{ fontSize:8, color:T.textDim }}>pro Monat</div>
            </div>
          </div>
          {(proj.immoNetCF||0) !== 0 && (
            <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid "+T.border, display:"flex", gap:16 }}>
              <div>
                <div style={{ fontSize:8, color:T.textDim }}>Immo-CF</div>
                <div style={{ fontSize:12, fontWeight:700, color:(proj.immoNetCF||0)>=0?T.green:T.red }}>{full(proj.immoNetCF||0)}</div>
              </div>
              {(proj.otherAnnu||0) > 0 && (
                <div>
                  <div style={{ fontSize:8, color:T.textDim }}>Kreditraten</div>
                  <div style={{ fontSize:12, fontWeight:700, color:T.red }}>{full(proj.otherAnnu||0)}</div>
                </div>
              )}
              {(proj.assetYield||0) > 0 && (
                <div>
                  <div style={{ fontSize:8, color:T.textDim }}>Kapitalerträge</div>
                  <div style={{ fontSize:12, fontWeight:700, color:T.green }}>{full(proj.assetYield||0)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>IST-Werte erfassen</div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:4 }}>
        <div>
          <Inp label="Einnahmen IST (€/Mo.)" value={f.inc_ist} onChange={v => set("inc_ist", v)}
            type="number" placeholder={String(Math.round(proj.avail||cf.avail||0))} T={T} />
          <Delta ist={f.inc_ist} prj={proj.avail||cf.avail} />
        </div>
        <div>
          <Inp label="Ausgaben IST (€/Mo.)" value={f.streamExp_ist} onChange={v => set("streamExp_ist", v)}
            type="number" placeholder={String(Math.round(proj.bound||cf.streamExpense||0))} T={T} />
          <Delta ist={f.streamExp_ist} prj={proj.bound||cf.streamExpense} invert />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:4 }}>
        <div>
          <Inp label="Sparrate IST (€/Mo.)" value={f.sparrate_ist} onChange={v => set("sparrate_ist", v)}
            type="number" placeholder={String(Math.round(proj.sp||cf.eff||0))} T={T} />
          <Delta ist={f.sparrate_ist} prj={proj.sp||cf.eff} />
        </div>
        {hasImmoProj && (
          <div>
            <Inp label="Immo-CF IST (€/Mo.)" value={f.immoNetCF_ist} onChange={v => set("immoNetCF_ist", v)}
              type="number" placeholder={String(Math.round(proj.immoNetCF||0))} T={T} />
            <Delta ist={f.immoNetCF_ist} prj={proj.immoNetCF} />
          </div>
        )}
      </div>

      <Inp label="Reserven / Einmalentnahmen (€)" value={f.reserven_ist}
        onChange={v => set("reserven_ist", v)} type="number" T={T} />
      <Inp label="Notiz" value={f.note} onChange={v => set("note", v)}
        placeholder="Besonderheiten, Einmaleffekte, Abweichungen..." T={T} />

      <Btn full color={T.green} T={T} onClick={() => {
        const ci = {
          id: (s.checkins||[]).find(c => c.month === f.month)?.id || uid(),
          ...f,
          inc_ist:       f.inc_ist       !== "" ? +f.inc_ist       : null,
          streamExp_ist: +f.streamExp_ist || 0,
          sparrate_ist:  +f.sparrate_ist  || 0,
          immoNetCF_ist: f.immoNetCF_ist !== "" ? +f.immoNetCF_ist : null,
          reserven_ist:  +f.reserven_ist  || 0,
          ausgaben_ist:  +f.streamExp_ist || 0, // backwards compat
        };
        updArr("checkins", [...(s.checkins||[]).filter(c => c.month !== f.month), ci]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
