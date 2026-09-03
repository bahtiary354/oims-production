import assert from "node:assert/strict";
import test from "node:test";

import { pageForPath, pathForPage } from "../lib/navigation.ts";

test("menu utama memiliki URL yang stabil", () => {
  assert.equal(pathForPage("Dashboard"), "/dashboard");
  assert.equal(pathForPage("Order Produksi"), "/produksi/order");
  assert.equal(pathForPage("Penerimaan Gudang"), "/vendor/penerimaan");
  assert.equal(pathForPage("Stok Barang Jadi"), "/persediaan/stok-jadi");
});

test("URL langsung membuka menu yang sesuai", () => {
  assert.equal(pageForPath("/dashboard"), "Dashboard");
  assert.equal(pageForPath("/vendor/penerimaan"), "Penerimaan Gudang");
  assert.equal(pageForPath("/persediaan/stok-jadi/"), "Stok Barang Jadi");
});

test("root dan URL tidak dikenal kembali ke dashboard", () => {
  assert.equal(pageForPath("/"), "Dashboard");
  assert.equal(pageForPath("/tidak-dikenal"), "Dashboard");
});
