import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8",
);

function outstandingPayments(rows) {
  return rows.filter((row) => row.rate <= 0 || row.paid < row.units * row.rate);
}

test("transaksi vendor yang sama tidak digabung dan nomor tetap berurutan", () => {
  const rows = [
    { id: "TRM-SUP-B001-S01", vendor: "Ciparay", units: 20, rate: 25_000, paid: 500_000 },
    { id: "TRM-SUP-B002-S01", vendor: "Ciparay", units: 10, rate: 25_000, paid: 100_000 },
  ];
  const active = outstandingPayments(rows);

  assert.equal(active.length, 1);
  assert.equal(active[0].id, "TRM-SUP-B002-S01");
  assert.equal(active[0].units * active[0].rate - active[0].paid, 150_000);
});

test("kode menjaga saldo per ID dan membatasi gabungan hanya untuk dekorasi", () => {
  assert.match(pageSource, /const paymentGroupKey = row\.id/);
  assert.match(pageSource, /weeklyDraft\.rows\.length !== 1 && weeklyDraft\.kind !== "decoration"/);
  assert.match(pageSource, /Pembayaran gabungan hanya dapat dibuat untuk satu vendor yang sama/);
  assert.match(
    pageSource,
    /new Set\(weeklyDraft\.rows\.map\(\(row\) => row\.id\)\)/,
  );
  assert.match(pageSource, /Pembayaran transaksi jahit \$\{receipt\.id\}/);
  assert.match(pageSource, /Pembayaran transaksi dekorasi \$\{receipt\.id\}/);
});

test("pembayaran dipusatkan di laporan dan modul operasional hanya menampilkan ringkasan", () => {
  assert.match(pageSource, /className="operational-payment-summary"/);
  assert.match(pageSource, /Pembayaran dikelola di Laporan/);
  assert.match(pageSource, /onOpenPayments=\{\(\) => navigate\("Laporan Keuangan"\)\}/);
  assert.doesNotMatch(pageSource, /operational-transaction-payment-table/);
  assert.match(pageSource, /createPaymentFromReport/);
  assert.match(pageSource, /Catat pembayaran dari laporan/);
});
