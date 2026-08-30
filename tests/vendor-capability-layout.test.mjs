import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
const page = await readFile(new URL("app/page.tsx", root), "utf8");
const css = await readFile(new URL("app/globals.css", root), "utf8");

test("kemampuan vendor memakai label yang terhubung dengan checkbox", () => {
  assert.match(page, /fieldset className="full vendor-capability-field"/);
  assert.match(page, /htmlFor=\{`vendor-capability-\$\{value\}`\}/);
  assert.match(page, /id=\{`vendor-capability-\$\{value\}`\}/);
  assert.match(page, /className="vendor-capability-option"/);
});

test("layout kemampuan vendor sejajar, ringkas, dapat difokuskan, dan responsif", () => {
  assert.match(css, /vendor-capability-options \{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap;[\s\S]*?gap: 8px;/);
  assert.match(css, /vendor-capability-option \{[\s\S]*?display: inline-flex;[\s\S]*?border: 0;[\s\S]*?cursor: pointer;/);
  assert.match(css, /vendor-capability-option:focus-within/);
  assert.match(css, /accent-color: #2563eb;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?vendor-capability-options/);
});
