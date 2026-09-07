import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("finance report presents bills per transaction instead of vendor period", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(page, /const financeTransactionDrafts: FinanceWeekDraft\[\] = \[\]/);
  assert.match(page, /key: `\$\{type\}\|\$\{row\.id\}`/);
  assert.match(page, /transactionId: record\.id/);
  assert.match(page, /transactionDate: record\.date/);
  assert.match(page, /financeLedgerRows\.find\(\(row\) => row\.key === expandedFinanceRow\)/);
  assert.match(page, /<th>Kode Transaksi<\/th>/);
  assert.match(page, /Tagihan transaksi/);
  assert.doesNotMatch(page, /const transferMap = new Map/);
  assert.doesNotMatch(page, /const weeklyTransferMap = new Map/);
});

test("central payment history splits a payment document into transaction rows", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(page, /data\.weeklyPayments\.flatMap\(\(payment\) => payment\.lines\.map/);
  assert.match(page, /key: `weekly:\$\{payment\.id\}:\$\{line\.recordId\}`/);
  assert.match(page, /transactionCount: 1/);
  assert.match(page, /lines: \[transactionLine\]/);
  assert.match(page, /"Kode transaksi"/);
  assert.match(page, /row\.lines\[0\]\?\.recordId/);
});
