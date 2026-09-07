const navItems = [
  ["▦", "Dashboard"],
  ["♙", "Master Jaket"],
  ["⌂", "Master Vendor"],
  ["◎", "Master QC"],
  ["♙", "Master PIC"],
  ["✂", "Cutting"],
  ["✦", "Sablon/Bordir"],
  ["▱", "Bundle"],
  ["↗", "Pengiriman Vendor"],
  ["□", "Penerimaan Gudang"],
  ["⇢", "Pengiriman QC"],
  ["✓", "Quality Control"],
  ["↻", "Rework"],
  ["□", "Penerimaan Rework"],
  ["✓", "QC Ulang"],
  ["!", "Karantina Reject"],
  ["▣", "Stok Barang Jadi"],
  ["▥", "Laporan Operasional"],
  ["Rp", "Laporan Keuangan"],
  ["↺", "Riwayat Pembayaran"],
  ["▤", "Surat Jalan"],
] as const;

export const navGroups = [
  { id: "master", section: "MANAJEMEN", icon: "◎", label: "Master Data", items: ["Master Jaket", "Master Vendor", "Master QC", "Master PIC"] },
  { id: "production", section: "OPERASIONAL", icon: "◇", label: "Produksi", items: ["Cutting", "Bundle"] },
  { id: "decoration", section: "OPERASIONAL", icon: "✦", label: "Sablon & Bordir", items: ["Sablon/Bordir"] },
  { id: "vendor", section: "OPERASIONAL", icon: "↗", label: "Vendor & Gudang", items: ["Pengiriman Vendor", "Penerimaan Gudang"] },
  { id: "qc", section: "OPERASIONAL", icon: "✓", label: "Quality Control", items: ["Pengiriman QC", "Quality Control", "Rework", "Penerimaan Rework", "QC Ulang", "Karantina Reject"] },
  { id: "inventory", section: "OPERASIONAL", icon: "▣", label: "Persediaan", items: ["Stok Barang Jadi"] },
  { id: "report", section: "ANALITIK", icon: "▥", label: "Laporan", items: ["Laporan Operasional", "Laporan Keuangan", "Riwayat Pembayaran"] },
] as const;

export const masterModuleNames = ["Master Jaket", "Master Vendor", "Master QC", "Master PIC"] as const;
export const reportModuleNames = ["Laporan Operasional", "Laporan Keuangan", "Riwayat Pembayaran"] as const;
export const operationalModuleNames = [
  "Cutting",
  "Sablon/Bordir",
  "Bundle",
  "Pengiriman Vendor",
  "Penerimaan Gudang",
  "Pengiriman QC",
  "Quality Control",
  "Rework",
  "Penerimaan Rework",
  "QC Ulang",
  "Stok Barang Jadi",
] as const;

export const exceptionalOperationalModuleNames = ["Karantina Reject"] as const;

export const modulePaths: Record<string, string> = {
  Dashboard: "/dashboard",
  "Order Produksi": "/produksi/order",
  "Master Jaket": "/master/jaket",
  "Master Vendor": "/master/vendor",
  "Master QC": "/master/qc",
  "Master PIC": "/master/pic",
  Cutting: "/produksi/cutting",
  Bundle: "/produksi/bundle",
  "Sablon/Bordir": "/dekorasi/sablon-bordir",
  "Pengiriman Vendor": "/vendor/pengiriman",
  "Penerimaan Gudang": "/vendor/penerimaan",
  "Pengiriman QC": "/qc/pengiriman",
  "Quality Control": "/qc/pemeriksaan",
  Rework: "/qc/rework",
  "Penerimaan Rework": "/qc/penerimaan-rework",
  "QC Ulang": "/qc/ulang",
  "Karantina Reject": "/qc/karantina-reject",
  "Stok Barang Jadi": "/persediaan/stok-jadi",
  "Laporan Operasional": "/laporan/operasional",
  "Laporan Keuangan": "/laporan/keuangan",
  "Riwayat Pembayaran": "/laporan/riwayat-pembayaran",
  "Surat Jalan": "/surat-jalan",
};

const pathModules = new Map(Object.entries(modulePaths).map(([module, path]) => [path, module]));

export function moduleFromPath(pathname: string) {
  const normalized = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  return pathModules.get(normalized) ?? "Dashboard";
}

export function pathFromModule(module: string) {
  return modulePaths[module] ?? modulePaths.Dashboard;
}

export function navIcon(name: string) {
  return navItems.find((item) => item[1] === name)?.[0] ?? "·";
}

export function groupForModule(module: string) {
  return navGroups.find((group) => group.items.some((item) => item === module));
}
