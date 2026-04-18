import { useState, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip as ReTooltip } from "recharts";
import { Sl, Tile, Btn, Card, CardLabel, fmtE, full } from "./ui.jsx";
import { ASSET_CLASSES, ASSET_CLASS_DEFAULTS, LIQUIDITY_CATS, LIQ_CLR } from "../constants.js";
import { exportAssetsToExcel, parseImportFile } from "../utils/excelIO.js";

export default function TabVermogen({ s, T, updClass, updArr, setModal, agg, filteredAssets }) {
  const fileInputRef = useRef(null);
  const [expandedSnap, setExpandedSnap] = useState(null);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const preview = await parseImportFile(file, s.assets, s.owners || []);
      setModal({ type: "importPreview", data: preview });
    } catch (err) {
      alert("Import-Fehler: " + err.message);
    }
  };

  const sliderMin = (cls) => (cls === "Sonstiges" || cls === "Forderung") ? -30 : 0;
  const sliderMax = (cls) => (cls === "Aktien" || cls === "Krypto" || cls === "Private Equity") ? 30 : 15;

  // Donut-Chart Daten: positive Nettowerte pro Asset-Klasse
  const pieData = ASSET_CLASSES
    .filter(cls => filteredAssets.some(a => a.class === cls))
    .map(cls => {
      const clsNet = filteredAssets.filter(a => a.class === cls)
        .reduce((t, a) => t + (a.value || 0) - (a.debt || 0), 0);
      return { cls, value: Math.max(0, clsNet), color: ASSET_CLASS_DEFAULTS[cls]?.color || T.textMid, pct: agg.net > 0 ? clsNet / agg.net * 100 : 0 };
    })
    .filter(d => d.value > 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* KPI-Kacheln */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
        <Tile label="Brutto" value={fmtE(agg.gross)} color={T.text} T={T} />
        <Tile label="Schulden" value={"-"+fmtE(agg.debt)} color={T.red} T={T} />
        <Tile label="Netto" value={fmtE(agg.net)} color={T.accent} T={T} />
      </div>

      {/* Allokations-Donut */}
      {pieData.length > 0 && (
        <Card T={T}>
          <CardLabel T={T} mb={12}>Allokation nach Asset-Klasse</CardLabel>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            {/* Donut */}
            <div style={{ position:"relative", flexShrink:0, width:130, height:130 }}>
              <PieChart width={130} height={130}>
                <Pie
                  data={pieData}
                  cx={65} cy={65}
                  innerRadius={42} outerRadius={62}
                  dataKey="value"
                  stroke="none"
                  startAngle={90} endAngle={-270}
                >
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <ReTooltip
                  formatter={(v, n, props) => [fmtE(v), props.payload.cls]}
                  contentStyle={{ background:T.surface, border:"1px solid "+T.border, borderRadius:6, fontSize:10, color:T.text }}
                />
              </PieChart>
              {/* Mitte: Nettowert */}
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                <div style={{ fontSize:7, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.06em" }}>Netto</div>
                <div style={{ fontSize:12, fontWeight:900, color:T.accent }}>{fmtE(agg.net)}</div>
              </div>
            </div>

            {/* Legende */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
              {pieData.map(e => (
                <div key={e.cls} style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:e.color, flexShrink:0 }} />
                  <span style={{ fontSize:10, color:T.text, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.cls}</span>
                  <span style={{ fontSize:10, color:T.textMid, fontWeight:700, flexShrink:0 }}>{e.pct.toFixed(0)}%</span>
                  <span style={{ fontSize:9, color:T.textDim, flexShrink:0 }}>{fmtE(e.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Renditeerwartungen */}
      <Card T={T} style={{ padding:16 }}>
        <CardLabel T={T} mb={4}>Renditeerwartungen nach Asset-Klasse</CardLabel>
        <div style={{ fontSize:9, color:T.textDim, marginBottom:14 }}>
          Gilt für alle Positionen der jeweiligen Klasse. Gewichteter Durchschnitt:{" "}
          <strong style={{ color:T.amber }}>{agg.wavgReturn.toFixed(1)}% p.a.</strong>
        </div>
        {ASSET_CLASSES.filter(cls => filteredAssets.some(a => a.class === cls)).map(cls => {
          const clsAssets = filteredAssets.filter(a => a.class === cls);
          const clsNet    = clsAssets.reduce((t, a) => t + (a.value||0) - (a.debt||0), 0);
          const weight    = agg.net > 0 ? (clsNet / agg.net * 100) : 0;
          const retVal    = s.classReturns[cls] ?? ASSET_CLASS_DEFAULTS[cls]?.return ?? 0;
          const isNeg     = retVal < 0;
          const clsColor  = ASSET_CLASS_DEFAULTS[cls]?.color || T.textMid;
          return (
            <div key={cls} style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:clsColor }} />
                  <span style={{ fontSize:11, fontWeight:600, color:T.text }}>{cls}</span>
                  <span style={{ fontSize:9, color:T.textDim }}>{fmtE(clsNet)} ({weight.toFixed(0)}%)</span>
                </div>
                {isNeg && <span style={{ fontSize:8, color:T.red, background:T.red+"15", padding:"1px 6px", borderRadius:4 }}>Wertverlust</span>}
              </div>
              <Sl label="" value={retVal} min={sliderMin(cls)} max={sliderMax(cls)} step={0.5}
                onChange={v => updClass(cls, v)} fmt={v => v.toFixed(1)+"%"}
                color={isNeg ? T.red : clsColor} T={T} />
            </div>
          );
        })}
      </Card>

      {/* Liquidität */}
      <Card T={T}>
        <CardLabel T={T}>Liquidität</CardLabel>
        <div style={{ display:"flex", borderRadius:6, overflow:"hidden", height:10, marginBottom:10 }}>
          {LIQUIDITY_CATS.map(l => {
            const w = agg.net > 0 ? ((agg.byLiquidity[l]||0) / agg.net * 100) : 0;
            return w > 0 ? <div key={l} style={{ width:w+"%", background:LIQ_CLR[l] }} /> : null;
          })}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {LIQUIDITY_CATS.map(l => (
            <div key={l} style={{ borderTop:"3px solid "+LIQ_CLR[l], paddingTop:6 }}>
              <div style={{ fontSize:9, color:LIQ_CLR[l], fontWeight:700 }}>{l}</div>
              <div style={{ fontSize:13, fontWeight:800, color:T.text }}>{fmtE(agg.byLiquidity[l]||0)}</div>
              <div style={{ fontSize:9, color:T.textDim }}>
                {agg.net > 0 ? ((agg.byLiquidity[l]||0) / agg.net * 100).toFixed(0)+"%" : "0%"}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Positionen */}
      <Card T={T}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <CardLabel T={T} mb={0}>Positionen</CardLabel>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
            <Btn sm T={T} onClick={() => setModal({ type:"owner" })}>Eigentümer</Btn>
            <Btn sm color={T.amber} T={T} onClick={() => exportAssetsToExcel(s.assets, s.owners || [])}>↓ Excel</Btn>
            <Btn sm color={T.purple} T={T} onClick={() => fileInputRef.current?.click()}>↑ Import</Btn>
            <Btn sm color={T.green} T={T} onClick={() => setModal({ type:"asset", data:null })}>+ Position</Btn>
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={handleImport} />
        </div>

        {filteredAssets.map(a => {
          const clsColor = ASSET_CLASS_DEFAULTS[a.class]?.color || T.textMid;
          const ownershipLabels = (a.ownership || (a.owner ? [{ ownerId: a.owner, share: 1 }] : []))
            .map(o => {
              const own = (s.owners || []).find(x => x.id === o.ownerId);
              if (!own) return null;
              return a.ownership?.length > 1 ? `${own.label} ${Math.round(o.share * 100)}%` : own.label;
            }).filter(Boolean);
          const isFord       = a.class === "Forderung";
          const stilleRes    = a.tax?.acquisitionPrice > 0 ? (a.value || 0) - a.tax.acquisitionPrice : null;

          return (
            <div key={a.id} style={{
              display:"flex", justifyContent:"space-between", alignItems:"flex-start",
              borderBottom:"1px solid "+T.border, paddingBottom:10, marginBottom:10,
              borderLeft:"3px solid "+clsColor,
              paddingLeft:10, marginLeft:-14,
            }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:T.text, fontWeight:600 }}>
                  {a.name}
                  {a.locked && (
                    <span style={{ fontSize:7, color:T.amber, background:T.amber+"18", padding:"1px 4px", borderRadius:3, marginLeft:5 }}>
                      GESPERRT
                    </span>
                  )}
                </div>
                <div style={{ display:"flex", gap:5, marginTop:3, flexWrap:"wrap", alignItems:"center" }}>
                  <span style={{ fontSize:8, color:clsColor, fontWeight:600 }}>{a.class}</span>
                  {ownershipLabels.map((lbl, i) => (
                    <span key={i} style={{ fontSize:8, color:T.textDim }}>· {lbl}</span>
                  ))}
                  <span style={{ fontSize:8, color:LIQ_CLR[a.liquidity||"Semi-liquide"], background:LIQ_CLR[a.liquidity||"Semi-liquide"]+"18", padding:"1px 5px", borderRadius:3 }}>
                    {a.liquidity||"Semi-liquide"}
                  </span>
                  <span style={{ fontSize:8, color:T.textDim }}>
                    {(s.classReturns[a.class] ?? ASSET_CLASS_DEFAULTS[a.class]?.return ?? 0).toFixed(1)}% p.a.
                  </span>
                </div>

                {stilleRes !== null && (
                  <div style={{ fontSize:8, color:stilleRes >= 0 ? T.green : T.red, marginTop:3 }}>
                    Stille Reserven: {stilleRes >= 0 ? "+" : ""}{full(stilleRes)}
                  </div>
                )}
                {isFord && (a.monthlyRepayment||0) > 0 && (
                  <div style={{ fontSize:8, color:T.green, marginTop:3 }}>
                    Rückzahlung +{full(a.monthlyRepayment)}/Mo. | Zinssatz {a.loanRate||0}%
                  </div>
                )}
                {(a.monthlyRunningCost||0) > 0 && (
                  <div style={{ fontSize:8, color:T.red, marginTop:3 }}>
                    Lfd. Kosten −{full(a.monthlyRunningCost)}/Mo.
                  </div>
                )}
                {!isFord && (a.debt||0) > 0 && (
                  <div style={{ fontSize:8, color:T.red, marginTop:3 }}>
                    Schulden {full(a.debt)} | {full(a.loanAnnuitat||0)}/Mo. Annuität
                  </div>
                )}
              </div>

              <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0, marginLeft:8 }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:12, fontWeight:800, color:T.text }}>{fmtE(a.value)}</div>
                  {!isFord && (a.debt||0) > 0 && (
                    <div style={{ fontSize:9, color:T.green }}>netto {fmtE((a.value||0)-(a.debt||0))}</div>
                  )}
                  {isFord && <div style={{ fontSize:9, color:T.green }}>Forderung</div>}
                </div>
                <Btn sm T={T} onClick={() => setModal({ type:"asset", data:a })}>edit</Btn>
                <Btn sm danger T={T} onClick={() => updArr("assets", s.assets.filter(x => x.id !== a.id))}>×</Btn>
              </div>
            </div>
          );
        })}

        <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, borderTop:"1px solid "+T.border }}>
          <span style={{ fontSize:10, color:T.textLow }}>Schulden <strong style={{ color:T.red }}>−{fmtE(agg.debt)}</strong></span>
          <span style={{ fontSize:10, color:T.textLow }}>Netto <strong style={{ color:T.accent }}>{fmtE(agg.net)}</strong></span>
        </div>
      </Card>

      {/* Snapshots */}
      <Card T={T}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <CardLabel T={T} mb={0}>Nettowert-Snapshots</CardLabel>
          <Btn sm color={T.green} T={T} onClick={() => setModal({ type:"snapshot" })}>+ Snapshot</Btn>
        </div>
        {!s.snapshots?.length ? (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", border:"1px dashed "+T.border, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px" }}>
              <span style={{ fontSize:18, color:T.textDim }}>+</span>
            </div>
            <div style={{ fontSize:11, color:T.textDim }}>Noch kein Snapshot — einmal im Quartal eintragen</div>
          </div>
        ) : (
          [...(s.snapshots||[])].sort((a, b) => b.date.localeCompare(a.date)).map(sn => {
            const net        = sn.totalNet ?? sn.value;
            const isExpanded = expandedSnap === sn.id;
            const hasDetails = sn.assetValues?.length > 0;
            return (
              <div key={sn.id} style={{ borderBottom:"1px solid "+T.border, paddingBottom:8, marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ cursor: hasDetails ? "pointer" : "default" }}
                    onClick={() => hasDetails && setExpandedSnap(isExpanded ? null : sn.id)}>
                    <div style={{ fontSize:11, color:T.textMid, fontWeight:600 }}>
                      {sn.date}
                      {hasDetails && <span style={{ fontSize:8, color:T.textDim, marginLeft:5 }}>{isExpanded ? "▲" : "▼"}</span>}
                    </div>
                    {sn.note && <div style={{ fontSize:9, color:T.textDim }}>{sn.note}</div>}
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:T.accent }}>{fmtE(net)}</div>
                    <Btn sm danger T={T} onClick={() => updArr("snapshots", s.snapshots.filter(x => x.id !== sn.id))}>×</Btn>
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
        )}
      </Card>

    </div>
  );
}
