import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyDecorationReceipt,
  getDecorationReceiptState,
  validateDecorationReceiptInput,
} from "../lib/decoration-receipt.js";

const job = {
  id: "SBR-SUP-001",
  total: 10,
  decorationCompleted: 4,
  status: "Di vendor dekorasi",
};

test("penerimaan sebagian menaikkan selesai dan mengurangi sisa", () => {
  const result = applyDecorationReceipt(job, "3");
  assert.equal(result.ok, true);
  assert.equal(result.row.decorationCompleted, 7);
  assert.equal(result.remaining, 3);
  assert.equal(result.row.status, "Selesai sebagian");
  assert.equal(job.decorationCompleted, 4);
});

test("penerimaan sisa seluruhnya mengubah status menjadi selesai", () => {
  const result = applyDecorationReceipt(job, "6");
  assert.equal(result.ok, true);
  assert.equal(result.row.decorationCompleted, 10);
  assert.equal(result.remaining, 0);
  assert.equal(result.row.status, "Selesai");
});

test("penerimaan melebihi sisa ditolak", () => {
  const result = applyDecorationReceipt(job, "7");
  assert.deepEqual(result, {
    ok: false,
    message: "Jumlah penerimaan tidak boleh melebihi sisa 6 unit.",
  });
});

test("input kosong, nol, negatif, dan desimal ditolak", () => {
  for (const value of ["", "0", "-1", "1.5"]) {
    assert.equal(validateDecorationReceiptInput(value, 6).ok, false);
  }
});

test("saldo penerimaan dinormalisasi bila data lama tidak lengkap", () => {
  assert.deepEqual(getDecorationReceiptState({ total: 5, decorationCompleted: 99 }), {
    total: 5,
    completed: 5,
    remaining: 0,
  });
});

test("penerimaan kedua tidak dapat melewati saldo terbaru", () => {
  const first = applyDecorationReceipt(job, "6");
  assert.equal(first.ok, true);
  assert.equal(validateDecorationReceiptInput("1", first.remaining).ok, false);
});

test("UI penerimaan memakai dialog aplikasi, menangani gagal simpan, dan mengunci klik ganda", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const receiver = page.slice(page.indexOf("function receiveDecorationJob"), page.indexOf("async function resetSimulation"));
  assert.doesNotMatch(receiver, /window\.prompt/);
  assert.match(receiver, /setDecorationReceipt\(row\)/);
  assert.match(receiver, /setReceivingDecoration\(true\)/);
  assert.match(receiver, /Penerimaan belum tersimpan/);
  assert.match(page, /disabled=\{completedQty >= row\.total \|\| receivingDecorationId === row\.id\}/);
});
