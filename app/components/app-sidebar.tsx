"use client";

import { Fragment } from "react";
import Image from "next/image";
import { navGroups, navIcon } from "../lib/navigation";

type AppSidebarProps = {
  active: string;
  mobileMenu: boolean;
  openNavGroup: string | null;
  setOpenNavGroup: (group: string | null) => void;
  navigate: (module: string) => void;
  closeMobileMenu: () => void;
  deliveryNoteCount: number;
  saving: boolean;
};

export function AppSidebar({ active, mobileMenu, openNavGroup, setOpenNavGroup, navigate, closeMobileMenu, deliveryNoteCount, saving }: AppSidebarProps) {
  const openModule = (module: string) => {
    navigate(module);
    closeMobileMenu();
  };

  return (
    <>
      {mobileMenu && <button className="mobile-menu-backdrop" aria-label="Tutup menu" onClick={closeMobileMenu} />}
      <aside className={`app-side ${mobileMenu ? "mobile-open" : ""}`}>
        <div className="app-brand">
          <Image src="/oims-logo.jpg" alt="Logo Oims" width={52} height={52} priority />
          <div><b>Oims</b><small>PRODUCTION MANAGEMENT</small></div>
          <button className="mobile-menu-close" aria-label="Tutup menu" onClick={closeMobileMenu}>×</button>
        </div>
        <p>MENU UTAMA</p>
        <nav className="grouped-nav">
          <button className={`nav-direct ${active === "Dashboard" ? "active" : ""}`} onClick={() => openModule("Dashboard")}><i>▦</i><span>Dashboard</span></button>
          {navGroups.map((group, index) => {
            const expanded = openNavGroup === group.id;
            const groupActive = group.items.some((name) => name === active);
            const showSection = index === 0 || navGroups[index - 1].section !== group.section;
            return (
              <Fragment key={group.id}>
                {showSection && <p className="nav-section-label">{group.section}</p>}
                <div className={`nav-group ${expanded ? "expanded" : ""}`}>
                  <button type="button" className={`nav-group-trigger ${groupActive ? "group-active" : ""}`} aria-expanded={expanded} onClick={() => setOpenNavGroup(expanded ? null : group.id)}>
                    <i>{group.icon}</i><span>{group.label}</span><b aria-hidden="true">⌄</b>
                  </button>
                  {expanded && <div className="nav-submenu">{group.items.map((name) => <button key={name} className={active === name ? "active" : ""} onClick={() => openModule(name)}><i>{navIcon(name)}</i><span>{name}</span></button>)}</div>}
                </div>
              </Fragment>
            );
          })}
          <p className="nav-section-label">DOKUMEN</p>
          <div className="nav-bottom-link"><button className={`nav-direct ${active === "Surat Jalan" ? "active" : ""}`} onClick={() => openModule("Surat Jalan")}><i>▤</i><span>Surat Jalan</span><em>{deliveryNoteCount}</em></button></div>
        </nav>
        <div className="user-card"><span>AR</span><div><b>Andi Rahman</b><small>{saving ? "Menyimpan..." : "Data tersimpan"}</small></div></div>
      </aside>
    </>
  );
}
