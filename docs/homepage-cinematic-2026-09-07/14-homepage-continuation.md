# Homepage continuation — 7 September 2026

## Direction

Extend the user-approved portrait hero, staggered live metrics and image carousel into a complete public homepage. Carry their forest green, soft green surfaces, rounded forms and confident typography through the rest of the page. Alternate product detail with human imagery, then answer practical questions and offer a clear next action.

The sequence after the category carousel:

1. **Spend your time on the work.** A three-step interactive discovery walkthrough, using actual public catalogue records. The same opportunity follows the visitor from discovery to details to a next action.
2. **A world of places worth knowing.** Six real directory profiles, displayed with their organization type and semantic profile link. These are directory examples, not partners or endorsements.
3. **For the work. And the person behind it.** An original studio photograph and a short statement welcoming interdisciplinary practice.
4. **Before you begin.** Five expandable answers about browsing, disciplines, fees, applying and eligibility.
5. **Your work belongs out in the world.** A forest green closing invitation to browse, with account creation as a secondary action.
6. A complete footer with public discovery, directory, rankings, about, methodology, contact and privacy links.

## Repository and component evidence

Read `DESIGN.md`, component policy/catalogue, the existing public shell, opportunity DTO, semantic profile routing and discovery beta documentation. External component research informed implementation; repository contracts determine actual functionality and data claims.

| Intent | Policy / component | Reviewed source and implementation |
| --- | --- | --- |
| Peer view selection | `view.peer-switch`, Tabs | Installed `shadcn-studio/tabs/tabs-01.tsx`; `components/ui/tabs.tsx` |
| Data display and composition | Card, Skeleton | Installed `shadcn-studio/card/card-05.tsx` and `card-12.tsx`; `components/ui/card.tsx` |
| Grouped disclosure | `disclosure.group`, Accordion | Installed `shadcn-studio/accordion/accordion-01.tsx`; `components/ui/accordion.tsx` |
| Primary/supporting action | Button | `components/ui/button.tsx`, rendered as internal links |
| Navigation | Link, MissaWordmark | Existing public shell destinations and canonical Missa wordmark |
| Page composition | `composition.homepage-continuation` | `components/missa/homepage-continuation.tsx` and `.module.css` |

All component paths above are relative to `apps/web`. The new composition is registered in `apps/web/component-policy.json` and `apps/web/component-catalogue.json`. Its radii, surface treatments, shadow and transition use the scoped approved token file `components/design-system/homepage-continuation-tokens.css`. Existing primitives supply focus, disclosure, tab selection and button semantics.

Keyboard validation exposed a shared Tabs wrapper defect: its orientation prop was used for styling but not forwarded to Base UI. The wrapper now passes that prop, enabling vertical arrow-key selection without changing the default horizontal behavior.

Primary external references consulted:

- [shadcn component documentation](https://ui.shadcn.com/docs/components)
- [shadcn Accordion documentation](https://v3.shadcn.com/docs/components/accordion)
- [shadcn Studio Accordion documentation](https://shadcnstudio.com/docs/components/accordion)

No vendor theme or new registry package was installed for this continuation.

## Data and behavior

The live preview requests `/api/opportunities?openNow=true&limit=12` when the continuation approaches the viewport. It validates the response against the shared public contract, prefers actionable named opportunity types, and varies the types among three displayed examples. It does not rewrite imported titles, deadlines, fees or source claims. The detail and next-action tabs retain the same first record and point to its actual Missa detail route.

The directory queries the existing public API for six names and only renders exact matched profiles: MacDowell, Headlands Center for the Arts, The Paris Review, Yaddo, BOMB Magazine and Poetry Foundation. Semantic destinations follow the repository's profile routing. Missing profiles are omitted rather than invented.

Directory requests follow the catalogue request so they do not all compete with the first-screen counts. Each request has its own 15-second timeout, cancelled on unmount; a slow catalogue request does not consume the directory's entire timeout window. The catalogue has loading skeletons, an empty navigation state and a recoverable error. Directory failures retain an explicit browse path. No fabricated zeroes, endorsements, eligibility promises, automatic submissions or testimonials are added.

## Original image

File: `apps/web/public/media/home/generated/community.webp`.

Generated with the built-in image generator and optimized with Sharp. The people are fictional. The asset illustrates creative practice and does not imply that pictured people are Missa members or representatives of directory organizations. Inspected the source image and desktop/mobile crops.

Prompt:

> Create one original photographic campaign image for Missa, a discovery platform for interdisciplinary artists. Landscape 4:3 composition. A candid, visually arresting scene in a sunlit shared artist studio: three fictional adult artists of different backgrounds around a very large work table covered with cobalt blue paper, a single sculptural terracotta object and a few printed sheets with abstract shapes but no readable words. Central adult Black woman with short natural hair wearing a vivid forest-green oversized work shirt reaches across the table to hold up a large translucent cobalt sheet; an adult South Asian woman in a rust-red shirt studies the light through it; an adult white man with dark curly hair is slightly further back sketching. Natural unposed concentration, a hint of laughter, believable anatomy and hands, tactile working materials, strong afternoon sunlight from tall windows with a green garden outside. Composition is intimate and dynamic, photographed at table height, faces visible in upper middle; no one looking into camera. The green and cobalt make a bold but sophisticated palette. Photorealistic contemporary independent arts campaign, natural skin texture, crisp analog detail, slight film grain, rich shadows. No staged corporate stock-photo feeling, no laptops, no text or lettering, no logos, no watermark, no collage or graphic overlay. This is one believable photograph, not a website mockup.

## Validation

- Live local catalogue and six directory matches inspected; source-backed fee/deadline display and semantic links.
- Default, selected, hover, focus-visible, loading, empty, error and retry states. Disabled and submission-success states are not applicable to this navigation/disclosure composition.
- Desktop browser review; 390px mobile, long title content, 200% zoom, reduced motion, keyboard tab selection and accordion operation.
- Automated coverage: `apps/web/e2e/homepage-continuation.spec.ts` plus the existing `homepage-next-opening.spec.ts` regression suite.
- Scoped Axe accessibility scan, TypeScript, ESLint and `npm run check:design-system`.

This is a local implementation on `/` and `/design-system/homepage-hero`. It has not been deployed or published.
