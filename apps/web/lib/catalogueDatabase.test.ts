import assert from "node:assert/strict";
import test from "node:test";

import { catalogueReadDatabaseUrl } from "./catalogueDatabase";

test("prefers the dedicated catalogue read binding", () => {
  assert.equal(
    catalogueReadDatabaseUrl({
      DATABASE_URL: "postgres://application",
      MISSA_CATALOGUE_DATABASE_URL: " postgres://catalogue ",
    }),
    "postgres://catalogue",
  );
});

test("falls back to the application database when no catalogue binding exists", () => {
  assert.equal(
    catalogueReadDatabaseUrl({ DATABASE_URL: " postgres://application " }),
    "postgres://application",
  );
});

test("returns undefined when neither database binding is configured", () => {
  assert.equal(catalogueReadDatabaseUrl({}), undefined);
});
