import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("menu modules are synchronized with readable URLs", async () => {
  const [page, navigation, navigationHook, sidebar, topbar, moduleWorkspace, catchAll, routedPage, dashboard, master, production, decoration, vendor, qc, inventory, report, deliveryNote, notFound] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/lib/navigation.ts", root), "utf8"),
    readFile(new URL("app/hooks/use-app-navigation.ts", root), "utf8"),
    readFile(new URL("app/components/app-sidebar.tsx", root), "utf8"),
    readFile(new URL("app/components/app-topbar.tsx", root), "utf8"),
    readFile(new URL("app/components/module-workspace.tsx", root), "utf8"),
    readFile(new URL("app/[...route]/page.tsx", root), "utf8"),
    readFile(new URL("app/routed-module-page.tsx", root), "utf8"),
    readFile(new URL("app/dashboard/page.tsx", root), "utf8"),
    readFile(new URL("app/master/[module]/page.tsx", root), "utf8"),
    readFile(new URL("app/produksi/[module]/page.tsx", root), "utf8"),
    readFile(new URL("app/dekorasi/[module]/page.tsx", root), "utf8"),
    readFile(new URL("app/vendor/[module]/page.tsx", root), "utf8"),
    readFile(new URL("app/qc/[module]/page.tsx", root), "utf8"),
    readFile(new URL("app/persediaan/[module]/page.tsx", root), "utf8"),
    readFile(new URL("app/laporan/[module]/page.tsx", root), "utf8"),
    readFile(new URL("app/surat-jalan/page.tsx", root), "utf8"),
    readFile(new URL("app/not-found.tsx", root), "utf8"),
  ]);

  assert.match(navigation, /export const modulePaths: Record<string, string>/);
  assert.match(navigation, /Dashboard: "\/dashboard"/);
  assert.match(navigation, /Cutting: "\/produksi\/cutting"/);
  assert.match(navigation, /"Laporan Keuangan": "\/laporan\/keuangan"/);
  assert.match(navigation, /"Surat Jalan": "\/surat-jalan"/);
  assert.match(navigationHook, /const pathname = usePathname\(\)/);
  assert.match(navigationHook, /window\.history\.pushState\(null, "", nextPath\)/);
  assert.match(navigationHook, /window\.history\.replaceState\(null, "", modulePaths\.Dashboard\)/);
  assert.match(page, /useAppNavigation\(\)/);
  assert.match(page, /<AppSidebar/);
  assert.match(page, /<AppTopbar/);
  assert.match(sidebar, /navGroups\.map/);
  assert.match(topbar, /className="topbar"/);
  assert.match(moduleWorkspace, /modules\.includes\(active\)/);
  assert.match(page, /modules=\{masterModuleNames\}/);
  assert.match(page, /modules=\{reportModuleNames\}/);
  assert.match(page, /modules=\{operationalModuleNames\}/);
  assert.match(page, /modules=\{exceptionalOperationalModuleNames\}/);
  assert.match(catchAll, /notFound\(\)/);
  assert.match(routedPage, /const \{ module \} = await params/);
  assert.match(routedPage, /if \(!allowed\.includes\(module\)\) notFound\(\)/);
  assert.match(dashboard, /export \{ default \} from "\.\.\/page"/);
  assert.match(master, /"jaket", "vendor", "qc", "pic"/);
  assert.match(production, /"order", "cutting", "bundle"/);
  assert.match(decoration, /"sablon-bordir"/);
  assert.match(vendor, /"pengiriman", "penerimaan"/);
  assert.match(qc, /"pengiriman", "pemeriksaan", "rework"/);
  assert.match(inventory, /"stok-jadi"/);
  assert.match(report, /"operasional", "keuangan", "riwayat-pembayaran"/);
  assert.match(deliveryNote, /export \{ default \} from "\.\.\/page"/);
  assert.match(notFound, /Kembali ke Dashboard/);
});
