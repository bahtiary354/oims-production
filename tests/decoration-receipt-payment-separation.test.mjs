import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8",
);

test("pekerjaan dekorasi baru selalu dimulai tanpa pembayaran", () => {
  assert.match(
    pageSource,
    /active === "Sablon\/Bordir"\s*\? 0\s*: undefined/,
  );
});

test("edit pekerjaan mempertahankan histori keuangan tanpa membuat pembayaran", () => {
  assert.match(pageSource, /paymentHistory: previousDecoration\.paymentHistory/);
  assert.match(pageSource, /paidAmount: previousDecoration\.paidAmount/);
  assert.match(pageSource, /paymentDate: previousDecoration\.paymentDate/);
});

test("form pekerjaan tidak menyediakan jalur pembayaran awal", () => {
  assert.doesNotMatch(pageSource, />\s*Pembayaran awal\s*</);
});
