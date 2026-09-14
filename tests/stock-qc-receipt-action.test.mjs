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

test("penerimaan stok menghitung sisa hasil QC per warna dan ukuran", () => {
  const routed = page.slice(
    page.indexOf("function routedVariants"),
    page.indexOf("function autoBundle"),
  );
  const availability = page.slice(
    page.indexOf("function sourceAvailable"),
    page.indexOf("function openRecord"),
  );
  const stockAvailability = availability.slice(
    availability.indexOf('if (stage === "Stok Barang Jadi")'),
    availability.indexOf('if (stage === "Karantina Reject")'),
  );
  assert.match(routed, /const alreadyReceived = \(data\.records\["Stok Barang Jadi"\] \?\? \[\]\)/);
  assert.match(routed, /\.filter\(\(x\) => x\.sourceId === source\.id\)/);
  assert.match(routed, /return subtractVariants\(passed, alreadyReceived\)/);
  assert.match(stockAvailability, /stage === "Stok Barang Jadi"/);
  assert.match(stockAvailability, /routedVariants\("Stok Barang Jadi", source\)/);
  assert.doesNotMatch(stockAvailability, /x\.sourceId === source\.id/);
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
  assert.match(page, /primaryLabel = row\.stage === "Cutting" && compact \? "Order Produksi" : "Cutting"/);
  assert.match(page, /Bundle\/Lot: \{reference\.bundle\}/);
  assert.match(page, /!compact && <small>Sumber: \{reference\.source\}<\/small>/);
  assert.match(page, /"Asal Produksi"/);
  assert.match(page, /records=\{data\.records\} compact/);
  const usages = page.match(/<UnifiedTransactionReferenceCell row=\{row\}/g) ?? [];
  assert.equal(usages.length, 2);
});
