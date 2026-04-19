import { useState } from "react";
import { Sheet, Inp, SelEl, Btn, uid } from "../ui.jsx";
import { OWNER_TYPES, MARITAL_PROPERTY_OPTIONS } from "../../constants.js";

export default function OwnerModal({ s, T, setModal, upd }) {
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Person");
  const [expanded, setExpanded] = useState(null);
  const owners = s.owners || [];

  const addOwner = () => {
    const label = newName.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || uid();
    if (owners.some(o => o.id === id)) return;
    const isEntity = newType !== "Person";
    const tax = isEntity
      ? { personalTaxRate: 30, churchTax: false, sparerpauschbetrag: 0, zusammenveranlagung: false }
      : { personalTaxRate: 42, churchTax: false, sparerpauschbetrag: 1000, zusammenveranlagung: true };
    upd({ owners: [...owners, { id, label, type: newType, ownedBy: [], tax }] });
    setNewName("");
  };

  const removeOwner = (ownerId) => {
    const inUse = (s.assets || []).some(a => (a.ownership || []).some(o => o.ownerId === ownerId));
    if (inUse) return;
    upd({ owners: owners.filter(o => o.id !== ownerId) });
  };

  const updOwner = (ownerId, patch) => {
    upd({ owners: owners.map(o => o.id === ownerId ? { ...o, ...patch } : o) });
  };

  const sectionBox = { background: T.surfaceHigh, border: "1px solid " + T.border, borderRadius: 8, padding: 12, marginBottom: 14 };
  const sectionLabel = { fontSize: 9, color: T.textMid, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 };
  const nativeSelect = { flex: 2, background: T.surface, border: "1px solid " + T.border, borderRadius: 6, color: T.text, padding: "6px 8px", fontSize: 12 };
  const nativeInput = { flex: 1, background: T.surface, border: "1px solid " + T.border, borderRadius: 6, color: T.text, padding: "6px 8px", fontSize: 12, minWidth: 0 };
  const removeBtn = { background: "transparent", border: "1px solid " + T.red, borderRadius: 5, color: T.red, padding: "4px 8px", cursor: "pointer", fontSize: 11 };
  const addRowBtn = { background: "transparent", border: "1px solid " + T.border, borderRadius: 6, color: T.textMid, padding: "5px 12px", cursor: "pointer", fontSize: 11, width: "100%", marginTop: 4 };

  return (
    <Sheet title="Eigentümer verwalten" onClose={() => setModal(null)} T={T}>

      {/* Profile-level: Güterstand & Veranlagung */}
      <div style={{ ...sectionBox, opacity: 0.6 }}>
        <div style={{ ...sectionLabel, display:"flex", justifyContent:"space-between" }}>
          <span>Familienrecht & Steuerveranlagung</span>
          <span style={{ fontSize:8, color:T.amber, fontWeight:700, textTransform:"none", letterSpacing:0 }}>Gespeichert · noch nicht in Rechnung aktiv</span>
        </div>
        <SelEl label="Güterstand" value={s.maritalProperty || "zugewinn"} onChange={v => upd({ maritalProperty: v })}
          options={MARITAL_PROPERTY_OPTIONS.map(m => ({ value: m.value, label: m.label }))} T={T} />
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          {[{ v: "gemeinsam", l: "Zusammenveranlagung" }, { v: "getrennt", l: "Getrennte Veranlagung" }].map(({ v, l }) => {
            const active = (s.taxFiling || "gemeinsam") === v;
            return (
              <div key={v} onClick={() => upd({ taxFiling: v })}
                style={{ flex: 1, padding: "7px 6px", borderRadius: 7, border: "2px solid " + (active ? T.accent : T.border), background: active ? T.accent + "18" : "transparent", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: active ? T.accent : T.textLow }}>{l}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Owner list */}
      {owners.map(o => {
        const assetCount = (s.assets || []).filter(a => (a.ownership || []).some(own => own.ownerId === o.id)).length;
        const inUse = assetCount > 0;
        const isExpanded = expanded === o.id;
        const isEntity = o.type !== "Person";
        const otherOwners = owners.filter(x => x.id !== o.id);

        return (
          <div key={o.id} style={{ background: T.surfaceHigh, border: "1px solid " + T.border, borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              onClick={() => setExpanded(isExpanded ? null : o.id)}>
              <div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{o.label}</span>
                  <span style={{ fontSize: 8, color: T.textDim, background: T.surface, padding: "1px 5px", borderRadius: 3 }}>{o.type || "Person"}</span>
                </div>
                <div style={{ fontSize: 9, color: T.textDim, marginTop: 1 }}>
                  {inUse ? assetCount + " Position(en)" : "Keine Positionen"} {isExpanded ? "▲" : "▼"}
                </div>
              </div>
              {!inUse && (
                <Btn sm danger T={T} onClick={e => { e.stopPropagation(); removeOwner(o.id); }}>x</Btn>
              )}
            </div>

            {isExpanded && (
              <div style={{ marginTop: 12, borderTop: "1px solid " + T.border, paddingTop: 12 }}>
                <SelEl label="Typ" value={o.type || "Person"} onChange={v => updOwner(o.id, { type: v })}
                  options={OWNER_TYPES} T={T} />

                {/* Steuerprofil */}
                <div style={{ marginBottom: 12, opacity: 0.6 }}>
                  <div style={{ fontSize: 9, color: T.textMid, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Steuerprofil</div>
                  <div style={{ fontSize:9, color:T.amber, marginBottom:8 }}>Gespeichert · noch nicht in Berechnungen aktiv</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <Inp label="Grenzsteuersatz %" value={o.tax?.personalTaxRate ?? 42}
                      onChange={v => updOwner(o.id, { tax: { ...o.tax, personalTaxRate: +v || 0 } })} type="number" T={T} />
                    <Inp label="Sparerpauschbetrag" value={o.tax?.sparerpauschbetrag ?? 1000}
                      onChange={v => updOwner(o.id, { tax: { ...o.tax, sparerpauschbetrag: +v || 0 } })} type="number" T={T} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: T.surface, borderRadius: 7, border: "1px solid " + T.border }}>
                    <input type="checkbox" checked={!!o.tax?.churchTax}
                      onChange={e => updOwner(o.id, { tax: { ...o.tax, churchTax: e.target.checked } })}
                      id={"ch_" + o.id} style={{ accentColor: T.amber, width: 16, height: 16 }} />
                    <label htmlFor={"ch_" + o.id} style={{ fontSize: 12, color: T.textMid, cursor: "pointer" }}>Kirchensteuer</label>
                  </div>
                </div>

                {/* Gesellschafter (für Entities) */}
                {isEntity && (
                  <div>
                    <div style={{ fontSize: 9, color: T.textMid, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Gesellschafter</div>
                    {(o.ownedBy || []).map((ob, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                        <select value={ob.ownerId} onChange={e => {
                          const ownedBy = [...(o.ownedBy || [])];
                          ownedBy[i] = { ...ownedBy[i], ownerId: e.target.value };
                          updOwner(o.id, { ownedBy });
                        }} style={nativeSelect}>
                          {otherOwners.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                        </select>
                        <input type="number" value={Math.round((ob.share || 0) * 100)} min={0} max={100}
                          onChange={e => {
                            const ownedBy = [...(o.ownedBy || [])];
                            ownedBy[i] = { ...ownedBy[i], share: (parseFloat(e.target.value) || 0) / 100 };
                            updOwner(o.id, { ownedBy });
                          }} style={nativeInput} />
                        <span style={{ fontSize: 10, color: T.textMid }}>%</span>
                        <button style={removeBtn} onClick={() => updOwner(o.id, { ownedBy: (o.ownedBy || []).filter((_, j) => j !== i) })}>x</button>
                      </div>
                    ))}
                    <button style={addRowBtn}
                      onClick={() => updOwner(o.id, { ownedBy: [...(o.ownedBy || []), { ownerId: otherOwners[0]?.id || "", share: 0 }] })}>
                      + Gesellschafter hinzufügen
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Neuer Eigentümer */}
      <div style={{ ...sectionBox, marginTop: 6 }}>
        <div style={sectionLabel}>Neuer Eigentümer</div>
        <Inp label="" value={newName} onChange={setNewName} placeholder="z.B. Kind 1 oder Holding GmbH" T={T} />
        <SelEl label="Typ" value={newType} onChange={setNewType} options={OWNER_TYPES} T={T} />
        <Btn full color={T.green} T={T} onClick={addOwner}>Hinzufügen</Btn>
      </div>
    </Sheet>
  );
}
