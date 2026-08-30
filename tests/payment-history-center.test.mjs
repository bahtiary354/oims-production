import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("payment history is centralized without replacing its stored sources", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(page, /items:\s*\["Laporan Operasional",\s*"Laporan Keuangan",\s*"Riwayat Pembayaran"\]/);
  assert.match(page, /function centralizedPaymentHistory\(data: AppData\)/);
  assert.match(page, /function PaymentHistoryReport\(/);
  assert.match(page, /data\.weeklyPayments/);
  assert.match(page, /legacyPayment\(receipt\)/);
  assert.match(page, /weeklyIds\.has\(payment\.id\)/);
  assert.match(page, /active === "Riwayat Pembayaran"/);

  assert.doesNotMatch(page, /<details className="completed-cuttings weekly-payment-history">/);
  assert.match(page, /false && <section className="finance-ledger-panel finance-history-panel"/);
});

test("central payment history exposes filters, responsive table, detail, export, and cancellation audit", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);

  for (const text of [
    "Nomor rekap",
    "Tanggal pembukuan",
    "Pelaksana/vendor",
    "Tanggal mulai",
    "Tanggal selesai",
    "Semua proses",
    "Semua pelaksana",
    "Semua status",
    "Lihat rincian",
    "Ekspor Excel/CSV",
    "Batalkan rekap",
    "Daftar transaksi / batch",
    "Riwayat pembayaran",
  ]) assert.match(page, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(page, /voidedAt = new Date\(\)\.toISOString\(\)/);
  assert.match(page, /voidedBy = "Andi Rahman"/);
  assert.match(page, /voidReason: reason\.trim\(\)/);
  assert.match(page, /data\.records\[receipt\.stage\]/);
  assert.match(css, /\.centralized-payment-table-wrap\s*\{[\s\S]*?overflow-x:\s*auto/);
  assert.match(css, /\.centralized-payment-table\s*\{[\s\S]*?min-width:\s*1640px/);
});
