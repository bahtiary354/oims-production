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
  assert.match(page, /QC langsung di lokasi vendor/);
  assert.match(page, /Hasil QC vendor harus terbagi tepat/);
  assert.match(page, /Selesai diperiksa di vendor/);
  assert.match(page, /qcMode!=="vendor"/);
  assert.match(page, /className="print-detail-table"/);
  assert.match(page, /NOMOR SURAT JALAN/);
  assert.match(page, /colors\.map\(\(c,index\)/);
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(css, /\.print-detail-table th,\.print-detail-table td\{font-size:14px/);
  assert.match(css, /\.print-head h1\{font-size:22px/);
  assert.match(page, /className="mobile-bottom-nav"/);
  assert.match(page, /aria-label="Buka semua menu"/);
  assert.match(css, /\.app-side\.mobile-open/);
  assert.match(css, /grid-template-columns:repeat\(5,1fr\)/);
  assert.match(page, /\["▥","Laporan"\],\["▤","Surat Jalan"\]\]/);
});

test("one-time reset clears all data and masters remain manageable", async () => {
  const [route, database, packageJson] = await Promise.all([
    readFile(new URL("app/api/state/route.ts", root), "utf8"),
    readFile(new URL("db/index.ts", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.match(route, /dataVersion: 3/);
  assert.match(route, /models: \[\]/);
  assert.match(route, /vendors: \[\]/);
  assert.match(route, /qcLocations: \[\]/);
  assert.match(route, /records: \{\}/);
  assert.match(route, /notes: \[\]/);
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /deleteModel/);
  assert.match(page, /deleteVendor/);
  assert.match(page, /deleteQCLocation/);
  assert.match(route, /from\("app_state"\)/);
  assert.match(database, /createClient/);
  assert.match(database, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(database, /cloudflare:workers/);
  assert.equal(JSON.parse(packageJson).scripts.build, "next build");
});
