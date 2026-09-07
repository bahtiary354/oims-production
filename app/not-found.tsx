import Link from "next/link";

export default function NotFound() {
  return <main className="route-not-found"><p>404</p><h1>Halaman tidak ditemukan</h1><span>Alamat modul tidak tersedia atau sudah berubah.</span><Link href="/dashboard">Kembali ke Dashboard</Link></main>;
}
