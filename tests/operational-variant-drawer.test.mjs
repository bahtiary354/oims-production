import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
const page = await readFile(new URL("app/page.tsx", root), "utf8");

test("rincian varian operasional memakai pemicu ringkas dan drawer matriks bersama", () => {
  assert.match(page, /function VariantSummaryButton/);
  assert.match(page, /function VariantDetailDrawer/);
  assert.match(page, /className="operational-variant-matrix"/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /<tfoot><tr><td colSpan=\{sizes\.length \+ 1\}>Total \{row\.modelName\}/);
  assert.match(page, /summary-model-total-row/);
  assert.match(page, /Total \{model\.modelName\}/);
});

test("tabel status aktif, transaksi selesai, dan bundle membuka drawer yang sama", () => {
  const liveStage = page.slice(page.indexOf("function LiveStageStatus"), page.indexOf("export default function Home"));
  const stagePage = page.slice(page.indexOf("function StagePage"), page.indexOf("function Notes"));

  assert.match(liveStage, /const \[selectedVariantRow, setSelectedVariantRow\]/);
  assert.match(liveStage, /<VariantSummaryButton row=\{row\} onOpen=\{\(\) => setSelectedVariantRow\(row\)\}/);
  assert.match(liveStage, /<VariantDetailDrawer row=\{selectedVariantRow\}/);
  assert.match(stagePage, /<VariantSummaryButton row=\{bundle\} onOpen=\{\(\) => setSelectedVariantRow\(bundle\)\}/);
  assert.match(stagePage, /<VariantDetailDrawer row=\{selectedVariantRow\}/);
  assert.doesNotMatch(liveStage, /className="live-variant-list"/);
  assert.doesNotMatch(stagePage, /className="bundle-ledger-variants"/);
});
