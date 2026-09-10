# Homepage colour, hero and painted footer direction

7 September 2026. Local homepage and `/design-system/homepage-hero` only.

## User direction and scope

The user rejected the black caption panel, cream surround and sage portfolio preview. They approved forest, bright citron and white, then asked for colour beyond the hero and further hero styling. Their new reference shows a watercolour landscape fading into a white footer. That reference supplies composition and material, not copy, product facts or permission to reuse its artwork.

This is a local extension of the accepted photographic homepage. The green portrait, real catalogue cards and interactive feature composition remain. No new identity selection or replacement comp round is needed. The stale Impeccable comp state for a different Opportunities study does not describe this surface.

## Built colour rhythm

- Green portrait hero, larger Newsreader heading and citron arrow action. An outlined account action separates navigation from conversion. The subtle bottom shade supports text over the photograph.
- Citron across the full discovery section, including category carousel; white and forest count cards keep figures legible.
- White behind actual opportunity listings. The exact shared `OpportunityBrowseProjectCard` remains unchanged.
- Sky blue across the full feature section; forest selected tabs and photo captions. Citron surrounds the portfolio, which opens with a new White sample theme. Sage, Paper, Mineral and Night remain selectable.
- White directory with citron behind the featured organization's name; the photograph and source credit remain intact.
- A light citron FAQ ground followed by a full-width forest invitation. Footer links remain on white to meet the eventual painting cleanly.

The dominant relationship is forest and citron, with sky blue as a distinct feature ground. Sky is an implementation choice within the request for brighter, more varied full-page colour; the user did not separately select that exact blue. Photographs supply coral and cobalt. Colour occupies deliberate regions rather than being spread across every operational control.

## Component and source evidence

Intents: composition, navigation, selection and data display. Policy entries: `composition.homepage-workspace`, `composition.homepage-continuation` and `composition.homepage-next-opening`. The retained photographic hero is `HomepageHeroPreview`.

Installed components: Button, Tabs/Studio tabs-09, Table/table-01, Switch/switch-01, Accordion, Avatar and Skeleton. Existing semantic components: CreatorPortfolioStudio, GoalSubmissionProgress, OpportunityBrowseProjectCard and MissaWordmark. No registry installation or vendor theme was necessary.

`apps/web/components/design-system/homepage-marketing-palette.css` contains the scoped citron and sky primitives, their semantic roles and hero component mappings. Existing carousel and continuation token files map those roles to feature surfaces. Feature CSS uses tokens. The product's global palette and actual opportunity card implementation are unchanged. White is a sample preview option; this change does not add a persisted account theme or change public portfolios.

The route is `apps/web/app/page.tsx`. The hero implementation and styles are `apps/web/components/design-system/homepage-hero-preview.{tsx,module.css}`. Below it, `apps/web/components/missa/homepage-{next-opening,continuation,workspace}.{tsx,module.css}` own the semantic compositions. `apps/web/component-policy.json` records the workspace's five local themes and marketing scope; `apps/web/component-catalogue.json` records its White sample theme and scoped colour adaptation. The existing homepage exception in `DESIGN.md` accurately describes this extension; no global system rewrite or sidecar regeneration is needed.

Public counts, listings and organization profiles retain backend requests and validation. Portfolio identity/art, goals and notification interactions remain clearly labelled samples. No private data write, notification delivery or publication occurs.

## Midjourney asset brief

Create one original painting for the footer, not an image of a website. Keep the portrait hero. The painting should feel like a place artists could spend time, rather than a resort advertisement. Human presence is small and incidental. Lush green is the anchor; fresh citron, water blue and coral create life.

Copy this complete prompt:

```text
A wide panoramic watercolour and gouache painting on clean white cotton paper, an imagined coastal village where artists live and work. Lush forest-green hills descend toward a clear turquoise bay. Along the shore, a few modest coral and chalk-white studios have open wooden doors, linen curtains and sunlit terraces. Two small wooden boats rest in the shallow water. Tiny distant figures sketch, carry a canvas and talk beside a studio; the landscape remains the subject. Deep emerald foliage, bright yellow-green leaves catching sunlight, clear blue water, small touches of cobalt and warm coral. Beautifully observed architecture and plants, translucent washes, visible pigment granulation, a few confident opaque brushstrokes, fine pencil details only in the boats and buildings. Fresh afternoon light, an inviting sense of everyday creative life. Asymmetrical composition: taller hills on the left, the village and boats toward the right, open water through the centre. Landscape occupies the lower two thirds. Upper third is unpainted pure white paper. Soft irregular brush edges dissolve naturally into pure white along the top and sides; no rectangular picture boundary. Rich colour, delicate detail, generous breathing room. Original contemporary landscape illustration --ar 3:1 --s 250 --no text letters typography logos watermark frame border
```

Generate a set, choose the strongest composition, and send the individual full-resolution image. A screenshot of the Midjourney grid is not the production asset. Do not add another website screenshot as an image prompt: it can introduce layout, text and logos. If using a visual reference, use only the painting crop as a style reference.

Placement: below the footer navigation, full bleed, with copyright and legal links remaining on a clean white ground above the detailed painting. The selected user-supplied Midjourney panorama is shipped as `apps/web/public/media/home/generated/missa-coastal-village.webp`, with prompt and origin in its adjacent `.json` sidecar. Its generated top edge is intentionally retained; the supplied image does not have a true paper fade. On mobile it uses a deliberate landscape crop that retains the studios and a boat. No copied reference painting or artist attribution has been added.

Parameters were checked against official documentation:
- [Aspect ratio](https://docs.midjourney.com/hc/en-us/articles/31894244298125-Aspect-Ratio): `--ar 3:1` sets composition shape, not pixel size.
- [Stylize](https://docs.midjourney.com/hc/en-us/articles/32196176868109-Stylize): `--s 250` gives moderate artistic freedom.
- [Parameter syntax](https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List): parameters belong at the end.

## Validation

TypeScript, scoped ESLint, design-system validation and git diff whitespace checks pass. Five continuation browser tests passed, covering live backend records, canonical card reuse, 390px layout, long titles, 200% zoom, keyboard FAQ, error/empty/retry states, local feature controls and accessibility. The first carousel test found a startup race: enabled category controls could accept input before Embla was ready. All category selection controls now disable until the API exists; all six carousel tests passed on rerun, including horizontal wheel scrolling, mobile swipe, reduced motion, live counts and category-specific destinations.

Fresh settled captures at 1440, 1082 and 390px show no horizontal overflow. The mobile portrait is anchored left so its eye stays in view; a stronger bottom shade and full-height copy layout maintain readable text. Full-page capture waits for actual opportunity cards and directory records. The white portfolio remains a labelled sample.

Detector returned no findings for the changed TSX targets. Its COMP_ROUND_OPEN warning refers to an unrelated Sep3 `opportunity-editorial-hero.tsx` study, verified against state.json; no comp state was changed.

Final evidence lives in `apps/web/.impeccable/review/colour-{hero,discovery,workspace,questions,closing,footer,full}-{1440,1082,390}.png` (21 captures). Development chrome was hidden only for screenshots, including the recaptured mobile hero and footer. A fresh 390px hero Axe scan returned no violations. The local LAN preview at `http://10.0.0.119:3100/` returned HTTP 200 at handoff; this is local review evidence, not deployment.

## Final review and remaining boundary

The independent final reviewer returned **ship**, with **no material fixes**. Its file-and-capture review found the scoped colour rhythm, photographic material, hero hierarchy, readable feature views, explicit sample labels and shared-card boundary consistent with the accepted direction. Browser interaction and accessibility results were supplied by the implementation run, not independently rerun by that reviewer. The stale Opportunities comp warning does not reopen this accepted homepage extension.

The footer painting is now integrated as the selected original asset. No new global identity or page-wide colour rule has been canonized.
