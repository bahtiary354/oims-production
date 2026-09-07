import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("halaman persediaan menyediakan aksi penerimaan hasil QC", () => {
  assert.match(page, /pendingStockSources=\{/);
  assert.match(page, /sourceAvailable\(active, source\)/);
  assert.match(page, /\+ Stock/);
  assert.match(page, /onClick=\{onReceive\}/);
  assert.match(page, /disabled=\{pendingSources\.length === 0\}/);
});

test("penerimaan stok memakai pengaman sumber QC yang sudah pernah dibukukan", () => {
  const availability = page.slice(
    page.indexOf("function sourceAvailable"),
    page.indexOf("function openRecord"),
  );
  assert.match(availability, /stage === "Stok Barang Jadi"/);
  assert.match(availability, /routedVariants\("Stok Barang Jadi", source\)/);
  assert.match(availability, /data\.records\["Stok Barang Jadi"\]/);
  assert.match(availability, /x\.sourceId === source\.id/);
});
