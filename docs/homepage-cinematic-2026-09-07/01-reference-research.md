# Reference research and complete extraction map

## 1. What the user supplied

[Video States Website by Amir Mušić](https://github.com/amirmushichge/video-states-website), pinned for this work to commit `8e732893ab2367ef64e70fc01878ab70a23bf66e`.

This is a production resource pack for a cinematic, click-operated video interface. The source describes an LTX project and supplies a specification from which an application can be built. It does not contain a ready-to-run React app. A clean-room reproduction is explicitly unverified in its README. The collection preserves useful production evidence but not the complete original private conversation, generation history, seeds, editing project or API requests.

Do not promise that rerunning its prompts recreates the delivered footage. Original and reconstructed material must remain labelled separately. [Source provenance](https://github.com/amirmushichge/video-states-website/blob/main/docs/provenance.md).

## 2. Exact source inventory

| Source | Content and provenance | Where preserved |
|---|---|---|
| `PROMPT.md` | New build specification derived from inspected implementation; React/TypeScript/Vite, presentation, controller, material, state model, playback and QA | `reference-text/PROMPT.md` |
| `prompts/images/00-base.md` | Reconstructed fashion master brief | Same relative path under `reference-text` |
| `prompts/images/01-clothing.md` | Reconstructed clothing recolour edit | Same |
| `prompts/images/02-scene.md` | Reconstructed two-wall city reveal edit | Same |
| `prompts/images/03-lighting.md` | Reconstructed coupled blue-hour edit | Same |
| `prompts/images/04-cast.md` | Reconstructed model replacement endpoint | Same |
| `prompts/video/01-clothing-original.md` | Original saved pivot pilot; includes superseded frame-cache note | Same |
| `prompts/video/02-scene-reconstructed.md` | Reconstructed rigid wall reveal | Same |
| `prompts/video/03-lighting-original.md` | Original saved coupled-light revision | Same |
| `prompts/video/04-cast-original.md` | Original saved touchdown cut revision | Same |
| `docs/workflow.md` | Seven-stage image → video → editing → integration workflow | Same |
| `docs/troubleshooting.md` | Production failure patterns and diagnostic checks | Same |
| `docs/quality-checklist.md` | Package and browser checks | Same |
| `docs/assets.md` | Exact runtime filename mapping | Same |
| `docs/provenance.md` | What is preserved, reconstructed and absent | Same |
| `experiments/` | Earlier images, nine source video attempts, superseded lighting prompt | Full local archive; text mirrored |
| `ASSET_MANIFEST.json` | Byte sizes and SHA-256 hashes of 32 media files | Text mirror and full archive |
| `LICENSE`, `ASSET_LICENSE.md`, `LICENSING.md`, `CREDITS.md` | Split text/media/branding terms and attribution | Text mirror and full archive |

The full local archive preserves all tracked assets, including the validation script. The text mirror is for reading and attribution; use the full archive to run its validator.

### Final runtime media mapping

All paths below are beneath the original `public/retake/` folder.

| Branch | Forward | Return | Reference endpoint |
|---|---|---|---|
| Clothing | `video-1.mp4` | `video-1-reverse.mp4` | `state-colorway.png` |
| Scene | `video-2.mp4` | `video-2-reverse.mp4` | `state-environment.png` |
| Lighting | `video-3.mp4` | `video-3-reverse.mp4` | `keyframe-light-shift-v2.png` |
| Cast | `video-4.mp4` | `video-4-reverse.mp4` | `keyframe-full-look-v3.png` |

Common base: `state-base.png`. Separate source branding asset: `public/ltx-studio-logo.svg`. These filenames describe packaged assets, not live generation calls.

## 3. How the reference works, step by step

1. Establish one controlled composition: centrally framed adult fashion figure, pale architectural walls, sky, fixed ground plane and camera.
2. Approve the base still before making any endpoint. Derive each destination by editing that base.
3. Specify one change for each branch: recolour clothing; open the walls; move time of day; replace the performer at a match cut.
4. Protect continuity: subject coordinates, camera, crop, architecture and stable details remain shared wherever the branch does not explicitly change them.
5. Supply start/end references to a compatible generation interface. Treat prompt timing as art direction, not a guarantee of model behaviour.
6. Review generated footage at normal speed, frame by frame and reversed. Reject structural errors.
7. Trim and retime an accepted clip. Create and independently inspect its reverse. Some delivered footage was also upscaled; this does not make original generation deterministic.
8. Export web versions with consistent framing and colour treatment. Keep masters separate.
9. Build one working state cycle before polishing the controller or adding branches.
10. Prepare the next video invisibly while keeping the previous valid frame visible. Switch only after a decoded opening frame is ready.
11. Hold the video at its valid terminal frame. Do not swap to a reference still whose crop or exposure might differ.
12. Test every branch, reverse, retry, resize and cache condition. Package integrity and visual quality are separate checks.

The reference’s state graph is a hub: base → branch → base. It does not supply transitions between every pair of destinations. Its original controller collapses to Reset after selection and expands during return. Hover moves a highlight; it does not trigger footage. [Workflow](https://github.com/amirmushichge/video-states-website/blob/main/docs/workflow.md), [build specification](https://github.com/amirmushichge/video-states-website/blob/main/PROMPT.md).

## 4. Visual findings from the supplied images

The base’s strong move is the relationship between enormous quiet walls and a highly specific, textured human subject. The Scene endpoint widens the opening into a city view. The shared figure and floor provide continuity while the environment changes. Bright costume, scale, material and spatial reveal do the work; a generic gradient would remove its point of view.

For Missa, a fashion figure would overrepresent one discipline, and changing someone’s clothes or identity would explain image-generation controls more than opportunity discovery. The useful transferable device is **a consistent stage that opens onto possibility**.

## 5. Keep, adapt, leave behind

| Reference decision | Missa decision | Reason |
|---|---|---|
| Choice changes an authored scene | Keep | Gives visitors a memorable, self-directed encounter |
| One common base with paired transitions | Keep | Limits production and continuity complexity |
| Fixed camera and matched frames | Keep | Makes the interaction feel physically coherent |
| Full-viewport fashion image | Adapt into bounded editorial media stage | Keeps Missa’s white canvas, clear copy and usable mobile layout |
| Four technical controls | Replace with six creative practices | Describes the audience’s work |
| Giant pill and blue glass | Replace with approved controls on a legible surface | Current Missa contract does not approve blanket capsule/glass restyling |
| Headline disappears during playback | Keep Missa’s headline and Explore link present | Understanding the product must survive interaction |
| Explicit Reset before another choice | Automatically route a scene change through base | Removes an unnecessary visitor step without inventing direct video pairs |
| Load eight clips up front | Request chosen media progressively | Public discovery must work on slower connections |
| One-screen demo, no footer | Full useful homepage below hero | Missa needs product explanation, opportunity entry and trust information |
| Manrope and demo branding | Newsreader, Instrument Sans, existing Missa wordmark | Preserve the brand system |
| Historical cached-frame note | Superseded; do not use | Final source specifies native prepared-video playback |

## 6. Production traps that matter for Missa

- A doorway can bend or become a curtain: use rigid sliding geometry and reject deformation.
- A scene may drift despite a locked-camera prompt: inspect floor lines and panel tracks, not just the appealing focal object.
- Independently generated endpoints will not reliably align: every endpoint must derive from the same master.
- Small lettering becomes video noise: generate no readable book titles, notation, equipment labels or interface text.
- Reverse is not automatically credible: avoid pouring liquid, smoke, walking, falling objects and temporal actions that look wrong backwards.
- Static posters can cause a seam flash: extract runtime endpoint posters from accepted exports; original generation references remain production aids.
- Media readiness is asynchronous: metadata is insufficient evidence that the correct new frame is visible.
- A beautiful desktop crop can fail on a phone: review actual crop and use a separate framing family when necessary.
- Fancy UI cannot repair bad footage: separate media rejection from player debugging.

## 7. External technical research

[MDN’s frame callback documentation](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback) describes callbacks when frames reach the compositor and their metadata. This supports the proposed decoded-frame handoff; it does not certify a universally tear-free player. We must still test target browsers, readiness fallback, seeking and stale callbacks.

[web.dev’s video performance guide](https://web.dev/learn/performance/video-performance) explains poster/preload strategies. Missa will deliver the initial still and essential content first, then request the chosen scene. Exact transfer limits below are our proposed budgets, not claims from this guide.

[W3C’s interaction-animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) motivates a still-state alternative for nonessential movement. This criterion is AAA; Missa’s baseline remains the repository’s AA requirement, with this additional motion accommodation. [Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) separately covers qualifying automatically starting motion. We propose no automatic looping and a visible motion setting.

[LTX quickstart](https://docs.ltx.io/quickstart) currently documents text/image-to-video workflows and an LTX-2.5 example. Its quickstart alone does not establish that our chosen interface can enforce both endpoints. Inspect the current model and endpoint schema before generation; do not copy historical duration/FPS settings as certified supported settings.

## 8. Mobbin review

Searched for a creative-platform homepage with an editorial heading, photographic scene and Explore action. Three Melius captures were returned and visually inspected. The first two show primarily navigation and empty stage area; the third shows a serif headline above an arrangement of creative images receding toward the centre, with product explanation beneath.

The useful observation is spatial hierarchy: the creative imagery has a distinct region while the headline remains readable. The incomplete captures also reinforce the need for a meaningful static first paint. They do not prove how Melius loads or animates in a browser. We will not reproduce its image tunnel or generation-input interface.

[Reviewed populated capture](https://mobbin.com/sites/sections/6d72e748-35b3-4c23-8f39-620f011613d4), [first capture](https://mobbin.com/sites/sections/96f63669-e217-4c65-86ad-665bd7ffd22e), [second capture](https://mobbin.com/sites/sections/60596ce0-f8a6-46b5-86f1-d3624f700684).

## 9. Repository evidence and limits

- `apps/web/app/page.tsx` currently renders `HomepageHeroPreview`.
- `apps/web/components/design-system/homepage-hero-preview.tsx` uses desktop/mobile knit photography, existing wordmark, public links and an Explore action. The new concept should initially live alongside it.
- `apps/web/lib/discoveryBeta.ts` sets `DISCOVERY_BETA = true` and states that account workflows remain in development.
- `apps/web/lib/opportunityQuery.ts` accepts both `discipline` and `disciplines`; the taxonomy distinguishes practice families from discipline/form/genre. A creative world label must not be guessed into a filter URL.
- `DESIGN.md` permits expressive marketing imagery but requires a white primary canvas, approved typography, meaningful finite motion and tokens.
- Component policy provides Button, RadioGroup, Switch, disclosure and feedback entries. There is no verified ready-made seam-safe cinematic controller in the inspected catalogue. New composition approval remains implementation work.

## 10. Rights and provenance

The upstream text/scripts are MIT; retain their license when copying/adapting substantial source text. Covered upstream media uses CC BY 4.0 with attribution requirements; the logo and third-party marks are excluded. This plan commissions original Missa sets and uses the upstream footage only as a local reference. Preserve the original notices in the archive. [Licensing](https://github.com/amirmushichge/video-states-website/blob/main/LICENSING.md).

No live source site, private prompts, model seeds, editing projects or missing generation requests were recovered. The included source pack is the complete public material available at the pinned commit, not every historical production detail.
