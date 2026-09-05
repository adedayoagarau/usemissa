---
title: Missa public creator portfolio contract
version: "0.1"
status: design-and-model-target
date: "2026-09-01"
related:
  - ./missa-profile-screen-contract-2026-08-08.md
  - ./missa-library-work-screen-contract-2026-08-08.md
  - ./missa-profile-visual-directions-2026-08-08.md
---

# Missa public creator portfolio contract

Current integration reference: [Directory and creator portfolio handoff](directory-portfolio-integration-handoff.md). Use its source-verified endpoints and persistence boundaries when continuing implementation; older historical status below may be superseded.

## Purpose

The public creator Profile is an artist-controlled portfolio. It must present
writers, visual artists, filmmakers, musicians, performers, designers, and
interdisciplinary creators without forcing every Work into one visual template.

The Missa frame supplies typography, accessibility, navigation, privacy, and
responsive behavior. The creator's published Work supplies the visual emphasis.

## Current implementation boundary

The current implementation cannot yet power this contract:

- `LibraryWork` stores a title, optional description, one optional private
  `fileId`, private taxonomy assignments, and timestamps.
- `LibraryFile` stores private blob metadata and a private storage key.
- `PublicUserProfile` projects only an explicitly public display name and bio.
- no public Work, media sequence, collaborator, credit, cover, ordering,
  collection, availability, or composition model exists;
- no public derivative pipeline exists for private Library files.

The portfolio matrix is therefore a design fixture and target contract. It must
not be presented as a production or backend-complete capability.

## Domain boundaries

| Domain | Owns | Never supplies by inheritance |
|---|---|---|
| Private Profile | Preferences, eligibility self-description, integrations | Public portfolio content |
| Private Library | Editable Works, original files, taxonomy, versions | Public file URLs or automatic publication |
| Tracker | Opportunity relationship, stage, notes, deadlines, outcomes | Public identity or social proof |
| Submission | Historical submitted packet and receipt | Current public Work presentation |
| Public Profile | Explicitly published identity and portfolio modules | Private fields whose absence would reveal stored data |
| Public Work | Approved Work identity, blocks, derivatives, credits, links | Library storage keys, private taxonomy, Tracker or submission history |

The public route reads a deliberate public projection. It must not filter
private creator records at render time.

## Minimum public Profile

```ts
type PortfolioComposition =
  | "gallery"
  | "editorial"
  | "editorial-gallery"
  | "showcase";

interface PublicCreatorProfile {
  id: string;
  handle: string;
  displayName: string;
  position?: string;
  biography?: string;
  portrait?: PublicMediaDerivative;
  location?: string;
  disciplines: string[];
  availability?: PublicAvailability;
  links: PublicLink[];
  contactMode: "missa-message" | "external" | "unavailable";
  composition: PortfolioComposition;
  featuredWorkIds: string[];
  workOrder: string[];
  moduleOrder: PortfolioModule[];
  publishedAt: string;
}

type PortfolioModule =
  | "featured-work"
  | "work-index"
  | "about"
  | "credits"
  | "availability"
  | "links";
```

Availability is creator-authored and optional. Supported intents include
commissions, collaborations, representation, performances, exhibitions,
residencies, assignments, and not currently available. Missa does not infer
availability from Tracker activity.

## Minimum public Work

```ts
type PublicWorkType =
  | "image"
  | "gallery"
  | "video"
  | "audio"
  | "text"
  | "document"
  | "embed"
  | "mixed";

type PublicWorkState = "draft" | "reviewable" | "published" | "archived";

interface PublicWork {
  id: string;
  creatorProfileId: string;
  libraryWorkId: string;
  slug: string;
  title: string;
  summary?: string;
  startDate?: string;
  endDate?: string;
  disciplines: string[];
  creatorRole?: string;
  collaborators: PublicCredit[];
  presentationType: PublicWorkType;
  cover?: PublicMediaDerivative;
  blocks: PublicWorkBlock[];
  collections: string[];
  externalLinks: PublicLink[];
  state: PublicWorkState;
  includedOnProfile: boolean;
  publishedAt?: string;
  archivedAt?: string;
}
```

The `libraryWorkId` records provenance but does not grant public access to the
private Library row or its files.

## Work blocks

```ts
type PublicWorkBlock =
  | { id: string; type: "rich-text"; body: string }
  | { id: string; type: "image"; media: PublicMediaDerivative }
  | { id: string; type: "gallery"; media: PublicMediaDerivative[]; layout: "grid" | "sequence" | "diptych" }
  | { id: string; type: "video"; media: PublicMediaDerivative; poster: PublicMediaDerivative; captions?: PublicMediaDerivative; transcript?: string }
  | { id: string; type: "audio"; media: PublicMediaDerivative; artwork?: PublicMediaDerivative; transcript?: string }
  | { id: string; type: "document"; preview?: PublicMediaDerivative; accessibleText?: string; download?: PublicMediaDerivative }
  | { id: string; type: "embed"; provider: string; publicUrl: string; title: string }
  | { id: string; type: "credits"; credits: PublicCredit[] };

interface PublicMediaDerivative {
  id: string;
  publicUrl: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  aspectRatio?: number;
  focalPoint?: { x: number; y: number };
  altText: string;
  caption?: string;
  credit?: string;
}
```

Every public media record is an approved derivative. It is not the private
Library storage object. Visual media requires alt text; time-based media requires
captions or a transcript where speech or meaningful sound is present.

## Publication lifecycle

1. A creator selects a private Library Work.
2. Missa creates or updates a separate public Work draft.
3. The creator chooses approved fields, blocks, media derivatives, cover,
   credits, and external links.
4. Preview renders only the public draft projection.
5. Publish records the exact projection and public derivatives.
6. Unpublish removes public availability without deleting the Library Work,
   submission evidence, or publication history.
7. Updating a Library Work never silently updates its published projection.

Required owner controls are draft, preview, publish, unpublish, reorder,
feature, change cover treatment, and remove from Profile.

## Composition system

All compositions consume the same Profile and Work records.

### Gallery

For image-dense practices. Work media leads; metadata appears on focus, hover,
or directly beneath media. Mixed aspect ratios retain crop intent and focal
points. Text-only Works remain legible and do not receive invented thumbnails.

### Editorial

For narrative practices. Featured Works combine media, excerpts, roles, and
credits with readable line lengths. Long text is excerpted on the Profile and
continues on Work detail.

### Editorial + Gallery

For practices that need both context and visual range. Identity and an authored
practice statement lead into one narrative featured Work; the remaining Works
continue as a media-forward gallery. This is a controlled composition, not a
free-form combination of arbitrary modules.

### Showcase

For cinematic, performance, sound, and interdisciplinary practices. One or two
featured Works receive immersive media treatment; supporting Works remain
scannable and playable without monopolizing the page.

Creators choose a composition, featured Works, order, density, cover treatment,
and optional module order. Missa does not become a free-form website builder.

## Responsive and accessibility requirements

- 320px is the minimum supported width; no page-level horizontal overflow.
- Identity compresses before Work media loses useful size.
- The strongest published Work follows identity on mobile.
- Image renderers preserve focal points and useful aspect ratios.
- Video reserves its aspect ratio and exposes keyboard-operable controls.
- Audio controls remain usable without a large empty media frame.
- Text stays within 65 to 75 characters per line.
- Focus remains visible; meaning never depends on color or hover.
- Reduced motion retains every action and content relationship.
- Empty optional modules are absent from the public route.

## Design proof matrix

The contract must be tested with the same fixtures across all four
compositions:

1. visual artist or photographer;
2. writer or poet;
3. filmmaker;
4. musician or sound artist;
5. dancer or performance artist;
6. multidisciplinary designer or collective.

The design gate passes when all 18 states preserve meaning without fixture
rewrites or medium-specific exceptions. Edge fixtures must include no portrait,
no biography, one Work, 30 Works, unavailable creator, missing media, private
Work, long names, long credits, and collaborative authorship.

## Implementation sequence

1. Approve this contract and the 18-state design matrix.
2. Add relational public Profile, public Work, block, derivative, credit, link,
   ordering, and publication-event records.
3. Add a derivative pipeline that never exposes private storage keys.
4. Build owner draft, ordering, preview, and publication controls.
5. Build public Work renderers and the three Profile compositions.
6. Validate the six archetypes, edge fixtures, WCAG, zoom, mobile, and
   publication privacy before promotion.
