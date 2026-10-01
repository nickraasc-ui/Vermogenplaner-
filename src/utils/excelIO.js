// Excel export/import of positions (ExcelJS, loaded on demand so it stays out of the main bundle).
// Round trip: a file exported here can be edited in Excel and imported again (matched by position name).

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
const COLUMNS = [DATE_COL, NAME_COL, CLASS_COL, OWN_COL, VAL_COL, DEBT_COL, NET_COL, LIQ_COL, YIELD_COL, METH_COL, NOTE_COL];
const SHEET_NAME = "Vermögensübersicht";

const loadExcelJS = async () => (await import("exceljs")).default;

// "Anna 60%, Ben 40%" or "Anna" (single owner)
const ownershipLabel = (asset, owners) => {
  const ownership = asset.ownership || [];
  return ownership.map(o => {
    const label = owners.find(x => x.id === o.ownerId)?.label || o.ownerId;
    return ownership.length > 1 ? `${label} ${Math.round(o.share * 100)}%` : label;
  }).join(", ");
};

// Inverse of ownershipLabel; unknown names are dropped
const parseOwnership = (str, owners) => {
  if (!str) return [];
  const find = (label) => owners.find(o => o.label === label || o.id === label.toLowerCase().replace(/\s+/g, "_"));
  return str.split(",").map(s => s.trim()).filter(Boolean).map(part => {
    const m = part.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s?%$/);
    const owner = find(m ? m[1].trim() : part);
    return owner ? { ownerId: owner.id, share: m ? parseFloat(m[2].replace(",", ".")) / 100 : 1 } : null;
  }).filter(Boolean);
};

/** Builds the export workbook (exported for tests). */
export async function buildAssetsWorkbook(assets, owners, date = new Date().toISOString().slice(0, 10)) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(SHEET_NAME, { views: [{ state: "frozen", ySplit: 1 }] });
  const rows = assets.map(a => ({
    [DATE_COL]: date, [NAME_COL]: a.name, [CLASS_COL]: a.class, [OWN_COL]: ownershipLabel(a, owners),
    [VAL_COL]: a.value || 0, [DEBT_COL]: a.debt || 0, [NET_COL]: (a.value || 0) - (a.debt || 0),
    [LIQ_COL]: a.liquidity || "", [YIELD_COL]: a.yieldPct || 0, [METH_COL]: a.valuationMethod || "market", [NOTE_COL]: a.note || "",
  }));
  ws.columns = COLUMNS.map(key => ({
    header: key, key,
    width: Math.max(key.length, ...rows.map(r => String(r[key] ?? "").length)) + 2,
  }));
  ws.getRow(1).font = { bold: true };
  rows.forEach(r => ws.addRow(r));
  return wb;
}

export async function exportAssetsToExcel(assets, owners) {
  const date = new Date().toISOString().slice(0, 10);
  const wb = await buildAssetsWorkbook(assets, owners, date);
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url; link.download = `Vermogen_${date}.xlsx`; link.click();
  URL.revokeObjectURL(url);
}

// ExcelJS cell values can be formula results, rich text or hyperlinks
const cellValue = (v) => {
  if (v && typeof v === "object") {
    if ("result" in v) return v.result;
    if (Array.isArray(v.richText)) return v.richText.map(t => t.text).join("");
    if ("text" in v) return v.text;
  }
  return v ?? "";
};
const toNumber = (v) => {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/\./g, "").replace(",", ".")); // also accepts "1.234,5"
  return Number.isFinite(n) ? n : 0;
};

/**
 * Parses an exported/edited workbook. Returns [{ imported, matched (existing asset | null), action: "update"|"create" }].
 * Rows need at least a name and an asset class.
 */
export async function parseImportBuffer(buffer, existingAssets, owners) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Keine Tabelle in der Datei");
  const header = (ws.getRow(1).values || []).map(cellValue).map(String);
  const rows = [];
  ws.eachRow((row, i) => {
    if (i === 1) return;
    const obj = {};
    header.forEach((h, col) => { if (h) obj[h] = cellValue(row.getCell(col).value); });
    rows.push(obj);
  });
  if (!rows.length) throw new Error("Keine Daten in der Datei");

  return rows.filter(r => r[NAME_COL] && r[CLASS_COL]).map(r => {
    const name = String(r[NAME_COL]).trim();
    const matched = existingAssets.find(a => a.name.trim() === name) || null;
    return {
      imported: {
        name, class: String(r[CLASS_COL]).trim(),
        value: toNumber(r[VAL_COL]), debt: toNumber(r[DEBT_COL]), yieldPct: toNumber(r[YIELD_COL]),
        liquidity: String(r[LIQ_COL] || "").trim(), note: String(r[NOTE_COL] || "").trim(),
        ownership: parseOwnership(String(r[OWN_COL] || ""), owners),
      },
      matched,
      action: matched ? "update" : "create",
    };
  });
}

export async function parseImportFile(file, existingAssets, owners) {
  return parseImportBuffer(await file.arrayBuffer(), existingAssets, owners);
}
