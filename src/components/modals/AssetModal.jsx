import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, full, uid } from "../ui.jsx";
import { ASSET_CLASSES, LIQUIDITY_CATS, LIQUIDITY_DEFAULT, LIQ_CLR, ASSET_TAX_TYPES, VALUATION_METHODS, IMMO_CF_GROSS, IMMO_HAUSGELD, IMMO_GRUNDSTEUER } from "../../constants.js";

export default function AssetModal({ data, s, T, setModal, updArr }) {
  const owners = s.owners || [];
  const defaultOwnership = owners[0] ? [{ ownerId: owners[0].id, share: 1.0 }] : [];

  const [f, setF] = useState(data || {
    name: "", ownership: defaultOwnership, class: "Aktien-ETF", liquidity: "Liquide",
    value: "", debt: "", locked: false, note: "",
    loanRate: "3.5", loanTilgung: "0", loanAnnuitat: "0",
    monthlyRent: "", hausgeld: "", grundsteuer: "",
    monthlyRepayment: "", monthlyRunningCost: "",
    valuationMethod: "market",
    tax: { acquisitionPrice: "", acquisitionDate: "", taxType: "abgeltung" },
    lifecycle: { maturity: "" },
    commitment: "", called: "", distributed: "",
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Inp label="Zinssatz %" value={f.loanRate} onChange={v => set({ loanRate: v })} type="number" T={T} />
            <Inp label="Tilgung/Mo." value={f.loanTilgung} onChange={v => set({ loanTilgung: v })} type="number" T={T} />
            <Inp label="Annuität/Mo." value={f.loanAnnuitat} onChange={v => set({ loanAnnuitat: v })} type="number" T={T} />
          </div>
          {(parseFloat(f.loanTilgung) || 0) > 0 && (parseFloat(f.debt) || 0) > 0 && (
            <div style={{ fontSize: 9, color: T.accent, marginTop: 4 }}>
              Schuldenfrei in ca. {Math.ceil((parseFloat(f.debt) || 0) / ((parseFloat(f.loanTilgung) || 1) * 12))} Jahren
            </div>
          )}
        </div>
      )}

      {/* Laufende Kosten */}
      {!isImmo && !isFord && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Inp label="Lfd. Kosten/Mo." value={f.monthlyRunningCost || ""} onChange={v => set({ monthlyRunningCost: v })} type="number" placeholder="0 (opt.)" T={T} />
          <div />
        </div>
      )}

      {/* Private Equity */}
      {isPE && (
        <div style={sectionBox}>
          <div style={sectionLabel}>Private Equity — Kapitalstruktur</div>
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
        <SelEl label="Steuertyp" value={f.tax?.taxType || "abgeltung"}
          onChange={v => set({ tax: { ...f.tax, taxType: v } })}
          options={ASSET_TAX_TYPES.map(t => ({ value: t.value, label: t.label }))} T={T} />
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

      <Btn full color={T.green} T={T} onClick={() => {
        const asset = {
          ...f,
          id: f.id || uid(),
          value: +f.value || 0,
          debt: +f.debt || 0,
          loanRate: +f.loanRate || 3.5,
          loanTilgung: +f.loanTilgung || 0,
          loanAnnuitat: +f.loanAnnuitat || 0,
          liquidity: f.liquidity || "Liquide",
          monthlyRent: +f.monthlyRent || 0,
          hausgeld: +f.hausgeld || 0,
          grundsteuer: +f.grundsteuer || 0,
          monthlyRepayment: +f.monthlyRepayment || 0,
          monthlyRunningCost: +f.monthlyRunningCost || 0,
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
