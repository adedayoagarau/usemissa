---
status: in-review
scope: homepage-hero-entry-flow
---

# Quick Homepage Hero

## Dev Notes

- Anonymous homepage primary CTAs use `/login?mode=signup`, while the visible header `Log in` link keeps the direct `/login` route. The server login page reads the `mode` query parameter and passes the initial mode into `AuthForm`, preserving the existing login API flow and allowing users to switch modes in the form.
- Authenticated visitors receive the `Open Missa` label and `/opportunities` destination consistently for the hero and navigation CTAs.
- The mobile header retains the editorial pill treatment and keeps `Log in` visible beside the primary CTA at the 760px breakpoint.
- `HeroVideo` owns playback state and exposes an accessible pause/play button. The video remains muted, looping, and inline. Its source is assigned client-side only when `prefers-reduced-motion` is not active; reduced-motion visitors keep the poster and the source is removed if the preference changes at runtime.
- Hero CTA styles include visible focus rings, pressed-state feedback, and minimum heights suitable for touch interaction.

## Validation Results

- `npx tsc --noEmit -p apps/web/tsconfig.json` — PASS.
- `npm run build --workspace apps/web` — PASS (radar-engine, radar-adapters, workspace-engine, and Next.js production build).
- Targeted `npx eslint ...` — NOT RUN: local eslint binary was unavailable and the environment could not resolve `registry.npmjs.org` (`ENOTFOUND`).
- Browser smoke — BLOCKED: Playwright is installed but its Chromium headless executable is not cached locally; downloading it would require unavailable network access. The parent agent should complete the desktop and 375–390px mobile pass where a browser is available.
