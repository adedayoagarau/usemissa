# Homepage illustration packet

Brief for the art the homepage needs to read as premium. Today the page
has no imagery of its own: the hero cards show a pale tint with the
organization's name repeated, and the lower sections are tinted panels
with product crops. Notion earns its warmth from one consistent
illustration system sitting beside real product UI. Missa needs the
same, drawn from a creator's world rather than an office.

Produce the packets in priority order. Packet A alone changes the first
screen; B and C finish the page.

## Shared style

- **Line:** single-weight ink line, round caps and joins, slightly
  imperfect, as if drawn with a fine pen. 1.5px at the rendered size.
- **Colour:** ink line plus at most two flat fills from the Missa
  palette. Use the token names, not hex values, in the SVG:
  `var(--primary)` Forest, `var(--ochre)`, `var(--mineral-blue)`,
  `var(--green)` lichen, and the paper tints `var(--ochre-tint)`,
  `var(--mineral-blue-tint)`, `var(--lichen-tint)`, `var(--accent-tint)`.
  No gradients, no shading, no texture.
- **Subjects:** the things creators make and handle. Manuscripts,
  envelopes, a typewriter, a sketchbook, a camera, a microphone, a
  canvas on an easel, a gallery wall, a ticket stub, a ribbon, a key to
  a studio. People appear as Notion-style figures: a few lines, simple
  hair shapes, no detailed faces.
- **Never:** rockets, sparkles, robots, laptops-with-charts, briefcases,
  handshakes, trophies with stars, stock "diverse team" groupings,
  watercolour or paper-texture nostalgia.
- **Format:** SVG, `viewBox` only, no width or height, paths merged, no
  editor metadata, no embedded fonts or rasters. Strokes as
  `stroke="currentColor"`. Each file under 12 KB.
- **Delivery:** `apps/web/public/illustrations/<packet>/<slot>.svg`.

## Packet A: call covers (highest impact)

One cover per call type, used on every browse card that has no
organization image. These replace the pale tint and the repeated
organization name, so each card in the hero gets its own picture.

| Slot | Type | Subject idea | Fill |
| --- | --- | --- | --- |
| `magazine` | Magazine | An open literary magazine with a pen resting across it | ochre-tint |
| `residency` | Residency | A small studio with a window, a desk and a bed; a key on a hook | lichen-tint |
| `grant` | Grant | A sealed envelope with a wax seal, a few coins or a cheque peeking out | accent-tint |
| `fellowship` | Fellowship | Two chairs at one long worktable with lamps | mineral-blue-tint |
| `contest` | Contest | A stack of manuscripts with one marked by a ribbon | ochre-tint |
| `award` | Award | A rosette ribbon pinned to a framed work | ochre-tint |
| `exhibition` | Exhibition | A gallery wall with three hung frames and a bench | mineral-blue-tint |
| `festival` | Festival | A stage with string lights and a ticket stub | lichen-tint |
| `open-call` | Open call (default) | A pinboard with notices, one circled | accent-tint |
| `publication` | Pitch or publication | A typewriter with a page half out | ochre-tint |

- **Canvas:** 4:3, drawn to read at 360 × 270 and at 180 × 135. The card
  crops the top and bottom by up to 10%, so keep the subject in the
  middle 80%.
- **Background:** the fill tint covers the whole canvas, so the cover is
  a complete picture. The card's type badge and bookmark button sit in
  the top corners, so leave the top-left and top-right 64 × 48 areas
  quiet.
- **Consistency:** same line weight, same viewpoint height, same amount
  of detail across all ten. They appear side by side in a grid.

## Packet B: section scenes

Notion-style spot scenes that sit beside section statements.

| Slot | Where it sits | Rendered box | Subject |
| --- | --- | --- | --- |
| `hero` | Right of the hero headline on desktop, hidden on phones | 420 × 280 | A creator at a desk pinning a call to a corkboard above it, a calendar with one date circled in Forest |
| `after-find` | Beside "Everything after you find the call." | 280 × 180 | A figure sliding a manuscript into an envelope, a bell above it |
| `questions` | Under "Questions about Missa." in the left column | 240 × 200 | Two figures at a café table, one pointing at a printed call |
| `close` | Behind the cards in the Forest close panel | 320 × 220 | A desk corner with an open notebook, envelope and pinned postcard, in white line at 60% on Forest, no fills |

Transparent backgrounds. The close scene is line-only so it reads on
Forest.

## Packet C: product tile spots

Small objects that sit in the top-right corner of each feature tile,
opposite the icon. They give each tile a face without competing with the
product crop below.

| Slot | Tile | Rendered box | Subject |
| --- | --- | --- | --- |
| `tracker` | Keep every deadline in one view. | 120 × 96 | A desk calendar with three dates marked |
| `portfolio` | One page for the work you make. | 120 × 96 | A portfolio folder with a photo, a page and a cassette spilling out |
| `reminders` | A nudge before it closes. | 120 × 96 | A bell beside an envelope with a small clock |

## What happens when the files land

Wiring is a follow-up on the homepage branch, not part of this packet.

- **Packet A** goes into the shared browse card, so the catalogue and the
  homepage get the covers together. Cards with a real organization image
  keep it.
- **Packet B** gets placed beside the section statements, with the hero
  scene removed under 1024px.
- **Packet C** sits in the tile corners with `pointer-events: none`.

Every illustration is decorative and gets `aria-hidden`. The page still
reads complete if a file is missing.
