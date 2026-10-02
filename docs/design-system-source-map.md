# Missa design-system source map

One place that says, for each kind of design value, where the canonical truth
lives, what it is called at each layer, and which source wins when two disagree.

This is the reference the three skills under `.github/skills/` read. It replaces
the ad hoc "which token wins" reasoning with a single precedence rule.

## Precedence

For any design value, the canonical source in order is:

1. `DESIGN.md` — binding product rule and naming.
2. `apps/web/component-policy.json` — machine-readable role and component map,
   binding for new UI.
3. `apps/web/app/globals.css` — the compiled CSS custom properties the
   application actually consumes (the value truth).
4. `apps/web/component-catalogue.json` — installed component ledger and approved
   variants.
5. Installed component source (`apps/web/components/ui`, then
   `apps/web/components/shadcn-studio`).
6. The configured registry (`apps/web/components.json`).

Where a value is not recorded at a higher layer, the next layer down is
authoritative for it. Where two layers disagree and no rule settles the conflict,
surface both and stop; do not choose silently.

`npm run check:design-system` is enforcement, not a rule source. A passing check
does not override `DESIGN.md`.

## Color

Missa expresses the same ten roles under three names. The table reconciles them.
The CSS value in `globals.css` `:root` is the compiled truth.

| Role (`component-policy.json`) | Product name (`DESIGN.md`) | CSS variable | Value |
| --- | --- | --- | --- |
| canvas | White canvas | `--bg`, `--background` | `#ffffff` |
| surface | White surface | `--surface`, `--card`, `--popover` | `#ffffff` |
| ink | Near-black ink | `--ink`, `--foreground`; plus `--ink-2`, `--ink-3` | `#171418` |
| primary | Forest | `--brand-accent`, `--primary`; plus `--accent-deep` | `#285649` |
| success | Green | `--green`, `--chart-2`, `--success` | `#607047` |
| warning | Amber / Ochre | `--ochre`, `--ochre-deep`, `--chart-3`, `--warning` | `#a8762a` |
| destructive | Red | `--destructive` | `#9f3f46` |
| information | Mineral blue | `--mineral-blue`, `--chart-4`, `--information` | `#426b7a` |
| border | hairline border | `--border` | `#e3e7e5` |
| focus | Forest focus ring | `--ring`, `--brand-accent` | `#285649` |

Subtle variants are derived, not independent tokens: `--surface-subtle`,
`--surface-muted`, `--accent-tint`, `--lichen-tint`, `--ochre-tint`,
`--mineral-blue-tint`, `--success-subtle`, `--warning-subtle`,
`--information-subtle`, `--destructive-subtle`. Quote them by name; do not
re-declare a raw value where a subtle token exists.

### Known naming inconsistency

`DESIGN.md` §3 calls the warning role "Amber", but its own badge table and the
CSS call the same role "Ochre" (`--ochre`, `--ochre-deep`, `--ochre-tint`).
These are one role, not two. Do not invent an "amber" token: the compiled
variable is `--ochre`. Resolving the name belongs in `DESIGN.md`; it is an open
decision, not a mapping decision.

### Scoped palettes (not canonical product tokens)

These are intentionally scoped and must not leak into feature code as if they
were the canonical roles:

- `apps/web/components/design-system/collection-palette.css` — editorial
  collection-cover primitives only (`--palette-collection-*` and
  `--collection-*`). See `DESIGN.md` "Collection editorial covers".
- `apps/web/components/design-system/creator-palette.css` — creator portfolio
  theme overrides (`--creator-canvas`, and theme-scoped `--primary`/`--ring`
  overrides). See `DESIGN.md` "Creator portfolio appearance".
- `apps/web/components/design-system/*-tokens.css` and the design-system
  `*.module.css` files — `/design-system/*` review-route component tokens
  (`--welcome-*`, `--discovery-*`, and similar). These remap canonical
  variables locally; they are preview implementation, not a new token layer.

### Retired / derived palette source

`globals.css` records that the palette was "reused verbatim" from
`docs/handoff-2026-07-07.md` and `_bmad-output/planning-artifacts/ux-design-specification.md`.
Those are historical provenance, not live sources. Do not cite them over
`DESIGN.md` or `globals.css`. A token spreadsheet previously kept for history is
stale after the semantic rename; if one is supplied, treat it as a retired
source and say so.

## Spacing

Canonical source: `DESIGN.md` §5–6 and the `--space-*` variables in
`globals.css`.

- Fixed relationships (do not change with density): `--space-label-control` (8),
  `--space-helper` (8), `--space-control-inline-bordered` (12),
  `--space-control-inline-borderless` (24), `--space-control-group` (24),
  `--control-height-public` (44), `--control-height-compact` (36),
  `--touch-target-min` (44).
- Density ladder, selected by `[data-density="compact|comfortable|spacious"]`:
  `--space-row`, `--space-group`, `--space-section`, `--space-inset`,
  `--space-gap`, `--space-gutter`, and `--space-section-major` (96, Spacious
  only).
- The `--s1`..`--s12` scale (8..96px) is the underlying step scale.

A value off the ladder is not a token. It is ambiguous (the token is right, the
value is wrong) or a gap (a fixed height no category covers).

## Radius

Canonical values: 4, 8, 12, 16, and full. The compiled base is
`--radius: 0.625rem` with `--radius-sm/md/lg/xl/2xl/3xl/4xl` multipliers.
`DESIGN.md` §7 assigns each value to a surface family. An arbitrary radius is a
forbidden value, not a candidate token.

## Type

Canonical source: `DESIGN.md` §4 type-scale table, and the families
`--font-editorial` (Newsreader), `--font-interface` (Instrument Sans),
`--font-data` (Fragment Mono). The font tokens loaded by `app/layout.tsx` are
authoritative; do not declare a family in a feature stylesheet.

## Motion

Canonical source: `DESIGN.md` §9 and `component-policy.json` `motion`.

- 120ms hover/press, 180ms small disclosure, 280ms dialog/sheet.
- Four gates: state is changing, motion improves comprehension, motion stops with
  the state, and text/accessible state gives an equivalent.
- `forbiddenStaticMeanings` never animate: category, discipline, fee,
  eligibility, verification, match-score, deadline, premium, persistent-warning.

## How the skills use this map

- `missa-token-mapping` resolves a value's category and purpose against the
  table above, and reads `globals.css` for the compiled value.
- `missa-component-docs` records the role noun and the compiled variable in the
  spec's `tokens` field.
- `missa-design-review` cites `DESIGN.md` criteria and routes token/component
  compliance to the other two skills.

## Maintenance

When a value is added, renamed, or retired, update `DESIGN.md`,
`component-policy.json`, and `globals.css` together, then this map. When an open
decision in `DESIGN.md` §15 resolves (for example the final Forest strength),
update only the affected rows here and rerun the affected skill tests.
