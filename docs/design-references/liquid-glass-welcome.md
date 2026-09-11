# Missa liquid-glass welcome

## Outcome and scope

`/welcome` is an optional, noindex entry screen: “Make room for what’s next.” Its primary link goes to the existing `/onboarding` route, whose current server implementation authenticates and loads saved preferences. “Explore Missa” goes to `/opportunities`. The welcome screen itself reads/writes no account data and does not replace or gate the existing journey. Nothing was deployed for this change.

The interface uses a white editorial layout, Forest accents, Newsreader headings, and Instrument Sans controls. A finite interaction reveals a collage of creative-work fragments. The illustration is optional; the navigation remains available before opening, with JavaScript unavailable, and when graphics fail.

## Intent, sources, and component choice

- Composition: `composition.liquid-glass-welcome` → `LiquidGlassWelcome` in `apps/web/components/missa/liquid-glass-welcome.tsx`.
- Actions: installed `components/ui/button.tsx` (Base UI/shadcn), using its quiet variant for reversible disclosure. Navigation uses real Next links and the installed `buttonVariants` styling for the primary link.
- Sources inspected: local Studio `button/button-01.tsx`, `card/card-01.tsx`; configured registry order in `components.json`; [shadcn Button](https://ui.shadcn.com/docs/components/base/button), [Studio blocks](https://shadcnstudio.com/blocks), [Studio page templates](https://shadcnstudio.com/templates), and [Coss Button](https://coss.com/ui/docs/components/button). Studio's remote Button page failed to load; its installed source was inspected directly. No remote package was installed.
- Gap: those controls and standard hero/card compositions do not supply a pointer-driven, continuously resizing refractive sphere. Keep their accessible controls, and author only the decorative scene/gesture composition. This is recorded as experimental in the catalogue, pending product review.
- Interaction reference: [Appllama/liquid-glass-screens](https://github.com/Appllama/liquid-glass-screens/tree/07cb20db94a26790f38166a916bb668e796ad335), inspected native source and gate/mid/open showcase in this task's skill creation. No upstream shader, code, wordmark, or artwork was copied.
- External research: [Motion values](https://motion.dev/docs/react-motion-value) and [animate](https://motion.dev/docs/animate) informed spring/velocity integration. [Mobbin onboarding flow index](https://mobbin.com/explore/mobile/flows/onboarding) was available as a public flow catalogue; no authenticated screen review is claimed. Current repository routes and design contracts governed the implementation.

## Rendering and material

`welcome-glass-renderer.ts` paints the background contour lines and artwork to an owned offscreen 2D canvas, uploads it as a WebGL texture, and applies a lens displacement and surface-light calculation in the fragment pass. RGB sampling near the bevel gives subtle dispersion. The backdrop and artwork are in the same source texture, so both refract. DOM text and controls remain outside the renderer.

The renderer uses existing first-party assets under `/media/home/`: mountains, artist at work, portfolio still life, and gallery interior. The book, seal, frames, starbursts, and contour backdrop are original programmatic artwork. No remote media or new art dependency is required. Missing photographs leave a tinted frame rather than a blank/error page.

Scoped component tokens live in `components/design-system/welcome-tokens.css`, mapped from existing Missa semantic colors/radii. `welcome-motion.ts` holds the finite spring and reveal settings. The circular radius describes decorative optical geometry, not a new primary-button shape. Buttons retain the standard component radius. No global theme or baseline exception was changed.

The theme uses a dip/upward-fade exit. The 12-piece plume is authored and finite rather than a continuous particle simulation: no ambient loop, video, rotating copy, or permanent frame loop. Motion values invalidate one animation frame as needed. GPU resources and observers are cleaned up on unmount. Pixel ratio is capped at 1.5. Reduced motion immediately changes the scene state. The fallback preserves all actions and presents static fragments.

## State coverage

| State                            | Behavior                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| Default                          | Closed dome, welcome copy, always-available navigation                                           |
| Hover / active                   | Existing Button hover feedback, grab/grabbing cursor on gesture surface                          |
| Focus-visible                    | Existing Button focus styles, inset scene outline, explicit link outlines                        |
| Open / success                   | Artwork plume and new copy; semantic expanded state and one status announcement                  |
| Partial drag / cancellation      | Spring to selected endpoint; cancellation clears capture/drag without stale launch velocity      |
| Reopen                           | Cancel previous plume animation and emit fresh finite arrangement                                |
| Loading / absent graphics        | Immediate CSS fallback; navigation does not wait for renderer or media                           |
| Missing images                   | Tinted artwork frames; other rendered artwork remains                                            |
| WebGL context lost               | Static fallback; recreate resources on restoration and retain open state                         |
| Reduced motion                   | Immediate state change; no spring, emission animation, or loop                                   |
| Disabled / server mutation error | Not applicable: there is no form, submission, or pending mutation; link actions remain available |

## Validation

- Full web TypeScript check passed.
- Focused ESLint passed for the new route, component, renderer, motion tokens, and tests.
- `npm run check:design-system` passed: no new violations or baseline edits.
- Seven Chromium Playwright tests passed: keyboard reveal/repeat; partial/full upward and downward drags; reduced motion and axe accessibility scan; 390px/short viewport/200% CSS zoom with long copy; pointer cancellation and missing artwork; missing WebGL fallback; context loss and restoration.
- Axe found no violations in the main region in the reduced-motion open state. This is an automated scan, not full assistive-technology certification.
- Desktop closed/open and 390px open screenshots were visually inspected. The lens visibly bends contour lines and a starburst that crosses its edge. A long-word overflow found during zoom testing was corrected with wrapping and a shrinkable grid child.
- 200% is CSS zoom in Chromium, supplemented with a narrower viewport; browser-chrome zoom and native phones were not tested. Safari, Firefox, real iPhone/Android, live account onboarding completion, and production performance remain unverified. Existing route targets were inspected and link hrefs tested; account actions were not performed.

The focused suite is `apps/web/e2e/liquid-glass-welcome.spec.ts`. Local preview: `http://localhost:3100/welcome` while the development server is running.
