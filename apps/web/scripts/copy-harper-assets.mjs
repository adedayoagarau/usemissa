import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const dist = dirname(fileURLToPath(import.meta.resolve("harper.js")));
const packageRoot = dirname(dist);
const { version, license } = JSON.parse(
  await readFile(resolve(packageRoot, "package.json"), "utf8"),
);
if (version !== "2.10.0" || license !== "Apache-2.0") {
  throw new Error(
    "Review Harper assets and adapter before changing harper.js 2.10.0.",
  );
}

const destination = fileURLToPath(
  new URL(`../public/harper/${version}/`, import.meta.url),
);
await mkdir(destination, { recursive: true });
await build({
  entryPoints: [
    fileURLToPath(new URL("../lib/writing-checker-worker.ts", import.meta.url)),
  ],
  outfile: resolve(destination, "checker-worker.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  define: { process: "undefined" },
  target: "es2022",
  minify: true,
  legalComments: "eof",
});
await copyFile(
  resolve(dist, "harper_wasm_slim_bg.wasm"),
  resolve(destination, "harper_wasm_slim_bg.wasm"),
);
await copyFile(
  resolve(packageRoot, "LICENSE"),
  resolve(destination, "LICENSE.txt"),
);
await writeFile(
  resolve(destination, "NOTICE.txt"),
  `Harper ${version} (harper.js), by Elijah Potter and Harper contributors.\n` +
    "Source: https://github.com/Automattic/harper/tree/v2.10.0\n" +
    "Distributed under the Apache License 2.0 (see LICENSE.txt).\n" +
    "The unmodified slim WASM retains plain-text spelling and grammar checks;\n" +
    "it excludes the optional Typst parser and thesaurus.\n",
);
