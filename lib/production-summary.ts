type Variant = { color: string; size: string; qty: number };

type ProductionRecord = {
  id: string;
  date: string;
  sourceId: string;
  modelCode: string;
  modelName: string;
  variants: Variant[];
  qcMode?: string;
  qcDetails?: Array<{ color: string; size: string; passed: number }>;
};

type SummaryPosition = "cutting" | "warehouse" | "sewing" | "qc" | "stock";
type SummaryLine = {
  modelCode: string;
  modelName: string;
  color: string;
  size: string;
} & Record<SummaryPosition, number>;

const positionKeys: SummaryPosition[] = ["cutting", "warehouse", "sewing", "qc", "stock"];

const csvCell = (value: string | number) => {
  const plain = String(value ?? "");
  const protectedValue = /^[\s\uFEFF]*[=+@-]/.test(plain) ? `'${plain}` : plain;
  return `"${protectedValue.replaceAll('"', '""')}"`;
};

type DashboardDetailModel = {
  modelCode: string;
  modelName: string;
  total: number;
  colors: Array<{ color: string; quantities: Record<string, number>; total: number }>;
};

export function dashboardDetailCSV({
  label,
  scope,
  sizes,
  models,
  total,
}: {
  label: string;
  scope: string;
  sizes: string[];
  models: DashboardDetailModel[];
  total: number;
}) {
  const rows: Array<Array<string | number>> = [
    [`RINCIAN ${label.toUpperCase()} OIMS`],
    ["Cakupan", scope],
    [],
    ["Model", "SKU", "Warna", ...sizes, "Jumlah"],
    ...models.flatMap((model) => [
      ...model.colors.map((color) => [
        model.modelName,
        model.modelCode,
        color.color,
        ...sizes.map((size) => color.quantities[size] ?? 0),
        color.total,
      ]),
      [`Total ${model.modelName}`, "", "", ...sizes.map(() => ""), model.total],
    ]),
    ["TOTAL", "", "", ...sizes.map(() => ""), total],
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}

export function buildProductionSummary(
  records: Record<string, ProductionRecord[]>,
  start: string,
  end: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
    throw new Error("Rentang tanggal rangkuman tidak valid.");
  }

  const dated = Object.fromEntries(
    Object.entries(records).map(([stage, rows]) => [stage, rows.filter((row) => row.date <= end)]),
  ) as Record<string, ProductionRecord[]>;
  const stageRows = (stage: string) => dated[stage] ?? [];
  const children = (stage: string, sourceId: string) =>
    stageRows(stage).filter((row) => row.sourceId === sourceId).flatMap((row) => row.variants);
  const remaining = (base: Variant[], used: Variant[]) =>
    base.map((variant) => ({
      ...variant,
      qty: Math.max(0, variant.qty - used
        .filter((other) => other.color === variant.color && other.size === variant.size)
        .reduce((total, other) => total + other.qty, 0)),
    })).filter((variant) => variant.qty > 0);
  const balance = (stage: string, usedStage: string) =>
    stageRows(stage).map((row) => ({
      row,
      variants: remaining(row.variants, children(usedStage, row.id)),
    }));
  const qcChecks = [...stageRows("Quality Control"), ...stageRows("QC Ulang")];
  const passedNotStocked = qcChecks.map((row) => ({
    row,
    variants: remaining(
      (row.qcDetails ?? []).map((detail) => ({ color: detail.color, size: detail.size, qty: detail.passed })),
      children("Stok Barang Jadi", row.id),
    ),
  }));

  const sources: Record<SummaryPosition, Array<{ row: ProductionRecord; variants: Variant[] }>> = {
    cutting: stageRows("Cutting")
      .filter((row) => row.date >= start)
      .map((row) => ({ row, variants: row.variants })),
    warehouse: [...balance("Cutting", "Bundle"), ...balance("Bundle", "Pengiriman Vendor")],
    sewing: balance("Pengiriman Vendor", "Penerimaan Gudang"),
    qc: [
      ...balance("Penerimaan Gudang", "Pengiriman QC")
        .filter(({ row }) => row.qcMode !== "vendor"),
      ...balance("Pengiriman QC", "Quality Control"),
      ...passedNotStocked,
    ],
    stock: stageRows("Stok Barang Jadi").map((row) => ({ row, variants: row.variants })),
  };

  const byVariant = new Map<string, SummaryLine>();
  for (const position of positionKeys) {
    for (const { row, variants } of sources[position]) {
      for (const variant of variants) {
        if (variant.qty <= 0) continue;
        const key = JSON.stringify([row.modelCode, variant.color, variant.size]);
        const line = byVariant.get(key) ?? {
          modelCode: row.modelCode,
          modelName: row.modelName,
          color: variant.color,
          size: variant.size,
          cutting: 0,
          warehouse: 0,
          sewing: 0,
          qc: 0,
          stock: 0,
        };
        line[position] += variant.qty;
        byVariant.set(key, line);
      }
    }
  }
  const lines = [...byVariant.values()].sort((a, b) =>
    a.modelCode.localeCompare(b.modelCode) ||
    a.color.localeCompare(b.color) ||
    a.size.localeCompare(b.size, undefined, { numeric: true }),
  );
  const totals = Object.fromEntries(positionKeys.map((key) => [
    key,
    lines.reduce((total, line) => total + line[key], 0),
  ])) as Record<SummaryPosition, number>;
  return { start, end, lines, totals };
}

export function productionSummaryCSV(summary: ReturnType<typeof buildProductionSummary>) {
  const rows: Array<Array<string | number>> = [
    ["RANGKUMAN PRODUKSI OIMS"],
    ["Periode cutting", summary.start, "s.d.", summary.end],
    ["Saldo posisi per akhir", summary.end],
    ["Catatan", "Cutting adalah hasil dalam periode; gudang cutting, jahit, QC/finishing, dan stok jadi adalah saldo sampai tanggal akhir."],
    [],
    ["Kode model", "Model", "Warna", "Ukuran", "Hasil cutting periode", "Di gudang cutting", "Sedang dijahit", "QC/finishing", "Stok jadi"],
    ...summary.lines.map((line) => [
      line.modelCode, line.modelName, line.color, line.size,
      line.cutting, line.warehouse, line.sewing, line.qc, line.stock,
    ]),
    ["TOTAL", "", "", "", summary.totals.cutting, summary.totals.warehouse, summary.totals.sewing, summary.totals.qc, summary.totals.stock],
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}
