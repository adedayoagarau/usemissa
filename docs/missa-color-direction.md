---
title: Missa Color Direction
version: "1.0"
status: canonical
---

# Missa Color Direction

Missa is Aubergine-led: literary, unusual, calm, and quietly confident. The color system should feel like an opportunity library at night—deep enough to have atmosphere, clear enough to support deadlines, fees, forms, and decisions.

## Core palette

| Role | Name | Hex | Use |
| --- | --- | --- | --- |
| Brand / action | Aubergine | `#5A3F68` | Primary actions, links, active navigation, identity |
| Action hover / deep | Aubergine deep | `#473050` | Hover, pressed, strong emphasis |
| Brand wash | Aubergine 100 | `#F1EDF3` | Secondary actions, selected surfaces, quiet emphasis |
| Progress / positive | Lichen | `#657547` | Saved, accepted, complete, progress, positive signals |
| Progress wash | Lichen 50 | `#EEF1E8` | Positive status surfaces |
| Attention | Aged ochre | `#A8762A` | Deadlines, fees, review attention, pending states |
| Attention text | Ochre deep | `#78551E` | Text and icons on light attention surfaces |
| Attention wash | Aged ochre 50 | `#F5ECD9` | Attention status surfaces |
| Information | Mineral blue | `#426B7A` | Neutral information, source notes, structured guidance |
| Information wash | Mineral blue 50 | `#E7EFF2` | Information surfaces |
| Ink / dark ground | Aubergine black | `#171418` | Primary text, dark surfaces, dark-mode canvas |
| Canvas | White | `#FFFFFF` | Default page canvas and primary surfaces |

## Product rules

- Aubergine is the only brand action color. Do not introduce a second brand accent per feature.
- Opportunities use Aubergine as their default identity color. Lichen, ochre, and Mineral blue are semantic companions, not competing brands.
- Use white canvas by default. The screenshot direction’s near-black ground is reserved for dark mode, immersive panels, and intentional editorial moments.
- Keep color distribution quiet: one dominant action, one status signal, and generous neutral space.
- Never communicate status through color alone. Pair every status color with a word, icon, or explicit state.
- Avoid purple gradients, rainbow dashboards, and decorative color that does not carry meaning.

## Opportunity card direction

Opportunity cards use a neutral or dark surface, a pale category pill, Aubergine action button, and one small semantic count/status accent. The default card should feel useful before it feels branded:

```text
category pill     pale neutral / information surface
opportunity title dark ink or white
deadline           muted ink, ochre only when attention is required
primary action     Aubergine
saved/progress     Lichen
```

## Approved combinations

### Aubergine + Lichen

The default Missa combination. Natural, unusual, quietly creative. Use for creator-facing opportunity discovery, saved states, progress, and calm celebration.

### Aubergine + Aged Ochre

Warmer and more literary. Use for deadlines, fees, review attention, and editorial or archival moments. Ochre text must use `#78551E` on pale ochre surfaces; do not place white text directly on `#A8762A` for small text.

### Aubergine + Mineral Blue

Cooler and more structured. Use for source notes, methodology, neutral guidance, organization workflows, and technical information.

## Accessibility

- Aubergine `#5A3F68` is the default colored text/action color on white.
- Ochre uses the deep text value `#78551E` on `#F5ECD9` surfaces.
- Lichen and Mineral blue should use their deep text/surface pairing for small text; do not assume the saturated swatch is readable on white.
- Focus uses a visible Aubergine ring with sufficient separation from the control border.
- Validate every new combination with automated contrast checks and a grayscale pass.

## Implementation

The implementation source of truth is `apps/web/app/globals.css`. Component styles must consume semantic tokens (`--primary`, `--green`, `--ochre`, `--mineral-blue`, and their tints) instead of introducing local brand hex values.

`DESIGN.md` defines the wider component and layout contract. This document defines the color direction used by marketing, creator, organization, and admin surfaces.
