// Copies shared brand assets (fonts, photography) from the web app and the
// landing page into public/, so the video never drifts from the product and
// the repository does not store them twice. Launch-only assets (the
// voiceover and the two generated creator images) live in public/ directly.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const pub = path.resolve(import.meta.dirname, "../public");

const copies = {
  "fonts/newsreader-latin.woff2": "landing/fonts/newsreader_v26_cY9AfjOCX1hbuyalUrK4397yjIJFJpc.woff2",
  "fonts/newsreader-italic-latin.woff2": "landing/fonts/newsreader_v26_cY9CfjOCX1hbuyalUrK439vCjohCBJWxZA.woff2",
  "fonts/instrument-sans-latin.woff2": "landing/fonts/instrumentsans_v4_pxiTypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8ToedPibnr0SZe1ZuWi3g.woff2",
  "fonts/fragment-mono-latin.woff2": "landing/fonts/fragmentmono_v6_4iCr6K5wfMRRjxp0DA6-2CLnB4NHhqcL71Q.woff2",
};
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
