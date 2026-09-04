# Decision 008: Forest semantic token authority

Date: 2026-09-01
Status: accepted

## Decision

Missa uses a true-white canvas, near-black ink, quiet neutral structure, and
Forest as its single brand action, selection, navigation, and focus color.
Legacy Aubergine values are retired from current semantic tokens.

The canonical implementation mapping is `apps/web/app/globals.css`. The
canonical design definition is `DESIGN.md`. The palette companion is
`docs/missa-color-direction.md` (Forest, v2). Product components consume
semantic or component tokens and must not introduce route-local brand colors.

Coss UI is an approved source for accessible component mechanics and patterns.
It does not provide a second product theme. Imported Coss components must map to
Missa semantic tokens before entering a product surface.

## Core mappings

| Role | Token | Value |
|---|---|---|
| Canvas | `--background` / `--bg` | `#ffffff` |
| Ink | `--foreground` / `--ink` | `#171418` |
| Primary | `--primary` / `--brand-accent` | `#285649` |
| Primary hover | `--accent-deep` | `#1d4037` |
| Selected surface | `--accent` / `--accent-tint` | `#e3ece8` |
| Structural border | `--border` | `#e3e7e5` |
| Input border | `--input` | `#d8dfdc` |

Semantic success, warning, information, and destructive colors retain separate
roles. Forest does not replace those meanings.

## Governance

1. Routes and feature components do not contain brand hex values.
2. Current selection, focus, and the single primary action share the Forest
   family through semantic tokens.
3. Public portfolios may be image-led, but their controls retain the shared
   semantic action system.
4. A design-system change updates this decision, `DESIGN.md`, and
   `apps/web/app/globals.css` together.
5. Aubergine may appear only in historical comparison fixtures that are clearly
   labelled as such.

## Consequence

Browser prototypes and production routes no longer infer brand colors from
historical documents or local CSS. They consume the same named token roles.
