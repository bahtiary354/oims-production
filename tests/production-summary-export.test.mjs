import assert from "node:assert/strict";
import test from "node:test";
import { buildProductionSummary, dashboardDetailCSV, productionSummaryCSV } from "../lib/production-summary.ts";

const variant = (qty) => [{ color: "Hitam", size: "M", qty }];
const record = (id, date, sourceId, qty, stage, extra = {}) => ({
  id, date, sourceId, variants: variant(qty), stage,
  modelCode: "SUP", modelName: "Supernova", ...extra,
});
const records = {
  Cutting: [record("cut", "2026-09-01", "", 10, "Cutting")],
  Bundle: [record("bundle", "2026-09-02", "cut", 8, "Bundle")],
  "Pengiriman Vendor": [record("send", "2026-09-03", "bundle", 6, "Pengiriman Vendor")],
  "Penerimaan Gudang": [record("receipt", "2026-09-04", "send", 2, "Penerimaan Gudang")],
  "Pengiriman QC": [record("qc-send", "2026-09-05", "receipt", 1, "Pengiriman QC")],
  "Quality Control": [record("qc", "2026-09-06", "qc-send", 1, "Quality Control", {
    qcDetails: [{ color: "Hitam", size: "M", passed: 1 }],
  })],
  "Stok Barang Jadi": [record("stock", "2026-09-07", "qc", 1, "Stok Barang Jadi")],
};

test("periode custom hanya membatasi hasil cutting, sementara posisi dihitung sampai tanggal akhir", () => {
  const beforeQC = buildProductionSummary(records, "2026-09-01", "2026-09-05");
  assert.deepEqual(beforeQC.totals, { cutting: 10, warehouse: 4, sewing: 4, qc: 2, stock: 0 });

  const afterStock = buildProductionSummary(records, "2026-09-05", "2026-09-07");
  assert.deepEqual(afterStock.totals, { cutting: 0, warehouse: 4, sewing: 4, qc: 1, stock: 1 });
  assert.deepEqual(afterStock.lines.map(({ modelCode, color, size }) => ({ modelCode, color, size })), [
    { modelCode: "SUP", color: "Hitam", size: "M" },
  ]);
});

test("QC di vendor tidak dihitung ganda dan stok yang belum terjadi tidak muncul", () => {
  const vendorRecords = {
    ...records,
    "Pengiriman Vendor": [record("send", "2026-09-03", "bundle", 6, "Pengiriman Vendor")],
    "Penerimaan Gudang": [record("receipt", "2026-09-04", "send", 6, "Penerimaan Gudang", { qcMode: "vendor" })],
    "Quality Control": [record("qc", "2026-09-04", "receipt", 6, "Quality Control", {
      qcDetails: [{ color: "Hitam", size: "M", passed: 6 }],
    })],
    "Pengiriman QC": [],
    "Stok Barang Jadi": [record("stock", "2026-09-07", "qc", 6, "Stok Barang Jadi")],
  };
  assert.equal(buildProductionSummary(vendorRecords, "2026-09-01", "2026-09-05").totals.qc, 6);
  const afterStock = buildProductionSummary(vendorRecords, "2026-09-01", "2026-09-07");
  assert.equal(afterStock.totals.qc, 0);
  assert.equal(afterStock.totals.stock, 6);
});

test("CSV memuat periode, kolom posisi, total, dan melindungi sel yang dapat menjadi rumus", () => {
  const summary = buildProductionSummary({
    Cutting: [record("cut", "2026-09-01", "", 2, "Cutting", { modelName: '=SUM(1,2) "uji"' })],
  }, "2026-09-01", "2026-09-30");
  const csv = productionSummaryCSV(summary);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"Periode cutting";"2026-09-01";"s\.d\.";"2026-09-30"/);
  assert.match(csv, /"Sedang dijahit";"QC\/finishing";"Stok jadi"/);
  assert.match(csv, /"'=SUM\(1,2\) ""uji"""/);
  assert.match(csv, /"TOTAL";"";"";"";"2";"2";"0";"0";"0"/);
});

test("tanggal terbalik ditolak", () => {
  assert.throws(() => buildProductionSummary(records, "2026-09-10", "2026-09-01"));
});

test("CSV rincian dashboard mengikuti tabel warna, ukuran, subtotal model, dan total", () => {
  const csv = dashboardDetailCSV({
    label: "Sedang Dijahit",
    scope: "Saldo posisi pada 2026-10-06",
    sizes: ["M", "L"],
    models: [
      {
        modelName: "Supernova", modelCode: "SUP", total: 8,
        colors: [
          { color: "Hitam", quantities: { M: 2, L: 3 }, total: 5 },
          { color: "Burgundy", quantities: { M: 0, L: 3 }, total: 3 },
        ],
      },
      {
        modelName: "Nordic", modelCode: "NORD", total: 4,
        colors: [{ color: "Olive", quantities: { M: 4 }, total: 4 }],
      },
    ],
    total: 12,
  });
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"Cakupan";"Saldo posisi pada 2026-10-06"/);
  assert.match(csv, /"Model";"SKU";"Warna";"M";"L";"Jumlah"/);
  assert.match(csv, /"Supernova";"SUP";"Hitam";"2";"3";"5"/);
  assert.match(csv, /"Supernova";"SUP";"Burgundy";"0";"3";"3"/);
  assert.match(csv, /"Total Supernova";"";"";"";"";"8"/);
  assert.match(csv, /"Nordic";"NORD";"Olive";"4";"0";"4"/);
  assert.match(csv, /"TOTAL";"";"";"";"";"12"$/);
});

test("CSV rincian dashboard melindungi nilai dinamis yang berawalan formula", () => {
  const csv = dashboardDetailCSV({
    label: "Cutting",
    scope: "Hasil cutting 2026-09-01 s.d. 2026-09-30",
    sizes: ["M"],
    models: [{ modelName: "=1+1", modelCode: "SUP", total: 1,
      colors: [{ color: "@HYPERLINK", quantities: { M: 1 }, total: 1 }],
    }],
    total: 1,
  });
  assert.match(csv, /"Cakupan";"Hasil cutting 2026-09-01 s\.d\. 2026-09-30"/);
  assert.match(csv, /"'=1\+1";"SUP";"'@HYPERLINK";"1";"1"/);
});
