import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const page = await readFile(new URL("app/page.tsx", root), "utf8");

test("semua pusat laporan menyediakan ekspor CSV sesuai filter periode", () => {
  assert.match(page, /function exportFinanceCSV\(\)/);
  assert.match(page, /function exportOperationalCSV\(\)/);
  assert.match(page, /paymentRows\.filter\(\(payment\) => inPeriod\(payment\.date\)\)/);
  assert.match(page, /reportTab === "production" && <button type="button" onClick=\{exportOperationalCSV\}>Ekspor CSV<\/button>/);
  assert.match(page, /payment-history-export" onClick=\{exportCSV\}>Ekspor Excel\/CSV/);
  assert.match(page, /report-header-actions"><button type="button" onClick=\{exportOperationalCSV\}>Ekspor CSV/);
  assert.match(page, /report-header-actions"><button type="button" onClick=\{exportCSV\}>Ekspor CSV/);
  assert.match(page, /onClick=\{exportFinanceCSV\}>Ekspor CSV/);
  assert.match(page, /<option value="custom">Custom<\/option>/);
  assert.match(page, /Tanggal mulai laporan operasional/);
  assert.match(page, /Tanggal selesai laporan operasional/);
  assert.match(page, /Tanggal mulai laporan keuangan/);
  assert.match(page, /Tanggal selesai laporan keuangan/);
  assert.match(page, /Tanggal mulai/);
  assert.match(page, /Tanggal selesai/);
});

test("CSV operasional memuat rincian transaksi dan nama file rentang tanggal", () => {
  assert.match(page, /"Cutting", "Bundle\/Lot", "Sumber"/);
  assert.match(page, /variant\.color/);
  assert.match(page, /variant\.size/);
  assert.match(page, /variant\.qty/);
  assert.match(page, /laporan-operasional-\$\{operationalProcess/);
  assert.match(page, /\$\{rangeStart \|\| "semua"\}-\$\{rangeEnd \|\| "waktu"\}\.csv/);
  assert.match(page, /riwayat-pembayaran-oims-\$\{startDate \|\| "semua"\}-\$\{endDate \|\| "waktu"\}\.csv/);
  assert.match(page, /\\uFEFF/);
  assert.match(page, /replaceAll\('\"', '\"\"'\)/);
});
