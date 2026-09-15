/**
 * Optimize the heavy photographic assets that ship to browsers.
 *
 * These images were authored as full-colour PNGs, which is a poor container for
 * photography: the homepage alone pulled roughly 3.6 MB of them. Each source is
 * kept as an untouched master (some are used as test fixtures), and a WebP
 * sibling is generated for the product surfaces to reference.
 *
 * Run: node scripts/optimize-marketing-media.mjs
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import sharp from "sharp";

const webRoot = path.resolve(import.meta.dirname, "../apps/web");

/** [source, webp target, options] */
const targets = [
  [
    "public/media/creator-preview-portrait.png",
    "public/media/creator-preview-portrait.webp",
    { quality: 84 },
  ],
  [
    "public/media/creator-preview-landscape.png",
    "public/media/creator-preview-landscape.webp",
    { quality: 84 },
  ],
  [
    "public/media/onboarding-practices.png",
    "public/media/onboarding-practices.webp",
    { quality: 82 },
  ],
  [
    "public/media/creator-preview-book.png",
    "public/media/creator-preview-book.webp",
    { quality: 82 },
  ],
  [
    "public/media/missa-org-gallery.png",
    "public/media/missa-org-gallery.webp",
    { quality: 82 },
  ],
  [
    "public/media/opportunities/opportunities-field.png",
    "public/media/opportunities/opportunities-field.webp",
    { quality: 78 },
  ],
  [
    "public/design-system/homepage-future/missa-cobalt-hero-4k.png",
    "public/design-system/homepage-future/missa-cobalt-hero-4k.webp",
    { quality: 78 },
  ],
];

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

for (const [source, target, options] of targets) {
  const sourcePath = path.join(webRoot, source);
  const targetPath = path.join(webRoot, target);
  const before = (await fs.stat(sourcePath)).size;
  await sharp(sourcePath)
    .webp({ quality: options.quality, effort: 6 })
    .toFile(targetPath);
  const after = (await fs.stat(targetPath)).size;
  const saved = Math.round((1 - after / before) * 100);
  console.log(`${target}  ${kb(before)} -> ${kb(after)}  (-${saved}%)`);
}
