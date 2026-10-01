import { describe, it, expect } from "vitest";
import { buildAssetsWorkbook, parseImportBuffer } from "../src/utils/excelIO.js";

const owners = [{ id: "a", label: "Anna" }, { id: "b", label: "Ben" }];
const assets = [
  { id: "1", name: "Welt-ETF", class: "Aktien-ETF", ownership: [{ ownerId: "a", share: 0.6 }, { ownerId: "b", share: 0.4 }], value: 300000, debt: 50000, liquidity: "Liquide", yieldPct: 0, note: "Sparplan" },
  { id: "2", name: "Tagesgeld", class: "Cash", ownership: [{ ownerId: "b", share: 1 }], value: 12000, debt: 0, liquidity: "Liquide", yieldPct: 2 },
];

describe("Excel export → import round trip", () => {
  it("restores values, ownership and matches existing positions by name", async () => {
    const wb = await buildAssetsWorkbook(assets, owners, "2026-06-15");
    const buf = await wb.xlsx.writeBuffer();
    const rows = await parseImportBuffer(buf, [assets[0]], owners);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ action: "update", matched: { id: "1" },
      imported: { name: "Welt-ETF", class: "Aktien-ETF", value: 300000, debt: 50000, note: "Sparplan",
        ownership: [{ ownerId: "a", share: 0.6 }, { ownerId: "b", share: 0.4 }] } });
    expect(rows[1]).toMatchObject({ action: "create", matched: null, imported: { name: "Tagesgeld", value: 12000, yieldPct: 2, ownership: [{ ownerId: "b", share: 1 }] } });
  });
});
