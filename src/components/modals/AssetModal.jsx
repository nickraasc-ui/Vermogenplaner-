import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, full, uid } from "../ui.jsx";
import { ASSET_CLASSES, LIQUIDITY_CATS, LIQUIDITY_DEFAULT, LIQ_CLR, ASSET_TAX_TYPES, VALUATION_METHODS, IMMO_CF_GROSS, IMMO_HAUSGELD, IMMO_GRUNDSTEUER, LOAN_TYPES } from "../../constants.js";

export default function AssetModal({ data, s, T, setModal, updArr }) {
  const owners = s.owners || [];
  const defaultOwnership = owners[0] ? [{ ownerId: owners[0].id, share: 1.0 }] : [];

  const [f, setF] = useState(() => {
    if (data) return { loanType: "annuitat", loanTermYears: data.loanTermYears || "", manualAnnuitat: "", ...data };
    return {
      name: "", ownership: defaultOwnership, class: "Aktien-ETF", liquidity: "Liquide",
      value: "", debt: "", locked: false, note: "",
      loanType: "annuitat", loanRate: "3.5", loanTermYears: "", manualAnnuitat: "",
      monthlyRent: "", hausgeld: "", grundsteuer: "",
      monthlyRepayment: "", monthlyRunningCost: "",
      yieldPct: "0",
      valuationMethod: "market",
      tax: { acquisitionPrice: "", acquisitionDate: "", taxType: "abgeltung" },
      lifecycle: { maturity: "" },
      commitment: "", called: "", distributed: "",
    };
  });
  const set = (patch) => setF(p => ({ ...p, ...patch }));
  const handleClassChange = (cls) => {
    const taxType = cls === "Immobilien" ? "immobilien" : (f.tax?.taxType || "abgeltung");
    set({ class: cls, liquidity: LIQUIDITY_DEFAULT[cls] || "Semi-liquide", tax: { ...f.tax, taxType } });
  };

  const ownership = f.ownership || [];
  const ownerShareTotal = ownership.reduce((s, o) => s + (o.share || 0), 0);
  const shareOk = ownership.length === 0 || Math.abs(ownerShareTotal - 1) < 0.01;

  const hasDebt = (parseFloat(f.debt) || 0) > 0;
  const isImmo  = f.class === "Immobilien";
  const isFord  = f.class === "Forderung";
  const isPE    = f.class === "Private Equity";
  const isBond  = f.class === "Anleihen" || f.class === "Anleihen-ETF";

  // Loan calculations (derived, not stored in state)
  const lDebt = parseFloat(f.debt) || 0;
  const lRate = parseFloat(f.loanRate) || 0;
  const lTerm = parseFloat(f.loanTermYears) || 0;
  const lMonthlyRate = lRate / 1200;
  const lMonths = lTerm * 12;
  const calcAnnuitat = (() => {
    if (!lDebt || !lMonthlyRate) return 0;
    if (f.loanType === "endfaellig") return lDebt * lMonthlyRate;
    if (!lMonths) return 0;
    const r = lMonthlyRate, n = lMonths;
    return lDebt * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1);
  })();
  const calcMonthlyInterest = lDebt * lMonthlyRate;
  const calcTilgung = f.loanType === "endfaellig" ? 0 : Math.max(0, calcAnnuitat - calcMonthlyInterest);
  const calcTilgungPct = lDebt > 0 ? calcTilgung * 12 / lDebt * 100 : 0;
  const calcTotalInterest = f.loanType === "endfaellig"
    ? calcMonthlyInterest * lMonths
    : lMonths > 0 ? calcAnnuitat * lMonths - lDebt : 0;

  const immoNetCF = isImmo
    ? (parseFloat(f.monthlyRent) || 0) - (parseFloat(f.hausgeld) || 0) - (parseFloat(f.grundsteuer) || 0) - (parseFloat(f.loanAnnuitat) || 0)
    : 0;
  const fordPrincipal = isFord && (parseFloat(f.monthlyRepayment) || 0) > 0 && (parseFloat(f.loanRate) || 0) > 0
    ? (parseFloat(f.monthlyRepayment) || 0) - (parseFloat(f.value) || 0) * (parseFloat(f.loanRate) || 0) / 1200
    : null;

  const stilleReserven = (parseFloat(f.value) || 0) - (parseFloat(f.tax?.acquisitionPrice) || 0);

  const rowStyle = { display: "flex", gap: 8, marginBottom: 8, alignItems: "center" };
  const nativeSelect = {
    flex: 2, background: T.surface, border: "1px solid " + T.border,
    borderRadius: 6, color: T.text, padding: "6px 8px", fontSize: 12,
  };
  const nativeInput = {
    flex: 1, background: T.surface, border: "1px solid " + T.border,
    borderRadius: 6, color: T.text, padding: "6px 8px", fontSize: 12, minWidth: 0,
  };
  const sectionBox = {
    background: T.surfaceHigh, border: "1px solid " + T.border,
    borderRadius: 8, padding: 12, marginBottom: 12,
  };
  const sectionLabel = {
    fontSize: 9, color: T.textMid, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
  };
  const addRowBtn = {
    background: "transparent", border: "1px solid " + T.border,
    borderRadius: 6, color: T.textMid, padding: "5px 12px",
    cursor: "pointer", fontSize: 11, width: "100%", marginTop: 4,
  };
  const removeBtn = {
    background: "transparent", border: "1px solid " + T.red,
    borderRadius: 5, color: T.red, padding: "4px 8px", cursor: "pointer", fontSize: 11,
  };

  return (
    <Sheet title={data?.id ? "Position bearbeiten" : "Position hinzufügen"} onClose={() => setModal(null)} T={T}>
      <Inp label="Bezeichnung" value={f.name} onChange={v => set({ name: v })} placeholder="z.B. MSCI World ETF" T={T} />

      {/* Eigentümer & Anteile */}
      <div style={sectionBox}>
        <div style={sectionLabel}>Eigentümer & Anteile</div>
        {ownership.map((own, i) => (
          <div key={i} style={rowStyle}>
            <select value={own.ownerId} onChange={e => {
              const next = [...ownership];
              next[i] = { ...next[i], ownerId: e.target.value };
              set({ ownership: next });
            }} style={nativeSelect}>
              {owners.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <input type="number" value={Math.round((own.share || 0) * 100)} min={0} max={100}
              onChange={e => {
                const next = [...ownership];
                next[i] = { ...next[i], share: (parseFloat(e.target.value) || 0) / 100 };
                set({ ownership: next });
              }} style={nativeInput} />
            <span style={{ fontSize: 10, color: T.textMid }}>%</span>
            <button style={removeBtn} onClick={() => set({ ownership: ownership.filter((_, j) => j !== i) })}>x</button>
          </div>
        ))}
        {!shareOk && (
          <div style={{ fontSize: 9, color: T.red, marginBottom: 6 }}>
            Anteile ergeben {Math.round(ownerShareTotal * 100)}% (Soll: 100%)
          </div>
        )}
        <button style={addRowBtn} onClick={() => set({ ownership: [...ownership, { ownerId: owners[0]?.id || "", share: 0 }] })}>
          + Eigentümer hinzufügen
        </button>
      </div>

      <SelEl label="Asset-Klasse" value={f.class} onChange={handleClassChange} options={ASSET_CLASSES} T={T} />
      <SelEl label="Bewertungsmethode" value={f.valuationMethod || "market"} onChange={v => set({ valuationMethod: v })}
        options={VALUATION_METHODS.map(m => ({ value: m.value, label: m.label }))} T={T} />

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {LIQUIDITY_CATS.map(l => (
          <div key={l} onClick={() => set({ liquidity: l })}
            style={{ flex: 1, padding: "7px 4px", borderRadius: 7, border: "2px solid " + (f.liquidity === l ? LIQ_CLR[l] : T.border), background: f.liquidity === l ? LIQ_CLR[l] + "18" : "transparent", cursor: "pointer", textAlign: "center" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: f.liquidity === l ? LIQ_CLR[l] : T.textLow }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Inp label={isFord ? "Ausstehend (EUR)" : "Marktwert (EUR)"} value={f.value} onChange={v => set({ value: v })} type="number" T={T} />
        {!isFord && <Inp label="Schulden (EUR)" value={f.debt || ""} onChange={v => set({ debt: v })} type="number" placeholder="0" T={T} />}
      </div>

      {/* Immobilien */}
      {isImmo && (
        <div style={sectionBox}>
          <div style={sectionLabel}>Mieteinnahmen & Nebenkosten</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Inp label="Kaltmiete/Mo." value={f.monthlyRent} onChange={v => set({ monthlyRent: v })} type="number" placeholder={String(IMMO_CF_GROSS)} T={T} />
            <Inp label="Hausgeld/Mo." value={f.hausgeld} onChange={v => set({ hausgeld: v })} type="number" placeholder={String(IMMO_HAUSGELD)} T={T} />
            <Inp label="Grundsteuer/Mo." value={f.grundsteuer} onChange={v => set({ grundsteuer: v })} type="number" placeholder={String(IMMO_GRUNDSTEUER)} T={T} />
          </div>
          <div style={{ fontSize: 9, color: immoNetCF >= 0 ? T.green : T.red, marginTop: 6 }}>
            Netto-CF vor Annuität: {full((parseFloat(f.monthlyRent) || 0) - (parseFloat(f.hausgeld) || 0) - (parseFloat(f.grundsteuer) || 0))}/Mo.
            {hasDebt && <span> | nach Annuität: {full(immoNetCF)}/Mo.</span>}
          </div>
        </div>
      )}

      {/* Forderung */}
      {isFord && (
        <div style={sectionBox}>
          <div style={sectionLabel}>Darlehensvergabe</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Inp label="Zinssatz %" value={f.loanRate} onChange={v => set({ loanRate: v })} type="number" T={T} />
            <Inp label="Rückzahlung/Mo." value={f.monthlyRepayment} onChange={v => set({ monthlyRepayment: v })} type="number" placeholder="0" T={T} />
          </div>
          {(parseFloat(f.monthlyRepayment) || 0) > 0 && (
            <div style={{ fontSize: 9, color: T.green, marginTop: 6 }}>
              Monatlicher Zufluss: {full(parseFloat(f.monthlyRepayment) || 0)}/Mo.
              {fordPrincipal !== null && fordPrincipal > 0 && <span style={{ color: T.textDim }}> ({full(fordPrincipal)}/Mo. Tilgung)</span>}
            </div>
          )}
        </div>
      )}

      {/* Darlehensdetails */}
      {hasDebt && !isFord && (
        <div style={sectionBox}>
          <div style={sectionLabel}>Darlehensdetails</div>
          {/* Loan type selector */}
          <div style={{ display:"flex", gap:5, marginBottom:12 }}>
            {LOAN_TYPES.map(lt => (
              <button key={lt.value} onClick={() => set({ loanType: lt.value })}
                style={{ flex:1, padding:"7px 4px", borderRadius:7, border:"1px solid "+(f.loanType===lt.value?T.accent:T.border),
                  background:f.loanType===lt.value?T.accent+"18":"transparent",
                  color:f.loanType===lt.value?T.accent:T.textMid,
                  cursor:"pointer", fontSize:10, fontWeight:700, textAlign:"center" }}>
                {lt.label}
              </button>
            ))}
          </div>
          {f.loanType && (
            <div style={{ fontSize:9, color:T.textDim, marginBottom:10 }}>
              {LOAN_TYPES.find(l=>l.value===f.loanType)?.desc}
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            <Inp label="Zinssatz % p.a." value={f.loanRate} onChange={v => set({ loanRate: v })} type="number" T={T} />
            <Inp label="Laufzeit (Jahre)" value={f.loanTermYears} onChange={v => set({ loanTermYears: v })} type="number" placeholder="z.B. 20" T={T} />
          </div>
          {f.loanType === "annuitat" && (
            <Inp label="Monatliche Rate manuell (€, opt.)" value={f.manualAnnuitat||""} onChange={v => set({ manualAnnuitat: v })} type="number"
              placeholder={calcAnnuitat > 0 ? String(Math.round(calcAnnuitat)) : "Auto-Berechnung"} T={T} />
          )}
          {/* Calculated results */}
          {(+f.manualAnnuitat || calcAnnuitat) > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginTop:4 }}>
              <div style={{ background:T.bg, borderRadius:6, padding:"7px 8px" }}>
                <div style={{ fontSize:8, color:T.textDim, marginBottom:2 }}>Annuität/Mo.{+f.manualAnnuitat > 0 ? " (manuell)" : ""}</div>
                <div style={{ fontSize:12, fontWeight:800, color:T.accent }}>{full(+f.manualAnnuitat || calcAnnuitat)}</div>
              </div>
              <div style={{ background:T.bg, borderRadius:6, padding:"7px 8px" }}>
                <div style={{ fontSize:8, color:T.textDim, marginBottom:2 }}>
                  {f.loanType==="endfaellig" ? "Zinsen/Mo." : "Tilgung/Mo."}
                </div>
                <div style={{ fontSize:12, fontWeight:800, color:f.loanType==="endfaellig"?T.red:T.green }}>
                  {f.loanType==="endfaellig" ? full(calcMonthlyInterest) : full(calcTilgung)}
                </div>
              </div>
              <div style={{ background:T.bg, borderRadius:6, padding:"7px 8px" }}>
                <div style={{ fontSize:8, color:T.textDim, marginBottom:2 }}>
                  {f.loanType==="endfaellig" ? "Gesamtzinsen" : "Tilgung % p.a."}
                </div>
                <div style={{ fontSize:12, fontWeight:800, color:T.textMid }}>
                  {f.loanType==="endfaellig" ? full(calcTotalInterest) : calcTilgungPct.toFixed(2)+"%"}
                </div>
              </div>
            </div>
          )}
          {f.loanType==="endfaellig" && lTerm > 0 && (
            <div style={{ fontSize:9, color:T.amber, marginTop:8 }}>
              Endfällig: Kapital {full(lDebt)} fällig in {lTerm} Jahren — Gesamtzinsaufwand {full(calcTotalInterest)}
            </div>
          )}
          {f.loanType!=="endfaellig" && calcTilgung > 0 && lTerm > 0 && (
            <div style={{ fontSize:9, color:T.green, marginTop:8 }}>
              Schuldenfrei in {lTerm} Jahren — Gesamtzinsaufwand {full(calcTotalInterest)}
            </div>
          )}
        </div>
      )}

      {/* Ausschüttungsrendite (Dividenden, Kupons) — nur für Finanzassets */}
      {!isImmo && !isFord && (
        <div style={{ background: T.surfaceHigh, border: "1px solid " + T.border, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: T.textMid, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Ausschüttungen / Cashflow</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Inp label="Ausschüttungsrendite %/J." value={f.yieldPct ?? "0"}
              onChange={v => set({ yieldPct: v })} type="number" placeholder="0 = thesaurierend" T={T} />
            <Inp label="Lfd. Kosten/Mo." value={f.monthlyRunningCost || ""} onChange={v => set({ monthlyRunningCost: v })} type="number" placeholder="0 (opt.)" T={T} />
          </div>
          {(parseFloat(f.yieldPct) || 0) > 0 && (parseFloat(f.value) || 0) > 0 && (() => {
            const monthly = (parseFloat(f.value) || 0) * (parseFloat(f.yieldPct) || 0) / 100 / 12;
            return (
              <div style={{ fontSize: 9, color: T.green, marginTop: 4 }}>
                Monatlicher Zufluss: {full(monthly)}/Mo. ({full(monthly * 12)}/J.)
                <span style={{ color: T.textDim }}> — fließt in Haushaltsrechnung</span>
              </div>
            );
          })()}
          {(parseFloat(f.yieldPct) || 0) === 0 && (
            <div style={{ fontSize: 9, color: T.textDim, marginTop: 4 }}>0% = thesaurierend / keine Ausschüttung</div>
          )}
        </div>
      )}

      {/* Private Equity */}
      {isPE && (
        <div style={{ ...sectionBox, opacity: 0.7 }}>
          <div style={{ ...sectionLabel, display:"flex", justifyContent:"space-between" }}>
            <span>Private Equity — Kapitalstruktur</span>
            <span style={{ fontSize:8, color:T.amber, fontWeight:700, textTransform:"none", letterSpacing:0 }}>Anzeige · nicht in Projektion</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Inp label="Commitment" value={f.commitment || ""} onChange={v => set({ commitment: v })} type="number" placeholder="0" T={T} />
            <Inp label="Abgerufen" value={f.called || ""} onChange={v => set({ called: v })} type="number" placeholder="0" T={T} />
            <Inp label="Ausgeschüttet" value={f.distributed || ""} onChange={v => set({ distributed: v })} type="number" placeholder="0" T={T} />
          </div>
          {(parseFloat(f.commitment) || 0) > 0 && (
            <div style={{ fontSize: 9, color: T.accent, marginTop: 6 }}>
              Noch nicht abgerufen: {full((parseFloat(f.commitment) || 0) - (parseFloat(f.called) || 0))}
              {(parseFloat(f.distributed) || 0) > 0 && <span style={{ color: T.green, marginLeft: 8 }}>Ausgeschüttet: {full(parseFloat(f.distributed) || 0)}</span>}
            </div>
          )}
        </div>
      )}

      {/* Lifecycle / Fälligkeit */}
      {(isBond || isPE) && (
        <Inp label="Fälligkeit / Laufzeitende" value={f.lifecycle?.maturity || ""}
          onChange={v => set({ lifecycle: { ...f.lifecycle, maturity: v || null } })}
          placeholder="YYYY-MM-DD (optional)" T={T} />
      )}

      {/* Steuerliche Basis */}
      <div style={sectionBox}>
        <div style={sectionLabel}>Steuerliche Basis</div>
        <SelEl label="Steuertyp (wirkt auf KeSt in Projektion & Haushalt)" value={f.tax?.taxType || "abgeltung"}
          onChange={v => set({ tax: { ...f.tax, taxType: v } })}
          options={ASSET_TAX_TYPES.map(t => ({ value: t.value, label: t.label }))} T={T} />
        {(() => {
          const KEST_BY_TYPE = { "abgeltung": null, "teileinkuenfte": 15.83, "immobilien": 0, "steuerfrei": 0 };
          const CLASS_KEST = { "Aktien":26.38,"Aktien-ETF":18.46,"Anleihen":26.38,"Anleihen-ETF":18.46,"Immobilien":0,"Cash":26.38,"Rohstoffe":26.38,"Krypto":26.38,"Private Equity":15.83,"Forderung":26.38,"Sonstiges":26.38 };
          const byType = KEST_BY_TYPE[f.tax?.taxType];
          const rate = byType !== null && byType !== undefined ? byType : (CLASS_KEST[f.class] ?? 26.38);
          const isOverride = byType !== null && byType !== undefined && byType !== CLASS_KEST[f.class];
          return (
            <div style={{ fontSize:9, color: rate===0 ? T.green : isOverride ? T.amber : T.textDim, marginBottom:8 }}>
              Effektive KeSt: <strong>{rate.toFixed(2)}%</strong>
              {isOverride && " (überschreibt Klassenstandard)"}
              {rate === 0 && " — keine Steuer auf Erträge und Zuwachs"}
            </div>
          );
        })()}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Inp label="Anschaffungspreis" value={f.tax?.acquisitionPrice || ""}
            onChange={v => set({ tax: { ...f.tax, acquisitionPrice: v } })} type="number" placeholder="0" T={T} />
          <Inp label="Anschaffungsdatum" value={f.tax?.acquisitionDate || ""}
            onChange={v => set({ tax: { ...f.tax, acquisitionDate: v } })} placeholder="JJJJ-MM-TT" T={T} />
        </div>
        {(parseFloat(f.value) || 0) > 0 && (parseFloat(f.tax?.acquisitionPrice) || 0) > 0 && (
          <div style={{ fontSize: 9, color: stilleReserven >= 0 ? T.green : T.red, marginTop: 4 }}>
            Stille Reserven: {full(stilleReserven)} ({stilleReserven >= 0 ? "+" : ""}{(stilleReserven / (parseFloat(f.tax?.acquisitionPrice) || 1) * 100).toFixed(1)}%)
          </div>
        )}
      </div>

      <Inp label="Notiz" value={f.note} onChange={v => set({ note: v })} placeholder="Optional" T={T} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: T.surfaceHigh, borderRadius: 8, border: "1px solid " + T.border }}>
        <input type="checkbox" checked={!!f.locked} onChange={e => set({ locked: e.target.checked })} id="lck" style={{ accentColor: T.amber, width: 18, height: 18 }} />
        <label htmlFor="lck" style={{ fontSize: 13, color: T.textMid, cursor: "pointer" }}>Gesperrt / unumschichtbar</label>
      </div>
      {f.class === "Cash" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: T.surfaceHigh, borderRadius: 8, border: "1px solid " + (f.isHaushaltsPuffer ? T.green : T.border) }}>
          <input type="checkbox" checked={!!f.isHaushaltsPuffer} onChange={e => set({ isHaushaltsPuffer: e.target.checked })} id="puf" style={{ accentColor: T.green, width: 18, height: 18 }} />
          <div>
            <label htmlFor="puf" style={{ fontSize: 13, color: T.textMid, cursor: "pointer" }}>Als Haushaltspuffer verwenden</label>
            <div style={{ fontSize: 9, color: T.textDim, marginTop: 1 }}>Negative Haushaltssalden werden zuerst aus diesem Konto gedeckt</div>
          </div>
        </div>
      )}

      <Btn full color={T.green} T={T} onClick={() => {
        const saveDebt = +f.debt || 0;
        const saveRate = +f.loanRate || 0;
        const saveTerm = +f.loanTermYears || 0;
        const saveType = f.loanType || "annuitat";
        const saveMonthlyRate = saveRate / 1200;
        const saveMonths = saveTerm * 12;
        const calcedAnnuitat = (() => {
          if (!saveDebt || !saveMonthlyRate) return 0;
          if (saveType === "endfaellig") return saveDebt * saveMonthlyRate;
          if (!saveMonths) return 0;
          const r = saveMonthlyRate, n = saveMonths;
          return saveDebt * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1);
        })();
        const savedAnnuitat = (saveType === "annuitat" && +f.manualAnnuitat > 0) ? +f.manualAnnuitat : calcedAnnuitat;
        const savedMonthlyInterest = saveDebt * saveMonthlyRate;
        const savedTilgung = saveType === "endfaellig" ? 0 : Math.max(0, savedAnnuitat - savedMonthlyInterest);

        const asset = {
          ...f,
          id: f.id || uid(),
          value: +f.value || 0,
          debt: saveDebt,
          loanType: saveType,
          loanRate: saveRate || 3.5,
          loanTermYears: saveTerm,
          loanTilgung: savedTilgung,
          loanAnnuitat: savedAnnuitat,
          liquidity: f.liquidity || "Liquide",
          monthlyRent: +f.monthlyRent || 0,
          hausgeld: +f.hausgeld || 0,
          grundsteuer: +f.grundsteuer || 0,
          monthlyRepayment: +f.monthlyRepayment || 0,
          monthlyRunningCost: +f.monthlyRunningCost || 0,
          yieldPct: +f.yieldPct || 0,
          ownership: f.ownership || [],
          valuationMethod: f.valuationMethod || "market",
          tax: {
            acquisitionPrice: +(f.tax?.acquisitionPrice) || 0,
            acquisitionDate: f.tax?.acquisitionDate || "",
            taxType: f.tax?.taxType || "abgeltung",
          },
          lifecycle: { maturity: f.lifecycle?.maturity || null },
          commitment: +f.commitment || 0,
          called: +f.called || 0,
          distributed: +f.distributed || 0,
        };
        delete asset.owner;
        if (data?.id) updArr("assets", s.assets.map(a => a.id === asset.id ? asset : a));
        else updArr("assets", [...s.assets, asset]);
        setModal(null);
      }}>Speichern</Btn>
    </Sheet>
  );
}
