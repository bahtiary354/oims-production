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
  for (const stage of [
    "Order Produksi",
    "Cutting",
    "Bundle",
    "Pengiriman Vendor",
    "Penerimaan Gudang",
    "Pengiriman QC",
    "Quality Control",
    "Rework",
    "Stok Barang Jadi",
  ]) {
    assert.match(page, new RegExp(stage));
  }
  assert.match(page, /Jumlah .*harus sama persis dengan transaksi sumber/);
  assert.match(
    page,
    /\[\s*"Pengiriman Vendor",\s*"Penerimaan Gudang",\s*"Pengiriman QC",?\s*\]/,
  );
  assert.match(page, /DASHBOARD OWNER · POSISI FISIK UNIT/);
  assert.match(page, /BREAKDOWN POSISI UNIT/);
  assert.match(page, /Gudang & Quality Control/);
  assert.match(page, /Nomor PO, artikel, warna, ukuran/);
  assert.match(page, /QC langsung di lokasi vendor/);
  assert.match(page, /Hasil QC vendor harus terbagi tepat/);
  assert.match(page, /Selesai diperiksa di vendor/);
  assert.match(page, /qcMode\s*!==\s*"vendor"/);
  assert.match(page, /className="print-detail-table"/);
  assert.match(page, /NOMOR SURAT JALAN/);
  assert.match(page, /colors\.map\(\(c,\s*index\)/);
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(
    css,
    /\.print-detail-table th,\s*\.print-detail-table td\s*\{\s*font-size:\s*14px/,
  );
  assert.match(css, /\.print-head h1\s*\{\s*font-size:\s*22px/);
  assert.doesNotMatch(page, /className="mobile-bottom-nav"/);
  assert.match(page, /aria-label="Buka semua menu"/);
  assert.match(css, /\.app-side\.mobile-open/);
  assert.match(
    css,
    /\.overlay\s*\{[\s\S]*?z-index:\s*120;[\s\S]*?padding:\s*10px/,
  );
  assert.match(
    css,
    /\.page-title \.overline,\s*\.page-title h1\s*\{\s*display:\s*none/,
  );
  assert.doesNotMatch(css, /mobile-bottom-nav/);
  assert.match(css, /grid-template-columns:\s*repeat\(5,\s*1fr\)/);
  assert.match(
    page,
    /\[\s*"▥",\s*"Laporan"\s*\],\s*\[\s*"▤",\s*"Surat Jalan"\s*\]/,
  );
  const navBlock = page.match(/const nav = \[[\s\S]*?\n\];/)?.[0];
  assert.ok(navBlock, "primary navigation should be defined");
  assert.match(navBlock, /Master QC/);
  assert.match(navBlock, /Master PIC/);
  assert.match(navBlock, /Pengiriman QC/);
  assert.match(navBlock, /Rework/);
  assert.match(navBlock, /Stok Barang Jadi/);
  assert.doesNotMatch(page, /Pekerjaan berikutnya/);
  assert.doesNotMatch(page, /Geser ke samping untuk melihat alur PO/);
  assert.doesNotMatch(page, /ALUR PRODUKSI/);
  assert.doesNotMatch(page, /className="owner-health"/);
  assert.doesNotMatch(page, /TAHAP AKTIF/);
  assert.match(page, /Aktivitas periode/);
  assert.match(page, /Hanya menyaring aktivitas/);
  assert.match(page, /Hari ini/);
  assert.match(page, /Minggu ini/);
  assert.match(page, /Bulan ini/);
  assert.match(page, /periodRows\("Pengiriman Vendor"\)/);
  assert.match(page, /periodRows\("Penerimaan Gudang"\)/);
  assert.match(page, /periodRows\("Stok Barang Jadi"\)/);
  assert.match(page, /Stok jadi & potensi produksi/);
  assert.match(page, /STOK JADI AKTUAL/);
  assert.match(page, /SIAP MASUK STOK/);
  assert.match(page, /POTENSI STOK AKHIR/);
  assert.match(page, /compareSizes/);
  assert.match(page, /\.sort\(\(a, b\) => compareSizes\(a\.size, b\.size\)\)/);
  assert.match(page, /futurePotential/);
  assert.match(page, /stockOutlook/);
  assert.match(page, /traceStockVendor/);
  assert.match(page, /className="stock-color-group"/);
  assert.match(page, /model\.colorGroups\.map/);
  assert.match(page, /group\.projected.*unit potensi akhir/);
  assert.match(page, /const boardCards = cards\.filter/);
  assert.match(css, /\.stock-color-group/);
  assert.match(css, /background:\s*#ffffff/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(page, /Isi seluruh sisa setoran/);
  assert.match(page, /Lolos semua/);
  assert.match(css, /2026 visual refresh/);
  assert.match(css, /--green:\s*#2563eb/);
  assert.match(page, /QC Vendor Selesai/);
  assert.match(page, /Lolos · Belum Stok/);
  assert.match(page, /Rework:\s*withBalance/);
  assert.match(page, /Penerimaan Rework/);
  assert.match(page, /QC Ulang/);
  assert.match(page, /Karantina Reject/);
  assert.match(page, /qty:\s*x\.repair/);
  assert.match(page, /className="production-board"/);
  assert.match(page, /Posisi pekerjaan saat ini/);
  assert.match(page, /RINCIAN TAHAP/);
  assert.match(css, /grid-auto-flow:\s*column/);
  assert.match(css, /grid-auto-columns:\s*82vw/);
  assert.match(page, /automaticModelCode/);
  assert.match(page, /Kode terkunci karena sudah digunakan dalam PO/);
  assert.match(
    page,
    /Dibuat otomatis, tetapi masih dapat diganti sebelum digunakan dalam PO/,
  );
  assert.match(page, /x\.modelCode\s*===\s*editingCode/);
  assert.match(page, /qcLocationForReceipt/);
  assert.match(page, /Vendor Jahit & Pengaturan QC/);
  assert.match(page, /Tujuan QC masih dipakai vendor/);
  assert.match(page, /Pilih bundle dalam surat jalan ini/);
  assert.match(page, /bundleIds:\s*bundles\.map/);
  assert.match(page, /deliveryNoteId/);
  assert.match(page, /BDL-\$\{model\.code\}-\$\{poToken/);
  assert.match(css, /\.shipment-bundle-picker/);
  assert.match(page, /remainingAtPO/);
  assert.match(page, /CUT-\$\{model\.code\}-\$\{poToken/);
  assert.match(page, /PO-\$\{model\.code\}-\$\{periodYYMM/);
  assert.match(
    page,
    /KRM.*nextLotCode|nextLotCode\("Pengiriman Vendor", "KRM"/s,
  );
  assert.match(page, /function traceBundleId/);
  assert.match(page, /Bundle \/ Lot/);
  assert.match(page, /function BundleLabel/);
  assert.match(page, /Cetak Thermal 80 mm/);
  assert.match(page, /PIC \/ Penanggung jawab Bundle/);
  assert.match(page, /className="bundle-print-button"/);
  assert.match(css, /@page bundle-label/);
  assert.match(css, /size:\s*80mm auto/);
  assert.match(page, /bundleId: active === "Bundle" \? recordId/);
  assert.match(page, /Potong seluruh sisa PO/);
  assert.match(page, /PO masih memiliki sisa Cutting/);
  assert.match(page, /PIC \/ Penanggung jawab/);
  assert.match(page, /Pilih PIC/);
  assert.match(page, /deletePIC/);
  assert.doesNotMatch(
    page,
    /PO ini sudah dibukukan di Cutting\. Gunakan PO baru/,
  );
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
  assert.match(route, /pics: \[\]/);
  assert.match(route, /Array\.isArray\(saved\.pics\)/);
  assert.match(route, /resolvePO/);
  assert.match(route, /resolveBundle/);
  assert.match(route, /bundleId: resolveBundle/);
  assert.match(route, /records: \{\}/);
  assert.match(route, /notes: \[\]/);
  assert.match(route, /normalizeState/);
  assert.doesNotMatch(route, /saved\.dataVersion !== 3/);
  assert.match(route, /id:\s*2,\s*payload:\s*current\.payload/);
  assert.match(route, /state saved with backup/);
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /deleteModel/);
  assert.match(page, /deleteVendor/);
  assert.match(page, /deleteQCLocation/);
  assert.match(page, /deletePIC/);
  assert.match(route, /from\("app_state"\)/);
  assert.match(database, /createClient/);
  assert.match(database, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(database, /cloudflare:workers/);
  assert.equal(JSON.parse(packageJson).scripts.build, "next build");
});
