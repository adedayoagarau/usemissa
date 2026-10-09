/** Generated offline runtime. Source is the actual WritingPages editor and canonical CSS. */
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
const root = resolve(import.meta.dirname, "..");
const web = resolve(root, "apps/web");
const output = resolve(web, "public/writing-offline/generated");
await mkdir(output, { recursive: true });
const fonts = [];
await build({
  entryPoints: [resolve(web, "offline/editor.tsx")], outfile: resolve(output, "editor.js"), bundle: true, minify: true, format: "iife", platform: "browser", target: "es2022", jsx: "automatic", alias: { "@": web }, define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "offline-local-typefaces", setup(builder) {
    builder.onLoad({ filter: /writing-typefaces\.ts$/ }, async args => {
      let source = await readFile(args.path, "utf8");
      const map = {};
      for (const match of source.matchAll(/src:\s*"([^"]+\.woff2)"/g)) {
        const path = resolve(dirname(args.path), match[1]), name = basename(path), className = `offline-face-${fonts.length}`;
        await copyFile(path, resolve(output,name));
        fonts.push({ name, className }); map[match[1]] = className;
      }
      source = source.replace('import localFont from "next/font/local";', `const faceMap = ${JSON.stringify(map)}; const localFont = (options: { src: string; [key: string]: unknown }) => ({ className: faceMap[options.src] });`);
      return { contents: source, loader: "ts", resolveDir: dirname(args.path) };
    });
  } }],
});
const interfaceFonts = [
  { name: "newsreader-variable.woff2", variable: "--font-heading", family: "MissaOfflineNewsreader", weight: "200 800" },
  { name: "instrument-sans.woff2", variable: "--font-sans", family: "MissaOfflineInstrument", weight: "100 900" },
  { name: "fragment-mono.woff2", variable: "--font-mono", family: "MissaOfflineFragment", weight: "400" },
];
for (const font of interfaceFonts) await copyFile(resolve(web,"fonts",font.name),resolve(output,font.name));
const css = await readFile(resolve(web,"app/globals.css"),"utf8");
const processed = await postcss([tailwind({ base: web, optimize: true })]).process(css,{ from: resolve(web,"app/globals.css"), to: resolve(output,"editor.css") });
const fontCss = fonts.map(font => `@font-face{font-family:"${font.className}";src:url("./${font.name}") format("woff2");font-weight:400;font-display:swap}.${font.className}{font-family:"${font.className}"}`).join("\n");
await writeFile(resolve(output,"editor.css"), processed.css + "\n" + fontCss + "\n" + interfaceFonts.map(font => `@font-face{font-family:"${font.family}";src:url("./${font.name}") format("woff2");font-weight:${font.weight};font-display:swap}:root{${font.variable}:"${font.family}"}`).join("\n"));
const assets = ["/writing-offline/index.html", "/writing-offline/generated/editor.js", "/writing-offline/generated/editor.css", ...fonts.map(font=>`/writing-offline/generated/${font.name}`), ...interfaceFonts.map(font=>`/writing-offline/generated/${font.name}`)];
await writeFile(resolve(output,"assets.json"),JSON.stringify(assets));
// A deterministic content hash changes the cache version with authored source or dependencies.
const { createHash } = await import("node:crypto");
const worker = await readFile(resolve(web,"offline/sw.template.js"),"utf8");
const digest = createHash("sha256").update(await readFile(resolve(output,"editor.js"))).update(await readFile(resolve(output,"editor.css")));
for (const font of [...fonts, ...interfaceFonts]) digest.update(await readFile(resolve(output,font.name)));
digest.update(worker);
const hash = digest.digest("hex").slice(0,16);
await writeFile(resolve(web,"public/writing-offline/sw.js"), worker.replace("__CACHE_VERSION__",hash).replace("__ASSETS__",JSON.stringify(assets)));
console.log(`Offline WritingPages bundle prepared (${hash}); ${fonts.length} local typefaces.`);
