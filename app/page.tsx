"use client";

import { useMemo, useState } from "react";

type Bundle = {
  code: string;
  model: string;
  color: string;
  vendor: string;
  qty: number;
  progress: number;
  status: string;
  due: string;
  tone: "blue" | "amber" | "green" | "red";
  positions: { label: string; qty: number; color: string }[];
};

const bundles: Bundle[] = [
  {
    code: "SNV-20260721-B001",
    model: "Supernova",
    color: "Hitam",
    vendor: "Konveksi Bintang",
    qty: 40,
    progress: 75,
    status: "Selesai sebagian",
    due: "30 Jul 2026",
    tone: "blue",
    positions: [
      { label: "Di vendor", qty: 10, color: "#eaaa35" },
      { label: "Menunggu QC", qty: 6, color: "#7468d7" },
      { label: "Masuk stok", qty: 24, color: "#269a6a" },
    ],
  },
  {
    code: "ORN-20260722-B004",
    model: "Orion",
    color: "Olive",
    vendor: "Konveksi Maju",
    qty: 35,
    progress: 46,
    status: "Sedang dikerjakan",
    due: "2 Agu 2026",
    tone: "amber",
    positions: [
      { label: "Di vendor", qty: 19, color: "#eaaa35" },
      { label: "Menunggu QC", qty: 8, color: "#7468d7" },
      { label: "Masuk stok", qty: 8, color: "#269a6a" },
    ],
  },
  {
    code: "NBL-20260718-B002",
    model: "Nebula",
    color: "Navy",
    vendor: "Konveksi Sinar",
    qty: 30,
    progress: 100,
    status: "Menunggu QC",
    due: "28 Jul 2026",
    tone: "green",
    positions: [
      { label: "Menunggu QC", qty: 20, color: "#7468d7" },
      { label: "Rework", qty: 3, color: "#df665a" },
      { label: "Masuk stok", qty: 7, color: "#269a6a" },
    ],
  },
  {
    code: "VTX-20260717-B003",
    model: "Vortex",
    color: "Maroon",
    vendor: "Konveksi Karya",
    qty: 50,
    progress: 88,
    status: "Terlambat 3 hari",
    due: "26 Jul 2026",
    tone: "red",
    positions: [
      { label: "Di vendor", qty: 6, color: "#eaaa35" },
      { label: "Lolos QC", qty: 8, color: "#3a9ebe" },
      { label: "Masuk stok", qty: 36, color: "#269a6a" },
    ],
  },
];

const vendors = [
  { name: "Konveksi Bintang", sent: 320, returned: 268, pct: 84, quality: 96 },
  { name: "Konveksi Karya", sent: 285, returned: 228, pct: 80, quality: 93 },
  { name: "Konveksi Maju", sent: 240, returned: 178, pct: 74, quality: 95 },
  { name: "Konveksi Sinar", sent: 195, returned: 164, pct: 84, quality: 97 },
];

const nav = [
  ["▦", "Dashboard"],
  ["◇", "Order Produksi"],
  ["✂", "Cutting & Bundle"],
  ["↗", "Pengiriman"],
  ["⌁", "Progres Vendor"],
  ["□", "Penerimaan Gudang"],
  ["✓", "Quality Control"],
  ["↻", "Rework"],
  ["▣", "Stok Barang Jadi"],
  ["▤", "Laporan"],
];

function Donut() {
  return (
    <div className="donut-wrap">
      <div className="donut"><strong>96.1%</strong><span>lolos QC</span></div>
      <div className="legend">
        <div><i style={{ background: "#238b63" }} />Lolos QC <b>347</b></div>
        <div><i style={{ background: "#edb44b" }} />Rework <b>11</b></div>
        <div><i style={{ background: "#df665a" }} />Reject <b>3</b></div>
      </div>
    </div>
  );
}

export default function Home() {
  const [period, setPeriod] = useState("Bulan ini");
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [selected, setSelected] = useState<Bundle | null>(null);
  const [notice, setNotice] = useState("");

  const filtered = useMemo(
    () => bundles.filter((b) => `${b.code} ${b.model} ${b.vendor} ${b.status}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  function quickAction(label: string) {
    setNotice(`${label} siap dicatat. Form transaksi versi operasional akan dibuka dari menu terkait.`);
    window.setTimeout(() => setNotice(""), 3200);
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span>ON</span><div><b>CRAFT</b><small>PRODUCTION OS</small></div></div>
        <p className="nav-label">OPERASIONAL</p>
        <nav>
          {nav.map(([icon, label]) => (
            <button key={label} onClick={() => setActiveNav(label)} className={activeNav === label ? "active" : ""}>
              <span>{icon}</span>{label}{label === "Quality Control" && <em>24</em>}
            </button>
          ))}
        </nav>
        <p className="nav-label master">MASTER DATA</p>
        <nav>
          <button><span>♙</span>Model Jaket</button>
          <button><span>⌂</span>Vendor Jahit</button>
          <button><span>⚙</span>Pengaturan</button>
        </nav>
        <div className="side-user">
          <div className="avatar">AR</div>
          <div><b>Andi Rahman</b><small>Owner / Admin</small></div>
          <button aria-label="Menu akun">•••</button>
        </div>
      </aside>

      <section className="content">
        <header>
          <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari bundle, order, model, atau vendor..." /><kbd>⌘ K</kbd></label>
          <div className="header-actions"><button className="icon-btn" aria-label="Notifikasi">♢<i /></button><button className="help">?</button></div>
        </header>

        <div className="page">
          <div className="title-row">
            <div><p className="eyebrow">RABU, 29 JULI 2026</p><h1>Selamat sore, Andi.</h1><p>Pantau alur produksi dan posisi setiap barang dari satu tempat.</p></div>
            <div className="filters">
              <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Periode">
                <option>Bulan ini</option><option>Minggu ini</option><option>Hari ini</option><option>Tahun ini</option>
              </select>
              <button className="outline">☷ &nbsp;Filter</button>
              <button className="primary" onClick={() => quickAction("Order produksi baru")}>＋ Order baru</button>
            </div>
          </div>

          <div className="alert"><span>!</span><p><b>3 hal perlu perhatian</b><small>2 bundle melewati target selesai dan 1 penerimaan memiliki selisih jumlah.</small></p><button onClick={() => setNotice("Menampilkan bundle dan transaksi yang perlu ditindaklanjuti.")}>Lihat detail →</button></div>

          <div className="metric-grid">
            <article><div className="metric-icon green">✂</div><p>HASIL CUTTING</p><strong>1.240 <small>unit</small></strong><span className="up">↑ 12,7%</span><small>vs. bulan lalu</small></article>
            <article><div className="metric-icon amber">⌂</div><p>MASIH DI VENDOR</p><strong>286 <small>unit</small></strong><span className="down">↓ 8,4%</span><small>vs. bulan lalu</small></article>
            <article><div className="metric-icon violet">◫</div><p>MENUNGGU QC</p><strong>64 <small>unit</small></strong><span className="warn">24</span><small>lebih dari 2 hari</small></article>
            <article><div className="metric-icon blue">✓</div><p>LOLOS QC</p><strong>347 <small>unit</small></strong><span className="up">↑ 9,2%</span><small>vs. bulan lalu</small></article>
            <article><div className="metric-icon teal">▣</div><p>MASUK STOK</p><strong>1.008 <small>unit</small></strong><span className="up">↑ 15,6%</span><small>vs. bulan lalu</small></article>
          </div>

          <div className="flow-card">
            <div className="section-head"><div><h2>Posisi WIP saat ini</h2><p>Distribusi 1.240 unit hasil cutting aktif</p></div><span>Rekonsiliasi <b>seimbang ✓</b></span></div>
            <div className="flow">
              {[
                ["Gudang cutting", "48", "4 bundle", "cut"],
                ["Vendor jahit", "286", "12 bundle", "vendor"],
                ["Gudang hasil", "71", "3 penerimaan", "warehouse"],
                ["Quality control", "64", "24 terlambat", "qc"],
                ["Rework", "11", "3 bundle", "repair"],
                ["Barang jadi", "760", "Siap dijual", "stock"],
              ].map((x, i) => <div className={`flow-step ${x[3]}`} key={x[0]}><div className="flow-icon">{["✂","⌂","□","✓","↻","▣"][i]}</div><div><small>{x[0]}</small><strong>{x[1]} <em>unit</em></strong><span>{x[2]}</span></div>{i < 5 && <b className="arrow">→</b>}</div>)}
            </div>
          </div>

          <div className="split">
            <article className="panel trend">
              <div className="section-head"><div><h2>Tren produksi</h2><p>Pergerakan 8 minggu terakhir</p></div><button>8 minggu ⌄</button></div>
              <div className="chart-area">
                <div className="ylabels"><span>300</span><span>200</span><span>100</span><span>0</span></div>
                <div className="bars">
                  {[["W1",64,52,42],["W2",72,61,48],["W3",58,54,46],["W4",82,68,60],["W5",75,70,64],["W6",90,76,66],["W7",86,80,70],["W8",96,84,78]].map(([w,a,b,c]) =>
                    <div className="bar-group" key={w}><div className="barset"><i style={{height:`${a}%`}}/><i style={{height:`${b}%`}}/><i style={{height:`${c}%`}}/></div><span>{w}</span></div>
                  )}
                </div>
              </div>
              <div className="chart-legend"><span><i className="l1"/>Cutting</span><span><i className="l2"/>Selesai jahit</span><span><i className="l3"/>Masuk stok</span></div>
            </article>
            <article className="panel qc-card">
              <div className="section-head"><div><h2>Hasil quality control</h2><p>{period} · 361 unit diperiksa</p></div><button>•••</button></div>
              <Donut />
              <div className="qc-note"><span>↗</span><p><b>Kualitas naik 1,8%</b><small>dibandingkan bulan lalu</small></p></div>
            </article>
          </div>

          <article className="panel bundle-table">
            <div className="section-head"><div><h2>Bundle aktif</h2><p>Bundle yang masih bergerak di jalur produksi</p></div><button className="link-btn" onClick={() => setActiveNav("Cutting & Bundle")}>Lihat semua bundle →</button></div>
            <div className="table-scroll">
              <table><thead><tr><th>KODE BUNDLE</th><th>MODEL / WARNA</th><th>VENDOR</th><th>JUMLAH</th><th>PROGRES JAHIT</th><th>TARGET</th><th>STATUS</th><th></th></tr></thead>
              <tbody>{filtered.map((b) => <tr key={b.code} onClick={() => setSelected(b)}>
                <td><b>{b.code}</b><small>PO-{b.code.slice(0,3)}-202607-00{bundles.indexOf(b)+1}</small></td>
                <td><b>{b.model}</b><small><i className={`swatch ${b.color.toLowerCase()}`}/>{b.color}</small></td>
                <td>{b.vendor}</td><td><b>{b.qty}</b> unit</td>
                <td><div className="progress-label"><span>{Math.round((b.qty*b.progress)/100)} / {b.qty}</span><b>{b.progress}%</b></div><div className="progress"><i style={{width:`${b.progress}%`}}/></div></td>
                <td>{b.due}</td><td><span className={`status ${b.tone}`}>{b.status}</span></td><td>›</td>
              </tr>)}</tbody></table>
            </div>
          </article>

          <div className="split lower">
            <article className="panel vendor-panel">
              <div className="section-head"><div><h2>Kinerja vendor jahit</h2><p>Penyelesaian dan kualitas bulan ini</p></div><button>Detail vendor →</button></div>
              {vendors.map(v => <div className="vendor-row" key={v.name}><div className="vendor-badge">{v.name.split(" ")[1][0]}</div><div className="vendor-main"><b>{v.name}</b><span>{v.returned} dari {v.sent} unit kembali</span><div className="progress"><i style={{width:`${v.pct}%`}}/></div></div><div className="vendor-stat"><b>{v.pct}%</b><span>Selesai</span></div><div className="vendor-stat quality"><b>{v.quality}%</b><span>Lolos QC</span></div></div>)}
            </article>
            <article className="panel activity">
              <div className="section-head"><div><h2>Aktivitas terbaru</h2><p>Pergerakan barang hari ini</p></div><button>Riwayat →</button></div>
              {[
                ["✓","QC selesai","24 unit SNV lolos pemeriksaan","14:32","green"],
                ["□","Penerimaan gudang","18 unit dari Konveksi Maju","13:08","blue"],
                ["↗","Bundle dikirim","ORN-B005 · 35 unit ke vendor","10:45","amber"],
                ["✂","Cutting dicatat","Vortex Maroon · 50 unit","09:20","violet"],
              ].map(x => <div className="activity-row" key={x[1]}><span className={x[4]}>{x[0]}</span><p><b>{x[1]}</b><small>{x[2]}</small></p><time>{x[3]}</time></div>)}
            </article>
          </div>
        </div>
      </section>

      {notice && <div className="toast">✓ {notice}</div>}

      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}>
        <section className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="close" onClick={() => setSelected(null)}>×</button>
          <p className="eyebrow">DETAIL BUNDLE</p><h2>{selected.code}</h2>
          <p className="modal-sub">{selected.model} · {selected.color} · {selected.qty} unit</p>
          <div className="modal-meta"><div><small>Vendor jahit</small><b>{selected.vendor}</b></div><div><small>Target selesai</small><b>{selected.due}</b></div></div>
          <h3>Posisi unit saat ini</h3>
          <div className="position-bar">{selected.positions.map(p => <i key={p.label} style={{width:`${p.qty/selected.qty*100}%`,background:p.color}} />)}</div>
          <div className="position-list">{selected.positions.map(p => <div key={p.label}><i style={{background:p.color}}/><span>{p.label}</span><b>{p.qty} unit</b></div>)}</div>
          <h3>Riwayat terbaru</h3>
          <div className="timeline"><div><i/><p><b>Setoran diterima gudang</b><span>29 Jul 2026 · 8 unit</span></p></div><div><i/><p><b>Progres vendor diperbarui</b><span>27 Jul 2026 · {selected.progress}% selesai</span></p></div><div><i/><p><b>Bundle dikirim ke vendor</b><span>22 Jul 2026 · {selected.qty} unit</span></p></div></div>
          <button className="primary modal-action" onClick={() => quickAction("Penerimaan setoran vendor")}>＋ Catat setoran vendor</button>
        </section>
      </div>}
    </main>
  );
}
