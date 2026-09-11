# Missa opportunity carousel

## User direction and reference observation

The user requested replacing the dream section with Missa's version of https://velocitycarousel.framer.website/ and adding the supplied scattered-workflows screenshot's data direction, adapted to opportunities. The screenshot's statistics are not Missa facts and were not reused.

The reference was opened and operated in Chrome: inactive card click moved it to the centre and enlarged it; the active card alone revealed heading, description and CTA. ArrowRight changed the selected slide. Six dots indicated selection. Desktop used approximately 360px active square and smaller overlapping neighbours. At 390 × 844 the active card occupied about 290px with neighbours clipped at the sides. No automatic advance was observed during inspection; no autoplay is implemented. Temporary browser viewport override was reset.

## Implementation

Existing `components/ui/carousel.tsx` (Embla), CarouselContent and CarouselItem, installed Button and Next Image/Link. Studio carousel-08 source was inspected for its selection/dots pattern. No new primitive or registry installation needed. Scoped tokens define card radius, surface edge, shadow, scrim and finite transition. Native Embla centring/drag handles movement; CSS scales persistent cards. Keyboard arrows, Previous/Next buttons and six labelled selection buttons provide alternatives. Reduced motion removes CSS transitions and uses immediate programmed selection. Inactive links are hidden and inert. No automatic motion.

Six categories: Residencies, Grants, Publications (magazine + pitch), Prizes (award + contest), Exhibitions and Festivals. Each CTA uses exactly those supported type filters and openNow=true on `/opportunities`. The categories replace the earlier discipline-row presentation. Images are existing Missa assets in `/media/home`, visually inspected before reuse; no reference-site images were copied. They illustrate categories, not individual organisers or awards.

Supporting copy: “Missa brings residencies, grants, publications and prizes into one place—so interdisciplinary artists can spend less time searching and more time making.”

## Data

Three counts load from the existing Postgres-backed public opportunity endpoint, using the same browse visibility rules. Observed: 4,609 open opportunities, 1,128 residencies, 288 grants. Counts are requested live rather than hardcoded. Category checks also found 1,526 publications/pitches, 842 awards/contests, 117 exhibitions and 85 festivals. These are current catalogue counts, not independently audited claims about the wider web. Failure displays an unavailable state and retry, never invented zeroes; category navigation works independently.

## Checks

Three browser tests pass: all six exact search destinations and active-link visibility; keyboard selection; pointer drag at 390px, reduced motion, viewport overflow and 200% CSS zoom; live counts; failed count requests and retry. Chrome visual review at desktop and mobile. TypeScript, scoped ESLint and repository design-system validation pass. Local preview only; no deployment performed.

## Revision after user rejection

The introduction now precedes the carousel in DOM and visual order; the hero's Explore anchor lands on that introduction. The centred serif heading and large staggered metric cards were removed. Revised treatment: left-aligned interface heading, separate right-hand explanation, compact linked live-data row. Carousel cards now use a 400 × 480 portrait crop on desktop, 390px height on mobile, restrained corners, visible labels for inactive categories and left-aligned active copy with a ruled text CTA. Existing photos remain category illustrations; no new photography was generated or claimed. Category search destinations and count truth boundaries remain intact. Added an explicit ordering regression check.


## Image and content-card refinement

Supersedes the compact metric row and photo-overlay cards: see [12-category-image-direction.md](12-category-image-direction.md). Three staggered live-data cards restored; six original generated campaign images integrated through the installed Studio card-05 composition. CardFooter default border/background removed; inactive descriptions hidden to prevent overlapped text fragments.

Validation: four focused browser tests pass (category routes, keyboard, mobile swipe, reduced motion, 200% zoom, count failure/retry and section order). Desktop and 390px screenshots visually reviewed. TypeScript, scoped ESLint and design-system policy pass. Local preview only.
