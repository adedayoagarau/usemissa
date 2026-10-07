# Missa illustration library — version 2

24 original designs in the character-led editorial direction approved on 6 October 2026. The library contains 10 opportunity covers, 8 creator scenes (including the approved hero), and 6 small objects.

Open **gallery.html** in a browser. It works offline, lets you change palette and export version, and saves individual SVGs. The gallery uses Missa's current palette for demonstration; the SVG files themselves contain **no fixed colour values**.

## Files

- `svg/compact/`: 24 web SVGs, each below 12,000 bytes. Ink and accent layers; optional full-canvas background for covers. Interior white space is transparent.
- `svg/detailed/`: 24 detailed SVGs, approximately 7–40 KB each. Additional enclosed paper regions and stable `data-shape` selectors support finer editing. These are editing masters and intentionally exceed the old 12 KB web budget where detail requires it.
- `sources/`: 24 high-resolution PNG art masters. These retain their generated colours and are not themeable. Use the SVGs for recolouring and web integration.
- `collection-contact-sheet.png`: overview of all designs.
- `generation-record.json`: prompts and source provenance. The built-in image generation tool created the art using the approved hero as the style reference; Potrace extracted vector contours and SVGO optimized them.

The repository equivalents of `svg/detailed/` are the `covers`, `scenes`, and `spots` folders directly under `apps/web/public/illustrations/library-v2/`. The web versions are under that folder's `compact/` directory.

## Colour controls

Inline an SVG in the page, or use the application's approved SVG-to-component pipeline. Set these CSS custom properties on the SVG or an ancestor:

| Variable | Controls | Default |
| --- | --- | --- |
| `--art-ink` | Contours and solid ink shapes | `currentColor` |
| `--art-accent` | Selected accent areas | `currentColor` |
| `--art-paper` | Enclosed paper/negative-space regions, detailed SVG only | `none` |
| `--art-background` | Full-canvas cover tint, cover SVGs only | `none` |

```css
.missa-art {
  color: var(--ink);
  --art-ink: currentColor;
  --art-accent: var(--primary);
  --art-paper: none;
  --art-background: none;
}

.missa-art--ochre {
  --art-accent: var(--ochre);
  --art-background: var(--ochre-tint);
}

.missa-art--mineral {
  --art-accent: var(--mineral-blue);
  --art-background: var(--mineral-blue-tint);
}

.missa-art--reverse {
  color: var(--bg);
  --art-ink: currentColor;
  --art-accent: var(--ochre-tint);
  --art-paper: none;
}

/* Recolour one extracted region in a detailed SVG. */
.missa-art [data-shape="accent-1"] {
  fill: var(--mineral-blue);
}
```

`data-part="ink"`, `data-part="accent"`, `data-part="paper"`, and `data-part="background"` identify whole layers. Detailed paths have `data-shape` attributes for individual extracted regions. These are geometric region identifiers, not semantic labels for every body part or object. Paths may contain several subpaths; a vector editor can split those when more granular editing is needed.

An external `<img src="…svg">` does **not** inherit CSS variables from the page. It will display the default monochrome image. Inline SVG is required for page-driven colours. When opening an SVG alone, the monochrome appearance is expected, not a missing-colour error. Gallery downloads preserve the variables; they do not bake in the currently previewed palette.

All illustrations are decorative and use `aria-hidden="true"` and `focusable="false"`. Supply meaningful text in the surrounding page. There are no embedded raster images, fonts, gradients, script, animation, or root width/height attributes. Original ink marks are represented by filled vector contours, preserving the approved drawing rather than forcing it back to uniform 1.5px strokes.

## Inventory

**Covers:** magazine, residency, grant, fellowship, contest, award, exhibition, festival, open-call, publication.

**Scenes:** hero, after-find, questions, close, reading, celebrate, searching, making-work.

**Small objects:** tracker, portfolio, reminders, library, studio-key, inbox.

The covers use a 4:3 viewBox and normalized breathing room for card crops. Scenes have transparent backgrounds; the four original section slots retain their target aspect ratios. Tile spots use 5:4. No homepage or browse-card wiring is included.

## Verification

- All 48 SVG exports parsed and checked for fixed colours, embedded raster content, root dimensions, and decorative attributes.
- All 24 compact exports meet the 12,000-byte limit.
- Detailed and compact exports visually reviewed in Chromium, including white ink on Forest.
- Gallery palette switching verified against computed SVG fill values for Forest, ochre, mineral blue, monochrome, and reversed palettes.
- Gallery checked at 390px without horizontal overflow; individual SVG download verified.
- `npm run check:design-system` passed. This verifies repository policy, not artistic quality or production integration.

## Reproduction

The repository keeps `vectorize.py`, `svgo.config.mjs`, and `build-gallery.mjs` beside this README. Use Python with Pillow 12.3.0, Potrace 1.16, and SVGO 4.0.0:

```sh
python vectorize.py
python vectorize.py --compact
```

From the repository root, optimize both export trees and rebuild the gallery:

```sh
npx --yes --package=svgo@4.0.0 svgo -f apps/web/public/illustrations/library-v2 --recursive --config docs/homepage-redesign-2026-10-06/library-v2/svgo.config.mjs
node docs/homepage-redesign-2026-10-06/library-v2/build-gallery.mjs
```

The PNG masters remain unchanged. Tracing uses temporary classification masks, then removes every source colour in favour of the variables above. The gallery's palette declarations are copied from the repository's current `globals.css`; no product tokens were changed.
