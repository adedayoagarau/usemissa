import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Ordinary editing keeps text out of model services. Optional spelling and
 * grammar checks run on the writer's device; paid read-aloud has an explicit,
 * authenticated speech endpoint. These tests make the module boundary
 * checkable: they fail when code outside the writing module reaches the
 * writing table or the repository, or when the module imports an AI SDK.
 */

const root = fileURLToPath(new URL("../../../", import.meta.url));
const skip = new Set([
  "node_modules",
  "dist",
  ".next",
  ".git",
  "test-results",
  "playwright-report",
  "outputs",
]);
const code = /\.(?:ts|tsx|js|jsx|mjs|cjs|sql|py|sh)$/;

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (skip.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return files(path);
    return code.test(entry.name)
      ? [relative(root, path).split(sep).join("/")]
      : [];
  });
}

const sources = files(root).map((path) => ({
  path,
  text: readFileSync(join(root, path), "utf8"),
}));

test("only the writing module names the writing tables", () => {
  const allowed = new Set([
    "packages/db/migrations/0095_creator_writing.sql",
    "packages/db/migrations/0096_creator_writing_pages.sql",
    "packages/db/migrations/0097_creator_writing_projects.sql",
    "packages/db/migrations/0098_creator_writing_snapshots.sql",
    "packages/db/migrations/0099_creator_writing_calls.sql",
    "packages/db/migrations/0100_creator_writing_cards.sql",
    "packages/db/migrations/0101_creator_writing_studio.sql",
    "apps/web/lib/writing-repository.ts",
    "apps/web/lib/writing-repository.test.ts",
    "apps/web/lib/writing-studio-repository.test.ts",
    "apps/web/lib/writing-boundary.test.ts",
  ]);
  const offenders = sources
    .filter(
      ({ path, text }) =>
        !allowed.has(path) &&
        /creator_writing_(?:entries|projects|snapshots|studios|reader_shares|reader_comments)(?!\.sql)/.test(
          text,
        ),
    )
    .map(({ path }) => path);
  assert.deepEqual(
    offenders,
    [],
    "Writing is read only through apps/web/lib/writing-repository.ts",
  );
});

test("only the writing room and its routes use the writing repository", () => {
  const allowed = (path: string) =>
    path === "apps/web/app/doc/page.tsx" ||
    path.startsWith("apps/web/app/api/me/writing/") ||
    path.startsWith("apps/web/app/api/writing/read/") ||
    path === "apps/web/lib/writing-repository.test.ts" ||
    path === "apps/web/lib/writing-studio-repository.test.ts" ||
    path === "apps/web/lib/writing-boundary.test.ts";
  const offenders = sources
    .filter(
      ({ path, text }) =>
        !allowed(path) &&
        /(?:from\s*|import\s*\(\s*|require\(\s*)["'][^"']*writing-repository(?:\.ts)?["']/.test(
          text,
        ),
    )
    .map(({ path }) => path);
  assert.deepEqual(offenders, []);
});

test("the writing module imports no AI or model SDK", () => {
  const moduleFiles = sources.filter(
    ({ path }) =>
      /^apps\/web\/(?:lib\/writing[^/]*|components\/missa\/writing-[^/]*|app\/(?:doc|write)\/[^/]*)$/.test(
        path,
      ) ||
      path.startsWith("apps/web/app/api/me/writing/") ||
      path.startsWith("apps/web/app/api/writing/read/"),
  );
  assert.ok(moduleFiles.length >= 8, "the writing module files were found");
  const imports = moduleFiles.flatMap(({ path, text }) =>
    [...text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map(
      (match) => ({ path, specifier: match[1]! }),
    ),
  );
  const ai =
    /anthropic|openai|@ai-sdk|^ai$|langchain|llm|gemini|mistral|cohere|ollama|huggingface|replicate|@\/lib\/chat|components\/chat/i;
  assert.deepEqual(
    imports.filter(({ specifier }) => ai.test(specifier)),
    [],
  );
});
