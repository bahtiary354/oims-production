import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cssPath = new URL("../app/globals.css", import.meta.url);
const pagePath = new URL("../app/page.tsx", import.meta.url);

test("all detail drawers share one vertical scroll contract", async () => {
  const [css, page] = await Promise.all([
    readFile(cssPath, "utf8"),
    readFile(pagePath, "utf8"),
  ]);

  assert.match(css, /\.owner-drawer\s*\{[\s\S]*?height:\s*100dvh;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(css, /\.owner-drawer\s*>\s*header\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*0;/);
  assert.match(css, /\.app-shell:has\(\.owner-drawer-backdrop\)\s+\.workspace\s*\{[\s\S]*?overflow-y:\s*hidden;/);
  assert.match(page, /className="finance-ledger-drawer-body"/);
  assert.match(css, /\.workspace \.finance-ledger-drawer-body\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(css, /\.operational-variant-matrix-wrap,[\s\S]*?\.vendor-history-table-scroll[\s\S]*?overflow-x:\s*auto;/);
  assert.match(css, /\.payment-history-drawer\s*>\s*:is\([\s\S]*?\.payment-history-detail-section[\s\S]*?flex:\s*none;[\s\S]*?height:\s*auto;/);
  assert.match(css, /\.payment-history-drawer\s+\.summary-detail-table-wrap\s*\{[\s\S]*?height:\s*auto\s*!important;[\s\S]*?max-height:\s*none\s*!important;/);
  assert.match(css, /\.payment-history-drawer\s+\.summary-detail-table-wrap\s*>\s*table\s*\{[\s\S]*?display:\s*table;[\s\S]*?height:\s*auto;/);

  const backdrops = page.match(/className="owner-drawer-backdrop(?:\s[^"]*)?"/g) ?? [];
  const drawers = page.match(/className="owner-drawer(?:\s[^"]*)?"/g) ?? [];
  assert.ok(backdrops.length >= 6, "expected all detail backdrop variants to use the shared class");
  assert.equal(drawers.length, backdrops.length, "each shared backdrop should contain a shared drawer");
});

test("all drawers and form modals share one readable visual standard", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(css, /Unified drawer and modal visual standard/);
  assert.match(css, /\.owner-drawer :is\(table, \.summary-detail-table, \.operational-variant-matrix\)/);
  assert.match(css, /\.form-modal :is\(table, \.matrix-table\)/);
  const drawers = page.match(/<aside className="owner-drawer[^>]*role="dialog"[^>]*aria-modal="true"/g) ?? [];
  const allDrawers = page.match(/<aside className="owner-drawer/g) ?? [];
  assert.equal(drawers.length, allDrawers.length, "every owner drawer should expose dialog semantics");
});
