import { useState } from "react";
import { fmtE } from "./ui.jsx";
import { RELATION_TYPES } from "../constants.js";

const NODE_W  = 114;
const NODE_H  = 72;
const TIER_H  = NODE_H + 76; // vertical distance between tier rows
const NODE_GAP = 14;

const RCOLOR = Object.fromEntries(RELATION_TYPES.map(r => [r.value, r.color]));

const TYPE_ICON = {
  "Person":           "👤",
  "GmbH":             "🏢",
  "GmbH & Co. KG":   "🏭",
  "KG":               "🤝",
  "GbR":              "🤝",
  "Stiftung":         "🏛",
  "AG":               "📈",
  "Sonstiges":        "◆",
};

// Tier: depth in ownership chain. Persons = 0. Corporate = max(parentTiers)+1.
const calcTier = (id, owners, seen = new Set()) => {
  if (seen.has(id)) return 0;
  seen.add(id);
  const o = owners.find(x => x.id === id);
  if (!o || o.type === "Person") return 0;
  const parents = (o.ownedBy || []).filter(ob => owners.some(x => x.id === ob.ownerId));
  if (!parents.length) return 0;
  return Math.max(...parents.map(ob => calcTier(ob.ownerId, owners, new Set(seen)))) + 1;
};

export default function OrgChart({ s, T, setModal }) {
  const owners = s.owners || [];
  const assets = s.assets || [];
  const [selectedId, setSelectedId] = useState(null);

  // --- Layout ---
  const tierOf = {};
  owners.forEach(o => { tierOf[o.id] = calcTier(o.id, owners); });

  const byTier = {};
  owners.forEach(o => {
    const t = tierOf[o.id];
    (byTier[t] = byTier[t] || []).push(o);
  });

  // Within tier 0: persons first, then entities, then alphabetical
  Object.values(byTier).forEach(nodes => {
    nodes.sort((a, b) =>
      (a.type === "Person" ? 0 : 1) - (b.type === "Person" ? 0 : 1) ||
      a.label.localeCompare(b.label)
    );
  });

  const maxTier  = owners.length ? Math.max(...Object.keys(byTier).map(Number)) : 0;
  const maxCols  = Math.max(...Object.values(byTier).map(t => t.length), 1);
  const chartW   = Math.max(300, maxCols * (NODE_W + NODE_GAP) - NODE_GAP);
  const chartH   = (maxTier + 1) * TIER_H;

  const pos = {};
  Object.entries(byTier).forEach(([tier, nodes]) => {
    const t = parseInt(tier);
    const totalW = nodes.length * NODE_W + (nodes.length - 1) * NODE_GAP;
    const startX = (chartW - totalW) / 2;
    nodes.forEach((node, i) => {
      pos[node.id] = { x: startX + i * (NODE_W + NODE_GAP), y: t * TIER_H };
    });
  });

  // --- Data ---
  const ownerNet = {};
  owners.forEach(o => { ownerNet[o.id] = 0; });
  assets.forEach(a => {
    const ows = a.ownership || (a.owner ? [{ ownerId: a.owner, share: 1 }] : []);
    ows.forEach(ob => {
      if (ob.ownerId in ownerNet)
        ownerNet[ob.ownerId] += ((a.value || 0) - (a.debt || 0)) * (ob.share || 0);
    });
  });

  const assetsByOwner = {};
  owners.forEach(o => { assetsByOwner[o.id] = []; });
  assets.forEach(a => {
    const ows = a.ownership || (a.owner ? [{ ownerId: a.owner, share: 1 }] : []);
    ows.forEach(ob => {
      if (assetsByOwner[ob.ownerId])
        assetsByOwner[ob.ownerId].push({ ...a, _share: ob.share || 0 });
    });
  });

  // --- Edges ---
  // Ownership (solid)
  const ownEdges = [];
  owners.forEach(o => {
    (o.ownedBy || []).forEach(ob => {
      if (pos[ob.ownerId] && pos[o.id])
        ownEdges.push({ from: ob.ownerId, to: o.id, share: ob.share || 0 });
    });
  });

  // Family relations (dashed) — deduplicated
  const famEdges = [];
  const seenEdge = new Set();
  owners.forEach(o => {
    (o.relations || []).forEach(rel => {
      if (!pos[o.id] || !pos[rel.targetId]) return;
      const key = [o.id, rel.targetId].sort().join("~") + "~" + rel.type;
      if (seenEdge.has(key)) return;
      seenEdge.add(key);
      famEdges.push({ from: o.id, to: rel.targetId, type: rel.type });
    });
  });

  // --- Selected ---
  const selectedOwner = owners.find(o => o.id === selectedId) || null;
  const selectedAssets = selectedId ? (assetsByOwner[selectedId] || []) : [];

  if (!owners.length) return (
    <div style={{ textAlign:"center", padding:"16px 0", fontSize:11, color:T.textDim }}>
      Keine Eigentümer angelegt
    </div>
  );

  return (
    <div>
      {/* Legend */}
      <div style={{ display:"flex", gap:16, marginBottom:8, flexWrap:"wrap" }}>
        <span style={{ fontSize:8, color:T.textDim, display:"flex", alignItems:"center", gap:4 }}>
          <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke={T.accent} strokeWidth={2} /></svg>
          Beteiligung
        </span>
        <span style={{ fontSize:8, color:T.textDim, display:"flex", alignItems:"center", gap:4 }}>
          <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke="#f472b6" strokeWidth={1.5} strokeDasharray="4 2" /></svg>
          Familienbeziehung
        </span>
        <span style={{ fontSize:8, color:T.textDim }}>Tippen = Assets anzeigen · ✏ = Beziehungen</span>
      </div>

      {/* Chart */}
      <div style={{ overflowX:"auto", paddingBottom:4 }}>
        <div style={{ position:"relative", width:chartW, height:chartH, margin:"0 auto" }}>

          {/* SVG lines (below nodes) */}
          <svg style={{ position:"absolute", top:0, left:0, width:chartW, height:chartH, pointerEvents:"none", overflow:"visible" }}>
            {/* Ownership lines */}
            {ownEdges.map(({ from, to, share }, i) => {
              const p1 = pos[from], p2 = pos[to];
              const x1 = p1.x + NODE_W / 2, y1 = p1.y + NODE_H;
              const x2 = p2.x + NODE_W / 2, y2 = p2.y;
              const my = (y1 + y2) / 2;
              return (
                <g key={`o${i}`}>
                  <path d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`}
                    stroke={T.accent} strokeWidth={2} fill="none" opacity={0.65} />
                  {share > 0 && share < 1 && (
                    <text x={(x1+x2)/2} y={my} fontSize={8} fill={T.accent}
                      textAnchor="middle" dy={-4} fontWeight={700}>
                      {Math.round(share * 100)}%
                    </text>
                  )}
                </g>
              );
            })}

            {/* Family relation lines */}
            {famEdges.map(({ from, to, type }, i) => {
              const p1 = pos[from], p2 = pos[to];
              const x1 = p1.x + NODE_W / 2, y1 = p1.y + NODE_H / 2;
              const x2 = p2.x + NODE_W / 2, y2 = p2.y + NODE_H / 2;
              const color = RCOLOR[type] || T.textMid;
              const sameTier = Math.abs(y1 - y2) < 5;
              const controlY = sameTier ? y1 - 24 : (y1 + y2) / 2;
              const lx = (x1 + x2) / 2;
              const ly = sameTier ? controlY - 5 : (y1 + y2) / 2;
              return (
                <g key={`f${i}`}>
                  <path d={`M${x1},${y1} Q${lx},${controlY} ${x2},${y2}`}
                    stroke={color} strokeWidth={1.5} strokeDasharray="5 3" fill="none" opacity={0.85} />
                  <text x={lx} y={ly} fontSize={7.5} fill={color}
                    textAnchor="middle" fontWeight={700}>{type}</text>
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {owners.map(o => {
            const p = pos[o.id];
            if (!p) return null;
            const isSelected  = selectedId === o.id;
            const isPerson    = o.type === "Person";
            const borderClr   = isSelected ? T.green : isPerson ? T.accent : T.purple;
            const net         = ownerNet[o.id] || 0;

            return (
              <div key={o.id} style={{ position:"absolute", left:p.x, top:p.y, width:NODE_W }}>
                <div
                  onClick={() => setSelectedId(selectedId === o.id ? null : o.id)}
                  style={{
                    background: T.surface,
                    border:`2px solid ${borderClr}`,
                    borderRadius:10,
                    padding:"7px 8px 6px",
                    cursor:"pointer",
                    height:NODE_H,
                    boxSizing:"border-box",
                    display:"flex", flexDirection:"column", justifyContent:"space-between",
                    WebkitTapHighlightColor:"transparent",
                  }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontSize:8.5, color:borderClr, fontWeight:700, lineHeight:1 }}>
                      {TYPE_ICON[o.type] || "◆"} {o.type}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setModal({ type:"relation", data:o }); }}
                      style={{ background:"none", border:"none", color:T.textDim, cursor:"pointer",
                        fontSize:11, padding:0, lineHeight:1, WebkitTapHighlightColor:"transparent" }}>
                      ✏
                    </button>
                  </div>
                  <div style={{ fontSize:11, fontWeight:800, color:T.text,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {o.label}
                  </div>
                  <div style={{ fontSize:10.5, fontWeight:700, color:net >= 0 ? T.green : T.red }}>
                    {fmtE(net)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Asset detail panel */}
      {selectedOwner && (
        <div style={{ background:T.surfaceHigh, border:`1px solid ${T.border}`, borderRadius:10,
          padding:"11px 13px", marginTop:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:9, color:T.textLow, fontWeight:700,
              textTransform:"uppercase", letterSpacing:"0.08em" }}>
              {selectedOwner.label} — Positionen
            </div>
            <button onClick={() => setSelectedId(null)}
              style={{ background:"none", border:"none", color:T.textDim,
                cursor:"pointer", fontSize:14, lineHeight:1, padding:"0 2px",
                WebkitTapHighlightColor:"transparent" }}>✕</button>
          </div>

          {selectedAssets.length === 0 ? (
            <div style={{ fontSize:10, color:T.textDim, padding:"4px 0" }}>
              Keine Positionen direkt zugeordnet
            </div>
          ) : (
            selectedAssets.map((a, idx) => {
              const netVal = ((a.value || 0) - (a.debt || 0)) * a._share;
              return (
                <div key={a.id + idx} style={{
                  display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                  borderBottom:`1px solid ${T.border}`, paddingBottom:7, marginBottom:7,
                }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:T.text,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {a.name}
                    </div>
                    <div style={{ fontSize:8.5, color:T.textDim, marginTop:1 }}>
                      {a.class} · {Math.round(a._share * 100)}% Anteil
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                    <div style={{ fontSize:11, fontWeight:800,
                      color:netVal >= 0 ? T.green : T.red }}>
                      {fmtE(netVal)}
                    </div>
                    {(a.debt || 0) > 0 && (
                      <div style={{ fontSize:8, color:T.textDim }}>
                        Brutto {fmtE((a.value || 0) * a._share)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", paddingTop:4 }}>
            <span style={{ fontSize:10, color:T.textMid, fontWeight:700 }}>Nettovermögen</span>
            <span style={{ fontSize:13, fontWeight:900,
              color:(ownerNet[selectedOwner.id]||0) >= 0 ? T.green : T.red }}>
              {fmtE(ownerNet[selectedOwner.id] || 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
