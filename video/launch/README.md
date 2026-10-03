# Missa launch video

A 32-second announcement film, built with [Remotion](https://www.remotion.dev/):
**Missa — the opportunity layer for every creator.**

It is a standalone package. It is not an npm workspace, and the web app does not depend on it.

```bash
cd video/launch
npm install
npm run studio          # live preview in the browser
npm run render          # all three formats into out/
npm run render:square   # 1080×1080 · also :vertical (1080×1920) and :wide (1920×1080)
npm run stills -- LaunchSquare out/stills 30,300,600   # review frames
```

`npm run sync` copies the fonts and photography it shares with the product
from `landing/fonts` and `apps/web/public/media/home` into `public/`. Every
render and studio command runs it first, so the film always uses the same
assets as the site. Those copies are git-ignored.

## Script

Voiceover: ElevenLabs, voice **Temitope** (calm, warm, clear Nigerian English),
`eleven_multilingual_v2`, take 2 of 4. File: `public/audio/voiceover-temitope.mp3`.

> Grants. Residencies. Prizes. Open calls.
> They're scattered across the internet, each with its own deadline, fee and rules.
> Missa brings them together.
> Compare the facts. Open the official source. Save your decision. Track what comes next.
> For writers, painters, filmmakers and musicians.
> Missa. The opportunity layer for every creator.

The copy follows `docs/missa-content-quick-reference.md`: plain nouns, direct
actions, and none of the rejected patterns or words.

## Storyboard

| Time | Scene | What happens |
| --- | --- | --- |
| 0.0–5.3s | **Categories** (citron) | Each category word lands on the voice. A photo circle wipes to that category's campaign image. Grayscale circles orbit it, a nod to the UDC speaker ring. |
| 5.3–11.0s | **Scattered** (white) | Listing fragments pile up across the frame. Deadline, fee and rule chips turn ochre on "deadline", "fee" and "rules". |
| 11.0–19.3s | **Product** (forest) | Forest wipes in, the fragments collapse into one Missa opportunity card, and the wordmark appears. Each verb then acts on the card: facts highlight, the official source opens, Save becomes Saved, the tracker fills to *In review*. |
| 19.3–24.0s | **Creators** (sky) | A ring of creator portraits turns and rests on each person as they are named. Circles away from the front are tinted, and the tint eases off as each one reaches the front. A citron name block rolls to the next name. |
| 24.0–32.0s | **End card** (forest) | Wordmark, then "The opportunity layer for every creator." word by word, then *Browse opportunities* and usemissa.com. |

## Sync

`src/timing.ts` holds the start of every spoken phrase. These were measured
from the voiceover waveform: 17 voiced segments, one per phrase. Every scene and
word reveal reads from that map. If you replace the voiceover, re-measure
those numbers and the whole film re-times itself.

## Brand

- Colours: Missa primitives from `DESIGN.md` (forest-600/700, lichen, ochre, the
  neutrals) plus the approved homepage marketing extension (citron `#DDF45B`,
  sky `#C6E8F4`). See `src/tokens.ts`.
- Type: Newsreader for editorial statements and titles, Instrument Sans for
  interface text, Fragment Mono for dates, money and counts.
- Easing: the DESIGN.md `enter` and `standard` curves.
- Wordmark: the paths of `apps/web/public/brand/missa-wordmark-240.svg`.

## Before publishing

- **The opportunity content is illustrative.** "Coastal studio residency",
  "Harbour Arts Foundation" and the scattered fragments are made up. Swap in
  real catalogue records in `src/components/OpportunityCard.tsx` and
  `src/scenes/Scattered.tsx` if you want real listings, as UDC did with its real
  speakers.
- **There is no music yet.** Add a licensed track as another `<Audio>` in
  `src/Launch.tsx`, at about −18 dB under the voice.
- **Image sources:**
  - Category images: original fictional Missa campaign images (see the `.json`
    sidecars in `apps/web/public/media/home/generated`).
  - `hero-artist-studio.webp`: Sandro Lopes Art, Pexels License.
  - `creator-filmmaker.webp` and `creator-musician.webp`: generated for this film
    with ElevenLabs (Seedream 5 Pro), in the same art direction.
