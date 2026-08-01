import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("production app has correct metadata and connected workflow", async () => {
  const [layout, page] = await Promise.all([
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);
  assert.match(layout, /Oims Production Management/);
  for (const stage of ["Order Produksi", "Cutting", "Bundle", "Pengiriman Vendor", "Penerimaan Gudang", "Pengiriman QC", "Quality Control", "Rework", "Stok Barang Jadi"]) {
    assert.match(page, new RegExp(stage));
  }
  assert.match(page, /Jumlah .*harus sama persis dengan transaksi sumber/);
  assert.match(page, /\["Pengiriman Vendor","Penerimaan Gudang","Pengiriman QC"\]/);
  assert.match(page, /DASHBOARD OWNER · POSISI FISIK UNIT/);
  assert.match(page, /BREAKDOWN POSISI UNIT/);
  assert.match(page, /Gudang & Quality Control/);
  assert.match(page, /Nomor PO, artikel, warna, ukuran/);
});

test("one-time reset preserves masters and clears transactions", async () => {
  const route = await readFile(new URL("app/api/state/route.ts", root), "utf8");
  assert.match(route, /models: saved\.models/);
  assert.match(route, /vendors: saved\.vendors/);
  assert.match(route, /qcLocations: saved\.qcLocations/);
  assert.match(route, /records: \{\}/);
  assert.match(route, /notes: \[\]/);
});
