// Copies shared photography from the web app into public/, so the video
// never drifts from the product and the repository does not store it twice.
// Launch-only assets (the fonts, the voiceover and the two generated creator
// images) live in public/ directly.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const pub = path.resolve(import.meta.dirname, "../public");

const copies = {};
for (const name of ["grants", "residencies", "prizes", "publications", "exhibitions", "festivals", "community", "feature-studio"]) {
  copies[`media/${name}.webp`] = `apps/web/public/media/home/generated/${name}.webp`;
}
for (const name of ["hero-artist-studio", "artist-at-work", "portfolio-still-life"]) {
  copies[`media/${name}.webp`] = `apps/web/public/media/home/${name}.webp`;
}

for (const [target, source] of Object.entries(copies)) {
  const to = path.join(pub, target);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(root, source), to);
}
console.log(`Synced ${Object.keys(copies).length} shared assets into public/`);
