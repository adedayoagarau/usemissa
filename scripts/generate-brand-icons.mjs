/**
 * Generate the Missa favicon set from the canonical wordmark.
 *
 * The wordmark is a traced five-glyph lockup ("M", "/", "S", "S", "A").
 * At favicon sizes the full lockup is unreadable, so the app icon uses the
 * first glyph as a monogram on the Forest primary token. This keeps the app
 * icon derived from the real wordmark instead of inventing a new mark.
 *
 * Run: node scripts/generate-brand-icons.mjs
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const webRoot = path.join(repositoryRoot, "apps/web");
const wordmarkPath = path.join(webRoot, "public/brand/missa-wordmark-240.svg");
const appRoot = path.join(webRoot, "app");

// Missa semantic token: primary -> forest-600 (DESIGN.md tokens.semantic.color.primary).
const FOREST_600 = "#285649";
const GLYPH = "#ffffff";

const wordmark = await fs.readFile(wordmarkPath, "utf8");
const paths = [...wordmark.matchAll(/<path[^>]*\/>/g)].map((match) =>
  match[0].replace(/fill="[^"]*"/, ""),
);
if (paths.length !== 5) {
  throw new Error(
    `Expected 5 glyph paths in the wordmark, found ${paths.length}.`,
  );
}
const monogram = paths[0];

/**
 * Measure the glyph's true bounds in wordmark viewBox units so the tile can be
 * optically centred rather than guessed.
 */
async function glyphBounds(glyph, viewBox) {
  const scale = 4;
  const width = Math.round(viewBox.width * scale);
  const height = Math.round(viewBox.height * scale);
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${viewBox.width} ${viewBox.height}" xmlns="http://www.w3.org/2000/svg"><g fill="#000">${glyph}</g></svg>`;
  const { data, info } = await sharp(Buffer.from(svg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return {
    x0: x0 / scale,
    y0: y0 / scale,
    width: (x1 - x0) / scale,
    height: (y1 - y0) / scale,
  };
}

const viewBox = { width: 265, height: 57 };
const bounds = await glyphBounds(monogram, viewBox);

/** Build the square icon SVG at a given size with a solid Forest ground. */
function iconSvg(size) {
  // Target: the monogram occupies ~62% of the tile width, centred.
  const targetWidth = size * 0.62;
  const scale = targetWidth / bounds.width;
  const glyphHeight = bounds.height * scale;
  const offsetX = (size - targetWidth) / 2 - bounds.x0 * scale;
  const offsetY = (size - glyphHeight) / 2 - bounds.y0 * scale;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${FOREST_600}"/>
  <g transform="translate(${offsetX.toFixed(3)} ${offsetY.toFixed(3)}) scale(${scale.toFixed(6)})" fill="${GLYPH}">${monogram}</g>
</svg>
`;
}

/** ICO container with PNG-encoded entries (supported by every current browser). */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(16 * entries.length);
  let offset = header.length + directory.length;
  const payloads = [];
  entries.forEach((entry, index) => {
    const base = index * 16;
    directory.writeUInt8(entry.size >= 256 ? 0 : entry.size, base);
    directory.writeUInt8(entry.size >= 256 ? 0 : entry.size, base + 1);
    directory.writeUInt8(0, base + 2); // palette
    directory.writeUInt8(0, base + 3); // reserved
    directory.writeUInt16LE(1, base + 4); // colour planes
    directory.writeUInt16LE(32, base + 6); // bits per pixel
    directory.writeUInt32LE(entry.data.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += entry.data.length;
    payloads.push(entry.data);
  });
  return Buffer.concat([header, directory, ...payloads]);
}

async function renderPng(size) {
  return sharp(Buffer.from(iconSvg(size)))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

await fs.writeFile(path.join(appRoot, "icon.svg"), iconSvg(512));
await fs.writeFile(path.join(appRoot, "icon.png"), await renderPng(512));
await fs.writeFile(path.join(appRoot, "apple-icon.png"), await renderPng(180));
await fs.writeFile(
  path.join(appRoot, "favicon.ico"),
  ico([
    { size: 16, data: await renderPng(16) },
    { size: 32, data: await renderPng(32) },
    { size: 48, data: await renderPng(48) },
  ]),
);

console.log(
  `Wrote app/icon.svg, app/icon.png, app/apple-icon.png, app/favicon.ico (monogram ${bounds.width.toFixed(1)}x${bounds.height.toFixed(1)} units, Forest ${FOREST_600}).`,
);
