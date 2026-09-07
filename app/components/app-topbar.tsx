"use client";

type AppTopbarProps = {
  active: string;
  query: string;
  setQuery: (query: string) => void;
  saving: boolean;
  openMobileMenu: () => void;
};

export function AppTopbar({ active, query, setQuery, saving, openMobileMenu }: AppTopbarProps) {
  return (
    <header className="topbar">
      <button className="mobile-menu-button" aria-label="Buka semua menu" onClick={openMobileMenu}>☰</button>
      <div className="topbar-title"><b>{active}</b><span>Oims · Production Management System</span></div>
      <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari batch Cutting, bundle, surat jalan..." /></label>
      <span className={`sync ${saving ? "busy" : ""}`}>{saving ? "● Menyimpan" : "✓ Tersimpan"}</span>
      <div className="top-avatar">AR</div>
    </header>
  );
}
