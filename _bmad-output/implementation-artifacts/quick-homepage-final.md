---
workflow: quick-flow
slice: homepage-final-cta-footer
status: implementation-complete
---

# Homepage final CTA and footer — implementation notes

## Dev Notes

- Replaced the closing section's eager `<video>` source with a client-side `FinalVideo` component. It observes the final CTA with `IntersectionObserver`, assigns the MP4 source only once the section is visible, and starts playback only after that point. A poster is present from the initial render, so the below-fold section does not decode the film while the visitor is still reading earlier content.
- Added an accessible play/pause control for the closing film. Playback stays muted, looping, and inline, while the control exposes an `aria-label`, `aria-pressed`, visible focus ring, hover, pressed, and touch-safe states.
- `prefers-reduced-motion` keeps the closing poster and removes the video source whenever the preference is active (including runtime preference changes). The final film control is disabled in that state and the CSS keeps the poster visible.
- Kept final CTA destinations session-aware through the existing `primaryHref`/`primaryLabel` contract: anonymous visitors reach `/login?mode=signup`, and signed-in visitors reach `/opportunities` as `Open Missa`.
- Increased footer link type and minimum heights for readable, touch-safe navigation. Existing destinations were preserved; no new unsupported privacy, pricing, or product claims were introduced.
- Mobile final CTA copy now has a bounded intro line and smaller spacing so the heading, action, and film control remain clear at narrow widths.

## Validation Results

- `npx tsc --noEmit -p apps/web/tsconfig.json` — PASS.
- `npm run build --workspace=@missa/web` — PASS (radar-engine, radar-adapters, workspace-engine, and Next.js production build).
- Browser smoke — NOT RUN in this worker because the local Playwright browser executable is unavailable. The leader should verify source deferral, pause/play state, reduced-motion poster behavior, and 390px final CTA layout in the normal browser preview.
- No commit created by this worker.

## Files changed

- `apps/web/components/final-video.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/home.module.css`
