# Missa landing page

Static, dependency-free landing page. Open `index.html` directly or serve the folder with any static server.

## Structure

- `index.html` — the whole page: markup, styles, and all motion. No build step, no JS libraries.
- `art/` — public-domain paintings (Vermeer, Metsu) sourced from Wikimedia Commons, recompressed for web.
- `art/layers/` — the hero painting cut into three planes (wall, red curtain, green curtain) for parallax.
- `fonts/` — self-hosted Fraunces, Newsreader, Instrument Sans, Fragment Mono, Pinyon Script (woff2).

## Motion architecture

All motion is CSS. Three tiers, each with a job:

1. **Load-once hero entrance** — nav fade + staggered rise of kicker/headline/sub/CTA.
   Time-based, `--ease-out-quint`, 900ms illustrative tier, 120-140ms stagger.
2. **Scroll-scrubbed set pieces** — driven by named `view-timeline`s, so scroll position *is* the playhead:
   - Hero pin + three-plane parallax (`.pin-wrap` is the timeline source; the sticky stage's planes
     translate at different rates, linear timing because scrub motion should map 1:1 to scroll).
   - The tracker document sequence: the Gmail reply slip slides in, then the ACCEPTED stamp lands,
     sequenced by offset `animation-range`s on the same `--ledger-scroll` timeline.
3. **Ambient reveals + micro-interactions** — `.reveal` / `.reveal-lag` / `.reveal-scale` utilities on
   `animation-timeline: view()` for one-shot entrances (shaped with `--ease-out-quart` so elements land
   early in their range), plus 120-180ms transform/opacity transitions on pills, links, and the email form.

Motion tokens (durations + easing curves) live in `:root`. `prefers-reduced-motion` disables all of it.

Scroll-driven animations require Chromium 115+/Safari 26+; Firefox degrades gracefully (content visible,
no scrub). Everything animates `transform`/`opacity` only.
