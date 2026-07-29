"use client";

import { FormEvent, useMemo, useState } from "react";

type Row = { id: string; date: string; model: string; qty: number; status: string; detail?: string };
type DeliveryNote = Row & { process: string; from: string; to: string; bundle: string; color: string; sizes: string; officer: string; note: string };

const modules = [
  ["▦", "Dashboard", "Ringkasan seluruh posisi produksi"],
  ["◇", "Order Produksi", "Target produksi per model, warna, dan ukuran"],
  ["✂", "Cutting", "Catat hasil potong kain"],
  ["▱", "Bundle", "Bagi hasil cutting menjadi bundle"],
  ["▤", "Surat Jalan", "Dokumen wajib setiap perpindahan"],
  ["↗", "Pengiriman Vendor", "Bundle keluar ke vendor jahit"],
  ["⌁", "Progres Vendor", "Update setoran dan sisa jahit"],
  ["□", "Penerimaan Gudang", "Terima setoran vendor bertahap"],
  ["✓", "Quality Control", "Lolos, repair, dan reject"],
  ["↻", "Rework", "Pantau barang dalam perbaikan"],
  ["▣", "Stok Barang Jadi", "Barang lolos QC di gudang"],
  ["▥", "Laporan", "Rekap WIP dan rekonsiliasi"],
];

const configs: Record<string, { title: string; desc: string; action: string; columns: string[] }> = {
  "Order Produksi": { title: "Order Produksi", desc: "Buat target produksi sebagai induk proses jaket.", action: "Buat order", columns: ["Nomor order", "Tanggal", "Model", "Target", "Status"] },
  Cutting: { title: "Cutting", desc: "Catat kain yang selesai dipotong dan rincian ukurannya.", action: "Catat cutting", columns: ["Nomor cutting", "Tanggal", "Model", "Hasil", "Status"] },
  Bundle: { title: "Bundle Produksi", desc: "Bagi cutting menjadi unit kerja yang dapat dilacak.", action: "Buat bundle", columns: ["Kode bundle", "Tanggal", "Model", "Jumlah", "Status"] },
  "Pengiriman Vendor": { title: "Pengiriman ke Vendor", desc: "Pengiriman hanya terbentuk dari surat jalan proses KIRIM-VENDOR.", action: "Buat surat jalan", columns: ["Nomor surat jalan", "Tanggal", "Vendor", "Jumlah", "Status"] },
  "Progres Vendor": { title: "Progres Vendor Jahit", desc: "Catat jumlah selesai, sedang dikerjakan, dan belum dikerjakan.", action: "Update progres", columns: ["Bundle", "Tanggal update", "Vendor", "Selesai", "Status"] },
  "Penerimaan Gudang": { title: "Penerimaan Gudang", desc: "Terima setoran mingguan vendor seluruhnya atau sebagian.", action: "Buat surat jalan", columns: ["Nomor surat jalan", "Tanggal", "Asal vendor", "Diterima", "Status"] },
  "Quality Control": { title: "Quality Control", desc: "Pemeriksaan dapat dilakukan tanpa menunggu seluruh bundle kembali.", action: "Catat hasil QC", columns: ["Nomor QC", "Tanggal", "Model", "Diperiksa", "Status"] },
  Rework: { title: "Rework / Repair", desc: "Barang repair tetap terlihat hingga kembali dan selesai QC ulang.", action: "Buat surat jalan", columns: ["Nomor rework", "Tanggal", "Tujuan", "Jumlah", "Status"] },
  "Stok Barang Jadi": { title: "Stok Barang Jadi", desc: "Hanya barang lolos QC yang dapat masuk stok.", action: "Buat surat jalan", columns: ["Nomor surat jalan", "Tanggal", "Model", "Jumlah", "Lokasi"] },
};

const processCodes: Record<string, string> = {
  "Cutting ke Gudang Cutting": "CUT-GDG",
  "Gudang Cutting ke Vendor Jahit": "KRM-VDR",
  "Vendor Jahit ke Gudang": "TRM-GDG",
  "Gudang ke Quality Control": "KRM-QC",
  "Quality Control ke Rework": "KRM-RWK",
  "Rework ke Quality Control": "TRM-RWK",
  "Quality Control ke Stok Jadi": "QC-STK",
};

function today() { return new Date().toISOString().slice(0, 10); }
function dateCode(v: string) { return v.replaceAll("-", ""); }

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Record<string, Row[]>>({});
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [modal, setModal] = useState<null | "record" | "note">(null);
  const [printNote, setPrintNote] = useState<DeliveryNote | null>(null);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({ date: today(), model: "", code: "", color: "", qty: "", detail: "", process: "Gudang Cutting ke Vendor Jahit", from: "Gudang Cutting", to: "", bundle: "", sizes: "", officer: "", note: "" });

  const activeRows = rows[active] ?? [];
  const filteredNotes = useMemo(() => notes.filter(n => `${n.id} ${n.model} ${n.process} ${n.from} ${n.to}`.toLowerCase().includes(query.toLowerCase())), [notes, query]);

  function flash(message: string) { setToast(message); window.setTimeout(() => setToast(""), 3000); }
  function openNote(process?: string) {
    setForm({ date: today(), model: "", code: "", color: "", qty: "", detail: "", process: process ?? "Gudang Cutting ke Vendor Jahit", from: "", to: "", bundle: "", sizes: "", officer: "", note: "" });
    setModal("note");
  }
  function generatedNumber() {
    const code = (form.code || "JKT").toUpperCase().slice(0, 5);
    const proc = processCodes[form.process] || "PINDAH";
    return `SJ-${dateCode(form.date)}-${code}-${proc}-${String(notes.length + 1).padStart(3, "0")}`;
  }
  function submitRecord(e: FormEvent) {
    e.preventDefault();
    const idPrefix: Record<string, string> = { "Order Produksi": "PO", Cutting: "CUT", Bundle: "BDL", "Progres Vendor": "PRG", "Quality Control": "QC" };
    const id = `${idPrefix[active] ?? "TRX"}-${(form.code || "JKT").toUpperCase()}-${dateCode(form.date)}-${String(activeRows.length + 1).padStart(3, "0")}`;
    const row: Row = { id, date: form.date, model: form.model, qty: Number(form.qty), detail: form.detail, status: active === "Quality Control" ? "Menunggu hasil" : "Aktif" };
    setRows(prev => ({ ...prev, [active]: [...(prev[active] ?? []), row] }));
    setModal(null); flash(`${id} berhasil dibuat.`);
  }
  function submitNote(e: FormEvent) {
    e.preventDefault();
    const note: DeliveryNote = { id: form.detail.trim() || generatedNumber(), date: form.date, model: form.model, qty: Number(form.qty), status: "Tercatat", detail: "", process: form.process, from: form.from, to: form.to, bundle: form.bundle, color: form.color, sizes: form.sizes, officer: form.officer, note: form.note };
    setNotes(prev => [...prev, note]); setModal(null); setPrintNote(note); flash(`${note.id} berhasil dicatat dan siap dicetak.`);
  }

  return (
    <main className="app-shell">
      <aside className="app-side">
        <div className="app-brand"><span>ON</span><div><b>CRAFT</b><small>PRODUCTION OS</small></div></div>
        <p>OPERASIONAL</p>
        <nav>{modules.map(([icon, label]) => <button key={label} className={active === label ? "active" : ""} onClick={() => { setActive(label); setQuery(""); }}><i>{icon}</i>{label}{label === "Surat Jalan" && <em>{notes.length}</em>}</button>)}</nav>
        <div className="user-card"><span>AR</span><div><b>Andi Rahman</b><small>Owner / Admin</small></div></div>
      </aside>

      <section className="app-main">
        <header className="topbar">
          <label><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nomor surat jalan, bundle, model..." /></label>
          <button className="bell">♢</button><div className="top-avatar">AR</div>
        </header>

        <div className="workspace">
          {active === "Dashboard" && <Dashboard notes={notes} rows={rows} go={setActive} openNote={openNote} />}
          {active === "Surat Jalan" && <DeliveryNotes notes={filteredNotes} query={query} setQuery={setQuery} openNote={openNote} onPrint={setPrintNote} />}
          {active === "Laporan" && <Reports notes={notes} rows={rows} />}
          {active !== "Dashboard" && active !== "Surat Jalan" && active !== "Laporan" && (
            <ModulePage active={active} rows={activeRows} onAdd={() => {
              if (["Pengiriman Vendor", "Penerimaan Gudang", "Rework", "Stok Barang Jadi"].includes(active)) {
                const process = active === "Pengiriman Vendor" ? "Gudang Cutting ke Vendor Jahit" : active === "Penerimaan Gudang" ? "Vendor Jahit ke Gudang" : active === "Rework" ? "Quality Control ke Rework" : "Quality Control ke Stok Jadi";
                openNote(process);
              } else { setForm({ ...form, date: today(), model: "", code: "", qty: "", detail: "" }); setModal("record"); }
            }} onMove={() => openNote()} />
          )}
        </div>
      </section>

      {modal === "record" && <div className="overlay"><form className="form-modal" onSubmit={submitRecord}><button type="button" className="close" onClick={() => setModal(null)}>×</button><p className="overline">{active.toUpperCase()}</p><h2>{configs[active]?.action}</h2><div className="field-grid"><label>Tanggal<input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label><label>Kode jaket<input required maxLength={5} placeholder="Contoh: SNV" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></label><label>Model jaket<input required placeholder="Contoh: Supernova" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></label><label>Jumlah unit<input required min="1" type="number" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} /></label><label className="full">Keterangan<input placeholder="Warna, ukuran, vendor, atau catatan" value={form.detail} onChange={e => setForm({ ...form, detail: e.target.value })} /></label></div><div className="form-actions"><button type="button" onClick={() => setModal(null)}>Batal</button><button className="primary">Simpan data</button></div></form></div>}

      {modal === "note" && <div className="overlay"><form className="form-modal note-form" onSubmit={submitNote}><button type="button" className="close" onClick={() => setModal(null)}>×</button><p className="overline">DOKUMEN PERPINDAHAN</p><h2>Buat Surat Jalan</h2><div className="auto-number"><small>Nomor otomatis</small><b>{generatedNumber()}</b><span>Nomor manual dapat diisi jika sudah ada surat fisik.</span></div><div className="field-grid">
        <label>Tanggal surat jalan<input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
        <label>Nomor surat jalan manual <small>(opsional)</small><input placeholder={generatedNumber()} value={form.detail} onChange={e => setForm({ ...form, detail: e.target.value.toUpperCase() })} /></label>
        <label className="full">Jenis proses<select value={form.process} onChange={e => setForm({ ...form, process: e.target.value })}>{Object.keys(processCodes).map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Kode jaket<input required maxLength={5} placeholder="SNV" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></label>
        <label>Model jaket<input required placeholder="Supernova" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></label>
        <label>Warna<input required placeholder="Hitam" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} /></label>
        <label>Kode bundle<input required placeholder="SNV-20260729-B001" value={form.bundle} onChange={e => setForm({ ...form, bundle: e.target.value.toUpperCase() })} /></label>
        <label>Jumlah unit<input required min="1" type="number" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} /></label>
        <label>Rincian ukuran<input placeholder="S: 5, M: 10, L: 10" value={form.sizes} onChange={e => setForm({ ...form, sizes: e.target.value })} /></label>
        <label>Lokasi asal<input required placeholder="Gudang Cutting" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} /></label>
        <label>Lokasi tujuan<input required placeholder="Konveksi Bintang" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} /></label>
        <label>Petugas / Pengirim<input required placeholder="Nama petugas" value={form.officer} onChange={e => setForm({ ...form, officer: e.target.value })} /></label>
        <label>Catatan<input placeholder="Kondisi atau keterangan" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></label>
      </div><div className="form-actions"><button type="button" onClick={() => setModal(null)}>Batal</button><button className="primary">Simpan & lihat cetakan</button></div></form></div>}

      {printNote && <div className="overlay print-overlay"><section className="print-sheet"><div className="print-toolbar"><button onClick={() => setPrintNote(null)}>← Tutup</button><button className="primary" onClick={() => window.print()}>▣ Cetak surat jalan</button></div><div className="print-document"><div className="print-head"><div className="print-brand"><b>ON CRAFT</b><span>PRODUCTION OS</span></div><div><h1>SURAT JALAN</h1><b>{printNote.id}</b></div></div><div className="print-meta"><div><span>Tanggal</span><b>{new Date(`${printNote.date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</b></div><div><span>Jenis proses</span><b>{printNote.process}</b></div><div><span>Dari</span><b>{printNote.from}</b></div><div><span>Tujuan</span><b>{printNote.to}</b></div></div><table><thead><tr><th>Model jaket</th><th>Warna</th><th>Kode bundle</th><th>Ukuran</th><th>Jumlah</th></tr></thead><tbody><tr><td>{printNote.model}</td><td>{printNote.color}</td><td>{printNote.bundle}</td><td>{printNote.sizes || "Campur"}</td><td><b>{printNote.qty} unit</b></td></tr></tbody></table><div className="print-note"><span>Catatan</span><p>{printNote.note || "Tidak ada catatan."}</p></div><div className="signatures"><div><span>Pengirim</span><i/><b>{printNote.officer}</b></div><div><span>Mengetahui</span><i/><b>(........................)</b></div><div><span>Penerima</span><i/><b>(........................)</b></div></div><footer>Dokumen ini menjadi bukti perpindahan barang dan harus disimpan bersama riwayat bundle.</footer></div></section></div>}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function Dashboard({ notes, rows, go, openNote }: { notes: DeliveryNote[]; rows: Record<string, Row[]>; go: (x: string) => void; openNote: () => void }) {
  const total = (key: string) => (rows[key] ?? []).reduce((s, x) => s + x.qty, 0);
  const cards = [["Hasil cutting", total("Cutting"), "✂"], ["Bundle aktif", (rows.Bundle ?? []).length, "▱"], ["Masih di vendor", total("Progres Vendor"), "⌂"], ["Menunggu QC", total("Quality Control"), "✓"], ["Masuk stok", total("Stok Barang Jadi"), "▣"]];
  return <><div className="page-title"><div><p className="overline">DASHBOARD OWNER</p><h1>Alur produksi On Craft</h1><span>Data masih kosong. Mulai dari order produksi atau catat surat jalan perpindahan.</span></div><div><button onClick={() => openNote()}>▤ Buat surat jalan</button><button className="primary" onClick={() => go("Order Produksi")}>＋ Buat order</button></div></div>
    <div className="empty-banner"><span>i</span><p><b>Workspace produksi siap digunakan</b><small>Belum ada data contoh. Semua angka akan muncul dari input transaksi Anda.</small></p></div>
    <div className="kpis">{cards.map(([label, value, icon]) => <article key={String(label)}><i>{icon}</i><p>{label}</p><b>{value} <small>{label === "Bundle aktif" ? "bundle" : "unit"}</small></b></article>)}</div>
    <section className="flow-panel"><div className="section-title"><div><h2>Alur kerja produksi</h2><p>Klik tahap untuk membuka modul dan mulai input.</p></div><span>Rekonsiliasi <b>0 = 0 ✓</b></span></div><div className="workflow">{[["Order Produksi","Order"],["Cutting","Cutting"],["Bundle","Bundle"],["Pengiriman Vendor","Vendor Jahit"],["Penerimaan Gudang","Gudang"],["Quality Control","QC"],["Stok Barang Jadi","Stok Jadi"]].map(([target,label],i)=><button key={target} onClick={()=>go(target)}><i>{["◇","✂","▱","⌂","□","✓","▣"][i]}</i><b>{label}</b><span>0 unit</span>{i<6&&<em>→</em>}</button>)}</div></section>
    <div className="two-col"><section className="panel empty-panel"><div className="section-title"><div><h2>Aktivitas terbaru</h2><p>Pergerakan dari surat jalan akan tampil di sini.</p></div></div><Empty icon="↔" title="Belum ada pergerakan barang" text="Buat surat jalan pertama untuk memulai riwayat." action="Buat surat jalan" onAction={openNote}/></section><section className="panel empty-panel"><div className="section-title"><div><h2>Perlu perhatian</h2><p>Keterlambatan dan selisih jumlah.</p></div></div><Empty icon="✓" title="Tidak ada peringatan" text="Belum ada transaksi yang perlu diperiksa."/></section></div>
    {notes.length > 0 && <section className="panel recent"><div className="section-title"><div><h2>Surat jalan terbaru</h2><p>Dokumen perpindahan yang baru dibuat.</p></div><button onClick={()=>go("Surat Jalan")}>Lihat semua →</button></div>{notes.slice(-3).reverse().map(n=><div key={n.id}><b>{n.id}</b><span>{n.process}</span><strong>{n.qty} unit</strong></div>)}</section>}
  </>;
}

function DeliveryNotes({ notes, query, setQuery, openNote, onPrint }: { notes: DeliveryNote[]; query: string; setQuery: (x: string) => void; openNote: () => void; onPrint: (x: DeliveryNote) => void }) {
  return <><div className="page-title"><div><p className="overline">DOKUMEN PERPINDAHAN</p><h1>Surat Jalan</h1><span>Setiap perpindahan barang wajib memiliki nomor surat jalan.</span></div><button className="primary" onClick={openNote}>＋ Buat surat jalan</button></div>
    <div className="rule-banner"><b>Aturan nomor</b><span>SJ–TANGGAL–KODE JAKET–PROSES–URUT</span><small>Contoh: SJ-20260729-SNV-KRM-VDR-001. Nomor fisik lama juga dapat diinput manual.</small></div>
    <section className="panel table-panel"><div className="table-tools"><label><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nomor, model, proses, lokasi..." /></label><select><option>Semua proses</option>{Object.keys(processCodes).map(x=><option key={x}>{x}</option>)}</select><button>☷ Filter tanggal</button></div>{notes.length===0?<Empty icon="▤" title="Belum ada surat jalan" text="Buat dokumen pertama saat barang berpindah lokasi." action="Buat surat jalan" onAction={openNote}/>:<div className="scroll"><table><thead><tr><th>NOMOR SURAT JALAN</th><th>TANGGAL</th><th>PROSES</th><th>MODEL / BUNDLE</th><th>DARI → TUJUAN</th><th>JUMLAH</th><th></th></tr></thead><tbody>{notes.map(n=><tr key={n.id}><td><b>{n.id}</b></td><td>{n.date}</td><td><span className="process">{processCodes[n.process]}</span><small>{n.process}</small></td><td><b>{n.model}</b><small>{n.bundle}</small></td><td>{n.from} → {n.to}</td><td><b>{n.qty}</b> unit</td><td><button onClick={()=>onPrint(n)}>▣ Cetak</button></td></tr>)}</tbody></table></div>}</section>
  </>;
}

function ModulePage({ active, rows, onAdd, onMove }: { active: string; rows: Row[]; onAdd: () => void; onMove: () => void }) {
  const c = configs[active]; return <><div className="page-title"><div><p className="overline">OPERASIONAL</p><h1>{c.title}</h1><span>{c.desc}</span></div><div>{!["Order Produksi","Cutting","Bundle"].includes(active)&&<button onClick={onMove}>▤ Surat jalan</button>}<button className="primary" onClick={onAdd}>＋ {c.action}</button></div></div><section className="panel table-panel">{rows.length===0?<Empty icon={active==="Cutting"?"✂":active==="Quality Control"?"✓":"◇"} title={`Belum ada data ${active.toLowerCase()}`} text={`Klik “${c.action}” untuk membuat transaksi pertama.`} action={c.action} onAction={onAdd}/>:<div className="scroll"><table><thead><tr>{c.columns.map(x=><th key={x}>{x.toUpperCase()}</th>)}<th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.id}</b></td><td>{r.date}</td><td><b>{r.model}</b><small>{r.detail}</small></td><td>{r.qty} unit</td><td><span className="status">{r.status}</span></td><td>›</td></tr>)}</tbody></table></div>}</section></>;
}

function Reports({ notes, rows }: { notes: DeliveryNote[]; rows: Record<string, Row[]> }) {
  return <><div className="page-title"><div><p className="overline">LAPORAN & REKONSILIASI</p><h1>Laporan Produksi</h1><span>Rekap akan terbentuk dari transaksi, bukan input angka manual.</span></div><button>⇩ Unduh laporan</button></div><div className="report-grid">{["Laporan WIP Produksi","Laporan per Model","Laporan per Vendor","Laporan per Bundle","Laporan Quality Control","Laporan Bulanan"].map(x=><article key={x}><i>▥</i><h3>{x}</h3><p>Belum ada data pada periode ini.</p><button>Lihat laporan →</button></article>)}</div><section className="panel reconcile"><div><h2>Rekonsiliasi jumlah</h2><p>Cutting harus sama dengan total posisi aktif seluruh barang.</p></div><b>{Object.values(rows).flat().length === 0 && notes.length === 0 ? "Belum ada data" : "Periksa transaksi"}</b></section></>;
}

function Empty({ icon, title, text, action, onAction }: { icon: string; title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="empty"><i>{icon}</i><b>{title}</b><p>{text}</p>{action&&<button className="primary" onClick={onAction}>＋ {action}</button>}</div>;
}
