# Organization and publication profiles

Shared implementation: `apps/web/components/institution-profile-view.tsx`, `institution-media-gallery.tsx`, and `institution-profile.module.css`.

## Pattern

Identity leads: real logo or category fallback, organization type, official domain, name and website action. Publication variants use editorial typography; other organizations use interface typography. Existing semantic palette tokens provide restrained category color.

About, opportunities, guidance and organization facts precede the gallery. Section navigation follows this information-first order. Real profile media appears in three initial cards, followed by a reveal control. Images preserve their full composition. A Dialog opens each image with its complete accessible caption. Missing galleries are omitted; failed images show an unavailable state. No synthetic organization media or verification claims are introduced.

Overview, opportunities and guidance form the reading column. Populated facts, practices and valid contact details form the secondary column. Opportunity status remains source-derived. Empty opportunities direct visitors to the official website. The template serves journal, press, residency, grant and organization profile routes.

## Components and states

Policy intents: composition.organization-profile and disclosure.organization-media. Installed Avatar, Button, Card, Empty and Dialog provide the underlying primitives. No registry installation was required. Buttons retain primitive hover, focus-visible and disabled styles; gallery cards expose focus-visible styling. Reveal state is local and aria-expanded is updated. Dialog supports Escape and focus management. Image loading uses native lazy loading; image errors are explicit. No asynchronous mutation or success state is introduced.

## Validation

Coffee House Press checked at desktop and 390px. Real media rendered, reveal opened additional images, and the image dialog opened and closed with Escape. Scoped ESLint, TypeScript and design-system validator passed. Exhaustive keyboard traversal, 200% zoom, reduced-motion browser emulation and every organization variant remain unverified. Reduced-motion styling is included. Data was read only; this is a local implementation, not a production deployment.

## Kind-specific information architecture

`institution-profile-layout.ts` is the shared ordering and labeling contract. The view renders sections and navigation from that same order; missing sections are omitted, and media always follows practical information.

| Kind | Reading order after identity | Specific facts/content |
| --- | --- | --- |
| Magazine | About, editorial focus, submission guidance, calls, media | Genres, payment, simultaneous submissions, reading period, issue frequency and prices |
| Small press | About, publishing focus, calls, manuscript guidance, media | Book types, selected authors, titles per year, contest-only publishing |
| Residency | About, disciplines, residency opportunities, application guidance, media | Application window and fee when supplied |
| Foundation | About, funding opportunities, application guidance, practices, media | Application window and fee when supplied; no publication facts |
| Gallery | About, artistic focus, artist opportunities, working with the gallery, media | Only supported organization facts; no invented exhibition schedule |
| Arts organization | About, disciplines, programs/opportunities, participation guidance, media | Only supported organization facts |
| General organization | About, opportunities, practices, application guidance, media | Fallback for unclassified organizations |

Gallery and organization are explicit repository kinds and now have directory metadata. Eligibility, studio amenities, visitor hours and exhibition schedules are not structured profile fields, so this change does not fabricate them. All media uses existing records. This iteration validates the magazine and press renders; other variants share the typed contract but still need representative visual QA.

Reference review: [Coffee House Press](https://coffeehousepress.org/), [NYFA applications](https://apply.nyfa.org/submit), and [18th Street visiting artists](https://18thstreet.org/visiting-artist/) informed the distinction between publishing, funding and residency priorities. These references do not override repository profile data.

## Journal issue shelf

Journal profiles use a Past issues shelf after practical information. Only issue_cover assets qualify; banners are not presented as issues. Three portrait cover cards appear initially with a reveal control and cover-preview dialog. Existing labels preserve source season/year. An empty shelf links to the official publication website without claiming it is an archive URL. Structured issue destinations and chronology await backend data; no reading/purchase links or dates are invented.

Presses use the same portrait shelf as journals, labelled Books, with three initial covers, View all books, cover previews and a press-specific empty state. Only existing cover assets qualify. Book destinations, authors and publication dates await structured backend records; no inferred purchase links are added.

Cover captions separate visible title/author from descriptive image alt text. Legacy labels are parsed only for explicit quoted titles and bylines; descriptive labels without reliable title structure use Cover preview. Plain issue titles remain intact. The full original description stays on the image for accessibility. Hero vertical gaps were reduced.

## Spatial and arts media

Residencies, galleries, arts organizations and foundations use a large lead photo and supporting photo grid, stacking at 390px, with full-image Dialog previews. About and practical information remain first. Missing media shows an official-website fallback. The 101 Outdoor Arts selection is a source-dated editorial fallback in profile-editorial-media.json, taken from its official residency page; database media takes precedence. No database writes or fabricated place imagery. Residency desktop, 390px, loaded photos, dialog Escape and focus return verified. Other organizations receive the shared treatment but still depend on their media records.

Residency order updated by review: About, Spaces & residency media, Creative disciplines, Residency opportunities, Application guidance. Media sits immediately after About for this variant. Narrative text stays left-aligned with a 68ch maximum measure; full justification is not used.

Social links: InstitutionSocialLinks renders stored HTTP(S) social destinations below the official domain in the identity header. Uses installed Button ghost/icon with 44px targets, platform icons, accessible names and new-tab labels. Invalid/missing links are omitted, duplicate URLs removed; unknown platforms use a generic link icon. No accounts are guessed.
