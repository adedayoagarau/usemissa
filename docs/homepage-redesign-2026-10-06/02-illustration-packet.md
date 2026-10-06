# Homepage illustration packet

Brief for the spot illustrations the homepage can take. The page ships
without them: every slot below is optional and the tile reads complete
with its icon alone. Add an illustration only where it earns the space.

North star: Notion's line-art figures and objects, which sit beside
product crops without competing with them. Missa's version is quieter:
objects from a creator's world, drawn in ink, with one spot of Forest.

## Style

- Single-weight ink line, 1.5px at the rendered size, round caps and
  joins. No gradients, no shading, no textures.
- Two colours only: the line in `currentColor` (the page sets it to
  `--ink`), and one spot fill that uses `var(--primary)` (Forest). Mark
  the spot fill with `class="spot"`; nothing else is filled.
- Transparent background. No frame, no drop shadow, no ground line.
- Objects, not mascots. A bell, a postcard, a notebook, a gallery wall, a
  microphone, a camera, a pinned note. People only as a group outline
  for the Directory tile, no faces.
- Nothing that reads as a tech startup (rockets, sparkles, robots) or a
  job board (briefcases, handshakes, ties).
- Match the tile's statement, not its label: the illustration completes
  the sentence.

## Format

- SVG, hand-tidied: `viewBox` only (no width/height), paths merged,
  no editor metadata, no embedded fonts or rasters, under 8 KB each.
- Strokes as `stroke="currentColor" stroke-width="1.5"`; the spot as
  `fill="var(--primary)"` with `class="spot"`.
- `aria-hidden="true"` is added by the page; do not add a `<title>`.
- Deliver to `apps/web/public/illustrations/homepage/<slot>.svg`.

## Slots

| Slot | Tile statement | Rendered box (desktop) | Placement | Subject |
| --- | --- | --- | --- | --- |
| `reminders` | A nudge before it closes. | 180 × 120 | bottom-right corner of the Reminders tile (lichen tint) | A bell with a single motion line, or a calendar leaf with the date circled in Forest |
| `circle` | Find your artist circle. | 180 × 120 | bottom-right corner of the Directory tile (accent tint) | Three overlapping outlines of people seen from behind, looking at one pinned work; the pinned work carries the spot |
| `shortlist` | Start without an account. | 180 × 120 | bottom-right corner of the Shortlist tile (neutral) | A bookmark slipping between two stacked cards; the bookmark carries the spot |
| `close` | Shortlist calls. Keep every deadline. Share your work. | 260 × 180 | behind the two product cards in the Forest close panel, line in white at 60% | A desk corner: an open notebook, an envelope, a pinned postcard. Spot unused here; the panel is already Forest |

The three tile boxes are 180 × 120 at 1440px and scale with the tile down
to 150 × 100 at 390px; keep the drawing legible at the small size by
limiting each to four or five objects. The close illustration is hidden
under 1024px, where the panel stacks and the cards take the space.

## What the page will do with them

Integration is a small follow-up once the files land, not part of this
packet. `FeatureTile` in `apps/web/components/missa/homepage-standard-client.tsx`
gets an optional `illustration` slot: the SVG is inlined (so
`currentColor` and `var(--primary)` resolve), placed absolutely in the
corner with `pointer-events: none` so it never blocks the tile link, and
given the same hover rise as the product crop (4px on the enter curve,
nothing under reduced motion). Nothing else changes: the tile's icon,
label, statement and link stay where they are, so a missing file leaves
the tile intact.
