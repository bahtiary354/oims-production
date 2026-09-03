export const pagePaths = {
  Dashboard: "/dashboard",
  "Master Jaket": "/master/jaket",
  "Master Vendor": "/master/vendor",
  "Master QC": "/master/qc",
  "Master PIC": "/master/pic",
  "Order Produksi": "/produksi/order",
  Cutting: "/produksi/cutting",
  "Sablon/Bordir": "/produksi/sablon-bordir",
  Bundle: "/produksi/bundle",
  "Pengiriman Vendor": "/vendor/pengiriman",
  "Penerimaan Gudang": "/vendor/penerimaan",
  "Pengiriman QC": "/qc/pengiriman",
  "Quality Control": "/qc/quality-control",
  Rework: "/qc/rework",
  "Penerimaan Rework": "/qc/penerimaan-rework",
  "QC Ulang": "/qc/ulang",
  "Karantina Reject": "/qc/karantina-reject",
  "Stok Barang Jadi": "/persediaan/stok-jadi",
  "Laporan Operasional": "/laporan/operasional",
  "Laporan Keuangan": "/laporan/keuangan",
  "Riwayat Pembayaran": "/laporan/riwayat-pembayaran",
  "Surat Jalan": "/surat-jalan",
} as const;

export type PageName = keyof typeof pagePaths;

const pagesByPath = new Map<string, PageName>(
  Object.entries(pagePaths).map(([name, path]) => [path, name as PageName]),
);

export function pathForPage(name: string) {
  return pagePaths[name as PageName] ?? "/dashboard";
}

export function pageForPath(pathname: string): PageName {
  const normalized = pathname !== "/" && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  return pagesByPath.get(normalized) ?? "Dashboard";
}
