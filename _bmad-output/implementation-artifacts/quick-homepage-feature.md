---
workflow: quick-flow
slice: homepage-feature-proof
status: implementation-complete
---

# Homepage feature section — implementation notes

## Dev Notes

- Kept the feature cards as informational articles and removed the northeast-arrow affordance and hover lift. The cards do not currently navigate anywhere, so the visual treatment no longer implies a hidden action.
- Replaced the arrow with a small status marker and introduced a compact “See it move” proof rail before the cards. The rail shows a clearly labelled sample workflow (Saved → Submitted → Accepted) so product evidence appears beside the feature explanation rather than only in the later tracker section.
- Added the Missa Aubergine accent (`#5a3f68`) only to workflow markers and step numbers; the rest of the landing page remains ink/paper.
- Added a tablet breakpoint at 900px. At 768–900px the feature grid uses two columns, with the third card spanning the row; cards have `min-width: 0`, and the route illustration is constrained to its card width. This prevents the previous 768px clipping while preserving the three-column desktop composition.
- The proof rail collapses to a one-column timeline on narrow screens. Film credit sizing was raised and given a larger tap target for readability.
- No hero auth/video behavior, tracker markup, organization section, or final CTA/footer behavior was changed.

## Validation Results

- `npx tsc --noEmit -p apps/web/tsconfig.json` — passed.
- `npm run build --workspace=@missa/web` — passed (Next.js production build and package TypeScript builds).
- Browser screenshot/runtime validation was not run in this worker because the local Playwright browser binary was unavailable in the environment. The new breakpoint uses bounded grid tracks and constrained art dimensions so it can be checked at 768px and 390px in the next leader validation pass.

## Files changed

- `apps/web/app/page.tsx`
- `apps/web/app/home.module.css`
