# Production scope, dependencies and acceptance

> **Superseded direction:** Read [the current production sequence](07-current-production-sequence.md) first. Empty-room composition, Writing-first pilot, fixed page structure and CSS-reveal fallback are not current creative decisions. Technical checks remain applicable; image-specific prompts need revision for the selected Midjourney master.

## 1. Deliverables and ownership

Planning deliverables are complete in this folder. Next work is staged so that a failed visual mechanism does not consume the whole production budget.

| Milestone | Deliverables | Depends on | Exit criterion | Effort estimate |
|---|---|---|---|---|
| M0: reconcile | Current-code map, clean ownership boundary, existing route screenshots, asset/tool capability check | This pack | Source facts and preview path verified | 0.5 day |
| M1: art pilot | One approved closed master, Writing endpoint, desktop/mobile layout boards | M0 | Same architecture, credible scene, usable phone crop | 1–2 days |
| M2: motion pilot | Writing forward/return, matched posters, manifest, unstyled reliable player | M1 | Three clean cycles plus slow/missing media and reduced motion | 1–2 days |
| M3: full set | Other five worlds, matched pairs/posters, mobile family | M2 accepted | All seams/crops approved, files inventoried | 2–4 days |
| M4: homepage | Full editorial page, verified links and real-data section, approved component integration | M1; media enhancement after M2/M3 | Useful independently of video | 2 days |
| M5: QA and handoff | Browser matrix, accessible interaction, performance, truth audit, rollback | M3/M4 | No unresolved release blocker | 1–2 days |

Total approximately 8–13 focused days. Individual tasks may overlap within one contributor's workflow, but this is not a commitment to delegate or create separate tasks. Calendar duration depends on review and generation availability. At the end of M2, decide whether the remaining five scenes justify their cost. A static art-directed version remains a complete release option.

## 2. Asset count and delivery structure

Core creative family: one closed base and six open destinations; six forward clips and six return clips. Final delivery: seven desktop posters plus seven mobile posters, twelve desktop clips plus twelve mobile clips. Mobile clips may be crops of the same approved masters when they pass composition checks; otherwise require a separately matched mobile family. Thus delivery is **14 posters + 24 video files**, not necessarily 24 independent generations.

Pilot delivery: two desktop and two mobile posters; one forward/return pair in each viewport family: four video exports. Start with one master family and prove whether crop-based mobile works.

Proposed public asset location after approval: `apps/web/public/homepage/studio/v1/`. Keep source generations and editing masters outside `public`. Do not add the upstream 89 MB reference pack to the application.

Naming: `base-desktop.webp`, `writing-desktop.webp`, `writing-forward-desktop.mp4`, `writing-return-desktop.mp4`; repeat with `mobile` and each stable world identifier. Use versioned paths or content hashes for revised encodes.

For every delivered file record: identifier, role, family, local path, SHA-256, byte size, dimensions, duration, encoded frame rate, codec/container, colour metadata, audio presence, opening frame time, valid hold time, previous/next compatible scene, generator/model/version if known, prompt ID, source inputs, edits, rights/provenance and reviewer status. Do not put secret keys or private provider links in a public manifest.

Each clip has its own hold time. The reference's 0.08/0.18-second tail guards must not be copied to Missa files without frame inspection. Extract posters from final approved holds. Retain the original approved generation images separately as production references.

## 3. Cost control

No generation was run for this planning task. Provider pricing, subscription access and exact endpoint support are not yet verified. Do not invent a dollar budget.

Estimate using `base image attempts + six endpoint-edit attempts + six forward-video attempts + any required return repairs + mobile-family production + editing/QA time`.

Initial pilot cap proposal: up to 3 master candidates; up to 3 Writing endpoint revisions; up to 3 Writing forward takes. Return begins as a local reverse edit, not a separate paid generation. These are planning caps, not prepaid credits or current authorisation to spend. If the core geometry is still unstable after three motion takes, stop generating and switch to the composited alternative described in the media pack.

Before production, record current per-unit price and selected model limits, calculate a concrete pilot maximum and identify the account/tool used. Use existing authorised generation access within its actual limits. Paid purchases or a new spending commitment require a concrete budget decision, not a generic confirmation after each routine edit.

Full-production generation should be released in batches: Writing pilot, then Visual art/Film, then Music/Performance/Design. This catches systematic crop or colour problems early.

## 4. Implementation boundaries

Current homepage is `apps/web/app/page.tsx` → `components/design-system/homepage-hero-preview.tsx`. Existing unrelated changes remain untouched. Initial route proposal: `/design-system/homepage-studio` after checking that it is unused. Do not replace `/` while constructing the pilot.

Proposed new files, subject to source reconciliation:

- `apps/web/components/missa/homepage-studio.tsx`: reusable semantic composition.
- `apps/web/components/missa/homepage-studio.module.css`: approved component-token references.
- `apps/web/lib/homepage-studio-manifest.ts`: typed asset and scene metadata.
- `apps/web/lib/homepage-studio-player.ts` or a colocated hook: bounded state and media lifecycle.
- `apps/web/app/design-system/homepage-studio/page.tsx`: isolated review route.
- `apps/web/e2e/homepage-studio.spec.ts`: meaningful transition, navigation and failure coverage.
- `apps/web/component-policy.json` and `component-catalogue.json`: new composition and status, only after required source review.
- Central token definitions and DESIGN.md only if a documented missing role requires an explicit addition.

The filename list is a scoped proposal, not an instruction to recreate architecture already present. B01 must inspect existing functionality first. Keep Next.js and the existing toolchain; do not scaffold Vite into Missa because the external pack suggests it.

## 5. Player architecture and concurrency

Separate `requestedWorld`, `displayedWorld` and playback phase. Playback phases: poster, preparing, forward, holding, returning, failed. Motion setting and viewport family are independent state. The scene state machine owns no database preference or account mutation.

Keep the outgoing video element and valid frame mounted while the incoming element prepares. A bounded pool may reuse an offscreen element only after it is no longer the visible held source. Persistent elements per loaded clip are acceptable initially, but avoid eagerly loading/decoding all 24 exports. At most one video plays; retain only the required active/next resources and an appropriate poster fallback.

Take a synchronous lock on accepted transition. Assign a request token; ignore old callbacks after cancellation, unmount, retry or viewport-family change. Use video refs for frame-level work. Never rerender the entire homepage per frame.

For branch A → B, return A to the verified base, then play B. Keep one pending request containing only the most recent target. Close studio requests base. Same-world selection at rest does nothing. Failure does not commit a false displayed scene. Retry reuses the target request with a fresh token.

Readiness requires a usable opening frame and successful playback, not just metadata or an arbitrary timeout. Timeouts produce a recoverable failure. Use `requestVideoFrameCallback` when available; test an event/readiness fallback on browsers without it. Preserve outgoing content during preparation and errors. Never expose a seek or changed source on the visible layer.

Changing viewport family while playing: defer the switch to a stable hold or cancel to a matched poster. Changing to motion off: cancel callbacks, pause media and resolve to the approved requested-world poster if present. On page hide, pause; on return remain at a safe state and allow replay rather than unexpectedly restarting background movement.

## 6. Performance targets — proposed, to measure

- No required video transfer for initial content or navigation.
- Base poster target ≤250 KB mobile, ≤450 KB desktop at acceptable quality.
- Target compressed clip ≤2 MB mobile, ≤4 MB desktop for approximately 2–3 seconds. These are rejection/review budgets, not guarantees independent of footage complexity.
- Fetch only the selected family; do not preload all twelve scene directions at page load.
- Prefetch a likely return after forward begins only if connection conditions allow it. Data-saving mode defaults to stills where detectable; absence of the browser hint is not evidence of an unconstrained connection.
- Target LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1 under an explicitly documented mobile test profile. Lab results are not field percentile claims.
- Reserve image/video dimensions; no scene-control movement pushes the page around.
- Benchmark paused-media memory and repeated cycles on a real iPhone/Android device where available. Desktop emulation does not certify hardware decoding behaviour.

If any media budget repeatedly fails, shorten or simplify the scene, use a lower-resolution approved encode, or release the still version. Do not hide delays behind a fullscreen loading screen.

## 7. Acceptance matrix

| Area | Required checks |
|---|---|
| Default | Headline, lede, Explore and base poster visible; no video autoplay |
| Hover/pressed | Clear local feedback; hovering never changes a studio |
| Keyboard/focus | Logical order, visible focus, Enter/Space, no hidden controls focusable; navigation accessible during play |
| Loading | Stable dimensions, concise status, preserved last frame, working browse link |
| Disabled | Only unavailable scene operations disabled; no whole-page lock |
| Empty | Zero verified opportunities produces truthful catalogue invitation |
| Error | Missing forward, missing return, blocked play, stalled network, failed poster each recover |
| Success | Correct endpoint held, correct caption/pressed state, no false save or application event |
| Repetition | All six cycles ×3; base → Writing → Film → Design → base; rapid double clicks; latest-request behaviour |
| Seams | First paint, forward entry, hold, return entry, return hold, mobile family switch; no crop/exposure/base blink |
| Viewports | 1440×900, 1920×1080, 390×844, 320×568, tablet, short landscape |
| Accessibility | 200% zoom, enlarged text, long copy, reduced motion before load and during playback, screen reader status |
| Network/cache | Cold/warm cache, throttled network, offline after initial load, intentional 404 |
| Browsers | Actual tested Chrome, Safari and Firefox versions; native phone if available |
| Source truth | Real URLs, canonical taxonomy, public visibility/freshness, no fixture claims |
| System | Current type/build scripts, focused tests, `npm run check:design-system` |

Release blockers: an inaccessible primary action, motion-only essential information, any falsely live record, unsupported product claim, visible wrong-frame flash, persistent lock, uncaught media error, missing fallback, clipped mobile controls or new design-system violation.

## 8. Measurement and release

First inspect existing analytics and consent behaviour. If appropriate, add only aggregate events: homepage Explore clicked; practice link clicked; scene requested; scene media failed; still mode chosen. Scene selection is not a saved preference, registration, application start or submission. Do not send personal profile data or private search text.

Primary product success: reaching opportunities and opening useful detail pages. Secondary: successful source-link navigation when available. Scene engagement is diagnostic; optimising it at the expense of discovery is failure. A source-link click cannot certify application submission.

When the preview passes: prepare the minimal homepage route change, exact changed-file diff, visual evidence, measured asset sizes and rollback route/component. Preserve the old hero for a reversible switch until post-release validation. Deploy only within the user's actual release authorisation. Report deployment and live checks separately from local success.
