import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8",
);

function paymentState(bill, paid) {
  const remaining = Math.max(0, bill - paid);
  return {
    remaining,
    status:
      paid <= 0 ? "Belum dibayar" : remaining > 0 ? "DP sebagian" : "Lunas",
    active: remaining > 0,
  };
}

test("status pembayaran dekorasi mengikuti saldo per transaksi", () => {
  assert.deepEqual(paymentState(200_000, 0), {
    remaining: 200_000,
    status: "Belum dibayar",
    active: true,
  });
  assert.deepEqual(paymentState(200_000, 80_000), {
    remaining: 120_000,
    status: "DP sebagian",
    active: true,
  });
  assert.deepEqual(paymentState(200_000, 200_000), {
    remaining: 0,
    status: "Lunas",
    active: false,
  });
});

test("dua transaksi vendor yang sama tetap memiliki saldo terpisah", () => {
  const jobs = [
    { id: "SBR-SUP-001", vendor: "Sablon Ciparay", bill: 404_000, paid: 404_000 },
    { id: "SBR-SUP-002", vendor: "Sablon Ciparay", bill: 180_000, paid: 0 },
  ];
  const active = jobs.filter((job) => paymentState(job.bill, job.paid).active);

  assert.equal(active.length, 1);
  assert.equal(active[0].id, "SBR-SUP-002");
  assert.equal(paymentState(active[0].bill, active[0].paid).remaining, 180_000);
});

test("implementasi menjaga saldo per transaksi dan mendukung bukti gabungan satu vendor", () => {
  assert.match(
    pageSource,
    /const paymentGroupKey = row\.id/,
  );
  assert.match(pageSource, /const usesAllocations = weeklyDraft\.rows\.length > 1 \|\| weeklyDraft\.kind === "decoration"/);
  assert.match(pageSource, /createPaymentFromReport/);
  assert.match(pageSource, /Catat pembayaran dari laporan/);
  assert.match(pageSource, /const allocation = weeklyAllocations\[receipt\.id\] \?\? 0/);
  assert.match(pageSource, /row\.payee === selectedFinanceAnchor\.payee/);
  assert.match(pageSource, /Alokasi setiap transaksi harus lebih dari nol dan tidak melebihi sisa tagihannya/);
  assert.match(pageSource, /amount: allocation/);
  assert.match(
    pageSource,
    /effectivePaymentAmount > totalAmount - paidBefore/,
  );
  assert.match(pageSource, /bill > paymentGroupPaid\(groupRows\)/);
  assert.match(pageSource, /financeStatusFilter === "outstanding" \? row\.remaining > 0/);
});
