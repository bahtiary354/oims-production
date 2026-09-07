import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("surat jalan groups bundle sources by their cutting code", () => {
  assert.match(source, /function deliveryNoteSourceGroups\(note: Note\)/);
  assert.match(source, /return match \? `CUT-\$\{match\[1\]\}` : normalized/);
  assert.match(source, /groups\.length} Cutting · \{bundleCount} Bundle/);
});

test("multiple cutting sources open a detail drawer", () => {
  assert.match(source, /function DeliveryNoteSourceDrawer/);
  assert.match(source, /Lihat rincian →/);
  assert.match(source, /SUMBER SURAT JALAN/);
  assert.match(styles, /\.sj-source-drawer-table/);
});

test("all printed surat jalan use the same compact two-row metadata", () => {
  assert.match(source, /sourceGroups\.map\(\(group\) => group\.cuttingCode\)\.join\(", "\)/);
  assert.match(source, /sourceGroups\.flatMap\(\(group\) => group\.bundleCodes\)\.join\(", "\)/);
  assert.doesNotMatch(source, /className="print-source-table"/);
  assert.match(styles, /\.delivery-note-document \.print-head\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  assert.match(styles, /\.delivery-note-document \.print-meta\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
});

test("vendor delivery note preserves and prints each bundle separately", () => {
  assert.match(source, /bundleDetails\?: DeliveryNoteBundleDetail\[\]/);
  assert.match(source, /bundleDetails: bundles\.map\(\(bundle\) =>/);
  assert.match(source, /className="print-detail-table print-bundle-assignment-table"/);
  assert.match(source, /<th>BUNDLE \/ LOT<\/th><th>WARNA<\/th><th>UKURAN &amp; JUMLAH<\/th><th>PENJAHIT<\/th><th>KETERANGAN<\/th>/);
  assert.match(source, /className="print-handwriting-line"/);
  assert.match(styles, /\.print-bundle-assignment-table/);
  assert.match(styles, /print-color-adjust:\s*exact/);
  assert.match(styles, /background:\s*#155448/);
});

test("surat jalan supports compact one, two, or three-copy A4 printing", () => {
  assert.match(source, /useState<1 \| 2 \| 3>\(2\)/);
  assert.match(source, /1 surat \/ A4/);
  assert.match(source, /2 surat \/ A4/);
  assert.match(source, /3 surat \/ A4/);
  assert.match(source, /delivery-note-copy-label/);
  assert.match(styles, /\.delivery-note-sheet\.print-layout-2/);
  assert.match(styles, /\.delivery-note-sheet\.print-layout-3/);
  assert.match(styles, /height: 268mm/);
  assert.match(source, /delivery-note-copy-\$\{copyIndex \+ 1\}/);
  assert.match(styles, /\.delivery-note-sheet\s*\{[\s\S]*?position:\s*static;[\s\S]*?display:\s*grid;[\s\S]*?height:\s*268mm;[\s\S]*?max-height:\s*268mm;/);
  assert.match(styles, /\.delivery-note-sheet\.print-layout-2\s*\{\s*grid-template-rows:\s*repeat\(2, 134mm\);\s*\}/);
  assert.match(styles, /\.delivery-note-sheet\.print-layout-2 \.delivery-note-document\s*\{[\s\S]*?height:\s*134mm;[\s\S]*?max-height:\s*134mm;/);
  assert.match(styles, /\.delivery-note-sheet\.print-layout-3\s*\{\s*grid-template-rows:\s*repeat\(3, 89mm\);\s*\}/);
  assert.match(styles, /delivery-note-cut-line/);
});

test("print overlay remains visible in print media", () => {
  assert.match(styles, /\.print-overlay\s*\{[\s\S]*?display:\s*block\s*!important;/);
});

test("delivery note print is portaled outside the application layout", () => {
  assert.match(source, /import \{ createPortal \} from "react-dom";/);
  assert.match(source, /function PrintNote[\s\S]*?return createPortal\([\s\S]*?document\.body,/);
  assert.match(styles, /body > \.app-shell\s*\{\s*display:\s*none !important;/);
  assert.match(styles, /body > \.print-overlay\s*\{[\s\S]*?width:\s*100% !important;/);
});
