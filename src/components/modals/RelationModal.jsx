import { useState } from "react";
import { Sheet, Btn } from "../ui.jsx";
import { RELATION_TYPES } from "../../constants.js";

export default function RelationModal({ data: owner, s, T, setModal, updArr }) {
  const owners = s.owners || [];
  const [relations, setRelations] = useState(owner.relations || []);
  const otherOwners = owners.filter(o => o.id !== owner.id);

  const add = () => {
    if (!otherOwners.length) return;
    setRelations(r => [...r, { targetId: otherOwners[0].id, type: "Ehepartner" }]);
  };
  const remove = i => setRelations(r => r.filter((_, j) => j !== i));
  const change = (i, patch) => setRelations(r => r.map((rel, j) => j === i ? { ...rel, ...patch } : rel));

  const save = () => {
    updArr("owners", owners.map(o => o.id === owner.id ? { ...o, relations } : o));
    setModal(null);
  };

  const nativeSelect = {
    flex:1, background:T.surface, border:"1px solid "+T.border,
    borderRadius:6, color:T.text, padding:"6px 8px", fontSize:12,
    WebkitAppearance:"none",
  };
  const removeBtn = {
    background:"transparent", border:"1px solid "+T.red,
    borderRadius:5, color:T.red, padding:"4px 8px",
    cursor:"pointer", fontSize:11, flexShrink:0,
    WebkitTapHighlightColor:"transparent",
  };

  return (
    <Sheet title={`Beziehungen: ${owner.label}`} onClose={() => setModal(null)} T={T}>
      <div style={{ fontSize:10, color:T.textDim, marginBottom:16, lineHeight:1.7,
        background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:"9px 12px" }}>
        Familienbeziehungen und persönliche Verbindungen werden im Organogramm als
        gestrichelte Linien dargestellt. Beteiligungsanteile (wer besitzt welche Gesellschaft)
        werden im Eigentümer-Modal gepflegt.
      </div>

      {relations.length === 0 && (
        <div style={{ textAlign:"center", padding:"10px 0", fontSize:11,
          color:T.textDim, marginBottom:4 }}>
          Noch keine Beziehungen für {owner.label}
        </div>
      )}

      {relations.map((rel, i) => {
        const color = RELATION_TYPES.find(r => r.value === rel.type)?.color || T.textMid;
        return (
          <div key={i} style={{ display:"flex", gap:8, marginBottom:10, alignItems:"center" }}>
            <div style={{ width:4, height:32, borderRadius:2, background:color, flexShrink:0 }} />
            <select value={rel.type} onChange={e => change(i, { type: e.target.value })}
              style={{ ...nativeSelect, flex:"0 0 120px" }}>
              {RELATION_TYPES.map(rt => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
            <select value={rel.targetId} onChange={e => change(i, { targetId: e.target.value })}
              style={nativeSelect}>
              {otherOwners.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <button style={removeBtn} onClick={() => remove(i)}>✕</button>
          </div>
        );
      })}

      <button onClick={add} disabled={!otherOwners.length}
        style={{ width:"100%", background:"transparent",
          border:"1px dashed "+(otherOwners.length ? T.border : T.textDim),
          borderRadius:8, padding:11, cursor:otherOwners.length ? "pointer" : "default",
          fontSize:11, color:otherOwners.length ? T.textMid : T.textDim,
          marginBottom:18, WebkitTapHighlightColor:"transparent" }}>
        + Beziehung hinzufügen
      </button>

      {!otherOwners.length && (
        <div style={{ fontSize:9, color:T.amber, marginBottom:12, textAlign:"center" }}>
          Mindestens zwei Eigentümer nötig
        </div>
      )}

      <Btn full color={T.green} T={T} onClick={save}>Speichern</Btn>
    </Sheet>
  );
}
