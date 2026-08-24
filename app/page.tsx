"use client";

import { FormEvent, Fragment, ReactNode, useEffect, useMemo, useRef, useState } from "react";

const stages = [
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
  "Karantina Reject",
  "Stok Barang Jadi",
];
const nav = [
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
  ["▥", "Laporan Produksi"],
  ["Rp", "Laporan Keuangan"],
  ["▤", "Surat Jalan"],
];
const navGroups = [
  {
    id: "master",
    section: "MANAJEMEN",
    icon: "◎",
    label: "Master Data",
    items: ["Master Jaket", "Master Vendor", "Master QC", "Master PIC"],
  },
  {
    id: "production",
    section: "OPERASIONAL",
    icon: "◇",
    label: "Produksi",
    items: ["Cutting", "Bundle"],
  },
  {
    id: "decoration",
    section: "OPERASIONAL",
    icon: "✦",
    label: "Sablon & Bordir",
    items: ["Sablon/Bordir"],
  },
  {
    id: "vendor",
    section: "OPERASIONAL",
    icon: "↗",
    label: "Vendor & Gudang",
    items: ["Pengiriman Vendor", "Penerimaan Gudang"],
  },
  {
    id: "qc",
    section: "OPERASIONAL",
    icon: "✓",
    label: "Quality Control",
    items: [
      "Pengiriman QC",
      "Quality Control",
      "Rework",
      "Penerimaan Rework",
      "QC Ulang",
      "Karantina Reject",
    ],
  },
  {
    id: "inventory",
    section: "OPERASIONAL",
    icon: "▣",
    label: "Persediaan",
    items: ["Stok Barang Jadi"],
  },
  {
    id: "report",
    section: "ANALITIK",
    icon: "▥",
    label: "Laporan",
    items: ["Laporan Produksi", "Laporan Keuangan"],
  },
] as const;
function navIcon(name: string) {
  return nav.find((item) => item[1] === name)?.[0] ?? "·";
}
const stageInfo: Record<
  string,
  {
    prefix: string;
    title: string;
    desc: string;
    source?: string;
    move?: string;
  }
> = {
  "Order Produksi": {
    prefix: "PO",
    title: "Order Produksi",
    desc: "Induk seluruh proses; jumlah dibuat per warna dan ukuran.",
  },
  Cutting: {
    prefix: "CUT",
    title: "Cutting",
    desc: "Catat hasil potong aktual sebagai awal proses produksi.",
  },
  Bundle: {
    prefix: "BDL",
    title: "Bundle Produksi",
    desc: "Pembagian hasil cutting atau hasil sablon/bordir yang sudah selesai.",
    source: "Cutting",
  },
  "Sablon/Bordir": {
    prefix: "SBR",
    title: "Pekerjaan Sablon & Bordir",
    desc: "Kelola pekerjaan dekorasi per Cutting, vendor, posisi, dan jenis pekerjaan.",
    source: "Cutting",
    move: "Gudang Cutting → Vendor Dekorasi → Gudang atau Vendor Jahit",
  },
  "Pengiriman Vendor": {
    prefix: "KRM",
    title: "Pengiriman Vendor",
    desc: "Pilih bundle dan vendor; surat jalan dibuat otomatis.",
    source: "Bundle",
    move: "Gudang Cutting → Vendor Jahit",
  },
  "Penerimaan Gudang": {
    prefix: "TRM",
    title: "Penerimaan Gudang & Progres Vendor",
    desc: "Terima setoran berdasarkan surat jalan pengiriman dan pantau otomatis sisa barang di vendor.",
    source: "Pengiriman Vendor",
    move: "Vendor Jahit → Gudang",
  },
  "Pengiriman QC": {
    prefix: "KQC",
    title: "Pengiriman ke Quality Control",
    desc: "Kirim hasil jahit dari gudang ke QC dan buat surat jalan ketiga.",
    source: "Penerimaan Gudang",
    move: "Gudang → Quality Control",
  },
  "Quality Control": {
    prefix: "QC",
    title: "Penerimaan & Hasil Quality Control",
    desc: "Terima kiriman QC lalu catat jumlah lolos, reject, dan repair beserta vendor asal.",
    source: "Pengiriman QC",
  },
  Rework: {
    prefix: "RWK",
    title: "Pengiriman Rework / Repair",
    desc: "Hanya barang repair yang dikirim untuk diperbaiki.",
    source: "Quality Control",
    move: "Quality Control → Vendor Rework",
  },
  "Penerimaan Rework": {
    prefix: "TRW",
    title: "Penerimaan Hasil Rework",
    desc: "Terima hasil perbaikan vendor sebelum dilakukan QC ulang.",
    source: "Rework",
    move: "Vendor Rework → Quality Control",
  },
  "QC Ulang": {
    prefix: "QCR",
    title: "Quality Control Ulang",
    desc: "Periksa kembali barang yang selesai diperbaiki.",
    source: "Penerimaan Rework",
  },
  "Karantina Reject": {
    prefix: "RJT",
    title: "Karantina Reject",
    desc: "Barang gagal QC dipisahkan dari repair dan stok jadi.",
    source: "Quality Control",
  },
  "Stok Barang Jadi": {
    prefix: "STK",
    title: "Stok Barang Jadi",
    desc: "Hanya hasil lolos QC yang dapat dimasukkan.",
    source: "Quality Control",
    move: "Quality Control → Stok Jadi",
  },
};

type Model = {
  code: string;
  name: string;
  colors: string[];
  sizes: string[];
  active: boolean;
  decorationProcess?: DecorationProcess;
};
type DecorationProcess = "none" | "screenprint" | "embroidery" | "both";
type QCMode = "internal" | "vendor";
type Vendor = {
  code: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  active: boolean;
  qcMode?: QCMode;
  qcOfficer?: string;
  qcLocationCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  capabilities?: Array<"sewing" | "screenprint" | "embroidery">;
  screenprintRate?: number;
  embroideryRate?: number;
};
type QCLocation = {
  code: string;
  location: string;
  recipient: string;
  phone: string;
  address: string;
  active: boolean;
  rate?: number;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
};
type PIC = {
  code: string;
  name: string;
  role: string;
  phone: string;
  active: boolean;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
};
type Variant = { color: string; size: string; qty: number };
type QCDetail = {
  color: string;
  size: string;
  qty: number;
  passed: number;
  reject: number;
  repair: number;
  note: string;
};
type PaymentEntry = {
  id: string;
  date: string;
  amount: number;
  pic: string;
  requester?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  note: string;
  voided?: boolean;
  voidReason?: string;
};
type RecordRow = {
  id: string;
  stage: string;
  date: string;
  modelCode: string;
  modelName: string;
  sourceId: string;
  variants: Variant[];
  total: number;
  status: string;
  destination?: string;
  note?: string;
  remainingStatus?: string;
  qcPassed?: number;
  qcReject?: number;
  qcRepair?: number;
  qcDetails?: QCDetail[];
  originVendor?: string;
  qcMode?: QCMode;
  qcOfficer?: string;
  officer?: string;
  poId?: string;
  batchNo?: number;
  bundleNo?: number;
  bundleId?: string;
  deliveryNoteId?: string;
  sewingRate?: number;
  cuttingRate?: number;
  qcRate?: number;
  paidAmount?: number;
  paymentDate?: string;
  paymentHistory?: PaymentEntry[];
  decorationProcess?: DecorationProcess;
  decorationType?: "screenprint" | "embroidery";
  decorationPosition?: string;
  decorationDescription?: string;
  decorationRate?: number;
  decorationCompleted?: number;
  decorationOrder?: number;
  decorationRequiredBeforeBundle?: boolean;
  decorationFinalStep?: boolean;
};
type Note = {
  id: string;
  date: string;
  process: string;
  sourceId: string;
  modelCode: string;
  modelName: string;
  from: string;
  to: string;
  variants: Variant[];
  total: number;
  officer: string;
  recipient?: string;
  note?: string;
  bundleIds?: string[];
};
type WeeklyPaymentLine = {
  recordId: string;
  modelName: string;
  units: number;
  rate: number;
  amount: number;
};
type WeeklyPaymentKind = "cutting" | "qc" | "vendor" | "decoration";
type WeeklyPayment = {
  id: string;
  kind: WeeklyPaymentKind;
  periodStart: string;
  periodEnd: string;
  payee: string;
  lines: WeeklyPaymentLine[];
  totalUnits: number;
  totalAmount: number;
  paymentAmount?: number;
  paidBefore?: number;
  paymentDate: string;
  pic: string;
  requester?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  note: string;
  voided?: boolean;
  voidReason?: string;
};
type FinancePaymentRow = {
  id: string;
  date: string;
  type: string;
  payee: string;
  amount: number;
  status: string;
};

function periodYYMM(date: string) {
  return `${date.slice(2, 4)}${date.slice(5, 7)}`;
}
function poLotToken(poId?: string) {
  if (!poId) return "";
  const parts = poId.split("-");
  const period = parts.at(-2) ?? "";
  const sequence = parts.at(-1) ?? "000";
  const shortPeriod = period.length === 6 ? period.slice(2) : period;
  return `${shortPeriod}P${sequence}`;
}
function shortBundleCode(bundleId?: string) {
  return bundleId?.match(/B\d{3}$/)?.[0] ?? bundleId ?? "—";
}
function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}
function rupiahInput(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value || 0)))}`;
}
function parseRupiahInput(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}
function paymentStatus(bill: number, paid: number) {
  if (paid <= 0) return "Belum dibayar";
  if (paid < bill) return "DP sebagian";
  return "Lunas";
}
function decorationLabel(value?: DecorationProcess) {
  if (value === "screenprint") return "Sablon";
  if (value === "embroidery") return "Bordir";
  if (value === "both") return "Sablon + bordir";
  return "Tanpa sablon/bordir";
}
function legacyPayment(receipt: RecordRow): PaymentEntry[] {
  if ((receipt.paymentHistory?.length ?? 0) > 0)
    return receipt.paymentHistory ?? [];
  if ((receipt.paidAmount ?? 0) <= 0) return [];
  return [
    {
      id: `BYR-${receipt.stage === "Sablon/Bordir" ? "DEK" : receipt.stage === "Cutting" ? "CUT" : "JHT"}-LEGACY-${receipt.id}`,
      date: receipt.paymentDate || receipt.date,
      amount: receipt.paidAmount ?? 0,
      pic: receipt.officer || "Belum dicatat",
      note: "Pembayaran sebelum fitur riwayat diaktifkan",
    },
  ];
}
function paidForReceipt(receipt: RecordRow) {
  return legacyPayment(receipt).reduce(
    (total, payment) => total + (payment.voided ? 0 : payment.amount),
    0,
  );
}
function nextVendorPaymentId(data: AppData, date: string) {
  const period = date.slice(2, 7).replace("-", ""),
    prefix = `BYR-JHT-${period}-`,
    used = (data.records["Penerimaan Gudang"] ?? [])
      .flatMap(legacyPayment)
      .map((payment) => payment.id)
      .filter((id) => id.startsWith(prefix))
      .map((id) => Number(id.slice(prefix.length)) || 0);
  return `${prefix}${String(Math.max(0, ...used) + 1).padStart(3, "0")}`;
}
function nextCuttingPaymentId(data: AppData, date: string) {
  const period = date.slice(2, 7).replace("-", ""),
    prefix = `BYR-CUT-${period}-`,
    used = (data.records.Cutting ?? [])
      .flatMap(legacyPayment)
      .map((payment) => payment.id)
      .filter((id) => id.startsWith(prefix))
      .map((id) => Number(id.slice(prefix.length)) || 0);
  return `${prefix}${String(Math.max(0, ...used) + 1).padStart(3, "0")}`;
}
function localDateString(value = new Date()) {
  const year = value.getFullYear(),
    month = String(value.getMonth() + 1).padStart(2, "0"),
    day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function mondaySaturday(date = new Date()) {
  const monday = new Date(date),
    day = monday.getDay();
  monday.setDate(monday.getDate() - ((day + 6) % 7));
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return { start: localDateString(monday), end: localDateString(saturday) };
}
function nextWeeklyPaymentId(
  data: AppData,
  kind: WeeklyPaymentKind,
  date: string,
) {
  const period = date.slice(2, 7).replace("-", ""),
    prefix = `BAY-${kind === "cutting" ? "CUT" : kind === "qc" ? "QC" : kind === "decoration" ? "DEK" : "JHT"}-${period}-`,
    used = data.weeklyPayments
      .map((payment) => payment.id)
      .filter((id) => id.startsWith(prefix))
      .map((id) => Number(id.slice(prefix.length)) || 0);
  return `${prefix}${String(Math.max(0, ...used) + 1).padStart(3, "0")}`;
}
function weeklyPaymentMatches(
  payment: WeeklyPayment,
  kind: WeeklyPaymentKind,
  payee: string,
  periodStart: string,
  periodEnd: string,
) {
  return (
    !payment.voided &&
    payment.kind === kind &&
    payment.payee.trim().toLowerCase() === payee.trim().toLowerCase() &&
    payment.periodStart === periodStart &&
    payment.periodEnd === periodEnd
  );
}
function weeklyPaidAmount(
  payments: WeeklyPayment[],
  kind: WeeklyPaymentKind,
  payee: string,
  periodStart: string,
  periodEnd: string,
) {
  return payments
    .filter((payment) =>
      weeklyPaymentMatches(payment, kind, payee, periodStart, periodEnd),
    )
    .reduce(
      (total, payment) =>
        total + (payment.paymentAmount ?? payment.totalAmount),
      0,
    );
}
function allocatedWeeklyPaid(
  payments: WeeklyPayment[],
  kind: "cutting" | "qc" | "decoration",
  recordIds: Set<string>,
) {
  return payments
    .filter((payment) => !payment.voided && payment.kind === kind)
    .reduce((total, payment) => {
      if (payment.totalAmount <= 0) return total;
      const ratio = Math.min(
        1,
        (payment.paymentAmount ?? payment.totalAmount) / payment.totalAmount,
      );
      return (
        total +
        payment.lines
          .filter((line) => recordIds.has(line.recordId))
          .reduce((sum, line) => sum + line.amount * ratio, 0)
      );
    }, 0);
}
function compareSizes(a: string, b: string) {
  const normalize = (size: string) => {
      const compact = size.trim().toUpperCase().replace(/\s+/g, ""),
        aliases: Record<string, string> = {
          "2XL": "XXL",
          XXXL: "3XL",
          XXXXL: "4XL",
          XXXXXL: "5XL",
        };
      return aliases[compact] ?? compact;
    },
    order = [
      "XXS",
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL",
      "3XL",
      "4XL",
      "5XL",
      "6XL",
    ],
    normalizedA = normalize(a),
    normalizedB = normalize(b),
    rankA = order.indexOf(normalizedA),
    rankB = order.indexOf(normalizedB);
  if (rankA !== -1 || rankB !== -1) {
    if (rankA === -1) return 1;
    if (rankB === -1) return -1;
    return rankA - rankB;
  }
  return normalizedA.localeCompare(normalizedB, "id", {
    numeric: true,
    sensitivity: "base",
  });
}

function dashboardColorTone(name: string) {
  const value = name.trim().toUpperCase(),
    tones: Array<[string[], string, string]> = [
      [["HITAM", "BLACK"], "#262d39", "#ffffff"],
      [["NAVY", "DONGKER"], "#477cab", "#ffffff"],
      [["OXFORD", "BLUE", "BIRU"], "#75a7cc", "#10233a"],
      [["ARMY", "HIJAU", "GREEN"], "#a7c98f", "#17351d"],
      [["PETROL"], "#478f86", "#ffffff"],
      [["BURGUNDY", "MAROON"], "#903047", "#ffffff"],
      [["CARAMEL", "CAMEL"], "#e9a75f", "#39220d"],
      [["MOCCA", "MOCHA"], "#b48b72", "#281a14"],
      [["BROWN", "COKLAT"], "#9a6048", "#ffffff"],
      [["KHAKI", "KHAKI", "CREAM", "KREM"], "#ead2ad", "#342719"],
      [["GREY", "GRAY", "ABU"], "#c3c7cc", "#20252b"],
      [["PUTIH", "WHITE"], "#f5f5f2", "#222222"],
      [["MERAH", "RED"], "#d76060", "#ffffff"],
      [["PINK", "ROSE"], "#e7a7b8", "#3f1b25"],
      [["UNGU", "PURPLE"], "#8066a8", "#ffffff"],
      [["KUNING", "YELLOW"], "#e7ca55", "#302a0b"],
      [["ORANGE", "OREN"], "#e88c48", "#351b08"],
    ],
    match = tones.find(([keys]) => keys.some((key) => value.includes(key)));
  return match
    ? { backgroundColor: match[1], color: match[2] }
    : { backgroundColor: "#dce5ef", color: "#263548" };
}
type AppData = {
  dataVersion: number;
  updatedAt?: string;
  models: Model[];
  vendors: Vendor[];
  qcLocations: QCLocation[];
  pics: PIC[];
  records: Record<string, RecordRow[]>;
  notes: Note[];
  weeklyPayments: WeeklyPayment[];
};

const initial: AppData = {
  dataVersion: 3,
  models: [],
  vendors: [],
  qcLocations: [],
  pics: [],
  records: {},
  notes: [],
  weeklyPayments: [],
};

function mergeChangedItems<T>(
  base: T[],
  intended: T[],
  latest: T[],
  keyOf: (item: T) => string,
) {
  const baseById = new Map(base.map((item) => [keyOf(item), item])),
    intendedById = new Map(intended.map((item) => [keyOf(item), item])),
    merged = new Map(latest.map((item) => [keyOf(item), item]));
  for (const id of baseById.keys()) {
    if (!intendedById.has(id)) merged.delete(id);
  }
  for (const [id, item] of intendedById) {
    const before = baseById.get(id);
    if (!before || JSON.stringify(before) !== JSON.stringify(item))
      merged.set(id, item);
  }
  return [...merged.values()];
}

function mergeConflictState(base: AppData, intended: AppData, latest: AppData) {
  const stageNames = new Set([
      ...Object.keys(base.records),
      ...Object.keys(intended.records),
      ...Object.keys(latest.records),
    ]),
    records = Object.fromEntries(
      [...stageNames].map((stage) => [
        stage,
        mergeChangedItems(
          base.records[stage] ?? [],
          intended.records[stage] ?? [],
          latest.records[stage] ?? [],
          (item) => item.id,
        ),
      ]),
    );
  return {
    ...latest,
    models: mergeChangedItems(base.models, intended.models, latest.models, (item) => item.code),
    vendors: mergeChangedItems(base.vendors, intended.vendors, latest.vendors, (item) => item.code),
    qcLocations: mergeChangedItems(base.qcLocations, intended.qcLocations, latest.qcLocations, (item) => item.code),
    pics: mergeChangedItems(base.pics, intended.pics, latest.pics, (item) => item.code),
    records,
    notes: mergeChangedItems(base.notes, intended.notes, latest.notes, (item) => item.id),
    weeklyPayments: mergeChangedItems(
      base.weeklyPayments,
      intended.weeklyPayments,
      latest.weeklyPayments,
      (item) => item.id,
    ),
  } satisfies AppData;
}

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  code: "",
  name: "",
  colors: "",
  sizes: "",
  sourceId: "",
  destination: "",
  recipient: "",
  officer: "",
  note: "",
  remainingStatus: "Masih dijahit",
  qcPassed: 0,
  qcReject: 0,
  qcRepair: 0,
  sewingRate: 0,
  cuttingRate: 0,
  paidAmount: 0,
  paymentDate: "",
  paymentPIC: "",
  paymentNote: "",
  decorationProcess: "none" as DecorationProcess,
  decorationType: "screenprint" as "screenprint" | "embroidery",
  decorationPosition: "Badan belakang",
  decorationDescription: "",
  decorationRate: 0,
  decorationCompleted: 0,
  decorationRequiredBeforeBundle: true,
  decorationFinalStep: true,
};
const sum = (v: Variant[]) => v.reduce((a, b) => a + b.qty, 0);
function automaticModelCode(
  name: string,
  models: Model[],
  currentCode?: string | null,
) {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const joined = words.join("");
  if (!joined) return "";
  const initials = words.map((x) => x[0]).join("");
  const base = (words.length > 1 ? initials + joined.slice(1) : joined)
    .slice(0, 3)
    .padEnd(3, "X");
  const used = new Set(
    models.filter((x) => x.code !== currentCode).map((x) => x.code),
  );
  if (!used.has(base)) return base;
  let number = 2,
    code = "";
  do {
    code = `${base}${String(number).padStart(2, "0")}`;
    number++;
  } while (used.has(code));
  return code;
}
function mergeVariants(rows: RecordRow[]) {
  const keys = [
    ...new Set(
      rows.flatMap((r) => r.variants.map((v) => `${v.color}|||${v.size}`)),
    ),
  ];
  return keys
    .map((key) => {
      const [color, size] = key.split("|||");
      return {
        color,
        size,
        qty: rows
          .flatMap((r) => r.variants)
          .filter((v) => v.color === color && v.size === size)
          .reduce((n, v) => n + v.qty, 0),
      };
    })
    .filter((v) => v.qty > 0);
}

function ReworkSummary({
  qcRows,
  rows,
}: {
  qcRows: RecordRow[];
  rows: RecordRow[];
}) {
  const done = new Set(rows.map((x) => x.sourceId));
  const waiting = qcRows.filter(
    (x) => x.qcDetails && (x.qcRepair ?? 0) > 0 && !done.has(x.id),
  );
  const repair = waiting.reduce((n, x) => n + (x.qcRepair ?? 0), 0),
    reject = qcRows.reduce((n, x) => n + (x.qcReject ?? 0), 0);
  return (
    <>
      <div className="rework-kpis">
        <article>
          <span>QC MENUNGGU TINDAK LANJUT</span>
          <b>{waiting.length}</b>
          <small>transaksi</small>
        </article>
        <article className="repair">
          <span>REPAIR</span>
          <b>{repair}</b>
          <small>unit</small>
        </article>
        <article className="reject">
          <span>REJECT · DIPISAH KE KARANTINA</span>
          <b>{reject}</b>
          <small>unit</small>
        </article>
      </div>
      {waiting.length > 0 && (
        <div className="rework-queue">
          {waiting.map((q) => (
            <article key={q.id}>
              <header>
                <div>
                  <small>VENDOR ASAL</small>
                  <h3>{q.originVendor || "Mengikuti vendor sumber"}</h3>
                  <span>
                    {q.id} · {q.modelName}
                  </span>
                </div>
                <em>Menunggu Rework</em>
              </header>
              <div>
                {q.qcDetails
                  ?.filter((x) => x.repair > 0)
                  .map((x) => (
                    <p key={`${x.color}-${x.size}`}>
                      <b>
                        {x.color} · {x.size}
                      </b>
                      <span>Repair {x.repair}</span>
                      <small>{x.note || "Tanpa catatan"}</small>
                    </p>
                  ))}
              </div>
            </article>
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <details className="qc-history">
          <summary>
            <span>✓</span>
            <b>{rows.length} transaksi Rework sudah dikirim</b>
            <small>Disembunyikan · klik untuk melihat riwayat</small>
          </summary>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>KODE REWORK</th>
                  <th>TANGGAL</th>
                  <th>SUMBER QC</th>
                  <th>VENDOR TUJUAN</th>
                  <th>MODEL</th>
                  <th>RINCIAN</th>
                  <th>JUMLAH</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.id}</b>
                    </td>
                    <td>{r.date}</td>
                    <td>{r.sourceId}</td>
                    <td>
                      <b>{r.destination}</b>
                    </td>
                    <td>{r.modelName}</td>
                    <td>
                      <small>
                        {r.variants
                          .map((v) => `${v.color} ${v.size}: ${v.qty}`)
                          .join(" · ")}
                      </small>
                    </td>
                    <td>
                      <b>{r.total}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </>
  );
}

function QCLocationMaster({
  items,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: QCLocation[];
  onAdd: () => void;
  onEdit: (x: QCLocation) => void;
  onDelete: (x: QCLocation) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((x) =>
    [x.code, x.location, x.recipient, x.phone, x.address]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <MasterTableTitle title="Master QC" />
      {items.length === 0 ? (
        <Empty
          title="Belum ada tujuan QC"
          text="Tambahkan tujuan dan penerima QC pertama."
        />
      ) : (
        <MasterTablePanel query={query} onQuery={setQuery} placeholder="Cari kode, lokasi, atau penerima..." addLabel="Tambah QC" onAdd={onAdd} count={filtered.length} columns={["No.", "Kode", "Lokasi QC", "Penerima", "Tarif", "Rekening", "Status", "Aksi"]}>
          <table className="master-data-table"><thead><tr><th>No.</th><th>Kode</th><th>Lokasi QC</th><th>Penerima</th><th>Tarif</th><th>Rekening</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
            {filtered.map((x, index) => <tr key={x.code}><td data-label="No.">{index + 1}</td><td data-label="Kode"><b>{x.code}</b></td><td data-label="Lokasi"><b>{x.location}</b><small>{x.address || "Alamat belum diisi"}</small></td><td data-label="Penerima"><b>{x.recipient}</b><small>{x.phone || "Kontak belum diisi"}</small></td><td data-label="Tarif">{x.rate ? `${rupiah(x.rate)} / unit` : "Belum diatur"}</td><td data-label="Rekening">{x.bankName && x.accountNumber ? <><b>{x.bankName} {x.accountNumber}</b><small>a.n. {x.accountHolder || x.recipient}</small></> : "Belum diisi"}</td><td data-label="Status"><span className={`master-status ${x.active ? "active" : "inactive"}`}>{x.active ? "Aktif" : "Nonaktif"}</span></td><td data-label="Aksi"><MasterRowActions onEdit={() => onEdit(x)} onDelete={() => onDelete(x)} /></td></tr>)}
          </tbody></table>
        </MasterTablePanel>
      )}
    </>
  );
}

function MasterTableTitle({ title }: { title: string }) {
  return <div className="master-table-title"><div><h1>{title}</h1></div><p>Master <b>›</b> {title.replace("Master ", "")}</p></div>;
}
function MasterTablePanel({ query, onQuery, placeholder, addLabel, onAdd, count, columns, children }: { query: string; onQuery: (value: string) => void; placeholder: string; addLabel: string; onAdd: () => void; count: number; columns: string[]; children: ReactNode }) {
  const [columnMenu, setColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(() => true));
  const allVisible = visibleColumns.every(Boolean);
  const hiddenClasses = visibleColumns.map((visible, index) => visible ? "" : `hide-master-col-${index + 1}`).filter(Boolean).join(" ");
  const toggleColumn = (index: number) => setVisibleColumns((current) => current.map((visible, itemIndex) => itemIndex === index ? !visible : visible));
  return <section className={`master-table-panel ${hiddenClasses}`}>
    <header className="master-table-toolbar">
      <div className="master-toolbar-left">
        <label className="master-search-field"><span className="master-search-icon">⌕</span><input value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} /></label>
        <div className="master-column-control">
          <button type="button" className="master-column-button" aria-expanded={columnMenu} onClick={() => setColumnMenu((open) => !open)}><span>▥</span> Kolom</button>
          {columnMenu && <div className="master-column-menu"><header><b>KOLOM</b><b>TAMPIL</b></header><label className="toggle-all"><span>Tampilkan semua</span><input type="checkbox" checked={allVisible} onChange={() => setVisibleColumns(columns.map(() => !allVisible))} /></label>{columns.map((column, index) => <label key={column}><span>{column}</span><input type="checkbox" checked={visibleColumns[index]} onChange={() => toggleColumn(index)} /></label>)}</div>}
        </div>
      </div>
      <button className="primary" onClick={onAdd}>＋ {addLabel}</button>
    </header>
    <div className="master-table-scroll">{children}</div><footer><span>Tampilkan <b>{Math.min(10, count)}</b> data</span><span>Menampilkan {count ? `1–${count}` : "0"} dari {count} data</span><b className="master-page">1</b></footer>
  </section>;
}
function MasterRowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="master-row-actions"><button title="Edit" aria-label="Edit" onClick={onEdit}>✎</button><button className="danger" title="Hapus" aria-label="Hapus" onClick={onDelete}>♲</button></div>;
}
function VendorPerformance({ data }: { data: AppData }) {
  const [mode, setMode] = useState("week");
  const today = new Date(),
    iso = (d: Date) => d.toISOString().slice(0, 10),
    add = (d: Date, n: number) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const monday = add(today, -((today.getDay() + 6) % 7));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const presets =
    mode === "week"
      ? {
          a: [iso(monday), iso(add(monday, 6))],
          b: [iso(add(monday, 7)), iso(add(monday, 13))],
          la: "Minggu ini",
          lb: "Minggu depan",
        }
      : {
          a: [
            iso(monthStart),
            iso(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
          ],
          b: [
            iso(new Date(today.getFullYear(), today.getMonth() + 1, 1)),
            iso(new Date(today.getFullYear(), today.getMonth() + 2, 0)),
          ],
          la: "Bulan ini",
          lb: "Bulan depan",
        };
  const [custom, setCustom] = useState({
    a1: iso(monday),
    a2: iso(today),
    b1: iso(add(today, 1)),
    b2: iso(add(today, 7)),
  });
  const range =
    mode === "custom"
      ? {
          a: [custom.a1, custom.a2],
          b: [custom.b1, custom.b2],
          la: "Periode A",
          lb: "Periode B",
        }
      : presets;
  const shipments = data.records["Pengiriman Vendor"] ?? [],
    receipts = data.records["Penerimaan Gudang"] ?? [];
  const inRange = (date: string, r: string[]) => date >= r[0] && date <= r[1];
  const cards = data.vendors.map((v) => {
    const sent = shipments.filter((x) => x.destination === v.name),
      received = (s: RecordRow) =>
        receipts
          .filter((x) => x.sourceId === s.id)
          .reduce((n, x) => n + x.total, 0),
      done = sent.reduce((n, x) => n + received(x), 0),
      total = sent.reduce((n, x) => n + x.total, 0),
      left = Math.max(0, total - done),
      activeModels = [
        ...new Set(
          sent.filter((x) => x.total > received(x)).map((x) => x.modelName),
        ),
      ],
      oldest = sent
        .filter((x) => x.total > received(x))
        .sort((a, b) => a.date.localeCompare(b.date))[0],
      days = oldest
        ? Math.max(
            0,
            Math.floor(
              (today.getTime() -
                new Date(oldest.date + "T00:00:00").getTime()) /
                86400000,
            ),
          )
        : 0;
    const period = (r: string[]) => {
      const periodSent = sent
          .filter((x) => inRange(x.date, r))
          .reduce((n, x) => n + x.total, 0),
        periodDone = receipts
          .filter(
            (x) => inRange(x.date, r) && sent.some((s) => s.id === x.sourceId),
          )
          .reduce((n, x) => n + x.total, 0);
      return { sent: periodSent, done: periodDone };
    };
    return {
      v,
      total,
      done,
      left,
      activeModels,
      days,
      a: period(range.a),
      b: period(range.b),
    };
  });
  return (
    <section className="vendor-owner">
      <header>
        <div>
          <p className="overline">MONITORING VENDOR</p>
          <h2>Progres per vendor</h2>
          <span>Pekerjaan, setoran, sisa jahitan, dan perbandingan waktu.</span>
        </div>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="week">Minggu ini vs minggu depan</option>
          <option value="month">Bulan ini vs bulan depan</option>
          <option value="custom">Tanggal custom</option>
        </select>
      </header>
      {mode === "custom" && (
        <div className="period-custom">
          <label>
            Periode A
            <input
              type="date"
              value={custom.a1}
              onChange={(e) => setCustom({ ...custom, a1: e.target.value })}
            />
            <input
              type="date"
              value={custom.a2}
              onChange={(e) => setCustom({ ...custom, a2: e.target.value })}
            />
          </label>
          <label>
            Periode B
            <input
              type="date"
              value={custom.b1}
              onChange={(e) => setCustom({ ...custom, b1: e.target.value })}
            />
            <input
              type="date"
              value={custom.b2}
              onChange={(e) => setCustom({ ...custom, b2: e.target.value })}
            />
          </label>
        </div>
      )}
      <div className="vendor-owner-grid">
        {cards.map((x) => (
          <article key={x.v.code}>
            <header>
              <div>
                <small>{x.v.code}</small>
                <h3>{x.v.name}</h3>
              </div>
              <em>
                {x.left > 0 ? `${x.days} hari berjalan` : "Tidak ada WIP"}
              </em>
            </header>
            <p className="vendor-models">
              <span>Jaket dikerjakan</span>
              <b>{x.activeModels.join(", ") || "Tidak ada"}</b>
            </p>
            <div className="vendor-numbers">
              <p>
                <span>Dikirim</span>
                <b>{x.total}</b>
              </p>
              <p>
                <span>Selesai</span>
                <b>{x.done}</b>
              </p>
              <p className="left">
                <span>Belum selesai</span>
                <b>{x.left}</b>
              </p>
            </div>
            <div className="vendor-compare">
              <section>
                <b>{range.la}</b>
                <span>
                  Kirim {x.a.sent} · Selesai {x.a.done}
                </span>
              </section>
              <i>VS</i>
              <section>
                <b>{range.lb}</b>
                <span>
                  Kirim {x.b.sent} · Selesai {x.b.done}
                </span>
              </section>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function VendorBreakdown({ data }: { data: AppData }) {
  const shipments = data.records["Pengiriman Vendor"] ?? [],
    receipts = data.records["Penerimaan Gudang"] ?? [];
  const jobs = data.vendors.map((v) => ({
    vendor: v,
    items: shipments
      .filter((s) => s.destination === v.name)
      .map((s) => {
        const related = receipts.filter((r) => r.sourceId === s.id),
          received = related.reduce((n, r) => n + r.total, 0),
          remaining = s.variants
            .map((x) => ({
              ...x,
              qty: Math.max(
                0,
                x.qty -
                  related
                    .flatMap((r) => r.variants)
                    .filter((y) => y.color === x.color && y.size === x.size)
                    .reduce((n, y) => n + y.qty, 0),
              ),
            }))
            .filter((x) => x.qty > 0);
        return {
          s,
          received,
          left: Math.max(0, s.total - received),
          remaining,
        };
      })
      .filter((x) => x.left > 0),
  }));
  return (
    <section className="vendor-detail-section">
      <div className="section-title">
        <div>
          <h2>Rincian WIP per vendor</h2>
          <p>
            Model, kiriman, warna, ukuran, dan jumlah yang masih berada di
            vendor.
          </p>
        </div>
      </div>
      <div className="vendor-detail-grid">
        {jobs.map((x) => (
          <article key={x.vendor.code}>
            <header>
              <div>
                <small>{x.vendor.code}</small>
                <h3>{x.vendor.name}</h3>
              </div>
              <b>
                {x.items.reduce((n, i) => n + i.left, 0)}{" "}
                <small>unit tersisa</small>
              </b>
            </header>
            {x.items.length === 0 ? (
              <p className="vendor-detail-empty">Tidak ada pekerjaan aktif.</p>
            ) : (
              <div className="vendor-job-list">
                {x.items.map((i) => (
                  <section key={i.s.id}>
                    <div className="vendor-job-head">
                      <span>
                        <b>{i.s.modelName}</b>
                        <small>
                          {i.s.id} · dikirim {i.s.date}
                        </small>
                      </span>
                      <span>
                        <b>{i.left} unit</b>
                        <small>
                          Dikirim {i.s.total} · selesai {i.received}
                        </small>
                      </span>
                    </div>
                    <div className="vendor-variant-list">
                      {i.remaining.map((v) => (
                        <p key={`${v.color}-${v.size}`}>
                          <span>{v.color}</span>
                          <b>{v.size}</b>
                          <strong>{v.qty}</strong>
                        </p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function subtractVariants(base: Variant[], used: Variant[]) {
  return base
    .map((v) => ({
      ...v,
      qty: Math.max(
        0,
        v.qty -
          used
            .filter((x) => x.color === v.color && x.size === v.size)
            .reduce((n, x) => n + x.qty, 0),
      ),
    }))
    .filter((v) => v.qty > 0);
}
function tracePO(data: AppData, shipment: RecordRow) {
  const bundle = (data.records.Bundle ?? []).find(
      (x) => x.id === shipment.sourceId,
    ),
    cut = (data.records.Cutting ?? []).find((x) => x.id === bundle?.sourceId),
    po = (data.records["Order Produksi"] ?? []).find(
      (x) => x.id === cut?.sourceId,
    );
  return shipment.poId ?? cut?.poId ?? cut?.id ?? po?.id ?? "Referensi Cutting tidak ditemukan";
}

function LegacyOwnerVendorMonitoring({ data }: { data: AppData }) {
  const [mode, setMode] = useState("week");
  const today = new Date(),
    iso = (d: Date) => d.toISOString().slice(0, 10),
    add = (d: Date, n: number) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate() + n),
    monday = add(today, -((today.getDay() + 6) % 7)),
    monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const presets =
    mode === "week"
      ? {
          a: [iso(monday), iso(add(monday, 6))],
          b: [iso(add(monday, 7)), iso(add(monday, 13))],
          la: "Minggu ini",
          lb: "Minggu depan",
        }
      : {
          a: [
            iso(monthStart),
            iso(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
          ],
          b: [
            iso(new Date(today.getFullYear(), today.getMonth() + 1, 1)),
            iso(new Date(today.getFullYear(), today.getMonth() + 2, 0)),
          ],
          la: "Bulan ini",
          lb: "Bulan depan",
        };
  const [custom, setCustom] = useState({
      a1: iso(monday),
      a2: iso(today),
      b1: iso(add(today, 1)),
      b2: iso(add(today, 7)),
    }),
    range =
      mode === "custom"
        ? {
            a: [custom.a1, custom.a2],
            b: [custom.b1, custom.b2],
            la: "Periode A",
            lb: "Periode B",
          }
        : presets;
  const shipments = data.records["Pengiriman Vendor"] ?? [],
    receipts = data.records["Penerimaan Gudang"] ?? [],
    inRange = (date: string, r: string[]) => date >= r[0] && date <= r[1];
  const vendors = data.vendors.map((v) => {
    const sent = shipments.filter((x) => x.destination === v.name),
      jobs = sent
        .map((s) => {
          const related = receipts.filter((r) => r.sourceId === s.id),
            receivedVariants = related.flatMap((r) => r.variants),
            remaining = subtractVariants(s.variants, receivedVariants),
            received = related.reduce((n, r) => n + r.total, 0);
          return {
            s,
            po: tracePO(data, s),
            remaining,
            left: sum(remaining),
            received,
          };
        })
        .filter((x) => x.left > 0),
      total = sent.reduce((n, x) => n + x.total, 0),
      done = sent.reduce(
        (n, s) =>
          n +
          receipts
            .filter((r) => r.sourceId === s.id)
            .reduce((a, r) => a + r.total, 0),
        0,
      ),
      left = jobs.reduce((n, x) => n + x.left, 0),
      oldest = jobs
        .map((x) => x.s)
        .sort((a, b) => a.date.localeCompare(b.date))[0],
      days = oldest
        ? Math.max(
            0,
            Math.floor(
              (today.getTime() -
                new Date(oldest.date + "T00:00:00").getTime()) /
                86400000,
            ),
          )
        : 0,
      period = (r: string[]) => ({
        sent: sent
          .filter((x) => inRange(x.date, r))
          .reduce((n, x) => n + x.total, 0),
        done: receipts
          .filter(
            (x) => inRange(x.date, r) && sent.some((s) => s.id === x.sourceId),
          )
          .reduce((n, x) => n + x.total, 0),
      });
    return {
      v,
      jobs,
      total,
      done,
      left,
      days,
      a: period(range.a),
      b: period(range.b),
    };
  });
  return (
    <>
      <section className="vendor-owner enhanced">
        <header>
          <div>
            <p className="overline">MONITORING PENJAHIT</p>
            <h2>Progres per vendor</h2>
            <span>
              Model aktif dan sisa warna–ukuran terlihat langsung tanpa membuka
              transaksi.
            </span>
          </div>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="week">Minggu ini vs minggu depan</option>
            <option value="month">Bulan ini vs bulan depan</option>
            <option value="custom">Tanggal custom</option>
          </select>
        </header>
        {mode === "custom" && (
          <div className="period-custom">
            <label>
              Periode A
              <input
                type="date"
                value={custom.a1}
                onChange={(e) => setCustom({ ...custom, a1: e.target.value })}
              />
              <input
                type="date"
                value={custom.a2}
                onChange={(e) => setCustom({ ...custom, a2: e.target.value })}
              />
            </label>
            <label>
              Periode B
              <input
                type="date"
                value={custom.b1}
                onChange={(e) => setCustom({ ...custom, b1: e.target.value })}
              />
              <input
                type="date"
                value={custom.b2}
                onChange={(e) => setCustom({ ...custom, b2: e.target.value })}
              />
            </label>
          </div>
        )}
        <div className="vendor-owner-grid">
          {vendors.map((x) => (
            <article
              key={x.v.code}
              className={x.left > 0 ? "vendor-active" : "vendor-idle"}
            >
              <header>
                <div>
                  <small>{x.v.code}</small>
                  <h3>{x.v.name}</h3>
                </div>
                <em>{x.left > 0 ? `● Aktif · ${x.days} hari` : "○ Kosong"}</em>
              </header>
              <div className="vendor-numbers">
                <p>
                  <span>Dikirim</span>
                  <b>{x.total}</b>
                </p>
                <p>
                  <span>Selesai</span>
                  <b>{x.done}</b>
                </p>
                <p className="left">
                  <span>Di penjahit</span>
                  <b>{x.left}</b>
                </p>
              </div>
              {x.jobs.length > 0 ? (
                <div className="vendor-mini-wip">
                  {x.jobs.map((j) => (
                    <section key={j.s.id}>
                      <div>
                        <b>{j.s.modelName}</b>
                        <small>
                          {j.po} · {j.s.id}
                        </small>
                      </div>
                      <strong>{j.left} unit</strong>
                      <p>
                        {j.remaining
                          .map((v) => `${v.color} ${v.size}: ${v.qty}`)
                          .join(" · ")}
                      </p>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="vendor-no-work">
                  Tidak ada barang yang tertahan di vendor.
                </p>
              )}
              <div className="vendor-compare">
                <section>
                  <b>{range.la}</b>
                  <span>
                    Kirim {x.a.sent} · Selesai {x.a.done}
                  </span>
                </section>
                <i>VS</i>
                <section>
                  <b>{range.lb}</b>
                  <span>
                    Kirim {x.b.sent} · Selesai {x.b.done}
                  </span>
                </section>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="vendor-detail-section">
        <div className="section-title">
          <div>
            <h2>Rincian WIP per vendor</h2>
            <p>
              Referensi Cutting, artikel, warna, ukuran, dan saldo fisik yang masih di
              penjahit.
            </p>
          </div>
        </div>
        <div className="vendor-detail-grid">
          {vendors.map((x) => (
            <article key={x.v.code}>
              <header>
                <div>
                  <small>{x.v.code}</small>
                  <h3>{x.v.name}</h3>
                  <em className={x.left > 0 ? "active" : "idle"}>
                    {x.left > 0 ? "Ada pekerjaan aktif" : "Tidak ada WIP"}
                  </em>
                </div>
                <b>
                  {x.left}
                  <small>unit tersisa</small>
                </b>
              </header>
              {x.jobs.length === 0 ? (
                <p className="vendor-detail-empty">
                  Vendor kosong — tidak ada pekerjaan aktif.
                </p>
              ) : (
                <div className="vendor-job-list">
                  {x.jobs.map((j) => (
                    <section key={j.s.id}>
                      <div className="vendor-job-head">
                        <span>
                          <b>{j.s.modelName}</b>
                          <small>
                            Referensi {j.po} · Kiriman {j.s.id}
                          </small>
                        </span>
                        <span>
                          <b>{j.left} unit</b>
                          <small>
                            Dikirim {j.s.total} · diterima {j.received}
                          </small>
                        </span>
                      </div>
                      <div className="vendor-variant-list">
                        {j.remaining.map((v) => (
                          <p key={`${v.color}-${v.size}`}>
                            <span>{v.color}</span>
                            <b>{v.size}</b>
                            <strong>{v.qty}</strong>
                          </p>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function OwnerVendorMonitoring({
  data,
  periodStart,
  periodEnd,
}: {
  data: AppData;
  periodStart: string;
  periodEnd: string;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    [historyQuery, setHistoryQuery] = useState(""),
    [historyPeriod, setHistoryPeriod] = useState<"dashboard" | "today" | "week" | "month" | "custom" | "all">("dashboard"),
    [historyCustomStart, setHistoryCustomStart] = useState(periodStart),
    [historyCustomEnd, setHistoryCustomEnd] = useState(periodEnd),
    today = new Date(),
    shipments = data.records["Pengiriman Vendor"] ?? [],
    receipts = data.records["Penerimaan Gudang"] ?? [];
  const vendors = data.vendors.map((v) => {
      const sent = shipments.filter((x) => x.destination === v.name),
        allJobs = sent.map((s) => {
            const related = receipts.filter((r) => r.sourceId === s.id),
              remaining = subtractVariants(
                s.variants,
                related.flatMap((r) => r.variants),
              ),
              received = related.reduce((n, r) => n + r.total, 0);
            return {
              s,
              po: tracePO(data, s),
              related,
              remaining,
              left: sum(remaining),
              received,
              age: Math.max(
                0,
                Math.floor(
                  (today.getTime() - new Date(s.date + "T00:00:00").getTime()) /
                    86400000,
                ),
              ),
            };
          }),
        jobs = allJobs.filter((x) => x.left > 0),
        periodReceipts = allJobs.flatMap((job) =>
          job.related
            .filter((receipt) => receipt.date >= periodStart && receipt.date <= periodEnd)
            .map((receipt) => ({ receipt, job })),
        ),
        total = sent.reduce((n, x) => n + x.total, 0),
        done = allJobs.reduce((n, job) => n + job.received, 0),
        donePeriod = periodReceipts.reduce((n, item) => n + item.receipt.total, 0),
        left = jobs.reduce((n, x) => n + x.left, 0),
        days = jobs.length ? Math.max(...jobs.map((job) => job.age)) : 0,
        completedJobs = allJobs.filter((job) => {
          if (job.left > 0 || job.related.length === 0) return false;
          const finalDate = [...job.related].sort((a, b) => b.date.localeCompare(a.date))[0].date;
          return finalDate >= periodStart && finalDate <= periodEnd;
        }),
        averageDays = completedJobs.length
          ? Math.round(
              completedJobs.reduce((sumDays, job) => {
                const finalDate = [...job.related].sort((a, b) => b.date.localeCompare(a.date))[0].date;
                return (
                  sumDays +
                  Math.max(
                    0,
                    Math.floor(
                      (new Date(finalDate + "T00:00:00").getTime() -
                        new Date(job.s.date + "T00:00:00").getTime()) /
                        86400000,
                    ),
                  )
                );
              }, 0) / completedJobs.length,
            )
          : null,
        periodModels = [...new Set(periodReceipts.map((item) => item.receipt.modelName))],
        status = left > 0 ? "active" : donePeriod > 0 ? "done" : "idle";
      return { v, allJobs, jobs, periodReceipts, periodModels, total, done, donePeriod, left, days, averageDays, status };
    }),
    detail = vendors.find((x) => x.v.code === selected);
  const todayString = localDateString(today),
    historyWeekDate = new Date(today);
  historyWeekDate.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const historyWeekStart = localDateString(historyWeekDate),
    historyMonthStart = `${todayString.slice(0, 8)}01`,
    historyStart = historyPeriod === "dashboard" ? periodStart : historyPeriod === "today" ? todayString : historyPeriod === "week" ? historyWeekStart : historyPeriod === "month" ? historyMonthStart : historyPeriod === "custom" ? historyCustomStart : "",
    historyEnd = historyPeriod === "dashboard" ? periodEnd : historyPeriod === "custom" ? historyCustomEnd : historyPeriod === "all" ? "" : todayString,
    normalizedHistoryQuery = historyQuery.trim().toLowerCase(),
    filteredHistoryReceipts = detail
      ? detail.allJobs
          .flatMap((job) => job.related.map((receipt) => ({ receipt, job })))
          .filter(({ receipt, job }) => {
            const inRange = historyPeriod === "all" || (receipt.date >= historyStart && receipt.date <= historyEnd),
              searchable = [receipt.id, receipt.sourceId, receipt.modelName, receipt.date, job.po, job.s.id, ...receipt.variants.flatMap((variant) => [variant.color, variant.size])].join(" ").toLowerCase();
            return inRange && (!normalizedHistoryQuery || searchable.includes(normalizedHistoryQuery));
          })
          .sort((a, b) => b.receipt.date.localeCompare(a.receipt.date) || b.receipt.id.localeCompare(a.receipt.id))
      : [],
    filteredHistoryTotal = filteredHistoryReceipts.reduce((totalQty, item) => totalQty + item.receipt.total, 0);
  return (
    <section className="owner-simple-panel vendor-simple">
      <header>
        <div>
          <h2>Aktivitas Vendor</h2>
        </div>
      </header>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>STATUS</th>
              <th>VENDOR</th>
              <th>PEKERJAAN AKTIF</th>
              <th>WIP AKTUAL</th>
              <th>SELESAI PERIODE</th>
              <th>MODEL SELESAI</th>
              <th>USIA WIP</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((x) => (
              <tr key={x.v.code} onClick={() => setSelected(x.v.code)}>
                <td>
                  <span
                    className={`vendor-dot ${x.status}`}
                  >
                    {x.status === "active" ? "Aktif" : x.status === "done" ? "Selesai" : "Kosong"}
                  </span>
                </td>
                <td>
                  <b>{x.v.name}</b>
                  <small>{x.v.code}</small>
                </td>
                <td>
                  <b>
                    {[...new Set(x.jobs.map((j) => j.s.modelName))].join(
                      ", ",
                    ) || "—"}
                  </b>
                  <small>
                    {x.jobs.length
                      ? `${x.jobs.length} kiriman aktif`
                      : "Tidak ada pekerjaan"}
                  </small>
                </td>
                <td><strong>{x.left}</strong></td>
                <td>{x.donePeriod}</td>
                <td>{x.periodModels.join(", ") || "—"}</td>
                <td>{x.left > 0 ? `${x.days} hari` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detail && (
        <div
          className="owner-drawer-backdrop"
          onClick={() => setSelected(null)}
        >
          <aside className="owner-drawer vendor-activity-drawer" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>Rincian {detail.v.name}</h2>
                <span>{detail.left} unit WIP · {detail.donePeriod} unit selesai pada periode</span>
              </div>
              <button onClick={() => setSelected(null)}>×</button>
            </header>
            <div className="vendor-activity-drawer-body">
              <div className="vendor-drawer-summary">
                <article><span>WIP aktual</span><b>{detail.left}</b></article>
                <article><span>Selesai periode</span><b>{detail.donePeriod}</b></article>
                <article><span>Usia WIP tertua</span><b>{detail.left > 0 ? `${detail.days} hari` : "—"}</b></article>
                <article><span>Rata-rata selesai</span><b>{detail.averageDays === null ? "—" : `${detail.averageDays} hari`}</b></article>
              </div>
              <section className="vendor-drawer-section">
                <header><h3>Pekerjaan aktif</h3><b>{detail.jobs.length} kiriman</b></header>
                {detail.jobs.length === 0 ? <p className="vendor-drawer-empty">Tidak ada pekerjaan aktif.</p> : <div className="summary-detail-table-wrap"><table className="summary-detail-table vendor-activity-table"><thead><tr><th>No.</th><th>Referensi</th><th>Model</th><th>Warna</th><th>Size</th><th>Dikirim</th><th>Diterima</th><th>Sisa</th><th>Usia</th></tr></thead><tbody>{detail.jobs.flatMap((job) => job.remaining.map((variant) => {
                  const sentQty = job.s.variants.filter((item) => item.color === variant.color && item.size === variant.size).reduce((totalQty, item) => totalQty + item.qty, 0),
                    receivedQty = sentQty - variant.qty;
                  return { job, variant, sentQty, receivedQty };
                })).map(({ job, variant, sentQty, receivedQty }, index, rows) => <tr className={index === 0 || job.s.modelName !== rows[index - 1].job.s.modelName ? "model-group-start" : ""} key={`${job.s.id}-${variant.color}-${variant.size}`}><td>{index + 1}</td><td><b>{job.s.id}</b><small>{job.po}</small></td><td>{job.s.modelName}</td><td className="summary-color-cell" style={dashboardColorTone(variant.color)}>{variant.color}</td><td>{variant.size}</td><td>{sentQty}</td><td>{receivedQty}</td><td><strong>{variant.qty}</strong></td><td>{job.age} hari</td></tr>)}</tbody></table></div>}
              </section>
              <section className="vendor-drawer-section">
                <header><h3>Riwayat selesai</h3><b>{filteredHistoryTotal} unit · {filteredHistoryReceipts.length} setoran</b></header>
                <div className="vendor-history-filters">
                  <label className="vendor-history-search"><span>Cari riwayat</span><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Nomor, PO, model, warna, size..." /></label>
                  <label><span>Periode</span><select value={historyPeriod} onChange={(event) => setHistoryPeriod(event.target.value as typeof historyPeriod)}><option value="dashboard">Periode dashboard</option><option value="today">Hari ini</option><option value="week">Minggu ini</option><option value="month">Bulan ini</option><option value="custom">Custom</option><option value="all">Semua waktu</option></select></label>
                  {historyPeriod === "custom" && <><label><span>Mulai</span><input type="date" value={historyCustomStart} onChange={(event) => setHistoryCustomStart(event.target.value)} /></label><label><span>Selesai</span><input type="date" value={historyCustomEnd} min={historyCustomStart} onChange={(event) => setHistoryCustomEnd(event.target.value)} /></label></>}
                </div>
                {filteredHistoryReceipts.length === 0 ? <p className="vendor-drawer-empty">Tidak ada riwayat yang cocok dengan pencarian dan periode.</p> : <div className="summary-detail-table-wrap vendor-history-table-scroll"><table className="summary-detail-table vendor-history-table"><thead><tr><th>No.</th><th>Tanggal</th><th>Referensi</th><th>Model</th><th>Warna</th><th>Size</th><th>Jumlah</th><th>Usia Pekerjaan</th></tr></thead><tbody>{filteredHistoryReceipts.flatMap(({ receipt, job }) => {
                  const workAge = Math.max(0, Math.floor((new Date(receipt.date + "T00:00:00").getTime() - new Date(job.s.date + "T00:00:00").getTime()) / 86400000));
                  return receipt.variants.map((variant) => ({ receipt, job, variant, workAge }));
                }).map(({ receipt, job, variant, workAge }, index, rows) => <tr className={index === 0 || receipt.modelName !== rows[index - 1].receipt.modelName ? "model-group-start" : ""} key={`${receipt.id}-${variant.color}-${variant.size}`}><td>{index + 1}</td><td>{receipt.date}</td><td><b>{receipt.id}</b><small>{job.po}</small></td><td>{receipt.modelName}</td><td className="summary-color-cell" style={dashboardColorTone(variant.color)}>{variant.color}</td><td>{variant.size}</td><td><strong>{variant.qty}</strong></td><td>{workAge} hari</td></tr>)}</tbody></table></div>}
              </section>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function cuttingWorkflowStatus(
  row: RecordRow,
  allRecords: Record<string, RecordRow[]>,
) {
  const bundles = (allRecords.Bundle ?? []).filter(
    (item) => item.sourceId === row.id,
  );
  const bundled = bundles.reduce((total, item) => total + item.total, 0);
  if (bundled === 0)
    return { label: "Menunggu Bundle", tone: "waiting", done: false };
  if (bundled < row.total)
    return { label: "Sebagian Dibundle", tone: "partial", done: false };

  const shippedBundleIds = new Set(
    (allRecords["Pengiriman Vendor"] ?? []).map((item) => item.sourceId),
  );
  const allBundlesShipped =
    bundles.length > 0 && bundles.every((bundle) => shippedBundleIds.has(bundle.id));
  return allBundlesShipped
    ? { label: "Seluruh Bundle Dikirim", tone: "done", done: true }
    : { label: "Selesai Dibundle", tone: "done", done: true };
}

const tableToolbarStages = new Set(stages);

const qcOperationalStages = new Set([
  "Pengiriman QC",
  "Quality Control",
  "Rework",
  "Penerimaan Rework",
  "QC Ulang",
]);

function stagePrimaryActionLabel(active: string) {
  if (active === "Cutting") return "Catat hasil Cutting";
  if (active === "Sablon/Bordir") return "Buat pekerjaan dekorasi";
  if (active === "Pengiriman Vendor") return "Kirim ke vendor";
  if (active === "Penerimaan Gudang") return "Terima setoran vendor";
  if (active === "Pengiriman QC") return "Kirim ke QC";
  if (active === "Quality Control") return "Terima & periksa";
  if (active === "Rework") return "Kirim repair";
  if (active === "Penerimaan Rework") return "Terima hasil repair";
  if (active === "QC Ulang") return "Periksa ulang";
  if (active === "Stok Barang Jadi") return "Masukkan stok";
  return "Catat proses";
}

function LiveStageStatus({
  active,
  rows,
  allRecords,
  mode,
  onUpdateDecoration,
  showTableToolbar = false,
  onAdd,
  addLabel,
  addDisabled = false,
}: {
  active: string;
  rows: RecordRow[];
  allRecords: Record<string, RecordRow[]>;
  mode: "active" | "completed";
  onUpdateDecoration?: (row: RecordRow) => void;
  showTableToolbar?: boolean;
  onAdd?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
}) {
  const [activeQuery, setActiveQuery] = useState("");
  const [mobileView, setMobileView] = useState<"cards" | "table">("table");
  const [columnMenu, setColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => Array(13).fill(true) as boolean[]);
  const [completedQuery, setCompletedQuery] = useState("");
  const [completedPeriod, setCompletedPeriod] = useState<"today" | "week" | "month" | "custom" | "all">("month");
  const [completedStart, setCompletedStart] = useState("");
  const [completedEnd, setCompletedEnd] = useState("");
  const children = (stage: string, id: string) =>
    (allRecords[stage] ?? []).filter((x) => x.sourceId === id);
  const statusFor = (r: RecordRow) => {
    if (active === "Order Produksi")
      return children("Cutting", r.id).length
        ? { label: "Selesai · Masuk Cutting", tone: "done", done: true }
        : { label: "Menunggu Cutting", tone: "waiting", done: false };
    if (active === "Cutting") return cuttingWorkflowStatus(r, allRecords);
    if (active === "Bundle") {
      return children("Pengiriman Vendor", r.id).length
        ? { label: "Dikirim ke Vendor Jahit", tone: "done", done: true }
        : { label: "Menunggu Pengiriman Vendor", tone: "waiting", done: false };
    }
    if (active === "Sablon/Bordir") {
      const completed = Math.min(r.total, r.decorationCompleted ?? 0);
      return completed >= r.total
        ? { label: "Selesai", tone: "done", done: true }
        : completed > 0
          ? {
              label: `Selesai sebagian · ${completed}/${r.total}`,
              tone: "partial",
              done: false,
            }
          : { label: "Di vendor dekorasi", tone: "waiting", done: false };
    }
    if (active === "Pengiriman Vendor") {
      const received = children("Penerimaan Gudang", r.id).reduce(
        (n, x) => n + x.total,
        0,
      );
      return received === 0
        ? { label: "Masih Dijahit", tone: "waiting", done: false }
        : received < r.total
          ? {
              label: `Setoran Sebagian · ${received}/${r.total}`,
              tone: "partial",
              done: false,
            }
          : { label: "Selesai Dijahit & Disetor", tone: "done", done: true };
    }
    if (active === "Penerimaan Gudang") {
      if (r.qcMode === "vendor")
        return {
          label: `QC Vendor Selesai${r.qcOfficer ? ` · ${r.qcOfficer}` : ""}`,
          tone: "done",
          done: true,
        };
      const sent = children("Pengiriman QC", r.id).reduce(
        (total, child) => total + child.total,
        0,
      );
      return sent === 0
        ? { label: "Menunggu Kirim QC", tone: "waiting", done: false }
        : sent < r.total
          ? {
              label: `Dikirim ke QC sebagian · ${sent}/${r.total}`,
              tone: "partial",
              done: false,
            }
          : { label: "Seluruhnya dikirim ke QC", tone: "done", done: true };
    }
    if (active === "Pengiriman QC")
      return children("Quality Control", r.id).length
        ? { label: "Selesai Diperiksa QC", tone: "done", done: true }
        : { label: "Menunggu Pemeriksaan QC", tone: "waiting", done: false };
    if (active === "Quality Control" || active === "QC Ulang") {
      const hasPassed = (r.qcPassed ?? 0) > 0,
        hasRepair = (r.qcRepair ?? 0) > 0,
        hasReject = (r.qcReject ?? 0) > 0,
        reworked = !hasRepair || children("Rework", r.id).length > 0,
        stocked = !hasPassed || children("Stok Barang Jadi", r.id).length > 0,
        done = reworked && stocked;
      return {
        label: done
          ? `Hasil ditindaklanjuti${hasReject ? " · Reject dikarantina" : ""}`
          : "Menunggu tindak lanjut hasil QC",
        tone: done ? "done" : "partial",
        done,
      };
    }
    if (active === "Rework")
      return children("Penerimaan Rework", r.id).length
        ? { label: "Hasil Rework diterima", tone: "done", done: true }
        : {
            label: "Sedang diperbaiki vendor",
            tone: "partial",
            done: false,
          };
    if (active === "Penerimaan Rework")
      return children("QC Ulang", r.id).length
        ? { label: "Selesai QC ulang", tone: "done", done: true }
        : { label: "Menunggu QC ulang", tone: "waiting", done: false };
    return { label: "Masuk Stok Barang Jadi", tone: "done", done: true };
  };
  const activeRows = mode === "active" && active === "Bundle"
    ? (allRecords.Cutting ?? []).map((cutting) => {
        const decorationJobs = (allRecords["Sablon/Bordir"] ?? []).filter(
          (row) => row.sourceId === cutting.id && row.decorationRequiredBeforeBundle !== false,
        );
        const expectedDecoration = cutting.decorationProcess ?? "none";
        const expectedTypesReady =
          expectedDecoration === "screenprint" ? decorationJobs.some((row) => row.decorationType === "screenprint")
          : expectedDecoration === "embroidery" ? decorationJobs.some((row) => row.decorationType === "embroidery")
          : expectedDecoration === "both" ? decorationJobs.some((row) => row.decorationType === "screenprint") && decorationJobs.some((row) => row.decorationType === "embroidery")
          : true;
        const explicitFinalStep = decorationJobs.some((row) => typeof row.decorationFinalStep === "boolean");
        const decorationReady = decorationJobs.length > 0 && expectedTypesReady &&
          (!explicitFinalStep || decorationJobs.some((row) => row.decorationFinalStep === true)) &&
          decorationJobs.every((row) => (row.decorationCompleted ?? 0) >= row.total);
        const releasedVariants = expectedDecoration === "none" || decorationReady
          ? cutting.variants
          : cutting.variants.map((variant) => ({ ...variant, qty: 0 }));
        const bundledVariants = (allRecords.Bundle ?? [])
          .filter((record) => record.sourceId === cutting.id)
          .flatMap((record) => record.variants);
        const remainingVariants = subtractVariants(releasedVariants, bundledVariants);
        return {
          ...cutting,
          variants: remainingVariants,
          total: sum(remainingVariants),
          status: "Belum dibundel",
        };
      }).filter((row) => row.total > 0)
    : rows;
  const items = activeRows.map((row) => ({
      row,
      ...(mode === "active" && active === "Bundle"
        ? { label: "Belum dibundel", tone: "waiting", done: false }
        : statusFor(row)),
    })),
    working = items.filter((x) => !x.done),
    completed = items.filter((x) => x.done),
    completedToday = localDateString(),
    completedWeekDate = new Date(),
    completedMonthStart = `${completedToday.slice(0, 8)}01`;
  completedWeekDate.setDate(completedWeekDate.getDate() - ((completedWeekDate.getDay() + 6) % 7));
  const completedWeekStart = localDateString(completedWeekDate),
    filteredCompleted = completed.filter(({ row }) => {
      const query = completedQuery.trim().toLowerCase(),
        searchable = [row.id, row.modelName, row.modelCode, row.sourceId, row.destination, ...row.variants.flatMap((variant) => [variant.color, variant.size])].filter(Boolean).join(" ").toLowerCase(),
        inPeriod = completedPeriod === "all" || (completedPeriod === "today" && row.date === completedToday) || (completedPeriod === "week" && row.date >= completedWeekStart && row.date <= completedToday) || (completedPeriod === "month" && row.date >= completedMonthStart && row.date <= completedToday) || (completedPeriod === "custom" && (!completedStart || row.date >= completedStart) && (!completedEnd || row.date <= completedEnd));
      return inPeriod && (!query || searchable.includes(query));
    });
  const activeColumns = active === "Sablon/Bordir"
      ? ["No.", "Kode / Cutting", "Model", "Vendor", "Jenis & Posisi", "Warna & Ukuran", "Dikirim", "Selesai", "Sisa", "Tagihan", "Dibayar", "Status", ...(onUpdateDecoration ? ["Aksi"] : [])]
      : ["No.", "Kode", "Tanggal", "Model", "Sumber", "Warna & Ukuran", "Jumlah", "Tujuan / Vendor", "Status"],
    filteredWorking = working.filter(({ row }) => {
      const query = activeQuery.trim().toLowerCase();
      if (!query) return true;
      return [row.id, row.sourceId, row.poId, row.modelName, row.modelCode, row.destination, row.officer, row.decorationPosition, row.decorationDescription, ...row.variants.flatMap((variant) => [variant.color, variant.size])]
        .filter(Boolean).join(" ").toLowerCase().includes(query);
    }),
    activeHiddenClasses = visibleColumns
      .slice(0, activeColumns.length)
      .map((visible, index) => visible ? "" : `hide-live-col-${index + 1}`)
      .filter(Boolean)
      .join(" "),
    allActiveColumnsVisible = visibleColumns.slice(0, activeColumns.length).every(Boolean);
  const toggleActiveColumn = (index: number) => setVisibleColumns((current) => current.map((visible, itemIndex) => itemIndex === index ? !visible : visible));
  const list = (entries: typeof items) => active === "Sablon/Bordir" ? (
    <div className="live-status-table-wrap"><table className="live-status-table decoration-job-table"><thead><tr><th>No.</th><th>Kode / Cutting</th><th>Model</th><th>Vendor</th><th>Jenis & Posisi</th><th>Warna & Ukuran</th><th>Dikirim</th><th>Selesai</th><th>Sisa</th><th>Tagihan</th><th>Dibayar</th><th>Status</th>{onUpdateDecoration && <th>Aksi</th>}</tr></thead><tbody>{entries.map(({ row, label, tone }, index) => {
      const completedQty = Math.min(row.total, row.decorationCompleted ?? 0),
        bill = row.total * (row.decorationRate ?? 0),
        paid = row.paidAmount ?? 0;
      return <tr key={row.id}>
        <td data-label="No.">{index + 1}</td>
        <td data-label="Kode / Cutting"><b>{row.id}</b><small>Urutan {row.decorationOrder ?? index + 1} · {row.sourceId}</small><small>{row.poId}</small></td>
        <td data-label="Model"><b>{row.modelName}</b><small>{row.modelCode}</small></td>
        <td data-label="Vendor"><b>{row.destination || "—"}</b></td>
        <td data-label="Jenis & Posisi"><b>{row.decorationType === "embroidery" ? "Bordir" : "Sablon"}</b><small>{row.decorationPosition || "—"}</small><small>{row.decorationDescription || "—"}</small><small>{row.decorationRequiredBeforeBundle === false ? "Tidak menahan Bundle" : row.decorationFinalStep ? "Tahap terakhir · menahan Bundle" : "Tahap wajib berikutnya"}</small></td>
        <td data-label="Warna & Ukuran"><span className="live-variant-list">{row.variants.map((variant) => <small key={`${variant.color}-${variant.size}`}>{variant.color} · {variant.size}: <b>{variant.qty}</b></small>)}</span></td>
        <td data-label="Dikirim"><b>{row.total}</b></td>
        <td data-label="Selesai"><b>{completedQty}</b></td>
        <td data-label="Sisa"><b>{Math.max(0, row.total - completedQty)}</b></td>
        <td data-label="Tagihan"><b>{rupiah(bill)}</b><small>{rupiah(row.decorationRate ?? 0)}/unit</small></td>
        <td data-label="Dibayar"><b>{rupiah(paid)}</b><small>{paymentStatus(bill, paid)}</small></td>
        <td data-label="Status"><em className={tone}>{label}</em></td>
        {onUpdateDecoration && <td data-label="Aksi"><button type="button" className="secondary decoration-update-button" onClick={() => onUpdateDecoration(row)}>Perbarui</button></td>}
      </tr>;
    })}</tbody></table></div>
  ) : (
    <div className="live-status-table-wrap"><table className="live-status-table"><thead><tr><th>No.</th><th>Kode</th><th>Tanggal</th><th>Model</th><th>Sumber</th><th>Warna & Ukuran</th><th>Jumlah</th><th>Tujuan / Vendor</th><th>Status</th></tr></thead><tbody>{entries.map(({ row, label, tone }, index) => (
      <tr key={row.id}>
        <td data-label="No.">{index + 1}</td>
        <td data-label="Kode"><b>{row.id}</b></td>
        <td data-label="Tanggal">{row.date}</td>
        <td data-label="Model"><b>{row.modelName}</b><small>{row.modelCode}</small></td>
        <td data-label="Sumber">{row.sourceId || "Master Jaket"}</td>
        <td data-label="Warna & Ukuran"><span className="live-variant-list">{row.variants.map((variant) => <small key={`${variant.color}-${variant.size}`}>{variant.color} · {variant.size}: <b>{variant.qty}</b></small>)}</span></td>
        <td data-label="Jumlah"><b>{row.total}</b> unit</td>
        <td data-label="Tujuan / Vendor">{row.destination || "—"}</td>
        <td data-label="Status"><em className={tone}>{label}</em></td>
      </tr>
    ))}</tbody></table></div>
  );
  if (mode === "completed") return (
    <section className="completed-status-panel">
      <header><div><h2>Transaksi selesai</h2><span>Arsip ringkas pekerjaan yang sudah diteruskan.</span></div><b>{filteredCompleted.length} data</b></header>
      <div className="completed-status-tools"><label><span>⌕</span><input value={completedQuery} onChange={(event) => setCompletedQuery(event.target.value)} placeholder="Cari kode, model, warna, size..." /></label><select value={completedPeriod} onChange={(event) => setCompletedPeriod(event.target.value as typeof completedPeriod)}><option value="today">Hari ini</option><option value="week">Minggu ini</option><option value="month">Bulan ini</option><option value="custom">Custom</option><option value="all">Semua waktu</option></select>{completedPeriod === "custom" && <><input aria-label="Tanggal mulai" type="date" value={completedStart} onChange={(event) => setCompletedStart(event.target.value)} /><input aria-label="Tanggal selesai" type="date" min={completedStart} value={completedEnd} onChange={(event) => setCompletedEnd(event.target.value)} /></>}</div>
      {filteredCompleted.length > 0 ? list(filteredCompleted) : <div className="live-status-empty">Tidak ada transaksi selesai sesuai pencarian dan periode.</div>}
    </section>
  );
  return (
    <>
    <section className={`live-status mobile-${mobileView} ${activeHiddenClasses}`}>
      <header>
        <div>
          <h2>{active === "Bundle" ? "Belum Bundle" : "Pekerjaan saat ini"}</h2>
        </div>
        <b>{filteredWorking.length} aktif</b>
      </header>
      {showTableToolbar && <div className="master-table-toolbar live-status-tools">
        <div className="master-toolbar-left">
          <label className="master-search-field"><span className="master-search-icon">⌕</span><input type="search" value={activeQuery} onChange={(event) => setActiveQuery(event.target.value)} placeholder="Cari kode, model, vendor, warna, ukuran..." /></label>
          <div className="master-column-control">
            <button type="button" className="master-column-button" aria-expanded={columnMenu} onClick={() => setColumnMenu((open) => !open)}><span>▥</span> Kolom</button>
            {columnMenu && <div className="master-column-menu"><header><b>KOLOM</b><b>TAMPIL</b></header><label className="toggle-all"><span>Tampilkan semua</span><input type="checkbox" checked={allActiveColumnsVisible} onChange={() => setVisibleColumns((current) => current.map((visible, index) => index < activeColumns.length ? !allActiveColumnsVisible : visible))} /></label>{activeColumns.map((column, index) => <label key={`${active}-${column}`}><span>{column}</span><input type="checkbox" checked={visibleColumns[index]} onChange={() => toggleActiveColumn(index)} /></label>)}</div>}
          </div>
        </div>
        {onAdd && addLabel && <button type="button" className="primary live-status-add" disabled={addDisabled} onClick={onAdd}>＋ {addLabel}</button>}
      </div>}
      {showTableToolbar && <div className="mobile-view-switch" role="group" aria-label={`Tampilan data ${active}`}>
        <button type="button" className={mobileView === "cards" ? "active" : ""} onClick={() => setMobileView("cards")}><span>☷</span> Kartu</button>
        <button type="button" className={mobileView === "table" ? "active" : ""} onClick={() => setMobileView("table")}><span>▥</span> Tabel</button>
      </div>}
      {filteredWorking.length ? (
        list(filteredWorking)
      ) : (
        <div className="live-status-empty">
          {working.length ? "Tidak ada pekerjaan yang sesuai pencarian." : "Tidak ada pekerjaan aktif pada proses ini."}
        </div>
      )}
    </section>
    {onAdd && addLabel && <button type="button" className="mobile-floating-add" disabled={addDisabled} aria-label={addLabel} title={addLabel} onClick={onAdd}>＋</button>}
    </>
  );
}

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState<string | null>(null);
  function navigate(name: string) {
    setActive(name);
    setOpenNavGroup(
      navGroups.find((group) =>
        group.items.some((item) => item === name),
      )?.id ?? null,
    );
  }
  const [data, setData] = useState<AppData>(initial);
  const updatedAtRef = useRef<string | undefined>(initial.updatedAt);
  const saveInFlightRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSimulation, setIsSimulation] = useState(false);
  const [modal, setModal] = useState<
    null | "master" | "vendor" | "qcLocation" | "pic" | "record"
  >(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [modelCodeTouched, setModelCodeTouched] = useState(false);
  const [editingVendorCode, setEditingVendorCode] = useState<string | null>(
    null,
  );
  const [editingQCLocationCode, setEditingQCLocationCode] = useState<
    string | null
  >(null);
  const [editingPICCode, setEditingPICCode] = useState<string | null>(null);
  const [editingDecorationId, setEditingDecorationId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [vendorForm, setVendorForm] = useState({
    name: "",
    contact: "",
    phone: "",
    address: "",
    qcMode: "internal" as QCMode,
    qcOfficer: "",
    qcLocationCode: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    capabilities: ["sewing"] as Array<"sewing" | "screenprint" | "embroidery">,
    screenprintRate: 0,
    embroideryRate: 0,
  });
  const [qcLocationForm, setQcLocationForm] = useState({
    location: "",
    recipient: "",
    phone: "",
    address: "",
    rate: 0,
    bankName: "",
    accountNumber: "",
    accountHolder: "",
  });
  const [picForm, setPicForm] = useState({
    name: "",
    role: "",
    phone: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
  });
  const [matrix, setMatrix] = useState<Variant[]>([]);
  const [qcDetails, setQcDetails] = useState<QCDetail[]>([]);
  const [bundleQty, setBundleQty] = useState(50);
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);
  const [print, setPrint] = useState<Note | null>(null);
  const [bundlePrint, setBundlePrint] = useState<RecordRow | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<RecordRow | null>(null);
  const [paymentKind, setPaymentKind] = useState<"vendor" | "cutting">("vendor");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentPIC, setPaymentPIC] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentPrint, setPaymentPrint] = useState<{
    receipt: RecordRow;
    payment: PaymentEntry;
    kind: "vendor" | "cutting";
  } | null>(null);
  const [cuttingRateRecord, setCuttingRateRecord] = useState<RecordRow | null>(null);
  const [cuttingRateInput, setCuttingRateInput] = useState(0);
  const [vendorRateRecord, setVendorRateRecord] = useState<RecordRow | null>(null);
  const [vendorRateInput, setVendorRateInput] = useState(0);
  const [qcRateRecord, setQCRateRecord] = useState<RecordRow | null>(null);
  const [qcRateInput, setQCRateInput] = useState(0);
  const [weeklyDraft, setWeeklyDraft] = useState<{
    kind: WeeklyPaymentKind;
    payee: string;
    periodStart: string;
    periodEnd: string;
    rows: RecordRow[];
  } | null>(null);
  const [weeklyPaymentDate, setWeeklyPaymentDate] = useState("");
  const [weeklyPIC, setWeeklyPIC] = useState("");
  const [weeklyRequester, setWeeklyRequester] = useState("");
  const [weeklyNote, setWeeklyNote] = useState("");
  const [weeklyAmount, setWeeklyAmount] = useState(0);
  const [weeklyPrint, setWeeklyPrint] = useState<WeeklyPayment | null>(null);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/state", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((x) => {
        setIsSimulation(x.environment === "simulation");
        updatedAtRef.current = x.updatedAt;
        setData({
          ...x,
          models: x.models ?? [],
          vendors: x.vendors ?? [],
          qcLocations: x.qcLocations ?? [],
          pics: x.pics ?? [],
          weeklyPayments: x.weeklyPayments ?? [],
        });
      })
      .catch(() => setData(initial))
      .finally(() => setLoaded(true));
  }, []);
  async function persist(next: AppData) {
    if (saveInFlightRef.current) {
      flash("Penyimpanan sedang berlangsung. Mohon tunggu sebentar.");
      return;
    }
    saveInFlightRef.current = true;
    const pending = {
      ...next,
      updatedAt: updatedAtRef.current ?? next.updatedAt,
    };
    setData(pending);
    setSaving(true);
    try {
      const send = (payload: AppData) =>
        fetch("/api/state", {
          method: "PUT",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
      let savedState = pending,
        response = await send(savedState);
      if (response.status === 409) {
        const latestResponse = await fetch("/api/state", { cache: "no-store" });
        if (!latestResponse.ok) throw new Error("DATA_CONFLICT");
        const latest = await latestResponse.json();
        savedState = {
          ...mergeConflictState(data, pending, latest),
          updatedAt: latest.updatedAt,
        };
        updatedAtRef.current = latest.updatedAt;
        setData(savedState);
        response = await send(savedState);
        if (response.status === 409) throw new Error("DATA_CONFLICT");
      }
      if (!response.ok) throw new Error("Gagal menyimpan");
      const result = await response.json();
      updatedAtRef.current = result.updatedAt ?? savedState.updatedAt;
      setData({
        ...savedState,
        ...result,
        models: result.models ?? savedState.models,
        vendors: result.vendors ?? savedState.vendors,
        qcLocations: result.qcLocations ?? savedState.qcLocations,
        pics: result.pics ?? savedState.pics,
        records: result.records ?? savedState.records,
        notes: result.notes ?? savedState.notes,
        weeklyPayments: result.weeklyPayments ?? savedState.weeklyPayments,
        updatedAt: result.updatedAt ?? savedState.updatedAt,
      });
      if (savedState !== pending)
        flash("Data terbaru digabungkan dan transaksi berhasil disimpan.");
    } catch (error) {
      if (!(error instanceof Error && error.message === "DATA_CONFLICT")) {
        setData(data);
      }
      flash(
        error instanceof Error && error.message === "DATA_CONFLICT"
          ? "Data berubah di perangkat atau tab lain. Muat ulang halaman sebelum menyimpan kembali."
          : "Data gagal disimpan. Silakan coba lagi.",
      );
      throw new Error("Data gagal disimpan");
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }
  async function updateDecorationJob(row: RecordRow) {
    const completedInput = window.prompt(
      `Jumlah selesai untuk ${row.id} (maksimal ${row.total} unit)`,
      String(row.decorationCompleted ?? 0),
    );
    if (completedInput === null) return;
    const completed = Number(completedInput.replace(/\D/g, ""));
    if (!Number.isFinite(completed) || completed < 0 || completed > row.total) {
      flash(`Jumlah selesai harus antara 0 sampai ${row.total} unit.`);
      return;
    }
    const bill = row.total * (row.decorationRate ?? 0),
      paidInput = window.prompt(
        `Total pembayaran untuk ${row.id} (maksimal ${rupiah(bill)})`,
        String(row.paidAmount ?? 0),
      );
    if (paidInput === null) return;
    const paid = Number(paidInput.replace(/\D/g, ""));
    if (!Number.isFinite(paid) || paid < 0 || paid > bill) {
      flash(`Pembayaran harus antara Rp 0 sampai ${rupiah(bill)}.`);
      return;
    }
    const nextRows = (data.records["Sablon/Bordir"] ?? []).map((item) =>
      item.id === row.id
        ? {
            ...item,
            decorationCompleted: completed,
            paidAmount: paid,
            status:
              completed >= item.total
                ? "Selesai"
                : completed > 0
                  ? "Selesai sebagian"
                  : "Di vendor dekorasi",
          }
        : item,
    );
    await persist({
      ...data,
      records: { ...data.records, "Sablon/Bordir": nextRows },
    });
    flash(`Progres ${row.id} berhasil diperbarui.`);
  }
  async function resetSimulation() {
    if (!isSimulation) return;
    if (
      !window.confirm(
        "Kosongkan seluruh transaksi simulasi? Data produksi asli tidak akan berubah.",
      )
    )
      return;
    setSaving(true);
    try {
      const response = await fetch("/api/state", { method: "DELETE" });
      if (!response.ok) throw new Error("Gagal mengosongkan simulasi");
      const next = await response.json();
      updatedAtRef.current = next.updatedAt;
      setData({
        ...next,
        models: next.models ?? [],
        vendors: next.vendors ?? [],
        qcLocations: next.qcLocations ?? [],
        pics: next.pics ?? [],
        weeklyPayments: next.weeklyPayments ?? [],
      });
      navigate("Dashboard");
      flash("Transaksi simulasi dikosongkan. Data produksi tetap aman.");
    } catch {
      flash("Data simulasi gagal dikosongkan.");
    } finally {
      setSaving(false);
    }
  }
  async function updateReceiptPayment(e: FormEvent) {
    e.preventDefault();
    if (!paymentReceipt) return;
    const shipment = (data.records["Pengiriman Vendor"] ?? []).find(
        (x) => x.id === paymentReceipt.sourceId,
      ),
      bill =
        paymentReceipt.total *
        (paymentKind === "cutting"
          ? paymentReceipt.cuttingRate ?? 0
          : paymentReceipt.sewingRate ?? shipment?.sewingRate ?? 0);
    const previousPayments = legacyPayment(paymentReceipt),
      previouslyPaid = paidForReceipt(paymentReceipt),
      remaining = Math.max(0, bill - previouslyPaid);
    if (paymentAmount <= 0 || paymentAmount > remaining) {
      flash("Nominal pembayaran harus lebih dari nol dan tidak melebihi sisa tagihan.");
      return;
    }
    if (!paymentPIC.trim()) {
      flash("Pilih PIC finance untuk pembayaran ini.");
      return;
    }
    const payment: PaymentEntry = {
        id:
          paymentKind === "cutting"
            ? nextCuttingPaymentId(data, paymentDate)
            : nextVendorPaymentId(data, paymentDate),
        date: paymentDate,
        amount: paymentAmount,
        pic: paymentPIC,
        note: paymentNote.trim(),
      },
      paymentHistory = [...previousPayments, payment],
      paidAmount = previouslyPaid + paymentAmount;
    const next = {
      ...data,
      records: {
        ...data.records,
        [paymentKind === "cutting" ? "Cutting" : "Penerimaan Gudang"]: (
          data.records[
            paymentKind === "cutting" ? "Cutting" : "Penerimaan Gudang"
          ] ?? []
        ).map(
          (receipt) =>
            receipt.id === paymentReceipt.id
              ? {
                  ...receipt,
                  paidAmount,
                  paymentDate,
                  paymentHistory,
                }
              : receipt,
        ),
      },
    };
    await persist(next);
    setPaymentReceipt(null);
    setPaymentPrint({
      receipt: { ...paymentReceipt, paidAmount, paymentDate, paymentHistory },
      payment,
      kind: paymentKind,
    });
    flash(`Pembayaran ${payment.id} berhasil dicatat.`);
  }
  async function voidReceiptPayment(
    receipt: RecordRow,
    payment: PaymentEntry,
  ) {
    if (payment.voided) return;
    const reason = window.prompt(
      `Alasan pembatalan ${payment.id}. Bukti tetap tersimpan dalam riwayat:`,
    );
    if (!reason?.trim()) return;
    const history = legacyPayment(receipt).map((item) =>
        item.id === payment.id
          ? { ...item, voided: true, voidReason: reason.trim() }
          : item,
      ),
      paidAmount = history.reduce(
        (total, item) => total + (item.voided ? 0 : item.amount),
        0,
      ),
      lastActive = [...history].reverse().find((item) => !item.voided),
      next = {
        ...data,
        records: {
          ...data.records,
          [receipt.stage === "Cutting" ? "Cutting" : "Penerimaan Gudang"]: (
            data.records[
              receipt.stage === "Cutting" ? "Cutting" : "Penerimaan Gudang"
            ] ?? []
          ).map(
            (item) =>
              item.id === receipt.id
                ? {
                    ...item,
                    paymentHistory: history,
                    paidAmount,
                    paymentDate: lastActive?.date ?? "",
                  }
                : item,
          ),
        },
      };
    await persist(next);
    flash(`${payment.id} dibatalkan dengan jejak audit.`);
  }
  async function updateCuttingRate(e: FormEvent) {
    e.preventDefault();
    if (!cuttingRateRecord) return;
    const cuttingRate = cuttingRateInput;
    if (!Number.isFinite(cuttingRate) || cuttingRate <= 0) {
      flash("Tarif cutting harus lebih dari nol.");
      return;
    }
    await persist({
      ...data,
      records: {
        ...data.records,
        Cutting: (data.records.Cutting ?? []).map((item) =>
          item.id === cuttingRateRecord.id ? { ...item, cuttingRate } : item,
        ),
      },
    });
    flash(`Tarif ${cuttingRateRecord.id} diperbarui menjadi ${rupiah(cuttingRate)} per unit.`);
    setCuttingRateRecord(null);
  }
  async function updateVendorRate(e: FormEvent) {
    e.preventDefault();
    if (!vendorRateRecord) return;
    const sewingRate = vendorRateInput;
    if (!Number.isFinite(sewingRate) || sewingRate <= 0) {
      flash("Tarif jahit harus lebih dari nol.");
      return;
    }
    await persist({
      ...data,
      records: {
        ...data.records,
        "Penerimaan Gudang": (data.records["Penerimaan Gudang"] ?? []).map(
          (item) =>
            item.id === vendorRateRecord.id ? { ...item, sewingRate } : item,
        ),
      },
    });
    flash(`Tarif ${vendorRateRecord.id} diperbarui menjadi ${rupiah(sewingRate)} per unit.`);
    setVendorRateRecord(null);
  }
  async function updateQCRate(e: FormEvent) {
    e.preventDefault();
    if (!qcRateRecord) return;
    const qcRate = qcRateInput;
    if (!Number.isFinite(qcRate) || qcRate <= 0) {
      flash("Tarif QC harus lebih dari nol.");
      return;
    }
    await persist({
      ...data,
      records: {
        ...data.records,
        "Quality Control": (data.records["Quality Control"] ?? []).map(
          (item) => item.id === qcRateRecord.id ? { ...item, qcRate } : item,
        ),
      },
    });
    flash(`Tarif ${qcRateRecord.id} diperbarui menjadi ${rupiah(qcRate)} per unit.`);
    setQCRateRecord(null);
  }
  async function setDecorationRate(row: RecordRow) {
    const input = window.prompt(
      `Tarif per unit untuk ${row.id}`,
      String(row.decorationRate ?? 0),
    );
    if (input === null) return;
    const decorationRate = parseRupiahInput(input);
    if (decorationRate <= 0) {
      flash("Tarif Sablon/Bordir harus lebih dari nol.");
      return;
    }
    await persist({
      ...data,
      records: {
        ...data.records,
        "Sablon/Bordir": (data.records["Sablon/Bordir"] ?? []).map((item) =>
          item.id === row.id ? { ...item, decorationRate } : item,
        ),
      },
    });
    flash(`Tarif ${row.id} diperbarui menjadi ${rupiah(decorationRate)} per unit.`);
  }
  function openWeeklyPayment(
    kind: WeeklyPaymentKind,
    payee: string,
    rows: RecordRow[],
    periodStart: string,
    periodEnd: string,
  ) {
    setWeeklyDraft({
      kind,
      payee,
      rows,
      periodStart,
      periodEnd,
    });
    setWeeklyPaymentDate(periodEnd);
    setWeeklyPIC(
      data.pics.find((pic) => pic.active && /herdita/i.test(pic.name))?.name ??
        data.pics.find((pic) => pic.active && /finance|keuangan/i.test(pic.role))?.name ??
        data.pics.find((pic) => pic.active)?.name ??
        "",
    );
    setWeeklyRequester(
      data.pics.find((pic) => pic.active && /ceceng/i.test(pic.name))?.name ??
        data.pics.find((pic) => pic.active && /produksi|pengaju/i.test(pic.role))?.name ??
        data.pics.find((pic) => pic.active)?.name ??
        "",
    );
    setWeeklyNote("");
    setWeeklyAmount(0);
  }
  async function saveWeeklyPayment(e: FormEvent) {
    e.preventDefault();
    if (!weeklyDraft || !weeklyPIC || !weeklyRequester) return;
      const lines = weeklyDraft.rows.map((row) => {
        const rate =
          weeklyDraft.kind === "cutting"
            ? row.cuttingRate ?? 0
            : weeklyDraft.kind === "qc"
              ? row.qcRate ?? 0
              : weeklyDraft.kind === "decoration"
                ? row.decorationRate ?? 0
                : row.sewingRate ?? 0;
        return {
          recordId: row.id,
          modelName: row.modelName,
          units: row.total,
          rate,
          amount: row.total * rate,
        };
      }),
      totalAmount = lines.reduce((total, line) => total + line.amount, 0);
    if (!lines.length || lines.some((line) => line.rate <= 0)) {
      flash("Semua pekerjaan harus memiliki tarif sebelum direkap.");
      return;
    }
    const paidBefore = weeklyDraft.kind === "vendor" || weeklyDraft.kind === "decoration"
      ? weeklyDraft.rows.reduce(
          (total, receipt) => total + paidForReceipt(receipt),
          0,
        )
      : weeklyPaidAmount(
          data.weeklyPayments,
          weeklyDraft.kind,
          weeklyDraft.payee,
          weeklyDraft.periodStart,
          weeklyDraft.periodEnd,
        ) + (weeklyDraft.kind === "cutting"
          ? weeklyDraft.rows.reduce((total, row) => total + paidForReceipt(row), 0)
          : 0);
    if (weeklyAmount <= 0 || weeklyAmount > totalAmount - paidBefore) {
      flash("Nominal pembayaran harus lebih dari nol dan tidak melebihi sisa tagihan.");
      return;
    }
    const account =
      data.vendors.find((item) => item.name.toLowerCase() === weeklyDraft.payee.toLowerCase()) ??
      data.qcLocations.find((item) => item.recipient.toLowerCase() === weeklyDraft.payee.toLowerCase()) ??
      data.pics.find((item) => item.name.toLowerCase() === weeklyDraft.payee.toLowerCase());
    const payment: WeeklyPayment = {
      id: nextWeeklyPaymentId(data, weeklyDraft.kind, weeklyPaymentDate),
      kind: weeklyDraft.kind,
      periodStart: weeklyDraft.periodStart,
      periodEnd: weeklyDraft.periodEnd,
      payee: weeklyDraft.payee,
      lines,
      totalUnits: lines.reduce((total, line) => total + line.units, 0),
      totalAmount,
      paymentAmount: weeklyAmount,
      paidBefore,
      paymentDate: weeklyPaymentDate,
      pic: weeklyPIC,
      requester: weeklyRequester,
      bankName: account?.bankName,
      accountNumber: account?.accountNumber,
      accountHolder: account?.accountHolder || weeklyDraft.payee,
      note: weeklyNote.trim(),
    };
    const nextData: AppData = {
      ...data,
      weeklyPayments: [...data.weeklyPayments, payment],
    };
    if (weeklyDraft.kind === "vendor" || weeklyDraft.kind === "decoration") {
      let amountLeft = weeklyAmount;
      const recordStage = weeklyDraft.kind === "decoration" ? "Sablon/Bordir" : "Penerimaan Gudang";
      nextData.records = {
        ...data.records,
        [recordStage]: (data.records[recordStage] ?? []).map(
          (receipt) => {
            const draftRow = weeklyDraft.rows.find((row) => row.id === receipt.id);
            if (!draftRow || amountLeft <= 0) return receipt;
            const rate = weeklyDraft.kind === "decoration" ? draftRow.decorationRate ?? 0 : draftRow.sewingRate ?? 0,
              bill = receipt.total * rate,
              paid = paidForReceipt(receipt),
              allocation = Math.min(Math.max(0, bill - paid), amountLeft);
            if (allocation <= 0) return receipt;
            amountLeft -= allocation;
            return {
              ...receipt,
              paidAmount: paid + allocation,
              paymentDate: weeklyPaymentDate,
              paymentHistory: [
                ...legacyPayment(receipt),
                {
                  id: payment.id,
                  date: weeklyPaymentDate,
                  amount: allocation,
                  pic: weeklyPIC,
                  note: `Rekap gabungan ${weeklyDraft.kind === "decoration" ? "vendor dekorasi" : "vendor jahit"}${weeklyNote.trim() ? ` · ${weeklyNote.trim()}` : ""}`,
                },
              ],
            };
          },
        ),
      };
    }
    await persist(nextData);
    setWeeklyDraft(null);
    flash(`Pembayaran ${payment.id} berhasil dibukukan.`);
  }
  async function voidWeeklyPayment(payment: WeeklyPayment) {
    if (payment.voided) return;
    const reason = window.prompt(
      `Alasan pembatalan ${payment.id}. Bukti tetap tersimpan dalam riwayat:`,
    );
    if (!reason?.trim()) return;
    const nextData: AppData = {
      ...data,
      weeklyPayments: data.weeklyPayments.map((item) =>
        item.id === payment.id
          ? { ...item, voided: true, voidReason: reason.trim() }
          : item,
      ),
    };
    if (payment.kind === "vendor" || payment.kind === "decoration") {
      const recordStage = payment.kind === "decoration" ? "Sablon/Bordir" : "Penerimaan Gudang";
      nextData.records = {
        ...data.records,
        [recordStage]: (data.records[recordStage] ?? []).map(
          (receipt) => {
            const history = legacyPayment(receipt).map((entry) =>
                entry.id === payment.id
                  ? { ...entry, voided: true, voidReason: reason.trim() }
                  : entry,
              ),
              paidAmount = history.reduce(
                (total, entry) => total + (entry.voided ? 0 : entry.amount),
                0,
              );
            return history.some((entry) => entry.id === payment.id)
              ? { ...receipt, paymentHistory: history, paidAmount }
              : receipt;
          },
        ),
      };
    }
    await persist(nextData);
    flash(`${payment.id} dibatalkan dengan jejak audit.`);
  }
  function flash(x: string) {
    setToast(x);
    setTimeout(() => setToast(""), 2800);
  }
  function code(prefix: string, model: string, count: number, date: string) {
    return `${prefix}-${model}-${date.slice(0, 7).replace("-", "")}-${String(count + 1).padStart(3, "0")}`;
  }
  function buildMatrix(model: Model, existing?: Variant[]) {
    return model.colors.flatMap((color) =>
      model.sizes.map((size) => ({
        color,
        size,
        qty:
          existing?.find((v) => v.color === color && v.size === size)?.qty ?? 0,
      })),
    );
  }
  function remainingFor(source: RecordRow) {
    const baseVariants = decorationReleaseVariants(source);
    const allocated = (data.records.Bundle ?? [])
      .filter((x) => x.sourceId === source.id)
      .flatMap((x) => x.variants);
    return baseVariants.map((v) => ({
      ...v,
      qty: Math.max(
        0,
        v.qty -
          allocated
            .filter((a) => a.color === v.color && a.size === v.size)
            .reduce((n, a) => n + a.qty, 0),
      ),
    }));
  }
  function decorationRequired(source: RecordRow) {
    const process =
      source.decorationProcess ??
      data.models.find((model) => model.code === source.modelCode)
        ?.decorationProcess ??
      "none";
    return process !== "none";
  }
  function decorationReleaseVariants(source: RecordRow) {
    if (!decorationRequired(source)) return source.variants.map((variant) => ({ ...variant }));
    const jobs = (data.records["Sablon/Bordir"] ?? []).filter(
      (row) => row.sourceId === source.id && row.decorationRequiredBeforeBundle !== false,
    );
    if (jobs.length === 0) return source.variants.map((variant) => ({ ...variant, qty: 0 }));
    const expected = source.decorationProcess ?? data.models.find((model) => model.code === source.modelCode)?.decorationProcess ?? "none";
    const hasScreenprint = jobs.some((row) => row.decorationType === "screenprint");
    const hasEmbroidery = jobs.some((row) => row.decorationType === "embroidery");
    const expectedTypesReady =
      expected === "screenprint" ? hasScreenprint
      : expected === "embroidery" ? hasEmbroidery
      : expected === "both" ? hasScreenprint && hasEmbroidery
      : true;
    const usesExplicitFinalStep = jobs.some((row) => typeof row.decorationFinalStep === "boolean");
    const workflowClosed = usesExplicitFinalStep
      ? jobs.some((row) => row.decorationFinalStep === true)
      : true;
    const everyJobComplete = jobs.every((row) => (row.decorationCompleted ?? 0) >= row.total);
    return expectedTypesReady && workflowClosed && everyJobComplete
      ? source.variants.map((variant) => ({ ...variant }))
      : source.variants.map((variant) => ({ ...variant, qty: 0 }));
  }
  function remainingDecoration(
    source: RecordRow,
    _type: "screenprint" | "embroidery" = form.decorationType,
    _position: string = form.decorationPosition,
  ) {
    // Setiap sub-pekerjaan adalah jasa berbeda atas unit fisik yang sama.
    return source.variants.map((variant) => ({ ...variant }));
  }
  function remainingAtPO(source: RecordRow) {
    const cut = (data.records.Cutting ?? [])
      .filter((x) => x.sourceId === source.id)
      .flatMap((x) => x.variants);
    return subtractVariants(source.variants, cut);
  }
  function remainingAtVendor(source: RecordRow) {
    const received = (data.records["Penerimaan Gudang"] ?? [])
      .filter((x) => x.sourceId === source.id)
      .flatMap((x) => x.variants);
    return source.variants.map((v) => ({
      ...v,
      qty: Math.max(
        0,
        v.qty -
          received
            .filter((a) => a.color === v.color && a.size === v.size)
            .reduce((n, a) => n + a.qty, 0),
      ),
    }));
  }
  function remainingToQC(source: RecordRow) {
    const sent = (data.records["Pengiriman QC"] ?? [])
      .filter((x) => x.sourceId === source.id)
      .flatMap((x) => x.variants);
    return subtractVariants(source.variants, sent);
  }
  function vendorForShipment(source?: RecordRow) {
    return data.vendors.find((v) => v.name === source?.destination);
  }
  function qcLocationForReceipt(receipt?: RecordRow) {
    const shipment = (data.records["Pengiriman Vendor"] ?? []).find(
        (x) => x.id === receipt?.sourceId,
      ),
      vendor = vendorForShipment(shipment);
    const configured = data.qcLocations.find(
      (x) => x.code === vendor?.qcLocationCode && x.active,
    );
    return configured ?? data.qcLocations.find((x) => x.active);
  }
  function receiptUsesVendorQC(receipt: RecordRow) {
    void receipt;
    return false;
  }
  function vendorFromQC(source: RecordRow) {
    const sent = (data.records["Pengiriman QC"] ?? []).find(
      (x) => x.id === source.sourceId,
    );
    const receipt = (data.records["Penerimaan Gudang"] ?? []).find(
      (x) => x.id === sent?.sourceId,
    );
    return (
      (data.records["Pengiriman Vendor"] ?? []).find(
        (x) => x.id === receipt?.sourceId,
      )?.destination ??
      source.originVendor ??
      ""
    );
  }
  function tracePOId(source?: RecordRow): string | undefined {
    if (!source) return undefined;
    if (source.poId) return source.poId;
    if (source.stage === "Order Produksi") return source.id;
    const parent = Object.values(data.records)
      .flat()
      .find((x) => x.id === source.sourceId);
    return parent ? tracePOId(parent) : undefined;
  }
  function traceBundleId(source?: RecordRow): string | undefined {
    if (!source) return undefined;
    if (source.bundleId) return source.bundleId;
    if (source.stage === "Bundle") return source.id;
    const parent = Object.values(data.records)
      .flat()
      .find((x) => x.id === source.sourceId);
    return parent ? traceBundleId(parent) : undefined;
  }
  function nextLotCode(
    stage: string,
    prefix: string,
    modelCode: string,
    poId: string | undefined,
    bundleId: string | undefined,
    marker = "",
  ) {
    if (!poId || !bundleId)
      return code(
        prefix,
        modelCode,
        (data.records[stage] ?? []).length,
        form.date,
      );
    const count = (data.records[stage] ?? []).filter(
      (x) => (x.bundleId ?? traceBundleId(x)) === bundleId,
    ).length;
    return `${prefix}-${modelCode}-${poLotToken(poId)}-${shortBundleCode(bundleId)}-${marker}${String(count + 1).padStart(2, "0")}`;
  }
  function traceOriginVendor(source?: RecordRow): string | undefined {
    if (!source) return undefined;
    if (source.originVendor) return source.originVendor;
    if (source.stage === "Pengiriman Vendor") return source.destination;
    const parent = Object.values(data.records)
      .flat()
      .find((x) => x.id === source.sourceId);
    return parent ? traceOriginVendor(parent) : undefined;
  }
  function sourcesForStage(stage: string) {
    if (["Rework", "Karantina Reject", "Stok Barang Jadi"].includes(stage))
      return [
        ...(data.records["Quality Control"] ?? []),
        ...(data.records["QC Ulang"] ?? []),
      ];
    return data.records[stageInfo[stage]?.source ?? ""] ?? [];
  }
  function routedVariants(stage: string, source: RecordRow) {
    if (stage === "Rework" && source.qcDetails)
      return source.qcDetails
        .map((x) => ({
          color: x.color,
          size: x.size,
          qty: x.repair,
        }))
        .filter((x) => x.qty > 0);
    if (stage === "Stok Barang Jadi" && source.qcDetails)
      return source.qcDetails
        .map((x) => ({ color: x.color, size: x.size, qty: x.passed }))
        .filter((x) => x.qty > 0);
    if (stage === "Karantina Reject" && source.qcDetails)
      return source.qcDetails
        .map((x) => ({ color: x.color, size: x.size, qty: x.reject }))
        .filter((x) => x.qty > 0);
    return source.variants.map((x) => ({ ...x }));
  }
  function autoBundle(available: Variant[], wanted: number) {
    let left = Math.min(wanted, sum(available));
    return available.map((v) => {
      const qty = Math.min(v.qty, left);
      left -= qty;
      return { ...v, qty };
    });
  }
  function sourceAvailable(stage: string, source: RecordRow) {
    if (stage === "Cutting") return sum(remainingAtPO(source)) > 0;
    if (stage === "Sablon/Bordir") return true;
    if (stage === "Pengiriman Vendor")
      return (
        !(data.records["Pengiriman Vendor"] ?? []).some(
          (x) => x.sourceId === source.id,
        )
      );
    if (stage === "Penerimaan Gudang")
      return sum(remainingAtVendor(source)) > 0;
    if (stage === "Pengiriman QC")
      return (
        !receiptUsesVendorQC(source) &&
        !(data.records["Quality Control"] ?? []).some(
          (x) => x.sourceId === source.id && x.qcMode === "vendor",
        ) &&
        sum(remainingToQC(source)) > 0
      );
    if (stage === "Quality Control")
      return !(data.records["Quality Control"] ?? []).some(
        (x) => x.sourceId === source.id,
      );
    if (stage === "Penerimaan Rework")
      return !(data.records["Penerimaan Rework"] ?? []).some(
        (x) => x.sourceId === source.id,
      );
    if (stage === "QC Ulang")
      return !(data.records["QC Ulang"] ?? []).some(
        (x) => x.sourceId === source.id,
      );
    if (stage === "Rework")
      return (
        !!source.qcDetails &&
        (source.qcRepair ?? 0) > 0 &&
        !(data.records.Rework ?? []).some((x) => x.sourceId === source.id)
      );
    if (stage === "Stok Barang Jadi")
      return (
        !!source.qcDetails &&
        (source.qcPassed ?? 0) > 0 &&
        !(data.records["Stok Barang Jadi"] ?? []).some(
          (x) => x.sourceId === source.id,
        )
      );
    if (stage === "Karantina Reject")
      return (
        !!source.qcDetails &&
        (source.qcReject ?? 0) > 0 &&
        !(data.records["Karantina Reject"] ?? []).some(
          (x) => x.sourceId === source.id,
        )
      );
    return true;
  }
  function openRecord() {
    setEditingDecorationId(null);
    const model = data.models[0];
    const info = stageInfo[active];
    const sources = info.source ? sourcesForStage(active) : [];
    const first =
      active === "Bundle"
        ? sources.find((x) => sum(remainingFor(x)) > 0)
        : sources.find((x) => sourceAvailable(active, x));
    const vendor =
      first && active === "Rework" ? (traceOriginVendor(first) ?? "") : "";
    const firstQCLocation =
      active === "Pengiriman QC"
        ? qcLocationForReceipt(first)
        : data.qcLocations.find((x) => x.active);
    setSelectedBundleIds(
      active === "Pengiriman Vendor" && first ? [first.id] : [],
    );
    setForm({
      ...emptyForm,
      date: new Date().toISOString().slice(0, 10),
      code: first?.modelCode ?? model?.code ?? "",
      sourceId: first?.id ?? "",
      destination:
        active === "Pengiriman QC"
          ? (firstQCLocation?.location ?? "")
          : active === "Penerimaan Rework"
            ? "Quality Control"
            : active === "Stok Barang Jadi"
              ? "Gudang Barang Jadi"
              : vendor,
      recipient:
        active === "Pengiriman QC" ? (firstQCLocation?.recipient ?? "") : "",
      officer: data.pics.find((x) => x.active)?.name ?? "",
      qcPassed:
        active === "Quality Control" || active === "QC Ulang"
          ? (first?.total ?? 0)
          : 0,
    });
    const available = first
      ? active === "Bundle"
          ? remainingFor(first)
        : active === "Sablon/Bordir"
          ? remainingDecoration(first)
        : active === "Penerimaan Gudang"
          ? remainingAtVendor(first)
          : active === "Pengiriman QC"
            ? remainingToQC(first)
          : routedVariants(active, first)
      : model
        ? buildMatrix(model)
        : [];
    const directVendorQC =
      active === "Penerimaan Gudang" &&
      vendorForShipment(first)?.qcMode === "vendor";
    setQcDetails(
      active === "Quality Control" || active === "QC Ulang" || directVendorQC
        ? available.map((x) => ({
            ...x,
            passed: x.qty,
            reject: 0,
            repair: 0,
            note: "",
          }))
        : [],
    );
    setBundleQty(Math.min(50, sum(available)));
    setMatrix(
      active === "Bundle"
        ? autoBundle(available, Math.min(50, sum(available)))
        : available,
    );
    setModal("record");
  }
  function openDecorationEdit(row: RecordRow) {
    setEditingDecorationId(row.id);
    setForm({
      ...emptyForm,
      date: row.date,
      code: row.modelCode,
      sourceId: row.sourceId,
      destination: row.destination ?? "",
      officer: row.officer ?? data.pics.find((item) => item.active)?.name ?? "",
      note: row.note ?? "",
      paidAmount: paidForReceipt(row),
      decorationType: row.decorationType ?? "screenprint",
      decorationPosition: row.decorationPosition ?? "Badan belakang",
      decorationDescription: row.decorationDescription ?? "",
      decorationRate: row.decorationRate ?? 0,
      decorationCompleted: row.decorationCompleted ?? 0,
      decorationRequiredBeforeBundle: row.decorationRequiredBeforeBundle !== false,
      decorationFinalStep: row.decorationFinalStep !== false,
    });
    setMatrix(row.variants);
    setModal("record");
  }
  function selectSource(id: string) {
    const source = sourcesForStage(active).find((x) => x.id === id);
    if (active === "Pengiriman Vendor" && source) {
      setSelectedBundleIds([id]);
      setForm({ ...form, sourceId: id, code: source.modelCode });
      setMatrix(source.variants);
      return;
    }
    const firstQCLocation =
      active === "Pengiriman QC"
        ? qcLocationForReceipt(source)
        : data.qcLocations.find((x) => x.active);
    setForm({
      ...form,
      sourceId: id,
      code: source?.modelCode ?? form.code,
      destination:
        active === "Rework" && source
          ? (traceOriginVendor(source) ?? "")
          : active === "Penerimaan Rework"
            ? "Quality Control"
            : active === "Pengiriman QC"
              ? (firstQCLocation?.location ?? "")
              : active === "Stok Barang Jadi"
                ? "Gudang Barang Jadi"
                : form.destination,
      recipient:
        active === "Pengiriman QC"
          ? (firstQCLocation?.recipient ?? "")
          : form.recipient,
      qcPassed:
        active === "Quality Control" || active === "QC Ulang"
          ? (source?.total ?? 0)
          : form.qcPassed,
      qcReject: 0,
      qcRepair: 0,
      paidAmount: active === "Penerimaan Gudang" ? 0 : form.paidAmount,
      paymentDate: active === "Penerimaan Gudang" ? "" : form.paymentDate,
    });
    if (source) {
      const available =
        active === "Cutting"
          ? remainingAtPO(source)
          : active === "Bundle"
            ? remainingFor(source)
            : active === "Sablon/Bordir"
              ? remainingDecoration(source)
            : active === "Penerimaan Gudang"
              ? remainingAtVendor(source)
              : active === "Pengiriman QC"
                ? remainingToQC(source)
              : routedVariants(active, source);
      const wanted = Math.min(50, sum(available));
      setBundleQty(wanted);
      setMatrix(
        active === "Bundle" ? autoBundle(available, wanted) : available,
      );
      const directVendorQC =
        active === "Penerimaan Gudang" &&
        vendorForShipment(source)?.qcMode === "vendor";
      setQcDetails(
        active === "Quality Control" || active === "QC Ulang" || directVendorQC
          ? available.map((x) => ({
              ...x,
              passed: x.qty,
              reject: 0,
              repair: 0,
              note: "",
            }))
          : [],
      );
    }
  }
  function toggleShipmentBundle(id: string) {
    const bundles = (data.records.Bundle ?? []).filter((x) =>
        sourceAvailable("Pengiriman Vendor", x),
      ),
      clicked = bundles.find((x) => x.id === id);
    if (!clicked) return;
    const next = selectedBundleIds.includes(id)
      ? selectedBundleIds.filter((x) => x !== id)
      : [...selectedBundleIds, id];
    const selected = bundles.filter(
        (x) => next.includes(x.id) && x.modelCode === clicked.modelCode,
      ),
      ids = selected.map((x) => x.id),
      variants = mergeVariants(selected);
    setSelectedBundleIds(ids);
    setMatrix(variants);
    setForm({ ...form, sourceId: ids[0] ?? "", code: clicked.modelCode });
  }
  function openBundleShipment(ids: string[]) {
    const bundles = (data.records.Bundle ?? []).filter(
      (bundle) =>
        ids.includes(bundle.id) &&
        sourceAvailable("Pengiriman Vendor", bundle),
    );
    if (!bundles.length) {
      flash("Pilih minimal satu bundle yang belum dikirim.");
      return;
    }
    const modelCode = bundles[0].modelCode;
    if (bundles.some((bundle) => bundle.modelCode !== modelCode)) {
      flash("Bundle yang dikirim bersamaan harus berasal dari model yang sama.");
      return;
    }
    navigate("Pengiriman Vendor");
    setSelectedBundleIds(bundles.map((bundle) => bundle.id));
    setMatrix(mergeVariants(bundles));
    setForm({
      ...emptyForm,
      date: new Date().toISOString().slice(0, 10),
      code: modelCode,
      sourceId: bundles[0].id,
      officer: data.pics.find((pic) => pic.active)?.name ?? "",
    });
    setModal("record");
  }
  function updateQty(color: string, size: string, value: number) {
    const qty = Math.max(0, value || 0);
    setMatrix((m) =>
      m.map((v) => (v.color === color && v.size === size ? { ...v, qty } : v)),
    );
    if (active === "Penerimaan Gudang")
      setQcDetails((rows) =>
        rows.map((v) =>
          v.color === color && v.size === size
            ? { ...v, qty, passed: qty, reject: 0, repair: 0, note: "" }
            : v,
        ),
      );
  }
  async function addMaster(e: FormEvent) {
    e.preventDefault();
    const colors = [
      ...new Set(
        form.colors
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    ];
    const sizes = [
      ...new Set(
        form.sizes
          .split(",")
          .map((x) => x.trim().toUpperCase())
          .filter(Boolean),
      ),
    ];
    if (!colors.length || !sizes.length) {
      flash("Minimal satu warna dan satu ukuran diperlukan.");
      return;
    }
    const codeLocked =
      !!editingCode &&
      ["Order Produksi", "Cutting"].some((stage) =>
        (data.records[stage] ?? []).some((x) => x.modelCode === editingCode),
      );
    const finalCode = (codeLocked ? editingCode : form.code)
      .trim()
      .toUpperCase();
    if (finalCode.length < 2) {
      flash("Kode jaket minimal 2 karakter.");
      return;
    }
    const model: Model = {
      code: finalCode,
      name: form.name.trim(),
      colors,
      sizes,
      active: true,
      decorationProcess: form.decorationProcess,
    };
    if (
      data.models.some((x) => x.code !== editingCode && x.code === model.code)
    ) {
      flash("Kode jaket sudah digunakan.");
      return;
    }
    const models = editingCode
      ? data.models.map((x) => (x.code === editingCode ? model : x))
      : [...data.models, model];
    await persist({ ...data, models });
    setModal(null);
    setEditingCode(null);
    flash(
      `${model.name} berhasil ${editingCode ? "diperbarui" : "ditambahkan"}.`,
    );
  }
  async function addVendor(e: FormEvent) {
    e.preventDefault();
    const name = vendorForm.name.trim();
    if (
      data.vendors.some(
        (x) =>
          x.code !== editingVendorCode &&
          x.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      flash("Nama vendor sudah digunakan.");
      return;
    }
    if (vendorForm.capabilities.length === 0) {
      flash("Pilih minimal satu kemampuan vendor.");
      return;
    }
    if (vendorForm.capabilities.includes("sewing") && !vendorForm.qcLocationCode) {
      flash("Pilih tujuan QC internal untuk vendor ini.");
      return;
    }
    const old = data.vendors.find((x) => x.code === editingVendorCode);
    const vendor: Vendor = {
      code:
        editingVendorCode ??
        `VDR-${String(data.vendors.length + 1).padStart(3, "0")}`,
      name,
      contact: vendorForm.contact,
      phone: vendorForm.phone,
      address: vendorForm.address,
      active: true,
      qcMode: "internal",
      qcOfficer: "",
      qcLocationCode: vendorForm.qcLocationCode,
      bankName: vendorForm.bankName.trim(),
      accountNumber: vendorForm.accountNumber.trim(),
      accountHolder: vendorForm.accountHolder.trim(),
      capabilities: vendorForm.capabilities,
      screenprintRate: vendorForm.screenprintRate,
      embroideryRate: vendorForm.embroideryRate,
    };
    const records =
      old && old.name !== name
        ? Object.fromEntries(
            Object.entries(data.records).map(([stage, rows]) => [
              stage,
              rows.map((r) =>
                r.destination === old.name ? { ...r, destination: name } : r,
              ),
            ]),
          )
        : data.records;
    const notes =
      old && old.name !== name
        ? data.notes.map((n) => ({
            ...n,
            from: n.from === old.name ? name : n.from,
            to: n.to === old.name ? name : n.to,
          }))
        : data.notes;
    await persist({
      ...data,
      records,
      notes,
      vendors: editingVendorCode
        ? data.vendors.map((x) => (x.code === editingVendorCode ? vendor : x))
        : [...data.vendors, vendor],
    });
    setModal(null);
    setEditingVendorCode(null);
    flash(`${vendor.name} berhasil disimpan.`);
  }
  async function addQCLocation(e: FormEvent) {
    e.preventDefault();
    const location = qcLocationForm.location.trim();
    if (qcLocationForm.rate <= 0) {
      flash("Tarif QC per unit harus lebih dari nol.");
      return;
    }
    if (
      data.qcLocations.some(
        (x) =>
          x.code !== editingQCLocationCode &&
          x.location.toLowerCase() === location.toLowerCase(),
      )
    ) {
      flash("Nama lokasi QC sudah digunakan.");
      return;
    }
    const old = data.qcLocations.find((x) => x.code === editingQCLocationCode);
    const item: QCLocation = {
      code:
        editingQCLocationCode ??
        `QCL-${String(data.qcLocations.length + 1).padStart(3, "0")}`,
      ...qcLocationForm,
      location,
      active: true,
    };
    const records = old
      ? {
          ...data.records,
          "Pengiriman QC": (data.records["Pengiriman QC"] ?? []).map((r) =>
            r.destination === old.location
              ? { ...r, destination: location }
              : r,
          ),
        }
      : data.records;
    const notes = old
      ? data.notes.map((n) =>
          n.to === old.location
            ? { ...n, to: location, recipient: item.recipient }
            : n,
        )
      : data.notes;
    await persist({
      ...data,
      records,
      notes,
      qcLocations: editingQCLocationCode
        ? data.qcLocations.map((x) =>
            x.code === editingQCLocationCode ? item : x,
          )
        : [...data.qcLocations, item],
    });
    setModal(null);
    setEditingQCLocationCode(null);
    flash(`${item.location} berhasil disimpan.`);
  }
  async function addPIC(e: FormEvent) {
    e.preventDefault();
    const name = picForm.name.trim();
    if (
      data.pics.some(
        (x) =>
          x.code !== editingPICCode &&
          x.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      flash("Nama PIC sudah digunakan.");
      return;
    }
    const item: PIC = {
      code:
        editingPICCode ??
        `PIC-${String(data.pics.length + 1).padStart(3, "0")}`,
      name,
      role: picForm.role.trim(),
      phone: picForm.phone.trim(),
      bankName: picForm.bankName.trim(),
      accountNumber: picForm.accountNumber.trim(),
      accountHolder: picForm.accountHolder.trim(),
      active: true,
    };
    const old = data.pics.find((x) => x.code === editingPICCode);
    await persist({
      ...data,
      notes:
        old && old.name !== item.name
          ? data.notes.map((x) =>
              x.officer === old.name ? { ...x, officer: item.name } : x,
            )
          : data.notes,
      pics: editingPICCode
        ? data.pics.map((x) => (x.code === editingPICCode ? item : x))
        : [...data.pics, item],
    });
    setModal(null);
    setEditingPICCode(null);
    flash(`${item.name} berhasil disimpan sebagai PIC.`);
  }
  async function deleteModel(item: Model) {
    if (!window.confirm(`Hapus master jaket ${item.name}?`)) return;
    await persist({
      ...data,
      models: data.models.filter((x) => x.code !== item.code),
    });
    flash(`${item.name} dihapus.`);
  }
  async function deleteVendor(item: Vendor) {
    if (!window.confirm(`Hapus vendor ${item.name}?`)) return;
    await persist({
      ...data,
      vendors: data.vendors.filter((x) => x.code !== item.code),
    });
    flash(`${item.name} dihapus.`);
  }
  async function deleteQCLocation(item: QCLocation) {
    if (data.vendors.some((x) => x.qcLocationCode === item.code)) {
      flash(
        "Tujuan QC masih dipakai vendor. Pindahkan tujuan vendor terlebih dahulu.",
      );
      return;
    }
    if (!window.confirm(`Hapus tujuan QC ${item.location}?`)) return;
    await persist({
      ...data,
      qcLocations: data.qcLocations.filter((x) => x.code !== item.code),
    });
    flash(`${item.location} dihapus.`);
  }
  async function deletePIC(item: PIC) {
    if (
      data.notes.some((x) => x.officer === item.name) ||
      Object.values(data.records)
        .flat()
        .some((x) => x.qcOfficer === item.name)
    ) {
      flash("PIC sudah digunakan dalam transaksi dan tidak dapat dihapus.");
      return;
    }
    if (!window.confirm(`Hapus PIC ${item.name}?`)) return;
    await persist({
      ...data,
      pics: data.pics.filter((x) => x.code !== item.code),
    });
    flash(`${item.name} dihapus.`);
  }
  async function addRecord(e: FormEvent) {
    e.preventDefault();
    if (saveInFlightRef.current || saving) {
      flash("Data sedang disimpan. Tidak perlu menekan tombol dua kali.");
      return;
    }
    const info = stageInfo[active];
    const model = data.models.find((x) => x.code === form.code);
    if (!form.date) {
      flash("Tanggal transaksi wajib dipilih.");
      return;
    }
    if (!model) {
      flash("Model jaket dari transaksi sumber tidak ditemukan.");
      return;
    }
    if (info.source && !form.sourceId) {
      flash(`Pilih sumber dari ${info.source} terlebih dahulu.`);
      return;
    }
    if (sum(matrix) <= 0) {
      flash("Jumlah proses harus lebih dari nol.");
      return;
    }
    if ((info.move || active === "Bundle" || active === "Cutting") && !form.officer.trim()) {
      flash("Pilih PIC atau penanggung jawab terlebih dahulu.");
      return;
    }
    if (info.move && active !== "Penerimaan Gudang" && !form.destination.trim()) {
      flash("Tujuan atau lokasi wajib dipilih.");
      return;
    }
    if (active === "Pengiriman QC" && !form.recipient.trim()) {
      flash("Penerima QC belum tersedia. Periksa Master QC.");
      return;
    }
    if (active === "Cutting" && form.cuttingRate <= 0) {
      flash("Tarif cutting per unit harus lebih dari nol.");
      return;
    }
    if (active === "Pengiriman Vendor" && form.sewingRate <= 0) {
      flash("Tarif jahit per unit harus lebih dari nol.");
      return;
    }
    if (active === "Pengiriman QC") {
      const receipt = (data.records["Penerimaan Gudang"] ?? []).find(
        (row) => row.id === form.sourceId,
      );
      if (!receipt || !qcLocationForReceipt(receipt)) {
        flash(
          "Tujuan QC vendor belum diatur. Pilih Master QC pada data vendor terlebih dahulu.",
        );
        return;
      }
    }
    if (active === "Pengiriman Vendor") {
      const bundles = (data.records.Bundle ?? []).filter(
        (x) =>
          selectedBundleIds.includes(x.id) &&
          sourceAvailable("Pengiriman Vendor", x),
      );
      if (!bundles.length) {
        flash("Pilih minimal satu bundle yang akan dikirim.");
        return;
      }
      if (bundles.some((x) => x.modelCode !== model.code)) {
        flash(
          "Satu surat jalan hanya dapat berisi bundle dari model yang sama.",
        );
        return;
      }
      const deliveryNoteId = `SJ-${form.date.replaceAll("-", "").slice(2)}-${model.code}-KRM-${String(data.notes.length + 1).padStart(3, "0")}`;
      const shipments: RecordRow[] = bundles.map((bundle) => ({
        id: nextLotCode(
          "Pengiriman Vendor",
          "KRM",
          model.code,
          bundle.poId,
          bundle.id,
        ),
        stage: active,
        date: form.date,
        modelCode: model.code,
        modelName: model.name,
        sourceId: bundle.id,
        variants: bundle.variants,
        total: bundle.total,
        status: "Aktif",
        destination: form.destination,
        note: form.note,
        poId: bundle.poId,
        batchNo: bundle.batchNo,
        bundleNo: bundle.bundleNo,
        bundleId: bundle.id,
        deliveryNoteId,
        sewingRate: form.sewingRate,
        decorationProcess: bundle.decorationProcess ?? model.decorationProcess ?? "none",
      }));
      const variants = mergeVariants(bundles),
        note: Note = {
          id: deliveryNoteId,
          date: form.date,
          process: info.move!,
          sourceId: bundles.map((x) => x.id).join(", "),
          modelCode: model.code,
          modelName: model.name,
          from: "Gudang Cutting",
          to: form.destination,
          variants,
          total: sum(variants),
          officer: form.officer || "Admin",
          note: form.note,
          bundleIds: bundles.map((x) => x.id),
        };
      const records = {
          ...data.records,
          "Pengiriman Vendor": [
            ...(data.records["Pengiriman Vendor"] ?? []),
            ...shipments,
          ],
        },
        notes = [...data.notes, note];
      await persist({ ...data, records, notes });
      setModal(null);
      setPrint(note);
      flash(`${bundles.length} bundle dikirim dengan ${deliveryNoteId}.`);
      return;
    }
    if (
      active === "Pengiriman Vendor" &&
      (data.records["Pengiriman Vendor"] ?? []).some(
        (x) => x.sourceId === form.sourceId,
      )
    ) {
      flash("Bundle ini sudah dikirim dan tidak dapat dipilih kembali.");
      return;
    }
    if (active === "Quality Control" || active === "QC Ulang") {
      if (
        (data.records[active] ?? []).some((x) => x.sourceId === form.sourceId)
      ) {
        flash("Kiriman ini sudah diterima dan diperiksa QC.");
        return;
      }
      if (qcDetails.some((x) => x.passed + x.reject + x.repair !== x.qty)) {
        flash(
          "Setiap warna dan ukuran harus terbagi tepat ke lolos, repair, dan reject.",
        );
        return;
      }
      if (
        qcDetails.some((x) => (x.reject > 0 || x.repair > 0) && !x.note.trim())
      ) {
        flash("Catatan wajib diisi untuk barang repair atau reject.");
        return;
      }
    }
    if (active === "Sablon/Bordir") {
      const source = (data.records.Cutting ?? []).find(
        (row) => row.id === form.sourceId,
      );
      if (!source) {
        flash("Pilih kode Cutting untuk pekerjaan dekorasi.");
        return;
      }
      const selectedVendor = data.vendors.find((vendor) => vendor.name === form.destination);
      if (!selectedVendor || !(selectedVendor.capabilities ?? ["sewing"]).includes(form.decorationType)) {
        flash(`Pilih vendor yang memiliki kemampuan ${form.decorationType === "screenprint" ? "Sablon" : "Bordir"}.`);
        return;
      }
      const editingDecoration = editingDecorationId
        ? (data.records["Sablon/Bordir"] ?? []).find((row) => row.id === editingDecorationId)
        : undefined;
      if (!editingDecoration && (data.records.Bundle ?? []).some((row) => row.sourceId === source.id)) {
        flash("Cutting ini sudah masuk Bundle. Tambahkan pekerjaan dekorasi sebelum proses Bundle dimulai.");
        return;
      }
      if (editingDecoration && paidForReceipt(editingDecoration) > 0 && (
        editingDecoration.destination !== form.destination ||
        editingDecoration.decorationType !== form.decorationType ||
        (editingDecoration.decorationRate ?? 0) !== form.decorationRate
      )) {
        flash("Vendor, jenis, dan tarif tidak dapat diubah karena pekerjaan ini sudah memiliki pembayaran.");
        return;
      }
      if (!form.decorationDescription.trim()) {
        flash("Isi keterangan desain Sablon/Bordir.");
        return;
      }
      if (!form.decorationPosition.trim() || form.decorationPosition === "Posisi lainnya") {
        flash("Isi posisi Sablon/Bordir pada jaket.");
        return;
      }
      const duplicate = (data.records["Sablon/Bordir"] ?? []).find((row) =>
        row.id !== editingDecoration?.id &&
        row.sourceId === source.id &&
        row.decorationType === form.decorationType &&
        (row.decorationPosition ?? "").trim().toLowerCase() === form.decorationPosition.trim().toLowerCase() &&
        (row.decorationDescription ?? "").trim().toLowerCase() === form.decorationDescription.trim().toLowerCase() &&
        (row.destination ?? "").trim().toLowerCase() === form.destination.trim().toLowerCase()
      );
      if (duplicate) {
        flash(`Pekerjaan yang sama sudah tercatat sebagai ${duplicate.id}. Perbarui pekerjaan tersebut atau bedakan keterangannya.`);
        return;
      }
      const available = remainingDecoration(source, form.decorationType, form.decorationPosition);
      if (
        matrix.some(
          (variant) =>
            variant.qty >
            (available.find(
              (item) =>
                item.color === variant.color && item.size === variant.size,
            )?.qty ?? 0),
        )
      ) {
        flash("Jumlah pekerjaan tidak boleh melebihi jumlah fisik pada Cutting sumber.");
        return;
      }
      if (form.decorationCompleted > sum(matrix)) {
        flash("Jumlah selesai tidak boleh melebihi jumlah yang dikirim ke vendor dekorasi.");
        return;
      }
      if (form.paidAmount > sum(matrix) * form.decorationRate) {
        flash("Pembayaran tidak boleh melebihi total tagihan dekorasi.");
        return;
      }
    }
    if (
      ![
        "Order Produksi",
        "Cutting",
        "Bundle",
        "Sablon/Bordir",
        "Penerimaan Gudang",
        "Pengiriman QC",
        "Quality Control",
        "QC Ulang",
      ].includes(active)
    ) {
      const source = sourcesForStage(active).find(
        (x) => x.id === form.sourceId,
      );
      if (!source) return;
      if (!sourceAvailable(active, source)) {
        flash(
          `Hasil ${source.id} sudah dipakai pada proses ${active.toLowerCase()} dan tidak dapat digunakan dua kali.`,
        );
        return;
      }
      const expected = routedVariants(active, source);
      const mismatch =
        expected.some(
          (v) =>
            v.qty !==
            (matrix.find((x) => x.color === v.color && x.size === v.size)
              ?.qty ?? 0),
        ) ||
        matrix.some(
          (v) =>
            v.qty > 0 &&
            !expected.some((x) => x.color === v.color && x.size === v.size),
        );
      if (mismatch) {
        flash(
          `Jumlah ${active.toLowerCase()} harus sama persis dengan transaksi sumber per warna dan ukuran.`,
        );
        return;
      }
    }
    if (active === "Penerimaan Gudang") {
      const source = (data.records["Pengiriman Vendor"] ?? []).find(
        (x) => x.id === form.sourceId,
      );
      if (!source) return;
      const bill = sum(matrix) * (source.sewingRate ?? 0);
      if (form.paidAmount < 0 || form.paidAmount > bill) {
        flash("Nominal pembayaran tidak boleh melebihi nilai setoran.");
        return;
      }
      if (form.paidAmount > 0 && !form.paymentPIC.trim()) {
        flash("Pilih PIC finance untuk pembayaran pertama.");
        return;
      }
      const available = remainingAtVendor(source);
      if (
        matrix.some(
          (v) =>
            v.qty >
            (available.find((a) => a.color === v.color && a.size === v.size)
              ?.qty ?? 0),
        )
      ) {
        flash("Jumlah diterima melebihi sisa barang di vendor.");
        return;
      }
    }
    if (active === "Pengiriman QC") {
      const source = (data.records["Penerimaan Gudang"] ?? []).find(
        (x) => x.id === form.sourceId,
      );
      if (!source) return;
      const available = remainingToQC(source);
      if (
        matrix.some(
          (v) =>
            v.qty >
            (available.find((a) => a.color === v.color && a.size === v.size)
              ?.qty ?? 0),
        )
      ) {
        flash(
          "Jumlah kirim QC melebihi sisa penerimaan pada warna atau ukuran tertentu.",
        );
        return;
      }
    }
    if (active === "Bundle") {
      const source = (data.records.Cutting ?? []).find(
        (x) => x.id === form.sourceId,
      );
      if (!source) return;
      const available = remainingFor(source);
      const exceeds = matrix.some(
        (v) =>
          v.qty >
          (available.find((a) => a.color === v.color && a.size === v.size)
            ?.qty ?? 0),
      );
      if (exceeds) {
        flash(
          "Jumlah bundle melebihi sisa cutting pada warna atau ukuran tertentu.",
        );
        return;
      }
    }
    const cuttingSource =
        active === "Bundle" || active === "Sablon/Bordir"
          ? (data.records.Cutting ?? []).find((x) => x.id === form.sourceId)
          : undefined,
      batchNo = active === "Cutting" ? 1 : cuttingSource?.batchNo,
      bundleNo =
        active === "Bundle"
          ? (data.records.Bundle ?? []).filter(
              (x) => x.sourceId === form.sourceId,
            ).length + 1
          : undefined;
    const poIdForCode = cuttingSource?.poId;
    const poSequence = poIdForCode?.split("-").at(-1) ?? "000";
    const poToken = poLotToken(poIdForCode);
    const monthlyPOCount = (data.records["Order Produksi"] ?? []).filter(
      (x) =>
        x.modelCode === model.code &&
        periodYYMM(x.date) === periodYYMM(form.date),
    ).length;
    const monthlyCuttingCount = (data.records.Cutting ?? []).filter(
      (x) =>
        x.modelCode === model.code &&
        periodYYMM(x.date) === periodYYMM(form.date),
    ).length;
    const recordSource = sourcesForStage(active).find(
      (x) => x.id === form.sourceId,
    );
    const inheritedPOId = tracePOId(recordSource);
    const inheritedBundleId = traceBundleId(recordSource);
    const recordId =
      active === "Sablon/Bordir" && editingDecorationId
        ? editingDecorationId
      : active === "Order Produksi"
        ? `PO-${model.code}-${periodYYMM(form.date)}-${String(monthlyPOCount + 1).padStart(3, "0")}`
        : active === "Cutting"
          ? `CUT-${model.code}-${periodYYMM(form.date)}-${String(monthlyCuttingCount + 1).padStart(3, "0")}`
          : active === "Bundle"
            ? `BDL-${model.code}-${poToken || `P${poSequence}`}-C${String(batchNo ?? 1).padStart(2, "0")}-B${String(bundleNo).padStart(3, "0")}`
            : active === "Sablon/Bordir"
              ? `${form.decorationType === "screenprint" ? "SAB" : "BDR"}-${model.code}-${poToken || `P${poSequence}`}-C${String(recordSource?.batchNo ?? 1).padStart(2, "0")}-${String((data.records["Sablon/Bordir"] ?? []).filter((row) => row.sourceId === form.sourceId && row.decorationType === form.decorationType).length + 1).padStart(2, "0")}`
            : nextLotCode(
                active,
                info.prefix,
                model.code,
                inheritedPOId,
                inheritedBundleId,
                active === "Penerimaan Gudang"
                  ? "S"
                  : active === "Pengiriman QC" || active === "Quality Control"
                    ? "Q"
                    : active === "Rework" ||
                        active === "Penerimaan Rework" ||
                        active === "QC Ulang"
                      ? "R"
                      : "",
              );
    const qcPassed = qcDetails.reduce((n, x) => n + x.passed, 0),
      qcReject = qcDetails.reduce((n, x) => n + x.reject, 0),
      qcRepair = qcDetails.reduce((n, x) => n + x.repair, 0);
    const receiptShipment =
      active === "Penerimaan Gudang"
        ? (data.records["Pengiriman Vendor"] ?? []).find(
            (x) => x.id === form.sourceId,
          )
        : undefined;
    const receiptVendor = vendorForShipment(receiptShipment);
    const directVendorQC = false;
    const selectedQCLocation = directVendorQC
      ? data.qcLocations.find(
          (location) => location.code === receiptVendor?.qcLocationCode,
        )
      : active === "Quality Control" || active === "QC Ulang"
        ? data.qcLocations.find(
            (location) => location.location === recordSource?.destination,
          )
        : undefined;
    const record: RecordRow = {
      id: recordId,
      stage: active,
      date: form.date,
      modelCode: model.code,
      modelName: model.name,
      sourceId: active === "Cutting" ? "" : form.sourceId,
      variants: matrix.filter((x) => x.qty > 0),
      total: sum(matrix),
      status:
        active === "Quality Control" || active === "QC Ulang"
          ? "Selesai diperiksa"
          : active === "Sablon/Bordir"
            ? form.decorationCompleted >= sum(matrix) ? "Selesai" : form.decorationCompleted > 0 ? "Selesai sebagian" : "Di vendor dekorasi"
          : directVendorQC
            ? "Diterima · sudah QC vendor"
            : active === "Penerimaan Gudang"
              ? "Diterima gudang"
              : "Aktif",
      destination: form.destination,
      note: form.note,
      remainingStatus: form.remainingStatus,
      qcPassed:
        active === "Quality Control" || active === "QC Ulang" || directVendorQC
          ? qcPassed
          : undefined,
      qcReject:
        active === "Quality Control" || active === "QC Ulang" || directVendorQC
          ? qcReject
          : undefined,
      qcRepair:
        active === "Quality Control" || active === "QC Ulang" || directVendorQC
          ? qcRepair
          : undefined,
      qcDetails:
        active === "Quality Control" || active === "QC Ulang" || directVendorQC
          ? qcDetails
          : undefined,
      originVendor:
        (active === "Quality Control" || active === "QC Ulang") && recordSource
          ? traceOriginVendor(recordSource)
          : directVendorQC
            ? receiptShipment?.destination
            : undefined,
      qcMode: directVendorQC ? "vendor" : undefined,
      qcOfficer:
        active === "Quality Control" || active === "QC Ulang"
          ? selectedQCLocation?.recipient
          : directVendorQC
            ? receiptVendor?.qcOfficer
            : undefined,
      qcRate:
        active === "Quality Control" || directVendorQC
          ? selectedQCLocation?.rate ?? 0
          : active === "QC Ulang"
            ? 0
          : undefined,
      officer: form.officer,
      poId:
        active === "Cutting"
          ? recordId
          : active === "Bundle"
            ? cuttingSource?.poId
            : (receiptShipment?.poId ?? tracePOId(recordSource)),
      batchNo,
      bundleNo: active === "Bundle" ? bundleNo : receiptShipment?.bundleNo,
      bundleId: active === "Bundle" ? recordId : inheritedBundleId,
      deliveryNoteId: receiptShipment?.deliveryNoteId,
      sewingRate:
        active === "Penerimaan Gudang"
          ? receiptShipment?.sewingRate
          : form.sewingRate || recordSource?.sewingRate,
      cuttingRate: active === "Cutting" ? form.cuttingRate : undefined,
      paidAmount:
        active === "Sablon/Bordir" || active === "Penerimaan Gudang"
          ? form.paidAmount
          : undefined,
      paymentDate:
        active === "Penerimaan Gudang" && form.paidAmount > 0
          ? form.paymentDate || form.date
          : undefined,
      paymentHistory:
        active === "Penerimaan Gudang" && form.paidAmount > 0
          ? [
              {
                id: nextVendorPaymentId(data, form.paymentDate || form.date),
                date: form.paymentDate || form.date,
                amount: form.paidAmount,
                pic: form.paymentPIC || form.officer || "Belum dicatat",
                note: form.paymentNote.trim(),
              },
            ]
          : undefined,
      decorationProcess:
        recordSource?.decorationProcess ?? model.decorationProcess ?? "none",
      decorationType: active === "Sablon/Bordir" ? form.decorationType : undefined,
      decorationPosition: active === "Sablon/Bordir" ? form.decorationPosition : undefined,
      decorationDescription: active === "Sablon/Bordir" ? form.decorationDescription.trim() : undefined,
      decorationRate: active === "Sablon/Bordir" ? form.decorationRate : undefined,
      decorationCompleted: active === "Sablon/Bordir" ? form.decorationCompleted : undefined,
      decorationOrder: active === "Sablon/Bordir"
        ? (editingDecorationId
            ? (data.records["Sablon/Bordir"] ?? []).find((item) => item.id === editingDecorationId)?.decorationOrder
            : undefined) ?? (data.records["Sablon/Bordir"] ?? []).filter((item) => item.sourceId === form.sourceId).length + 1
        : undefined,
      decorationRequiredBeforeBundle: active === "Sablon/Bordir" ? form.decorationRequiredBeforeBundle : undefined,
      decorationFinalStep: active === "Sablon/Bordir" ? form.decorationRequiredBeforeBundle && form.decorationFinalStep : undefined,
    };
    const previousDecoration = active === "Sablon/Bordir" && editingDecorationId
      ? (data.records["Sablon/Bordir"] ?? []).find((item) => item.id === editingDecorationId)
      : undefined;
    const savedRecord = previousDecoration
      ? {
          ...previousDecoration,
          ...record,
          id: previousDecoration.id,
          paymentHistory: previousDecoration.paymentHistory,
          paidAmount: paidForReceipt(previousDecoration) > 0
            ? previousDecoration.paidAmount
            : record.paidAmount,
        }
      : record;
    let records = {
      ...data.records,
      [active]: previousDecoration
        ? (data.records[active] ?? []).map((item) => item.id === previousDecoration.id ? savedRecord : item)
        : [...(data.records[active] ?? []), savedRecord],
    };
    if (active === "Sablon/Bordir" && savedRecord.decorationRequiredBeforeBundle !== false && savedRecord.decorationFinalStep) {
      records = {
        ...records,
        "Sablon/Bordir": (records["Sablon/Bordir"] ?? []).map((item) =>
          item.sourceId === savedRecord.sourceId && item.id !== savedRecord.id
            ? { ...item, decorationFinalStep: false }
            : item,
        ),
      };
    }
    if (directVendorQC) {
      const qcId = nextLotCode(
        "Quality Control",
        "QC",
        model.code,
        record.poId,
        record.bundleId,
        "Q",
      );
      const qcRecord: RecordRow = {
        ...record,
        id: qcId,
        stage: "Quality Control",
        sourceId: record.id,
        status: "Selesai diperiksa di vendor",
        destination: "Gudang",
        originVendor: receiptShipment?.destination,
        qcMode: "vendor",
        qcOfficer: receiptVendor?.qcOfficer,
      };
      records = {
        ...records,
        "Quality Control": [...(records["Quality Control"] ?? []), qcRecord],
      };
    }
    let notes = previousDecoration
      ? data.notes.map((note) => note.sourceId === previousDecoration.id
          ? { ...note, date: form.date, to: form.destination, variants: savedRecord.variants, total: savedRecord.total, officer: form.officer || note.officer, note: form.note }
          : note)
      : data.notes;
    const createsNote = [
      "Sablon/Bordir",
      "Pengiriman Vendor",
      "Pengiriman QC",
      "Rework",
      "Penerimaan Rework",
    ].includes(active) && !previousDecoration;
    if (createsNote && info.move) {
      const [fromDefault, toDefault] = info.move.split(" → ");
      const reworkShipment = (data.records.Rework ?? []).find(
        (x) => x.id === form.sourceId,
      );
      const from =
        active === "Penerimaan Rework"
            ? reworkShipment?.destination || fromDefault
            : fromDefault;
      const note: Note = {
        id: `SJ-${form.date.replaceAll("-", "").slice(2)}-${model.code}-${info.prefix}-${String(notes.length + 1).padStart(3, "0")}`,
        date: form.date,
        process: info.move,
        sourceId: record.id,
        modelCode: model.code,
        modelName: model.name,
        from,
        to: form.destination || toDefault,
        variants: record.variants,
        total: record.total,
        officer: form.officer || "Admin",
        recipient: form.recipient,
        note: form.note,
        bundleIds: record.bundleId ? [record.bundleId] : undefined,
      };
      const directSummary = directVendorQC
        ? `QC ${receiptVendor?.qcOfficer}: lolos ${qcPassed}, repair ${qcRepair}, reject ${qcReject}.`
        : "";
      const finalNote = {
        ...note,
        note: [directSummary, form.note].filter(Boolean).join(" "),
      };
      notes = [...notes, finalNote];
      setPrint(finalNote);
    }
    await persist({ ...data, records, notes });
    setModal(null);
    setEditingDecorationId(null);
    flash(
      previousDecoration
        ? `${record.id} berhasil diperbarui tanpa mengubah identitas transaksi.`
      : active === "Penerimaan Gudang"
        ? `${record.id} tersimpan sebagai bukti penerimaan · referensi ${record.deliveryNoteId || "surat jalan pengiriman"}.`
        : `${record.id} tersimpan${createsNote ? " dan surat jalan dibuat otomatis" : ""}.`,
    );
  }
  const qcOutcomeSources = [
    ...(data.records["Quality Control"] ?? []),
    ...(data.records["QC Ulang"] ?? []),
  ];
  const rejectRows = qcOutcomeSources
    .map((q, index) => {
      const variants = (q.qcDetails ?? [])
        .map((x) => ({ color: x.color, size: x.size, qty: x.reject }))
        .filter((x) => x.qty > 0);
      return {
        ...q,
        id:
          tracePOId(q) && traceBundleId(q)
            ? `RJT-${q.modelCode}-${poLotToken(tracePOId(q))}-${shortBundleCode(traceBundleId(q))}-${String(index + 1).padStart(2, "0")}`
            : `RJT-${q.id}`,
        stage: "Karantina Reject",
        sourceId: q.id,
        variants,
        total: sum(variants),
        status: "Karantina",
        poId: tracePOId(q),
        bundleId: traceBundleId(q),
      };
    })
    .filter((x) => x.total > 0);
  const current =
    active === "Karantina Reject" ? rejectRows : (data.records[active] ?? []);
  const filteredNotes = useMemo(
    () =>
      data.notes.filter((n) =>
        `${n.id} ${n.sourceId} ${n.modelName} ${n.process}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.notes, query],
  );
  const modelCodeLocked =
    !!editingCode &&
    ["Order Produksi", "Cutting"].some((stage) =>
      (data.records[stage] ?? []).some((x) => x.modelCode === editingCode),
    );
  const editingDecorationRecord = editingDecorationId
    ? (data.records["Sablon/Bordir"] ?? []).find((item) => item.id === editingDecorationId)
    : undefined;
  const decorationFinancialLocked = !!editingDecorationRecord && paidForReceipt(editingDecorationRecord) > 0;

  return (
    <main className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-menu-backdrop"
          aria-label="Tutup menu"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className={`app-side ${mobileMenu ? "mobile-open" : ""}`}>
        <div className="app-brand">
          <img src="/oims-logo.jpg" alt="Logo Oims" />
          <div>
            <b>Oims</b>
            <small>PRODUCTION MANAGEMENT</small>
          </div>
          <button
            className="mobile-menu-close"
            aria-label="Tutup menu"
            onClick={() => setMobileMenu(false)}
          >
            ×
          </button>
        </div>
        <p>MENU UTAMA</p>
        <nav className="grouped-nav">
          <button
            className={`nav-direct ${active === "Dashboard" ? "active" : ""}`}
            onClick={() => {
              navigate("Dashboard");
              setMobileMenu(false);
            }}
          >
            <i>▦</i><span>Dashboard</span>
          </button>
          {navGroups.map((group, index) => {
            const expanded = openNavGroup === group.id;
            const groupActive = group.items.some((name) => name === active);
            const showSection = index === 0 || navGroups[index - 1].section !== group.section;
            return (
              <Fragment key={group.id}>
              {showSection && <p className="nav-section-label">{group.section}</p>}
              <div className={`nav-group ${expanded ? "expanded" : ""}`}>
                <button
                  type="button"
                  className={`nav-group-trigger ${groupActive ? "group-active" : ""}`}
                  aria-expanded={expanded}
                  onClick={() => setOpenNavGroup(expanded ? null : group.id)}
                >
                  <i>{group.icon}</i><span>{group.label}</span><b aria-hidden="true">⌄</b>
                </button>
                {expanded && (
                  <div className="nav-submenu">
                    {group.items.map((name) => (
                      <button
                        key={name}
                        className={active === name ? "active" : ""}
                        onClick={() => {
                          navigate(name);
                          setMobileMenu(false);
                        }}
                      >
                        <i>{navIcon(name)}</i><span>{name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              </Fragment>
            );
          })}
          <p className="nav-section-label">DOKUMEN</p>
          <div className="nav-bottom-link">
            <button
              className={`nav-direct ${active === "Surat Jalan" ? "active" : ""}`}
              onClick={() => {
                navigate("Surat Jalan");
                setMobileMenu(false);
              }}
            >
              <i>▤</i><span>Surat Jalan</span><em>{data.notes.filter((note) => note.process !== "Vendor Jahit → Gudang").length}</em>
            </button>
          </div>
        </nav>
        <div className="user-card">
          <span>AR</span>
          <div>
            <b>Andi Rahman</b>
            <small>{saving ? "Menyimpan..." : "Data tersimpan"}</small>
          </div>
        </div>
      </aside>
      <section className="app-main">
        <header className="topbar">
          <button
            className="mobile-menu-button"
            aria-label="Buka semua menu"
            onClick={() => setMobileMenu(true)}
          >
            ☰
          </button>
          <div className="topbar-title">
            <b>{active}</b>
            <span>Oims · Production Management System</span>
          </div>
          <label>
            <span>⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari batch Cutting, bundle, surat jalan..."
            />
          </label>
          <span className={`sync ${saving ? "busy" : ""}`}>
            {saving ? "● Menyimpan" : "✓ Tersimpan"}
          </span>
          <div className="top-avatar">AR</div>
        </header>
        {isSimulation && (
          <div className="simulation-banner" role="status">
            <div>
              <b>MODE SIMULASI</b>
              <span>
                Transaksi di halaman ini terpisah dari data produksi asli.
              </span>
            </div>
            <button type="button" onClick={resetSimulation} disabled={saving}>
              Kosongkan transaksi uji
            </button>
          </div>
        )}
        <div className="workspace">
          {!loaded ? (
            <div className="loading">Menyiapkan data produksi…</div>
          ) : (
            <>
              {active === "Dashboard" && (
                <Dashboard data={data} go={navigate} />
              )}
              {active === "Master Jaket" && (
                <Master
                  data={data}
                  onAdd={() => {
                    setEditingCode(null);
                    setModelCodeTouched(false);
                    setForm(emptyForm);
                    setModal("master");
                  }}
                  onEdit={(m) => {
                    setEditingCode(m.code);
                    setModelCodeTouched(true);
                    setForm({
                      ...emptyForm,
                      code: m.code,
                      name: m.name,
                      colors: m.colors.join(", "),
                      sizes: m.sizes.join(", "),
                      decorationProcess: m.decorationProcess ?? "none",
                    });
                    setModal("master");
                  }}
                  onDelete={deleteModel}
                />
              )}
              {active === "Master Vendor" && (
                <VendorMaster
                  vendors={data.vendors}
                  qcLocations={data.qcLocations}
                  onAdd={() => {
                    setEditingVendorCode(null);
                    setVendorForm({
                      name: "",
                      contact: "",
                      phone: "",
                      address: "",
                      qcMode: "internal",
                      qcOfficer: "",
                      qcLocationCode:
                        data.qcLocations.find((x) => x.active)?.code ?? "",
                      bankName: "",
                      accountNumber: "",
                      accountHolder: "",
                      capabilities: ["sewing"],
                      screenprintRate: 0,
                      embroideryRate: 0,
                    });
                    setModal("vendor");
                  }}
                  onEdit={(v) => {
                    setEditingVendorCode(v.code);
                    setVendorForm({
                      name: v.name,
                      contact: v.contact,
                      phone: v.phone,
                      address: v.address,
                      qcMode: v.qcMode ?? "internal",
                      qcOfficer: v.qcOfficer ?? "",
                      qcLocationCode:
                        v.qcLocationCode ??
                        data.qcLocations.find((x) => x.active)?.code ??
                        "",
                      bankName: v.bankName ?? "",
                      accountNumber: v.accountNumber ?? "",
                      accountHolder: v.accountHolder ?? "",
                      capabilities: v.capabilities ?? ["sewing"],
                      screenprintRate: v.screenprintRate ?? 0,
                      embroideryRate: v.embroideryRate ?? 0,
                    });
                    setModal("vendor");
                  }}
                  onDelete={deleteVendor}
                />
              )}
              {active === "Master QC" && (
                <QCLocationMaster
                  items={data.qcLocations}
                  onAdd={() => {
                    setEditingQCLocationCode(null);
                    setQcLocationForm({
                      location: "",
                      recipient: "",
                      phone: "",
                      address: "",
                      rate: 0,
                      bankName: "",
                      accountNumber: "",
                      accountHolder: "",
                    });
                    setModal("qcLocation");
                  }}
                  onEdit={(x) => {
                    setEditingQCLocationCode(x.code);
                    setQcLocationForm({
                      location: x.location,
                      recipient: x.recipient,
                      phone: x.phone,
                      address: x.address,
                      rate: x.rate ?? 0,
                      bankName: x.bankName ?? "",
                      accountNumber: x.accountNumber ?? "",
                      accountHolder: x.accountHolder ?? "",
                    });
                    setModal("qcLocation");
                  }}
                  onDelete={deleteQCLocation}
                />
              )}
              {active === "Master PIC" && (
                <PICMaster
                  items={data.pics}
                  onAdd={() => {
                    setEditingPICCode(null);
                    setPicForm({ name: "", role: "", phone: "", bankName: "", accountNumber: "", accountHolder: "" });
                    setModal("pic");
                  }}
                  onEdit={(item) => {
                    setEditingPICCode(item.code);
                    setPicForm({
                      name: item.name,
                      role: item.role,
                      phone: item.phone,
                      bankName: item.bankName ?? "",
                      accountNumber: item.accountNumber ?? "",
                      accountHolder: item.accountHolder ?? "",
                    });
                    setModal("pic");
                  }}
                  onDelete={deletePIC}
                />
              )}
              {stages.includes(active) && active !== "Karantina Reject" && (
                <div
                  className={`live-stage ${active === "Quality Control" ? "qc-stage" : active === "Rework" ? "rework-stage" : ""}`}
                >
                  {["Cutting", "Sablon/Bordir", "Bundle"].includes(active) && (
                    <div className="production-stage-breadcrumb">
                      <span>{active === "Sablon/Bordir" ? "Sablon & Bordir" : "Produksi"}</span><b>›</b><strong>{active}</strong>
                    </div>
                  )}
                  <LiveStageStatus
                    active={active}
                    rows={current}
                    allRecords={data.records}
                    mode="active"
                    onUpdateDecoration={active === "Sablon/Bordir" ? openDecorationEdit : undefined}
                    showTableToolbar={tableToolbarStages.has(active)}
                    onAdd={tableToolbarStages.has(active) ? openRecord : undefined}
                    addLabel={tableToolbarStages.has(active) ? stagePrimaryActionLabel(active) : undefined}
                    addDisabled={active === "Bundle" && !sourcesForStage(active).some((source) => sum(remainingFor(source)) > 0)}
                  />
                  <StagePage
                    active={active}
                    rows={current}
                    sources={sourcesForStage(active)}
                    allRecords={data.records}
                    weeklyPayments={data.weeklyPayments}
                    qcLocations={data.qcLocations}
                    sourceCount={
                      sourcesForStage(active).length
                    }
                    onAdd={openRecord}
                    onPrintBundle={setBundlePrint}
                    onSendBundles={openBundleShipment}
                    onUpdatePayment={(receipt, kind) => {
                      setPaymentReceipt(receipt);
                      setPaymentKind(kind);
                      setPaymentAmount(0);
                      setPaymentDate(
                        new Date().toISOString().slice(0, 10),
                      );
                      setPaymentPIC(data.pics.find((pic) => pic.active)?.name ?? "");
                      setPaymentNote("");
                    }}
                    onPrintPayment={(receipt, payment, kind) =>
                      setPaymentPrint({ receipt, payment, kind })
                    }
                    onVoidPayment={voidReceiptPayment}
                    onSetCuttingRate={(cutting) => {
                      setCuttingRateRecord(cutting);
                      setCuttingRateInput(cutting.cuttingRate ?? 0);
                    }}
                    onSetVendorRate={(receipt) => {
                      const shipment = (data.records["Pengiriman Vendor"] ?? []).find(
                        (item) => item.id === receipt.sourceId,
                      );
                      setVendorRateRecord(receipt);
                      setVendorRateInput(receipt.sewingRate ?? shipment?.sewingRate ?? 0);
                    }}
                    onSetQCRate={(inspection) => {
                      const shipment = (data.records["Pengiriman QC"] ?? []).find(
                          (item) => item.id === inspection.sourceId,
                        ),
                        masterRate = data.qcLocations.find(
                          (location) =>
                            location.location === shipment?.destination ||
                            location.recipient === inspection.qcOfficer,
                        )?.rate ?? 0;
                      setQCRateRecord(inspection);
                      setQCRateInput(inspection.qcRate ?? masterRate);
                    }}
                    onSetDecorationRate={setDecorationRate}
                    onCreateWeeklyPayment={openWeeklyPayment}
                    onPrintWeeklyPayment={setWeeklyPrint}
                    onVoidWeeklyPayment={voidWeeklyPayment}
                  />
                  {(active === "Quality Control" || active === "QC Ulang") && !qcOperationalStages.has(active) && (
                    <QCSummary rows={current} allRecords={data.records} />
                  )}{" "}
                  {active === "Rework" && !qcOperationalStages.has(active) && (
                    <ReworkSummary
                      qcRows={data.records["Quality Control"] ?? []}
                      rows={current}
                    />
                  )}
                  {!['Cutting', 'Sablon/Bordir', 'Bundle', 'Pengiriman Vendor', 'Penerimaan Gudang'].includes(active) && !qcOperationalStages.has(active) && (
                    <LiveStageStatus
                      active={active}
                      rows={current}
                      allRecords={data.records}
                      mode="completed"
                      onUpdateDecoration={active === "Sablon/Bordir" ? openDecorationEdit : undefined}
                    />
                  )}
                </div>
              )}
              {active === "Karantina Reject" && (
                <RejectQuarantine rows={rejectRows} />
              )}
              {active === "Surat Jalan" && (
                <Notes
                  notes={filteredNotes}
                  query={query}
                  setQuery={setQuery}
                  onPrint={setPrint}
                />
              )}
              {active === "Laporan Produksi" && <Reports key="production" mode="production" data={data} go={navigate} />}
              {active === "Laporan Keuangan" && <Reports key="finance" mode="finance" data={data} go={navigate} />}
            </>
          )}
        </div>
      </section>

      {modal === "master" && (
        <div className="overlay">
          <form className="form-modal" onSubmit={addMaster}>
            <button
              className="close"
              type="button"
              onClick={() => {
                setModal(null);
                setEditingCode(null);
              }}
            >
              ×
            </button>
            <p className="overline">MASTER DATA</p>
            <h2>{editingCode ? "Edit Model Jaket" : "Tambah Model Jaket"}</h2>
            <div className="field-grid">
              <label>
                Kode jaket
                <input
                  required
                  disabled={modelCodeLocked}
                  maxLength={5}
                  value={form.code}
                  onChange={(e) => {
                    setModelCodeTouched(true);
                    setForm({
                      ...form,
                      code: e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, ""),
                    });
                  }}
                />
                <small>
                  {modelCodeLocked
                    ? "Kode terkunci karena sudah digunakan dalam transaksi produksi."
                    : "Dibuat otomatis, tetapi masih dapat diganti sebelum digunakan dalam Cutting."}
                </small>
              </label>
              <label>
                Nama model
                <input
                  required
                  placeholder="Contoh: Orion"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm({
                      ...form,
                      name,
                      code: modelCodeTouched
                        ? form.code
                        : automaticModelCode(name, data.models, editingCode),
                    });
                  }}
                />
              </label>
              <label className="full">
                Daftar warna{" "}
                <small>
                  (pisahkan dengan koma; dapat ditambah, diubah, atau dihapus)
                </small>
                <input
                  required
                  placeholder="Hitam, Navy, Olive"
                  value={form.colors}
                  onChange={(e) => setForm({ ...form, colors: e.target.value })}
                />
              </label>
              <label className="full">
                Daftar ukuran{" "}
                <small>
                  (pisahkan dengan koma; bebas, misalnya S sampai 4XL)
                </small>
                <input
                  required
                  placeholder="S, M, L, XL, XXL, 3XL, 4XL"
                  value={form.sizes}
                  onChange={(e) => setForm({ ...form, sizes: e.target.value })}
                />
              </label>
              <label className="full">
                Proses setelah bundle
                <select
                  value={form.decorationProcess}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      decorationProcess: e.target.value as DecorationProcess,
                    })
                  }
                >
                  <option value="none">Tanpa sablon/bordir</option>
                  <option value="screenprint">Sablon</option>
                  <option value="embroidery">Bordir</option>
                  <option value="both">Sablon + bordir</option>
                </select>
                <small>
                  Model yang memakai proses ini wajib diselesaikan sebelum bundle tersedia untuk vendor jahit.
                </small>
              </label>
            </div>
            <div className="master-preview">
              <div>
                <small>Pratinjau warna</small>
                <p>
                  {form.colors
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .map((x) => (
                      <b key={x}>{x}</b>
                    ))}
                </p>
              </div>
              <div>
                <small>Pratinjau ukuran</small>
                <p>
                  {form.sizes
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .map((x) => (
                      <b key={x}>{x.toUpperCase()}</b>
                    ))}
                </p>
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setEditingCode(null);
                }}
              >
                Batal
              </button>
              <button className="primary">
                {editingCode ? "Simpan perubahan" : "Simpan model"}
              </button>
            </div>
          </form>
        </div>
      )}
      {modal === "vendor" && (
        <div className="overlay">
          <form className="form-modal" onSubmit={addVendor}>
            <button
              className="close"
              type="button"
              onClick={() => setModal(null)}
            >
              ×
            </button>
            <p className="overline">MASTER DATA</p>
            <h2>
              {editingVendorCode ? "Edit Vendor Jahit" : "Tambah Vendor Jahit"}
            </h2>
            <div className="field-grid">
              <label>
                Nama vendor
                <input
                  required
                  placeholder="Contoh: Tasik"
                  value={vendorForm.name}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, name: e.target.value })
                  }
                />
              </label>
              <label>
                Penanggung jawab
                <input
                  placeholder="Nama PIC"
                  value={vendorForm.contact}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, contact: e.target.value })
                  }
                />
              </label>
              <label>
                Nomor telepon
                <input
                  placeholder="08..."
                  value={vendorForm.phone}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, phone: e.target.value })
                  }
                />
              </label>
              <label>
                Alamat
                <input
                  placeholder="Alamat vendor"
                  value={vendorForm.address}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, address: e.target.value })
                  }
                />
              </label>
              <fieldset className="full vendor-capability-field">
                <legend>Kemampuan vendor</legend>
                {([
                  ["sewing", "Jahit"],
                  ["screenprint", "Sablon"],
                  ["embroidery", "Bordir"],
                ] as const).map(([value, label]) => (
                  <label key={value}>
                    <input
                      type="checkbox"
                      checked={vendorForm.capabilities.includes(value)}
                      onChange={(event) => setVendorForm({
                        ...vendorForm,
                        capabilities: event.target.checked
                          ? [...vendorForm.capabilities, value]
                          : vendorForm.capabilities.filter((item) => item !== value),
                      })}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              {vendorForm.capabilities.includes("screenprint") && (
                <label>
                  Tarif rekomendasi Sablon / unit
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Contoh: 8000"
                    value={rupiahInput(vendorForm.screenprintRate)}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => setVendorForm({ ...vendorForm, screenprintRate: parseRupiahInput(event.target.value) })}
                  />
                  <small>Tarif awal otomatis; tetap bisa diubah pada transaksi.</small>
                </label>
              )}
              {vendorForm.capabilities.includes("embroidery") && (
                <label>
                  Tarif rekomendasi Bordir / unit
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Contoh: 5000"
                    value={rupiahInput(vendorForm.embroideryRate)}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => setVendorForm({ ...vendorForm, embroideryRate: parseRupiahInput(event.target.value) })}
                  />
                  <small>Tarif awal otomatis; tetap bisa diubah pada transaksi.</small>
                </label>
              )}
              <label>
                Bank pembayaran
                <input placeholder="Contoh: BCA" value={vendorForm.bankName} onChange={(e) => setVendorForm({ ...vendorForm, bankName: e.target.value })} />
              </label>
              <label>
                Nomor rekening
                <input inputMode="numeric" placeholder="Nomor rekening vendor" value={vendorForm.accountNumber} onChange={(e) => setVendorForm({ ...vendorForm, accountNumber: e.target.value.replace(/\D/g, "") })} />
              </label>
              <label className="full">
                Nama pemilik rekening
                <input placeholder="Nama sesuai rekening" value={vendorForm.accountHolder} onChange={(e) => setVendorForm({ ...vendorForm, accountHolder: e.target.value })} />
              </label>
              {vendorForm.capabilities.includes("sewing") && <label className="full">
                Metode Quality Control
                <input readOnly value="QC terpisah setelah barang masuk gudang" />
                <small>
                  Semua vendor mengikuti alur Penerimaan Gudang → Pengiriman QC → Quality Control.
                </small>
              </label>}
              {vendorForm.capabilities.includes("sewing") && <label className="full">
                  Tujuan & penerima QC
                  <select
                    required
                    value={vendorForm.qcLocationCode}
                    onChange={(e) =>
                      setVendorForm({
                        ...vendorForm,
                        qcLocationCode: e.target.value,
                      })
                    }
                  >
                    <option value="">Pilih tujuan QC internal</option>
                    {data.qcLocations
                      .filter((x) => x.active)
                      .map((x) => (
                        <option key={x.code} value={x.code}>
                          {x.location} — {x.recipient}
                        </option>
                      ))}
                  </select>
                  <small>
                    Kelola tujuan, petugas, tarif, dan rekening melalui Master QC.
                  </small>
              </label>}
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setModal(null)}>
                Batal
              </button>
              <button className="primary">Simpan vendor</button>
            </div>
          </form>
        </div>
      )}

      {modal === "record" && (
        <div className="overlay">
          <form
            className="form-modal matrix-modal"
            onSubmit={addRecord}
            noValidate
          >
            <button
              className="close"
              type="button"
              onClick={() => setModal(null)}
            >
              ×
            </button>
            <p className="overline">{active.toUpperCase()}</p>
            <h2>
              {editingDecorationRecord
                ? `Edit ${editingDecorationRecord.id}`
              : active === "Order Produksi"
                ? "Buat PO Produksi"
                : `Catat ${stageInfo[active].title}`}
            </h2>
            <div className="field-grid">
              <label>
                Tanggal
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>
              {active === "Order Produksi" || active === "Cutting" ? (
                <label>
                  Model jaket
                  <select
                    value={form.code}
                    onChange={(e) => {
                      const m = data.models.find(
                        (x) => x.code === e.target.value,
                      )!;
                      setForm({ ...form, code: e.target.value });
                      setMatrix(buildMatrix(m));
                    }}
                  >
                    {data.models
                      .filter((x) => x.active)
                      .map((x) => (
                        <option key={x.code} value={x.code}>
                          {x.code} — {x.name}
                        </option>
                      ))}
                  </select>
                </label>
              ) : (
                <label className="full">
                  {active === "Penerimaan Gudang"
                    ? "Surat jalan pengiriman vendor"
                    : `Sumber dari ${stageInfo[active].source}`}
                  <select
                    required
                    disabled={!!editingDecorationRecord}
                    value={form.sourceId}
                    onChange={(e) => selectSource(e.target.value)}
                  >
                    <option value="">Pilih transaksi sumber</option>
                    {sourcesForStage(active)
                      .filter(
                        (x) =>
                          (active !== "Bundle" || sum(remainingFor(x)) > 0) &&
                          sourceAvailable(active, x),
                      )
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {active === "Penerimaan Gudang" && x.deliveryNoteId
                            ? `${x.deliveryNoteId} · ${x.id}`
                            : x.id} · {x.modelName} ·{" "}
                          {active === "Cutting"
                            ? sum(remainingAtPO(x))
                            : active === "Bundle"
                              ? sum(remainingFor(x))
                              : active === "Sablon/Bordir"
                                ? sum(remainingDecoration(x))
                              : active === "Penerimaan Gudang"
                                ? sum(remainingAtVendor(x))
                                : active === "Pengiriman QC"
                                  ? sum(remainingToQC(x))
                                : active === "Rework"
                                  ? sum(routedVariants(active, x))
                                  : active === "Karantina Reject"
                                    ? sum(routedVariants(active, x))
                                    : active === "Stok Barang Jadi"
                                      ? sum(routedVariants(active, x))
                                      : x.total}{" "}
                          unit tersedia
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {active === "Sablon/Bordir" && (
                <>
                  {editingDecorationRecord && (
                    <div className="full form-inline-notice">
                      {decorationFinancialLocked
                        ? "Pekerjaan sudah memiliki pembayaran. Vendor, jenis, dan tarif dikunci; progres dan keterangan masih dapat diperbarui."
                        : "Identitas kode dan sumber Cutting tetap dipertahankan agar penelusuran tidak terputus."}
                    </div>
                  )}
                  <label>
                    Jenis pekerjaan
                    <select
                      disabled={decorationFinancialLocked}
                      value={form.decorationType}
                      onChange={(event) => {
                        const decorationType = event.target.value as "screenprint" | "embroidery";
                        const source = (data.records.Cutting ?? []).find((row) => row.id === form.sourceId);
                        const vendor = data.vendors.find((item) => item.name === form.destination);
                        const recommendedRate = decorationType === "screenprint" ? vendor?.screenprintRate : vendor?.embroideryRate;
                        setForm({ ...form, decorationType, decorationRate: recommendedRate ?? form.decorationRate });
                        if (source) setMatrix(remainingDecoration(source, decorationType, form.decorationPosition));
                      }}
                    >
                      <option value="screenprint">Sablon</option>
                      <option value="embroidery">Bordir</option>
                    </select>
                  </label>
                  <label>
                    Posisi pada jaket
                    <select
                      value={["Dada kiri", "Dada kanan", "Badan depan", "Badan belakang", "Saku depan", "Lengan kiri", "Lengan kanan", "Kerah"].includes(form.decorationPosition) ? form.decorationPosition : "__manual__"}
                      onChange={(event) => {
                        const decorationPosition = event.target.value === "__manual__" ? "" : event.target.value;
                        const source = (data.records.Cutting ?? []).find((row) => row.id === form.sourceId);
                        setForm({ ...form, decorationPosition });
                        if (source) setMatrix(remainingDecoration(source, form.decorationType, decorationPosition));
                      }}
                    >
                      {["Dada kiri", "Dada kanan", "Badan depan", "Badan belakang", "Saku depan", "Lengan kiri", "Lengan kanan", "Kerah"].map((position) => <option key={position}>{position}</option>)}
                      <option value="__manual__">Ketik posisi lain…</option>
                    </select>
                  </label>
                  {!["Dada kiri", "Dada kanan", "Badan depan", "Badan belakang", "Saku depan", "Lengan kiri", "Lengan kanan", "Kerah"].includes(form.decorationPosition) && (
                    <label>
                      Posisi lainnya
                      <input
                        required
                        autoFocus
                        placeholder="Contoh: Punggung atas atau manset kiri"
                        value={form.decorationPosition}
                        onChange={(event) => {
                          const decorationPosition = event.target.value;
                          const source = (data.records.Cutting ?? []).find((row) => row.id === form.sourceId);
                          setForm({ ...form, decorationPosition });
                          if (source) setMatrix(remainingDecoration(source, form.decorationType, decorationPosition));
                        }}
                      />
                    </label>
                  )}
                  <label className="full">
                    Keterangan desain
                    <input
                      required
                      placeholder="Contoh: Logo Owncrave ukuran 8 cm"
                      value={form.decorationDescription}
                      onChange={(event) => setForm({ ...form, decorationDescription: event.target.value })}
                    />
                  </label>
                  <div className="full decoration-workflow-options">
                    <label className="decoration-check-option">
                      <input type="checkbox" checked={form.decorationRequiredBeforeBundle} onChange={(event) => setForm({ ...form, decorationRequiredBeforeBundle: event.target.checked, decorationFinalStep: event.target.checked ? form.decorationFinalStep : false })} />
                      <span><b>Wajib selesai sebelum Bundle</b><small>Pekerjaan ini harus selesai sebelum barang dapat dibundel.</small></span>
                    </label>
                    <label className="decoration-check-option">
                      <input type="checkbox" disabled={!form.decorationRequiredBeforeBundle} checked={form.decorationFinalStep} onChange={(event) => setForm({ ...form, decorationFinalStep: event.target.checked })} />
                      <span><b>Pekerjaan terakhir dalam rangkaian</b><small>Penanda tahap terakhir otomatis berpindah saat pekerjaan berikutnya dibuat.</small></span>
                    </label>
                  </div>
                </>
              )}
              {stageInfo[active].move && (
                <>
                  {active === "Pengiriman Vendor" ? (
                    <label>
                      Vendor jahit
                      <select
                        required
                        value={form.destination}
                        onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      >
                        <option value="">Pilih vendor</option>
                        {data.vendors
                          .filter((v) => v.active)
                          .map((v) => (
                            <option key={v.code} value={v.name}>
                              {v.code} — {v.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  ) : active === "Sablon/Bordir" ? (
                    <label>
                      Pelaksana sablon/bordir
                      <select
                        required
                        disabled={decorationFinancialLocked}
                        value={form.destination}
                        onChange={(e) => {
                          const destination = e.target.value;
                          const vendor = data.vendors.find((item) => item.name === destination);
                          const recommendedRate = form.decorationType === "screenprint" ? vendor?.screenprintRate : vendor?.embroideryRate;
                          setForm({ ...form, destination, decorationRate: recommendedRate ?? form.decorationRate });
                        }}
                      >
                        <option value="">Pilih pelaksana</option>
                        {data.vendors
                          .filter((vendor) => vendor.active && (vendor.capabilities ?? ["sewing"]).includes(form.decorationType))
                          .map((vendor) => (
                            <option key={vendor.code} value={vendor.name}>
                              {vendor.code} — {vendor.name}
                            </option>
                          ))}
                      </select>
                      <small>
                        Vendor disaring berdasarkan kemampuan Sablon atau Bordir di Master Vendor.
                      </small>
                    </label>
                  ) : active === "Penerimaan Gudang" ? (
                    <label>
                      Status sisa di vendor
                      <select
                        value={form.remainingStatus}
                        onChange={(e) =>
                          setForm({ ...form, remainingStatus: e.target.value })
                        }
                      >
                        <option>Masih dijahit</option>
                        <option>Selesai menunggu setoran</option>
                        <option>Terkendala</option>
                        <option>Selisih</option>
                      </select>
                    </label>
                  ) : active === "Rework" ? (
                    <label>
                      Tujuan repair (vendor asal)
                      <input required readOnly value={form.destination} />
                    </label>
                  ) : (
                    <label>
                      Tujuan / lokasi
                      <input
                        required
                        placeholder="Tujuan perpindahan"
                        value={form.destination}
                        onChange={(e) =>
                          setForm({ ...form, destination: e.target.value })
                        }
                      />
                    </label>
                  )}
                  <label>
                    PIC / Penanggung jawab
                    <select
                      required
                      value={form.officer}
                      onChange={(e) =>
                        setForm({ ...form, officer: e.target.value })
                      }
                    >
                      <option value="">Pilih PIC</option>
                      {data.pics
                        .filter((x) => x.active)
                        .map((x) => (
                          <option key={x.code} value={x.name}>
                            {x.code} — {x.name}
                            {x.role ? ` · ${x.role}` : ""}
                          </option>
                        ))}
                    </select>
                    {data.pics.length === 0 && (
                      <small>
                        Buat PIC terlebih dahulu melalui menu Master PIC.
                      </small>
                    )}
                  </label>
                </>
              )}
              {active === "Bundle" && (
                <label>
                  PIC / Penanggung jawab Bundle
                  <select
                    required
                    value={form.officer}
                    onChange={(e) =>
                      setForm({ ...form, officer: e.target.value })
                    }
                  >
                    <option value="">Pilih PIC</option>
                    {data.pics
                      .filter((x) => x.active)
                      .map((x) => (
                        <option key={x.code} value={x.name}>
                          {x.code} — {x.name}
                          {x.role ? ` · ${x.role}` : ""}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {active === "Cutting" && (
                <>
                  <label>
                    Pelaksana Cutting
                    <select
                      required
                      value={form.officer}
                      onChange={(e) =>
                        setForm({ ...form, officer: e.target.value })
                      }
                    >
                      <option value="">Pilih pelaksana</option>
                      {data.pics
                        .filter((x) => x.active)
                        .map((x) => (
                          <option key={x.code} value={x.name}>
                            {x.code} — {x.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Tarif cutting per unit
                    <input
                      required
                      type="text"
                      inputMode="numeric"
                      value={rupiahInput(form.cuttingRate)}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          cuttingRate: parseRupiahInput(e.target.value),
                        })
                      }
                      placeholder="Contoh: 3000"
                    />
                  </label>
                </>
              )}
              {active === "Sablon/Bordir" && (
                <>
                  <label>
                    Tarif per unit
                    <input disabled={decorationFinancialLocked} type="text" inputMode="numeric" value={rupiahInput(form.decorationRate)} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setForm({ ...form, decorationRate: parseRupiahInput(event.target.value) })} />
                  </label>
                  <label>
                    Jumlah sudah selesai
                    <input type="number" min={0} max={sum(matrix)} value={form.decorationCompleted} onChange={(event) => setForm({ ...form, decorationCompleted: Math.max(0, Number(event.target.value) || 0) })} />
                  </label>
                  <label>
                    Pembayaran awal
                    <input disabled={decorationFinancialLocked} type="text" inputMode="numeric" value={rupiahInput(form.paidAmount)} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setForm({ ...form, paidAmount: parseRupiahInput(event.target.value) })} />
                  </label>
                </>
              )}
              {active === "Pengiriman Vendor" && (
                <label>
                  Tarif jahit per unit
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    value={rupiahInput(form.sewingRate)}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sewingRate: parseRupiahInput(e.target.value),
                      })
                    }
                    placeholder="Contoh: 45000"
                  />
                  <small>Tarif ini tersimpan untuk pengiriman ini.</small>
                </label>
              )}
            </div>
            {active === "Pengiriman Vendor" && (
              <div className="shipment-bundle-picker">
                <header>
                  <div>
                    <b>Pilih bundle dalam surat jalan ini</b>
                    <small>
                      Bundle harus dari model yang sama dan akan dikirim ke satu
                      vendor.
                    </small>
                  </div>
                  <strong>
                    {selectedBundleIds.length} bundle · {sum(matrix)} unit
                  </strong>
                </header>
                <div>
                  {(data.records.Bundle ?? [])
                    .filter(
                      (x) =>
                        sourceAvailable("Pengiriman Vendor", x) &&
                        (selectedBundleIds.length === 0 ||
                          x.modelCode === form.code),
                    )
                    .map((bundle) => (
                      <label key={bundle.id}>
                        <input
                          type="checkbox"
                          checked={selectedBundleIds.includes(bundle.id)}
                          onChange={() => toggleShipmentBundle(bundle.id)}
                        />
                        <span>
                          <b>Bundle {shortBundleCode(bundle.id)}</b>
                          <small>
                            {bundle.id}
                            <br />
                            Batch {bundle.poId || "—"} · Cutting C
                            {String(bundle.batchNo ?? 1).padStart(2, "0")}
                          </small>
                        </span>
                        <strong>{bundle.total} unit</strong>
                      </label>
                    ))}
                </div>
              </div>
            )}
            {active === "Bundle" && form.sourceId && (
              <div className="bundle-auto">
                <div>
                  <small>SISA CUTTING SAAT INI</small>
                  <b>
                    {sum(
                      remainingFor(
                        (data.records.Cutting ?? []).find(
                          (x) => x.id === form.sourceId,
                        )!,
                      ),
                    )}{" "}
                    unit
                  </b>
                </div>
                <label>
                  Jumlah bundle ini
                  <input
                    min="1"
                    type="number"
                    value={bundleQty}
                    onChange={(e) => setBundleQty(Number(e.target.value))}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const source = (data.records.Cutting ?? []).find(
                      (x) => x.id === form.sourceId,
                    );
                    if (source)
                      setMatrix(autoBundle(remainingFor(source), bundleQty));
                  }}
                >
                  ⚡ Kelompokkan otomatis
                </button>
              </div>
            )}
            {active === "Penerimaan Gudang" &&
              form.sourceId &&
              (() => {
                const shipment = (data.records["Pengiriman Vendor"] ?? []).find(
                  (x) => x.id === form.sourceId,
                )!;
                const available = sum(remainingAtVendor(shipment));
                return (
                  <div className="receipt-summary">
                    <div>
                      <small>SURAT JALAN PENGIRIMAN</small>
                      <b>{shipment.deliveryNoteId || "Belum tercatat"}</b>
                    </div>
                    <div>
                      <small>VENDOR</small>
                      <b>{shipment.destination}</b>
                    </div>
                    <div>
                      <small>DIKIRIM</small>
                      <b>{shipment.total} unit</b>
                    </div>
                    <div>
                      <small>DITERIMA KALI INI</small>
                      <b>{sum(matrix)} unit</b>
                    </div>
                    <div>
                      <small>SISA SETELAH INI</small>
                      <b>{Math.max(0, available - sum(matrix))} unit</b>
                    </div>
                  </div>
                );
              })()}
            {active === "Penerimaan Gudang" && form.sourceId && (
              <button
                type="button"
                className="quick-fill"
                onClick={() => {
                  const shipment = (
                    data.records["Pengiriman Vendor"] ?? []
                  ).find((x) => x.id === form.sourceId);
                  if (!shipment) return;
                  const available = remainingAtVendor(shipment);
                  setMatrix(available);
                  if (vendorForShipment(shipment)?.qcMode === "vendor")
                    setQcDetails(
                      available.map((x) => ({
                        ...x,
                        passed: x.qty,
                        repair: 0,
                        reject: 0,
                        note: "",
                      })),
                    );
                }}
              >
                ✓ Isi seluruh sisa setoran
              </button>
            )}
            {active === "Penerimaan Gudang" && form.sourceId && (() => {
              const shipment = (data.records["Pengiriman Vendor"] ?? []).find(
                  (x) => x.id === form.sourceId,
                ),
                rate = shipment?.sewingRate ?? 0,
                bill = sum(matrix) * rate,
                status = paymentStatus(bill, form.paidAmount);
              return (
                <div className="receipt-payment-entry">
                  <header>
                    <div>
                      <small>PEMBAYARAN VENDOR</small>
                      <b>{status}</b>
                    </div>
                    <strong>{rupiah(bill)}</strong>
                  </header>
                  <div className="payment-totals">
                    <p>
                      <span>Tarif jahit</span>
                      <b>{rupiah(rate)} / unit</b>
                    </p>
                    <label>
                      Pembayaran pertama (opsional)
                      <input
                        type="text"
                        inputMode="numeric"
                        value={rupiahInput(form.paidAmount)}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            paidAmount: parseRupiahInput(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Tanggal pembayaran
                      <input
                        type="date"
                        required={form.paidAmount > 0}
                        disabled={form.paidAmount <= 0}
                        value={form.paymentDate}
                        onChange={(e) =>
                          setForm({ ...form, paymentDate: e.target.value })
                        }
                      />
                    </label>
                    {form.paidAmount > 0 && (
                      <>
                        <label>
                          PIC finance
                          <select
                            required
                            value={form.paymentPIC}
                            onChange={(e) =>
                              setForm({ ...form, paymentPIC: e.target.value })
                            }
                          >
                            <option value="">Pilih PIC</option>
                            {data.pics
                              .filter((pic) => pic.active)
                              .map((pic) => (
                                <option key={pic.code} value={pic.name}>
                                  {pic.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Catatan pembayaran
                          <input
                            value={form.paymentNote}
                            placeholder="Contoh: DP pertama"
                            onChange={(e) =>
                              setForm({ ...form, paymentNote: e.target.value })
                            }
                          />
                        </label>
                      </>
                    )}
                  </div>
                  <footer>
                    Sisa pembayaran <b>{rupiah(Math.max(0, bill - form.paidAmount))}</b>
                  </footer>
                </div>
              );
            })()}
            {active === "Penerimaan Gudang" &&
              form.sourceId &&
              (() => {
                const shipment = (data.records["Pengiriman Vendor"] ?? []).find(
                  (x) => x.id === form.sourceId,
                );
                const vendor = vendorForShipment(shipment);
                return vendor?.qcMode === "vendor" ? (
                  <div className="dependency qc-vendor-notice">
                    <b>✓ Sudah diperiksa di lokasi vendor</b>
                    <span>
                      Masukkan hasil pemeriksaan {vendor.qcOfficer}. Unit lolos
                      otomatis masuk stok jadi; repair dan reject masuk
                      pemantauan tindak lanjut. Kiriman ini tidak masuk antrean
                      QC internal.
                    </span>
                  </div>
                ) : null;
              })()}
            {active === "Pengiriman QC" && (
              <div className="qc-destination">
                <label>
                  Tujuan QC dari master
                  <select
                    required
                    value={form.destination}
                    onChange={(e) => {
                      const loc = data.qcLocations.find(
                        (x) => x.location === e.target.value,
                      );
                      setForm({
                        ...form,
                        destination: e.target.value,
                        recipient: loc?.recipient ?? "",
                      });
                    }}
                  >
                    <option value="">Pilih tujuan QC</option>
                    {data.qcLocations
                      .filter((x) => x.active)
                      .map((x) => (
                        <option key={x.code} value={x.location}>
                          {x.code} — {x.location}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Penerima
                  <input
                    required
                    readOnly
                    value={form.recipient}
                    placeholder="Terisi otomatis"
                  />
                </label>
                <div>
                  <small>CATATAN PENGIRIMAN</small>
                  <span>
                    Isi pada kolom catatan umum di bawah; catatan akan tersimpan
                    dan tercetak di surat jalan.
                  </span>
                </div>
              </div>
            )}
            {active === "Quality Control" || active === "QC Ulang" ? (
              <QCDetailTable values={qcDetails} onChange={setQcDetails} />
            ) : (
              <>
                <VariantMatrix values={matrix} onChange={updateQty} />
                {active === "Penerimaan Gudang" &&
                  form.sourceId &&
                  vendorForShipment(
                    (data.records["Pengiriman Vendor"] ?? []).find(
                      (x) => x.id === form.sourceId,
                    ),
                  )?.qcMode === "vendor" && (
                    <QCDetailTable values={qcDetails} onChange={setQcDetails} />
                  )}
              </>
            )}
            <div className="matrix-total">
              <span>Total proses</span>
              <b>{sum(matrix)} unit</b>
            </div>
            <label className="note-label">
              Catatan umum
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
            <div className="form-actions">
              <button type="button" onClick={() => setModal(null)}>
                Batal
              </button>
              <button
                className="primary"
                disabled={saving || sum(matrix) <= 0}
                aria-busy={saving}
              >
                {saving
                  ? "Menyimpan..."
                  : [
                        "Pengiriman Vendor",
                        "Penerimaan Gudang",
                        "Pengiriman QC",
                      ].includes(active)
                    ? "Simpan & buat surat jalan"
                    : editingDecorationRecord ? "Simpan perubahan" : "Simpan proses"}
              </button>
            </div>
          </form>
        </div>
      )}

      {modal === "pic" && (
        <div className="overlay">
          <form className="form-modal" onSubmit={addPIC}>
            <button
              className="close"
              type="button"
              onClick={() => {
                setModal(null);
                setEditingPICCode(null);
              }}
            >
              ×
            </button>
            <p className="overline">MASTER DATA</p>
            <h2>{editingPICCode ? "Edit PIC" : "Tambah PIC"}</h2>
            <div className="field-grid">
              <label>
                Nama PIC
                <input
                  required
                  placeholder="Nama penanggung jawab"
                  value={picForm.name}
                  onChange={(e) =>
                    setPicForm({ ...picForm, name: e.target.value })
                  }
                />
              </label>
              <label>
                Jabatan / tugas
                <input
                  placeholder="Contoh: PIC Produksi"
                  value={picForm.role}
                  onChange={(e) =>
                    setPicForm({ ...picForm, role: e.target.value })
                  }
                />
              </label>
              <label className="full">
                Nomor telepon
                <input
                  placeholder="08..."
                  value={picForm.phone}
                  onChange={(e) =>
                    setPicForm({ ...picForm, phone: e.target.value })
                  }
                />
              </label>
              <label>
                Bank pembayaran
                <input placeholder="Contoh: BCA" value={picForm.bankName} onChange={(e) => setPicForm({ ...picForm, bankName: e.target.value })} />
              </label>
              <label>
                Nomor rekening
                <input inputMode="numeric" placeholder="Nomor rekening" value={picForm.accountNumber} onChange={(e) => setPicForm({ ...picForm, accountNumber: e.target.value.replace(/\D/g, "") })} />
              </label>
              <label className="full">
                Nama pemilik rekening
                <input placeholder="Nama sesuai rekening" value={picForm.accountHolder} onChange={(e) => setPicForm({ ...picForm, accountHolder: e.target.value })} />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setModal(null)}>
                Batal
              </button>
              <button className="primary">Simpan PIC</button>
            </div>
          </form>
        </div>
      )}

      {modal === "qcLocation" && (
        <div className="overlay">
          <form className="form-modal" onSubmit={addQCLocation}>
            <button
              className="close"
              type="button"
              onClick={() => setModal(null)}
            >
              ×
            </button>
            <p className="overline">MASTER DATA</p>
            <h2>Tambah Tujuan & Penerima QC</h2>
            <div className="field-grid">
              <label>
                Nama lokasi
                <input
                  required
                  placeholder="Contoh: Internal"
                  value={qcLocationForm.location}
                  onChange={(e) =>
                    setQcLocationForm({
                      ...qcLocationForm,
                      location: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Nama penerima
                <input
                  required
                  placeholder="Nama orang / kelompok penerima"
                  value={qcLocationForm.recipient}
                  onChange={(e) =>
                    setQcLocationForm({
                      ...qcLocationForm,
                      recipient: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Nomor telepon
                <input
                  placeholder="08..."
                  value={qcLocationForm.phone}
                  onChange={(e) =>
                    setQcLocationForm({
                      ...qcLocationForm,
                      phone: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Alamat lokasi
                <input
                  placeholder="Alamat tujuan QC"
                  value={qcLocationForm.address}
                  onChange={(e) =>
                    setQcLocationForm({
                      ...qcLocationForm,
                      address: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Tarif QC per unit
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={rupiahInput(qcLocationForm.rate)}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setQcLocationForm({
                      ...qcLocationForm,
                      rate: parseRupiahInput(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Bank pembayaran
                <input placeholder="Contoh: BCA" value={qcLocationForm.bankName} onChange={(e) => setQcLocationForm({ ...qcLocationForm, bankName: e.target.value })} />
              </label>
              <label>
                Nomor rekening
                <input inputMode="numeric" placeholder="Nomor rekening penerima QC" value={qcLocationForm.accountNumber} onChange={(e) => setQcLocationForm({ ...qcLocationForm, accountNumber: e.target.value.replace(/\D/g, "") })} />
              </label>
              <label className="full">
                Nama pemilik rekening
                <input placeholder="Nama sesuai rekening" value={qcLocationForm.accountHolder} onChange={(e) => setQcLocationForm({ ...qcLocationForm, accountHolder: e.target.value })} />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setModal(null)}>
                Batal
              </button>
              <button className="primary">Simpan tujuan</button>
            </div>
          </form>
        </div>
      )}
      {paymentReceipt && (() => {
        const shipment = (data.records["Pengiriman Vendor"] ?? []).find(
            (x) => x.id === paymentReceipt.sourceId,
          ),
          rate =
            paymentKind === "cutting"
              ? paymentReceipt.cuttingRate ?? 0
              : paymentReceipt.sewingRate ?? shipment?.sewingRate ?? 0,
          bill = paymentReceipt.total * rate,
          previouslyPaid = paidForReceipt(paymentReceipt),
          remainingBefore = Math.max(0, bill - previouslyPaid),
          paidAfter = previouslyPaid + paymentAmount,
          status = paymentStatus(bill, paidAfter);
        return (
          <div className="overlay">
            <form
              className="form-modal payment-modal"
              onSubmit={updateReceiptPayment}
            >
              <button
                className="close"
                type="button"
                onClick={() => setPaymentReceipt(null)}
              >
                ×
              </button>
              <p className="overline">
                {paymentKind === "cutting" ? "PEMBAYARAN CUTTING" : "PEMBAYARAN VENDOR"}
              </p>
              <h2>
                Catat Pembayaran {paymentKind === "cutting" ? "Cutting" : "Vendor"}
              </h2>
              <div className="payment-modal-summary">
                <p><span>Penerimaan</span><b>{paymentReceipt.id}</b></p>
                <p>
                  <span>{paymentKind === "cutting" ? "Pelaksana" : "Vendor"}</span>
                  <b>{paymentKind === "cutting" ? paymentReceipt.officer || "—" : shipment?.destination || "—"}</b>
                </p>
                <p><span>Model</span><b>{paymentReceipt.modelName}</b></p>
                <p><span>Setoran</span><b>{paymentReceipt.total} unit</b></p>
                <p><span>Tarif</span><b>{rupiah(rate)} / unit</b></p>
                <p><span>Total tagihan</span><b>{rupiah(bill)}</b></p>
                <p><span>Sudah dibayar</span><b>{rupiah(previouslyPaid)}</b></p>
                <p><span>Sisa sebelum bayar</span><b>{rupiah(remainingBefore)}</b></p>
              </div>
              <div className="field-grid">
                <label>
                  Nominal pembayaran kali ini
                  <input
                    autoFocus
                    required
                    type="text"
                    inputMode="numeric"
                    value={rupiahInput(paymentAmount)}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) =>
                      setPaymentAmount(parseRupiahInput(e.target.value))
                    }
                  />
                </label>
                <label>
                  Tanggal pembayaran
                  <input
                    type="date"
                    required={paymentAmount > 0}
                    disabled={paymentAmount <= 0}
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </label>
                <label>
                  PIC finance
                  <select
                    required
                    value={paymentPIC}
                    onChange={(e) => setPaymentPIC(e.target.value)}
                  >
                    <option value="">Pilih PIC</option>
                    {data.pics
                      .filter((pic) => pic.active)
                      .map((pic) => (
                        <option key={pic.code} value={pic.name}>
                          {pic.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="full">
                  Catatan pembayaran
                  <input
                    value={paymentNote}
                    placeholder="Contoh: DP kedua / pelunasan"
                    onChange={(e) => setPaymentNote(e.target.value)}
                  />
                </label>
              </div>
              <div className="payment-modal-status">
                <p><span>Status setelah pembayaran</span><b>{status}</b></p>
                <p><span>Sisa setelah pembayaran</span><strong>{rupiah(Math.max(0, bill - paidAfter))}</strong></p>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setPaymentReceipt(null)}>
                  Batal
                </button>
                <button className="primary">Simpan pembayaran</button>
              </div>
            </form>
          </div>
        );
      })()}
      {cuttingRateRecord && (
        <div className="overlay">
          <form
            className="form-modal payment-modal"
            onSubmit={updateCuttingRate}
          >
            <button
              className="close"
              type="button"
              onClick={() => setCuttingRateRecord(null)}
            >
              ×
            </button>
            <p className="overline">TARIF CUTTING</p>
            <h2>Atur Tarif Cutting</h2>
            <div className="payment-modal-summary">
              <p><span>Kode Cutting</span><b>{cuttingRateRecord.id}</b></p>
              <p><span>Referensi produksi</span><b>{cuttingRateRecord.poId || cuttingRateRecord.id}</b></p>
              <p><span>Model</span><b>{cuttingRateRecord.modelName}</b></p>
              <p><span>Jumlah</span><b>{cuttingRateRecord.total} unit</b></p>
            </div>
            <div className="field-grid">
              <label className="full">
                Tarif cutting per unit
                <input
                  autoFocus
                  required
                  type="text"
                  inputMode="numeric"
                  value={rupiahInput(cuttingRateInput)}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setCuttingRateInput(parseRupiahInput(e.target.value))
                  }
                />
              </label>
            </div>
            <div className="payment-modal-status">
              <p><span>Total tagihan</span><strong>{rupiah(cuttingRateRecord.total * cuttingRateInput)}</strong></p>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setCuttingRateRecord(null)}>
                Batal
              </button>
              <button className="primary">Simpan tarif</button>
            </div>
          </form>
        </div>
      )}
      {vendorRateRecord && (
        <div className="overlay">
          <form className="form-modal payment-modal" onSubmit={updateVendorRate}>
            <button className="close" type="button" onClick={() => setVendorRateRecord(null)}>
              ×
            </button>
            <p className="overline">TARIF VENDOR JAHIT</p>
            <h2>Lengkapi Tarif Jahit</h2>
            <div className="payment-modal-summary">
              <p><span>Penerimaan</span><b>{vendorRateRecord.id}</b></p>
              <p><span>Referensi produksi</span><b>{vendorRateRecord.poId || vendorRateRecord.sourceId}</b></p>
              <p><span>Model</span><b>{vendorRateRecord.modelName}</b></p>
              <p><span>Jumlah setoran</span><b>{vendorRateRecord.total} unit</b></p>
            </div>
            <div className="field-grid">
              <label className="full">
                Tarif jahit per unit
                <input
                  autoFocus
                  required
                  type="text"
                  inputMode="numeric"
                  value={rupiahInput(vendorRateInput)}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setVendorRateInput(parseRupiahInput(e.target.value))}
                />
              </label>
            </div>
            <div className="payment-modal-status">
              <p><span>Total tagihan setoran</span><strong>{rupiah(vendorRateRecord.total * vendorRateInput)}</strong></p>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setVendorRateRecord(null)}>Batal</button>
              <button className="primary">Simpan tarif</button>
            </div>
          </form>
        </div>
      )}
      {qcRateRecord && (
        <div className="overlay">
          <form className="form-modal payment-modal" onSubmit={updateQCRate}>
            <button className="close" type="button" onClick={() => setQCRateRecord(null)}>×</button>
            <p className="overline">TARIF QUALITY CONTROL</p>
            <h2>Lengkapi Tarif QC</h2>
            <div className="payment-modal-summary">
              <p><span>Pemeriksaan</span><b>{qcRateRecord.id}</b></p>
              <p><span>Referensi produksi</span><b>{qcRateRecord.poId || qcRateRecord.sourceId}</b></p>
              <p><span>Model</span><b>{qcRateRecord.modelName}</b></p>
              <p><span>Jumlah diperiksa</span><b>{qcRateRecord.total} unit</b></p>
            </div>
            <div className="field-grid">
              <label className="full">
                Tarif QC per unit
                <input
                  autoFocus
                  required
                  type="text"
                  inputMode="numeric"
                  value={rupiahInput(qcRateInput)}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setQCRateInput(parseRupiahInput(e.target.value))}
                />
              </label>
            </div>
            <div className="payment-modal-status">
              <p><span>Total tagihan pemeriksaan</span><strong>{rupiah(qcRateRecord.total * qcRateInput)}</strong></p>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setQCRateRecord(null)}>Batal</button>
              <button className="primary">Simpan tarif</button>
            </div>
          </form>
        </div>
      )}
      {weeklyDraft && (() => {
        const lines = weeklyDraft.rows.map((row) => {
            const rate = weeklyDraft.kind === "cutting"
              ? row.cuttingRate ?? 0
              : weeklyDraft.kind === "qc"
                ? row.qcRate ?? 0
                : weeklyDraft.kind === "decoration"
                  ? row.decorationRate ?? 0
                  : row.sewingRate ?? 0;
            return { row, rate, amount: row.total * rate };
          }),
          totalUnits = lines.reduce((total, line) => total + line.row.total, 0),
          totalAmount = lines.reduce((total, line) => total + line.amount, 0),
          paidBefore = weeklyDraft.kind === "vendor" || weeklyDraft.kind === "decoration"
            ? weeklyDraft.rows.reduce(
                (total, receipt) => total + paidForReceipt(receipt),
                0,
              )
            : weeklyPaidAmount(
                data.weeklyPayments,
                weeklyDraft.kind,
                weeklyDraft.payee,
                weeklyDraft.periodStart,
                weeklyDraft.periodEnd,
              ),
          remainingBefore = Math.max(0, totalAmount - paidBefore),
          remainingAfter = Math.max(0, remainingBefore - weeklyAmount),
          statusBefore = paidBefore <= 0 ? "Belum dibayar" : remainingBefore > 0 ? "DP sebagian" : "Lunas",
          paidAfter = paidBefore + weeklyAmount,
          statusAfter = paidAfter <= 0 ? "Belum dibayar" : remainingAfter > 0 ? "DP sebagian" : "Lunas";
        return (
          <div className="overlay">
            <form className="form-modal weekly-payment-modal" onSubmit={saveWeeklyPayment}>
              <button className="close" type="button" onClick={() => setWeeklyDraft(null)}>×</button>
              <p className="overline">REKAP PEMBAYARAN MINGGUAN</p>
              <h2>{weeklyDraft.kind === "cutting" ? "Pembayaran Cutting" : weeklyDraft.kind === "qc" ? "Pembayaran QC" : weeklyDraft.kind === "decoration" ? "Pembayaran Vendor Sablon/Bordir" : "Pembayaran Vendor Jahit"}</h2>
              <div className="payment-modal-summary">
                <p><span>Penerima</span><b>{weeklyDraft.payee}</b></p>
                <p><span>Periode</span><b>{weeklyDraft.periodStart} – {weeklyDraft.periodEnd}</b></p>
                <p><span>Total pekerjaan</span><b>{lines.length} transaksi</b></p>
                <p><span>Total unit</span><b>{totalUnits} unit</b></p>
              </div>
              <div className="weekly-payment-lines modal-lines">
                {lines.map(({ row, rate, amount }) => (
                  <p key={row.id}><span><b>{row.id}</b><small>{row.modelName} · {row.total} unit × {rupiah(rate)}</small></span><strong>{rupiah(amount)}</strong></p>
                ))}
              </div>
              <div className="payment-modal-status">
                <p><span>Total tagihan</span><b>{rupiah(totalAmount)}</b></p>
                <p><span>Sudah dibayar</span><b>{rupiah(paidBefore)}</b></p>
                <p><span>Sisa sebelum bayar</span><strong>{rupiah(remainingBefore)}</strong></p>
                <p><span>Status saat ini</span><b>{statusBefore}</b></p>
                <p><span>Total setelah bayar</span><b>{rupiah(paidAfter)}</b></p>
                <p><span>Status setelah bayar</span><b>{statusAfter}</b></p>
              </div>
              <div className="field-grid">
                <label className="full">
                  Nominal pembayaran kali ini
                  <input required type="text" inputMode="numeric" value={rupiahInput(weeklyAmount)} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setWeeklyAmount(parseRupiahInput(e.target.value))} />
                  <small>Sisa setelah pembayaran: {rupiah(remainingAfter)}</small>
                </label>
                <label>
                  Tanggal pembayaran
                  <input required type="date" value={weeklyPaymentDate} onChange={(e) => setWeeklyPaymentDate(e.target.value)} />
                </label>
                <label>
                  Finance penerima pengajuan
                  <select required value={weeklyPIC} onChange={(e) => setWeeklyPIC(e.target.value)}>
                    <option value="">Pilih Finance</option>
                    {data.pics.filter((pic) => pic.active).map((pic) => <option key={pic.code} value={pic.name}>{pic.name}</option>)}
                  </select>
                </label>
                <label>
                  PIC pengaju
                  <select required value={weeklyRequester} onChange={(e) => setWeeklyRequester(e.target.value)}>
                    <option value="">Pilih pengaju</option>
                    {data.pics.filter((pic) => pic.active).map((pic) => <option key={pic.code} value={pic.name}>{pic.name}</option>)}
                  </select>
                </label>
                <label className="full">
                  Catatan
                  <input value={weeklyNote} onChange={(e) => setWeeklyNote(e.target.value)} placeholder="Contoh: Pembayaran minggu ke-2" />
                </label>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setWeeklyDraft(null)}>Batal</button>
                <button className="primary">Simpan pembayaran</button>
              </div>
            </form>
          </div>
        );
      })()}
      {print && <PrintNote note={print} close={() => setPrint(null)} />}
      {bundlePrint && (
        <BundleLabel
          bundle={bundlePrint}
          close={() => setBundlePrint(null)}
        />
      )}
      {paymentPrint && (
        <PaymentReceiptPrint
          receipt={paymentPrint.receipt}
          payment={paymentPrint.payment}
          kind={paymentPrint.kind}
          shipment={(data.records["Pengiriman Vendor"] ?? []).find(
            (item) => item.id === paymentPrint.receipt.sourceId,
          )}
          close={() => setPaymentPrint(null)}
        />
      )}
      {weeklyPrint && (
        <WeeklyPaymentPrint
          payment={weeklyPrint}
          close={() => setWeeklyPrint(null)}
        />
      )}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function VariantMatrix({
  values,
  onChange,
}: {
  values: Variant[];
  onChange: (c: string, s: string, v: number) => void;
}) {
  const colors = [...new Set(values.map((x) => x.color))];
  const sizes = [...new Set(values.map((x) => x.size))];
  return (
    <div className="variant-box">
      <div className="variant-head">
        <div>
          <b>Rincian warna × ukuran</b>
          <small>
            Mengikuti Master Jaket dan dapat disesuaikan pada setiap proses.
          </small>
        </div>
        <span>{sizes.length} ukuran</span>
      </div>
      <div className="scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th>WARNA</th>
              {sizes.map((s) => (
                <th key={s}>{s}</th>
              ))}
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {colors.map((c) => (
              <tr key={c}>
                <td>
                  <b>{c}</b>
                </td>
                {sizes.map((s) => {
                  const v = values.find((x) => x.color === c && x.size === s);
                  return (
                    <td key={s}>
                      <input
                        aria-label={`${c} ${s}`}
                        type="number"
                        min="0"
                        value={v?.qty ?? 0}
                        onChange={(e) => onChange(c, s, Number(e.target.value))}
                      />
                    </td>
                  );
                })}
                <td>
                  <b>{sum(values.filter((x) => x.color === c))}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function QCDetailTable({
  values,
  onChange,
}: {
  values: QCDetail[];
  onChange: (x: QCDetail[]) => void;
}) {
  const update = (
    i: number,
    key: "passed" | "reject" | "repair" | "note",
    value: number | string,
  ) =>
    onChange(
      values.map((x, n) =>
        n === i
          ? {
              ...x,
              [key]:
                typeof value === "number" ? Math.max(0, value || 0) : value,
            }
          : x,
      ),
    );
  const total = (key: "passed" | "reject" | "repair") =>
    values.reduce((n, x) => n + x[key], 0);
  return (
    <div className="qc-detail">
      <header>
        <div>
          <b>Hasil QC per warna × ukuran</b>
          <small>Repair atau reject wajib disertai catatan kerusakan.</small>
        </div>
        <div className="qc-quick-actions">
          <span>{values.length} varian</span>
          <button
            type="button"
            onClick={() =>
              onChange(
                values.map((x) => ({
                  ...x,
                  passed: x.qty,
                  repair: 0,
                  reject: 0,
                  note: "",
                })),
              )
            }
          >
            ✓ Lolos semua
          </button>
        </div>
      </header>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>WARNA</th>
              <th>SIZE</th>
              <th>DIPERIKSA</th>
              <th>LOLOS</th>
              <th>REPAIR</th>
              <th>REJECT</th>
              <th>CATATAN KERUSAKAN</th>
              <th>CEK</th>
            </tr>
          </thead>
          <tbody>
            {values.map((x, i) => {
              const valid = x.passed + x.reject + x.repair === x.qty;
              return (
                <tr key={`${x.color}-${x.size}`}>
                  <td>
                    <b>{x.color}</b>
                  </td>
                  <td>
                    <b>{x.size}</b>
                  </td>
                  <td>
                    <b>{x.qty}</b>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={x.passed}
                      onChange={(e) =>
                        update(i, "passed", Number(e.target.value))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={x.repair}
                      onChange={(e) =>
                        update(i, "repair", Number(e.target.value))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={x.reject}
                      onChange={(e) =>
                        update(i, "reject", Number(e.target.value))
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="damage-note"
                      placeholder={
                        x.repair || x.reject
                          ? "Wajib: jenis kerusakan"
                          : "Opsional"
                      }
                      value={x.note}
                      onChange={(e) => update(i, "note", e.target.value)}
                    />
                  </td>
                  <td>
                    <span className={valid ? "qc-ok" : "qc-bad"}>
                      {valid
                        ? "Sesuai"
                        : `${x.passed + x.repair + x.reject}/${x.qty}`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>
                <b>TOTAL HASIL QC</b>
              </td>
              <td>
                <b>{total("passed")}</b>
              </td>
              <td>
                <b>{total("repair")}</b>
              </td>
              <td>
                <b>{total("reject")}</b>
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
function QCSummary({
  rows,
  allRecords,
}: {
  rows: RecordRow[];
  allRecords: Record<string, RecordRow[]>;
}) {
  const total = rows.reduce((n, x) => n + x.total, 0),
    passed = rows.reduce((n, x) => n + (x.qcPassed ?? 0), 0),
    repair = rows.reduce((n, x) => n + (x.qcRepair ?? 0), 0),
    reject = rows.reduce((n, x) => n + (x.qcReject ?? 0), 0);
  const trace = (q: RecordRow) => {
    const sent = (allRecords["Pengiriman QC"] ?? []).find(
        (x) => x.id === q.sourceId,
      ),
      receipt = (allRecords["Penerimaan Gudang"] ?? []).find(
        (x) => x.id === sent?.sourceId,
      ),
      vendor = (allRecords["Pengiriman Vendor"] ?? []).find(
        (x) => x.id === receipt?.sourceId,
      );
    return {
      vendor: q.originVendor || vendor?.destination || "Vendor tidak ditemukan",
      receipt: receipt?.id || "—",
    };
  };
  return (
    <>
      <div className="qc-fixed-summary">
        {[
          ["Sudah diperiksa", total, "total"],
          ["Lolos QC", passed, "pass"],
          ["Repair", repair, "repair"],
          ["Reject", reject, "reject"],
        ].map((x) => (
          <article className={String(x[2])} key={String(x[0])}>
            <span>{x[0]}</span>
            <b>{x[1]}</b>
            <small>unit</small>
          </article>
        ))}
      </div>
      {rows.length > 0 && (
        <details className="qc-history">
          <summary>
            <span>✓</span>
            <b>{rows.length} pemeriksaan QC selesai</b>
            <small>
              Disembunyikan agar dashboard tetap ringkas · klik untuk melihat
            </small>
          </summary>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>KODE QC</th>
                  <th>TANGGAL</th>
                  <th>VENDOR ASAL</th>
                  <th>MODEL</th>
                  <th>HASIL WARNA & SIZE</th>
                  <th>LOLOS</th>
                  <th>REPAIR</th>
                  <th>REJECT</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => {
                  const t = trace(q);
                  return (
                    <tr key={q.id}>
                      <td>
                        <b>{q.id}</b>
                        <small>{q.sourceId}</small>
                      </td>
                      <td>{q.date}</td>
                      <td>
                        <b>{t.vendor}</b>
                        <small>Penerimaan: {t.receipt}</small>
                      </td>
                      <td>
                        <b>{q.modelName}</b>
                        <small>{q.modelCode}</small>
                      </td>
                      <td>
                        <small>
                          {q.qcDetails
                            ?.map(
                              (x) =>
                                `${x.color} ${x.size}: L${x.passed}/P${x.repair}/R${x.reject}${x.note ? ` · ${x.note}` : ""}`,
                            )
                            .join(" | ") || "Data QC lama"}
                        </small>
                      </td>
                      <td>
                        <b>{q.qcPassed ?? 0}</b>
                      </td>
                      <td>
                        <b>{q.qcRepair ?? 0}</b>
                      </td>
                      <td>
                        <b>{q.qcReject ?? 0}</b>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </>
  );
}
function reconcileData(data: AppData) {
  const issues: string[] = [],
    records = data.records,
    links: [string, string][] = [
      ["Order Produksi", "Cutting"],
      ["Cutting", "Bundle"],
      ["Bundle", "Pengiriman Vendor"],
      ["Pengiriman Vendor", "Penerimaan Gudang"],
      ["Penerimaan Gudang", "Pengiriman QC"],
      ["Rework", "Penerimaan Rework"],
      ["Penerimaan Rework", "QC Ulang"],
    ];
  for (const [stage, rows] of Object.entries(records))
    for (const row of rows) {
      if (row.total !== sum(row.variants))
        issues.push(
          `${row.id}: total ${row.total} ≠ rincian ${sum(row.variants)}`,
        );
      if (
        (stage === "Quality Control" || stage === "QC Ulang") &&
        (row.qcPassed ?? 0) + (row.qcRepair ?? 0) + (row.qcReject ?? 0) !==
          row.total
      )
        issues.push(`${row.id}: hasil QC tidak sama dengan jumlah diperiksa`);
    }
  for (const [parentStage, childStage] of links) {
    for (const child of records[childStage] ?? []) {
      if (childStage === "Cutting" && !child.sourceId) continue;
      const parent = (records[parentStage] ?? []).find(
        (x) => x.id === child.sourceId,
      );
      if (!parent) {
        issues.push(`${child.id}: sumber ${child.sourceId} tidak ditemukan`);
        continue;
      }
      const siblings = (records[childStage] ?? [])
        .filter((x) => x.sourceId === parent.id)
        .flatMap((x) => x.variants);
      for (const v of siblings) {
        const allocated = siblings
            .filter((x) => x.color === v.color && x.size === v.size)
            .reduce((n, x) => n + x.qty, 0),
          available =
            parent.variants.find(
              (x) => x.color === v.color && x.size === v.size,
            )?.qty ?? 0;
        if (allocated > available) {
          issues.push(
            `${parent.id}: alokasi ${v.color} ${v.size} melebihi sumber`,
          );
          break;
        }
      }
    }
  }
  for (const child of records["Quality Control"] ?? []) {
    const parentStage =
      child.qcMode === "vendor" ? "Penerimaan Gudang" : "Pengiriman QC";
    if (!(records[parentStage] ?? []).some((x) => x.id === child.sourceId))
      issues.push(`${child.id}: sumber QC ${child.sourceId} tidak ditemukan`);
  }
  for (const child of records["QC Ulang"] ?? [])
    if (
      !(records["Penerimaan Rework"] ?? []).some((x) => x.id === child.sourceId)
    )
      issues.push(
        `${child.id}: sumber QC ulang ${child.sourceId} tidak ditemukan`,
      );

  const qcRows = [
    ...(records["Quality Control"] ?? []),
    ...(records["QC Ulang"] ?? []),
  ];
  for (const qc of qcRows) {
    const checks: [string, "passed" | "repair" | "reject"][] = [
      ["Stok Barang Jadi", "passed"],
      ["Rework", "repair"],
      ["Karantina Reject", "reject"],
    ];
    for (const [stage, resultKey] of checks) {
      const used = (records[stage] ?? [])
        .filter((x) => x.sourceId === qc.id)
        .flatMap((x) => x.variants);
      for (const detail of qc.qcDetails ?? []) {
        const allocated = used
          .filter((x) => x.color === detail.color && x.size === detail.size)
          .reduce((n, x) => n + x.qty, 0);
        if (allocated > detail[resultKey])
          issues.push(
            `${qc.id}: alokasi ${stage} ${detail.color} ${detail.size} melebihi hasil QC`,
          );
      }
    }
  }
  for (const stage of [
    "Sablon/Bordir",
    "Pengiriman Vendor",
    "Pengiriman QC",
    "Rework",
    "Penerimaan Rework",
  ])
    for (const row of records[stage] ?? [])
      if (
        !data.notes.some(
          (n) =>
            n.sourceId === row.id ||
            n.id === row.deliveryNoteId ||
            n.bundleIds?.includes(row.sourceId),
        )
      )
        issues.push(`${row.id}: surat jalan belum ditemukan`);
  for (const receipt of records["Penerimaan Gudang"] ?? []) {
    const shipment = (records["Pengiriman Vendor"] ?? []).find(
      (row) => row.id === receipt.sourceId,
    );
    if (!shipment)
      issues.push(`${receipt.id}: pengiriman vendor sumber tidak ditemukan`);
    else if (
      !receipt.deliveryNoteId ||
      receipt.deliveryNoteId !== shipment.deliveryNoteId ||
      !data.notes.some((note) => note.id === receipt.deliveryNoteId)
    )
      issues.push(`${receipt.id}: referensi surat jalan pengiriman tidak valid`);
  }
  return [...new Set(issues)];
}
function LegacyDashboard({
  data,
  go,
}: {
  data: AppData;
  go: (x: string) => void;
}) {
  const [breakdown, setBreakdown] = useState<string | null>(null),
    records = data.records;
  const children = (stage: string, id: string) =>
      (records[stage] ?? []).filter((x) => x.sourceId === id),
    withBalance = (rows: RecordRow[], usedStage: string) =>
      rows
        .map((row) => {
          const variants = subtractVariants(
            row.variants,
            children(usedStage, row.id).flatMap((x) => x.variants),
          );
          return { ...row, variants, total: sum(variants) };
        })
        .filter((x) => x.total > 0);
  const positions: Record<string, RecordRow[]> = {
    "Order Produksi": withBalance(records["Order Produksi"] ?? [], "Cutting"),
    Cutting: withBalance(records.Cutting ?? [], "Bundle"),
    Bundle: (records.Bundle ?? []).filter(
      (x) => children("Pengiriman Vendor", x.id).length === 0,
    ),
    "Pengiriman Vendor": withBalance(
      records["Pengiriman Vendor"] ?? [],
      "Penerimaan Gudang",
    ),
    "Penerimaan Gudang": (records["Penerimaan Gudang"] ?? []).filter(
      (x) => children("Pengiriman QC", x.id).length === 0,
    ),
    "Pengiriman QC": (records["Pengiriman QC"] ?? []).filter(
      (x) => children("Quality Control", x.id).length === 0,
    ),
    "Quality Control": records["Quality Control"] ?? [],
    Rework: records.Rework ?? [],
    "Stok Barang Jadi": records["Stok Barang Jadi"] ?? [],
  };
  const units = (key: string) =>
      positions[key].reduce((n, x) => n + x.total, 0),
    warehouse = units("Penerimaan Gudang"),
    travellingQC = units("Pengiriman QC"),
    qcRows = records["Quality Control"] ?? [],
    passed = qcRows.reduce((n, x) => n + (x.qcPassed ?? 0), 0),
    stock = units("Stok Barang Jadi"),
    passedWaiting = Math.max(0, passed - stock),
    repair = qcRows.reduce((n, x) => n + (x.qcRepair ?? 0), 0),
    reject = qcRows.reduce((n, x) => n + (x.qcReject ?? 0), 0),
    rework = units("Rework"),
    totalWip =
      [
        "Order Produksi",
        "Cutting",
        "Bundle",
        "Pengiriman Vendor",
        "Penerimaan Gudang",
        "Pengiriman QC",
      ].reduce((n, s) => n + units(s), 0) +
      passedWaiting +
      Math.max(repair, rework);
  const summary = [
    {
      key: "Order Produksi",
      label: "PO Aktif",
      value: units("Order Produksi"),
      icon: "◇",
      hint: "belum masuk cutting",
    },
    {
      key: "Cutting",
      label: "Di Area Cutting",
      value: units("Cutting"),
      icon: "✂",
      hint: "belum menjadi bundle",
    },
    {
      key: "Pengiriman Vendor",
      label: "Masih di Vendor",
      value: units("Pengiriman Vendor"),
      icon: "⌂",
      hint: "sedang dijahit",
    },
    {
      key: "Pengiriman QC",
      label: "Menunggu QC",
      value: warehouse + travellingQC,
      icon: "✓",
      hint: "gudang + antrean QC",
    },
    {
      key: "Stok Barang Jadi",
      label: "Stok Jadi",
      value: stock,
      icon: "▣",
      hint: "sudah masuk stok",
    },
  ];
  const selected = breakdown ? (positions[breakdown] ?? []) : [],
    issues = reconcileData(data);
  return (
    <>
      <div className="page-title owner-title">
        <div>
          <p className="overline">DASHBOARD OWNER · POSISI FISIK UNIT</p>
          <h1>Di mana barang berada hari ini?</h1>
          <span>
            Angka menunjukkan saldo unit yang masih berada di setiap titik
            proses, bukan total transaksi historis.
          </span>
        </div>
        <button className="primary" onClick={() => go("Order Produksi")}>
          ＋ Buat PO Produksi
        </button>
      </div>
      <section
        className={`reconcile-panel ${issues.length ? "warning" : "ok"}`}
      >
        <div>
          <i>{issues.length ? "!" : "✓"}</i>
          <span>
            <b>
              {issues.length
                ? `${issues.length} selisih perlu diperiksa`
                : "Semua data sinkron"}
            </b>
            <small>
              Total, warna–ukuran, sumber transaksi, QC, dan surat jalan sudah
              direkonsiliasi otomatis.
            </small>
          </span>
        </div>
        {issues.length > 0 && (
          <details>
            <summary>Lihat temuan rekonsiliasi</summary>
            <ul>
              {issues.slice(0, 10).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </details>
        )}
      </section>
      <div className="chain-banner">
        <b>Alur wajib</b>
        <span>
          PO → Cutting → Bundle → Vendor Jahit → Gudang → Pengiriman QC →
          Pemeriksaan QC → Stok / Rework
        </span>
      </div>
      <div className="kpis owner-kpis">
        {summary.map((x) => (
          <button key={x.key} onClick={() => setBreakdown(x.key)}>
            <i>{x.icon}</i>
            <p>{x.label}</p>
            <b>
              {x.value}
              <small> unit</small>
            </b>
            <span>{x.hint}</span>
            <em>Lihat rincian →</em>
          </button>
        ))}
      </div>
      <section className="flow-panel owner-flow">
        <div className="section-title">
          <div>
            <h2>Jejak produksi per posisi</h2>
            <p>
              Klik tahap untuk membuka rincian model, warna, ukuran, dan unit
              yang masih berada di sana.
            </p>
          </div>
          <span>
            Total WIP fisik <b>{totalWip}</b> unit
          </span>
        </div>
        <div className="workflow">
          {stages.map((s, i) => (
            <button key={s} onClick={() => setBreakdown(s)}>
              <i>{["◇", "✂", "▱", "⌂", "□", "⇢", "✓", "↻", "▣"][i]}</i>
              <b>{s.replace(" Produksi", "")}</b>
              <span>{units(s)} unit</span>
              {i < stages.length - 1 && <em>→</em>}
            </button>
          ))}
        </div>
      </section>
      <section className="qc-position">
        <div className="section-title">
          <div>
            <h2>Gudang & Quality Control</h2>
            <p>Status unit setelah setoran vendor sampai hasil akhir QC.</p>
          </div>
        </div>
        <div>
          {[
            {
              label: "Baru masuk gudang",
              value: warehouse,
              tone: "warehouse",
              sub: "belum dikirim ke QC",
            },
            {
              label: "Dalam antrean QC",
              value: travellingQC,
              tone: "queue",
              sub: "sudah dikirim, belum diperiksa",
            },
            {
              label: "Lolos belum masuk stok",
              value: passedWaiting,
              tone: "pass",
              sub: "menunggu pembukuan stok",
            },
            {
              label: "Sedang repair / rework",
              value: repair,
              tone: "repair",
              sub: `${rework} unit sudah dikirim rework`,
            },
            {
              label: "Reject / gagal",
              value: reject,
              tone: "reject",
              sub: "hasil pemeriksaan QC",
            },
          ].map((x) => (
            <article className={x.tone} key={x.label}>
              <span>{x.label}</span>
              <b>
                {x.value}
                <small> unit</small>
              </b>
              <em>{x.sub}</em>
            </article>
          ))}
        </div>
      </section>
      {breakdown && (
        <div
          className="owner-drawer-backdrop"
          onClick={() => setBreakdown(null)}
        >
          <aside className="owner-drawer" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <p className="overline">BREAKDOWN POSISI UNIT</p>
                <h2>{breakdown}</h2>
                <span>
                  {selected.length} transaksi ·{" "}
                  {selected.reduce((n, x) => n + x.total, 0)} unit fisik
                </span>
              </div>
              <button
                aria-label="Tutup rincian"
                onClick={() => setBreakdown(null)}
              >
                ×
              </button>
            </header>
            {selected.length === 0 ? (
              <div className="drawer-empty">
                <i>✓</i>
                <b>Tidak ada unit di posisi ini</b>
                <span>Saldo posisi saat ini adalah nol.</span>
              </div>
            ) : (
              <div className="drawer-list">
                {selected.map((r) => (
                  <article key={r.id}>
                    <header>
                      <div>
                        <small>
                          {r.id} · {r.date}
                        </small>
                        <h3>{r.modelName}</h3>
                        <span>
                          {r.sourceId ? `Sumber: ${r.sourceId}` : "PO produksi"}
                        </span>
                      </div>
                      <b>
                        {r.total}
                        <small> unit</small>
                      </b>
                    </header>
                    <div>
                      {r.variants.map((v) => (
                        <p key={`${v.color}-${v.size}`}>
                          <span>{v.color}</span>
                          <b>{v.size}</b>
                          <strong>{v.qty} unit</strong>
                        </p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
            <footer>
              <button
                onClick={() => {
                  setBreakdown(null);
                  go(breakdown);
                }}
              >
                Buka modul {breakdown} →
              </button>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}

function Dashboard({ data, go }: { data: AppData; go: (x: string) => void }) {
  const [breakdown, setBreakdown] = useState<string | null>(null),
    [stockDetail, setStockDetail] = useState<string | null>(null),
    [summaryDetail, setSummaryDetail] = useState<string | null>(null),
    [period, setPeriod] = useState<"today" | "week" | "month" | "custom" | "max">(
      "max",
    ),
    today = new Date().toISOString().slice(0, 10),
    [customStart, setCustomStart] = useState(`${today.slice(0, 8)}01`),
    [customEnd, setCustomEnd] = useState(today),
    records = data.records;
  const children = (stage: string, id: string) =>
    (records[stage] ?? []).filter((x) => x.sourceId === id);
  const withBalance = (rows: RecordRow[], usedStage: string) =>
    rows
      .map((row) => {
        const variants = subtractVariants(
          row.variants,
          children(usedStage, row.id).flatMap((x) => x.variants),
        );
        return { ...row, variants, total: sum(variants) };
      })
      .filter((x) => x.total > 0);
  const qcRows = [
    ...(records["Quality Control"] ?? []),
    ...(records["QC Ulang"] ?? []),
  ];
  const outcomeBalance = (
    q: RecordRow,
    key: "passed" | "repair" | "reject",
    usedStage: string,
  ) => {
    const base = (q.qcDetails ?? [])
      .map((x) => ({ color: x.color, size: x.size, qty: x[key] }))
      .filter((x) => x.qty > 0);
    const variants = subtractVariants(
      base,
      children(usedStage, q.id).flatMap((x) => x.variants),
    );
    return { ...q, variants, total: sum(variants) };
  };
  const pendingReworkRows = qcRows
      .map((q) => outcomeBalance(q, "repair", "Rework"))
      .filter((x) => x.total > 0),
    pendingStockRows = qcRows
      .map((q) => outcomeBalance(q, "passed", "Stok Barang Jadi"))
      .filter((x) => x.total > 0),
    pendingRejectRows = qcRows
      .map((q) => outcomeBalance(q, "reject", "Karantina Reject"))
      .filter((x) => x.total > 0);
  const repairOnlyReworkRows = (records.Rework ?? []).map((row) => {
    const source = qcRows.find((x) => x.id === row.sourceId);
    if (!source?.qcDetails) return row;
    const repair = source.qcDetails.map((x) => ({
      color: x.color,
      size: x.size,
      qty: x.repair,
    }));
    const variants = row.variants.map((x) => ({
      ...x,
      qty: Math.min(
        x.qty,
        repair.find((v) => v.color === x.color && v.size === x.size)?.qty ?? 0,
      ),
    }));
    return { ...row, variants, total: sum(variants) };
  });
  const positions: Record<string, RecordRow[]> = {
    Cutting: withBalance(records.Cutting ?? [], "Bundle"),
    Bundle: withBalance(records.Bundle ?? [], "Pengiriman Vendor"),
    "Pengiriman Vendor": withBalance(
      records["Pengiriman Vendor"] ?? [],
      "Penerimaan Gudang",
    ),
    "Penerimaan Gudang": withBalance(
      (records["Penerimaan Gudang"] ?? []).filter((x) => x.qcMode !== "vendor"),
      "Pengiriman QC",
    ),
    "Pengiriman QC": withBalance(
      records["Pengiriman QC"] ?? [],
      "Quality Control",
    ),
    "Lolos QC": pendingStockRows,
    "Repair Menunggu": pendingReworkRows,
    Rework: withBalance(repairOnlyReworkRows, "Penerimaan Rework"),
    "Penerimaan Rework": withBalance(
      records["Penerimaan Rework"] ?? [],
      "QC Ulang",
    ),
    "Karantina Reject": [
      ...(records["Karantina Reject"] ?? []),
      ...pendingRejectRows,
    ],
    "Stok Barang Jadi": records["Stok Barang Jadi"] ?? [],
  };
  const units = (key: string) =>
      (positions[key] ?? []).reduce((n, x) => n + x.total, 0),
    stock = units("Stok Barang Jadi");
  const cards = [
    { key: "Cutting", label: "Cutting", icon: "✂" },
    { key: "Bundle", label: "Bundle", icon: "▱" },
    { key: "Pengiriman Vendor", label: "Vendor Jahit", icon: "↗" },
    { key: "Penerimaan Gudang", label: "Gudang", icon: "□" },
    { key: "Pengiriman QC", label: "Menunggu QC", icon: "✓" },
    { key: "Lolos QC", label: "Lolos · Belum Stok", icon: "✓" },
    { key: "Repair Menunggu", label: "Repair · Belum Dikirim", icon: "↻" },
    { key: "Rework", label: "Sedang Rework", icon: "↻" },
    { key: "Penerimaan Rework", label: "Menunggu QC Ulang", icon: "□" },
    { key: "Karantina Reject", label: "Reject", icon: "!" },
    { key: "Stok Barang Jadi", label: "Stok Jadi", icon: "▣" },
  ].map((x) => ({ ...x, value: units(x.key), items: positions[x.key] ?? [] }));
  const selected = breakdown ? (positions[breakdown] ?? []) : [];
  const todayDate = new Date(`${today}T12:00:00`),
    weekStartDate = new Date(todayDate);
  weekStartDate.setDate(todayDate.getDate() - ((todayDate.getDay() + 6) % 7));
  const weekStart = weekStartDate.toISOString().slice(0, 10),
    rangeStart =
      period === "today"
        ? today
        : period === "week"
          ? weekStart
          : period === "month"
            ? `${today.slice(0, 8)}01`
            : period === "custom"
              ? customStart
              : "0000-01-01",
    rangeEnd = period === "custom" ? customEnd : today,
    inRange = (row: RecordRow) =>
      row.date >= rangeStart && row.date <= rangeEnd;
  const productionRows = [
      ...positions.Cutting,
      ...positions.Bundle,
      ...positions["Pengiriman Vendor"],
    ],
    cuttingRows = records.Cutting ?? [],
    awaitingQCRows = [
      ...positions["Penerimaan Gudang"],
      ...positions["Pengiriman QC"],
    ],
    repairRows = [
      ...positions["Repair Menunggu"],
      ...positions.Rework,
      ...positions["Penerimaan Rework"],
    ],
    stockRows = positions["Stok Barang Jadi"],
    readyStock = pendingStockRows.reduce((n, x) => n + x.total, 0),
    awaitingQC = awaitingQCRows.reduce((n, x) => n + x.total, 0),
    inProduction = productionRows.reduce((n, x) => n + x.total, 0),
    repairPotential = repairRows.reduce((n, x) => n + x.total, 0),
    futurePotential = readyStock + awaitingQC + inProduction + repairPotential,
    qcProcessRows = [...awaitingQCRows, ...pendingStockRows],
    rejectRows = positions["Karantina Reject"],
    summaryStock = stockRows.filter(inRange).reduce((n, x) => n + x.total, 0),
    summaryCutting = cuttingRows.filter(inRange).reduce((n, x) => n + x.total, 0),
    summaryProduction = productionRows.filter(inRange).reduce((n, x) => n + x.total, 0),
    summaryQC = qcProcessRows.filter(inRange).reduce((n, x) => n + x.total, 0),
    summaryRepair = repairRows.filter(inRange).reduce((n, x) => n + x.total, 0),
    summaryReject = rejectRows.filter(inRange).reduce((n, x) => n + x.total, 0),
    summarySources: Record<string, { label: string; rows: RecordRow[] }> = {
      cutting: { label: "Total Cutting", rows: cuttingRows },
      stock: { label: "Stok Jadi", rows: stockRows },
      production: { label: "Sedang Proses", rows: productionRows },
      qc: { label: "Sedang QC", rows: qcProcessRows },
      repair: { label: "Repair", rows: repairRows },
      reject: { label: "Reject", rows: rejectRows },
    },
    selectedSummary = summaryDetail ? summarySources[summaryDetail] : null,
    selectedSummaryRows = (selectedSummary?.rows ?? []).filter(inRange),
    selectedSummarySizes = [
      ...new Set(
        selectedSummaryRows.flatMap((row) => row.variants.map((variant) => variant.size)),
      ),
    ].sort(compareSizes),
    selectedSummaryModels = [
      ...new Set(selectedSummaryRows.map((row) => row.modelCode)),
    ].map((modelCode) => {
      const modelRows = selectedSummaryRows.filter((row) => row.modelCode === modelCode),
        colors = [...new Set(modelRows.flatMap((row) => row.variants.map((variant) => variant.color)))].map(
          (color) => {
            const quantities = Object.fromEntries(
                selectedSummarySizes.map((size) => [
                  size,
                  modelRows
                    .flatMap((row) => row.variants)
                    .filter((variant) => variant.color === color && variant.size === size)
                    .reduce((total, variant) => total + variant.qty, 0),
                ]),
              ),
              total = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
            return { color, quantities, total };
          },
        );
      return {
        modelCode,
        modelName: modelRows[0]?.modelName ?? modelCode,
        colors,
        total: colors.reduce((sum, color) => sum + color.total, 0),
      };
    }),
    selectedSummaryTotal = selectedSummaryModels.reduce((sum, model) => sum + model.total, 0),
    allTrackedRows = [
      ...stockRows,
      ...pendingStockRows,
      ...awaitingQCRows,
      ...productionRows,
      ...repairRows,
    ],
    modelCodes = [...new Set(allTrackedRows.map((x) => x.modelCode))],
    allRecords = Object.values(records).flat();
  const traceStockVendor = (
    row: RecordRow | undefined,
    seen = new Set<string>(),
  ): string => {
    if (!row) return "Vendor tidak tercatat";
    if (row.originVendor) return row.originVendor;
    if (row.stage === "Pengiriman Vendor")
      return row.destination || "Vendor tidak tercatat";
    if (!row.sourceId || seen.has(row.sourceId)) return "Vendor tidak tercatat";
    seen.add(row.sourceId);
    return traceStockVendor(
      allRecords.find((x) => x.id === row.sourceId),
      seen,
    );
  };
  const stockOutlook = modelCodes.map((modelCode) => {
    const rowsFor = (rows: RecordRow[]) =>
        rows.filter((x) => x.modelCode === modelCode),
      actualRows = rowsFor(stockRows),
      readyRows = rowsFor(pendingStockRows),
      qcRowsForModel = rowsFor(awaitingQCRows),
      productionRowsForModel = rowsFor(productionRows),
      repairRowsForModel = rowsFor(repairRows),
      totalOf = (rows: RecordRow[]) => rows.reduce((n, x) => n + x.total, 0),
      variantKeys = [
        ...new Set(
          [
            ...actualRows,
            ...readyRows,
            ...qcRowsForModel,
            ...productionRowsForModel,
            ...repairRowsForModel,
          ].flatMap((x) => x.variants.map((v) => `${v.color}|||${v.size}`)),
        ),
      ],
      variantQty = (rows: RecordRow[], color: string, size: string) =>
        rows
          .flatMap((x) => x.variants)
          .filter((x) => x.color === color && x.size === size)
          .reduce((n, x) => n + x.qty, 0),
      variants = variantKeys.map((key) => {
        const [color, size] = key.split("|||");
        const actual = variantQty(actualRows, color, size),
          ready = variantQty(readyRows, color, size),
          awaiting = variantQty(qcRowsForModel, color, size),
          production = variantQty(productionRowsForModel, color, size),
          repair = variantQty(repairRowsForModel, color, size);
        return {
          color,
          size,
          actual,
          ready,
          awaiting,
          production,
          repair,
          projected: ready + awaiting + production + repair,
        };
      }),
      colorGroups = [...new Set(variants.map((variant) => variant.color))].map(
        (color) => {
          const colorVariants = variants
              .filter((variant) => variant.color === color)
              .sort((a, b) => compareSizes(a.size, b.size)),
            sum = (field: keyof (typeof colorVariants)[number]) =>
              colorVariants.reduce((total, variant) => {
                const value = variant[field];
                return total + (typeof value === "number" ? value : 0);
              }, 0);
          return {
            color,
            variants: colorVariants,
            actual: sum("actual"),
            ready: sum("ready"),
            awaiting: sum("awaiting"),
            production: sum("production"),
            repair: sum("repair"),
            projected: sum("projected"),
          };
        },
      ),
      vendorMap = new Map<string, number>();
    for (const row of actualRows) {
      const vendor = traceStockVendor(row);
      vendorMap.set(vendor, (vendorMap.get(vendor) ?? 0) + row.total);
    }
    const actual = totalOf(actualRows),
      ready = totalOf(readyRows),
      awaiting = totalOf(qcRowsForModel),
      production = totalOf(productionRowsForModel),
      repair = totalOf(repairRowsForModel);
    return {
      modelCode,
      modelName:
        allTrackedRows.find((x) => x.modelCode === modelCode)?.modelName ??
        modelCode,
      actual,
      ready,
      awaiting,
      production,
      repair,
      projected: ready + awaiting + production + repair,
      variants,
      colorGroups,
      vendors: [...vendorMap.entries()],
    };
  });
  const boardCards = cards.filter((x) => x.key !== "Stok Barang Jadi");
  return (
    <div className="owner-simple">
      <section className="stock-outlook">
        <header className="dashboard-summary-filter">
          <div className="period-switch" aria-label="Pilih rentang waktu dashboard">
            {[
              ["today", "Hari ini"],
              ["week", "Minggu ini"],
              ["month", "Bulan ini"],
              ["custom", "Custom"],
              ["max", "Maksimal"],
            ].map(([value, label]) => (
              <button type="button" className={period === value ? "active" : ""} key={value} onClick={() => setPeriod(value as typeof period)}>{label}</button>
            ))}
          </div>
        </header>
        {period === "custom" && <div className="period-dates dashboard-summary-dates"><label>Dari<input type="date" value={customStart} max={customEnd} onChange={(e) => setCustomStart(e.target.value)} /></label><label>Sampai<input type="date" value={customEnd} min={customStart} onChange={(e) => setCustomEnd(e.target.value)} /></label></div>}
        <div className="stock-outlook-kpis">
          <article className={`cutting cutting-summary-card ${summaryDetail === "cutting" ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => setSummaryDetail("cutting")} onKeyDown={(event) => event.key === "Enter" && setSummaryDetail("cutting")}>
            <span>TOTAL CUTTING</span>
            <b>{summaryCutting}</b>
          </article>
          <article className={`actual ${summaryDetail === "stock" ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => setSummaryDetail("stock")} onKeyDown={(event) => event.key === "Enter" && setSummaryDetail("stock")}>
            <span>STOK JADI</span>
            <b>{summaryStock}</b>
            <small>unit masuk stok pada periode</small>
          </article>
          <article className={`production ${summaryDetail === "production" ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => setSummaryDetail("production")} onKeyDown={(event) => event.key === "Enter" && setSummaryDetail("production")}>
            <span>SEDANG PROSES</span>
            <b>{summaryProduction}</b>
            <small>Cutting sampai vendor jahit</small>
          </article>
          <article className={`waiting ${summaryDetail === "qc" ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => setSummaryDetail("qc")} onKeyDown={(event) => event.key === "Enter" && setSummaryDetail("qc")}>
            <span>SEDANG QC</span>
            <b>{summaryQC}</b>
            <small>antrean dan hasil QC belum masuk stok</small>
          </article>
          <article className={`repair ${summaryDetail === "repair" ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => setSummaryDetail("repair")} onKeyDown={(event) => event.key === "Enter" && setSummaryDetail("repair")}>
            <span>REPAIR</span>
            <b>{summaryRepair}</b>
            <small>unit menunggu atau sedang diperbaiki</small>
          </article>
          <article className={`reject ${summaryDetail === "reject" ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => setSummaryDetail("reject")} onKeyDown={(event) => event.key === "Enter" && setSummaryDetail("reject")}>
            <span>REJECT</span>
            <b>{summaryReject}</b>
            <small>unit gagal QC dan dikarantina</small>
          </article>
        </div>
        <div className="stock-outlook-table">
          <div className="stock-table-head">
            <span>MODEL</span>
            <span>AKTUAL</span>
            <span>SIAP STOK</span>
            <span>BELUM QC</span>
            <span>PRODUKSI</span>
            <span>REPAIR</span>
            <span>POTENSI STOK</span>
          </div>
          {stockOutlook.length === 0 ? (
            <p className="stock-outlook-empty">
              Belum ada stok atau produksi aktif.
            </p>
          ) : (
            stockOutlook.map((model) => (
              <div className="stock-model" key={model.modelCode}>
                <button
                  type="button"
                  className="stock-model-row"
                  onClick={() =>
                    setStockDetail(
                      stockDetail === model.modelCode ? null : model.modelCode,
                    )
                  }
                >
                  <span>
                    <b>{model.modelName}</b>
                    <small>{model.modelCode}</small>
                  </span>
                  <strong>{model.actual}</strong>
                  <strong>{model.ready}</strong>
                  <strong>{model.awaiting}</strong>
                  <strong>{model.production}</strong>
                  <strong>{model.repair}</strong>
                  <strong className="projected">{model.projected}</strong>
                </button>
                {stockDetail === model.modelCode && (
                  <div className="stock-model-detail">
                    {model.vendors.length > 0 && (
                      <p className="stock-vendors">
                        <b>Stok aktual dari vendor:</b>{" "}
                        {model.vendors
                          .map(([vendor, qty]) => `${vendor} ${qty} unit`)
                          .join(" · ")}
                      </p>
                    )}
                    <div className="stock-variant-head">
                      <span>SIZE</span>
                      <span>AKTUAL</span>
                      <span>SIAP</span>
                      <span>BELUM QC</span>
                      <span>PRODUKSI</span>
                      <span>REPAIR</span>
                      <span>POTENSI STOK</span>
                    </div>
                    <div className="stock-color-groups">
                      {model.colorGroups.map((group) => (
                        <section
                          className="stock-color-group"
                          key={group.color}
                        >
                          <header>
                            <span>
                              <i aria-hidden="true" />
                              <b>{group.color}</b>
                            </span>
                            <strong>{group.projected} unit potensi stok</strong>
                          </header>
                          {group.variants.map((variant) => (
                            <div
                              className="stock-variant-row"
                              key={`${variant.color}-${variant.size}`}
                            >
                              <b>{variant.size}</b>
                              <span>{variant.actual}</span>
                              <span>{variant.ready}</span>
                              <span>{variant.awaiting}</span>
                              <span>{variant.production}</span>
                              <span>{variant.repair}</span>
                              <strong>{variant.projected}</strong>
                            </div>
                          ))}
                        </section>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <footer>
          Potensi stok adalah unit yang belum menjadi stok jadi dan belum
          dikurangi kemungkinan reject. Barang reject tidak masuk potensi stok.
        </footer>
      </section>
      {selectedSummary && (
        <div className="owner-drawer-backdrop summary-detail-backdrop" onClick={() => setSummaryDetail(null)}>
          <aside className="owner-drawer summary-detail-drawer" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2>Rincian {selectedSummary.label}</h2>
                <span>{selectedSummaryTotal} unit · mengikuti periode dashboard</span>
              </div>
              <button type="button" aria-label="Tutup rincian" onClick={() => setSummaryDetail(null)}>×</button>
            </header>
            <div className="summary-detail-table-wrap">
              {selectedSummaryModels.length === 0 ? (
                <div className="drawer-empty">
                  <b>Belum ada barang</b>
                  <span>Tidak ada unit pada status dan periode yang dipilih.</span>
                </div>
              ) : (
                <table className="summary-detail-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>SKU</th>
                      <th>Warna</th>
                      {selectedSummarySizes.map((size) => <th key={size}>{size}</th>)}
                      <th>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSummaryModels.map((model) =>
                      model.colors.map((color, colorIndex) => (
                        <tr className={colorIndex === 0 ? "model-group-start" : ""} key={`${model.modelCode}-${color.color}`}>
                          {colorIndex === 0 && <td className="summary-model-cell" rowSpan={model.colors.length}><b>{model.modelName}</b><small>{model.total} unit</small></td>}
                          {colorIndex === 0 && <td className="summary-sku-cell" rowSpan={model.colors.length}>{model.modelCode}</td>}
                          <td className="summary-color-cell" style={dashboardColorTone(color.color)}>{color.color}</td>
                          {selectedSummarySizes.map((size) => <td key={size} className="summary-qty-cell">{color.quantities[size] || ""}</td>)}
                          <td className="summary-total-cell">{color.total}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                  <tfoot><tr><th colSpan={3 + selectedSummarySizes.length}>Total {selectedSummary.label}</th><th>{selectedSummaryTotal}</th></tr></tfoot>
                </table>
              )}
            </div>
          </aside>
        </div>
      )}
      <OwnerVendorMonitoring data={data} periodStart={rangeStart} periodEnd={rangeEnd} />
      <section className="production-board-panel">
        <header>
          <div>
            <h2>Posisi pekerjaan saat ini</h2>
            <span>
              Kartu tersusun ke bawah. Klik tahap atau kartu untuk membuka
              rincian.
            </span>
          </div>
          <b>{stock} unit stok jadi</b>
        </header>
        <div className="production-board">
          {boardCards.map((stage, index) => (
            <article
              className={`board-column ${breakdown === stage.key ? "selected" : ""}`}
              key={stage.key}
              onClick={() => setBreakdown(stage.key)}
            >
              <header>
                <span>
                  <i>{stage.icon}</i>
                  <b>{stage.label}</b>
                </span>
                <strong>
                  {stage.value}
                  <small> unit</small>
                </strong>
              </header>
              <div className="board-card-list">
                {stage.items.length === 0 ? (
                  <p className="board-empty">Belum ada pekerjaan</p>
                ) : (
                  stage.items.slice(0, 6).map((row) => (
                    <button
                      type="button"
                      key={row.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setBreakdown(stage.key);
                      }}
                    >
                      <small>
                        {row.id} · {row.date}
                      </small>
                      <b>{row.modelName}</b>
                      {row.destination && <em>{row.destination}</em>}
                      <span>
                        {row.variants
                          .slice(0, 3)
                          .map((v) => `${v.color} ${v.size}: ${v.qty}`)
                          .join(" · ")}
                        {row.variants.length > 3 ? " · …" : ""}
                      </span>
                      <strong>{row.total} unit</strong>
                    </button>
                  ))
                )}
                {stage.items.length > 6 && (
                  <p className="board-more">
                    +{stage.items.length - 6} pekerjaan lainnya
                  </p>
                )}
              </div>
              {index < boardCards.length - 1 && (
                <i className="board-arrow">→</i>
              )}
            </article>
          ))}
        </div>
        {breakdown && (
          <section className="board-detail">
            <header>
              <div>
                <p className="overline">RINCIAN TAHAP</p>
                <h3>
                  {boardCards.find((x) => x.key === breakdown)?.label ??
                    breakdown}
                </h3>
                <span>
                  {selected.length} pekerjaan ·{" "}
                  {selected.reduce((n, x) => n + x.total, 0)} unit
                </span>
              </div>
              <div>
                <button type="button" onClick={() => setBreakdown(null)}>
                  Tutup
                </button>
                <button
                  className="primary"
                  type="button"
                  onClick={() =>
                    go(
                      breakdown === "Lolos QC"
                        ? "Stok Barang Jadi"
                        : breakdown === "Repair Menunggu"
                          ? "Rework"
                          : breakdown,
                    )
                  }
                >
                  Buka proses →
                </button>
              </div>
            </header>
            {selected.length === 0 ? (
              <div className="board-detail-empty">
                Tidak ada pekerjaan aktif pada tahap ini.
              </div>
            ) : (
              <div className="board-detail-grid">
                {selected.map((row) => (
                  <article key={row.id}>
                    <header>
                      <div>
                        <small>
                          {row.id} · {row.date}
                        </small>
                        <h4>{row.modelName}</h4>
                        <span>
                          {row.sourceId
                            ? `Sumber: ${row.sourceId}`
                            : "PO produksi"}
                          {row.destination ? ` · ${row.destination}` : ""}
                        </span>
                        {row.bundleId && (
                          <span>Bundle {shortBundleCode(row.bundleId)}</span>
                        )}
                      </div>
                      <b>
                        {row.total}
                        <small> unit</small>
                      </b>
                    </header>
                    <div>
                      {row.variants.map((v) => (
                        <p key={`${v.color}-${v.size}`}>
                          <span>{v.color}</span>
                          <b>{v.size}</b>
                          <strong>{v.qty} unit</strong>
                        </p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </section>
    </div>
  );
}
function PICMaster({
  items,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: PIC[];
  onAdd: () => void;
  onEdit: (item: PIC) => void;
  onDelete: (item: PIC) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) =>
    [item.code, item.name, item.role, item.phone, item.bankName]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <MasterTableTitle title="Master PIC" />
      {items.length === 0 ? (
        <Empty
          title="Belum ada PIC"
          text="Tambahkan penanggung jawab agar proses pengiriman tidak perlu mengetik nama manual."
        />
      ) : (
        <MasterTablePanel query={query} onQuery={setQuery} placeholder="Cari kode, nama, jabatan, atau kontak..." addLabel="Tambah PIC" onAdd={onAdd} count={filtered.length} columns={["No.", "Kode", "Nama PIC", "Jabatan", "Kontak", "Rekening", "Status", "Aksi"]}>
          <table className="master-data-table"><thead><tr><th>No.</th><th>Kode</th><th>Nama PIC</th><th>Jabatan</th><th>Kontak</th><th>Rekening</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
            {filtered.map((item, index) => <tr key={item.code}><td data-label="No.">{index + 1}</td><td data-label="Kode"><b>{item.code}</b></td><td data-label="Nama PIC"><b>{item.name}</b></td><td data-label="Jabatan">{item.role || "PIC Produksi"}</td><td data-label="Kontak">{item.phone || "Belum diisi"}</td><td data-label="Rekening">{item.bankName && item.accountNumber ? <><b>{item.bankName} {item.accountNumber}</b><small>a.n. {item.accountHolder || item.name}</small></> : "Belum diisi"}</td><td data-label="Status"><span className={`master-status ${item.active ? "active" : "inactive"}`}>{item.active ? "Aktif" : "Nonaktif"}</span></td><td data-label="Aksi"><MasterRowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} /></td></tr>)}
          </tbody></table>
        </MasterTablePanel>
      )}
    </>
  );
}

function Master({
  data,
  onAdd,
  onEdit,
  onDelete,
}: {
  data: AppData;
  onAdd: () => void;
  onEdit: (m: Model) => void;
  onDelete: (m: Model) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = data.models.filter((m) =>
    [m.code, m.name, ...m.colors, ...m.sizes, decorationLabel(m.decorationProcess)]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <MasterTableTitle title="Master Jaket" />
      {data.models.length === 0 ? (
        <Empty
          title="Belum ada master jaket"
          text="Tambahkan model jaket pertama untuk memulai PO produksi."
        />
      ) : (
        <MasterTablePanel query={query} onQuery={setQuery} placeholder="Cari kode, model, warna, atau ukuran..." addLabel="Tambah Jaket" onAdd={onAdd} count={filtered.length} columns={["No.", "Kode", "Nama Model", "Warna", "Ukuran", "Proses", "Status", "Aksi"]}>
          <table className="master-data-table"><thead><tr><th>No.</th><th>Kode</th><th>Nama Model</th><th>Warna</th><th>Ukuran</th><th>Proses</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
            {filtered.map((m, index) => <tr key={m.code}><td data-label="No.">{index + 1}</td><td data-label="Kode"><b>{m.code}</b></td><td data-label="Nama Model"><b>{m.name}</b></td><td data-label="Warna"><span className="master-chip-list">{m.colors.map((color) => <small key={color}>{color}</small>)}</span></td><td data-label="Ukuran"><span className="master-chip-list">{m.sizes.slice().sort(compareSizes).map((size) => <small key={size}>{size}</small>)}</span></td><td data-label="Proses"><span className={`decoration-badge ${(m.decorationProcess ?? "none") === "none" ? "none" : "required"}`}>{decorationLabel(m.decorationProcess)}</span></td><td data-label="Status"><span className="master-status active">Aktif</span></td><td data-label="Aksi"><MasterRowActions onEdit={() => onEdit(m)} onDelete={() => onDelete(m)} /></td></tr>)}
          </tbody></table>
        </MasterTablePanel>
      )}
    </>
  );
}
function VendorMaster({
  vendors,
  qcLocations,
  onAdd,
  onEdit,
  onDelete,
}: {
  vendors: Vendor[];
  qcLocations: QCLocation[];
  onAdd: () => void;
  onEdit: (v: Vendor) => void;
  onDelete: (v: Vendor) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = vendors.filter((v) =>
    [v.code, v.name, v.contact, v.phone, v.address, v.bankName]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <MasterTableTitle title="Master Vendor" />
      {vendors.length === 0 ? (
        <Empty
          title="Belum ada vendor"
          text="Tambahkan tujuan QC di bawah, lalu buat vendor jahit pertama."
        />
      ) : (
        <MasterTablePanel query={query} onQuery={setQuery} placeholder="Cari kode, vendor, kontak, atau alamat..." addLabel="Tambah Vendor" onAdd={onAdd} count={filtered.length} columns={["No.", "Kode", "Nama Vendor", "Kemampuan", "Tarif Dekorasi", "Kontak", "Alur QC", "Rekening", "Status", "Aksi"]}>
          <table className="master-data-table vendor-master-table"><thead><tr><th>No.</th><th>Kode</th><th>Nama Vendor</th><th>Kemampuan</th><th>Tarif Dekorasi</th><th>Kontak</th><th>Alur QC</th><th>Rekening</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
          {filtered.map((v, index) => {
            const target = qcLocations.find((x) => x.code === v.qcLocationCode);
            return (
              <tr key={v.code}><td data-label="No.">{index + 1}</td><td data-label="Kode"><b>{v.code}</b></td><td data-label="Nama Vendor"><b>{v.name}</b><small>{v.address || "Alamat belum diisi"}</small></td><td data-label="Kemampuan"><span className="master-chip-list">{(v.capabilities ?? ["sewing"]).map((capability) => <small key={capability}>{capability === "sewing" ? "Jahit" : capability === "screenprint" ? "Sablon" : "Bordir"}</small>)}</span></td><td data-label="Tarif Dekorasi">{(v.capabilities ?? []).includes("screenprint") && <small>Sablon {rupiah(v.screenprintRate ?? 0)}/unit</small>}{(v.capabilities ?? []).includes("embroidery") && <small>Bordir {rupiah(v.embroideryRate ?? 0)}/unit</small>}{!(v.capabilities ?? []).some((item) => item !== "sewing") && <small>—</small>}</td><td data-label="Kontak"><b>{v.contact || "Belum diisi"}</b><small>{v.phone || "Nomor belum diisi"}</small></td><td data-label="Alur QC"><b>{v.qcMode === "vendor" ? "QC di vendor" : "QC internal"}</b><small>{v.qcMode === "vendor" ? v.qcOfficer || "Petugas belum diisi" : target ? `${target.location} · ${target.recipient}` : "Tujuan belum dipilih"}</small></td><td data-label="Rekening">{v.bankName && v.accountNumber ? <><b>{v.bankName} {v.accountNumber}</b><small>a.n. {v.accountHolder || v.name}</small></> : "Belum diisi"}</td><td data-label="Status"><span className={`master-status ${v.active ? "active" : "inactive"}`}>{v.active ? "Aktif" : "Nonaktif"}</span></td><td data-label="Aksi"><MasterRowActions onEdit={() => onEdit(v)} onDelete={() => onDelete(v)} /></td></tr>
            );
          })}
          </tbody></table>
        </MasterTablePanel>
      )}
    </>
  );
}
function RejectQuarantine({ rows }: { rows: RecordRow[] }) {
  return (
    <>
      <div className="page-title">
        <div>
          <p className="overline">POSISI FISIK</p>
          <h1>Karantina Reject</h1>
          <span>
            Barang reject dipisahkan dari repair dan tidak dapat masuk stok.
          </span>
        </div>
      </div>
      <section className="panel table-panel">
        {rows.length === 0 ? (
          <Empty
            title="Tidak ada barang reject"
            text="Barang gagal QC akan muncul otomatis di sini beserta warna, ukuran, dan sumber PO."
          />
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>NO.</th>
                  <th>SUMBER QC</th>
                  <th>PO</th>
                  <th>MODEL</th>
                  <th>WARNA & UKURAN</th>
                  <th>JUMLAH</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>
                      <b>{row.sourceId}</b>
                    </td>
                    <td>
                      <b>{row.poId || "—"}</b>
                    </td>
                    <td>{row.modelName}</td>
                    <td>
                      <small>
                        {row.variants
                          .map((x) => `${x.color} ${x.size}: ${x.qty}`)
                          .join(" · ")}
                      </small>
                    </td>
                    <td>
                      <b>{row.total}</b> unit
                    </td>
                    <td>
                      <span className="status">Karantina</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function StagePage({
  active,
  rows,
  sources,
  allRecords,
  weeklyPayments,
  qcLocations,
  sourceCount,
  onAdd,
  onPrintBundle,
  onSendBundles,
  onUpdatePayment,
  onPrintPayment,
  onVoidPayment,
  onSetCuttingRate,
  onSetVendorRate,
  onSetQCRate,
  onSetDecorationRate,
  onCreateWeeklyPayment,
  onPrintWeeklyPayment,
  onVoidWeeklyPayment,
}: {
  active: string;
  rows: RecordRow[];
  sources: RecordRow[];
  allRecords: Record<string, RecordRow[]>;
  weeklyPayments: WeeklyPayment[];
  qcLocations: QCLocation[];
  sourceCount: number;
  onAdd: () => void;
  onPrintBundle: (bundle: RecordRow) => void;
  onSendBundles: (bundleIds: string[]) => void;
  onUpdatePayment: (
    receipt: RecordRow,
    kind: "vendor" | "cutting",
  ) => void;
  onPrintPayment: (
    receipt: RecordRow,
    payment: PaymentEntry,
    kind: "vendor" | "cutting",
  ) => void;
  onVoidPayment: (receipt: RecordRow, payment: PaymentEntry) => void;
  onSetCuttingRate: (cutting: RecordRow) => void;
  onSetVendorRate: (receipt: RecordRow) => void;
  onSetQCRate: (inspection: RecordRow) => void;
  onSetDecorationRate: (row: RecordRow) => void;
  onCreateWeeklyPayment: (
    kind: WeeklyPaymentKind,
    payee: string,
    rows: RecordRow[],
    periodStart: string,
    periodEnd: string,
  ) => void;
  onPrintWeeklyPayment: (payment: WeeklyPayment) => void;
  onVoidWeeklyPayment: (payment: WeeklyPayment) => void;
}) {
  const [bundleQuery, setBundleQuery] = useState("");
  const [bundleMobileView, setBundleMobileView] = useState<"cards" | "table">("table");
  const [bundleStatus, setBundleStatus] = useState<"ready" | "sent" | "all">(
    "ready",
  );
  const [bundlePeriod, setBundlePeriod] = useState<
    "all" | "today" | "week" | "month"
  >("all");
  const [bundlePage, setBundlePage] = useState(1);
  const [bundlePageSize, setBundlePageSize] = useState(10);
  const [selectedOperationalBundles, setSelectedOperationalBundles] =
    useState<string[]>([]);
  const [processTableQuery, setProcessTableQuery] = useState("");
  const [processTablePage, setProcessTablePage] = useState(1);
  const [processTablePageSize, setProcessTablePageSize] = useState(10);
  const [productionColumnMenu, setProductionColumnMenu] = useState(false);
  const [productionVisibleColumns, setProductionVisibleColumns] = useState<Record<string, boolean[]>>({});
  const [weeklyReferenceDate, setWeeklyReferenceDate] = useState(
    localDateString(),
  );
  const [weeklyPeriodChoice, setWeeklyPeriodChoice] = useState<
    "current" | "previous" | "custom"
  >("current");
  const info = stageInfo[active];
  const blocked = !!info.source && sourceCount === 0;
  const bundleCards =
    active === "Bundle"
      ? sources.map((source) => {
          const used = (allRecords.Bundle ?? [])
            .filter((x) => x.sourceId === source.id)
            .reduce((n, x) => n + x.total, 0);
          const decorationJobs = (allRecords["Sablon/Bordir"] ?? []).filter(
            (row) => row.sourceId === source.id && row.decorationRequiredBeforeBundle !== false,
          );
          const expectedDecoration = source.decorationProcess ?? "none";
          const expectedTypesReady =
            expectedDecoration === "screenprint" ? decorationJobs.some((row) => row.decorationType === "screenprint")
            : expectedDecoration === "embroidery" ? decorationJobs.some((row) => row.decorationType === "embroidery")
            : expectedDecoration === "both" ? decorationJobs.some((row) => row.decorationType === "screenprint") && decorationJobs.some((row) => row.decorationType === "embroidery")
            : true;
          const explicitFinalStep = decorationJobs.some((row) => typeof row.decorationFinalStep === "boolean");
          const decorationReady = decorationJobs.length > 0 && expectedTypesReady &&
            (!explicitFinalStep || decorationJobs.some((row) => row.decorationFinalStep === true)) &&
            decorationJobs.every((row) => (row.decorationCompleted ?? 0) >= row.total);
          const released =
            (source.decorationProcess ?? "none") === "none"
              ? source.total
              : decorationReady ? source.total : 0;
          return {
            source,
            used,
            left: Math.max(0, released - used),
            count: (allRecords.Bundle ?? []).filter(
              (x) => x.sourceId === source.id,
            ).length,
          };
        })
      : [];
  const shippedIds = new Set(
    (allRecords["Pengiriman Vendor"] ?? []).map((x) => x.sourceId),
  );
  const now = new Date(),
    todayString = localDateString(now),
    weekStartDate = new Date(now);
  weekStartDate.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStartString = localDateString(weekStartDate),
    monthStartString = `${todayString.slice(0, 8)}01`,
    weeklyPeriod = mondaySaturday(
      new Date(`${weeklyReferenceDate}T12:00:00`),
    ),
    effectiveQCRate = (row: RecordRow) => {
      if ((row.qcRate ?? 0) > 0) return row.qcRate ?? 0;
      const shipment = (allRecords["Pengiriman QC"] ?? []).find(
        (item) => item.id === row.sourceId,
      );
      return (
        qcLocations.find(
          (location) =>
            location.location === shipment?.destination ||
            location.recipient === row.qcOfficer,
        )?.rate ?? 0
      );
    },
    qcPayee = (row: RecordRow) => {
      const shipment = (allRecords["Pengiriman QC"] ?? []).find(
        (item) => item.id === row.sourceId,
      );
      const location = qcLocations.find(
        (item) => item.location === shipment?.destination,
      );
      return row.qcOfficer || location?.recipient || shipment?.destination || "Petugas QC belum dicatat";
    },
    vendorShipment = (row: RecordRow) =>
      (allRecords["Pengiriman Vendor"] ?? []).find(
        (item) => item.id === row.sourceId,
      ),
    vendorPayee = (row: RecordRow) =>
      vendorShipment(row)?.destination || "Vendor belum ditemukan",
    weeklyRate = (row: RecordRow) =>
      active === "Cutting"
        ? row.cuttingRate ?? 0
        : active === "Quality Control"
          ? effectiveQCRate(row)
          : active === "Sablon/Bordir"
            ? row.decorationRate ?? 0
            : row.sewingRate ?? vendorShipment(row)?.sewingRate ?? 0,
    weeklyKind: WeeklyPaymentKind =
      active === "Cutting"
        ? "cutting"
        : active === "Quality Control"
          ? "qc"
          : active === "Sablon/Bordir"
            ? "decoration"
            : "vendor",
    weeklySourceRows =
      active === "Cutting" || active === "Quality Control" || active === "Penerimaan Gudang" || active === "Sablon/Bordir"
        ? rows.filter(
            (row) =>
              row.date >= weeklyPeriod.start &&
              row.date <= weeklyPeriod.end,
          )
        : [],
    weeklyGroups = Object.entries(
      weeklySourceRows.reduce<Record<string, RecordRow[]>>((groups, row) => {
        const payee =
          active === "Cutting"
            ? row.officer || "Pelaksana belum dicatat"
            : active === "Quality Control"
              ? qcPayee(row)
              : active === "Sablon/Bordir"
                ? row.destination || "Vendor dekorasi belum dicatat"
              : vendorPayee(row);
        groups[payee] = [...(groups[payee] ?? []), row];
        return groups;
      }, {}),
    ),
    bundleMatchesPeriod = (bundle: RecordRow) => {
      if (bundlePeriod === "today") return bundle.date === todayString;
      if (bundlePeriod === "week") return bundle.date >= weekStartString;
      if (bundlePeriod === "month") return bundle.date >= monthStartString;
      return true;
    },
    operationalBundles =
      active === "Bundle"
        ? rows.filter((bundle) => {
            const sent = shippedIds.has(bundle.id),
              matchesStatus =
                bundleStatus === "all" ||
                (bundleStatus === "ready" ? !sent : sent),
              searchable = [
                bundle.id,
                bundle.poId,
                bundle.sourceId,
                bundle.modelCode,
                bundle.modelName,
                bundle.officer,
                ...bundle.variants.flatMap((variant) => [
                  variant.color,
                  variant.size,
                ]),
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return (
              matchesStatus &&
              bundleMatchesPeriod(bundle) &&
              searchable.includes(bundleQuery.trim().toLowerCase())
            );
          })
        : [],
    bundlePageCount = Math.max(1, Math.ceil(operationalBundles.length / bundlePageSize)),
    safeBundlePage = Math.min(bundlePage, bundlePageCount),
    pagedOperationalBundles = operationalBundles.slice((safeBundlePage - 1) * bundlePageSize, safeBundlePage * bundlePageSize),
    processTableRows = rows.filter((row) => {
      const query = processTableQuery.trim().toLowerCase();
      return !query || [row.id, row.sourceId, row.poId, row.modelName, row.modelCode, row.officer, ...row.variants.flatMap((variant) => [variant.color, variant.size])].filter(Boolean).join(" ").toLowerCase().includes(query);
    }),
    processTablePageCount = Math.max(1, Math.ceil(processTableRows.length / processTablePageSize)),
    safeProcessTablePage = Math.min(processTablePage, processTablePageCount),
    pagedProcessTableRows = processTableRows.slice((safeProcessTablePage - 1) * processTablePageSize, safeProcessTablePage * processTablePageSize),
    selectedBundleRows = rows.filter((bundle) =>
      selectedOperationalBundles.includes(bundle.id),
    ),
    selectedBundleModel = selectedBundleRows[0]?.modelCode,
    selectedBundleUnits = selectedBundleRows.reduce(
      (total, bundle) => total + bundle.total,
      0,
    ),
    isProcessLedger = ["Order Produksi", "Cutting", "Sablon/Bordir"].includes(active),
    isModernProduction = ["Cutting", "Sablon/Bordir", "Bundle"].includes(active),
    processLedgerTitle = active === "Order Produksi" ? "Daftar order produksi lama" : active === "Cutting" ? "Daftar batch Cutting" : "Daftar hasil Sablon/Bordir",
    processLedgerDescription = active === "Order Produksi" ? "Arsip transaksi lama sebelum alur dimulai dari Cutting." : active === "Cutting" ? "Setiap hasil Cutting menjadi referensi awal sampai stok jadi." : "Hasil proses tambahan yang siap dilanjutkan menjadi bundle.";
  const productionColumns = active === "Bundle"
      ? ["No.", "Pilih", "Kode Bundle", "Tanggal", "Batch Cutting", "Model", "Warna & Ukuran", "Total", "Status", "Aksi"]
      : active === "Cutting"
        ? ["No.", "Kode Cutting", "Tanggal", "Referensi Produksi", "Model", "PIC Cutting", "Warna & Ukuran", "Total", "Status"]
        : active === "Sablon/Bordir"
          ? ["No.", "Kode Proses", "Tanggal", "Referensi Produksi", "Model", "PIC Proses", "Warna & Ukuran", "Total", "Status"]
          : ["No.", "Kode", "Tanggal", "Referensi", "Model", "Warna & Ukuran", "Total", "Status"],
    visibleProductionColumns = productionVisibleColumns[active] ?? productionColumns.map(() => true),
    allProductionColumnsVisible = visibleProductionColumns.every(Boolean),
    productionColumnHiddenClasses = visibleProductionColumns.map((visible, index) => visible ? "" : `hide-production-col-${index + 1}`).filter(Boolean).join(" "),
    toggleProductionColumn = (index: number) => setProductionVisibleColumns((current) => ({ ...current, [active]: visibleProductionColumns.map((visible, itemIndex) => itemIndex === index ? !visible : visible) })),
    setAllProductionColumns = (visible: boolean) => setProductionVisibleColumns((current) => ({ ...current, [active]: productionColumns.map(() => visible) }));
  const productionAddDisabled = blocked || (active === "Bundle" && bundleCards.every((item) => item.left === 0)),
    productionAddLabel = active === "Cutting" ? "Catat hasil Cutting" : active === "Sablon/Bordir" ? "Buat pekerjaan dekorasi" : "Buat bundle berikutnya";
  const availableToShip =
    active === "Pengiriman Vendor"
      ? sources.filter((bundle) => !shippedIds.has(bundle.id)).length
      : 0;
  const vendorCards =
    active === "Penerimaan Gudang"
      ? sources.map((source) => {
          const receipts = (allRecords["Penerimaan Gudang"] ?? []).filter(
            (x) => x.sourceId === source.id,
          );
          const received = receipts.reduce((n, x) => n + x.total, 0);
          return {
            source,
            received,
            left: Math.max(0, source.total - received),
            count: receipts.length,
            status: receipts.at(-1)?.remainingStatus ?? "Masih dijahit",
          };
        })
      : [];
  const activeVendorCards = vendorCards.filter((x) => x.left > 0);
  const completedVendorCards = vendorCards.filter((x) => x.left === 0);
  const downstreamIds = new Set(rows.map((x) => x.sourceId));
  const remainingQCForSource = (source: RecordRow) =>
    subtractVariants(
      source.variants,
      (allRecords["Pengiriman QC"] ?? [])
        .filter((row) => row.sourceId === source.id)
        .flatMap((row) => row.variants),
    );
  const availableOnce =
    active === "Pengiriman QC" || active === "Quality Control"
      ? sources.filter(
          (x) =>
            (active === "Pengiriman QC"
              ? sum(remainingQCForSource(x)) > 0
              : !downstreamIds.has(x.id)) &&
            !(
              active === "Pengiriman QC" &&
              (allRecords["Quality Control"] ?? []).some(
                (qc) => qc.sourceId === x.id && qc.qcMode === "vendor",
              )
            ),
        ).length
      : 0;
  const availableSpecial = [
    "Rework",
    "Penerimaan Rework",
    "QC Ulang",
    "Karantina Reject",
    "Stok Barang Jadi",
  ].includes(active)
    ? sources.filter((x) => {
        if (downstreamIds.has(x.id)) return false;
        if (active === "Rework") return (x.qcRepair ?? 0) > 0;
        if (active === "Karantina Reject") return (x.qcReject ?? 0) > 0;
        if (active === "Stok Barang Jadi") return (x.qcPassed ?? 0) > 0;
        return true;
      }).length
    : 0;
  const qcSummary =
    active === "Quality Control"
      ? rows.map((q) => {
          const sent = (allRecords["Pengiriman QC"] ?? []).find(
            (x) => x.id === q.sourceId,
          );
          const receipt = (allRecords["Penerimaan Gudang"] ?? []).find(
            (x) => x.id === sent?.sourceId,
          );
          const vendor = (allRecords["Pengiriman Vendor"] ?? []).find(
            (x) => x.id === receipt?.sourceId,
          );
          return {
            q,
            vendor: vendor?.destination || "Vendor tidak ditemukan",
            receipt: receipt?.id || "—",
            shipment: vendor?.id || "—",
          };
        })
      : [];
  return (
    <div className="stage-page-layout">
      {!isModernProduction && !["Pengiriman Vendor", "Penerimaan Gudang"].includes(active) && !qcOperationalStages.has(active) && <div className="page-title">
        <div>
          <h1>{info.title}</h1>
          <><p className="overline">PROSES TERHUBUNG</p><span>{info.desc}</span></>
        </div>
        {!tableToolbarStages.has(active) && <button
          className="primary"
          disabled={
            blocked ||
            (active === "Bundle" && bundleCards.every((x) => x.left === 0)) ||
            (active === "Pengiriman Vendor" && availableToShip === 0) ||
            (active === "Penerimaan Gudang" &&
              activeVendorCards.length === 0) ||
            ((active === "Pengiriman QC" || active === "Quality Control") &&
              availableOnce === 0) ||
            ([
              "Rework",
              "Penerimaan Rework",
              "QC Ulang",
              "Karantina Reject",
              "Stok Barang Jadi",
            ].includes(active) &&
              availableSpecial === 0)
          }
          onClick={onAdd}
        >
          ＋{" "}
          {active === "Order Produksi"
            ? "Buat PO"
            : active === "Cutting"
              ? "Catat hasil Cutting"
              : active === "Bundle"
                ? "Buat bundle berikutnya"
                : active === "Sablon/Bordir"
                  ? "Buat pekerjaan dekorasi"
                : active === "Penerimaan Gudang"
                  ? "Terima setoran vendor"
                  : active === "Pengiriman QC"
                    ? "Kirim ke QC"
                    : active === "Quality Control"
                      ? "Terima & periksa"
                      : active === "Rework"
                        ? "Kirim repair"
                        : active === "Penerimaan Rework"
                          ? "Terima hasil repair"
                          : active === "QC Ulang"
                            ? "Periksa ulang"
                            : active === "Stok Barang Jadi"
                              ? "Masukkan stok"
                              : "Catat proses"}
        </button>}
      </div>}
      {blocked && (
        <div className="dependency">
          <b>Proses sebelumnya belum tersedia</b>
          <span>
            Buat data di modul {info.source} terlebih dahulu agar rincian warna
            dan ukuran dapat diteruskan.
          </span>
        </div>
      )}
      {["Rework", "Penerimaan Rework", "QC Ulang"].includes(active) && (
        <div className="dependency qc-no-charge">
          <b>Perbaikan tidak ditagihkan</b>
          <span>Repair dan QC ulang menjadi tanggung jawab vendor penjahit. Proses tetap dicatat untuk pelacakan unit, tanpa biaya tambahan.</span>
        </div>
      )}
      {(active === "Cutting" || active === "Quality Control" || active === "Penerimaan Gudang" || active === "Sablon/Bordir") && rows.length > 0 && (
        <section className="receipt-payment-list weekly-payment-list">
          <header>
            <div>
              <small>REKAP PEMBAYARAN MINGGUAN</small>
              <h2>{active === "Cutting" ? "Cutting Senin–Sabtu" : active === "Quality Control" ? "QC Senin–Sabtu" : active === "Sablon/Bordir" ? "Sablon & Bordir Senin–Sabtu" : "Vendor Jahit Senin–Sabtu"}</h2>
            </div>
            <b>{weeklyGroups.length} data</b>
          </header>
          <div className="weekly-payment-tools">
            <div className="weekly-period-picker">
              <label>
                <span>Periode</span>
                <select
                  value={weeklyPeriodChoice}
                  onChange={(event) => {
                    const choice = event.target.value as "current" | "previous" | "custom";
                    setWeeklyPeriodChoice(choice);
                    if (choice === "current") setWeeklyReferenceDate(localDateString());
                    if (choice === "previous") {
                      const previousWeek = new Date();
                      previousWeek.setDate(previousWeek.getDate() - 7);
                      setWeeklyReferenceDate(localDateString(previousWeek));
                    }
                  }}
                >
                  <option value="current">Minggu ini</option>
                  <option value="previous">Minggu lalu</option>
                  <option value="custom">Pilih tanggal</option>
                </select>
              </label>
              {weeklyPeriodChoice === "custom" && (
                <label>
                  <span>Tanggal acuan</span>
                  <input type="date" value={weeklyReferenceDate} onChange={(e) => setWeeklyReferenceDate(e.target.value)} />
                </label>
              )}
            </div>
            <p><span>Periode aktif</span><b>{weeklyPeriod.start} – {weeklyPeriod.end}</b></p>
          </div>
          <div className="weekly-payment-table-wrap">
            {weeklyGroups.length === 0 ? (
              <p className="queue-empty">Belum ada pekerjaan yang perlu direkap pada minggu ini.</p>
            ) : <table className="weekly-payment-table"><thead><tr><th>No.</th><th>{active === "Penerimaan Gudang" ? "Vendor" : "Pelaksana"}</th><th>Transaksi</th><th>Unit</th><th>Tagihan</th><th>Dibayar</th><th>Sisa</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{weeklyGroups.map(([payee, groupRows], groupIndex) => {
              const totalUnits = groupRows.reduce((total, row) => total + row.total, 0),
                totalAmount = groupRows.reduce(
                  (total, row) =>
                    total + row.total * weeklyRate(row),
                  0,
                ),
                missingRate = groupRows.some((row) => weeklyRate(row) <= 0),
                paid = weeklyKind === "vendor" || weeklyKind === "decoration"
                  ? groupRows.reduce(
                      (total, receipt) => total + paidForReceipt(receipt),
                      0,
                    )
                  : weeklyPaidAmount(
                      weeklyPayments,
                      weeklyKind,
                      payee,
                      weeklyPeriod.start,
                      weeklyPeriod.end,
                    ) + (weeklyKind === "cutting" ? groupRows.reduce((total, row) => total + paidForReceipt(row), 0) : 0),
                remaining = Math.max(0, totalAmount - paid),
                status = paid <= 0 ? "Belum dibayar" : remaining > 0 ? "DP sebagian" : "Lunas";
              return (
                <tr key={payee}>
                  <td data-label="No.">{groupIndex + 1}</td>
                  <td data-label={active === "Penerimaan Gudang" ? "Vendor" : "Pelaksana"}><details className="weekly-payee-details"><summary><b>{payee}</b><small>Lihat rincian batch</small></summary><div>{groupRows.map((row) => {
                      const rate = weeklyRate(row);
                      return (
                        <p key={row.id} className={rate <= 0 ? "missing-rate-line" : ""}>
                          <span><b>{row.id}</b><small>{row.modelName}</small></span>
                          <strong>{row.total} × {rupiah(rate)}</strong>
                          {rate <= 0 && (
                            <button type="button" onClick={() => weeklyKind === "vendor" ? onSetVendorRate(row) : weeklyKind === "decoration" ? onSetDecorationRate(row) : weeklyKind === "cutting" ? onSetCuttingRate(row) : onSetQCRate(row)}>
                              Lengkapi tarif
                            </button>
                          )}
                        </p>
                      );
                    })}</div></details></td>
                  <td data-label="Transaksi">{groupRows.length}</td>
                  <td data-label="Unit"><b>{totalUnits}</b></td>
                  <td data-label="Tagihan"><b>{rupiah(totalAmount)}</b></td>
                  <td data-label="Dibayar">{rupiah(paid)}</td>
                  <td data-label="Sisa"><strong>{rupiah(remaining)}</strong></td>
                  <td data-label="Status"><em className={`weekly-payment-status ${missingRate || paid <= 0 ? "unpaid" : remaining > 0 ? "partial" : "paid"}`}>{missingRate ? "Tarif belum lengkap" : status}</em></td>
                  <td data-label="Aksi">{remaining > 0 ? <button className="weekly-payment-action" type="button" disabled={missingRate} onClick={() => onCreateWeeklyPayment(weeklyKind, payee, groupRows.map((row) => weeklyKind === "qc" ? { ...row, qcRate: effectiveQCRate(row) } : weeklyKind === "vendor" ? { ...row, sewingRate: weeklyRate(row) } : weeklyKind === "decoration" ? { ...row, decorationRate: weeklyRate(row) } : row), weeklyPeriod.start, weeklyPeriod.end)}>{paid > 0 ? "Tambah bayar" : "Catat bayar"}</button> : <span className="weekly-payment-complete">Selesai</span>}</td>
                </tr>
              );
            })}</tbody></table>}
          </div>
          {weeklyPayments.some((payment) => payment.kind === weeklyKind) && (
            <details className="completed-cuttings weekly-payment-history">
              <summary><span>✓</span><b>Riwayat rekap pembayaran</b><small>Klik untuk melihat rekap yang sudah dibukukan</small></summary>
              <div>
                {weeklyPayments.filter((payment) => payment.kind === weeklyKind).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).map((payment) => (
                  <p key={payment.id} className={payment.voided ? "voided" : ""}>
                    <b>{payment.id}</b>
                    <span>{payment.payee} · {payment.periodStart}–{payment.periodEnd}</span>
                    <em>{payment.voided ? `Dibatalkan · ${payment.voidReason}` : `${payment.totalUnits} unit · dibayar ${rupiah(payment.paymentAmount ?? payment.totalAmount)}`}</em>
                    <button type="button" onClick={() => onPrintWeeklyPayment(payment)}>Cetak</button>
                    {!payment.voided && <button className="danger" type="button" onClick={() => onVoidWeeklyPayment(payment)}>Batalkan</button>}
                  </p>
                ))}
              </div>
            </details>
          )}
        </section>
      )}
      {active === "Cutting" && false && rows.some((row) => legacyPayment(row).length > 0) && (
        <section className="receipt-payment-list cutting-payment-list">
          <header>
            <div>
              <small>PEMBAYARAN CUTTING</small>
              <h2>Tagihan jasa cutting</h2>
              <span>Tagihan dan pembayaran dipisahkan untuk setiap kode CUT.</span>
            </div>
            <b>{rows.length} batch</b>
          </header>
          <div className="receipt-payment-cards">
            {rows.map((cutting) => {
              const rate = cutting.cuttingRate ?? 0,
                bill = cutting.total * rate,
                paid = paidForReceipt(cutting),
                history = legacyPayment(cutting),
                status = paymentStatus(bill, paid),
                statusClass = status === "Lunas" ? "paid" : status === "DP sebagian" ? "partial" : "unpaid";
              return (
                <article key={cutting.id}>
                  <header>
                    <div>
                      <b>{cutting.officer || "Pelaksana belum dicatat"}</b>
                      <span>{cutting.id} · {cutting.modelName} · {cutting.poId}</span>
                    </div>
                    <em className={statusClass}>{status}</em>
                  </header>
                  <div className="payment-totals">
                    <p><span>Hasil cutting</span><b>{cutting.total} unit</b></p>
                    <p><span>Tarif</span><b>{rupiah(rate)}</b></p>
                    <p><span>Tagihan</span><b>{rupiah(bill)}</b></p>
                    <p><span>Sudah dibayar</span><b>{rupiah(paid)}</b></p>
                    <p><span>Sisa</span><strong>{rupiah(Math.max(0, bill - paid))}</strong></p>
                  </div>
                  {history.length > 0 && (
                    <div className="payment-history">
                      <b>RIWAYAT PEMBAYARAN</b>
                      {history.map((payment) => (
                        <div className={payment.voided ? "voided" : ""} key={payment.id}>
                          <span>
                            <strong>{payment.id}</strong>
                            <small>{payment.date} · {payment.pic}{payment.note ? ` · ${payment.note}` : ""}</small>
                          </span>
                          <b>{rupiah(payment.amount)}</b>
                          <span className="payment-history-actions">
                            <button type="button" onClick={() => onPrintPayment(cutting, payment, "cutting")}>Cetak</button>
                            {!payment.voided && <button type="button" className="danger" onClick={() => onVoidPayment(cutting, payment)}>Batalkan</button>}
                          </span>
                          {payment.voided && <small className="void-reason">DIBATALKAN · {payment.voidReason}</small>}
                        </div>
                      ))}
                    </div>
                  )}
                  <footer>
                    <span>{paid > 0 && cutting.paymentDate ? `Pembayaran terakhir ${cutting.paymentDate}` : rate > 0 ? "Belum ada pembayaran" : "Tarif cutting belum dicatat"}</span>
                    {rate <= 0 ? (
                      <button type="button" onClick={() => onSetCuttingRate(cutting)}>Atur tarif</button>
                    ) : paid < bill ? (
                      <span className="weekly-only-note">Pembayaran dicatat melalui rekap mingguan di atas.</span>
                    ) : null}
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {false && active === "Pengiriman Vendor" && sourceCount > 0 && (
        <div className="availability">
          <div>
            <small>BUNDLE TERSEDIA DI GUDANG</small>
            <b>{availableToShip}</b>
            <span>belum dikirim</span>
          </div>
          <p>
            Bundle yang sudah masuk pengiriman otomatis dikeluarkan dari daftar
            pilihan, tetapi tetap tersimpan di riwayat.
          </p>
        </div>
      )}
      {false && (active === "Pengiriman QC" || active === "Quality Control") &&
        sourceCount > 0 && (
          <div className="availability">
            <div>
              <small>
                {active === "Pengiriman QC"
                  ? "SETORAN SIAP DIKIRIM"
                  : "KIRIMAN MENUNGGU QC"}
              </small>
              <b>{availableOnce}</b>
              <span>transaksi</span>
            </div>
            <p>
              {active === "Pengiriman QC"
                ? "Setoran tetap tersedia sampai seluruh warna dan ukuran selesai dikirim ke QC."
                : "Kiriman yang sudah diperiksa otomatis keluar dari antrean aktif dan tetap tersimpan di riwayat."}
            </p>
          </div>
        )}
      {false && active === "Quality Control" && qcSummary.length > 0 && (
        <div className="qc-dashboard">
          {qcSummary.map(({ q, vendor, receipt, shipment }) => (
            <article key={q.id}>
              <header>
                <div>
                  <small>VENDOR ASAL</small>
                  <h3>{vendor}</h3>
                  <span>
                    {q.modelName} · {q.id}
                  </span>
                </div>
                <em>Selesai diperiksa</em>
              </header>
              <div>
                <p>
                  <span>Diperiksa</span>
                  <b>{q.total}</b>
                </p>
                <p className="pass">
                  <span>Lolos</span>
                  <b>{q.qcPassed ?? 0}</b>
                </p>
                <p className="reject">
                  <span>Reject</span>
                  <b>{q.qcReject ?? 0}</b>
                </p>
                <p className="repair">
                  <span>Repair</span>
                  <b>{q.qcRepair ?? 0}</b>
                </p>
              </div>
              <footer>
                SJ vendor: {shipment} · Penerimaan gudang: {receipt} · Kiriman
                QC: {q.sourceId}
              </footer>
            </article>
          ))}
        </div>
      )}
      {false && active === "Penerimaan Gudang" && activeVendorCards.length > 0 && (
        <div className="vendor-progress">
          {activeVendorCards.map((x) => (
            <article key={x.source.id}>
              <header>
                <div>
                  <small>VENDOR</small>
                  <h3>{x.source.destination}</h3>
                  <span>
                    {x.source.id} · {x.source.modelName}
                  </span>
                </div>
                <em>{x.status}</em>
              </header>
              <div>
                <p>
                  <span>Dikirim</span>
                  <b>{x.source.total}</b>
                </p>
                <p>
                  <span>Diterima gudang</span>
                  <b>{x.received}</b>
                </p>
                <p className="left">
                  <span>Masih di vendor</span>
                  <b>{x.left}</b>
                </p>
              </div>
              <footer>
                {x.count === 0
                  ? "Belum ada setoran"
                  : `${x.count} kali setoran`}
              </footer>
            </article>
          ))}
        </div>
      )}
      {false && active === "Penerimaan Gudang" && completedVendorCards.length > 0 && (
        <details className="completed-cuttings">
          <summary>
            <span>✓</span>
            <b>{completedVendorCards.length} pengiriman vendor selesai</b>
            <small>Sisa nol · dipindahkan dari daftar aktif</small>
          </summary>
          <div>
            {completedVendorCards.map((x) => (
              <p key={x.source.id}>
                <b>{x.source.id}</b>
                <span>
                  {x.source.destination} · {x.source.modelName}
                </span>
                <em>
                  {x.received} unit · {x.count} setoran
                </em>
              </p>
            ))}
          </div>
        </details>
      )}
      {false && active === "Penerimaan Gudang" && rows.length > 0 && (
        <section className="receipt-payment-list">
          <header>
            <div>
              <small>PEMBAYARAN SETORAN</small>
              <h2>Tagihan jahit vendor</h2>
              <span>Pembayaran mengikuti jumlah yang diterima gudang.</span>
            </div>
            <b>{rows.length} setoran</b>
          </header>
          <div className="receipt-payment-cards">
            {rows.map((receipt) => {
              const shipment = (allRecords["Pengiriman Vendor"] ?? []).find(
                  (x) => x.id === receipt.sourceId,
                ),
                rate = receipt.sewingRate ?? shipment?.sewingRate ?? 0,
                bill = receipt.total * rate,
                paid = paidForReceipt(receipt),
                history = legacyPayment(receipt),
                status = paymentStatus(bill, paid),
                statusClass =
                  status === "Lunas"
                    ? "paid"
                    : status === "DP sebagian"
                      ? "partial"
                      : "unpaid";
              return (
                <article key={receipt.id}>
                  <header>
                    <div>
                      <b>{shipment?.destination || "Vendor tidak ditemukan"}</b>
                      <span>{receipt.id} · {receipt.modelName}</span>
                    </div>
                    <em className={statusClass}>{status}</em>
                  </header>
                  <div className="payment-totals">
                    <p><span>Setoran</span><b>{receipt.total} unit</b></p>
                    <p><span>Tarif</span><b>{rupiah(rate)}</b></p>
                    <p><span>Tagihan</span><b>{rupiah(bill)}</b></p>
                    <p><span>Sudah dibayar</span><b>{rupiah(paid)}</b></p>
                    <p><span>Sisa</span><strong>{rupiah(Math.max(0, bill - paid))}</strong></p>
                  </div>
                  {history.length > 0 && (
                    <div className="payment-history">
                      <b>RIWAYAT PEMBAYARAN</b>
                      {history.map((payment) => (
                        <div
                          className={payment.voided ? "voided" : ""}
                          key={payment.id}
                        >
                          <span>
                            <strong>{payment.id}</strong>
                            <small>
                              {payment.date} · {payment.pic}
                              {payment.note ? ` · ${payment.note}` : ""}
                            </small>
                          </span>
                          <b>{rupiah(payment.amount)}</b>
                          <span className="payment-history-actions">
                            <button
                              type="button"
                              onClick={() => onPrintPayment(receipt, payment, "vendor")}
                            >
                              Cetak
                            </button>
                            {!payment.voided && (
                              <button
                                type="button"
                                className="danger"
                                onClick={() => onVoidPayment(receipt, payment)}
                              >
                                Batalkan
                              </button>
                            )}
                          </span>
                          {payment.voided && (
                            <small className="void-reason">
                              DIBATALKAN · {payment.voidReason}
                            </small>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <footer>
                    <span>
                      {paid > 0 && receipt.paymentDate
                        ? `Pembayaran terakhir ${receipt.paymentDate}`
                        : rate > 0
                          ? "Belum ada pembayaran"
                          : "Tarif belum dicatat pada pengiriman"}
                    </span>
                    {paid < bill && rate > 0 && (
                      <button type="button" onClick={() => onUpdatePayment(receipt, "vendor")}>
                        ＋ Catat DP / pembayaran
                      </button>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {active === "Bundle" && (
        <section className={`bundle-print-panel bundle-operations mobile-${bundleMobileView} ${productionColumnHiddenClasses}`}>
          <header>
            <div><h2>Bundle Siap Dikirim</h2></div>
            <b>{operationalBundles.length} data</b>
          </header>
          <div className="bundle-operation-tools">
            <label className="bundle-search">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Cari batch Cutting, bundle, model, warna, size, PIC..."
                value={bundleQuery}
                onChange={(event) => { setBundleQuery(event.target.value); setBundlePage(1); }}
              />
            </label>
            <div className="master-column-control production-column-control">
              <button type="button" className="master-column-button" aria-expanded={productionColumnMenu} onClick={() => setProductionColumnMenu((open) => !open)}><span>▥</span> Kolom</button>
              {productionColumnMenu && <div className="master-column-menu"><header><b>KOLOM</b><b>TAMPIL</b></header><label className="toggle-all"><span>Tampilkan semua</span><input type="checkbox" checked={allProductionColumnsVisible} onChange={() => setAllProductionColumns(!allProductionColumnsVisible)} /></label>{productionColumns.map((column, index) => <label key={column}><span>{column}</span><input type="checkbox" checked={visibleProductionColumns[index]} onChange={() => toggleProductionColumn(index)} /></label>)}</div>}
            </div>
            <select
              aria-label="Status bundle"
              value={bundleStatus}
              onChange={(event) => {
                setBundleStatus(
                  event.target.value as "ready" | "sent" | "all",
                );
                setSelectedOperationalBundles([]);
                setBundlePage(1);
              }}
            >
              <option value="ready">Belum dikirim</option>
              <option value="sent">Sudah dikirim</option>
              <option value="all">Semua status</option>
            </select>
            <select
              aria-label="Rentang waktu bundle"
              value={bundlePeriod}
              onChange={(event) => {
                setBundlePeriod(
                  event.target.value as "all" | "today" | "week" | "month",
                );
                setBundlePage(1);
              }}
            >
              <option value="all">Semua waktu</option>
              <option value="today">Hari ini</option>
              <option value="week">Minggu ini</option>
              <option value="month">Bulan ini</option>
            </select>
          </div>
          <div className="mobile-view-switch" role="group" aria-label="Tampilan Bundle siap dikirim">
            <button type="button" className={bundleMobileView === "cards" ? "active" : ""} onClick={() => setBundleMobileView("cards")}><span>☷</span> Kartu</button>
            <button type="button" className={bundleMobileView === "table" ? "active" : ""} onClick={() => setBundleMobileView("table")}><span>▥</span> Tabel</button>
          </div>
          {operationalBundles.length === 0 ? (
            <div className="bundle-operation-empty">
              <b>Tidak ada bundle sesuai filter</b>
              <span>
                Ubah pencarian, status, atau rentang waktu untuk melihat data
                lainnya.
              </span>
            </div>
          ) : (
            <div className="bundle-ledger-wrap"><table className="bundle-ledger-table"><thead><tr><th>No.</th><th>Pilih</th><th>Kode Bundle</th><th>Tanggal</th><th>Batch Cutting</th><th>Model</th><th>Warna & Ukuran</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
              {pagedOperationalBundles.map((bundle, bundleIndex) => {
                const sent = shippedIds.has(bundle.id),
                  selected = selectedOperationalBundles.includes(bundle.id),
                  incompatible =
                    !!selectedBundleModel &&
                    selectedBundleModel !== bundle.modelCode;
                return (
                  <tr className={selected ? "selected" : ""} key={bundle.id}>
                    <td data-label="No.">{(safeBundlePage - 1) * bundlePageSize + bundleIndex + 1}</td>
                    <td data-label="Pilih"><label className="bundle-ledger-check">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={sent || incompatible}
                      title={
                        incompatible
                          ? "Pilih bundle dari model yang sama"
                          : undefined
                      }
                      onChange={() =>
                        setSelectedOperationalBundles((current) =>
                          current.includes(bundle.id)
                            ? current.filter((id) => id !== bundle.id)
                            : [...current, bundle.id],
                        )
                      }
                    />
                  </label></td>
                  <td data-label="Kode Bundle"><span className="bundle-ledger-code"><strong>{shortBundleCode(bundle.id)}</strong><small>{bundle.id}</small></span></td>
                  <td data-label="Tanggal">{bundle.date}</td>
                  <td data-label="Batch Cutting"><span className="bundle-ledger-source"><b>{bundle.poId || bundle.sourceId}</b><small>{bundle.sourceId} · C{String(bundle.batchNo ?? 1).padStart(2, "0")}</small></span></td>
                  <td data-label="Model"><b>{bundle.modelName}</b><small>{bundle.modelCode}</small></td>
                  <td data-label="Warna & Ukuran"><span className="bundle-ledger-variants">{bundle.variants
                    .slice()
                    .sort((a, b) =>
                      a.color.localeCompare(b.color, "id") ||
                      compareSizes(a.size, b.size),
                    )
                    .map((variant) => (
                      <span key={`${variant.color}-${variant.size}`}>
                        {variant.color} · {variant.size}: <b>{variant.qty}</b>
                      </span>
                    ))}</span></td>
                  <td data-label="Total"><b>{bundle.total}</b> unit</td>
                  <td data-label="Status"><span className={`bundle-operation-status ${sent ? "sent" : "ready"}`}>{sent ? "Sudah dikirim" : "Siap dikirim"}</span></td>
                  <td data-label="Aksi"><button
                  type="button"
                  className="bundle-print-button prominent"
                  onClick={() => onPrintBundle(bundle)}
                >
                  ▣ Cetak
                </button></td>
              </tr>
                );
              })}
            </tbody></table></div>
          )}
          {operationalBundles.length > 0 && <footer className="process-ledger-footer bundle-ledger-footer"><label>Tampilkan <select value={bundlePageSize} onChange={(event) => { setBundlePageSize(Number(event.target.value)); setBundlePage(1); }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select> data</label><span>Menampilkan {(safeBundlePage - 1) * bundlePageSize + 1}–{Math.min(safeBundlePage * bundlePageSize, operationalBundles.length)} dari {operationalBundles.length}</span><div><button type="button" disabled={safeBundlePage <= 1} onClick={() => setBundlePage((page) => Math.max(1, page - 1))}>‹</button><b>{safeBundlePage}</b><button type="button" disabled={safeBundlePage >= bundlePageCount} onClick={() => setBundlePage((page) => Math.min(bundlePageCount, page + 1))}>›</button></div></footer>}
          {selectedBundleRows.length > 0 && (
            <div className="bundle-selection-bar">
              <div>
                <b>{selectedBundleRows.length} bundle dipilih</b>
                <span>{selectedBundleUnits} unit · model sama</span>
              </div>
              <button
                type="button"
                onClick={() => onSendBundles(selectedOperationalBundles)}
              >
                Kirim ke Vendor →
              </button>
            </div>
          )}
        </section>
      )}
      {active !== "Bundle" && !isModernProduction && !["Pengiriman Vendor", "Penerimaan Gudang"].includes(active) && !qcOperationalStages.has(active) && <section
        className={`panel table-panel ${isProcessLedger ? "process-ledger-panel" : ""} ${isModernProduction ? "production-action-panel" : ""} ${isProcessLedger ? productionColumnHiddenClasses : ""}`}
      >
        {isProcessLedger && <>{active === "Order Produksi" && <header className="process-ledger-header"><div><small>DATA PRODUKSI</small><h2>{processLedgerTitle}</h2><p>{processLedgerDescription}</p></div><b>{processTableRows.length} data</b></header>}{isModernProduction ? <div className="production-action-toolbar"><span>Catat pekerjaan baru untuk menambah antrean aktif.</span><button className="primary production-toolbar-add" type="button" disabled={productionAddDisabled} onClick={onAdd}>＋ {productionAddLabel}</button></div> : <div className="process-ledger-tools"><label><span>⌕</span><input value={processTableQuery} onChange={(e) => { setProcessTableQuery(e.target.value); setProcessTablePage(1); }} placeholder={`Cari kode, model, PIC, warna, atau ukuran...`} /></label><div className="master-column-control production-column-control"><button type="button" className="master-column-button" aria-expanded={productionColumnMenu} onClick={() => setProductionColumnMenu((open) => !open)}><span>▥</span> Kolom</button>{productionColumnMenu && <div className="master-column-menu"><header><b>KOLOM</b><b>TAMPIL</b></header><label className="toggle-all"><span>Tampilkan semua</span><input type="checkbox" checked={allProductionColumnsVisible} onChange={() => setAllProductionColumns(!allProductionColumnsVisible)} /></label>{productionColumns.map((column, index) => <label key={column}><span>{column}</span><input type="checkbox" checked={visibleProductionColumns[index]} onChange={() => toggleProductionColumn(index)} /></label>)}</div>}</div></div>}</>}
        {!isModernProduction && (rows.length === 0 || (isProcessLedger && processTableRows.length === 0) ? (
          <Empty
            title={rows.length > 0 ? "Tidak ada data sesuai pencarian" : `Belum ada ${active.toLowerCase()}`}
            text={
              rows.length > 0
                ? "Ubah kata pencarian untuk melihat transaksi lainnya."
                : blocked
                ? `Menunggu data dari ${info.source}.`
                : "Mulai transaksi pertama; kode akan dibuat otomatis."
            }
          />
        ) : (
          <div className={isProcessLedger ? "process-ledger-wrap" : "scroll"}>
            <table className={isProcessLedger ? "process-ledger-table" : ""}>
              <thead>
                <tr>
                  {isProcessLedger && <th>NO.</th>}
                  <th>{active === "Order Produksi" ? "NOMOR PO" : active === "Cutting" ? "KODE CUTTING" : "KODE PROSES"}</th>
                  <th>TANGGAL</th>
                  <th>{active === "Order Produksi" ? "REFERENSI" : "REFERENSI PRODUKSI"}</th>
                  <th>MODEL</th>
                  {(active === "Cutting" || active === "Sablon/Bordir") && <th>{active === "Cutting" ? "PIC CUTTING" : "PIC PROSES"}</th>}
                  <th>WARNA & UKURAN</th>
                  <th>TOTAL</th>
                  <th>STATUS</th>
                  {active === "Bundle" && <th>AKSI</th>}
                </tr>
              </thead>
              <tbody>
                {(isProcessLedger ? pagedProcessTableRows : rows).map((r, rowIndex) => (
                  <tr key={r.id}>
                    {isProcessLedger && <td data-label="No.">{(safeProcessTablePage - 1) * processTablePageSize + rowIndex + 1}</td>}
                    <td data-label={active === "Order Produksi" ? "Nomor PO" : "Kode Cutting"}>
                      <b>{r.id}</b>
                    </td>
                    <td data-label="Tanggal">{r.date}</td>
                    <td data-label="Referensi Produksi">{active === "Order Produksi" ? "Master Jaket" : r.poId === r.id ? "Batch Cutting" : r.poId || "Batch Cutting"}</td>
                    <td data-label="Model">
                      <b>{r.modelName}</b>
                      <small>{r.modelCode}</small>
                      {r.bundleId && (
                        <small>Bundle {shortBundleCode(r.bundleId)}</small>
                      )}
                    </td>
                    {(active === "Cutting" || active === "Sablon/Bordir") && <td data-label={active === "Cutting" ? "PIC Cutting" : "PIC Proses"}><b>{r.officer || "—"}</b></td>}
                    <td data-label="Warna & Ukuran">
                      <span className="process-variant-list">
                        {r.variants.slice().sort((a, b) => a.color.localeCompare(b.color, "id") || compareSizes(a.size, b.size))
                          .map((v) => `${v.color} ${v.size}: ${v.qty}`)
                          .map((value) => <small key={value}>{value}</small>)}
                      </span>
                    </td>
                    <td data-label="Total">
                      <b>{r.total}</b> unit
                    </td>
                    <td data-label="Status">
                      <span className={`status ${active === "Cutting" ? cuttingWorkflowStatus(r, allRecords).tone : ""}`}>
                        {active === "Cutting"
                          ? cuttingWorkflowStatus(r, allRecords).label
                          : r.remainingStatus || r.status}
                      </span>
                    </td>
                    {active === "Bundle" && (
                      <td>
                        <button
                          type="button"
                          className="bundle-print-button"
                          onClick={() => onPrintBundle(r)}
                        >
                          ▣ Cetak kartu
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {!isModernProduction && isProcessLedger && processTableRows.length > 0 && <footer className="process-ledger-footer"><label>Tampilkan <select value={processTablePageSize} onChange={(e) => { setProcessTablePageSize(Number(e.target.value)); setProcessTablePage(1); }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select> data</label><span>Menampilkan {(safeProcessTablePage - 1) * processTablePageSize + 1}–{Math.min(safeProcessTablePage * processTablePageSize, processTableRows.length)} dari {processTableRows.length}</span><div><button type="button" disabled={safeProcessTablePage <= 1} onClick={() => setProcessTablePage((page) => Math.max(1, page - 1))}>‹</button><b>{safeProcessTablePage}</b><button type="button" disabled={safeProcessTablePage >= processTablePageCount} onClick={() => setProcessTablePage((page) => Math.min(processTablePageCount, page + 1))}>›</button></div></footer>}
      </section>}
    </div>
  );
}
function Notes({
  notes,
  query,
  setQuery,
  onPrint,
}: {
  notes: Note[];
  query: string;
  setQuery: (x: string) => void;
  onPrint: (n: Note) => void;
}) {
  const groups = [
    {
      no: "01",
      title: "Kirim ke Vendor",
      desc: "Gudang cutting → vendor jahit",
      match: (n: Note) => n.process === "Gudang Cutting → Vendor Jahit",
    },
    {
      no: "02",
      title: "Kirim ke Quality Control",
      desc: "Gudang → Quality Control",
      match: (n: Note) => n.process === "Gudang → Quality Control",
    },
  ];
  return (
    <>
      <div className="page-title">
        <div>
          <p className="overline">DOKUMEN OTOMATIS</p>
          <h1>Dashboard Surat Jalan</h1>
          <span>
            Surat jalan hanya dibuat saat barang dikirim ke vendor atau ke Quality Control.
          </span>
        </div>
      </div>
      <div className="sj-overview">
        {groups.map((g) => {
          const count = notes.filter(g.match).length;
          return (
            <article key={g.no}>
              <i>{g.no}</i>
              <div>
                <b>{g.title}</b>
                <span>{g.desc}</span>
              </div>
              <strong>
                {count}
                <small> surat jalan</small>
              </strong>
            </article>
          );
        })}
      </div>
      <div className="sj-search">
        <label>
          <span>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nomor surat jalan, sumber, model, atau proses..."
          />
        </label>
      </div>
      <div className="sj-groups">
        {groups.map((g) => {
          const rows = notes.filter(g.match);
          return (
            <section className="panel sj-section" key={g.no}>
              <header>
                <i>{g.no}</i>
                <div>
                  <h2>{g.title}</h2>
                  <p>{g.desc}</p>
                </div>
                <b>{rows.length} dokumen</b>
              </header>
              {rows.length === 0 ? (
                <Empty
                  title={`Belum ada surat jalan ${g.title.toLowerCase()}`}
                  text="Dokumen akan muncul otomatis saat proses terkait disimpan."
                />
              ) : (
                <NoteTable notes={rows} onPrint={onPrint} />
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
function NoteTable({
  notes,
  onPrint,
}: {
  notes: Note[];
  onPrint: (n: Note) => void;
}) {
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th>NO.</th>
            <th>NOMOR SURAT JALAN</th>
            <th>TANGGAL</th>
            <th>SUMBER</th>
            <th>MODEL & RINCIAN</th>
            <th>DARI → TUJUAN</th>
            <th>JUMLAH</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {notes.map((n, index) => (
            <tr key={n.id}>
              <td>
                <b>{index + 1}</b>
              </td>
              <td>
                <b>{n.id}</b>
              </td>
              <td>{n.date}</td>
              <td>{n.sourceId}</td>
              <td>
                <b>{n.modelName}</b>
                {n.bundleIds?.length ? (
                  <small>
                    Bundle: {n.bundleIds.map(shortBundleCode).join(", ")}
                  </small>
                ) : null}
                <small>
                  {n.variants
                    .map((v) => `${v.color} ${v.size}: ${v.qty}`)
                    .join(" · ")}
                </small>
              </td>
              <td>
                <b>
                  {n.from} → {n.to}
                </b>
              </td>
              <td>
                <b>{n.total}</b> unit
              </td>
              <td>
                <button onClick={() => onPrint(n)}>▣ Cetak</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Reports({ data, go, mode }: { data: AppData; go: (stage: string) => void; mode: "production" | "finance" }) {
  const now = new Date(),
    today = localDateString(now),
    monthStart = `${today.slice(0, 8)}01`,
    preferredFinancePICs = data.pics.filter((pic) => pic.active && /finance|keuangan/i.test(pic.role)),
    financePICOptions = preferredFinancePICs.length > 0 ? preferredFinancePICs : data.pics.filter((pic) => pic.active),
    requesterPICOptions = data.pics.filter((pic) => pic.active && !/finance|keuangan/i.test(pic.role));
  const [financePeriod, setFinancePeriod] = useState<"today" | "week" | "month" | "custom" | "all">("month");
  const [customStart, setCustomStart] = useState(monthStart);
  const [customEnd, setCustomEnd] = useState(today);
  const [reportTab, setReportTab] = useState<"payment" | "production" | "vendor">(mode === "finance" ? "payment" : "production");
  const [showFinancePrint, setShowFinancePrint] = useState(false);
  const [financeQuery, setFinanceQuery] = useState("");
  const [financeKind, setFinanceKind] = useState<"all" | "Cutting" | "Vendor jahit" | "Sablon/Bordir" | "Quality Control">("all");
  const [financePage, setFinancePage] = useState(1);
  const [financePageSize, setFinancePageSize] = useState(10);
  const [expandedFinanceRow, setExpandedFinanceRow] = useState<string | null>(null);
  const [selectedFinanceWeeks, setSelectedFinanceWeeks] = useState<string[]>([]);
  const [financeWeekScope, setFinanceWeekScope] = useState<"all" | "week" | "custom">("all");
  const [financeWeekStart, setFinanceWeekStart] = useState(monthStart);
  const [financeWeekEnd, setFinanceWeekEnd] = useState(today);
  const [productionQuery, setProductionQuery] = useState("");
  const [productionStatus, setProductionStatus] = useState<"all" | "active" | "done">("done");
  const [productionPage, setProductionPage] = useState(1);
  const [productionPageSize, setProductionPageSize] = useState(10);
  const [selectedProductionPO, setSelectedProductionPO] = useState<string | null>(null);
  const [vendorReportQuery, setVendorReportQuery] = useState("");
  const [vendorReportStatus, setVendorReportStatus] = useState<"all" | "active" | "done">("done");
  const [vendorReportPage, setVendorReportPage] = useState(1);
  const [vendorReportPageSize, setVendorReportPageSize] = useState(10);
  const [selectedVendorReport, setSelectedVendorReport] = useState<string | null>(null);
  const [financePICCode, setFinancePICCode] = useState(
    financePICOptions.find((pic) => /herdita/i.test(pic.name))?.code ?? financePICOptions[0]?.code ?? "",
  );
  const [requesterPICCode, setRequesterPICCode] = useState(
    requesterPICOptions.find((pic) => /ceceng/i.test(pic.name))?.code ?? requesterPICOptions[0]?.code ?? "",
  );
  const week = mondaySaturday(now),
    rangeStart = financePeriod === "today" ? today : financePeriod === "week" ? week.start : financePeriod === "month" ? monthStart : financePeriod === "custom" ? customStart : "",
    rangeEnd = financePeriod === "today" ? today : financePeriod === "week" ? week.end : financePeriod === "month" ? today : financePeriod === "custom" ? customEnd : "",
    inPeriod = (date: string) => financePeriod === "all" || (!!date && date >= rangeStart && date <= rangeEnd),
    periodLabel = financePeriod === "all" ? "Semua waktu" : `${rangeStart} – ${rangeEnd}`,
    allVendorReceipts = data.records["Penerimaan Gudang"] ?? [],
    vendorReceipts = allVendorReceipts.filter((receipt) => inPeriod(receipt.date)),
    vendorShipments = data.records["Pengiriman Vendor"] ?? [],
    cuttingRows = (data.records.Cutting ?? []).filter((row) => inPeriod(row.date)),
    decorationRows = (data.records["Sablon/Bordir"] ?? []).filter((row) => inPeriod(row.date)),
    qcRows = (data.records["Quality Control"] ?? []).filter((row) => inPeriod(row.date)),
    qcShipments = data.records["Pengiriman QC"] ?? [],
    reportQCRate = (row: RecordRow) => {
      if ((row.qcRate ?? 0) > 0) return row.qcRate ?? 0;
      const shipment = qcShipments.find((item) => item.id === row.sourceId);
      return data.qcLocations.find(
        (location) =>
          location.location === shipment?.destination ||
          location.recipient === row.qcOfficer,
      )?.rate ?? 0;
    },
    reportQCPayee = (row: RecordRow) => {
      const shipment = qcShipments.find((item) => item.id === row.sourceId),
        location = data.qcLocations.find(
          (item) =>
            item.location === shipment?.destination ||
            item.recipient === row.qcOfficer,
        );
      return row.qcOfficer || location?.recipient || shipment?.destination || "Petugas QC belum dicatat";
    },
    vendorBill = vendorReceipts.reduce((total, receipt) => {
      const shipment = vendorShipments.find((item) => item.id === receipt.sourceId),
        rate = receipt.sewingRate ?? shipment?.sewingRate ?? 0;
      return total + receipt.total * rate;
    }, 0),
    vendorPaid = vendorReceipts.reduce((total, receipt) => total + paidForReceipt(receipt), 0),
    cuttingBill = cuttingRows.reduce((total, row) => total + row.total * (row.cuttingRate ?? 0), 0),
    qcBill = qcRows.reduce((total, row) => total + row.total * reportQCRate(row), 0),
    decorationBill = decorationRows.reduce((total, row) => total + row.total * (row.decorationRate ?? 0), 0),
    cuttingPaid = cuttingRows.reduce((total, row) => total + paidForReceipt(row), 0) + allocatedWeeklyPaid(data.weeklyPayments, "cutting", new Set(cuttingRows.map((row) => row.id))),
    qcPaid = allocatedWeeklyPaid(data.weeklyPayments, "qc", new Set(qcRows.map((row) => row.id))),
    decorationPaid = decorationRows.reduce((total, row) => total + paidForReceipt(row), 0),
    totalBill = vendorBill + cuttingBill + decorationBill + qcBill,
    totalPaid = vendorPaid + cuttingPaid + decorationPaid + qcPaid,
    totalRemaining = Math.max(0, totalBill - totalPaid),
    financePIC = financePICOptions.find((pic) => pic.code === financePICCode) ?? financePICOptions[0],
    financePhone = financePIC?.phone.replace(/\D/g, "").replace(/^0/, "62") ?? "",
    vendorBatchIds = new Set(
      data.weeklyPayments
        .filter((payment) => payment.kind === "vendor")
        .map((payment) => payment.id),
    ),
    decorationBatchIds = new Set(
      data.weeklyPayments
        .filter((payment) => payment.kind === "decoration")
        .map((payment) => payment.id),
    ),
    paymentRows = [
      ...data.weeklyPayments.map((payment) => ({ id: payment.id, date: payment.paymentDate, type: payment.kind === "cutting" ? "Cutting" : payment.kind === "qc" ? "QC" : payment.kind === "decoration" ? "Sablon/Bordir" : "Vendor jahit", payee: payment.payee, amount: payment.paymentAmount ?? payment.totalAmount, status: payment.voided ? "Dibatalkan" : "Tercatat" })),
      ...cuttingRows.flatMap((row) => legacyPayment(row).map((payment) => ({ id: payment.id, date: payment.date, type: "Cutting (riwayat lama)", payee: row.officer || "Pelaksana Cutting", amount: payment.amount, status: payment.voided ? "Dibatalkan" : "Tercatat" }))),
      ...vendorReceipts.flatMap((receipt) => legacyPayment(receipt).filter((payment) => !vendorBatchIds.has(payment.id)).map((payment) => {
        const shipment = vendorShipments.find((item) => item.id === receipt.sourceId);
        return { id: payment.id, date: payment.date, type: "Vendor jahit", payee: shipment?.destination || "Vendor", amount: payment.amount, status: payment.voided ? "Dibatalkan" : "Tercatat" };
      })),
      ...decorationRows.flatMap((row) => legacyPayment(row).filter((payment) => !decorationBatchIds.has(payment.id)).map((payment) => ({
        id: payment.id,
        date: payment.date,
        type: "Sablon/Bordir",
        payee: row.destination || "Vendor dekorasi",
        amount: payment.amount,
        status: payment.voided ? "Dibatalkan" : "Tercatat",
      }))),
    ].filter((payment) => inPeriod(payment.date)).sort((a, b) => b.date.localeCompare(a.date));
  const requesterPIC = requesterPICOptions.find((pic) => pic.code === requesterPICCode),
    transferMap = new Map<string, { type: string; payee: string; bankName: string; accountNumber: string; accountHolder: string; bill: number; paid: number }>();
  const addTransfer = (type: string, payee: string, bill: number, paid: number, account?: { bankName?: string; accountNumber?: string; accountHolder?: string }) => {
    const key = `${type}|${payee}`,
      current = transferMap.get(key);
    transferMap.set(key, {
      type,
      payee,
      bankName: account?.bankName ?? current?.bankName ?? "",
      accountNumber: account?.accountNumber ?? current?.accountNumber ?? "",
      accountHolder: account?.accountHolder ?? current?.accountHolder ?? payee,
      bill: (current?.bill ?? 0) + bill,
      paid: (current?.paid ?? 0) + paid,
    });
  };
  vendorReceipts.forEach((receipt) => {
    const shipment = vendorShipments.find((item) => item.id === receipt.sourceId),
      vendor = data.vendors.find((item) => item.name === shipment?.destination),
      rate = receipt.sewingRate ?? shipment?.sewingRate ?? 0;
    addTransfer("Vendor jahit", shipment?.destination || "Vendor", receipt.total * rate, paidForReceipt(receipt), vendor);
  });
  decorationRows.forEach((row) => {
    const vendor = data.vendors.find((item) => item.name === row.destination);
    addTransfer(
      "Sablon/Bordir",
      row.destination || "Vendor dekorasi",
      row.total * (row.decorationRate ?? 0),
      paidForReceipt(row),
      vendor,
    );
  });
  const groupedWork = (kind: "cutting" | "qc", rows: RecordRow[]) => {
    const groups = new Map<string, { bill: number; account?: PIC | QCLocation }>();
    rows.forEach((row) => {
      const payee = kind === "cutting" ? row.officer || "Pelaksana Cutting" : reportQCPayee(row),
        account = kind === "cutting" ? data.pics.find((pic) => pic.name === payee) : data.qcLocations.find((location) => location.recipient === payee),
        rate = kind === "cutting" ? row.cuttingRate ?? 0 : reportQCRate(row),
        current = groups.get(payee);
      groups.set(payee, { bill: (current?.bill ?? 0) + row.total * rate, account: account ?? current?.account });
    });
    groups.forEach((value, payee) => {
      const groupRows = rows.filter((row) => (kind === "cutting" ? row.officer || "Pelaksana Cutting" : reportQCPayee(row)) === payee),
        paid = allocatedWeeklyPaid(data.weeklyPayments, kind, new Set(groupRows.map((row) => row.id))) + (kind === "cutting" ? groupRows.reduce((total, row) => total + paidForReceipt(row), 0) : 0);
      addTransfer(kind === "cutting" ? "Cutting" : "Quality Control", payee, value.bill, paid, value.account);
    });
  };
  groupedWork("cutting", cuttingRows);
  groupedWork("qc", qcRows);
  type FinanceWeekDraft = {
    key: string;
    type: "Cutting" | "Vendor jahit" | "Sablon/Bordir" | "Quality Control";
    payee: string;
    start: string;
    end: string;
    bill: number;
    records: RecordRow[];
  };
  const weeklyTransferMap = new Map<string, FinanceWeekDraft>();
  const addWeeklyTransfer = (
    type: FinanceWeekDraft["type"],
    payee: string,
    row: RecordRow,
    bill: number,
  ) => {
    const period = mondaySaturday(new Date(`${row.date}T12:00:00`)),
      key = `${type}|${payee}|${period.start}`,
      current = weeklyTransferMap.get(key);
    weeklyTransferMap.set(key, {
      key,
      type,
      payee,
      start: period.start,
      end: period.end,
      bill: (current?.bill ?? 0) + bill,
      records: [...(current?.records ?? []), row],
    });
  };
  vendorReceipts.forEach((receipt) => {
    const shipment = vendorShipments.find((item) => item.id === receipt.sourceId),
      rate = receipt.sewingRate ?? shipment?.sewingRate ?? 0;
    addWeeklyTransfer("Vendor jahit", shipment?.destination || "Vendor", receipt, receipt.total * rate);
  });
  decorationRows.forEach((row) =>
    addWeeklyTransfer(
      "Sablon/Bordir",
      row.destination || "Vendor dekorasi",
      row,
      row.total * (row.decorationRate ?? 0),
    ),
  );
  cuttingRows.forEach((row) =>
    addWeeklyTransfer(
      "Cutting",
      row.officer || "Pelaksana Cutting",
      row,
      row.total * (row.cuttingRate ?? 0),
    ),
  );
  qcRows.forEach((row) =>
    addWeeklyTransfer(
      "Quality Control",
      reportQCPayee(row),
      row,
      row.total * reportQCRate(row),
    ),
  );
  const financeWeeklyRows = [...weeklyTransferMap.values()]
    .map((row) => {
      const recordIds = new Set(row.records.map((record) => record.id)),
        paid = row.type === "Vendor jahit" || row.type === "Sablon/Bordir"
          ? row.records.reduce((total, record) => total + paidForReceipt(record), 0)
          : allocatedWeeklyPaid(
              data.weeklyPayments,
              row.type === "Cutting" ? "cutting" : "qc",
              recordIds,
            ) + (row.type === "Cutting"
              ? row.records.reduce((total, record) => total + paidForReceipt(record), 0)
              : 0),
        remaining = Math.max(0, row.bill - paid);
      return {
        ...row,
        paid,
        remaining,
        status: row.bill <= 0 || paid <= 0 ? "Belum dibayar" : remaining > 0 ? "DP sebagian" : "Lunas",
      };
    })
    .sort((a, b) => b.start.localeCompare(a.start));
  const financeLedgerRows = [...transferMap.values()].map((row) => {
      const remaining = Math.max(0, row.bill - row.paid);
      return {
        ...row,
        remaining,
        status: row.bill <= 0 || row.paid <= 0 ? "Belum dibayar" : remaining > 0 ? "DP sebagian" : "Lunas",
        stage: row.type === "Cutting" ? "Cutting" : row.type === "Vendor jahit" ? "Penerimaan Gudang" : row.type === "Sablon/Bordir" ? "Sablon/Bordir" : "Quality Control",
        weeks: financeWeeklyRows.filter((weekRow) => weekRow.type === row.type && weekRow.payee === row.payee),
      };
    }),
    transferRows = financeLedgerRows.filter((row) => row.remaining > 0),
    filteredFinanceRows = financeLedgerRows.filter((row) => {
      const query = financeQuery.trim().toLowerCase(),
        matchesKind = financeKind === "all" || row.type === financeKind,
        matchesQuery = !query || [row.type, row.payee, row.bankName, row.accountNumber, row.accountHolder, row.status].join(" ").toLowerCase().includes(query);
      return matchesKind && matchesQuery;
    }),
    financePageCount = Math.max(1, Math.ceil(filteredFinanceRows.length / financePageSize)),
    safeFinancePage = Math.min(financePage, financePageCount),
    pagedFinanceRows = filteredFinanceRows.slice((safeFinancePage - 1) * financePageSize, safeFinancePage * financePageSize);
  const childrenOf = (stage: string, sourceId: string) => (data.records[stage] ?? []).filter((row) => row.sourceId === sourceId),
    balanceAfter = (row: RecordRow, childStage: string) => sum(subtractVariants(row.variants, childrenOf(childStage, row.id).flatMap((child) => child.variants))),
    belongsToPO = (row: RecordRow, po: RecordRow) => row.poId === po.id || row.id === po.id,
    qcPassedVariants = (row: RecordRow) => (row.qcDetails ?? []).map((detail) => ({ color: detail.color, size: detail.size, qty: detail.passed })).filter((variant) => variant.qty > 0),
    productionRoots = [
      ...(data.records.Cutting ?? []).filter((row) => !row.sourceId),
      ...(data.records["Order Produksi"] ?? []),
    ],
    productionRows = productionRoots.filter((po) => inPeriod(po.date)).map((po) => {
      const cuttings = (data.records.Cutting ?? []).filter((row) => belongsToPO(row, po)),
        bundles = (data.records.Bundle ?? []).filter((row) => belongsToPO(row, po)),
        vendorSends = (data.records["Pengiriman Vendor"] ?? []).filter((row) => belongsToPO(row, po)),
        receipts = (data.records["Penerimaan Gudang"] ?? []).filter((row) => belongsToPO(row, po)),
        qcSends = (data.records["Pengiriman QC"] ?? []).filter((row) => belongsToPO(row, po)),
        qcChecks = [...(data.records["Quality Control"] ?? []), ...(data.records["QC Ulang"] ?? [])].filter((row) => belongsToPO(row, po)),
        reworks = (data.records.Rework ?? []).filter((row) => belongsToPO(row, po)),
        reworkReceipts = (data.records["Penerimaan Rework"] ?? []).filter((row) => belongsToPO(row, po)),
        stocks = (data.records["Stok Barang Jadi"] ?? []).filter((row) => belongsToPO(row, po)),
        beforeCutting = po.stage === "Cutting" ? 0 : balanceAfter(po, "Cutting"),
        cuttingArea = cuttings.reduce((total, row) => total + balanceAfter(row, "Bundle"), 0) + bundles.reduce((total, row) => total + balanceAfter(row, "Pengiriman Vendor"), 0),
        atVendor = vendorSends.reduce((total, row) => total + balanceAfter(row, "Penerimaan Gudang"), 0),
        beforeQC = receipts.reduce((total, row) => total + balanceAfter(row, "Pengiriman QC"), 0) + qcSends.reduce((total, row) => total + balanceAfter(row, "Quality Control"), 0),
        readyStock = qcChecks.reduce((total, row) => total + sum(subtractVariants(qcPassedVariants(row), childrenOf("Stok Barang Jadi", row.id).flatMap((child) => child.variants))), 0),
        repair = (data.records["Quality Control"] ?? []).filter((row) => belongsToPO(row, po)).reduce((total, row) => {
          const repairVariants = (row.qcDetails ?? []).map((detail) => ({ color: detail.color, size: detail.size, qty: detail.repair })).filter((variant) => variant.qty > 0);
          return total + sum(subtractVariants(repairVariants, childrenOf("Rework", row.id).flatMap((child) => child.variants)));
        }, 0) + reworks.reduce((total, row) => total + balanceAfter(row, "Penerimaan Rework"), 0) + reworkReceipts.reduce((total, row) => total + balanceAfter(row, "QC Ulang"), 0) + (data.records["QC Ulang"] ?? []).filter((row) => belongsToPO(row, po)).reduce((total, row) => total + (row.qcRepair ?? 0), 0),
        reject = qcChecks.reduce((total, row) => total + (row.qcReject ?? 0), 0),
        stock = stocks.reduce((total, row) => total + row.total, 0),
        activeUnits = Math.max(0, po.total - stock - reject),
        finished = activeUnits === 0,
        status = finished ? "Selesai" : atVendor > 0 ? "Sedang dijahit" : beforeQC > 0 ? "Menunggu QC" : repair > 0 ? "Repair" : readyStock > 0 ? "Siap masuk stok" : cuttingArea > 0 ? "Cutting & bundle" : beforeCutting > 0 ? "Belum cutting" : "Dalam proses",
        vendors = [...new Set(vendorSends.map((row) => row.destination).filter(Boolean))].join(", ") || "—";
      return { po, beforeCutting, cuttingArea, atVendor, beforeQC, readyStock, repair, reject, stock, activeUnits, finished, status, vendors };
    }),
    filteredProductionRows = productionRows.filter((row) => {
      const query = productionQuery.trim().toLowerCase(),
        matchesQuery = !query || [row.po.id, row.po.modelName, row.po.modelCode, row.vendors, row.status].join(" ").toLowerCase().includes(query),
        matchesStatus = productionStatus === "all" || (productionStatus === "done" ? row.finished : !row.finished);
      return matchesQuery && matchesStatus;
    }),
    productionPageCount = Math.max(1, Math.ceil(filteredProductionRows.length / productionPageSize)),
    safeProductionPage = Math.min(productionPage, productionPageCount),
    pagedProductionRows = filteredProductionRows.slice((safeProductionPage - 1) * productionPageSize, safeProductionPage * productionPageSize),
    selectedProduction = productionRows.find((row) => row.po.id === selectedProductionPO);
  const vendorReportMap = new Map<string, { key: string; vendor: string; poId: string; modelName: string; modelCode: string; shipments: RecordRow[]; receipts: RecordRow[] }>();
  (data.records["Pengiriman Vendor"] ?? []).filter((shipment) => inPeriod(shipment.date)).forEach((shipment) => {
    const vendor = shipment.destination || "Vendor belum dicatat",
      poId = shipment.poId || "Referensi Cutting tidak ditemukan",
      key = `${vendor}|${poId}|${shipment.modelCode}`,
      current = vendorReportMap.get(key),
      receipts = (data.records["Penerimaan Gudang"] ?? []).filter((receipt) => receipt.sourceId === shipment.id);
    vendorReportMap.set(key, {
      key,
      vendor,
      poId,
      modelName: shipment.modelName,
      modelCode: shipment.modelCode,
      shipments: [...(current?.shipments ?? []), shipment],
      receipts: [...(current?.receipts ?? []), ...receipts],
    });
  });
  const vendorReportRows = [...vendorReportMap.values()].map((group) => {
      const sentVariants = mergeVariants(group.shipments),
        receivedVariants = mergeVariants(group.receipts),
        remainingVariants = subtractVariants(sentVariants, receivedVariants),
        sent = sum(sentVariants),
        received = sum(receivedVariants),
        remaining = sum(remainingVariants),
        bundleIds = [...new Set(group.shipments.map((shipment) => shipment.bundleId || shipment.sourceId).filter(Boolean))],
        firstSent = [...group.shipments].sort((a, b) => a.date.localeCompare(b.date))[0]?.date || today,
        lastReceipt = [...group.receipts].sort((a, b) => b.date.localeCompare(a.date))[0]?.date || "—",
        duration = Math.max(0, Math.floor((new Date(`${today}T12:00:00`).getTime() - new Date(`${firstSent}T12:00:00`).getTime()) / 86400000)),
        status = remaining <= 0 ? "Selesai" : received > 0 ? "Setoran sebagian" : "Sedang dijahit";
      return { ...group, sent, received, remaining, remainingVariants, bundleIds, firstSent, lastReceipt, duration, status, finished: remaining <= 0 };
    }),
    filteredVendorReportRows = vendorReportRows.filter((row) => {
      const query = vendorReportQuery.trim().toLowerCase(),
        matchesQuery = !query || [row.vendor, row.poId, row.modelName, row.modelCode, row.bundleIds.join(" "), row.status].join(" ").toLowerCase().includes(query),
        matchesStatus = vendorReportStatus === "all" || (vendorReportStatus === "done" ? row.finished : !row.finished);
      return matchesQuery && matchesStatus;
    }),
    vendorReportPageCount = Math.max(1, Math.ceil(filteredVendorReportRows.length / vendorReportPageSize)),
    safeVendorReportPage = Math.min(vendorReportPage, vendorReportPageCount),
    pagedVendorReportRows = filteredVendorReportRows.slice((safeVendorReportPage - 1) * vendorReportPageSize, safeVendorReportPage * vendorReportPageSize),
    selectedVendorReportRow = vendorReportRows.find((row) => row.key === selectedVendorReport);
  const whatsappURL = (message: string) => `https://wa.me/${financePhone}?text=${encodeURIComponent(message)}`,
    summaryReminder = [
      `Halo ${financePIC?.name || "Finance"}, berikut pengingat pembayaran produksi Oims.`,
      `Pengaju: ${requesterPIC?.name || "PIC Produksi"}`,
      `Periode: ${periodLabel}`,
      "",
      `Cutting — tagihan ${rupiah(cuttingBill)}, dibayar ${rupiah(cuttingPaid)}, sisa ${rupiah(Math.max(0, cuttingBill - cuttingPaid))}`,
      `Vendor jahit — tagihan ${rupiah(vendorBill)}, dibayar ${rupiah(vendorPaid)}, sisa ${rupiah(Math.max(0, vendorBill - vendorPaid))}`,
      `Sablon/Bordir — tagihan ${rupiah(decorationBill)}, dibayar ${rupiah(decorationPaid)}, sisa ${rupiah(Math.max(0, decorationBill - decorationPaid))}`,
      `Quality Control — tagihan ${rupiah(qcBill)}, dibayar ${rupiah(qcPaid)}, sisa ${rupiah(Math.max(0, qcBill - qcPaid))}`,
      "",
      `Total tagihan: ${rupiah(totalBill)}`,
      `Sudah dibayar: ${rupiah(totalPaid)}`,
      `Total sisa: ${rupiah(totalRemaining)}`,
      "",
      "Daftar transfer:",
      ...transferRows.map((row, index) => `${index + 1}. ${row.payee} (${row.type}) — ${row.bankName && row.accountNumber ? `${row.bankName} ${row.accountNumber} a.n. ${row.accountHolder}` : "rekening belum diisi"} — ${rupiah(row.remaining)}`),
      "Mohon diperiksa dan ditindaklanjuti. Pesan ini disiapkan otomatis oleh Oims.",
    ].join("\n");
  const toggleFinanceWeek = (key: string) =>
    setSelectedFinanceWeeks((selected) =>
      selected.includes(key)
        ? selected.filter((item) => item !== key)
        : [...selected, key],
    );
  const selectedReminder = (
    item: (typeof financeLedgerRows)[number],
    weeks: (typeof financeWeeklyRows),
  ) => {
    const totalBillSelected = weeks.reduce((total, weekRow) => total + weekRow.bill, 0),
      totalPaidSelected = weeks.reduce((total, weekRow) => total + weekRow.paid, 0),
      totalRemainingSelected = weeks.reduce((total, weekRow) => total + weekRow.remaining, 0),
      weekDetails = weeks.flatMap((weekRow, weekIndex) => {
        const poMap = new Map<string, { poId: string; modelName: string; units: number; amount: number }>();
        weekRow.records.forEach((record) => {
          const shipment = vendorShipments.find((candidate) => candidate.id === record.sourceId),
            rate = item.type === "Cutting"
              ? record.cuttingRate ?? 0
              : item.type === "Vendor jahit"
                ? record.sewingRate ?? shipment?.sewingRate ?? 0
                : item.type === "Sablon/Bordir"
                  ? record.decorationRate ?? 0
                : reportQCRate(record),
            poId = record.poId || "Referensi Cutting belum tercatat",
            key = `${poId}|${record.modelName}`,
            current = poMap.get(key);
          poMap.set(key, {
            poId,
            modelName: record.modelName,
            units: (current?.units ?? 0) + record.total,
            amount: (current?.amount ?? 0) + record.total * rate,
          });
        });
        return [
          `${weekIndex + 1}. Periode ${weekRow.start} – ${weekRow.end}`,
          ...[...poMap.values()].map(
            (poLine) =>
              `   - ${poLine.poId} — ${poLine.modelName}: ${poLine.units} unit, tagihan ${rupiah(poLine.amount)}`,
          ),
          `   Dibayar ${rupiah(weekRow.paid)} · Sisa ${rupiah(weekRow.remaining)}`,
        ];
      });
    return [
      `Halo ${financePIC?.name || "Finance"}, ada pengajuan pembayaran produksi Oims yang perlu ditindaklanjuti.`,
      `Pengaju: ${requesterPIC?.name || "PIC Produksi"}`,
      `Proses: ${item.type}`,
      `Penerima: ${item.payee}`,
      "",
      "Rincian minggu yang dipilih:",
      ...weekDetails,
      "",
      `Total tagihan terpilih: ${rupiah(totalBillSelected)}`,
      `Sudah dibayar: ${rupiah(totalPaidSelected)}`,
      `Total yang diajukan: ${rupiah(totalRemainingSelected)}`,
      "",
      "Tujuan transfer:",
      `Bank: ${item.bankName || "Belum dilengkapi"}`,
      `Nomor rekening: ${item.accountNumber || "Belum dilengkapi"}`,
      `Penerima rekening: ${item.accountHolder || item.payee || "Belum dilengkapi"}`,
      "Mohon diperiksa. Pesan ini belum dikirim otomatis.",
    ].join("\n");
  };
  function exportFinanceCSV() {
    const csvRows: Array<Array<string | number>> = [
      ["LAPORAN PEMBAYARAN OIMS"],
      ["Periode", periodLabel],
      [],
      ["RINGKASAN", "Tagihan", "Dibayar", "Sisa"],
      ["Cutting", cuttingBill, cuttingPaid, Math.max(0, cuttingBill - cuttingPaid)],
      ["Vendor jahit", vendorBill, vendorPaid, Math.max(0, vendorBill - vendorPaid)],
      ["Sablon/Bordir", decorationBill, decorationPaid, Math.max(0, decorationBill - decorationPaid)],
      ["Quality Control", qcBill, qcPaid, Math.max(0, qcBill - qcPaid)],
      ["TOTAL", totalBill, totalPaid, totalRemaining],
      [],
      ["DAFTAR TUJUAN TRANSFER"],
      ["Jenis", "Penerima", "Bank", "Nomor rekening", "Atas nama", "Nominal transfer"],
      ...transferRows.map((row) => [row.type, row.payee, row.bankName || "Belum diisi", row.accountNumber || "Belum diisi", row.accountHolder || row.payee, row.remaining]),
      [],
      ["RIWAYAT PEMBAYARAN"],
      ["Tanggal", "Nomor bukti", "Jenis", "Penerima", "Nominal", "Status"],
      ...paymentRows.map((payment) => [payment.date, payment.id, payment.type, payment.payee, payment.amount, payment.status]),
    ];
    const content = `\uFEFF${csvRows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(";")).join("\n")}`,
      url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" })),
      link = document.createElement("a");
    link.href = url;
    link.download = `laporan-pembayaran-oims-${rangeStart || "semua"}-${rangeEnd || "waktu"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="overline">{mode === "finance" ? "KEUANGAN" : "ANALITIK PRODUKSI"}</p>
          <h1>{mode === "finance" ? "Laporan Keuangan" : "Laporan Produksi"}</h1>
          <span>{mode === "finance" ? "Tagihan dan pembayaran setiap pekerjaan produksi." : "Riwayat pekerjaan, progres vendor, dan hasil produksi selesai."}</span>
        </div>
        <div className="finance-report-actions">
          <select value={financePeriod} onChange={(e) => setFinancePeriod(e.target.value as "today" | "week" | "month" | "custom" | "all")}>
            <option value="today">Hari ini</option><option value="week">Minggu ini</option><option value="month">Bulan ini</option><option value="custom">Custom tanggal</option><option value="all">Semua waktu</option>
          </select>
          {financePeriod === "custom" && <span className="finance-custom-range"><input aria-label="Tanggal mulai laporan" type="date" value={customStart} max={customEnd} onChange={(e) => setCustomStart(e.target.value)} /><i>–</i><input aria-label="Tanggal selesai laporan" type="date" value={customEnd} min={customStart} onChange={(e) => setCustomEnd(e.target.value)} /></span>}
          {reportTab === "payment" && <><button type="button" onClick={() => setShowFinancePrint(true)}>Cetak</button><button type="button" onClick={exportFinanceCSV}>Ekspor CSV</button></>}
        </div>
      </div>
      <p className="finance-period-caption">Periode laporan: <b>{periodLabel}</b></p>
      {reportTab === "payment" && <section className="finance-reminder-bar">
        <div><small>PENGINGAT FINANCE</small><b>Kirim manual melalui WhatsApp</b><span>Pesan hanya disiapkan. Pegawai tetap memeriksa lalu menekan tombol kirim di WhatsApp.</span></div>
        <label><span>PIC pengaju</span><select value={requesterPICCode} onChange={(e) => setRequesterPICCode(e.target.value)}><option value="">Pilih PIC pengaju</option>{requesterPICOptions.map((pic) => <option key={pic.code} value={pic.code}>{pic.name} · {pic.role}</option>)}</select></label>
        <label><span>PIC penerima Finance</span><select value={financePICCode} onChange={(e) => setFinancePICCode(e.target.value)}><option value="">Pilih PIC Finance</option>{financePICOptions.map((pic) => <option key={pic.code} value={pic.code}>{pic.name} · {pic.role}</option>)}</select></label>
        {financePhone ? <a href={whatsappURL(summaryReminder)} target="_blank" rel="noreferrer">Kirim ringkasan WA</a> : <button type="button" disabled>Nomor PIC belum tersedia</button>}
      </section>}
      {mode === "production" && <div className="report-tabs" role="tablist" aria-label="Jenis laporan produksi">
        <button className={reportTab === "production" ? "active" : ""} onClick={() => setReportTab("production")}>Pekerjaan Produksi</button>
        <button className={reportTab === "vendor" ? "active" : ""} onClick={() => setReportTab("vendor")}>Pekerjaan Vendor</button>
      </div>}
      {reportTab === "payment" && <>
      <section className="finance-summary">
        <article><span>Total tagihan produksi</span><b>{rupiah(totalBill)}</b></article>
        <article><span>Sudah dibayar</span><b>{rupiah(totalPaid)}</b></article>
        <article className="outstanding"><span>Sisa pembayaran</span><b>{rupiah(totalRemaining)}</b></article>
      </section>
      <section className="finance-ledger-panel">
        <header>
          <div><small>REKAP PEMBAYARAN</small><h2>Daftar tagihan produksi</h2><p>Tagihan Cutting, vendor jahit, Sablon/Bordir, dan QC dalam satu tabel.</p></div>
          <b>{filteredFinanceRows.length} data</b>
        </header>
        <div className="finance-ledger-tools">
          <label className="finance-ledger-search"><span>⌕</span><input value={financeQuery} onChange={(e) => { setFinanceQuery(e.target.value); setFinancePage(1); }} placeholder="Cari penerima, rekening, atau status..." /></label>
          <select value={financeKind} onChange={(e) => { setFinanceKind(e.target.value as typeof financeKind); setFinancePage(1); }}><option value="all">Semua proses</option><option value="Cutting">Cutting</option><option value="Vendor jahit">Vendor jahit</option><option value="Sablon/Bordir">Sablon/Bordir</option><option value="Quality Control">Quality Control</option></select>
        </div>
        {filteredFinanceRows.length === 0 ? <div className="finance-transfer-empty"><b>Belum ada data yang sesuai</b><span>Ubah pencarian, filter, atau periode laporan.</span></div> : <>
          <div className="finance-ledger-table-wrap"><table className="finance-ledger-table"><thead><tr><th>No.</th><th>Jenis</th><th>Penerima</th><th>Periode</th><th>Tagihan</th><th>Dibayar</th><th>Sisa</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{pagedFinanceRows.map((row, index) => {
            const rowKey = `${row.type}|${row.payee}`,
              isExpanded = expandedFinanceRow === rowKey,
              visibleWeeks = row.weeks.filter((weekRow) => {
                if (financeWeekScope === "all") return true;
                const start = financeWeekScope === "week" ? week.start : financeWeekStart,
                  end = financeWeekScope === "week" ? week.end : financeWeekEnd;
                return !!start && !!end && weekRow.end >= start && weekRow.start <= end;
              }),
              outstandingWeeks = visibleWeeks.filter((weekRow) => weekRow.remaining > 0),
              selectedWeeks = visibleWeeks.filter((weekRow) => selectedFinanceWeeks.includes(weekRow.key)),
              allOutstandingSelected = outstandingWeeks.length > 0 && outstandingWeeks.every((weekRow) => selectedFinanceWeeks.includes(weekRow.key));
            return <Fragment key={rowKey}>
              <tr className={isExpanded ? "finance-parent-row expanded" : "finance-parent-row"}>
                <td data-label="No.">{(safeFinancePage - 1) * financePageSize + index + 1}</td>
                <td data-label="Jenis"><b className="finance-kind">{row.type}</b></td>
                <td data-label="Penerima"><span className="finance-payee-cell"><b>{row.payee}</b><small>{row.bankName && row.accountNumber ? `${row.bankName} · ${row.accountNumber} · a.n. ${row.accountHolder || row.payee}` : "Rekening belum dilengkapi"}</small></span></td>
                <td data-label="Periode">{row.weeks.length} minggu</td><td data-label="Tagihan"><b>{rupiah(row.bill)}</b></td><td data-label="Dibayar">{rupiah(row.paid)}</td><td data-label="Sisa"><strong>{rupiah(row.remaining)}</strong></td>
                <td data-label="Status"><span className={`finance-status ${row.status === "Lunas" ? "paid" : row.status === "DP sebagian" ? "partial" : "unpaid"}`}>{row.status}</span></td>
                <td data-label="Aksi"><span className="finance-row-actions"><button type="button" onClick={() => setExpandedFinanceRow(isExpanded ? null : rowKey)}>{isExpanded ? "Tutup" : "Mingguan"}</button><button type="button" onClick={() => go(row.stage)} title="Buka pembayaran">Bayar</button></span></td>
              </tr>
              {isExpanded && <tr className="finance-week-detail-row"><td colSpan={9}>
                <div className="finance-week-detail">
                  <header><div><b>Tagihan mingguan · {row.payee}</b><span>Centang minggu yang akan diajukan ke Finance.</span></div><div className="finance-week-filters"><select aria-label="Periode rincian mingguan" value={financeWeekScope} onChange={(event) => setFinanceWeekScope(event.target.value as typeof financeWeekScope)}><option value="all">Semua minggu</option><option value="week">Minggu ini</option><option value="custom">Custom tanggal</option></select>{financeWeekScope === "custom" && <span><input aria-label="Tanggal mulai tagihan mingguan" type="date" value={financeWeekStart} max={financeWeekEnd} onChange={(event) => setFinanceWeekStart(event.target.value)} /><i>–</i><input aria-label="Tanggal selesai tagihan mingguan" type="date" value={financeWeekEnd} min={financeWeekStart} onChange={(event) => setFinanceWeekEnd(event.target.value)} /></span>}<button type="button" disabled={outstandingWeeks.length === 0} onClick={() => {
                    const outstandingKeys = outstandingWeeks.map((weekRow) => weekRow.key);
                    setSelectedFinanceWeeks((selected) => allOutstandingSelected
                      ? selected.filter((key) => !outstandingKeys.includes(key))
                      : [...new Set([...selected, ...outstandingKeys])]);
                  }}>{allOutstandingSelected ? "Batalkan semua" : "Pilih semua tunggakan"}</button></div></header>
                  <div className="finance-week-list">
                    {visibleWeeks.length === 0 ? <p className="finance-week-empty">Tidak ada tagihan pada tanggal yang dipilih.</p> : visibleWeeks.map((weekRow) => <label key={weekRow.key} className={weekRow.remaining <= 0 ? "paid" : ""}>
                      <input type="checkbox" disabled={weekRow.remaining <= 0} checked={selectedFinanceWeeks.includes(weekRow.key)} onChange={() => toggleFinanceWeek(weekRow.key)} />
                      <span><b>{weekRow.start} – {weekRow.end}</b><small>{weekRow.records.length} transaksi</small></span>
                      <p><small>Tagihan</small><b>{rupiah(weekRow.bill)}</b></p>
                      <p><small>Dibayar</small><b>{rupiah(weekRow.paid)}</b></p>
                      <p><small>Sisa</small><strong>{rupiah(weekRow.remaining)}</strong></p>
                      <em className={`finance-status ${weekRow.status === "Lunas" ? "paid" : weekRow.status === "DP sebagian" ? "partial" : "unpaid"}`}>{weekRow.status}</em>
                    </label>)}
                  </div>
                  <footer><span>{selectedWeeks.length > 0 ? `${selectedWeeks.length} minggu dipilih · total ${rupiah(selectedWeeks.reduce((total, weekRow) => total + weekRow.remaining, 0))}` : "Belum ada minggu yang dipilih"}</span>{financePhone && selectedWeeks.length > 0 ? <a href={whatsappURL(selectedReminder(row, selectedWeeks))} target="_blank" rel="noreferrer">WA minggu terpilih</a> : <button type="button" disabled>WA minggu terpilih</button>}</footer>
                </div>
              </td></tr>}
            </Fragment>;
          })}</tbody></table></div>
          <footer className="finance-ledger-footer"><label>Tampilkan <select value={financePageSize} onChange={(e) => { setFinancePageSize(Number(e.target.value)); setFinancePage(1); }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select> data</label><span>Menampilkan {(safeFinancePage - 1) * financePageSize + 1}–{Math.min(safeFinancePage * financePageSize, filteredFinanceRows.length)} dari {filteredFinanceRows.length}</span><div><button type="button" disabled={safeFinancePage <= 1} onClick={() => setFinancePage((page) => Math.max(1, page - 1))}>‹</button><b>{safeFinancePage}</b><button type="button" disabled={safeFinancePage >= financePageCount} onClick={() => setFinancePage((page) => Math.min(financePageCount, page + 1))}>›</button></div></footer>
        </>}
      </section>
      <details className="finance-payment-history">
        <summary><span><small>RIWAYAT PEMBAYARAN</small><b>Transaksi keuangan</b></span><em>{paymentRows.length} pembayaran · buka rincian</em></summary>
        {paymentRows.length === 0 ? <Empty title="Belum ada pembayaran" text="Pembayaran pada periode terpilih akan tampil di sini." /> : <div className="scroll"><table><thead><tr><th>NO.</th><th>TANGGAL</th><th>NOMOR BUKTI</th><th>JENIS</th><th>PENERIMA</th><th>NOMINAL</th><th>STATUS</th></tr></thead><tbody>{paymentRows.map((payment, index) => <tr key={payment.id}><td>{index + 1}</td><td>{payment.date}</td><td><b>{payment.id}</b></td><td>{payment.type}</td><td>{payment.payee}</td><td><b>{rupiah(payment.amount)}</b></td><td><span className="status">{payment.status}</span></td></tr>)}</tbody></table></div>}
      </details>
      </>}
      {reportTab === "production" && <>
      <section className="production-report-summary">
        <article><span>Batch dalam periode</span><b>{productionRows.length}</b><small>referensi produksi</small></article>
        <article><span>Total hasil Cutting</span><b>{productionRows.reduce((total, row) => total + row.po.total, 0)}</b><small>unit aktual dipotong</small></article>
        <article><span>Masih proses</span><b>{productionRows.reduce((total, row) => total + row.activeUnits, 0)}</b><small>belum stok/reject</small></article>
        <article><span>Stok jadi</span><b>{productionRows.reduce((total, row) => total + row.stock, 0)}</b><small>unit selesai</small></article>
        <article className="reject"><span>Reject</span><b>{productionRows.reduce((total, row) => total + row.reject, 0)}</b><small>unit gagal QC</small></article>
      </section>
      <section className="production-ledger-panel">
        <header><div><small>REKAP PRODUKSI</small><h2>Posisi unit per Batch Cutting</h2><p>Setiap unit dihitung satu kali berdasarkan posisi fisik terakhir.</p></div><b>{filteredProductionRows.length} batch</b></header>
        <div className="production-ledger-tools"><label><span>⌕</span><input value={productionQuery} onChange={(e) => { setProductionQuery(e.target.value); setProductionPage(1); }} placeholder="Cari batch Cutting, model, atau vendor..." /></label><select value={productionStatus} onChange={(e) => { setProductionStatus(e.target.value as typeof productionStatus); setProductionPage(1); }}><option value="all">Semua status</option><option value="active">Masih aktif</option><option value="done">Selesai</option></select></div>
        {filteredProductionRows.length === 0 ? <Empty title="Belum ada Batch Cutting yang sesuai" text="Ubah pencarian, status, atau periode laporan." /> : <>
          <div className="production-ledger-table-wrap"><table className="production-ledger-table"><thead><tr><th>No.</th><th>Batch Cutting / Model</th><th>Vendor</th><th>Total Cutting</th><th>Belum Cutting</th><th>Cutting / Bundle</th><th>Di Vendor</th><th>Belum QC</th><th>Siap Stok</th><th>Repair</th><th>Reject</th><th>Stok Jadi</th><th>Sisa Proses</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{pagedProductionRows.map((row, index) => <tr key={row.po.id}>
            <td data-label="No.">{(safeProductionPage - 1) * productionPageSize + index + 1}</td>
            <td data-label="Batch / Model"><span className="production-po-cell"><b>{row.po.id}</b><small>{row.po.modelName} · {row.po.modelCode}</small></span></td>
            <td data-label="Vendor">{row.vendors}</td><td data-label="Total Cutting"><b>{row.po.total}</b></td><td data-label="Belum Cutting">{row.beforeCutting}</td><td data-label="Cutting / Bundle">{row.cuttingArea}</td><td data-label="Di Vendor">{row.atVendor}</td><td data-label="Belum QC">{row.beforeQC}</td><td data-label="Siap Stok">{row.readyStock}</td><td data-label="Repair">{row.repair}</td><td data-label="Reject"><strong className="production-reject-value">{row.reject}</strong></td><td data-label="Stok Jadi"><strong className="production-stock-value">{row.stock}</strong></td><td data-label="Sisa Proses"><b>{row.activeUnits}</b></td>
            <td data-label="Status"><span className={`production-status ${row.finished ? "done" : row.status === "Repair" ? "repair" : "active"}`}>{row.status}</span></td><td data-label="Aksi"><button type="button" onClick={() => setSelectedProductionPO(row.po.id)}>Rincian</button></td>
          </tr>)}</tbody></table></div>
          <footer className="production-ledger-footer"><label>Tampilkan <select value={productionPageSize} onChange={(e) => { setProductionPageSize(Number(e.target.value)); setProductionPage(1); }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select> batch</label><span>Menampilkan {(safeProductionPage - 1) * productionPageSize + 1}–{Math.min(safeProductionPage * productionPageSize, filteredProductionRows.length)} dari {filteredProductionRows.length}</span><div><button type="button" disabled={safeProductionPage <= 1} onClick={() => setProductionPage((page) => Math.max(1, page - 1))}>‹</button><b>{safeProductionPage}</b><button type="button" disabled={safeProductionPage >= productionPageCount} onClick={() => setProductionPage((page) => Math.min(productionPageCount, page + 1))}>›</button></div></footer>
        </>}
      </section>
      {selectedProduction && <div className="owner-drawer-backdrop" onClick={() => setSelectedProductionPO(null)}><aside className="owner-drawer production-report-drawer" onClick={(e) => e.stopPropagation()}><header><div><p className="overline">RINCIAN PRODUKSI</p><h2>{selectedProduction.po.id}</h2><span>{selectedProduction.po.modelName} · {selectedProduction.po.total} unit</span></div><button aria-label="Tutup rincian" onClick={() => setSelectedProductionPO(null)}>×</button></header><div className="production-detail-totals">{[["Belum Cutting", selectedProduction.beforeCutting], ["Cutting / Bundle", selectedProduction.cuttingArea], ["Di Vendor", selectedProduction.atVendor], ["Belum QC", selectedProduction.beforeQC], ["Siap Stok", selectedProduction.readyStock], ["Repair", selectedProduction.repair], ["Reject", selectedProduction.reject], ["Stok Jadi", selectedProduction.stock]].map(([label, value]) => <p key={String(label)}><span>{label}</span><b>{value} unit</b></p>)}</div><div className="production-detail-variants"><h3>Rincian rencana warna & ukuran</h3>{selectedProduction.po.variants.map((variant) => <p key={`${variant.color}-${variant.size}`}><span>{variant.color}</span><b>{variant.size}</b><strong>{variant.qty} unit</strong></p>)}</div><footer><span>Status saat ini</span><b>{selectedProduction.status}</b></footer></aside></div>}
      </>}
      {reportTab === "vendor" && <>
      <section className="vendor-report-summary">
        <article><span>Vendor aktif</span><b>{new Set(vendorReportRows.filter((row) => !row.finished).map((row) => row.vendor)).size}</b><small>sedang mengerjakan</small></article>
        <article><span>Total dikirim</span><b>{vendorReportRows.reduce((total, row) => total + row.sent, 0)}</b><small>unit ke vendor</small></article>
        <article><span>Sudah disetor</span><b>{vendorReportRows.reduce((total, row) => total + row.received, 0)}</b><small>unit diterima gudang</small></article>
        <article className="wip"><span>Masih dijahit</span><b>{vendorReportRows.reduce((total, row) => total + row.remaining, 0)}</b><small>unit WIP vendor</small></article>
      </section>
      <section className="vendor-report-panel">
        <header><div><small>MONITORING VENDOR</small><h2>Progres jahit per vendor dan Batch Cutting</h2><p>Setoran parsial otomatis mengurangi jumlah yang masih dijahit.</p></div><b>{filteredVendorReportRows.length} pekerjaan</b></header>
        <div className="vendor-report-tools"><label><span>⌕</span><input value={vendorReportQuery} onChange={(e) => { setVendorReportQuery(e.target.value as string); setVendorReportPage(1); }} placeholder="Cari vendor, Batch Cutting, model, atau bundle..." /></label><select value={vendorReportStatus} onChange={(e) => { setVendorReportStatus(e.target.value as typeof vendorReportStatus); setVendorReportPage(1); }}><option value="all">Semua status</option><option value="active">Masih dikerjakan</option><option value="done">Selesai</option></select></div>
        {filteredVendorReportRows.length === 0 ? <Empty title="Belum ada pekerjaan vendor" text="Ubah pencarian, status, atau periode laporan." /> : <>
          <div className="vendor-report-table-wrap"><table className="vendor-report-table"><thead><tr><th>No.</th><th>Vendor</th><th>Batch / Model</th><th>Bundle</th><th>Dikirim</th><th>Sudah Setor</th><th>Masih Dijahit</th><th>Kirim Pertama</th><th>Setoran Terakhir</th><th>Lama Proses</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{pagedVendorReportRows.map((row, index) => <tr key={row.key}>
            <td data-label="No.">{(safeVendorReportPage - 1) * vendorReportPageSize + index + 1}</td><td data-label="Vendor"><b>{row.vendor}</b></td><td data-label="Batch / Model"><span className="vendor-report-model"><b>{row.poId}</b><small>{row.modelName} · {row.modelCode}</small></span></td><td data-label="Bundle"><span className="vendor-bundle-count"><b>{row.bundleIds.length}</b><small>{row.bundleIds.slice(0, 2).join(", ")}{row.bundleIds.length > 2 ? "…" : ""}</small></span></td><td data-label="Dikirim"><b>{row.sent}</b></td><td data-label="Sudah Setor"><strong className="vendor-received-value">{row.received}</strong></td><td data-label="Masih Dijahit"><strong className="vendor-wip-value">{row.remaining}</strong></td><td data-label="Kirim Pertama">{row.firstSent}</td><td data-label="Setoran Terakhir">{row.lastReceipt}</td><td data-label="Lama Proses">{row.finished ? "Selesai" : `${row.duration} hari`}</td><td data-label="Status"><span className={`vendor-report-status ${row.finished ? "done" : row.received > 0 ? "partial" : "active"}`}>{row.status}</span></td><td data-label="Aksi"><button type="button" onClick={() => setSelectedVendorReport(row.key)}>Rincian</button></td>
          </tr>)}</tbody></table></div>
          <footer className="vendor-report-footer"><label>Tampilkan <select value={vendorReportPageSize} onChange={(e) => { setVendorReportPageSize(Number(e.target.value)); setVendorReportPage(1); }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select> data</label><span>Menampilkan {(safeVendorReportPage - 1) * vendorReportPageSize + 1}–{Math.min(safeVendorReportPage * vendorReportPageSize, filteredVendorReportRows.length)} dari {filteredVendorReportRows.length}</span><div><button type="button" disabled={safeVendorReportPage <= 1} onClick={() => setVendorReportPage((page) => Math.max(1, page - 1))}>‹</button><b>{safeVendorReportPage}</b><button type="button" disabled={safeVendorReportPage >= vendorReportPageCount} onClick={() => setVendorReportPage((page) => Math.min(vendorReportPageCount, page + 1))}>›</button></div></footer>
        </>}
      </section>
      {selectedVendorReportRow && <div className="owner-drawer-backdrop" onClick={() => setSelectedVendorReport(null)}><aside className="owner-drawer vendor-report-drawer" onClick={(e) => e.stopPropagation()}><header><div><p className="overline">RINCIAN VENDOR</p><h2>{selectedVendorReportRow.vendor}</h2><span>{selectedVendorReportRow.poId} · {selectedVendorReportRow.modelName}</span></div><button aria-label="Tutup rincian" onClick={() => setSelectedVendorReport(null)}>×</button></header><div className="vendor-detail-totals"><p><span>Dikirim</span><b>{selectedVendorReportRow.sent} unit</b></p><p><span>Sudah disetor</span><b>{selectedVendorReportRow.received} unit</b></p><p><span>Masih dijahit</span><b>{selectedVendorReportRow.remaining} unit</b></p><p><span>Status</span><b>{selectedVendorReportRow.status}</b></p></div><div className="vendor-detail-section"><h3>Bundle dikirim</h3>{selectedVendorReportRow.shipments.map((shipment) => <p key={shipment.id}><span><b>{shipment.bundleId || shipment.sourceId}</b><small>{shipment.id} · {shipment.date}</small></span><strong>{shipment.total} unit</strong></p>)}</div><div className="vendor-detail-section"><h3>Sisa warna & ukuran di vendor</h3>{selectedVendorReportRow.remainingVariants.length === 0 ? <p><span>Semua bundle telah disetor.</span></p> : selectedVendorReportRow.remainingVariants.map((variant) => <p key={`${variant.color}-${variant.size}`}><span><b>{variant.color} · {variant.size}</b></span><strong>{variant.qty} unit</strong></p>)}</div><div className="vendor-detail-section"><h3>Riwayat setoran gudang</h3>{selectedVendorReportRow.receipts.length === 0 ? <p><span>Belum ada setoran.</span></p> : selectedVendorReportRow.receipts.sort((a, b) => b.date.localeCompare(a.date)).map((receipt) => <p key={receipt.id}><span><b>{receipt.id}</b><small>{receipt.date}</small></span><strong>{receipt.total} unit</strong></p>)}</div></aside></div>}
      </>}
      {showFinancePrint && <FinanceReportPrint period={periodLabel} cutting={[cuttingBill, cuttingPaid]} vendor={[vendorBill, vendorPaid]} decoration={[decorationBill, decorationPaid]} qc={[qcBill, qcPaid]} payments={paymentRows} close={() => setShowFinancePrint(false)} />}
    </>
  );
}
function FinanceReportPrint({ period, cutting, vendor, decoration, qc, payments, close }: { period: string; cutting: [number, number]; vendor: [number, number]; decoration: [number, number]; qc: [number, number]; payments: FinancePaymentRow[]; close: () => void }) {
  const stages: Array<[string, number, number]> = [
      ["Cutting", cutting[0], cutting[1]],
      ["Vendor jahit", vendor[0], vendor[1]],
      ["Sablon/Bordir", decoration[0], decoration[1]],
      ["Quality Control", qc[0], qc[1]],
    ],
    totalBill = stages.reduce((total, row) => total + row[1], 0),
    totalPaid = stages.reduce((total, row) => total + row[2], 0);
  return <div className="print-overlay payment-proof-overlay finance-report-print">
    <div className="print-actions"><button onClick={close}>Tutup</button><button className="primary" onClick={() => window.print()}>Cetak Laporan</button></div>
    <article className="payment-proof">
      <header><img src="/oims-logo.jpg" alt="Logo Oims" /><div><small>OIMS · PRODUCTION MANAGEMENT</small><h1>Laporan Pembayaran Produksi</h1><b>Periode {period}</b></div></header>
      <table className="payment-proof-table"><thead><tr><th>No.</th><th>Bagian</th><th>Tagihan</th><th>Dibayar</th><th>Sisa</th></tr></thead><tbody>{stages.map((row, index) => <tr key={row[0]}><td>{index + 1}</td><td>{row[0]}</td><td>{rupiah(row[1])}</td><td>{rupiah(row[2])}</td><td>{rupiah(Math.max(0, row[1] - row[2]))}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>TOTAL</th><th>{rupiah(totalBill)}</th><th>{rupiah(totalPaid)}</th><th>{rupiah(Math.max(0, totalBill - totalPaid))}</th></tr></tfoot></table>
      <h2 className="finance-print-history-title">Riwayat Pembayaran</h2>
      {payments.length === 0 ? <p>Belum ada pembayaran pada periode ini.</p> : <table className="payment-proof-table"><thead><tr><th>No.</th><th>Tanggal</th><th>Nomor Bukti</th><th>Jenis</th><th>Penerima</th><th>Nominal</th><th>Status</th></tr></thead><tbody>{payments.map((payment, index) => <tr key={`${payment.id}-${index}`}><td>{index + 1}</td><td>{payment.date}</td><td>{payment.id}</td><td>{payment.type}</td><td>{payment.payee}</td><td>{rupiah(payment.amount)}</td><td>{payment.status}</td></tr>)}</tbody></table>}
    </article>
  </div>;
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <i>◇</i>
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}
function WeeklyPaymentPrint({
  payment,
  close,
}: {
  payment: WeeklyPayment;
  close: () => void;
}) {
  return (
    <div className="print-overlay payment-proof-overlay">
      <div className="print-actions">
        <button onClick={close}>Tutup</button>
        <button className="primary" onClick={() => window.print()}>Cetak Rekap Mingguan</button>
      </div>
      <article className="payment-proof weekly-payment-proof">
        <header>
          <img src="/oims-logo.jpg" alt="Logo Oims" />
          <div>
            <small>OIMS · PRODUCTION MANAGEMENT</small>
            <h1>Bukti Pembayaran Mingguan {payment.kind === "cutting" ? "Cutting" : payment.kind === "qc" ? "QC" : payment.kind === "decoration" ? "Vendor Sablon/Bordir" : "Vendor Jahit"}</h1>
            <b>{payment.id}</b>
          </div>
        </header>
        <div className="payment-proof-meta">
          <p><span>Periode pekerjaan</span><b>{payment.periodStart} – {payment.periodEnd}</b></p>
          <p><span>Tanggal pembayaran</span><b>{payment.paymentDate}</b></p>
          <p><span>Penerima</span><b>{payment.payee}</b></p>
          <p><span>Pengaju</span><b>{payment.requester || "Belum dicatat"}</b></p>
          <p><span>Finance</span><b>{payment.pic}</b></p>
          <p><span>Tujuan transfer</span><b>{payment.bankName && payment.accountNumber ? `${payment.bankName} ${payment.accountNumber}` : "Rekening belum diisi"}</b></p>
          <p><span>Atas nama</span><b>{payment.accountHolder || payment.payee}</b></p>
        </div>
        <table className="payment-proof-table">
          <thead><tr><th>No.</th><th>Kode transaksi</th><th>Model</th><th>Unit</th><th>Tarif</th><th>Jumlah</th></tr></thead>
          <tbody>
            {payment.lines.map((line, index) => (
              <tr key={line.recordId}>
                <td>{index + 1}</td><td>{line.recordId}</td><td>{line.modelName}</td><td>{line.units}</td><td>{rupiah(line.rate)}</td><td>{rupiah(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="payment-proof-totals">
          <p><span>Total transaksi</span><b>{payment.lines.length}</b></p>
          <p><span>Total unit</span><b>{payment.totalUnits}</b></p>
          <p><span>Total tagihan</span><b>{rupiah(payment.totalAmount)}</b></p>
          <p><span>Pembayaran sebelumnya</span><b>{rupiah(payment.paidBefore ?? 0)}</b></p>
          <p className="current"><span>Pembayaran kali ini</span><b>{rupiah(payment.paymentAmount ?? payment.totalAmount)}</b></p>
          <p><span>Sisa tagihan</span><strong>{rupiah(Math.max(0, payment.totalAmount - (payment.paidBefore ?? 0) - (payment.paymentAmount ?? payment.totalAmount)))}</strong></p>
          <p><span>Status</span><b>{payment.totalAmount <= (payment.paidBefore ?? 0) + (payment.paymentAmount ?? payment.totalAmount) ? "LUNAS" : "DP SEBAGIAN"}</b></p>
        </div>
        {payment.note && <p className="payment-proof-note"><b>Catatan:</b> {payment.note}</p>}
        {payment.voided && <p className="payment-proof-void">BUKTI DIBATALKAN · {payment.voidReason}</p>}
        <footer><div><span>Diajukan oleh</span><b>{payment.requester || "PIC Produksi"}</b></div><div><span>Diperiksa Finance</span><b>{payment.pic}</b></div></footer>
      </article>
    </div>
  );
}
function PaymentReceiptPrint({
  receipt,
  payment,
  shipment,
  kind,
  close,
}: {
  receipt: RecordRow;
  payment: PaymentEntry;
  shipment?: RecordRow;
  kind: "vendor" | "cutting";
  close: () => void;
}) {
  const rate =
      kind === "cutting"
        ? receipt.cuttingRate ?? 0
        : receipt.sewingRate ?? shipment?.sewingRate ?? 0,
    bill = receipt.total * rate,
    history = legacyPayment(receipt),
    paidBefore = history
      .filter((item) => item.id !== payment.id && !item.voided)
      .reduce((total, item) => total + item.amount, 0),
    paidAfter = payment.voided ? paidBefore : paidBefore + payment.amount;
  return (
    <div className="print-overlay payment-proof-overlay">
      <div className="print-actions">
        <button onClick={close}>Tutup</button>
        <button className="primary" onClick={() => window.print()}>
          Cetak Bukti Pembayaran
        </button>
      </div>
      <article className="payment-proof">
        <header>
          <img src="/oims-logo.jpg" alt="Logo Oims" />
          <div>
            <small>OIMS · PRODUCTION MANAGEMENT</small>
            <h1>
              Bukti Pembayaran Jasa {kind === "cutting" ? "Cutting" : "Jahit"}
            </h1>
            <b>{payment.id}</b>
          </div>
        </header>
        <div className="payment-proof-meta">
          <p><span>Tanggal</span><b>{payment.date}</b></p>
          <p>
            <span>{kind === "cutting" ? "Pelaksana" : "Vendor"}</span>
            <b>{kind === "cutting" ? receipt.officer || "—" : shipment?.destination || "—"}</b>
          </p>
          <p><span>Penerimaan</span><b>{receipt.id}</b></p>
          <p><span>Batch Cutting / Bundle</span><b>{receipt.poId || "—"} / {receipt.bundleId || "—"}</b></p>
          <p><span>Model</span><b>{receipt.modelName}</b></p>
          <p><span>PIC Finance</span><b>{payment.pic}</b></p>
        </div>
        <table className="payment-proof-table">
          <thead><tr><th>No.</th><th>Warna</th><th>Size</th><th>Jumlah</th><th>Tarif</th><th>Nilai</th></tr></thead>
          <tbody>
            {receipt.variants.map((variant, index) => (
              <tr key={`${variant.color}-${variant.size}`}>
                <td>{index + 1}</td><td>{variant.color}</td><td>{variant.size}</td>
                <td>{variant.qty} unit</td><td>{rupiah(rate)}</td><td>{rupiah(variant.qty * rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="payment-proof-totals">
          <p><span>Total tagihan</span><b>{rupiah(bill)}</b></p>
          <p><span>Pembayaran sebelumnya</span><b>{rupiah(paidBefore)}</b></p>
          <p className="current"><span>Pembayaran kali ini</span><b>{rupiah(payment.amount)}</b></p>
          <p><span>Total setelah pembayaran</span><b>{rupiah(paidAfter)}</b></p>
          <p><span>Sisa tagihan</span><strong>{rupiah(Math.max(0, bill - paidAfter))}</strong></p>
          <p><span>Status</span><b>{payment.voided ? "DIBATALKAN" : paymentStatus(bill, paidAfter)}</b></p>
        </div>
        {payment.note && <p className="payment-proof-note"><b>Catatan:</b> {payment.note}</p>}
        {payment.voided && <p className="payment-proof-void">BUKTI DIBATALKAN · {payment.voidReason}</p>}
        <footer>
          <div><span>Dibuat oleh</span><b>{payment.pic}</b></div>
          <div><span>Diterima oleh</span><b>{kind === "cutting" ? receipt.officer || "Pelaksana Cutting" : shipment?.destination || "Vendor"}</b></div>
        </footer>
      </article>
    </div>
  );
}

function PrintNote({ note, close }: { note: Note; close: () => void }) {
  const colors = [...new Set(note.variants.map((v) => v.color))];
  const sizes = [...new Set(note.variants.map((v) => v.size))];
  return (
    <div className="overlay print-overlay">
      <section className="print-sheet">
        <div className="print-toolbar">
          <button onClick={close}>← Tutup</button>
          <button className="primary" onClick={() => window.print()}>
            ▣ Cetak A4
          </button>
        </div>
        <div className="print-document">
          <div className="print-head">
            <div className="print-brand">
              <b>Oims</b>
              <span>PRODUCTION MANAGEMENT</span>
            </div>
            <div>
              <h1>SURAT JALAN</h1>
              <span className="print-number-label">NOMOR SURAT JALAN</span>
              <b className="print-number">{note.id}</b>
            </div>
          </div>
          <div className="print-meta">
            <div>
              <span>Tanggal</span>
              <b>{note.date}</b>
            </div>
            <div>
              <span>Proses</span>
              <b>{note.process}</b>
            </div>
            <div>
              <span>Dokumen sumber</span>
              <b>{note.sourceId}</b>
            </div>
            <div>
              <span>Bundle / Lot</span>
              <b>{note.bundleIds?.map(shortBundleCode).join(", ") || "—"}</b>
            </div>
            <div>
              <span>Model</span>
              <b>
                {note.modelCode} — {note.modelName}
              </b>
            </div>
            <div>
              <span>Dari</span>
              <b>{note.from}</b>
            </div>
            <div>
              <span>Tujuan</span>
              <b>{note.to}</b>
            </div>
          </div>
          <table className="print-detail-table">
            <thead>
              <tr>
                <th>NO.</th>
                <th>WARNA</th>
                {sizes.map((s) => (
                  <th key={s}>{s}</th>
                ))}
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {colors.map((c, index) => (
                <tr key={c}>
                  <td>{index + 1}</td>
                  <td>
                    <b>{c}</b>
                  </td>
                  {sizes.map((s) => (
                    <td key={s}>
                      {note.variants.find((v) => v.color === c && v.size === s)
                        ?.qty ?? 0}
                    </td>
                  ))}
                  <td>
                    <b>{sum(note.variants.filter((v) => v.color === c))}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {note.note && (
            <div className="print-note">
              <span>Catatan</span>
              <p>{note.note}</p>
            </div>
          )}
          <div className="signatures">
            <div>
              <span>Pengirim</span>
              <i />
              <b>{note.officer}</b>
            </div>
            <div>
              <span>Mengetahui</span>
              <i />
              <b>(........................)</b>
            </div>
            <div>
              <span>Penerima</span>
              <i />
              <b>(........................)</b>
            </div>
          </div>
          <footer>
            Nomor {note.id} terhubung otomatis dengan transaksi {note.sourceId}.
          </footer>
        </div>
      </section>
    </div>
  );
}

function BundleLabel({
  bundle,
  close,
}: {
  bundle: RecordRow;
  close: () => void;
}) {
  const colors = [...new Set(bundle.variants.map((variant) => variant.color))];
  return (
    <div className="overlay print-overlay bundle-label-overlay">
      <section className="print-sheet bundle-label-sheet">
        <div className="print-toolbar">
          <button onClick={close}>← Tutup</button>
          <button className="primary" onClick={() => window.print()}>
            ▣ Cetak Thermal 80 mm
          </button>
        </div>
        <div className="bundle-label-document">
          <header>
            <div>
              <b>Oims</b>
              <span>KARTU BUNDLE PRODUKSI</span>
            </div>
            <strong>B{String(bundle.bundleNo ?? 1).padStart(3, "0")}</strong>
          </header>
          <div className="bundle-label-code">{bundle.id}</div>
          <dl>
            <div>
              <dt>PO</dt>
              <dd>{bundle.poId || "—"}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{bundle.modelName}</dd>
            </div>
            <div>
              <dt>Cutting</dt>
              <dd>C{String(bundle.batchNo ?? 1).padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>Tanggal</dt>
              <dd>{bundle.date}</dd>
            </div>
            <div>
              <dt>PIC</dt>
              <dd>{bundle.officer || "—"}</dd>
            </div>
          </dl>
          <table>
            <thead>
              <tr>
                <th>WARNA</th>
                <th>SIZE</th>
                <th>QTY</th>
              </tr>
            </thead>
            <tbody>
              {colors.flatMap((color) =>
                bundle.variants
                  .filter((variant) => variant.color === color)
                  .sort((a, b) => compareSizes(a.size, b.size))
                  .map((variant, index) => (
                    <tr key={`${variant.color}-${variant.size}`}>
                      <td>{index === 0 ? color : ""}</td>
                      <td>{variant.size}</td>
                      <td>{variant.qty}</td>
                    </tr>
                  )),
              )}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={2}>TOTAL BUNDLE</th>
                <th>{bundle.total}</th>
              </tr>
            </tfoot>
          </table>
          <footer>
            Cocokkan kode ini dengan data Bundle sebelum dikirim ke vendor.
          </footer>
        </div>
      </section>
    </div>
  );
}
