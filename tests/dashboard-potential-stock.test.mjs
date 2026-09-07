import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
const page = await readFile(new URL("app/page.tsx", root), "utf8");
const styles = await readFile(new URL("app/globals.css", root), "utf8");

test("potensi stok menjumlahkan posisi cutting, jahit, dan QC", () => {
  assert.match(page, /potentialStockRows = \[\s*\.\.\.cuttingWarehouseRows,\s*\.\.\.sewingVendorRows,\s*\.\.\.qcProcessRows/);
  assert.match(page, /summaryPotentialStock = rowsUnits\(potentialStockRows\)/);
  assert.match(page, /potentialStock: \{ label: "Potensi Stok", rows: potentialStockRows \}/);
  assert.match(page, /gudang cutting \+ sedang dijahit \+ sedang QC/);
});

test("total cutting dan potensi stok berbagi baris KPI secara proporsional", () => {
  assert.match(styles, /article\.cutting-summary-card\s*\{[\s\S]*?grid-column:\s*span 3/);
  assert.match(styles, /article\.potential-stock-summary-card\s*\{[\s\S]*?grid-column:\s*span 3/);
});
