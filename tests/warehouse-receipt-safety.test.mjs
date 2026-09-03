import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("form penerimaan dimulai tanpa transaksi sumber otomatis", () => {
  assert.match(
    page,
    /const first =\s*active === "Penerimaan Gudang"\s*\? undefined/,
  );
  assert.match(page, /<option value="">Pilih transaksi sumber<\/option>/);
});

test("penerimaan memakai tombol final yang jelas", () => {
  assert.match(
    page,
    /active === "Penerimaan Gudang"\s*\? "Simpan penerimaan"/,
  );
});

test("penerimaan meminta konfirmasi berisi ringkasan penting", () => {
  assert.match(page, /"Konfirmasi penerimaan gudang"/);
  assert.match(page, /`Vendor: \$\{source\.destination/);
  assert.match(page, /`Surat jalan: \$\{source\.deliveryNoteId/);
  assert.match(page, /`Model: \$\{model\.code\}/);
  assert.match(page, /"Rincian warna \/ ukuran:"/);
  assert.match(page, /if \(!confirmed\) return;/);
});
