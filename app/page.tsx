"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const stages = [
  "Order Produksi",
  "Cutting",
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
  ["◇", "Order Produksi"],
  ["✂", "Cutting"],
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
  ["▥", "Laporan"],
  ["▤", "Surat Jalan"],
];
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
    desc: "Hasil potong mengikuti rincian PO.",
    source: "Order Produksi",
  },
  Bundle: {
    prefix: "BDL",
    title: "Bundle Produksi",
    desc: "Pembagian hasil cutting yang tetap membawa warna dan ukuran.",
    source: "Cutting",
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
    desc: "Catat setoran bertahap dan pantau otomatis sisa barang di vendor.",
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
};
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
};
type QCLocation = {
  code: string;
  location: string;
  recipient: string;
  phone: string;
  address: string;
  active: boolean;
};
type PIC = {
  code: string;
  name: string;
  role: string;
  phone: string;
  active: boolean;
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
  poId?: string;
  batchNo?: number;
  bundleNo?: number;
  bundleId?: string;
  deliveryNoteId?: string;
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
type AppData = {
  dataVersion: number;
  models: Model[];
  vendors: Vendor[];
  qcLocations: QCLocation[];
  pics: PIC[];
  records: Record<string, RecordRow[]>;
  notes: Note[];
};

const initial: AppData = {
  dataVersion: 3,
  models: [],
  vendors: [],
  qcLocations: [],
  pics: [],
  records: {},
  notes: [],
};
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
  return (
    <>
      <div className="page-title">
        <div>
          <p className="overline">MASTER DATA</p>
          <h1>Tujuan & Penerima QC</h1>
          <span>
            Dipakai otomatis saat membuat pengiriman dan surat jalan ke Quality
            Control.
          </span>
        </div>
        <button className="primary" onClick={onAdd}>
          ＋ Tambah tujuan QC
        </button>
      </div>
      {items.length === 0 ? (
        <Empty
          title="Belum ada tujuan QC"
          text="Tambahkan tujuan dan penerima QC pertama."
        />
      ) : (
        <div className="model-grid">
          {items.map((x) => (
            <article key={x.code}>
              <div>
                <span>{x.code}</span>
                <em>{x.active ? "Aktif" : "Nonaktif"}</em>
              </div>
              <h2>{x.location}</h2>
              <small>PENERIMA</small>
              <p>
                <b>{x.recipient}</b>
              </p>
              <small>KONTAK</small>
              <p>{x.phone || "Belum diisi"}</p>
              <footer>
                <span>{x.address || "Alamat belum diisi"}</span>
                <div className="master-actions">
                  <button onClick={() => onEdit(x)}>✎ Edit</button>
                  <button className="danger" onClick={() => onDelete(x)}>
                    ♲ Hapus
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </>
  );
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
  return po?.id ?? "PO tidak ditemukan";
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
              Nomor PO, artikel, warna, ukuran, dan saldo fisik yang masih di
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
                            PO {j.po} · Kiriman {j.s.id}
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

function OwnerVendorMonitoring({ data }: { data: AppData }) {
  const [selected, setSelected] = useState<string | null>(null),
    today = new Date(),
    shipments = data.records["Pengiriman Vendor"] ?? [],
    receipts = data.records["Penerimaan Gudang"] ?? [];
  const vendors = data.vendors.map((v) => {
      const sent = shipments.filter((x) => x.destination === v.name),
        jobs = sent
          .map((s) => {
            const related = receipts.filter((r) => r.sourceId === s.id),
              remaining = subtractVariants(
                s.variants,
                related.flatMap((r) => r.variants),
              ),
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
          : 0;
      return { v, jobs, total, done, left, days };
    }),
    detail = vendors.find((x) => x.v.code === selected);
  return (
    <section className="owner-simple-panel vendor-simple">
      <header>
        <div>
          <p className="overline">BARANG DI VENDOR</p>
          <h2>Pekerjaan per penjahit</h2>
          <span>Hanya pekerjaan aktif dan saldo unit yang belum disetor.</span>
        </div>
        <b>{vendors.reduce((n, x) => n + x.left, 0)} unit di vendor</b>
      </header>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>STATUS</th>
              <th>VENDOR</th>
              <th>MODEL DIKERJAKAN</th>
              <th>DIKIRIM</th>
              <th>SELESAI</th>
              <th>SISA</th>
              <th>LAMA</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((x) => (
              <tr key={x.v.code} onClick={() => setSelected(x.v.code)}>
                <td>
                  <span
                    className={`vendor-dot ${x.left > 0 ? "active" : "idle"}`}
                  >
                    {x.left > 0 ? "Aktif" : "Kosong"}
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
                <td>{x.total}</td>
                <td>{x.done}</td>
                <td>
                  <strong>{x.left}</strong>
                </td>
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
          <aside className="owner-drawer" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <p className="overline">RINCIAN VENDOR</p>
                <h2>{detail.v.name}</h2>
                <span>{detail.left} unit masih berada di penjahit</span>
              </div>
              <button onClick={() => setSelected(null)}>×</button>
            </header>
            {detail.jobs.length === 0 ? (
              <div className="drawer-empty">
                <i>✓</i>
                <b>Tidak ada pekerjaan aktif</b>
              </div>
            ) : (
              <div className="drawer-list">
                {detail.jobs.map((j) => (
                  <article key={j.s.id}>
                    <header>
                      <div>
                        <small>
                          {j.po} · {j.s.id}
                        </small>
                        <h3>{j.s.modelName}</h3>
                        <span>
                          Dikirim {j.s.total} · selesai {j.received}
                        </span>
                      </div>
                      <b>
                        {j.left}
                        <small> unit</small>
                      </b>
                    </header>
                    <div>
                      {j.remaining.map((v) => (
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
          </aside>
        </div>
      )}
    </section>
  );
}

function LiveStageStatus({
  active,
  rows,
  allRecords,
}: {
  active: string;
  rows: RecordRow[];
  allRecords: Record<string, RecordRow[]>;
}) {
  const children = (stage: string, id: string) =>
    (allRecords[stage] ?? []).filter((x) => x.sourceId === id);
  const statusFor = (r: RecordRow) => {
    if (active === "Order Produksi")
      return children("Cutting", r.id).length
        ? { label: "Selesai · Masuk Cutting", tone: "done", done: true }
        : { label: "Menunggu Cutting", tone: "waiting", done: false };
    if (active === "Cutting") {
      const used = children("Bundle", r.id).reduce((n, x) => n + x.total, 0);
      return used === 0
        ? { label: "Menunggu Bundle", tone: "waiting", done: false }
        : used < r.total
          ? {
              label: `Dibundle sebagian · ${used}/${r.total}`,
              tone: "partial",
              done: false,
            }
          : { label: "Selesai Dibundle", tone: "done", done: true };
    }
    if (active === "Bundle")
      return children("Pengiriman Vendor", r.id).length
        ? { label: "Dikirim ke Vendor Jahit", tone: "done", done: true }
        : { label: "Menunggu Pengiriman Vendor", tone: "waiting", done: false };
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
      return children("Pengiriman QC", r.id).length
        ? { label: "Dikirim ke QC", tone: "done", done: true }
        : { label: "Menunggu Kirim QC", tone: "waiting", done: false };
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
  const items = rows.map((row) => ({ row, ...statusFor(row) })),
    working = items.filter((x) => !x.done),
    completed = items.filter((x) => x.done);
  const list = (entries: typeof items) => (
    <div className="live-status-grid">
      {entries.map(({ row, label, tone }) => (
        <article key={row.id}>
          <header>
            <div>
              <small>
                {row.id} · {row.date}
              </small>
              <h3>{row.modelName}</h3>
            </div>
            <em className={tone}>{label}</em>
          </header>
          <div>
            <span>
              Sumber <b>{row.sourceId || "Master Jaket"}</b>
            </span>
            <span>
              Jumlah <b>{row.total} unit</b>
            </span>
            {row.destination && (
              <span>
                Tujuan / Vendor <b>{row.destination}</b>
              </span>
            )}
          </div>
          <p>
            {row.variants
              .map((v) => `${v.color} ${v.size}: ${v.qty}`)
              .join(" · ")}
          </p>
        </article>
      ))}
    </div>
  );
  return (
    <section className="live-status">
      <header>
        <div>
          <p className="overline">STATUS OTOMATIS</p>
          <h2>Pekerjaan saat ini</h2>
          <span>Status berubah mengikuti transaksi di proses berikutnya.</span>
        </div>
        <b>{working.length} aktif</b>
      </header>
      {working.length ? (
        list(working)
      ) : (
        <div className="live-status-empty">
          Tidak ada pekerjaan aktif pada proses ini.
        </div>
      )}
      {completed.length > 0 && (
        <details>
          <summary>
            <span>✓</span>
            <b>{completed.length} transaksi selesai</b>
            <small>
              Disembunyikan agar dashboard tetap ringkas · klik untuk melihat
            </small>
          </summary>
          {list(completed)}
        </details>
      )}
    </section>
  );
}

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [data, setData] = useState<AppData>(initial);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const [form, setForm] = useState(emptyForm);
  const [vendorForm, setVendorForm] = useState({
    name: "",
    contact: "",
    phone: "",
    address: "",
    qcMode: "internal" as QCMode,
    qcOfficer: "",
    qcLocationCode: "",
  });
  const [qcLocationForm, setQcLocationForm] = useState({
    location: "",
    recipient: "",
    phone: "",
    address: "",
  });
  const [picForm, setPicForm] = useState({
    name: "",
    role: "",
    phone: "",
  });
  const [matrix, setMatrix] = useState<Variant[]>([]);
  const [qcDetails, setQcDetails] = useState<QCDetail[]>([]);
  const [bundleQty, setBundleQty] = useState(50);
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);
  const [print, setPrint] = useState<Note | null>(null);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/state")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((x) =>
        setData({
          ...x,
          models: x.models ?? [],
          vendors: x.vendors ?? [],
          qcLocations: x.qcLocations ?? [],
          pics: x.pics ?? [],
        }),
      )
      .catch(() => setData(initial))
      .finally(() => setLoaded(true));
  }, []);
  async function persist(next: AppData) {
    setData(next);
    setSaving(true);
    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("Gagal menyimpan");
    } catch {
      setData(data);
      flash("Data gagal disimpan. Silakan coba lagi.");
      throw new Error("Data gagal disimpan");
    } finally {
      setSaving(false);
    }
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
    const allocated = (data.records.Bundle ?? [])
      .filter((x) => x.sourceId === source.id)
      .flatMap((x) => x.variants);
    return source.variants.map((v) => ({
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
  function vendorForShipment(source?: RecordRow) {
    return data.vendors.find((v) => v.name === source?.destination);
  }
  function qcLocationForReceipt(receipt?: RecordRow) {
    const shipment = (data.records["Pengiriman Vendor"] ?? []).find(
        (x) => x.id === receipt?.sourceId,
      ),
      vendor = vendorForShipment(shipment);
    return (
      data.qcLocations.find(
        (x) => x.code === vendor?.qcLocationCode && x.active,
      ) ?? data.qcLocations.find((x) => x.active)
    );
  }
  function receiptUsesVendorQC(receipt: RecordRow) {
    if (receipt.qcMode === "vendor") return true;
    const shipment = (data.records["Pengiriman Vendor"] ?? []).find(
      (x) => x.id === receipt.sourceId,
    );
    return vendorForShipment(shipment)?.qcMode === "vendor";
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
    if (stage === "Pengiriman Vendor")
      return !(data.records["Pengiriman Vendor"] ?? []).some(
        (x) => x.sourceId === source.id,
      );
    if (stage === "Penerimaan Gudang")
      return sum(remainingAtVendor(source)) > 0;
    if (stage === "Pengiriman QC")
      return (
        !receiptUsesVendorQC(source) &&
        !(data.records["Pengiriman QC"] ?? []).some(
          (x) => x.sourceId === source.id,
        )
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
      ? active === "Cutting"
        ? remainingAtPO(first)
        : active === "Bundle"
          ? remainingFor(first)
          : active === "Penerimaan Gudang"
            ? remainingAtVendor(first)
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
    });
    if (source) {
      const available =
        active === "Cutting"
          ? remainingAtPO(source)
          : active === "Bundle"
            ? remainingFor(source)
            : active === "Penerimaan Gudang"
              ? remainingAtVendor(source)
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
      (data.records["Order Produksi"] ?? []).some(
        (x) => x.modelCode === editingCode,
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
    if (vendorForm.qcMode === "vendor" && !vendorForm.qcOfficer.trim()) {
      flash("Nama petugas wajib diisi untuk QC langsung di vendor.");
      return;
    }
    if (vendorForm.qcMode === "internal" && !vendorForm.qcLocationCode) {
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
      qcMode: vendorForm.qcMode,
      qcOfficer:
        vendorForm.qcMode === "vendor" ? vendorForm.qcOfficer.trim() : "",
      qcLocationCode:
        vendorForm.qcMode === "internal" ? vendorForm.qcLocationCode : "",
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
    const info = stageInfo[active];
    const model = data.models.find((x) => x.code === form.code);
    if (!model || sum(matrix) <= 0) return;
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
    if (
      active === "Pengiriman QC" &&
      (data.records["Pengiriman QC"] ?? []).some(
        (x) => x.sourceId === form.sourceId,
      )
    ) {
      flash("Penerimaan gudang ini sudah dikirim ke QC.");
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
    if (active === "Cutting") {
      const source = (data.records["Order Produksi"] ?? []).find(
        (x) => x.id === form.sourceId,
      );
      if (!source) return;
      const available = remainingAtPO(source);
      if (
        matrix.some(
          (v) =>
            v.qty >
            (available.find((a) => a.color === v.color && a.size === v.size)
              ?.qty ?? 0),
        )
      ) {
        flash(
          "Jumlah Cutting melebihi sisa PO pada warna atau ukuran tertentu.",
        );
        return;
      }
    }
    if (
      ![
        "Order Produksi",
        "Cutting",
        "Bundle",
        "Penerimaan Gudang",
        "Quality Control",
        "QC Ulang",
      ].includes(active)
    ) {
      const source = sourcesForStage(active).find(
        (x) => x.id === form.sourceId,
      );
      if (!source) return;
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
      if (vendorForShipment(source)?.qcMode === "vendor") {
        if (qcDetails.some((x) => x.passed + x.reject + x.repair !== x.qty)) {
          flash(
            "Hasil QC vendor harus terbagi tepat ke lolos, repair, dan reject.",
          );
          return;
        }
        if (
          qcDetails.some(
            (x) => (x.reject > 0 || x.repair > 0) && !x.note.trim(),
          )
        ) {
          flash("Catatan wajib untuk hasil repair atau reject dari QC vendor.");
          return;
        }
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
        active === "Bundle"
          ? (data.records.Cutting ?? []).find((x) => x.id === form.sourceId)
          : undefined,
      batchNo =
        active === "Cutting"
          ? (data.records.Cutting ?? []).filter(
              (x) => x.sourceId === form.sourceId,
            ).length + 1
          : cuttingSource?.batchNo,
      bundleNo =
        active === "Bundle"
          ? (data.records.Bundle ?? []).filter(
              (x) => x.sourceId === form.sourceId,
            ).length + 1
          : undefined;
    const poIdForCode =
      active === "Cutting" ? form.sourceId : cuttingSource?.poId;
    const poSequence = poIdForCode?.split("-").at(-1) ?? "000";
    const poToken = poLotToken(poIdForCode);
    const monthlyPOCount = (data.records["Order Produksi"] ?? []).filter(
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
      active === "Order Produksi"
        ? `PO-${model.code}-${periodYYMM(form.date)}-${String(monthlyPOCount + 1).padStart(3, "0")}`
        : active === "Cutting"
          ? `CUT-${model.code}-${poToken || `P${poSequence}`}-C${String(batchNo).padStart(2, "0")}`
          : active === "Bundle"
            ? `BDL-${model.code}-${poToken || `P${poSequence}`}-C${String(batchNo ?? 1).padStart(2, "0")}-B${String(bundleNo).padStart(3, "0")}`
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
    const directVendorQC =
      active === "Penerimaan Gudang" && receiptVendor?.qcMode === "vendor";
    const record: RecordRow = {
      id: recordId,
      stage: active,
      date: form.date,
      modelCode: model.code,
      modelName: model.name,
      sourceId: form.sourceId,
      variants: matrix.filter((x) => x.qty > 0),
      total: sum(matrix),
      status:
        active === "Quality Control" || active === "QC Ulang"
          ? "Selesai diperiksa"
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
      qcOfficer: directVendorQC ? receiptVendor?.qcOfficer : undefined,
      poId:
        active === "Cutting"
          ? form.sourceId
          : active === "Bundle"
            ? cuttingSource?.poId
            : (receiptShipment?.poId ?? tracePOId(recordSource)),
      batchNo,
      bundleNo: active === "Bundle" ? bundleNo : receiptShipment?.bundleNo,
      bundleId: active === "Bundle" ? recordId : inheritedBundleId,
      deliveryNoteId: receiptShipment?.deliveryNoteId,
    };
    let records = {
      ...data.records,
      [active]: [...(data.records[active] ?? []), record],
    };
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
    let notes = data.notes;
    const createsNote = [
      "Pengiriman Vendor",
      "Penerimaan Gudang",
      "Pengiriman QC",
      "Rework",
      "Penerimaan Rework",
    ].includes(active);
    if (createsNote && info.move) {
      const [fromDefault, toDefault] = info.move.split(" → ");
      const vendorShipment = (data.records["Pengiriman Vendor"] ?? []).find(
        (x) => x.id === form.sourceId,
      );
      const reworkShipment = (data.records.Rework ?? []).find(
        (x) => x.id === form.sourceId,
      );
      const from =
        active === "Penerimaan Gudang"
          ? vendorShipment?.destination || fromDefault
          : active === "Penerimaan Rework"
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
    flash(
      `${record.id} tersimpan${createsNote ? " dan surat jalan dibuat otomatis" : ""}.`,
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
    (data.records["Order Produksi"] ?? []).some(
      (x) => x.modelCode === editingCode,
    );

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
        <p>OPERASIONAL</p>
        <nav>
          {nav.map(([i, n]) => (
            <button
              key={n}
              className={active === n ? "active" : ""}
              onClick={() => {
                setActive(n);
                setMobileMenu(false);
              }}
            >
              <i>{i}</i>
              {n}
              {n === "Surat Jalan" && <em>{data.notes.length}</em>}
            </button>
          ))}
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
              placeholder="Cari PO, bundle, surat jalan..."
            />
          </label>
          <span className={`sync ${saving ? "busy" : ""}`}>
            {saving ? "● Menyimpan" : "✓ Tersimpan"}
          </span>
          <div className="top-avatar">AR</div>
        </header>
        <div className="workspace">
          {!loaded ? (
            <div className="loading">Menyiapkan data produksi…</div>
          ) : (
            <>
              {active === "Dashboard" && (
                <Dashboard data={data} go={setActive} />
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
                    setPicForm({ name: "", role: "", phone: "" });
                    setModal("pic");
                  }}
                  onEdit={(item) => {
                    setEditingPICCode(item.code);
                    setPicForm({
                      name: item.name,
                      role: item.role,
                      phone: item.phone,
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
                  <StagePage
                    active={active}
                    rows={current}
                    sources={sourcesForStage(active).filter(
                      (x) =>
                        active !== "Pengiriman QC" || x.qcMode !== "vendor",
                    )}
                    allRecords={data.records}
                    sourceCount={
                      sourcesForStage(active).filter(
                        (x) =>
                          active !== "Pengiriman QC" || x.qcMode !== "vendor",
                      ).length
                    }
                    onAdd={openRecord}
                  />
                  {(active === "Quality Control" || active === "QC Ulang") && (
                    <QCSummary rows={current} allRecords={data.records} />
                  )}{" "}
                  {active === "Rework" && (
                    <ReworkSummary
                      qcRows={data.records["Quality Control"] ?? []}
                      rows={current}
                    />
                  )}
                  <LiveStageStatus
                    active={active}
                    rows={current}
                    allRecords={data.records}
                  />
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
              {active === "Laporan" && <Reports data={data} />}
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
                    ? "Kode terkunci karena sudah digunakan dalam PO."
                    : "Dibuat otomatis, tetapi masih dapat diganti sebelum digunakan dalam PO."}
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
              <label className="full">
                Metode Quality Control
                <select
                  value={vendorForm.qcMode}
                  onChange={(e) =>
                    setVendorForm({
                      ...vendorForm,
                      qcMode: e.target.value as QCMode,
                      qcOfficer:
                        e.target.value === "internal"
                          ? ""
                          : vendorForm.qcOfficer,
                      qcLocationCode:
                        e.target.value === "internal"
                          ? vendorForm.qcLocationCode ||
                            data.qcLocations.find((x) => x.active)?.code ||
                            ""
                          : "",
                    })
                  }
                >
                  <option value="internal">
                    QC internal setelah barang masuk gudang
                  </option>
                  <option value="vendor">QC langsung di lokasi vendor</option>
                </select>
                <small>
                  Vendor dengan QC langsung tidak masuk antrean pengiriman QC
                  internal.
                </small>
              </label>
              {vendorForm.qcMode === "internal" ? (
                <label className="full">
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
                    Kelola daftar tujuan QC dari bagian Pengaturan QC di halaman
                    Master Vendor.
                  </small>
                </label>
              ) : (
                <label className="full">
                  Petugas QC di vendor
                  <input
                    required
                    placeholder="Contoh: Abah"
                    value={vendorForm.qcOfficer}
                    onChange={(e) =>
                      setVendorForm({
                        ...vendorForm,
                        qcOfficer: e.target.value,
                      })
                    }
                  />
                </label>
              )}
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
          <form className="form-modal matrix-modal" onSubmit={addRecord}>
            <button
              className="close"
              type="button"
              onClick={() => setModal(null)}
            >
              ×
            </button>
            <p className="overline">{active.toUpperCase()}</p>
            <h2>
              {active === "Order Produksi"
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
              {active === "Order Produksi" ? (
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
                  Sumber dari {stageInfo[active].source}
                  <select
                    required
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
                          {x.id} · {x.modelName} ·{" "}
                          {active === "Cutting"
                            ? sum(remainingAtPO(x))
                            : active === "Bundle"
                              ? sum(remainingFor(x))
                              : active === "Penerimaan Gudang"
                                ? sum(remainingAtVendor(x))
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
              {stageInfo[active].move && (
                <>
                  {active === "Pengiriman Vendor" ? (
                    <label>
                      Vendor jahit
                      <select
                        required
                        value={form.destination}
                        onChange={(e) =>
                          setForm({ ...form, destination: e.target.value })
                        }
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
            </div>
            {active === "Cutting" && form.sourceId && (
              <button
                type="button"
                className="quick-fill"
                onClick={() => {
                  const po = (data.records["Order Produksi"] ?? []).find(
                    (x) => x.id === form.sourceId,
                  );
                  if (po) setMatrix(remainingAtPO(po));
                }}
              >
                ✂ Potong seluruh sisa PO
              </button>
            )}
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
                            PO {bundle.poId || "—"} · Cutting C
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
              <button className="primary" disabled={sum(matrix) <= 0}>
                {[
                  "Pengiriman Vendor",
                  "Penerimaan Gudang",
                  "Pengiriman QC",
                ].includes(active)
                  ? "Simpan & buat surat jalan"
                  : "Simpan proses"}
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
      {print && <PrintNote note={print} close={() => setPrint(null)} />}
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
    "Pengiriman Vendor",
    "Penerimaan Gudang",
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
    [period, setPeriod] = useState<"today" | "week" | "month" | "custom">(
      "month",
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
    "Order Produksi": withBalance(records["Order Produksi"] ?? [], "Cutting"),
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
    { key: "Order Produksi", label: "PO Aktif", icon: "◇" },
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
            : customStart,
    rangeEnd = period === "custom" ? customEnd : today,
    inRange = (row: RecordRow) =>
      row.date >= rangeStart && row.date <= rangeEnd,
    periodRows = (stage: string) => (records[stage] ?? []).filter(inRange),
    qcActivity = [...periodRows("Quality Control"), ...periodRows("QC Ulang")],
    activity = [
      {
        label: "Dikirim Vendor",
        value: periodRows("Pengiriman Vendor").reduce((n, x) => n + x.total, 0),
      },
      {
        label: "Setoran Gudang",
        value: periodRows("Penerimaan Gudang").reduce((n, x) => n + x.total, 0),
      },
      {
        label: "Diperiksa QC",
        value: qcActivity.reduce((n, x) => n + x.total, 0),
      },
      {
        label: "Lolos QC",
        value: qcActivity.reduce((n, x) => n + (x.qcPassed ?? 0), 0),
      },
      {
        label: "Repair",
        value: qcActivity.reduce((n, x) => n + (x.qcRepair ?? 0), 0),
      },
      {
        label: "Reject",
        value: qcActivity.reduce((n, x) => n + (x.qcReject ?? 0), 0),
      },
      {
        label: "Masuk Stok",
        value: periodRows("Stok Barang Jadi").reduce((n, x) => n + x.total, 0),
      },
    ];
  const productionRows = [
      ...positions.Cutting,
      ...positions.Bundle,
      ...positions["Pengiriman Vendor"],
    ],
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
    projectedMaximum = stock + futurePotential,
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
          projected: actual + ready + awaiting + production + repair,
        };
      }),
      colorGroups = [...new Set(variants.map((variant) => variant.color))].map(
        (color) => {
          const colorVariants = variants.filter(
              (variant) => variant.color === color,
            ),
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
      projected: actual + ready + awaiting + production + repair,
      variants,
      colorGroups,
      vendors: [...vendorMap.entries()],
    };
  });
  const boardCards = cards.filter((x) => x.key !== "Stok Barang Jadi");
  return (
    <div className="owner-simple">
      <section className="stock-outlook">
        <header>
          <div>
            <h2>Stok jadi & potensi produksi</h2>
            <span>
              Saldo aktual dan estimasi berdasarkan posisi terakhir setiap unit
            </span>
          </div>
          <button type="button" onClick={() => go("Stok Barang Jadi")}>
            Buka data stok →
          </button>
        </header>
        <div className="stock-outlook-kpis">
          <article className="actual">
            <span>STOK JADI AKTUAL</span>
            <b>{stock}</b>
            <small>unit sudah dibukukan</small>
          </article>
          <article className="ready">
            <span>SIAP MASUK STOK</span>
            <b>{readyStock}</b>
            <small>lolos QC · belum stok</small>
          </article>
          <article className="waiting">
            <span>BELUM QC</span>
            <b>{awaitingQC}</b>
            <small>gudang dan antrean QC</small>
          </article>
          <article className="repair">
            <span>SEDANG REPAIR</span>
            <b>{repairPotential}</b>
            <small>masih berpotensi lolos</small>
          </article>
          <article className="forecast">
            <span>PROYEKSI MAKSIMUM</span>
            <b>{projectedMaximum}</b>
            <small>aktual + {futurePotential} potensi</small>
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
            <span>PROYEKSI</span>
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
                      <span>PROYEKSI</span>
                    </div>
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
                          <strong>{group.projected} unit proyeksi</strong>
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
                )}
              </div>
            ))
          )}
        </div>
        <footer>
          Potensi produksi belum dikurangi kemungkinan reject. Barang reject
          tidak masuk proyeksi.
        </footer>
      </section>
      <section className="owner-activity">
        <header>
          <div>
            <h2>Aktivitas periode</h2>
            <span>
              Hanya menyaring aktivitas · posisi barang tetap saldo sebenarnya
            </span>
          </div>
          <div className="period-switch" aria-label="Pilih rentang waktu">
            {[
              ["today", "Hari ini"],
              ["week", "Minggu ini"],
              ["month", "Bulan ini"],
              ["custom", "Custom"],
            ].map(([value, label]) => (
              <button
                type="button"
                className={period === value ? "active" : ""}
                key={value}
                onClick={() =>
                  setPeriod(value as "today" | "week" | "month" | "custom")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </header>
        {period === "custom" && (
          <div className="period-dates">
            <label>
              Dari
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </label>
            <label>
              Sampai
              <input
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </label>
          </div>
        )}
        <div className="activity-strip">
          {activity.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <b>{item.value}</b>
              <small>unit</small>
            </article>
          ))}
        </div>
      </section>
      <OwnerVendorMonitoring data={data} />
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
  return (
    <>
      <div className="page-title">
        <div>
          <p className="overline">MASTER DATA</p>
          <h1>PIC / Penanggung Jawab</h1>
          <span>
            Dipilih saat perpindahan barang dan dicetak pada surat jalan.
          </span>
        </div>
        <button className="primary" onClick={onAdd}>
          ＋ Tambah PIC
        </button>
      </div>
      {items.length === 0 ? (
        <Empty
          title="Belum ada PIC"
          text="Tambahkan penanggung jawab agar proses pengiriman tidak perlu mengetik nama manual."
        />
      ) : (
        <div className="model-grid">
          {items.map((item) => (
            <article key={item.code}>
              <div>
                <span>{item.code}</span>
                <em>{item.active ? "Aktif" : "Nonaktif"}</em>
              </div>
              <h2>{item.name}</h2>
              <small>JABATAN / TUGAS</small>
              <p>
                <b>{item.role || "PIC Produksi"}</b>
              </p>
              <small>KONTAK</small>
              <p>{item.phone || "Belum diisi"}</p>
              <footer>
                <span>Penanggung jawab transaksi</span>
                <div className="master-actions">
                  <button onClick={() => onEdit(item)}>✎ Edit</button>
                  <button className="danger" onClick={() => onDelete(item)}>
                    ♲ Hapus
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </div>
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
  return (
    <>
      <div className="page-title">
        <div>
          <p className="overline">MASTER DATA</p>
          <h1>Model Jaket</h1>
          <span>
            Warna dan ukuran dapat ditambah, diubah, atau dihapus kapan saja.
          </span>
        </div>
        <button className="primary" onClick={onAdd}>
          ＋ Tambah jaket
        </button>
      </div>
      {data.models.length === 0 ? (
        <Empty
          title="Belum ada master jaket"
          text="Tambahkan model jaket pertama untuk memulai PO produksi."
        />
      ) : (
        <div className="model-grid">
          {data.models.map((m) => (
            <article key={m.code}>
              <div>
                <span>{m.code}</span>
                <em>Aktif</em>
              </div>
              <h2>{m.name}</h2>
              <small>WARNA · {m.colors.length}</small>
              <p>
                {m.colors.map((c) => (
                  <b key={c}>{c}</b>
                ))}
              </p>
              <small>UKURAN · {m.sizes.length}</small>
              <p>
                {m.sizes.map((s) => (
                  <b key={s}>{s}</b>
                ))}
              </p>
              <footer>
                <span>
                  Kode: <strong>{m.code}</strong>
                </span>
                <div className="master-actions">
                  <button onClick={() => onEdit(m)}>✎ Edit</button>
                  <button className="danger" onClick={() => onDelete(m)}>
                    ♲ Hapus
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </div>
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
  return (
    <>
      <div className="page-title">
        <div>
          <p className="overline">MASTER DATA</p>
          <h1>Vendor Jahit & Pengaturan QC</h1>
          <span>
            Metode dan tujuan QC setiap vendor diatur dari satu halaman.
          </span>
        </div>
        <button className="primary" onClick={onAdd}>
          ＋ Tambah vendor
        </button>
      </div>
      {vendors.length === 0 ? (
        <Empty
          title="Belum ada vendor"
          text="Tambahkan tujuan QC di bawah, lalu buat vendor jahit pertama."
        />
      ) : (
        <div className="model-grid">
          {vendors.map((v) => {
            const target = qcLocations.find((x) => x.code === v.qcLocationCode);
            return (
              <article key={v.code}>
                <div>
                  <span>{v.code}</span>
                  <em>{v.active ? "Aktif" : "Nonaktif"}</em>
                </div>
                <h2>{v.name}</h2>
                <small>ALUR QUALITY CONTROL</small>
                <p>
                  <b>
                    {v.qcMode === "vendor"
                      ? "QC langsung di vendor"
                      : "QC internal setelah masuk gudang"}
                  </b>
                </p>
                {v.qcMode === "vendor" ? (
                  <>
                    <small>PETUGAS QC VENDOR</small>
                    <p>{v.qcOfficer || "Belum diisi"}</p>
                  </>
                ) : (
                  <>
                    <small>TUJUAN · PENERIMA QC</small>
                    <p>
                      {target
                        ? `${target.location} · ${target.recipient}`
                        : "Belum dipilih"}
                    </p>
                  </>
                )}
                <small>PENANGGUNG JAWAB · KONTAK</small>
                <p>
                  {v.contact || "Belum diisi"} · {v.phone || "—"}
                </p>
                <footer>
                  <span>{v.address || "Alamat belum diisi"}</span>
                  <div className="master-actions">
                    <button onClick={() => onEdit(v)}>✎ Edit</button>
                    <button className="danger" onClick={() => onDelete(v)}>
                      ♲ Hapus
                    </button>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
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
  sourceCount,
  onAdd,
}: {
  active: string;
  rows: RecordRow[];
  sources: RecordRow[];
  allRecords: Record<string, RecordRow[]>;
  sourceCount: number;
  onAdd: () => void;
}) {
  const info = stageInfo[active];
  const blocked = !!info.source && sourceCount === 0;
  const poCutBalance = (po: RecordRow) =>
    sum(
      subtractVariants(
        po.variants,
        (allRecords.Cutting ?? [])
          .filter((x) => x.sourceId === po.id)
          .flatMap((x) => x.variants),
      ),
    );
  const waitingPO =
    active === "Cutting" ? sources.filter((x) => poCutBalance(x) > 0) : [];
  const bookedPO =
    active === "Cutting" ? sources.filter((x) => poCutBalance(x) === 0) : [];
  const bundleCards =
    active === "Bundle"
      ? sources.map((source) => {
          const used = (allRecords.Bundle ?? [])
            .filter((x) => x.sourceId === source.id)
            .reduce((n, x) => n + x.total, 0);
          return {
            source,
            used,
            left: Math.max(0, source.total - used),
            count: (allRecords.Bundle ?? []).filter(
              (x) => x.sourceId === source.id,
            ).length,
          };
        })
      : [];
  const activeBundleCards = bundleCards.filter((x) => x.left > 0);
  const completedBundleCards = bundleCards.filter((x) => x.left === 0);
  const shippedIds = new Set(
    (allRecords["Pengiriman Vendor"] ?? []).map((x) => x.sourceId),
  );
  const availableToShip =
    active === "Pengiriman Vendor"
      ? sources.filter((x) => !shippedIds.has(x.id)).length
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
  const availableOnce =
    active === "Pengiriman QC" || active === "Quality Control"
      ? sources.filter((x) => !downstreamIds.has(x.id)).length
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
    <>
      <div className="page-title">
        <div>
          <p className="overline">PROSES TERHUBUNG</p>
          <h1>{info.title}</h1>
          <span>{info.desc}</span>
        </div>
        <button
          className="primary"
          disabled={
            blocked ||
            (active === "Cutting" && waitingPO.length === 0) ||
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
              ? "Proses PO tersedia"
              : active === "Bundle"
                ? "Buat bundle berikutnya"
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
        </button>
      </div>
      {blocked && (
        <div className="dependency">
          <b>Proses sebelumnya belum tersedia</b>
          <span>
            Buat data di modul {info.source} terlebih dahulu agar rincian warna
            dan ukuran dapat diteruskan.
          </span>
        </div>
      )}
      {active === "Cutting" && sourceCount > 0 && (
        <section className="queue-panel">
          <header>
            <div>
              <small>ANTREAN AKTIF</small>
              <h2>PO masih memiliki sisa Cutting</h2>
            </div>
            <b>{waitingPO.length} PO tersedia</b>
          </header>
          {waitingPO.length === 0 ? (
            <p className="queue-empty">
              Semua jumlah PO sudah selesai dipotong. Buat PO produksi baru
              untuk proses Cutting berikutnya.
            </p>
          ) : (
            <div>
              {waitingPO.map((po) => (
                <article key={po.id}>
                  <span>
                    <b>{po.id}</b>
                    <small>{po.date}</small>
                  </span>
                  <span>
                    <b>{po.modelName}</b>
                    <small>{po.modelCode}</small>
                  </span>
                  <strong>{poCutBalance(po)} unit tersisa</strong>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {active === "Cutting" && bookedPO.length > 0 && (
        <details className="completed-cuttings">
          <summary>
            <span>✓</span>
            <b>{bookedPO.length} PO selesai dipotong</b>
            <small>Saldo Cutting nol · klik untuk melihat</small>
          </summary>
          <div>
            {bookedPO.map((po) => (
              <p key={po.id}>
                <b>{po.id}</b>
                <span>{po.modelName}</span>
                <em>{po.total} unit · selesai</em>
              </p>
            ))}
          </div>
        </details>
      )}
      {active === "Pengiriman Vendor" && sourceCount > 0 && (
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
      {(active === "Pengiriman QC" || active === "Quality Control") &&
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
              Transaksi yang sudah dibukukan otomatis keluar dari antrean aktif
              dan tetap tersimpan di riwayat.
            </p>
          </div>
        )}
      {active === "Quality Control" && qcSummary.length > 0 && (
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
      {active === "Penerimaan Gudang" && activeVendorCards.length > 0 && (
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
      {active === "Penerimaan Gudang" && completedVendorCards.length > 0 && (
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
      {active === "Bundle" && activeBundleCards.length > 0 && (
        <div className="bundle-balance">
          {activeBundleCards.map((x) => (
            <article key={x.source.id}>
              <div>
                <span>CUTTING SUMBER</span>
                <b>{x.source.id}</b>
                <small>{x.source.modelName}</small>
              </div>
              <div>
                <span>HASIL CUTTING</span>
                <b>{x.source.total}</b>
                <small>unit</small>
              </div>
              <div>
                <span>SUDAH DIBUNDLE</span>
                <b>{x.used}</b>
                <small>{x.count} bundle</small>
              </div>
              <div>
                <span>SISA BELUM DIBUNDLE</span>
                <b>{x.left}</b>
                <small>unit tersedia</small>
              </div>
            </article>
          ))}
        </div>
      )}
      {active === "Bundle" && completedBundleCards.length > 0 && (
        <details className="completed-cuttings">
          <summary>
            <span>✓</span>
            <b>{completedBundleCards.length} cutting selesai dibundle</b>
            <small>Saldo nol · klik untuk melihat nomor cutting</small>
          </summary>
          <div>
            {completedBundleCards.map((x) => (
              <p key={x.source.id}>
                <b>{x.source.id}</b>
                <span>{x.source.modelName}</span>
                <em>
                  {x.source.total} unit · {x.count} bundle
                </em>
              </p>
            ))}
          </div>
        </details>
      )}
      <section
        className={`panel table-panel ${active === "Bundle" ? "bounded-table" : ""}`}
      >
        {rows.length === 0 ? (
          <Empty
            title={`Belum ada ${active.toLowerCase()}`}
            text={
              blocked
                ? `Menunggu data dari ${info.source}.`
                : "Mulai transaksi pertama; kode akan dibuat otomatis."
            }
          />
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>KODE OTOMATIS</th>
                  <th>TANGGAL</th>
                  <th>SUMBER</th>
                  <th>MODEL</th>
                  <th>RINCIAN</th>
                  <th>TOTAL</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.id}</b>
                    </td>
                    <td>{r.date}</td>
                    <td>{r.sourceId || "Master Jaket"}</td>
                    <td>
                      <b>{r.modelName}</b>
                      <small>{r.modelCode}</small>
                      {r.bundleId && (
                        <small>Bundle {shortBundleCode(r.bundleId)}</small>
                      )}
                    </td>
                    <td>
                      <small>
                        {r.variants
                          .map((v) => `${v.color} ${v.size}: ${v.qty}`)
                          .join(" · ")}
                      </small>
                    </td>
                    <td>
                      <b>{r.total}</b> unit
                    </td>
                    <td>
                      <span className="status">
                        {r.remainingStatus || r.status}
                      </span>
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
      title: "Kembali ke Gudang",
      desc: "Vendor jahit → gudang",
      match: (n: Note) => n.process === "Vendor Jahit → Gudang",
    },
    {
      no: "03",
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
            Tiga kelompok dokumen mengikuti urutan perpindahan produksi.
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
function Reports({ data }: { data: AppData }) {
  return (
    <>
      <div className="page-title">
        <div>
          <p className="overline">REKONSILIASI</p>
          <h1>Laporan Produksi</h1>
          <span>Rekap berdasarkan hubungan PO dan transaksi turunannya.</span>
        </div>
      </div>
      <div className="report-grid">
        {data.records["Order Produksi"]?.length ? (
          <>
            {data.records["Order Produksi"].map((po) => (
              <article key={po.id}>
                <i>◇</i>
                <h3>{po.id}</h3>
                <p>
                  {po.modelName} · {po.total} unit
                </p>
                <button>Telusuri seluruh proses →</button>
              </article>
            ))}
          </>
        ) : (
          <article>
            <i>▥</i>
            <h3>Belum ada PO</h3>
            <p>Laporan akan tersedia setelah PO produksi dibuat.</p>
          </article>
        )}
      </div>
    </>
  );
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
