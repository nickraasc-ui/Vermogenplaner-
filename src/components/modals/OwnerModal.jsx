import { useState } from "react";
import { Sheet, Inp, Btn, uid } from "../ui.jsx";

export default function OwnerModal({ s, T, setModal, upd }) {
  const [newName, setNewName] = useState("");
  const owners = s.owners || [];

  const addOwner = () => {
    const label = newName.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || uid();
    if (owners.some(o => o.id === id)) return;
    upd({ owners: [...owners, { id, label }] });
    setNewName("");
  };

  const removeOwner = (ownerId) => {
    if (s.assets.some(a => a.owner === ownerId)) return;
    upd({ owners: owners.filter(o => o.id !== ownerId) });
  };

  return (
    <Sheet title="Eigentümer verwalten" onClose={() => setModal(null)} T={T}>
      {owners.map(o => {
        const assetCount = s.assets.filter(a => a.owner === o.id).length;
        const inUse = assetCount > 0;
        return (
          <div key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid "+T.border, paddingBottom:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{o.label}</div>
              <div style={{ fontSize:9, color:T.textDim, marginTop:1 }}>
                {inUse ? assetCount+" Position(en)" : "Keine Positionen"}
              </div>
            </div>
            {inUse
              ? <span style={{ fontSize:9, color:T.textDim, padding:"6px 12px" }}>in Nutzung</span>
              : <Btn sm danger T={T} onClick={() => removeOwner(o.id)}>x</Btn>
            }
          </div>
        );
      })}

      <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:8, padding:"12px 12px 4px", marginTop:6 }}>
        <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Neuer Eigentümer</div>
        <Inp label="" value={newName} onChange={setNewName} placeholder="z.B. Kind 1" T={T} />
        <Btn full color={T.green} T={T} onClick={addOwner}>Hinzufügen</Btn>
      </div>
    </Sheet>
  );
}
