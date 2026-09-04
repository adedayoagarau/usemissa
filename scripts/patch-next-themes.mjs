#!/usr/bin/env node
/**
 * next-themes 0.4.6 renders an inline <script> inside a client component.
 * React 19 / Next.js 16 log a console error for that on the client remount,
 * even though the FOUC script only needs to run during SSR.
 *
 * Upstream: https://github.com/pacocoursey/next-themes/issues/385
 * Fix: skip ThemeScript when `window` is defined (SSR-only injection).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function packageRoot() {
  const candidates = [
    join(repoRoot, "node_modules/next-themes"),
    join(repoRoot, "apps/web/node_modules/next-themes"),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "dist/index.mjs"))) return candidate;
  }
  try {
    return dirname(dirname(require.resolve("next-themes")));
  } catch {
    return null;
  }
}

const replacements = [
  [
    '_=t.memo(({forcedTheme:e,storageKey:i,attribute:s,enableSystem:u,enableColorScheme:m,defaultTheme:a,value:l,themes:h,nonce:d,scriptProps:w})=>{let p=JSON.stringify([s,i,a,e,h,l,u,m]).slice(1,-1);return t.createElement("script",{...w,suppressHydrationWarning:!0,nonce:typeof window=="undefined"?d:"",dangerouslySetInnerHTML:{__html:`(${M.toString()})(${p})`}})})',
    '_=t.memo(({forcedTheme:e,storageKey:i,attribute:s,enableSystem:u,enableColorScheme:m,defaultTheme:a,value:l,themes:h,nonce:d,scriptProps:w})=>{if(typeof window!=="undefined")return null;let p=JSON.stringify([s,i,a,e,h,l,u,m]).slice(1,-1);return t.createElement("script",{...w,suppressHydrationWarning:!0,nonce:d,dangerouslySetInnerHTML:{__html:`(${M.toString()})(${p})`}})})',
  ],
  [
    'Y=t.memo(({forcedTheme:e,storageKey:s,attribute:n,enableSystem:l,enableColorScheme:o,defaultTheme:d,value:u,themes:h,nonce:m,scriptProps:w})=>{let p=JSON.stringify([n,s,d,e,h,u,l,o]).slice(1,-1);return t.createElement("script",{...w,suppressHydrationWarning:!0,nonce:typeof window=="undefined"?m:"",dangerouslySetInnerHTML:{__html:`(${I.toString()})(${p})`}})})',
    'Y=t.memo(({forcedTheme:e,storageKey:s,attribute:n,enableSystem:l,enableColorScheme:o,defaultTheme:d,value:u,themes:h,nonce:m,scriptProps:w})=>{if(typeof window!=="undefined")return null;let p=JSON.stringify([n,s,d,e,h,u,l,o]).slice(1,-1);return t.createElement("script",{...w,suppressHydrationWarning:!0,nonce:m,dangerouslySetInnerHTML:{__html:`(${I.toString()})(${p})`}})})',
  ],
];

const root = packageRoot();
if (!root) {
  console.log("patch-next-themes: next-themes not installed; skipping");
  process.exit(0);
}

let touched = 0;
for (const file of ["index.mjs", "index.js"]) {
  const path = join(root, "dist", file);
  if (!existsSync(path)) continue;
  const text = readFileSync(path, "utf8");
  if (text.includes('if(typeof window!=="undefined")return null')) {
    continue;
  }
  let next = text;
  for (const [from, to] of replacements) {
    next = next.replaceAll(from, to);
  }
  if (next === text) {
    console.warn(
      `patch-next-themes: no match in ${file}; upstream may have changed`,
    );
    continue;
  }
  writeFileSync(path, next);
  touched += 1;
  console.log(`patch-next-themes: patched ${file}`);
}

if (touched === 0) {
  console.log("patch-next-themes: already applied or nothing to do");
}
