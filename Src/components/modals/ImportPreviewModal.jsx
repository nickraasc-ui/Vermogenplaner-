import { useState } from "react";
import { fmtE } from "../ui.jsx";

const rng = () => Math.random().toString(36).slice(2, 9);

export default function ImportPreviewModal({ preview, s, T, setModal, updArr }) {
  const [selection, setSelection] = useState(() =>
    Object.fromEntries(preview.map((p, i) => [i, true]))
  );

  const toggle = (i) => setSelection(prev => ({ ...prev, [i]: !prev[i] }));

  const apply = () => {
    let assets = [...s.assets];
    preview.forEach((p, i) => {
      if (!selection[i]) return;
      const { imported, matched, action } = p;
      if (action === "update" && matched) {
        assets = assets.map(a => a.id === matched.id
          ? { ...a, value: imported.value, debt: imported.debt, yieldPct: imported.yieldPct, liquidity: imported.liquidity || a.liquidity, note: imported.note || a.note, ...(imported.ownership?.length ? { ownership: imported.ownership } : {}) }
          : a
        );
      } else if (action === "create") {
        assets.push({ id: rng(), name: imported.name, class: imported.class, value: imported.value, debt: imported.debt, yieldPct: imported.yieldPct || 0, liquidity: imported.liquidity || "Semi-liquide", note: imported.note || "", ownership: imported.ownership?.length ? imported.ownership : [], locked: false, valuationMethod: "market", commitment: 0, called: 0, distributed: 0, loanRate: 3.5, loanTilgung: 0, loanAnnuitat: 0, monthlyRepayment: 0, monthlyRunningCost: 0, tax: { acquisitionPrice: 0, acquisitionDate: "", taxType: "abgeltung" }, lifecycle: { maturity: null } });
      }
    });
    updArr("assets", assets);
    setModal(null);
  };

  const selectedCount = Object.values(selection).filter(Boolean).length;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"flex-end" }}
      onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:"18px 18px 0 0", padding:"0 0 env(safe-area-inset-bottom,16px)", width:"100%", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ padding:"12px 20px 0" }}>
          <div style={{ width:36, height:4, background:T.border, borderRadius:2, margin:"0 auto 16px" }} />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <div style={{ fontWeight:900, fontSize:15, color:T.text }}>Import-Vorschau</div>
            <button onClick={() => setModal(null)} style={{ background:"none", border:"none", color:T.textMid, cursor:"pointer", fontSize:22, lineHeight:1 }}>×</button>
          </div>
          <div style={{ fontSize:10, color:T.textDim, marginBottom:16 }}>{preview.length} Positionen erkannt — wähle aus, was übernommen werden soll.</div>
        </div>
        <div style={{ padding:"0 20px 24px" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
            {preview.map((p, i) => {
              const { imported, matched, action } = p;
              const isUpdate = action === "update";
              const valChange = isUpdate && matched ? imported.value - (matched.value || 0) : null;
              const selected = selection[i];
              return (
                <div key={i}
                  onClick={() => toggle(i)}
                  style={{ background: selected ? T.surfaceHigh : T.bg, border:"1px solid "+(selected ? (isUpdate ? T.amber : T.green)+"44" : T.border), borderRadius:10, padding:"10px 12px", cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:T.text }}>{imported.name}</div>
                        <span style={{ fontSize:8, padding:"1px 6px", borderRadius:3, background:(isUpdate?T.amber:T.green)+"18", color:isUpdate?T.amber:T.green, fontWeight:700 }}>
                          {isUpdate ? "AKTUALISIEREN" : "NEU"}
                        </span>
                      </div>
                      <div style={{ fontSize:9, color:T.textDim, marginTop:2 }}>{imported.class}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:12, fontWeight:800, color:T.text }}>{fmtE(imported.value)}</div>
                      {isUpdate && matched && (
                        <div style={{ fontSize:9, color: valChange > 0 ? T.green : valChange < 0 ? T.red : T.textDim }}>
                          {valChange > 0 ? "+" : ""}{fmtE(valChange)} vs. aktuell
                        </div>
                      )}
                      {(imported.debt || 0) > 0 && (
                        <div style={{ fontSize:9, color:T.red }}>Schulden {fmtE(imported.debt)}</div>
                      )}
                    </div>
                  </div>
                  {!selected && (
                    <div style={{ fontSize:8, color:T.textDim, marginTop:4 }}>Abgewählt — wird übersprungen</div>
                  )}
                </div>
              );
            })}
          </div>

          {preview.length === 0 && (
            <div style={{ textAlign:"center", padding:"20px 0", color:T.textDim, fontSize:12 }}>
              Keine gültigen Positionen in der Datei gefunden.
            </div>
          )}

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setModal(null)}
              style={{ flex:1, padding:"12px", borderRadius:8, border:"1px solid "+T.border, background:"transparent", color:T.textMid, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
              Abbrechen
            </button>
            <button onClick={apply} disabled={selectedCount === 0}
              style={{ flex:2, padding:"12px", borderRadius:8, border:"1px solid "+T.green+"44", background:T.green+"15", color:T.green, cursor: selectedCount===0?"not-allowed":"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", opacity: selectedCount===0 ? 0.5 : 1 }}>
              {selectedCount} Position{selectedCount !== 1 ? "en" : ""} übernehmen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
