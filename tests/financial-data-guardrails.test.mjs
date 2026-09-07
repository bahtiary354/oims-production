import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("payment account and QC rate snapshots are frozen for new records", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /bankName: account\?\.bankName/);
  assert.match(page, /accountNumber: account\?\.accountNumber/);
  assert.match(page, /accountHolder: account\?\.accountHolder \|\| weeklyDraft\.payee/);
  assert.match(page, /const frozenRates = new Map\(lines\.map/);
  assert.match(page, /\{ \.\.\.record, qcRate: frozenRates\.get\(record\.id\) \}/);
});

test("old and new payment formats use centralized non-destructive readers", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /function weeklyPaymentPaidAmount/);
  assert.match(page, /payment\.paymentAmount \?\? payment\.totalAmount/);
  assert.match(page, /function weeklyLinePaidAmount/);
  assert.match(page, /if \(line\.paymentAmount !== undefined\) return line\.paymentAmount/);
  assert.match(page, /weeklyPaymentPaidAmount\(payment\) \/ payment\.totalAmount/);
  assert.match(page, /Tidak tersimpan pada bukti ini/);
});

test("incomplete transfer accounts are visible and link to the correct master", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(page, /function hasCompleteTransferAccount/);
  assert.match(page, /Lengkapi bank, nomor, dan nama pemilik/);
  assert.match(page, /selectedFinanceRow\.type === "Cutting" \? "Master PIC"/);
  assert.match(page, /selectedFinanceRow\.type === "Quality Control" \? "Master QC" : "Master Vendor"/);
  assert.match(css, /\.finance-drawer-account\.incomplete/);
  assert.match(css, /\.master-account-warning/);
});
