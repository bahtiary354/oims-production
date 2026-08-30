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
    "Sablon/Bordir",
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
  assert.match(page, /Referensi Cutting, artikel, warna, ukuran/);
  assert.match(page, /QC terpisah setelah barang masuk gudang/);
  assert.match(page, /Penerimaan Gudang → Pengiriman QC → Quality Control/);
  assert.match(page, /Surat jalan pengiriman vendor/);
  assert.match(page, /SURAT JALAN PENGIRIMAN/);
  assert.match(page, /tersimpan sebagai bukti penerimaan/);
  assert.match(
    page,
    /const createsNote = \[[\s\S]*?"Pengiriman Vendor",[\s\S]*?"Pengiriman QC"/,
  );
  const createsNoteBlock = page.match(
    /const createsNote = \[[\s\S]*?\]\.includes\(active\)(?:\s*&&\s*!previousDecoration)?;/,
  )?.[0];
  assert.ok(createsNoteBlock, "delivery-note process list should exist");
  assert.doesNotMatch(createsNoteBlock, /Penerimaan Gudang/);
  assert.doesNotMatch(page, /title: "Kembali ke Gudang"/);
  assert.match(
    createsNoteBlock,
    /"Pengiriman Vendor"[\s\S]*?"Pengiriman QC"/,
  );
  assert.match(page, /function remainingToQC/);
  assert.match(page, /sum\(remainingToQC\(source\)\) > 0/);
  assert.match(page, /Jumlah kirim QC melebihi sisa penerimaan/);
  assert.doesNotMatch(page, /Penerimaan gudang ini sudah dikirim ke QC/);
  assert.match(page, /Dikirim ke QC sebagian/);
  assert.match(page, /Setoran tetap tersedia sampai seluruh warna dan ukuran selesai dikirim ke QC/);
  assert.match(page, /referensi surat jalan pengiriman tidak valid/);
  assert.match(page, /tidak dapat digunakan dua kali/);
  assert.match(page, /const directVendorQC = false/);
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
    /\[\s*"▥",\s*"Laporan Operasional"\s*\],\s*\[\s*"Rp",\s*"Laporan Keuangan"\s*\],\s*\[\s*"↺",\s*"Riwayat Pembayaran"\s*\],\s*\[\s*"▤",\s*"Surat Jalan"\s*\]/,
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
  assert.doesNotMatch(page, /Aktivitas periode/);
  assert.match(page, /Aktivitas Vendor/);
  assert.doesNotMatch(page, /BARANG DI VENDOR/);
  assert.doesNotMatch(page, /Hanya pekerjaan aktif dan saldo unit yang belum disetor/);
  assert.match(page, /Hari ini/);
  assert.match(page, /Minggu ini/);
  assert.match(page, /Bulan ini/);
  assert.match(page, /Maksimal/);
  assert.doesNotMatch(page, /Stok jadi & potensi produksi/);
  assert.match(page, /STOK JADI/);
  assert.match(page, /TOTAL CUTTING/);
  assert.match(page, /SEDANG PROSES/);
  assert.match(page, /SEDANG QC/);
  assert.match(page, /REPAIR/);
  assert.match(page, /REJECT/);
  assert.match(page, /summaryProduction/);
  assert.match(page, /summaryCutting/);
  assert.match(page, /summaryQC/);
  assert.match(page, /summaryRepair/);
  assert.match(page, /summaryReject/);
  assert.match(page, /Rincian \{selectedSummary\.label\}/);
  assert.match(page, /summary-detail-table/);
  assert.match(page, /dashboardColorTone/);
  assert.match(page, /selectedSummarySizes/);
  assert.match(page, /compareSizes/);
  assert.match(page, /\.sort\(\(a, b\) => compareSizes\(a\.size, b\.size\)\)/);
  assert.match(page, /futurePotential/);
  assert.match(page, /stockOutlook/);
  assert.match(page, /traceStockVendor/);
  assert.match(page, /className="stock-color-group"/);
  assert.match(page, /model\.colorGroups\.map/);
  assert.match(page, /group\.projected.*unit potensi stok/);
  assert.match(page, /projected: ready \+ awaiting \+ production \+ repair/);
  assert.doesNotMatch(page, /projectedMaximum = stock \+ futurePotential/);
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
  assert.match(page, /Perbaikan tidak ditagihkan/);
  assert.match(page, /Repair dan QC ulang menjadi tanggung jawab vendor penjahit/);
  assert.match(page, /Karantina Reject/);
  assert.match(page, /qty:\s*x\.repair/);
  assert.match(page, /className="production-board"/);
  assert.match(page, /Posisi pekerjaan saat ini/);
  assert.match(page, /RINCIAN TAHAP/);
  assert.match(css, /grid-auto-flow:\s*column/);
  assert.match(css, /grid-auto-columns:\s*82vw/);
  assert.match(page, /automaticModelCode/);
  assert.match(page, /Kode terkunci karena sudah digunakan dalam transaksi produksi/);
  assert.match(page, /x\.modelCode\s*===\s*editingCode/);
  assert.match(page, /qcLocationForReceipt/);
  assert.match(page, /Master Vendor/);
  assert.match(page, /master-data-table/);
  assert.match(page, /mobile-view-switch/);
  assert.match(page, /Tampilan data \$\{active\}/);
  assert.match(page, /Tampilan Bundle siap dikirim/);
  assert.match(page, /MasterTablePanel/);
  assert.match(css, /\.master-data-table/);
  assert.match(page, /Tujuan QC masih dipakai vendor/);
  assert.match(page, /Pilih bundle dalam surat jalan ini/);
  assert.match(page, /bundleIds:\s*bundles\.map/);
  assert.match(page, /Template Sablon & Bordir/);
  assert.match(page, /decorationTemplates/);
  assert.match(page, /Pekerjaan tambahan dari Cutting yang sama/);
  assert.match(page, /decorationTemplateId/);
  assert.match(page, /remainingDecoration/);
  assert.match(page, /decorationRequiredBeforeBundle:\s*false/);
  assert.match(page, /decorationFinalStep:\s*false/);
  assert.match(page, /Pekerjaan ini memakai Cutting sebagai referensi dan tidak menahan proses Bundle/);
  assert.match(page, /Jumlah pekerjaan tidak boleh melebihi jumlah fisik pada Cutting sumber/);
  assert.match(page, /Pekerjaan yang sama sudah tercatat sebagai/);
  assert.match(page, /Pelaksana sablon\/bordir/);
  assert.match(page, /function cuttingWorkflowStatus/);
  assert.match(page, /Di vendor dekorasi/);
  assert.match(page, /capabilities/);
  assert.match(page, /decorationPosition/);
  assert.match(page, /Seluruh Bundle Dikirim/);
  assert.match(page, /Sablon & Bordir/);
  assert.match(page, /deliveryNoteId/);
  assert.match(page, /BDL-\$\{model\.code\}-\$\{poToken/);
  assert.match(css, /\.shipment-bundle-picker/);
  assert.match(page, /remainingAtPO/);
  assert.match(page, /CUT-\$\{model\.code\}-\$\{periodYYMM/);
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
  assert.match(page, /className=\{`bundle-print-panel bundle-operations/);
  assert.match(page, /Daftar order produksi lama/);
  assert.match(page, /Daftar batch Cutting/);
  assert.match(page, /bundle-ledger-table/);
  assert.match(page, /▣ Cetak/);
  assert.match(css, /\.process-ledger-table/);
  assert.match(css, /\.bundle-ledger-table/);
  assert.match(page, /production-toolbar-add/);
  assert.match(page, /production-stage-breadcrumb/);
  assert.match(page, /Kirim ke Vendor/);
  assert.match(page, /Cari batch Cutting, bundle, model, warna, size, PIC/);
  assert.match(page, /onSendBundles/);
  assert.match(css, /\.bundle-operation-tools/);
  assert.match(css, /\.bundle-selection-bar/);
  assert.match(css, /@page bundle-label/);
  assert.match(css, /size:\s*80mm auto/);
  assert.match(page, /bundleId: active === "Bundle" \? recordId/);
  assert.match(page, /Catat hasil potong aktual sebagai awal proses produksi/);
  assert.doesNotMatch(page, /PO masih memiliki sisa Cutting/);
  assert.match(page, /PIC \/ Penanggung jawab/);
  assert.match(page, /Pilih PIC/);
  assert.match(page, /deletePIC/);
  assert.match(page, /MODE SIMULASI/);
  assert.match(page, /Kosongkan transaksi uji/);
  assert.match(page, /resetSimulation/);
  assert.match(css, /\.simulation-banner/);
  assert.match(layout, /apple-touch-icon\.png/);
  assert.match(layout, /manifest\.webmanifest/);
  assert.match(layout, /appleWebApp/);
  assert.match(page, /Tarif jahit per unit/);
  assert.match(page, /PEMBAYARAN VENDOR/);
  assert.match(page, /PEMBAYARAN SETORAN/);
  assert.match(page, /function paymentStatus/);
  assert.match(page, /Belum dibayar/);
  assert.match(page, /DP sebagian/);
  assert.match(page, /Lunas/);
  assert.match(page, /updateReceiptPayment/);
  assert.match(page, /Catat DP \/ pembayaran/);
  assert.match(page, /type PaymentEntry/);
  assert.match(page, /paymentHistory/);
  assert.match(page, /nextVendorPaymentId/);
  assert.match(page, /Nominal pembayaran kali ini/);
  assert.match(page, /RIWAYAT PEMBAYARAN/);
  assert.match(page, /Batalkan/);
  assert.match(page, /Bukti Pembayaran Jasa/);
  assert.match(page, /nextCuttingPaymentId/);
  assert.match(page, /BYR-CUT/);
  assert.match(page, /Tarif cutting per unit/);
  assert.match(page, /Tagihan jasa cutting/);
  assert.match(page, /REKAP PEMBAYARAN MINGGUAN/);
  assert.match(page, /Pembayaran Cutting/);
  assert.match(page, /Pembayaran QC/);
  assert.match(page, /nextWeeklyPaymentId/);
  assert.match(page, /kind === "decoration" \? "DEK" : "JHT"/);
  assert.match(page, /Pembayaran Vendor Sablon\/Bordir/);
  assert.match(page, /Edit \$\{editingDecorationRecord\.id\}/);
  assert.match(page, /Simpan perubahan/);
  assert.match(page, /sudah memiliki pembayaran\. Vendor, jenis, dan tarif dikunci/);
  assert.match(page, /Pembayaran Vendor Jahit/);
  assert.match(page, /Rekap gabungan/);
  assert.match(page, /payment.kind === "vendor"/);
  assert.match(page, /Tarif QC per unit/);
  assert.match(page, /paymentAmount/);
  assert.match(page, /Nominal pembayaran kali ini/);
  assert.match(page, /function weeklyPaymentMatches/);
  assert.match(page, /function weeklyPaidAmount/);
  assert.match(page, /function voidWeeklyPayment/);
  assert.match(page, /outstandingWeeklyGroups/);
  assert.match(page, /Tidak ada tagihan belum lunas pada proses ini/);
  assert.match(page, /onVoidWeeklyPayment/);
  assert.match(css, /\.weekly-period-control/);
  assert.match(page, /function rupiahInput/);
  assert.match(page, /function parseRupiahInput/);
  assert.match(page, /Laporan Operasional/);
  assert.match(page, /Laporan Keuangan/);
  assert.match(page, /const navGroups/);
  assert.match(page, /Master Data/);
  assert.match(page, /Vendor & Gudang/);
  assert.match(page, /label: "Laporan"/);
  assert.match(page, /aria-expanded/);
  assert.match(css, /\.nav-group-trigger/);
  assert.match(css, /\.nav-submenu/);
  assert.match(css, /\.nav-group\.expanded/);
  assert.match(css, /linear-gradient\(110deg/);
  assert.match(page, /Total tagihan produksi/);
  assert.match(page, /const whatsappURL/);
  assert.match(page, /Daftar tagihan produksi/);
  assert.match(page, /Cari penerima, rekening, atau status/);
  assert.match(page, /finance-ledger-table/);
  assert.match(page, /selectedReminder\(selectedFinanceRow, selectedFinanceCheckedWeeks\)/);
  assert.match(page, /Ajukan via WA/);
  assert.match(page, /Periode rincian mingguan/);
  assert.match(page, /Pilih tunggakan/);
  assert.match(page, /Referensi Cutting belum tercatat/);
  assert.match(page, /Nomor rekening:/);
  assert.match(page, /Penerima rekening:/);
  assert.match(css, /\.finance-ledger-table/);
  assert.match(css, /content: attr\(data-label\)/);
  assert.match(page, /Laporan Operasional/);
  assert.match(page, /Total unit selesai/);
  assert.match(page, /selectedProductionPO/);
  assert.match(css, /\.production-ledger-table/);
  assert.match(page, /Progres jahit per vendor dan Batch Cutting/);
  assert.match(page, /vendor-report-table/);
  assert.match(page, /remainingVariants/);
  assert.match(css, /\.vendor-report-table/);
  assert.match(page, /PIC penerima/);
  assert.match(page, /encodeURIComponent\(message\)/);
  assert.match(page, /Pesan ini belum dikirim otomatis/);
  assert.match(css, /\.finance-reminder-bar/);
  assert.match(css, /\.outstanding-actions/);
  assert.match(page, /Custom tanggal/);
  assert.match(page, /exportFinanceCSV/);
  assert.match(page, /Ekspor CSV/);
  assert.match(page, /function FinanceReportPrint/);
  assert.match(page, /allocatedWeeklyPaid/);
  assert.match(css, /\.finance-custom-range/);
  assert.match(css, /\.finance-report-print/);
  assert.match(page, /Rekap transaksi keuangan/);
  assert.match(page, /Daftar tagihan produksi/);
  assert.match(page, /Buka pembayaran/);
  assert.match(page, /reportTab/);
  assert.match(css, /\.report-tabs/);
  assert.match(css, /\.finance-ledger-panel/);
  assert.match(page, /function PaymentReceiptPrint/);
  assert.match(css, /\.receipt-payment-list/);
  assert.match(css, /\.receipt-payment-entry/);
  assert.match(css, /\.payment-history/);
  assert.match(css, /\.payment-proof/);
  assert.match(css, /\.stock-model-row > strong:nth-of-type\(6\)::before/);
  assert.match(css, /grid-template-columns:\s*42px repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.stock-table-head\s*\{\s*display:\s*none/);
  assert.match(page, /className="stock-color-groups"/);
  assert.match(css, /scroll-snap-type:\s*x mandatory/);
  assert.doesNotMatch(
    page,
    /PO ini sudah dibukukan di Cutting\. Gunakan PO baru/,
  );
});

test("persistent state is normalized without destructive reads and masters remain manageable", async () => {
  const [route, database, packageJson, pageSource, css] = await Promise.all([
    readFile(new URL("app/api/state/route.ts", root), "utf8"),
    readFile(new URL("db/index.ts", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
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
  assert.match(route, /Records created before the decoration workflow existed/);
  assert.match(route, /item\.decorationProcess === "screenprint"/);
  assert.match(route, /decorationRequiredBeforeBundle/);
  assert.match(route, /decorationFinalStep/);
  assert.match(route, /model\.decorationProcess === "both"[\s\S]*?: "both"/);
  assert.match(pageSource, /const updatedAtRef = useRef/);
  assert.match(pageSource, /updatedAt: updatedAtRef\.current \?\? next\.updatedAt/);
  assert.match(pageSource, /updatedAtRef\.current = result\.updatedAt/);
  assert.match(pageSource, /const saveInFlightRef = useRef\(false\)/);
  assert.match(pageSource, /disabled=\{saving \|\| sum\(matrix\) <= 0\}/);
  assert.match(pageSource, /aria-busy=\{saving\}/);
  assert.match(pageSource, /Menyimpan\.\.\./);
  assert.match(pageSource, /function mergeConflictState/);
  assert.match(pageSource, /mergeChangedItems/);
  assert.match(pageSource, /Data terbaru digabungkan dan transaksi berhasil disimpan/);
  assert.match(pageSource, /className="form-modal matrix-modal"[\s\S]*?noValidate/);
  assert.match(pageSource, /Penerima QC belum tersedia\. Periksa Master QC/);
  assert.match(css, /\.toast\s*\{[\s\S]*?z-index:\s*200/);
  assert.match(css, /\.form-actions\s*\{[\s\S]*?position:\s*sticky/);
  assert.match(route, /records: \{\}/);
  assert.match(route, /notes: \[\]/);
  assert.match(route, /weeklyPayments: \[\]/);
  assert.match(route, /Array\.isArray\(saved\.weeklyPayments\)/);
  assert.match(route, /normalizeState/);
  assert.doesNotMatch(route, /saved\.dataVersion !== 3/);
  assert.match(route, /backupId/);
  assert.match(route, /stateId = isSimulation \? 10 : 1/);
  assert.match(route, /backupId = isSimulation \? 11 : 2/);
  assert.match(route, /simulationStateFromProduction/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /Data produksi tidak dapat dikosongkan/);
  assert.match(route, /state saved with backup/);
  assert.match(route, /clientUpdatedAt/);
  assert.match(route, /status: 409/);
  assert.match(route, /\.eq\("updated_at", clientUpdatedAt\)/);
  assert.match(route, /Cache-Control/);
  assert.match(route, /no-store, no-cache, must-revalidate/);
  assert.doesNotMatch(route, /\.\.\.payload,[\s\S]*?ok: true/);
  assert.match(route, /ok: true,[\s\S]*?updatedAt/);
  assert.match(route, /vendor\.qcMode === "vendor" \? "vendor" : "internal"/);
  assert.match(route, /typeof vendor\.qcOfficer === "string"/);
  assert.match(route, /decorationProcess/);
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /Data berubah di perangkat atau tab lain/);
  assert.match(page, /fetch\("\/api\/state", \{ cache: "no-store" \}\)/);
  assert.match(page, /const latestResponse = await fetch/);
  assert.match(page, /records: result\.records \?\? savedState\.records/);
  assert.match(page, /children\("Karantina Reject", r\.id\)/);
  assert.match(page, /done = reworked && stocked && quarantined/);
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
