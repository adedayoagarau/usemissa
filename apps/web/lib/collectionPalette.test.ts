import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { COLLECTION_PALETTE } from "../components/design-system/collection-palette";

test("the palette values match collection-palette.css", () => {
  const css = readFileSync(
    path.join(process.cwd(), "components/design-system/collection-palette.css"),
    "utf8",
  );
  const fromCss: Record<string, Record<string, string>> = {};
  for (const [, name, role, value] of css.matchAll(
    /--palette-collection-([a-z-]+?)-(surface|text|graphic):\s*(#[0-9a-f]{6});/gu,
  ))
    (fromCss[name!] ??= {})[role!] = value!;
  assert.deepEqual(JSON.parse(JSON.stringify(COLLECTION_PALETTE)), fromCss);
});
