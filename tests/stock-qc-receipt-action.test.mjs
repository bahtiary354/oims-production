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

test("persediaan tidak menampilkan ulang bagian transaksi selesai", () => {
  const inventoryPanel = page.slice(
    page.indexOf("function StockInventoryPanel"),
    page.indexOf("function StagePage"),
  );
  assert.doesNotMatch(inventoryPanel, /Transaksi selesai/i);
  assert.match(page, /active !== "Stok Barang Jadi" && <LiveStageStatus/);
  assert.match(
    page,
    /'Penerimaan Gudang', 'Stok Barang Jadi'\]\.includes\(active\).*mode="completed"/s,
  );
});

test("mutasi dan laporan operasional memakai referensi transaksi yang sama", () => {
  assert.match(page, /function unifiedTransactionReference\(/);
  assert.match(page, /Cutting: \{reference\.cutting\}/);
  assert.match(page, /Bundle\/Lot: \{reference\.bundle\}/);
  assert.match(page, /Sumber: \{reference\.source\}/);
  const usages = page.match(/<UnifiedTransactionReferenceCell row=\{row\}/g) ?? [];
  assert.equal(usages.length, 2);
});
