import { useState } from "react";
import { Sl, Tile, Btn, fmtE, full } from "./ui.jsx";
import { ASSET_CLASSES, ASSET_CLASS_DEFAULTS, LIQUIDITY_CATS, LIQ_CLR } from "../constants.js";

export default function TabVermogen({ s, T, updClass, updArr, setModal, agg, filteredAssets }) {
  const [expandedSnap, setExpandedSnap] = useState(null);

  const sliderMin = (cls) => (cls === "Sonstiges" || cls === "Forderung") ? -30 : 0;
  const sliderMax = (cls) => (cls === "Aktien" || cls === "Krypto" || cls === "Private Equity") ? 30 : 15;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
        <Tile label="Brutto" value={fmtE(agg.gross)} color={T.text} T={T} />
        <Tile label="Schulden" value={"-"+fmtE(agg.debt)} color={T.red} T={T} />
        <Tile label="Netto" value={fmtE(agg.net)} color={T.accent} T={T} />
      </div>

      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:16 }}>
        <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Renditeerwartungen nach Asset-Klasse</div>
        <div style={{ fontSize:9, color:T.textDim, marginBottom:14 }}>Gilt fur alle Positionen der jeweiligen Klasse. Gewichteter Durchschnitt: <strong style={{ color:T.amber }}>{agg.wavgReturn.toFixed(1)}% p.a.</strong></div>
        {ASSET_CLASSES.filter(cls => filteredAssets.some(a => a.class === cls)).map(cls => {
          const clsAssets = filteredAssets.filter(a => a.class === cls);
          const clsNet = clsAssets.reduce((t, a) => t + (a.value||0) - (a.debt||0), 0);
          const weight = agg.net > 0 ? (clsNet / agg.net * 100) : 0;
          const retVal = s.classReturns[cls] ?? ASSET_CLASS_DEFAULTS[cls]?.return ?? 0;
          const isNeg  = retVal < 0;
          return (
            <div key={cls} style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:ASSET_CLASS_DEFAULTS[cls]?.color||T.textMid }} />
                  <span style={{ fontSize:11, fontWeight:600, color:T.text }}>{cls}</span>
                  <span style={{ fontSize:9, color:T.textDim }}>{fmtE(clsNet)} ({weight.toFixed(0)}%)</span>
                </div>
                {isNeg && <span style={{ fontSize:8, color:T.red, background:T.red+"15", padding:"1px 6px", borderRadius:4 }}>Wertverlust</span>}
              </div>
              <Sl label="" value={retVal} min={sliderMin(cls)} max={sliderMax(cls)} step={0.5}
                onChange={v => updClass(cls, v)} fmt={v => v.toFixed(1)+"%"} color={isNeg?T.red:ASSET_CLASS_DEFAULTS[cls]?.color||T.accent} T={T} />
            </div>
          );
        })}
      </div>

      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
        <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Liquidität</div>
        <div style={{ display:"flex", borderRadius:6, overflow:"hidden", height:10, marginBottom:10 }}>
          {LIQUIDITY_CATS.map(l => { const w = agg.net > 0 ? ((agg.byLiquidity[l]||0) / agg.net * 100) : 0; return w > 0 ? <div key={l} style={{ width:w+"%", background:LIQ_CLR[l] }} /> : null; })}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {LIQUIDITY_CATS.map(l => (
            <div key={l}>
              <div style={{ fontSize:9, color:LIQ_CLR[l], fontWeight:700 }}>{l}</div>
              <div style={{ fontSize:13, fontWeight:800, color:T.text }}>{fmtE(agg.byLiquidity[l]||0)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Positionen</div>
          <div style={{ display:"flex", gap:6 }}>
            <Btn sm T={T} onClick={() => setModal({ type:"owner" })}>Eigentümer</Btn>
            <Btn sm color={T.green} T={T} onClick={() => setModal({ type:"asset", data:null })}>+ Position</Btn>
          </div>
        </div>
        {filteredAssets.map(a => {
          const ownershipLabels = (a.ownership || (a.owner ? [{ ownerId: a.owner, share: 1 }] : []))
            .map(o => {
              const own = (s.owners || []).find(x => x.id === o.ownerId);
              if (!own) return null;
              return a.ownership?.length > 1 ? `${own.label} ${Math.round(o.share * 100)}%` : own.label;
            }).filter(Boolean);
          const isFord = a.class === "Forderung";
          const isSonst = a.class === "Sonstiges";
          const stilleReserven = a.tax?.acquisitionPrice > 0 ? (a.value || 0) - a.tax.acquisitionPrice : null;
          return (
            <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", borderBottom:"1px solid "+T.border, paddingBottom:10, marginBottom:10 }}>
              <div style={{ display:"flex", gap:9, alignItems:"flex-start", flex:1, minWidth:0 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:ASSET_CLASS_DEFAULTS[a.class]?.color||T.textMid, marginTop:4, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, color:T.text, fontWeight:600 }}>
                    {a.name}
                    {a.locked && <span style={{ fontSize:7, color:T.amber, background:T.amber+"18", padding:"1px 4px", borderRadius:3, marginLeft:5 }}>GESPERRT</span>}
                  </div>
                  <div style={{ display:"flex", gap:5, marginTop:2, flexWrap:"wrap" }}>
                    <span style={{ fontSize:8, color:T.textLow }}>{a.class}</span>
                    {ownershipLabels.map((lbl, i) => (
                      <span key={i} style={{ fontSize:8, color:T.textDim }}>{lbl}</span>
                    ))}
                    <span style={{ fontSize:8, color:LIQ_CLR[a.liquidity||"Semi-liquide"], background:LIQ_CLR[a.liquidity||"Semi-liquide"]+"18", padding:"1px 5px", borderRadius:3 }}>{a.liquidity||"Semi-liquide"}</span>
                    <span style={{ fontSize:8, color:ASSET_CLASS_DEFAULTS[a.class]?.color||T.textDim }}>{(s.classReturns[a.class] ?? ASSET_CLASS_DEFAULTS[a.class]?.return ?? 0).toFixed(1)}% p.a.</span>
                  </div>
                  {stilleReserven !== null && (
                    <div style={{ fontSize:8, color:stilleReserven>=0?T.green:T.red, marginTop:2 }}>
                      Stille Reserven: {stilleReserven>=0?"+":""}{full(stilleReserven)}
                    </div>
                  )}
                  {isFord && (a.monthlyRepayment||0) > 0 && (
                    <div style={{ fontSize:8, color:T.green, marginTop:2 }}>
                      Rückzahlung +{full(a.monthlyRepayment)}/Mo. | Zinssatz {a.loanRate||0}%
                    </div>
                  )}
                  {(a.monthlyRunningCost||0) > 0 && (
                    <div style={{ fontSize:8, color:T.red, marginTop:2 }}>
                      Lfd. Kosten -{full(a.monthlyRunningCost)}/Mo.
                    </div>
                  )}
                  {!isFord && (a.debt||0) > 0 && (
                    <div style={{ fontSize:8, color:T.red, marginTop:2 }}>
                      Schulden {full(a.debt)} | {full(a.loanAnnuitat||0)}/Mo. Annuität
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:12, fontWeight:800, color:T.text }}>{fmtE(a.value)}</div>
                  {!isFord && (a.debt||0) > 0 && <div style={{ fontSize:9, color:T.green }}>netto {fmtE((a.value||0)-(a.debt||0))}</div>}
                  {isFord && <div style={{ fontSize:9, color:T.green }}>Forderung</div>}
                </div>
                <Btn sm T={T} onClick={() => setModal({ type:"asset", data:a })}>edit</Btn>
                <Btn sm danger T={T} onClick={() => updArr("assets", s.assets.filter(x => x.id !== a.id))}>x</Btn>
              </div>
            </div>
          );
        })}
        <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, borderTop:"1px solid "+T.border }}>
          <span style={{ fontSize:10, color:T.textLow }}>Schulden <strong style={{ color:T.red }}>-{fmtE(agg.debt)}</strong></span>
          <span style={{ fontSize:10, color:T.textLow }}>Netto <strong style={{ color:T.accent }}>{fmtE(agg.net)}</strong></span>
        </div>
      </div>

      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontSize:9, color:T.textLow, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Nettowert-Snapshots</div>
          <Btn sm color={T.green} T={T} onClick={() => setModal({ type:"snapshot" })}>+ Snapshot</Btn>
        </div>
        {!s.snapshots?.length
          ? <div style={{ fontSize:11, color:T.textDim, textAlign:"center", padding:"8px 0" }}>Noch keine - einmal im Quartal eintragen</div>
          : [...(s.snapshots||[])].sort((a, b) => b.date.localeCompare(a.date)).map(sn => {
            const net = sn.totalNet ?? sn.value;
            const isExpanded = expandedSnap === sn.id;
            const hasDetails = sn.assetValues?.length > 0;
            return (
              <div key={sn.id} style={{ borderBottom:"1px solid "+T.border, paddingBottom:8, marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ cursor: hasDetails ? "pointer" : "default" }} onClick={() => hasDetails && setExpandedSnap(isExpanded ? null : sn.id)}>
                    <div style={{ fontSize:11, color:T.textMid, fontWeight:600 }}>{sn.date}{hasDetails && <span style={{ fontSize:8, color:T.textDim, marginLeft:5 }}>{isExpanded ? "▲" : "▼"}</span>}</div>
                    {sn.note && <div style={{ fontSize:9, color:T.textDim }}>{sn.note}</div>}
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:T.accent }}>{fmtE(net)}</div>
                    <Btn sm danger T={T} onClick={() => updArr("snapshots", s.snapshots.filter(x => x.id !== sn.id))}>x</Btn>
                  </div>
                </div>
                {isExpanded && hasDetails && (
                  <div style={{ marginTop:8, background:T.surfaceHigh, borderRadius:7, padding:"8px 10px" }}>
                    {sn.assetValues.map(av => {
                      const color = ASSET_CLASS_DEFAULTS[av.class]?.color || T.textMid;
                      const avNet = (av.value||0) - (av.debt||0);
                      return (
                        <div key={av.assetId} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0 }} />
                            <span style={{ fontSize:10, color:T.textMid }}>{av.name}</span>
                            <span style={{ fontSize:8, color:T.textDim }}>{av.class}</span>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <span style={{ fontSize:10, fontWeight:700, color:T.text }}>{fmtE(av.value)}</span>
                            {(av.debt||0) > 0 && <span style={{ fontSize:9, color:T.green, marginLeft:5 }}>netto {fmtE(avNet)}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
