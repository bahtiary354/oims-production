import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("application shell gives vertical scrolling to main content only", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);

  assert.match(page, /app-shell \$\{mobileMenu \? "mobile-drawer-open" : ""\}/);
  assert.match(css, /\.app-shell\s*\{[\s\S]*?height:\s*100dvh;[\s\S]*?overflow:\s*hidden;/);
  assert.match(css, /\.app-side\s*\{[\s\S]*?height:\s*100%;[\s\S]*?flex-shrink:\s*0;/);
  assert.match(css, /\.app-main\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?min-height:\s*0;[\s\S]*?flex-direction:\s*column;[\s\S]*?overflow:\s*hidden;/);
  assert.match(css, /\.workspace\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?overflow-x:\s*hidden;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(css, /\.app-shell\.mobile-drawer-open \.workspace\s*\{\s*overflow-y:\s*hidden;/);
  assert.match(css, /\.summary-detail-table-wrap[\s\S]*?overflow-x:\s*auto/);
});
