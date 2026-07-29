"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const SIZES = ["M", "L", "XL", "XXL", "XXXL"];
const stages = ["Order Produksi", "Cutting", "Bundle", "Pengiriman Vendor", "Progres Vendor", "Penerimaan Gudang", "Quality Control", "Rework", "Stok Barang Jadi"];
const nav = [["▦","Dashboard"],["♙","Master Jaket"],["◇","Order Produksi"],["✂","Cutting"],["▱","Bundle"],["▤","Surat Jalan"],["↗","Pengiriman Vendor"],["⌁","Progres Vendor"],["□","Penerimaan Gudang"],["✓","Quality Control"],["↻","Rework"],["▣","Stok Barang Jadi"],["▥","Laporan"]];
const stageInfo: Record<string, { prefix: string; title: string; desc: string; source?: string; move?: string }> = {
  "Order Produksi": { prefix:"PO", title:"Order Produksi", desc:"Induk seluruh proses; jumlah dibuat per warna dan ukuran." },
  Cutting: { prefix:"CUT", title:"Cutting", desc:"Hasil potong mengikuti rincian PO.", source:"Order Produksi" },
  Bundle: { prefix:"BDL", title:"Bundle Produksi", desc:"Pembagian hasil cutting yang tetap membawa warna dan ukuran.", source:"Cutting" },
  "Pengiriman Vendor": { prefix:"KRM", title:"Pengiriman Vendor", desc:"Pilih bundle dan vendor; surat jalan dibuat otomatis.", source:"Bundle", move:"Gudang Cutting → Vendor Jahit" },
  "Progres Vendor": { prefix:"PRG", title:"Progres Vendor", desc:"Perbarui jumlah selesai per warna dan ukuran.", source:"Pengiriman Vendor" },
  "Penerimaan Gudang": { prefix:"TRM", title:"Penerimaan Gudang", desc:"Setoran vendor dapat diterima bertahap.", source:"Pengiriman Vendor", move:"Vendor Jahit → Gudang" },
  "Quality Control": { prefix:"QC", title:"Quality Control", desc:"Catat lolos, repair, dan reject dengan rincian yang sama.", source:"Penerimaan Gudang", move:"Gudang → Quality Control" },
  Rework: { prefix:"RWK", title:"Rework / Repair", desc:"Barang repair dikirim dan kembali untuk QC ulang.", source:"Quality Control", move:"Quality Control → Rework" },
  "Stok Barang Jadi": { prefix:"STK", title:"Stok Barang Jadi", desc:"Hanya hasil lolos QC yang dapat dimasukkan.", source:"Quality Control", move:"Quality Control → Stok Jadi" },
};

type Model = { code:string; name:string; colors:string[]; sizes:string[]; active:boolean };
type Variant = { color:string; size:string; qty:number };
type RecordRow = { id:string; stage:string; date:string; modelCode:string; modelName:string; sourceId:string; variants:Variant[]; total:number; status:string; destination?:string; note?:string };
type Note = { id:string; date:string; process:string; sourceId:string; modelCode:string; modelName:string; from:string; to:string; variants:Variant[]; total:number; officer:string };
type AppData = { models:Model[]; records:Record<string,RecordRow[]>; notes:Note[] };

const initial: AppData = { models:[{code:"SNV",name:"Supernova",colors:["Hitam","Navy"],sizes:SIZES,active:true}],records:{},notes:[] };
const emptyForm = { date:new Date().toISOString().slice(0,10), code:"SNV", name:"", colors:"Hitam, Navy", sizes:"S, M, L, XL, XXL, 3XL", sourceId:"", destination:"", officer:"", note:"" };
const sum = (v:Variant[]) => v.reduce((a,b)=>a+b.qty,0);

export default function Home(){
  const [active,setActive]=useState("Dashboard");
  const [data,setData]=useState<AppData>(initial);
  const [loaded,setLoaded]=useState(false);
  const [saving,setSaving]=useState(false);
  const [modal,setModal]=useState<null|"master"|"record">(null);
  const [editingCode,setEditingCode]=useState<string|null>(null);
  const [form,setForm]=useState(emptyForm);
  const [matrix,setMatrix]=useState<Variant[]>([]);
  const [bundleQty,setBundleQty]=useState(50);
  const [print,setPrint]=useState<Note|null>(null);
  const [toast,setToast]=useState("");
  const [query,setQuery]=useState("");

  useEffect(()=>{fetch("/api/state").then(r=>r.ok?r.json():Promise.reject()).then(x=>setData(x)).catch(()=>setData(initial)).finally(()=>setLoaded(true));},[]);
  async function persist(next:AppData){
    setData(next); setSaving(true);
    try{await fetch("/api/state",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(next)});}
    finally{setSaving(false);}
  }
  function flash(x:string){setToast(x);setTimeout(()=>setToast(""),2800);}
  function code(prefix:string,model:string,count:number,date:string){return `${prefix}-${model}-${date.slice(0,7).replace("-","")}-${String(count+1).padStart(3,"0")}`;}
  function buildMatrix(model:Model, existing?:Variant[]){return model.colors.flatMap(color=>model.sizes.map(size=>({color,size,qty:existing?.find(v=>v.color===color&&v.size===size)?.qty??0})));}
  function remainingFor(source:RecordRow){
    const allocated=(data.records.Bundle??[]).filter(x=>x.sourceId===source.id).flatMap(x=>x.variants);
    return source.variants.map(v=>({...v,qty:Math.max(0,v.qty-allocated.filter(a=>a.color===v.color&&a.size===v.size).reduce((n,a)=>n+a.qty,0))}));
  }
  function autoBundle(available:Variant[],wanted:number){
    let left=Math.min(wanted,sum(available));
    return available.map(v=>{const qty=Math.min(v.qty,left);left-=qty;return {...v,qty};});
  }
  function sourceAvailable(stage:string,source:RecordRow){
    if(stage==="Pengiriman Vendor")return !(data.records["Pengiriman Vendor"]??[]).some(x=>x.sourceId===source.id);
    return true;
  }
  function openRecord(){
    const model=data.models[0]; const info=stageInfo[active]; const sources=info.source?data.records[info.source]??[]:[];
    const first=active==="Bundle"?sources.find(x=>sum(remainingFor(x))>0):sources.find(x=>sourceAvailable(active,x));
    setForm({...emptyForm,date:new Date().toISOString().slice(0,10),code:first?.modelCode??model?.code??"",sourceId:first?.id??"",destination:"",officer:""});
    const available=first?(active==="Bundle"?remainingFor(first):first.variants.map(x=>({...x}))):(model?buildMatrix(model):[]);
    setBundleQty(Math.min(50,sum(available))); setMatrix(active==="Bundle"?autoBundle(available,Math.min(50,sum(available))):available); setModal("record");
  }
  function selectSource(id:string){
    const sourceStage=stageInfo[active].source; const source=(data.records[sourceStage??""]??[]).find(x=>x.id===id);
    setForm({...form,sourceId:id,code:source?.modelCode??form.code});
    if(source){const available=active==="Bundle"?remainingFor(source):source.variants.map(x=>({...x}));const wanted=Math.min(50,sum(available));setBundleQty(wanted);setMatrix(active==="Bundle"?autoBundle(available,wanted):available);}
  }
  function updateQty(color:string,size:string,value:number){setMatrix(m=>m.map(v=>v.color===color&&v.size===size?{...v,qty:Math.max(0,value||0)}:v));}
  async function addMaster(e:FormEvent){
    e.preventDefault();
    const colors=[...new Set(form.colors.split(",").map(x=>x.trim()).filter(Boolean))];
    const sizes=[...new Set(form.sizes.split(",").map(x=>x.trim().toUpperCase()).filter(Boolean))];
    if(!colors.length||!sizes.length){flash("Minimal satu warna dan satu ukuran diperlukan.");return}
    const model:Model={code:form.code.toUpperCase(),name:form.name,colors,sizes,active:true};
    if(!editingCode&&data.models.some(x=>x.code===model.code)){flash("Kode jaket sudah digunakan.");return}
    const models=editingCode?data.models.map(x=>x.code===editingCode?model:x):[...data.models,model];
    await persist({...data,models});setModal(null);setEditingCode(null);flash(`${model.name} berhasil ${editingCode?"diperbarui":"ditambahkan"}.`);
  }
  async function addRecord(e:FormEvent){
    e.preventDefault(); const info=stageInfo[active]; const model=data.models.find(x=>x.code===form.code); if(!model||sum(matrix)<=0)return;
    if(active==="Pengiriman Vendor"&&(data.records["Pengiriman Vendor"]??[]).some(x=>x.sourceId===form.sourceId)){flash("Bundle ini sudah dikirim dan tidak dapat dipilih kembali.");return}
    if(active==="Bundle"){
      const source=(data.records.Cutting??[]).find(x=>x.id===form.sourceId);if(!source)return;
      const available=remainingFor(source);
      const exceeds=matrix.some(v=>v.qty>(available.find(a=>a.color===v.color&&a.size===v.size)?.qty??0));
      if(exceeds){flash("Jumlah bundle melebihi sisa cutting pada warna atau ukuran tertentu.");return}
    }
    const recordId=active==="Bundle"?`${model.code}-${form.date.replaceAll("-","")}-B${String((data.records.Bundle??[]).length+1).padStart(3,"0")}`:code(info.prefix,model.code,(data.records[active]??[]).length,form.date);
    const record:RecordRow={id:recordId,stage:active,date:form.date,modelCode:model.code,modelName:model.name,sourceId:form.sourceId,variants:matrix.filter(x=>x.qty>0),total:sum(matrix),status:active==="Quality Control"?"Menunggu hasil QC":"Aktif",destination:form.destination,note:form.note};
    const records={...data.records,[active]:[...(data.records[active]??[]),record]};
    let notes=data.notes;
    if(info.move){
      const [from,toDefault]=info.move.split(" → "); const note:Note={id:`SJ-${form.date.replaceAll("-","")}-${model.code}-${info.prefix}-${String(notes.length+1).padStart(3,"0")}`,date:form.date,process:info.move,sourceId:record.id,modelCode:model.code,modelName:model.name,from,to:form.destination||toDefault,variants:record.variants,total:record.total,officer:form.officer||"Admin"};
      notes=[...notes,note]; setPrint(note);
    }
    await persist({...data,records,notes});setModal(null);flash(`${record.id} tersimpan${info.move?" dan surat jalan dibuat otomatis":""}.`);
  }
  const current=data.records[active]??[];
  const filteredNotes=useMemo(()=>data.notes.filter(n=>`${n.id} ${n.sourceId} ${n.modelName} ${n.process}`.toLowerCase().includes(query.toLowerCase())),[data.notes,query]);

  return <main className="app-shell">
    <aside className="app-side"><div className="app-brand"><span>ON</span><div><b>CRAFT</b><small>PRODUCTION OS</small></div></div><p>OPERASIONAL</p><nav>{nav.map(([i,n])=><button key={n} className={active===n?"active":""} onClick={()=>setActive(n)}><i>{i}</i>{n}{n==="Surat Jalan"&&<em>{data.notes.length}</em>}</button>)}</nav><div className="user-card"><span>AR</span><div><b>Andi Rahman</b><small>{saving?"Menyimpan...":"Data tersimpan"}</small></div></div></aside>
    <section className="app-main"><header className="topbar"><label><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari PO, bundle, surat jalan..." /></label><span className={`sync ${saving?"busy":""}`}>{saving?"● Menyimpan":"✓ Tersimpan"}</span><div className="top-avatar">AR</div></header><div className="workspace">
      {!loaded?<div className="loading">Menyiapkan data produksi…</div>:<>
        {active==="Dashboard"&&<Dashboard data={data} go={setActive}/>}
        {active==="Master Jaket"&&<Master data={data} onAdd={()=>{setEditingCode(null);setForm(emptyForm);setModal("master")}} onEdit={m=>{setEditingCode(m.code);setForm({...emptyForm,code:m.code,name:m.name,colors:m.colors.join(", "),sizes:m.sizes.join(", ")});setModal("master")}}/>}
        {stages.includes(active)&&<StagePage active={active} rows={current} sources={data.records[stageInfo[active].source??""]??[]} allRecords={data.records} sourceCount={(data.records[stageInfo[active].source??""]??[]).length} onAdd={openRecord}/>}
        {active==="Surat Jalan"&&<Notes notes={filteredNotes} query={query} setQuery={setQuery} onPrint={setPrint}/>}
        {active==="Laporan"&&<Reports data={data}/>}
      </>}</div></section>

    {modal==="master"&&<div className="overlay"><form className="form-modal" onSubmit={addMaster}><button className="close" type="button" onClick={()=>{setModal(null);setEditingCode(null)}}>×</button><p className="overline">MASTER DATA</p><h2>{editingCode?"Edit Model Jaket":"Tambah Model Jaket"}</h2><div className="field-grid"><label>Kode jaket<input required disabled={!!editingCode} maxLength={5} value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})}/><small>{editingCode?"Kode dikunci agar hubungan transaksi lama tetap aman.":"2–5 huruf, contoh SNV."}</small></label><label>Nama model<input required placeholder="Contoh: Orion" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label className="full">Daftar warna <small>(pisahkan dengan koma; dapat ditambah, diubah, atau dihapus)</small><input required placeholder="Hitam, Navy, Olive" value={form.colors} onChange={e=>setForm({...form,colors:e.target.value})}/></label><label className="full">Daftar ukuran <small>(pisahkan dengan koma; bebas, misalnya S sampai 4XL)</small><input required placeholder="S, M, L, XL, XXL, 3XL, 4XL" value={form.sizes} onChange={e=>setForm({...form,sizes:e.target.value})}/></label></div><div className="master-preview"><div><small>Pratinjau warna</small><p>{form.colors.split(",").map(x=>x.trim()).filter(Boolean).map(x=><b key={x}>{x}</b>)}</p></div><div><small>Pratinjau ukuran</small><p>{form.sizes.split(",").map(x=>x.trim()).filter(Boolean).map(x=><b key={x}>{x.toUpperCase()}</b>)}</p></div></div><div className="form-actions"><button type="button" onClick={()=>{setModal(null);setEditingCode(null)}}>Batal</button><button className="primary">{editingCode?"Simpan perubahan":"Simpan model"}</button></div></form></div>}

    {modal==="record"&&<div className="overlay"><form className="form-modal matrix-modal" onSubmit={addRecord}><button className="close" type="button" onClick={()=>setModal(null)}>×</button><p className="overline">{active.toUpperCase()}</p><h2>{active==="Order Produksi"?"Buat PO Produksi":`Catat ${stageInfo[active].title}`}</h2><div className="field-grid"><label>Tanggal<input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>{active==="Order Produksi"?<label>Model jaket<select value={form.code} onChange={e=>{const m=data.models.find(x=>x.code===e.target.value)!;setForm({...form,code:e.target.value});setMatrix(buildMatrix(m));}}>{data.models.filter(x=>x.active).map(x=><option key={x.code} value={x.code}>{x.code} — {x.name}</option>)}</select></label>:<label className="full">Sumber dari {stageInfo[active].source}<select required value={form.sourceId} onChange={e=>selectSource(e.target.value)}><option value="">Pilih transaksi sumber</option>{(data.records[stageInfo[active].source??""]??[]).filter(x=>(active!=="Bundle"||sum(remainingFor(x))>0)&&sourceAvailable(active,x)).map(x=><option key={x.id} value={x.id}>{x.id} · {x.modelName} · {active==="Bundle"?sum(remainingFor(x)):x.total} unit tersedia</option>)}</select></label>}{stageInfo[active].move&&<><label>Tujuan / lokasi<input required placeholder="Contoh: Konveksi Bintang" value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})}/></label><label>Petugas<input required placeholder="Nama petugas" value={form.officer} onChange={e=>setForm({...form,officer:e.target.value})}/></label></>}</div>
      {active==="Bundle"&&form.sourceId&&<div className="bundle-auto"><div><small>SISA CUTTING SAAT INI</small><b>{sum(remainingFor((data.records.Cutting??[]).find(x=>x.id===form.sourceId)!))} unit</b></div><label>Jumlah bundle ini<input min="1" type="number" value={bundleQty} onChange={e=>setBundleQty(Number(e.target.value))}/></label><button type="button" onClick={()=>{const source=(data.records.Cutting??[]).find(x=>x.id===form.sourceId);if(source)setMatrix(autoBundle(remainingFor(source),bundleQty));}}>⚡ Kelompokkan otomatis</button></div>}
      <VariantMatrix values={matrix} onChange={updateQty}/><div className="matrix-total"><span>Total proses</span><b>{sum(matrix)} unit</b></div><label className="note-label">Catatan<input value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label><div className="form-actions"><button type="button" onClick={()=>setModal(null)}>Batal</button><button className="primary" disabled={sum(matrix)<=0}>{stageInfo[active].move?"Simpan & buat surat jalan":"Simpan proses"}</button></div></form></div>}

    {print&&<PrintNote note={print} close={()=>setPrint(null)}/>}
    {toast&&<div className="toast">✓ {toast}</div>}
  </main>
}

function VariantMatrix({values,onChange}:{values:Variant[];onChange:(c:string,s:string,v:number)=>void}){
  const colors=[...new Set(values.map(x=>x.color))]; const sizes=[...new Set(values.map(x=>x.size))]; return <div className="variant-box"><div className="variant-head"><div><b>Rincian warna × ukuran</b><small>Mengikuti Master Jaket dan dapat disesuaikan pada setiap proses.</small></div><span>{sizes.length} ukuran</span></div><div className="scroll"><table className="matrix"><thead><tr><th>WARNA</th>{sizes.map(s=><th key={s}>{s}</th>)}<th>TOTAL</th></tr></thead><tbody>{colors.map(c=><tr key={c}><td><b>{c}</b></td>{sizes.map(s=>{const v=values.find(x=>x.color===c&&x.size===s);return <td key={s}><input aria-label={`${c} ${s}`} type="number" min="0" value={v?.qty??0} onChange={e=>onChange(c,s,Number(e.target.value))}/></td>})}<td><b>{sum(values.filter(x=>x.color===c))}</b></td></tr>)}</tbody></table></div></div>
}
function Dashboard({data,go}:{data:AppData;go:(x:string)=>void}){const totals=stages.map(s=>(data.records[s]??[]).reduce((a,b)=>a+b.total,0));return <><div className="page-title"><div><p className="overline">DASHBOARD OWNER</p><h1>Alur produksi terhubung</h1><span>Semua transaksi berasal dari PO dan membawa rincian warna serta ukuran.</span></div><button className="primary" onClick={()=>go("Order Produksi")}>＋ Buat PO Produksi</button></div><div className="chain-banner"><b>Alur wajib</b><span>Master Jaket → PO → Cutting → Bundle → Vendor → Gudang → QC → Stok</span></div><div className="kpis">{[["PO aktif",data.records["Order Produksi"]?.length??0,"◇"],["Hasil cutting",totals[1],"✂"],["Di vendor",totals[3],"⌂"],["Menunggu QC",totals[6],"✓"],["Stok jadi",totals[8],"▣"]].map(x=><article key={String(x[0])}><i>{x[2]}</i><p>{x[0]}</p><b>{x[1]} <small>{x[0]==="PO aktif"?"PO":"unit"}</small></b></article>)}</div><section className="flow-panel"><div className="section-title"><div><h2>Jejak produksi</h2><p>Klik tahap untuk melihat transaksi dan rincian.</p></div><span>Master aktif <b>{data.models.length}</b></span></div><div className="workflow">{stages.map((s,i)=><button key={s} onClick={()=>go(s)}><i>{["◇","✂","▱","⌂","⌁","□","✓","↻","▣"][i]}</i><b>{s.replace(" Produksi","")}</b><span>{totals[i]} unit</span>{i<stages.length-1&&<em>→</em>}</button>)}</div></section></>}
function Master({data,onAdd,onEdit}:{data:AppData;onAdd:()=>void;onEdit:(m:Model)=>void}){return <><div className="page-title"><div><p className="overline">MASTER DATA</p><h1>Model Jaket</h1><span>Warna dan ukuran dapat ditambah, diubah, atau dihapus kapan saja.</span></div><button className="primary" onClick={onAdd}>＋ Tambah jaket</button></div><div className="model-grid">{data.models.map(m=><article key={m.code}><div><span>{m.code}</span><em>Aktif</em></div><h2>{m.name}</h2><small>WARNA · {m.colors.length}</small><p>{m.colors.map(c=><b key={c}>{c}</b>)}</p><small>UKURAN · {m.sizes.length}</small><p>{m.sizes.map(s=><b key={s}>{s}</b>)}</p><footer><span>Kode otomatis: <strong>{m.code}</strong></span><button onClick={()=>onEdit(m)}>✎ Edit master</button></footer></article>)}</div></>}
function StagePage({active,rows,sources,allRecords,sourceCount,onAdd}:{active:string;rows:RecordRow[];sources:RecordRow[];allRecords:Record<string,RecordRow[]>;sourceCount:number;onAdd:()=>void}){const info=stageInfo[active];const blocked=!!info.source&&sourceCount===0;const bundleCards=active==="Bundle"?sources.map(source=>{const used=(allRecords.Bundle??[]).filter(x=>x.sourceId===source.id).reduce((n,x)=>n+x.total,0);return {source,used,left:Math.max(0,source.total-used),count:(allRecords.Bundle??[]).filter(x=>x.sourceId===source.id).length}}):[];const activeBundleCards=bundleCards.filter(x=>x.left>0);const completedBundleCards=bundleCards.filter(x=>x.left===0);const shippedIds=new Set((allRecords["Pengiriman Vendor"]??[]).map(x=>x.sourceId));const availableToShip=active==="Pengiriman Vendor"?sources.filter(x=>!shippedIds.has(x.id)).length:0;return <><div className="page-title"><div><p className="overline">PROSES TERHUBUNG</p><h1>{info.title}</h1><span>{info.desc}</span></div><button className="primary" disabled={blocked||active==="Bundle"&&bundleCards.every(x=>x.left===0)||active==="Pengiriman Vendor"&&availableToShip===0} onClick={onAdd}>＋ {active==="Order Produksi"?"Buat PO":active==="Bundle"?"Buat bundle berikutnya":"Catat proses"}</button></div>{blocked&&<div className="dependency"><b>Proses sebelumnya belum tersedia</b><span>Buat data di modul {info.source} terlebih dahulu agar rincian warna dan ukuran dapat diteruskan.</span></div>}{active==="Pengiriman Vendor"&&sourceCount>0&&<div className="availability"><div><small>BUNDLE TERSEDIA DI GUDANG</small><b>{availableToShip}</b><span>belum dikirim</span></div><p>Bundle yang sudah masuk pengiriman otomatis dikeluarkan dari daftar pilihan, tetapi tetap tersimpan di riwayat.</p></div>}{active==="Bundle"&&activeBundleCards.length>0&&<div className="bundle-balance">{activeBundleCards.map(x=><article key={x.source.id}><div><span>CUTTING SUMBER</span><b>{x.source.id}</b><small>{x.source.modelName}</small></div><div><span>HASIL CUTTING</span><b>{x.source.total}</b><small>unit</small></div><div><span>SUDAH DIBUNDLE</span><b>{x.used}</b><small>{x.count} bundle</small></div><div><span>SISA BELUM DIBUNDLE</span><b>{x.left}</b><small>unit tersedia</small></div></article>)}</div>}{active==="Bundle"&&completedBundleCards.length>0&&<details className="completed-cuttings"><summary><span>✓</span><b>{completedBundleCards.length} cutting selesai dibundle</b><small>Saldo nol · klik untuk melihat nomor cutting</small></summary><div>{completedBundleCards.map(x=><p key={x.source.id}><b>{x.source.id}</b><span>{x.source.modelName}</span><em>{x.source.total} unit · {x.count} bundle</em></p>)}</div></details>}<section className={`panel table-panel ${active==="Bundle"?"bounded-table":""}`}>{rows.length===0?<Empty title={`Belum ada ${active.toLowerCase()}`} text={blocked?`Menunggu data dari ${info.source}.`:"Mulai transaksi pertama; kode akan dibuat otomatis."}/>:<div className="scroll"><table><thead><tr><th>KODE OTOMATIS</th><th>TANGGAL</th><th>SUMBER</th><th>MODEL</th><th>RINCIAN</th><th>TOTAL</th><th>STATUS</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.id}</b></td><td>{r.date}</td><td>{r.sourceId||"Master Jaket"}</td><td><b>{r.modelName}</b><small>{r.modelCode}</small></td><td><small>{r.variants.map(v=>`${v.color} ${v.size}: ${v.qty}`).join(" · ")}</small></td><td><b>{r.total}</b> unit</td><td><span className="status">{r.status}</span></td></tr>)}</tbody></table></div>}</section></>}
function Notes({notes,query,setQuery,onPrint}:{notes:Note[];query:string;setQuery:(x:string)=>void;onPrint:(n:Note)=>void}){return <><div className="page-title"><div><p className="overline">DOKUMEN OTOMATIS</p><h1>Surat Jalan</h1><span>Dibuat dari proses sumber; nomor, model, warna, ukuran, dan jumlah tidak perlu diketik ulang.</span></div></div><section className="panel table-panel"><div className="table-tools"><label><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nomor surat jalan atau sumber..."/></label></div>{notes.length===0?<Empty title="Belum ada surat jalan" text="Surat jalan otomatis muncul saat ada perpindahan barang."/>:<div className="scroll"><table><thead><tr><th>NOMOR SURAT JALAN</th><th>TANGGAL</th><th>PROSES</th><th>SUMBER</th><th>MODEL</th><th>JUMLAH</th><th></th></tr></thead><tbody>{notes.map(n=><tr key={n.id}><td><b>{n.id}</b></td><td>{n.date}</td><td>{n.process}</td><td>{n.sourceId}</td><td><b>{n.modelName}</b><small>{n.variants.map(v=>`${v.color} ${v.size}: ${v.qty}`).join(" · ")}</small></td><td><b>{n.total}</b> unit</td><td><button onClick={()=>onPrint(n)}>▣ Cetak</button></td></tr>)}</tbody></table></div>}</section></>}
function Reports({data}:{data:AppData}){return <><div className="page-title"><div><p className="overline">REKONSILIASI</p><h1>Laporan Produksi</h1><span>Rekap berdasarkan hubungan PO dan transaksi turunannya.</span></div></div><div className="report-grid">{data.records["Order Produksi"]?.length?<>{data.records["Order Produksi"].map(po=><article key={po.id}><i>◇</i><h3>{po.id}</h3><p>{po.modelName} · {po.total} unit</p><button>Telusuri seluruh proses →</button></article>)}</>:<article><i>▥</i><h3>Belum ada PO</h3><p>Laporan akan tersedia setelah PO produksi dibuat.</p></article>}</div></>}
function Empty({title,text}:{title:string;text:string}){return <div className="empty"><i>◇</i><b>{title}</b><p>{text}</p></div>}
function PrintNote({note,close}:{note:Note;close:()=>void}){const colors=[...new Set(note.variants.map(v=>v.color))];const sizes=[...new Set(note.variants.map(v=>v.size))];return <div className="overlay print-overlay"><section className="print-sheet"><div className="print-toolbar"><button onClick={close}>← Tutup</button><button className="primary" onClick={()=>window.print()}>▣ Cetak A4</button></div><div className="print-document"><div className="print-head"><div className="print-brand"><b>ON CRAFT</b><span>PRODUCTION OS</span></div><div><h1>SURAT JALAN</h1><b>{note.id}</b></div></div><div className="print-meta"><div><span>Tanggal</span><b>{note.date}</b></div><div><span>Proses</span><b>{note.process}</b></div><div><span>Dokumen sumber</span><b>{note.sourceId}</b></div><div><span>Model</span><b>{note.modelCode} — {note.modelName}</b></div><div><span>Dari</span><b>{note.from}</b></div><div><span>Tujuan</span><b>{note.to}</b></div></div><table><thead><tr><th>Warna</th>{sizes.map(s=><th key={s}>{s}</th>)}<th>Total</th></tr></thead><tbody>{colors.map(c=><tr key={c}><td><b>{c}</b></td>{sizes.map(s=><td key={s}>{note.variants.find(v=>v.color===c&&v.size===s)?.qty??0}</td>)}<td><b>{sum(note.variants.filter(v=>v.color===c))}</b></td></tr>)}</tbody></table><div className="signatures"><div><span>Pengirim</span><i/><b>{note.officer}</b></div><div><span>Mengetahui</span><i/><b>(........................)</b></div><div><span>Penerima</span><i/><b>(........................)</b></div></div><footer>Dokumen ini terhubung otomatis dengan {note.sourceId}.</footer></div></section></div>}
