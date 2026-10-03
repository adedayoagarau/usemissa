// Render review stills: node scripts/stills.mjs <CompositionId> <outDir> <frame,frame,...>
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const [id = "LaunchSquare", outDir = "out/stills", framesArg = "30,90,300,420,600,800,930"] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const opts = fs.existsSync(browserExecutable) ? { browserExecutable } : {};
const composition = await selectComposition({ serveUrl, id, ...opts });
fs.mkdirSync(outDir, { recursive: true });
for (const frame of framesArg.split(",").map(Number)) {
  const output = path.join(outDir, `${id}-${String(frame).padStart(4, "0")}.jpg`);
  await renderStill({ serveUrl, composition, frame, output, imageFormat: "jpeg", jpegQuality: 80, ...opts });
  console.log(output);
}
