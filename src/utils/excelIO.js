import * as XLSX from "xlsx";

const DATE_COL   = "Datum";
const NAME_COL   = "Name";
const CLASS_COL  = "Asset-Klasse";
const OWN_COL    = "Eigentümer";
const VAL_COL    = "Wert (€)";
const DEBT_COL   = "Schulden (€)";
const NET_COL    = "Nettowert (€)";
const LIQ_COL    = "Liquidität";
const YIELD_COL  = "Ausschüttungsrendite %";
const METH_COL   = "Bewertungsmethode";
const NOTE_COL   = "Notiz";

// Build ownership display string from ownership array + owners list
const ownershipLabel = (asset, owners) => {
  const ownership = asset.ownership || (asset.owner ? [{ ownerId: asset.owner, share: 1 }] : []);
  if (ownership.length === 0) return "";
  return ownership.map(o => {
    const owner = owners.find(x => x.id === o.ownerId);
    const label = owner?.label || o.ownerId;
    return ownership.length > 1 ? `${label} ${Math.round(o.share * 100)}%` : label;
  }).join(", ");
};

// Parse "Ehemann 60%, Ehefrau 40%" or "Ehemann" back into ownership array
const parseOwnership = (str, owners) => {
  if (!str) return [];
  const parts = str.split(",").map(s => s.trim()).filter(Boolean);
  return parts.map(part => {
    const m = part.match(/^(.+?)\s+(\d+)%$/);
    if (m) {
      const label = m[1].trim();
      const share = parseInt(m[2]) / 100;
      const owner = owners.find(o => o.label === label || o.id === label.toLowerCase().replace(/\s+/g, "_"));
      return owner ? { ownerId: owner.id, share } : null;
    }
    const owner = owners.find(o => o.label === part || o.id === part.toLowerCase().replace(/\s+/g, "_"));
    return owner ? { ownerId: owner.id, share: 1 } : null;
  }).filter(Boolean);
};

// Set column widths based on content
const autoWidth = (ws, rows) => {
  const cols = Object.keys(rows[0] || {});
  ws["!cols"] = cols.map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String(r[key] ?? "").length)) + 2,
  }));
};

export const exportAssetsToExcel = (assets, owners) => {
  const date = new Date().toISOString().slice(0, 10);
  const rows = assets.map(a => ({
    [DATE_COL]:  date,
    [NAME_COL]:  a.name,
    [CLASS_COL]: a.class,
    [OWN_COL]:   ownershipLabel(a, owners),
    [VAL_COL]:   a.value  || 0,
    [DEBT_COL]:  a.debt   || 0,
    [NET_COL]:   (a.value || 0) - (a.debt || 0),
    [LIQ_COL]:   a.liquidity || "",
    [YIELD_COL]: a.yieldPct || 0,
    [METH_COL]:  a.valuationMethod || "market",
    [NOTE_COL]:  a.note || "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  autoWidth(ws, rows);

  // Style header row bold (xlsx community edition doesn't support rich styles,
  // but we can set column widths and freeze the first row)
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vermögensübersicht");
  XLSX.writeFile(wb, `Vermogen_${date}.xlsx`);
};

// Returns array of { imported, matched (existing asset | null), action: "update"|"create" }
export const parseImportFile = (file, existingAssets, owners) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden"));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!rows.length) { reject(new Error("Keine Daten in der Datei")); return; }

        const result = rows
          .filter(r => r[NAME_COL] && r[CLASS_COL])
          .map(r => {
            const name    = String(r[NAME_COL]).trim();
            const value   = parseFloat(r[VAL_COL])  || 0;
            const debt    = parseFloat(r[DEBT_COL])  || 0;
            const yieldPct = parseFloat(r[YIELD_COL]) || 0;
            const liquidity = String(r[LIQ_COL] || "").trim();
            const note    = String(r[NOTE_COL] || "").trim();
            const ownership = parseOwnership(String(r[OWN_COL] || ""), owners);

            const matched = existingAssets.find(a => a.name.trim() === name) || null;
            return {
              imported: { name, class: String(r[CLASS_COL]), value, debt, yieldPct, liquidity, note, ownership },
              matched,
              action: matched ? "update" : "create",
            };
          });

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
