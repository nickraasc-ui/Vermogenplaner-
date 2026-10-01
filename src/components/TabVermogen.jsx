import { useState, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip as ReTooltip } from "recharts";
import { Sl, Tile, Btn, Section, ListRow, Avatar, LinkBtn, IconBtn, Icon, fmtE, full, fmtNum, fmtDec, fmtDate } from "./ui.jsx";
import { primaryOwnerId } from "../model/schema.js";
import { ASSET_CLASSES, ASSET_CLASS_DEFAULTS, CY } from "../constants.js";
import { yearsUntilPaidOff } from "../model/finance.js";
import { exportAssetsToExcel, parseImportFile } from "../utils/excelIO.js";

export default function TabVermogen({ s, T, updClass, updArr, setModal, agg, filteredAssets, loanSummary }) {
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

  const ownerLabelsOf = (a) => (a.ownership || [])
    .map(o => {
      const own = (s.owners || []).find(x => x.id === o.ownerId);
      if (!own) return null;
      return a.ownership?.length > 1 ? `${own.label} ${Math.round(o.share * 100)} %` : own.label;
    }).filter(Boolean);

  const loans = s.standaloneLoans || [];
  const sortedSnaps = [...(s.snapshots||[])].sort((a, b) => b.date.localeCompare(a.date));
  const addAction = (onClick) => <LinkBtn T={T} onClick={onClick}><Icon name="plus" size={16} /> Hinzufügen</LinkBtn>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28 }}>

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        <Tile label="Brutto" value={fmtE(agg.gross)} T={T} />
        <Tile label="Schulden" value={(agg.debt > 0 ? "−" : "")+fmtE(agg.debt)} T={T} />
        <Tile label="Netto" value={fmtE(agg.net)} T={T} />
      </div>

      {/* Positionen */}
      <Section title="Positionen" action={addAction(() => setModal({ type:"asset", data:null }))} T={T}>
        <div className="vp-noscroll" style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:6 }}>
          <Btn sm color={T.textMid} T={T} onClick={() => setModal({ type:"owner" })}>Eigentümer</Btn>
          <Btn sm color={T.textMid} T={T} onClick={() => exportAssetsToExcel(s.assets, s.owners || [])}>Excel-Export</Btn>
          <Btn sm color={T.textMid} T={T} onClick={() => fileInputRef.current?.click()}>Import</Btn>
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display:"none" }} onChange={handleImport} />

        {filteredAssets.length === 0 && (
          <div style={{ padding:"28px 0 8px" }}>
            <div style={{ fontSize:16, fontWeight:600, color:T.text, marginBottom:4 }}>Noch keine Positionen</div>
            <div style={{ fontSize:14, color:T.textLow, marginBottom:16 }}>ETFs, Immobilien, Cash oder Beteiligungen hinzufügen.</div>
            <Btn T={T} onClick={() => setModal({ type:"asset", data:null })}>Erste Position anlegen</Btn>
          </div>
        )}
        {filteredAssets.map(a => {
          const isFord    = a.class === "Forderung";
          const stilleRes = a.tax?.acquisitionPrice > 0 ? (a.value || 0) - a.tax.acquisitionPrice : null;
          const hasDebt   = !isFord && (a.debt||0) > 0;
          const sub = [a.class, ...ownerLabelsOf(a)];
          if (a.locked) sub.push("gesperrt");
          if (isFord && (a.monthlyRepayment||0) > 0) sub.push("+"+full(a.monthlyRepayment)+"/Mo.");
          return (
            <ListRow key={a.id} T={T} onClick={() => setModal({ type:"asset", data:a })}
              leading={<Avatar cls={a.class} color={ASSET_CLASS_DEFAULTS[a.class]?.color || T.textMid} />}
              title={a.name}
              subtitle={sub.join(" · ")}
              value={full(a.value)}
              valueSub={hasDebt ? "netto "+fmtE((a.value||0)-(a.debt||0))
                : stilleRes !== null ? (stilleRes >= 0 ? "+" : "−")+full(Math.abs(stilleRes)) : undefined}
              valueSubColor={!hasDebt && stilleRes !== null ? (stilleRes >= 0 ? T.green : T.red) : undefined} />
          );
        })}
      </Section>

      {/* Allokation */}
      {pieData.length > 0 && (
        <Section title="Allokation" T={T}>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <div style={{ position:"relative", flexShrink:0, width:140, height:140 }}>
              <PieChart width={140} height={140}>
                <Pie data={pieData} cx={70} cy={70} innerRadius={50} outerRadius={68} paddingAngle={2}
                  dataKey="value" stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <ReTooltip formatter={(v, n, props) => [fmtE(v), props.payload.cls]}
                  contentStyle={{ background:T.sheet, border:"1px solid "+T.border, borderRadius:10, fontSize:13, color:T.text }} />
              </PieChart>
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                <div style={{ fontSize:12, color:T.textLow }}>Netto</div>
                <div className="vp-num" style={{ fontSize:15, fontWeight:700, color:T.text }}>{fmtE(agg.net)}</div>
              </div>
            </div>
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:9, minWidth:0 }}>
              {pieData.map(e => (
                <div key={e.cls} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:e.color, flexShrink:0 }} />
                  <span style={{ fontSize:14, color:T.text, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.cls}</span>
                  <span className="vp-num" style={{ fontSize:14, color:T.textLow, flexShrink:0 }}>{fmtNum(e.pct, 0)} %</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Verbindlichkeiten (standalone loans) */}
      <Section title="Verbindlichkeiten" action={addAction(() => setModal({ type:"standaloneLoan", data:null }))} T={T}>
        {!loans.length ? (
          <div style={{ fontSize:14, color:T.textLow, padding:"4px 0" }}>Keine separaten Verbindlichkeiten.</div>
        ) : (
          <>
            {loans.map(l => {
              const ownerLabel = (s.owners||[]).find(o => o.id === primaryOwnerId(l))?.label || null;
              const sub = [l.loanType === "endfaellig" ? "Endfällig" : "Annuität", fmtDec(l.loanRate||0)+" %"];
              if (ownerLabel) sub.push(ownerLabel);
              const yl = yearsUntilPaidOff(l);
              if (yl) sub.push("frei "+(CY+yl));
              if (l.loanFixedUntil >= CY) sub.push("Zinsbindung bis "+l.loanFixedUntil);
              return (
                <ListRow key={l.id} T={T} onClick={() => setModal({ type:"standaloneLoan", data:l })}
                  leading={<Avatar icon="card" color={T.surfaceHigh} fg={T.text} />}
                  title={l.name} subtitle={sub.join(" · ")}
                  value={"−"+fmtE(l.debt||0)} valueSub={full(l.loanAnnuitat||0)+"/Mo."} />
              );
            })}
            <ListRow T={T} last title="Gesamt Restschuld" value={"−"+fmtE(loans.reduce((t,l) => t+(l.debt||0), 0))} />
          </>
        )}
      </Section>

      {/* Renditeerwartungen */}
      <Section title="Renditeerwartung" T={T}>
        <div style={{ fontSize:14, color:T.textLow, marginBottom:14 }}>
          Pro Asset-Klasse · gewichteter Schnitt <span className="vp-num" style={{ color:T.text, fontWeight:600 }}>{fmtNum(agg.wavgReturn, 1)} % p.a.</span>
        </div>
        {ASSET_CLASSES.filter(cls => filteredAssets.some(a => a.class === cls)).map(cls => {
          const clsNet = filteredAssets.filter(a => a.class === cls).reduce((t, a) => t + (a.value||0) - (a.debt||0), 0);
          const weight = agg.net > 0 ? (clsNet / agg.net * 100) : 0;
          const retVal = s.classReturns[cls] ?? ASSET_CLASS_DEFAULTS[cls]?.return ?? 0;
          return (
            <div key={cls} style={{ marginBottom:18 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:2 }}>
                <Avatar cls={cls} color={ASSET_CLASS_DEFAULTS[cls]?.color || T.textMid} size={28} />
                <span style={{ fontSize:15, fontWeight:600, color:T.text }}>{cls}</span>
                <span className="vp-num" style={{ fontSize:13, color:T.textLow, flex:1 }}>{fmtE(clsNet)} · {fmtNum(weight, 0)} %</span>
                <span className="vp-num" style={{ fontSize:16, fontWeight:650, color: retVal < 0 ? T.red : T.text }}>{fmtNum(retVal, 1)} %</span>
              </div>
              <Sl label="" value={retVal} min={sliderMin(cls)} max={sliderMax(cls)} step={0.5}
                onChange={v => updClass(cls, v)} fmt={v => fmtNum(v, 1)+" %"} warn={retVal < 0} hideHead T={T} />
            </div>
          );
        })}
      </Section>

      {/* Snapshots */}
      <Section title="Snapshots" action={addAction(() => setModal({ type:"snapshot" }))} T={T}>
        {!sortedSnaps.length ? (
          <div style={{ fontSize:14, color:T.textLow, padding:"4px 0" }}>Noch kein Snapshot. Am besten einmal im Quartal festhalten.</div>
        ) : sortedSnaps.map((sn, i) => {
          const net        = sn.totalNet;
          const isExpanded = expandedSnap === sn.id;
          const hasDetails = sn.assetValues?.length > 0;
          return (
            <div key={sn.id}>
              <ListRow T={T} last={i === sortedSnaps.length - 1 && !isExpanded}
                onClick={hasDetails ? () => setExpandedSnap(isExpanded ? null : sn.id) : undefined}
                leading={<Avatar icon="camera" color={T.surfaceHigh} fg={T.text} />}
                title={fmtDate(sn.date)} subtitle={sn.note || (hasDetails ? sn.assetValues.length+" Positionen" : undefined)}
                value={full(net)}
                trailing={<IconBtn icon="trash" label="Snapshot löschen" T={T} danger onClick={() => updArr("snapshots", s.snapshots.filter(x => x.id !== sn.id))} />} />
              {isExpanded && hasDetails && (
                <div style={{ padding:"4px 0 10px 54px", borderBottom:"1px solid "+T.border }}>
                  {sn.assetValues.map(av => (
                    <div key={av.assetId} style={{ display:"flex", justifyContent:"space-between", gap:12, padding:"5px 0", fontSize:14 }}>
                      <span style={{ color:T.textMid, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{av.name}</span>
                      <span className="vp-num" style={{ color:T.text, fontWeight:500, flexShrink:0 }}>
                        {fmtE(av.value)}{(av.debt||0) > 0 && <span style={{ color:T.textLow }}> · netto {fmtE((av.value||0)-(av.debt||0))}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Section>

    </div>
  );
}
