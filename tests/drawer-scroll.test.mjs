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
  assert.match(css, /\.operational-variant-matrix-wrap,[\s\S]*?\.vendor-history-table-scroll[\s\S]*?overflow-x:\s*auto;/);

  const backdrops = page.match(/className="owner-drawer-backdrop(?:\s[^"]*)?"/g) ?? [];
  const drawers = page.match(/className="owner-drawer(?:\s[^"]*)?"/g) ?? [];
  assert.ok(backdrops.length >= 6, "expected all detail backdrop variants to use the shared class");
  assert.equal(drawers.length, backdrops.length, "each shared backdrop should contain a shared drawer");
});
