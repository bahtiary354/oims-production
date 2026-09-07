import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("bundle shipment navigates to the vendor-shipment process", () => {
  const handler = source.slice(
    source.indexOf("function openBundleShipment"),
    source.indexOf("function updateQty"),
  );

  assert.match(handler, /navigate\("Pengiriman Vendor"\)/);
  assert.match(handler, /sourceId:\s*bundles\[0\]\.id/);
});

test("remaining cutting calculation tolerates a stale source during route transition", () => {
  assert.match(source, /function remainingFor\(source\?: RecordRow\)/);
  assert.match(source, /if \(!source\) return \[\];/);
  assert.match(
    source,
    /data\.records\.Cutting \?\? \[\]\)\.some\([\s\S]*?source\.id === form\.sourceId/,
  );
});

test("vendor shipment chooses a cutting source before its bundles", () => {
  assert.match(source, /const \[shipmentCuttingId, setShipmentCuttingId\]/);
  assert.match(source, /active === "Pengiriman Vendor"[\s\S]*?"Sumber Cutting"/);
  assert.match(source, /bundle\.poId === shipmentCuttingId/);
  assert.match(source, /setSelectedBundleIds\(\[\]\);[\s\S]*?setMatrix\(\[\]\)/);
  assert.match(source, /Pilih sumber Cutting untuk menampilkan bundle/);
});

test("bundle selection and variant details share one standard table", () => {
  assert.match(source, /className="shipment-bundle-table"/);
  assert.match(source, /<th>Pilih<\/th><th>Bundle<\/th><th>Warna & ukuran<\/th><th>Unit<\/th>/);
  assert.match(source, /<ShipmentVariantSummary row=\{bundle\}/);
  assert.match(source, /\$\{variant\.size\}: \$\{variant\.qty\}/);
  assert.match(source, /<VariantDetailDrawer[\s\S]*?row=\{shipmentBundleDetail\}/);
  assert.match(
    source,
    /active !== "Penerimaan Gudang" && active !== "Pengiriman Vendor"/,
  );
});
