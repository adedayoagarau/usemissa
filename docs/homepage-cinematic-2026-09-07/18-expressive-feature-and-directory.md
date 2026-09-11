# Photographic features and organization discovery

## Brief and boundary

The user rejected the monochromatic Goals panel and six empty organization cards (screenshots dated September 7, 6:23 PM). They asked for stronger creative work informed by Mobbin. This pass changes only the homepage feature explorer and organization discovery section. The approved green portrait hero, category carousel, real opportunity cards, FAQ and footer remain in their existing direction.

This is an established-surface extension under Impeccable `reference/new-work.md` sections 1 and 3: no identity tournament, new FORM seed, or global DESIGN.md rewrite applies. The existing palette already includes white, ink, Forest, ochre and mineral blue. The user expressly requested more colour. The site canvas remains white; photographs and component surfaces supply contrast. There is no approved comp. The stale `.impeccable/build/state.json` describes a separate Opportunities mockup and is not this task's authority.

## Direction contract

**Thesis:** Show the creative practice alongside the tools that support it. An artist's work should have as much presence as the interface.

**World:** Missa's installed Newsreader and Instrument Sans, a white page, high-contrast ink captions, original photography, ochre and mineral-blue product canvases. No new primitive font or colour. Intentional photographic colour replaces the previous repeated pale-green surfaces.

**Story:** Move from actual opportunities to four tools a visitor can try, then to organizations they can explore. The feature selector changes one complete composition. The directory changes pace with a large photographed organization and a compact roster of five others.

**First viewport:** Large “Your work. Your next steps.” heading, four clear feature controls, and a split image/product composition. Original artwork leads the left half; the actual embedded portfolio leads the right. Other selected features have distinct photography and product content.

**Form and interaction:** Installed Tabs retain keyboard selection; portfolio theme/format controls remain usable. Real catalogue dates remain linked to their IDs. Notification switches only affect the demo. Goal targets and “Add a sample submission” demonstrate progress, completion and reset in memory. They never create real submissions. No autoplay or scroll capture. Reduced motion retains all content and controls.

## Reference observations

References were retrieved and visually inspected through the selected Mobbin connector, not inferred from result titles:

- [Sunday](https://mobbin.com/sites/sections/e8714fa3-9716-45f1-80a8-ec75f10465c1): large product photographs carry the feature story, with much quieter supporting copy. Adopted the image-to-interface scale contrast, not its product facts.
- [Kinfolk portraits](https://mobbin.com/sites/sections/fc287d02-6cb7-4ac5-afb3-0a4e395094e5): close photography and large editorial type give each subject a presence. Adopted the subject-led composition, not the portrait assets.
- [Fuser](https://mobbin.com/sites/sections/7fd11086-d013-4245-94d0-a985b2403a55): actual creative artifacts establish variety and colour before the accompanying descriptions. Adopted that visual priority.

The acceptance bar is an unmistakable improvement over the supplied screenshots: meaningful image area, differentiated feature views, readable interactive product content, and an organization section that communicates identity rather than repeating empty rectangles. Mechanical test success alone does not establish this bar.

## Content and asset truth

Opportunity cards remain `OpportunityBrowseProjectCard`, and deadlines remain validated public API records. Directory names, kinds, slugs, media and location are parsed from `/api/journals`.

`feature-studio.webp` is an original AI-generated campaign photograph, a fictional artist, not a real creator profile. Its exact prompt and original file path are in its JSON sidecar. Existing original publications/community campaign assets provide the other feature images. The actual embedded CreatorPortfolioStudio continues to label its fictional portfolio sample.

Headlands' API banner was checked and found to be a generic Unsplash image with a campus label. It is not used. The featured photograph is Building 945 from [Headlands' official About page](https://www.headlands.org/about/), credited there to Andria Lo and credited beside the image on Missa. Its URL is `https://www.headlands.org/wp-content/uploads/2022/02/HCA_Campus_AndriaLo_1-1024x682.jpg`. Organization imagery is not generated. Logos use the actual backend media fields through installed Avatar with a typographic fallback when absent or unavailable. No claim of affiliation or partnership is made.

## Component selection

- Selection/disclosure: installed Tabs, existing `composition.homepage-workspace`.
- Product data: Table, actual CreatorPortfolioStudio and GoalSubmissionProgress.
- Actions: installed Button/Link; Switch for preview preferences.
- Organization identity/navigation: installed Avatar, AvatarImage, AvatarFallback and Link; one featured photograph with a caption and source credit.
- Loading/recovery: existing Skeleton and retry states. No new opportunity card variant.

`homepage-continuation-tokens.css` maps these local treatments to existing semantic colour tokens. Catalogue and policy entries record the adaptation. The shared portfolio editor and shared goal component themselves were not changed in this pass.

Built implementation: `apps/web/components/missa/homepage-workspace.tsx` and its CSS module own `#homepage-workspace`; `apps/web/components/missa/homepage-continuation.tsx` and its CSS module own `#places-to-know`. The token source is `apps/web/components/design-system/homepage-continuation-tokens.css`. It maps ink captions and ochre, mineral-blue and lichen canvases to existing semantic colours. Large editorial headings lead the photographs; quieter sans-serif controls and data remain legible within the product previews. Desktop pairs story and product, while mobile stacks them. These are local composition choices, not new global design-system rules.

## Validation and review

Initial focused run: all five homepage-continuation tests passed, including real backend card and deadline identity, anonymous Save, API error/empty/retry, 390px mobile, long copy, 200% zoom, reduced motion, keyboard and Axe. TypeScript, scoped ESLint and design-system checks passed. A second focused interaction test additionally covers sample submission completion/reset/disabled state and the real Headlands image loading; its final result and fresh review disposition are recorded at handoff.

The extended interaction test passed after correcting the notification date's contrast (muted text on a tint was 4.47:1; it now uses the dark Forest token). It confirms sample submission completion, disabled add action, reset, actual Headlands image loading, keyboard feature changes, live catalogue data and no account writes. Final captures explicitly wait for the nested notification transition to reach full opacity. The generated-asset provenance scan reports eight rasters and zero missing prompts; existing image prompts were recovered verbatim from documents 12 and 14. LAN preview returned HTTP 200.

Required captures: features portfolio/applications/notifications/goals at 1440 and 390; portfolio at 1266 and 1082; Goals at 1082; directory at 1440, 390 and 1082. The two user rejection screenshots are also review inputs. No deployment, account write, profile publication or notification send occurs.

Final handoff disposition: **ship for local review**, with no material fixes requested. The fresh finish reviewer opened all 14 current captures and both rejection screenshots, and sampled the relevant source. It confirmed the photographic scale, distinct product canvases, readable mobile composition and place-led organization section against the brief. Browser behavior, Axe and test results are builder-reported evidence, not findings inferred from those static captures. Final TypeScript, scoped ESLint, design-system and whitespace checks passed. This documents a locally implemented and reviewed result; it does not establish a production release or third-party endorsement. Root `DESIGN.md`, its sidecar and unrelated Impeccable build state remain outside this handoff.
