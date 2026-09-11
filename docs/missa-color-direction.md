---
title: Missa Color Direction
version: "2.0"
status: canonical
last_updated: "2026-09-04"
supersedes: Aubergine-led palette (v1.0)
governed_by:
  - ../DESIGN.md
  - ./decisions/008-forest-semantic-token-authority.md
---

# Missa Color Direction

Missa is Forest-led: calm, editorial, and quietly confident. The color system
should feel like a working library in daylight — white enough to read
deadlines, fees, and forms; green enough to mark the next action without
turning the product into a nature brand.

This file is the palette companion to [`DESIGN.md`](../DESIGN.md). When they
conflict, `DESIGN.md` wins. Implementation mapping lives in
`apps/web/app/globals.css`. Decision record:
[`008-forest-semantic-token-authority`](./decisions/008-forest-semantic-token-authority.md).

Dated August 2026 screen contracts and visual directions that still say
Aubergine are historical. Do not copy them. Legacy Aubergine (`#5A3F68`,
`#473050`, `#F1EDF3`) is not a current action token.

## Core palette

| Role | Name | Hex | Use |
| --- | --- | --- | --- |
| Brand / action | Forest 600 | `#285649` | Primary actions, links, active navigation, focus |
| Action hover / deep | Forest 700 | `#1d4037` | Hover, pressed, exceptional editorial dark bands |
| Brand wash | Forest 100 | `#e3ece8` | Secondary actions, selected surfaces, quiet emphasis |
| Progress / positive | Lichen 600 | `#657547` | Saved, accepted, complete, progress |
| Progress wash | Lichen 50 | `#eef1e8` | Positive status surfaces |
| Attention | Aged ochre | `#a8762a` | Deadlines, fees, review attention, pending states |
| Attention text | Ochre deep | `#78551e` | Text and icons on light attention surfaces |
| Attention wash | Aged ochre 50 | `#f5ecd9` | Attention status surfaces |
| Information | Mineral blue | `#426b7a` | Neutral information, source notes, structured guidance |
| Information wash | Mineral blue 50 | `#e7eff2` | Information surfaces |
| Ink | Neutral 900 | `#171418` | Primary text, high-emphasis icons |
| Canvas | White | `#ffffff` | Default page canvas and primary surfaces |

`DESIGN.md` primitive names (`forest-600`, `lichen-600`, and so on) are the
token spellings. Feature code consumes semantic tokens (`--primary`,
`--green`, `--ochre`, `--mineral-blue`, and their tints), never these hex
values directly.

## Product rules

- Forest is the only brand action color. Do not introduce a second brand
  accent per feature.
- Lichen, ochre, and Mineral blue are semantic companions, not competing
  brands.
- Use a true-white canvas. Do not tint the page cream, beige, parchment, or
  paper. Character comes from typography, imagery, writing, and restrained
  Forest — not from the canvas.
- A normal view has at most one Forest-filled primary action.
- Large Forest or Lichen background sections are exceptional editorial
  treatments (marketing heroes), not routine product surfaces. They do not
  make Missa a dark-first product.
- Keep color distribution quiet: one dominant action, one status signal, and
  generous neutral space.
- Never communicate status through color alone. Pair every status color with
  a word, icon, or explicit state.
- Avoid purple gradients, rainbow dashboards, and decorative color that does
  not carry meaning. Do not restore Aubergine.

## Opportunity card direction

Opportunity cards use a neutral white surface, a pale category pill, a Forest
action, and one small semantic count/status accent. The default card should
feel useful before it feels branded:

```text
category pill     pale neutral / information surface
opportunity title dark ink
deadline           muted ink, ochre only when attention is required
primary action     Forest
saved/progress     Lichen
```

## Approved combinations

### Forest + Lichen

The default Missa combination. Natural, quiet, and creative. Use for
creator-facing opportunity discovery, saved states, progress, and calm
celebration.

### Forest + Aged Ochre

Warmer and more literary. Use for deadlines, fees, review attention, and
editorial or archival moments. Ochre text must use `#78551e` on pale ochre
surfaces; do not place white text directly on `#a8762a` for small text.

### Forest + Mineral Blue

Cooler and more structured. Use for source notes, methodology, neutral
guidance, organization workflows, and technical information.

## Marketing and photography

Marketing may use photographic color that Forest UI does not: dusk studios,
ochre practical light, lichen dust in air. Grade hero media toward pine-dark
shadows (`forest-700`) and warm lamp light (`ochre`), not wine, magenta, or
legacy Aubergine.

The page around that media remains white after the fold. An exceptional
Forest-700 hero band is allowed; a dark-first site is not.

## Accessibility

- Forest `#285649` is the default colored text/action color on white.
- Ochre uses the deep text value `#78551e` on `#f5ecd9` surfaces.
- Lichen and Mineral blue should use their deep text/surface pairing for
  small text; do not assume the saturated swatch is readable on white.
- Focus uses a visible Forest ring with sufficient separation from the
  control border.
- Validate every new combination with automated contrast checks and a
  grayscale pass.

## Implementation

The implementation source of truth is `apps/web/app/globals.css`:

| Semantic token | Value |
| --- | --- |
| `--brand-accent` / `--primary` | `#285649` |
| `--accent-deep` | `#1d4037` |
| `--accent-tint` | `#e3ece8` |
| `--green` | `#657547` |
| `--ochre` / `--ochre-deep` / `--ochre-tint` | `#a8762a` / `#78551e` / `#f5ecd9` |
| `--mineral-blue` / `--mineral-blue-tint` | `#426b7a` / `#e7eff2` |
| `--ink` / `--bg` | `#171418` / `#ffffff` |

Component styles must consume those semantic tokens instead of introducing
local brand hex values.
