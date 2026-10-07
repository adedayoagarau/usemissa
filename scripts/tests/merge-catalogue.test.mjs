import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeCatalogue,
  readExistingCatalogue,
} from "../lib/merge-catalogue.mjs";

const generated = {
  generatedFrom: "apps/web/components/shadcn-studio",
  familyCount: 2,
  variantCount: 5,
  families: [{ family: "button", count: 5 }],
};

test("regenerating replaces the inventory and keeps hand-written sections in place", () => {
  const existing = {
    primitiveContracts: { Button: "kept" },
    generatedFrom: "old",
    familyCount: 1,
    variantCount: 1,
    families: [],
    portalStudio: { note: "also kept" },
  };
  const merged = mergeCatalogue(existing, generated);
  assert.deepEqual(Object.keys(merged), [
    "primitiveContracts",
    "generatedFrom",
    "familyCount",
    "variantCount",
    "families",
    "portalStudio",
  ]);
  assert.deepEqual(merged.primitiveContracts, { Button: "kept" });
  assert.deepEqual(merged.portalStudio, { note: "also kept" });
  assert.equal(merged.variantCount, 5);
  assert.deepEqual(merged.families, generated.families);
});

test("a first run writes just the generated inventory", () => {
  assert.deepEqual(mergeCatalogue({}, generated), generated);
  assert.deepEqual(mergeCatalogue(undefined, generated), generated);
});

test("a generated key the file doesn't have yet is added at the end", () => {
  const merged = mergeCatalogue(
    { handWritten: 1, generatedFrom: "old" },
    generated,
  );
  assert.deepEqual(Object.keys(merged), [
    "handWritten",
    "generatedFrom",
    "familyCount",
    "variantCount",
    "families",
  ]);
});

test("neither input is changed", () => {
  const existing = { keep: { a: 1 }, familyCount: 1 };
  const before = structuredClone(existing);
  const generatedBefore = structuredClone(generated);
  mergeCatalogue(existing, generated);
  assert.deepEqual(existing, before);
  assert.deepEqual(generated, generatedBefore);
});

const fakeFs = (read) => ({ readFile: async () => read() });

test("a missing file is a first run, and anything else that fails is raised", async () => {
  assert.deepEqual(
    await readExistingCatalogue(
      fakeFs(() => {
        throw Object.assign(new Error("gone"), { code: "ENOENT" });
      }),
      "catalogue.json",
    ),
    {},
  );
  await assert.rejects(
    readExistingCatalogue(
      fakeFs(() => {
        throw Object.assign(new Error("denied"), { code: "EACCES" });
      }),
      "catalogue.json",
    ),
    /denied/,
  );
});

test("a file that isn't valid JSON is refused, never overwritten", async () => {
  await assert.rejects(
    readExistingCatalogue(
      fakeFs(() => '{ "primitiveContracts": '),
      "catalogue.json",
    ),
    /not valid JSON, so it was left alone/,
  );
  assert.deepEqual(
    await readExistingCatalogue(
      fakeFs(() => '{"a":1}'),
      "catalogue.json",
    ),
    { a: 1 },
  );
});
