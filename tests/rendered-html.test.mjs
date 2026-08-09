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
  assert.match(css, /\.overlay\{z-index:120;padding:10px\}/);
  assert.match(css, /grid-template-columns:repeat\(5,1fr\)/);
  assert.match(page, /\["▥","Laporan"\],\["▤","Surat Jalan"\]\]/);
  const navLine = page.split("\n").find((line) => line.startsWith("const nav = "));
  assert.ok(navLine, "primary navigation should be defined");
  assert.doesNotMatch(navLine, /Pengiriman QC|Rework|Stok Barang Jadi/);
  assert.doesNotMatch(navLine, /Master Tujuan QC/);
  assert.match(page, /Pekerjaan berikutnya/);
  assert.match(page, /PO menunggu Cutting/);
  assert.match(page, /Isi seluruh sisa setoran/);
  assert.match(page, /Lolos semua/);
  assert.match(css, /2026 visual refresh/);
  assert.match(css, /--green:#2563eb/);
  assert.match(page, /QC Vendor Selesai/);
  assert.match(page, /Lolos QC · Menunggu Stok/);
  assert.match(page, /Hasil lolos QC menunggu stok/);
  assert.match(page, /Rework:pendingReworkRows/);
  assert.match(page, /className="production-board"/);
  assert.match(page, /Posisi pekerjaan saat ini/);
  assert.match(page, /RINCIAN TAHAP/);
  assert.match(css, /grid-auto-flow:column/);
  assert.match(css, /grid-auto-columns:82vw/);
  assert.match(page, /automaticModelCode/);
  assert.match(page, /Kode terkunci karena sudah digunakan dalam PO/);
  assert.match(page, /Dibuat otomatis, tetapi masih dapat diganti sebelum digunakan dalam PO/);
  assert.match(page, /x\.modelCode===editingCode/);
  assert.match(page, /qcLocationForReceipt/);
  assert.match(page, /Vendor Jahit & Pengaturan QC/);
  assert.match(page, /Tujuan QC masih dipakai vendor/);
});

test("persistent state is normalized without destructive reads and masters remain manageable", async () => {
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
  assert.match(route, /normalizeState/);
  assert.doesNotMatch(route, /saved\.dataVersion !== 3/);
  assert.match(route, /id: 2, payload: current\.payload/);
  assert.match(route, /state saved with backup/);
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
