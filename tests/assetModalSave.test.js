import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// The save handler lives inside the modal component; guard the regression at source level.
describe("AssetModal save", () => {
  it("stores the entered loan rate, including 0 %", () => {
    const src = readFileSync(new URL("../src/components/modals/AssetModal.jsx", import.meta.url), "utf8");
    expect(src).toMatch(/loanRate: saveRate,/);
    expect(src).not.toMatch(/saveRate \|\| 3\.5/);
  });
});
