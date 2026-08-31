# Chillsubs UI capture and Missa interface specification

Date: 2026-08-30

Source inspected: `https://www.chillsubs.com/` and public linked surfaces

Capture viewports: 1440 × 1000 and 390 × 844 CSS pixels
Purpose: reference Chillsubs' information architecture and interaction patterns while defining an original, evidence-led Missa implementation.

## Validation boundary

This document records visibly rendered public pages and computed browser geometry. It is not a source-code audit of Chillsubs and it does not establish its internal design tokens, framework, analytics, private account states, paid feature behavior, or accessibility conformance.

Verified public surfaces:

| Surface | URL | Captured state |
| --- | --- | --- |
| Submission calls | `/submission-calls` | Desktop, mobile, card-detail overlay |
| Magazines | `/browse/magazines` | Desktop, mobile |
| Presses | `/browse/presses` | Desktop |
| Collections | `/lists/community` | Desktop |
| Writers | `/browse/writers` | Desktop |
| MFA programs | `/mfa-partners` | Desktop |
| Magazine detail | `/magazine/bbc-travel` | Desktop, mobile |

Not verified: authenticated tracker, saved content, profile editing, submission history, writer-assistance tools, editor portal, payments, account creation, empty/error states, and private or paywalled interactions.

## Capture index

The capture set is stored outside the application source tree at:

`/Users/adedayoagarau/.codex/visualizations/2026/08/31/01a0560b-30a0-7f51-b63b-c5d75dbd8b51/chillsubs-ui-capture`

1. `01-magazines-desktop.png`
2. `02-submission-calls-desktop.png`
3. `03-presses-desktop.png`
4. `04-collections-desktop.png`
5. `05-writers-desktop.png`
6. `06-mfas-desktop.png`
7. `07-magazine-detail-desktop.png`
8. `08-submission-calls-mobile.png`
9. `09-magazines-mobile.png`
10. `10-magazine-detail-mobile.png`
11. `11-call-detail-mobile.png`
12. `12-call-detail-desktop.png`

## System-level findings

### 1. Stable application shell

At 1440 pixels, Chillsubs reserves a measured 252-pixel left rail and gives the remaining 1188 pixels to the main surface. The rail is full viewport height, separated by a 1-pixel neutral divider, and keeps discovery destinations above personal tools. The top utility bar lives within the content region.

At 390 pixels, the rail is removed and replaced by a 60-pixel top bar with menu, centered brand, and account controls. There is no horizontal page overflow in the inspected mobile states.

Missa decision:

- Keep Missa's global navigation semantic and compact.
- Do not copy Chillsubs' full writer-tool inventory or promotional rail card.
- Use a 240–256-pixel desktop navigation rail only on authenticated product surfaces.
- Keep public `/opportunities` under the shared public header unless a broader authenticated shell is deliberately introduced.

### 2. Directory hierarchy

The recurring order is:

1. Breadcrumb or shell context.
2. H1 and a short utility description.
3. Optional category navigation.
4. Search.
5. quick filters and specialist filter entry.
6. result count plus sort/view controls.
7. tiles or rows.

The controls form one browse instrument. They are not split into a permanently visible form sidebar and a separate results application.

Missa decision: remove the persistent filter sidebar from `/opportunities`. Put common criteria in the browse toolbar and specialist criteria in the existing filter sheet.

### 3. White-canvas rhythm

The interface relies on white canvas, broad horizontal separators, and soft neutral regions. Borders and shadows describe interactive objects rather than boxing every section.

Observed colors include:

- primary canvas: `rgb(255, 255, 255)`;
- ink: visually near `#171717`;
- muted control fill: approximately `#f2f2f2`;
- neutral borders: approximately 5–10% black;
- directory-status green family: dark green around `rgb(22, 80, 46)`, pale green around `rgb(229, 244, 239)`, and bright accent around `rgb(110, 213, 141)`.

Missa decision: preserve Missa's warm white, aubergine, mineral blue, and evidence-status tokens. Adopt the restrained allocation of color, not Chillsubs' green palette.

## Measured typography

| Role | Desktop observation | Mobile observation | Missa specification |
| --- | --- | --- | --- |
| Directory H1 | Tekst-like serif, 40px, 50px line height | 28px, 33.6px line height | Missa heading font, 40–44px desktop; 28–32px mobile |
| Tile title | Serif, 24px / 32px on submission calls | Approximately 20px, compact wrap | 22–26px desktop; 19–22px mobile |
| Body | Inter-like sans, 16px / 24px | Approximately 14.25px / 21.4px | 15–16px / 22–24px |
| Metadata | 12–14px, low contrast | 13–14px | Never below 12px; use 14px for consequential facts |
| Section/date label | 14px / 21px | 14px | 13–14px, medium weight |

Chillsubs uses serif typography to create editorial identity at headings and tile titles, while sans serif handles navigation, controls, and factual metadata. Missa can retain this division using its own installed heading and body families.

## Layout specifications

### Desktop shell

- viewport reference: 1440 × 1000;
- left rail: 252px;
- content width: 1188px;
- directory content inset: approximately 40px from the content edge;
- major vertical section boundaries: 1px neutral dividers;
- browse title block: approximately 160–220px tall depending on description and category tabs;
- maximum readable introduction width: approximately 540–700px;
- card-list background: subtly tinted off-white rather than a separate heavy panel.

### Submission-call tile

Measured desktop tile:

- width: 1108px;
- minimum/observed height: 204–212px;
- radius: 16px;
- internal padding: 16px;
- horizontal gap: 16px;
- thumbnail rail: approximately 180px square;
- content title: 24px / 32px;
- save action: top-right;
- category and deadline: first metadata row;
- title and organization: dominant middle block;
- genre, size, pay, and fee: bottom decision row;
- external route/source icons: bottom-right.

Measured mobile tile:

- outer inset: 14px;
- width: 362px at a 390px viewport;
- observed height: 310px;
- radius: 16px;
- padding: 25px;
- internal gap: 12px;
- image becomes a small identity mark rather than a dominant rail;
- title precedes category/deadline facts;
- pay, fee, genre, and size become a two-column fact grid;
- save remains isolated in the top-right corner.

Missa tile contract:

- one result per row on desktop and mobile;
- optional 160–184px desktop identity rail, never required;
- mobile identity image 48–64px;
- top row: type and deadline state;
- primary: Opportunity title and Organization;
- decision row: deadline, fee, location/eligibility reach, and one compact evidence state;
- footer: `View details` plus `Track`; the official submission handoff belongs in quick detail and the canonical detail page;
- no social proof, vibes, public ratings, or duplicate save metaphors.

### Magazine and press tiles

These directories use two desktop columns. The cards emphasize organization identity rather than individual calls:

- cover/logo at left;
- small circular genre tokens above the name;
- deadline/status badge at top-right;
- title and one truncated description;
- response/payment/reach/bookmark metadata along the bottom;
- radius approximately 12–16px with an extremely soft shadow or 5% border.

On mobile, the same cards become one column while preserving a recognisable cover, title, description, deadline, and bottom metrics.

Missa should use this card family only for `/journals` or Organization browsing. Opportunity cards should keep the submission-call anatomy.

### Collection tiles

Collections use a three-column editorial grid on desktop:

- first tile may span two columns;
- tile copy sits top-left;
- overlapping covers form the visual anchor;
- filters are pill controls above the grid;
- tile height and density vary deliberately to create editorial rhythm.

Missa application: this is useful for future curated Guides or saved Opportunity collections, not the primary Opportunity feed.

### Writer tiles

Writers use a three-column profile grid:

- compact square avatar;
- name, pronouns/role line, and location;
- three small portfolio/activity counts;
- low-emphasis `Profile` link at bottom-right;
- generous blank space and consistent tile height.

This is not applicable to the current public Opportunity repair, but it demonstrates a reusable profile-tile family.

### MFA program records

MFA programs use a narrower centered content column and single-column records:

- centered H1 and explanatory paragraph;
- full-width search and three compact filter buttons;
- result count and sort line;
- program card with name, chips, right-aligned seal, structured details, and a trailing learn-more affordance.

Missa application: use the structured-record treatment for programs, residencies, or Organizations with many decision facts; do not force it onto simple call cards.

## Browse toolbar specification for Missa

### Desktop

1. Local category row: `All`, `Open calls`, `Grants`, `Awards`, `Residencies`, `Fellowships`, `Contests`, `More`.
2. Search row: filter button (120px), flexible search field, optional saved-search action.
3. Summary row: result count left; active scope, sort, and view control right.
4. Active filters: horizontal removable chips between search and summary only when present.

Suggested geometry:

- page max width: 1180–1240px;
- page side padding: 24–32px desktop, 14–16px mobile;
- search/control height: 44–48px;
- control radius: 10–12px;
- toolbar section padding: 16px vertical;
- horizontal gaps: 8–12px;
- category row may scroll horizontally instead of wrapping.

### Mobile

1. 60px public header.
2. H1 and utility sentence.
3. horizontally scrollable category row.
4. one search row with a compact `Filters` button and flexible search.
5. result count plus sort below it.
6. first meaningful result content within the first 844px viewport.

The mobile control bar must not introduce horizontal overflow. Secondary filters remain in a bottom sheet. Applying a filter updates the URL, closes the sheet only when the user chooses `Show opportunities`, and returns focus to the trigger.

## Call-detail overlay specification

Chillsubs keeps browse context visible behind a dimmed overlay and opens a decision surface rather than navigating immediately.

Observed desktop:

- right-side modal occupying roughly half the viewport;
- 16–20px outer inset and large rounded corners;
- independently scrollable content;
- close button top-right;
- category first, then centered title/organization identity;
- three equal actions: save, guidelines, submit;
- alert/disclosure rows for caps and eligibility;
- structured reading-period, description, limit, fee, and payment sections.

Observed mobile:

- near-full-screen bottom sheet with rounded top corners;
- identity block and three actions remain above detailed facts;
- content scrolls independently;
- no loss of the underlying browse URL.

Missa quick-detail contract:

- desktop: right sheet, 560–680px wide;
- mobile: full-height bottom sheet;
- headline block: type, title, Organization, source state;
- primary action: `View official call` or `Go to submission` only when the validated route is known;
- secondary action: `Track`;
- evidence row: last checked, source, and explicit unknown/conflict state;
- sections: eligibility, deadline, fee/prize, requirements, preparation, provenance;
- opening and closing restore focus to the originating tile;
- the canonical Opportunity page remains directly linkable.

## Publication-detail specification

The inspected detail page separates orientation, identity, section navigation, facts, and secondary community panels:

- breadcrumb and record maintenance metadata first;
- large publication identity asset on the right at desktop and before the title on mobile;
- title and external website link;
- compact bookmark/note/rate actions;
- tabs for Overview, Calls, and Guidelines;
- two-column main content with structured facts and secondary panels;
- single-column mobile order: breadcrumb, maintenance metadata, identity image, title/actions, tabs, facts.

Missa adaptation:

- replace social/rating panels with evidence, current Opportunities, official links, and Organization provenance;
- put identity media before title on mobile only when it materially helps recognition;
- keep tabs semantic and keyboard operable;
- preserve a source-first action in the orientation block.

## Interaction behavior

- Active navigation uses a pale filled row and stronger icon/text.
- Category tabs use `aria-pressed` semantics and a filled selected state.
- Cards are whole-row interactive targets, with nested save controls separately labelled.
- Desktop call detail is modal and preserves browse position.
- Search is continuously prominent; advanced filters do not displace it.
- Locked controls show a lock state instead of silently failing.
- Result count and sort are always visible before results.
- Desktop tiles lift subtly on hover; motion should remain transform-only and respect reduced motion.

## Atomic opportunity disclosure audit

The deeper pattern is not merely “card opens modal.” Chillsubs separates a submission opportunity into related records and reveals each layer only when it becomes useful.

### Disclosure ladder

| Level | User question | Information shown |
| --- | --- | --- |
| Directory card | Is this worth opening? | call type, deadline state, title, Organization, genre/form, size limit, pay, fee, save, source-route indicators |
| Call detail | Can I submit and what would it cost? | ownership, reading period, cap, eligibility, description, limits, fee/pay/prize, judges, guidelines route, submission route |
| Publication calls tab | What else is open here? | every call under one publication, with status/type filters |
| Publication guidelines tab | How must I package the submission? | editorial intent, genres, policies, reprints, AI, formatting, cover letter, post-acceptance |
| Official source | What is authoritative right now? | the publication's live guidelines or submission portal |

Missa should preserve the same progressive-disclosure logic while adding provenance. A field shown at a higher level must remain the same fact at deeper levels; deeper views may explain it, but must not silently reinterpret it.

### Entity boundaries

The inspected interface implies at least six distinct entities:

1. **Organization or publication** — identity, website, location, social links, listing manager, last update, publication-wide policies.
2. **Opportunity or call** — title, call type, reading period, call-specific description, limits, economics, eligibility, judges, and cap.
3. **Submission route** — official guidelines URL and external submission URL; these are not interchangeable.
4. **Guideline profile** — publication-wide genres, submission policies, formatting, cover-letter expectations, reprint policy, AI policy, and post-acceptance timing.
5. **Community telemetry** — bookmarks, observed response time, acceptance rate, and recommendation rating.
6. **Private user state** — saved status, notes, collections, and submission tracking.

Missa must not flatten these into one Opportunity row. Publication-wide guidance may be inherited by a call, but the interface must label inheritance and allow a call-specific override without destroying the parent record.

### Identity and ownership atoms

| Atom | Observed presentation | Missa rule |
| --- | --- | --- |
| Opportunity title | dominant serif heading | required canonical field |
| Opportunity type | `Flash Fiction`, `Poetry`, `Book-Length Fiction Contest` | controlled vocabulary; type is independent from practice and format |
| Organization/publication | linked `by …` identity | required canonical Organization reference |
| Manager | `managed by … editors` | separate claim/management state from Organization identity |
| Identity asset | cover or logo | optional, rights-cleared, with source and alt text |
| Publication class | `Creative Magazine`, `Consumer Magazine` | Organization/listing type, not Opportunity type |
| Updated date | publication orientation block | exact timestamp plus updater/source actor when known |
| Official website | separate external link | Organization URL, not necessarily submission URL |

### Availability and lifecycle atoms

The call overlay distinguishes more than a deadline date:

| Atom | Observed examples | Missa representation |
| --- | --- | --- |
| Reading-period mode | `Always open`, `Limited`, `Recurring` | enum: `always-open`, `limited`, `recurring`, `until-filled`, `unknown` |
| Opens on | `Aug 21` or recurring start | date plus source timezone when known |
| Closes on | `Sep 21, 2026` | date, optional exact time, timezone, and cutoff confidence |
| Human urgency | `Closes in 22 days` | derived display only; never persisted as source data |
| Recurrence window | `Aug 31 – Sep 27` | recurrence rule plus current occurrence boundaries |
| Submission cap | `20` | positive integer or unknown |
| Early-close consequence | `may close early once the cap is reached` | explicit boolean/condition, not inferred merely because cap exists |
| Current availability | open/closed/upcoming | derived from authoritative window, timezone, cap state, and last check |

Missa must keep `deadline date`, `exact cutoff`, `timezone`, `reading-period type`, and `availability state` separate. “Closes on September 21” is not enough to promise that a submission remains possible for the whole local day.

### Classification atoms

The inspected calls use several independent classification dimensions:

- opportunity container: magazine call, press call, contest;
- submission form: flash fiction, poetry, pitch, multimedia, book-length fiction;
- publication medium: online, print, or unknown;
- book type: novella and potentially other manuscript forms;
- broad genre: fiction, nonfiction, poetry, hybrid, multimedia;
- subgenre: fantasy, horror, science fiction, dark fantasy, crime, noir, memoir, literary, and others;
- editorial theme or prose description: unbounded narrative that must not be converted into taxonomy without review.

Missa rule: preserve type, practice family, discipline, genre, form, medium, and theme as independent facets. A long editorial description remains source prose; extraction candidates require provenance and review before becoming canonical taxonomy.

### Limit atoms

The UI changes the unit rather than forcing every limit into “word count.” Observed examples include:

- word range: `20,000–39,999 words`;
- maximum words: `up to 1,000 words`;
- piece range: `1–3 pieces`;
- submission cap: maximum number of submissions accepted across the whole call.

Required Missa model:

| Atom | Type |
| --- | --- |
| unit | `words`, `characters`, `pages`, `lines`, `minutes`, `files`, `pieces`, or reviewed extension |
| minimum | non-negative number or unknown |
| maximum | non-negative number or unknown |
| per | `work`, `piece`, `submission`, or `portfolio` |
| quantity minimum/maximum | number of Works/pieces/files accepted in one Submission |
| notes | source-preserved exceptions or category-specific limits |

Submission cap is lifecycle capacity and must not be stored as a Work-length limit.

### Economics atoms

The interface distinguishes different kinds of money:

| Atom | Observed examples | Missa requirement |
| --- | --- | --- |
| Base fee status | no fee, some fee, fee | explicit status even when amount is unknown |
| Base fee amount | `$20` | amount, currency, tax inclusion, and source text |
| Optional service fee | `$10 feedback` | separate add-on type; never merge into base fee |
| Expedited fee | shown on some cards | separate optional add-on |
| Pay status | no pay, some payment, pays | status independent from amount |
| Pay amount/rate | e.g. per piece when present | amount, currency, unit, minimum/maximum |
| Prize | `$1,000 total prize` | prize amount and award count when known |
| Non-cash compensation | free structural edit, author copies | typed benefit plus source prose |
| Author copies | `20 author copies` in description | structured quantity only after review |

A fee, prize, payment, reimbursement, stipend, and non-cash benefit are different claims. Missa should never reduce them to a single monetary badge.

### Eligibility atoms

The expanded call exposed both structured tags and an editorial note:

- LGBTQ+;
- BIPOC;
- nonbinary;
- over 18;
- creators with disabilities;
- a free-form explanation of who the editors intend to support.

Required Missa separation:

| Atom | Rule |
| --- | --- |
| eligibility criterion | exact reviewed requirement, not a recommendation |
| criterion operator | all, any, one-of, excluded, preferred, or unknown |
| audience/category | controlled term with label current at source time |
| geography | residency, citizenship, location, origin, or on-site requirement kept distinct |
| age | minimum/maximum with inclusivity semantics |
| career stage | stated eligibility only, never inferred quality |
| membership/affiliation | required, preferred, or irrelevant |
| evidence | exact source passage and source URL |
| interpretation note | reviewer explanation kept separate from source text |
| unresolved ambiguity | blocks confident eligible/ineligible language |

The inspected tag display does not explain whether tags mean “restricted to,” “especially welcomes,” or “includes.” Missa must not reproduce that ambiguity. A user-facing tag needs a relationship verb such as `Required`, `Open to`, `Prioritizes`, or `Not eligible`.

### Publication-wide policy atoms

The Guidelines tab discloses boolean policies separately:

- accepts translations;
- multiple submissions;
- simultaneous submissions;
- concealed/anonymous submissions.

Each field requires `yes`, `no`, `conditional`, or `unknown`, plus source text when conditional. “No value found” must render as unknown, not no.

### Reprint atoms

Reprint policy is decomposed by previous-publication channel:

- social media;
- personal website;
- defunct magazine;
- blog;
- another magazine;
- print-only appearance.

Missa should model prior-publication channel and decision independently. A single `acceptsReprints` boolean cannot represent channel-specific policy.

### AI-policy atoms

The inspected publication renders a short `No Gen AI` policy. Missa should preserve:

- policy scope: text, image, translation, editing, ideation, or unspecified;
- action: prohibited, disclosure required, allowed, conditional, or unknown;
- applicable artifact: Work, cover letter, image, supporting material, or all submission content;
- exact source wording;
- last checked and source URL.

Do not normalize a short policy into broader prohibitions that the source did not state.

### Formatting atoms

Observed fields:

- font: Times New Roman;
- documents per submission: all entries in one document;
- file format: TXT.

Extended Missa model should also allow file size, page size, margins, line spacing, anonymization, naming convention, header/footer, pagination, media codec, duration, resolution, and portfolio ordering. Every absent field remains unknown.

### Cover-letter atoms

Observed fields:

- tone: do not care;
- length: just the basics;
- include contact information: no;
- mention simultaneous submissions: no;
- include third-person bio: no.

These are preparation requirements, not Opportunity eligibility. Missa should attach them to the Submission packet contract and use them to build a checklist; they must not influence Fit or acceptance predictions.

### Post-acceptance atoms

The inspected guideline profile exposed `acceptance to publication: 0 days`. This is a publication workflow expectation, not the same as response time. A complete Missa model should keep:

- expected response interval;
- acceptance-to-publication interval;
- rights granted and reversion;
- exclusivity/embargo period;
- edits and proof approval;
- contributor agreement;
- payment timing;
- contributor copies;
- withdrawal and takedown terms.

Only the first interval was visibly verified on the inspected publication. The rest are model requirements, not claims about Chillsubs' current fields.

### Contest-specific atoms

The book-length contest added fields not present on ordinary calls:

- manuscript/book type: novella;
- minimum and maximum word count;
- entry fee;
- total prize;
- author-copy benefit;
- named judge: Kristina Ten;
- adjudication description.

Missa should model judges as referenced people with role, display name, source, and conflict/recusal notes when supplied. A contest prize must state whether it is total, per winner, split, or unspecified.

### Community telemetry and private state

One call displayed response time, acceptance rate, writer recommendation, and bookmarks. These values belong to a separate evidence class from official call facts.

Missa rule:

- do not introduce public ratings or acceptance predictions in the current Opportunity redesign;
- if response telemetry is added later, label sample size, observation window, collection method, and uncertainty;
- never present community-derived acceptance rate as Organization-provided truth;
- bookmarks, notes, saved collections, and Tracker state remain private user data.

### Atomic provenance envelope

Every consequential Missa fact should be representable with this envelope:

```ts
type OpportunityFact<T> = {
  value: T | null;
  status: 'confirmed' | 'conflicting' | 'unknown' | 'unavailable';
  scope: 'organization' | 'opportunity' | 'submission-path' | 'work-category';
  sourceUrl: string;
  sourceLabel: string;
  sourceKind: 'official' | 'organization-submitted' | 'radar-extracted' | 'reviewer-derived';
  sourcePassage?: string;
  observedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  inheritedFrom?: string;
  interpretationNote?: string;
};
```

The UI does not need to print this envelope beside every value. It needs to make the status legible, provide a source/evidence disclosure, and avoid showing derived or inherited facts as direct official statements.

### Current Missa model gap analysis

Repository evidence inspected:

- `packages/radar-engine/src/opportunityPorts.ts` — `OpportunityCallProfile`, `OpportunityBrowseProjection`, and `OpportunityDetailProjection`;
- `packages/radar-adapters/src/opportunityRepository.ts` — public projection mapping;
- `packages/db/src/schema.ts` — hosted submission paths and submission records.

Missa already models more than the current browse UI reveals:

| Already represented | Current shape |
| --- | --- |
| Call and market kind | separate enums |
| Publication and accepted formats | string arrays |
| Subgenres | string array |
| Reading-period kind and label | call-profile fields |
| Multiple windows | open/close, kind, timezone, current flag, source URL, confidence |
| Payment | type, amount, currency |
| Reprints and previous publication | coarse booleans |
| Multiple submissions | boolean |
| Word and page limits | numeric minimum/maximum |
| Response telemetry | response days, acceptance rate, sample size |
| Judge | one name plus prize-level judge field |
| Prizes | rank, title, amount, currency, description, source, confidence |
| Eligibility and rights | summary strings plus detail-page eligibility records |
| Provenance | source URL, verification time, confidence; repository source check metadata |
| Public changes | old/new values with timestamp |
| Official routes | guidelines and submission URLs kept separate |

The atomic audit identifies these gaps or lossy fields:

| Gap | Why current shape is insufficient | Recommended extension |
| --- | --- | --- |
| Limit units | word/page-only fields cannot represent lines, minutes, pieces, files, or characters | repeatable typed limit records |
| Work quantity | piece count differs from size limit | submission quantity contract |
| Submission cap | capacity is not a Work limit | call-cap record with early-close condition |
| Exact cutoff confidence | a date may omit time/timezone | cutoff time, timezone, precision/status |
| Conditional policy state | boolean cannot distinguish unknown from conditional | `yes/no/conditional/unknown` policy values |
| Translation and concealed submission | not visibly represented in call profile | named publication/call policies |
| Channel-specific reprints | one boolean loses social/web/print distinctions | reprint-policy entries by prior channel |
| AI policy | source wording and scope are absent | scoped policy action plus exact passage |
| Optional fees | feedback/expedited charges differ from base fee | repeatable fee components |
| Compensation | one payment field loses copies, edits, reimbursement, and royalties | typed compensation entries |
| Eligibility logic | summary and generic records do not express all/any/excluded/preferred | criteria with operator, relationship, evidence, ambiguity |
| Formatting | font, file type, bundling, naming, anonymization absent | packet-format requirements |
| Cover letter | preparation atoms absent | cover-letter contract |
| Post-acceptance | rights summary cannot represent timing and obligations | structured obligation/timeline records |
| Judges | one call-level name does not represent panels or roles | repeatable people/role references |
| Inheritance | source scope is not explicit per atom | parent source, inherited-from, and override state |

Implementation rule: extend the existing `OpportunityCallProfile` family or introduce versioned related records behind the same repository boundary. Do not replace the existing provenanced windows/prizes model with a parallel UI-only object, and do not place publication-wide guidelines directly on every Opportunity row.

### Missa atomic quick-detail order

1. **Orientation:** type, title, Organization, current availability, source status.
2. **Actions:** official call, submission route when separately verified, Track.
3. **Deadline:** reading-period mode, opening, closing, exact cutoff/timezone confidence, early-close/cap warning.
4. **Eligibility:** relationship-labelled requirements and unresolved ambiguity.
5. **Economics:** base fee, add-ons, pay, prize, reimbursement, non-cash compensation.
6. **Work limits:** form, genres, quantity, unit-specific minimum/maximum.
7. **Submission packet:** file formats, bundling, cover letter, anonymization, supporting materials.
8. **Policies:** simultaneous/multiple submissions, translations, reprints, AI, prior publication.
9. **Post-acceptance:** rights, publication timing, payment timing, copies, obligations.
10. **Evidence:** official URL, submission URL, last successful check, changed fields, conflicts, and unknowns.

The card should remain terse. The quick-detail sheet answers whether to proceed. The canonical page supports careful preparation and provenance review.

## Accessibility requirements for Missa

Visible inspection confirmed a skip link, labelled navigation landmarks, headings, labelled search fields, tab semantics, pressed states, and labelled card/save actions on several surfaces. That does not establish full conformance.

Missa implementation requirements:

- visible-on-focus skip link;
- one H1 per surface;
- real `nav`, `main`, `section`, and dialog/sheet semantics;
- 44px minimum touch targets;
- visible focus ring independent of hover;
- no nested interactive elements inside a link;
- Escape closes overlays; focus is trapped while open and restored on close;
- filters expose state through names, values, and selected/pressed semantics;
- colour never carries deadline or evidence meaning alone;
- reduced-motion removes tile lift and overlay transitions;
- at 200% zoom and 320px width, no two-dimensional scrolling.

## Adopt, adapt, avoid

### Adopt

- one coherent browse instrument;
- strong search prominence;
- category shortcuts before specialist filtering;
- visible result count and sort;
- full-width Opportunity tiles;
- genuinely different mobile card anatomy;
- quick-detail sheet preserving browse context;
- recognizable Organization identity;
- calm white canvas and broad dividers.

### Adapt to Missa

- use Missa tokens and language;
- prioritize source status, deadline confidence, eligibility reach, fee, and preparation facts;
- distinguish Track from official submission handoff;
- use evidence state instead of ratings or vibes;
- retain public usefulness without exposing personal workspace data.

### Avoid

- Chillsubs logo, mascot, icons, exact copy, green palette, and proprietary cover arrangements;
- paid `Better Search` framing;
- public ratings, vibes, popularity counts, and acceptance claims;
- writer-only language that excludes artists, filmmakers, researchers, and other applicants;
- promotional cards embedded in the navigation rail;
- assuming locked, private, or authenticated behavior from screenshots.

## Recommended Missa implementation sequence

1. Refactor `/opportunities` into a single content column and remove the persistent filter sidebar.
2. Add category navigation, integrated search/filter toolbar, result summary, and active-chip strip.
3. Rebuild `OpportunityCatalogueCard` as a full-width desktop tile and dedicated mobile composition.
4. Add the bounded quick-detail sheet using existing published Opportunity data only.
5. Verify 1440 × 1000, 1024 × 768, 820 × 1180, 390 × 844, and 320 × 640.
6. Test keyboard navigation, focus restoration, reduced motion, loading/empty/error states, and long-content wrapping.
7. Compare rendered Missa screenshots against this specification without copying Chillsubs' expression.

## Acceptance criteria

- No persistent filter sidebar on public `/opportunities`.
- First mobile Opportunity title is visible within the initial 390 × 844 viewport.
- No horizontal overflow at 320–390px.
- Desktop Opportunity results render one per row.
- Search, Filters, result count, and Sort are visible before the first result.
- Every card exposes title, Organization, deadline, fee, location/eligibility reach, and evidence state without opening detail.
- The quick-detail surface preserves URL/search state and restores focus on close.
- Unknown, conflicting, and unavailable facts remain explicit.
- Missa retains its own typography, palette, icons, copy, provenance model, and product language.
