# General writing app: development handoff, 8 October 2026

Follow-up: [Writing-process implementation audit](writing-process-2026-10-09.md)
records the subsequent offline, selection, navigation, revision, checks and export
work. The first-slice table below is historical; use that audit for current scope
and remaining verification.

The owner authorized the complete writing concept, rather than a Harper-only
integration. Missa supports general writing: articles, essays, reports, books,
fiction and poetry. Calls are outside this core workspace. Existing tracker-linked
writing routes remain compatibility functionality. The visual preview is a
concept deployment; this implementation is in the application repository.

## Implemented first slice

| Area | Implemented | Remaining depth |
| --- | --- | --- |
| Manuscript | Edit pieces together with separate document ownership and undo; binder order; outline; project find and replace; manual links, tables and described local images | Large-manuscript performance certification; richer cross-piece operations |
| Structure | People, places and items linked to pieces; plot/argument/motif grid and templates; deadline targets with days off; timeline ordering and explicit continuity checks; custom fields and saved filters | Daily writing history, character ages, alternate timeline branches and richer pacing views |
| Research | Sources and local text excerpts beside a draft; context-anchored private notes; orphan detection and explicit relinking; author-written citations and footnote text | Semantic numbered footnotes, citation-style engines, broader research attachments |
| Revision and readers | Bounded project checkpoints, side-by-side text comparison, restoration as a separate project, expiring checkpoint-only reader links, authenticated passage comments and revocation | Inline change tracking, richer comparison and feedback identity presentation |
| Format and export | Article/report/manuscript/book presets; DOCX and EPUB 3 with marks, lists, tables and local images; text download; existing print/PDF; text and bounded DOCX import into a new piece | Word and EPUB-reader interoperability certification, advanced book interiors, Scrivener and Google Docs import; DOCX import currently extracts plain text |
| Writing checks | Optional Harper 2.10.0 English checking in a same-origin worker; suggestions, apply, ignore, stale-result invalidation, undo and failure recovery | Additional language support and expanded rule preferences |

Structure retains the existing Plus entitlement. No generative model service
receives drafts. Harper downloads only when requested and processes text in the
browser. Private sources, planning records and notes are excluded from manuscript
exports and reader copies. Reader links are bearer access: anyone with the link
can read that immutable copy until expiration or revocation.

## Persistence and recovery

Drafts continue using WritingSync and its device-first conflict/fork handling.
Project notes and plans have a separate explicit save button, device backup and
revision-checked server write. Conflicts retain the device copy and offer a backup
download before loading the account copy. Failed workspace loading offers a
download of a valid recovered device backup when one exists.

Migration `0101_creator_writing_studio.sql` adds project studios, reader copies
and comments with account/project ownership and bounded storage. Only disposable
local QA databases have received this migration in this session. Reader tokens
are random, hashed at rest and shown only when created. Checkpoints exclude the
studio's private research and structure records. No links were sent to people.

## Component contract

| Intent | Semantic wrapper | Local source and selected primitives |
| --- | --- | --- |
| Composition and navigation | WritingStudio, WritingManuscript | `components/missa/writing-studio.tsx`, `writing-manuscript.tsx`; Dialog, Tabs, installed WritingPages and format controls |
| Author-entered planning and data display | WritingStructure | `components/missa/writing-structure.tsx`; Fields, Tabs, Table, Dialog, Input and NativeSelect |
| Research composition and disclosure | WritingResearch | `components/missa/writing-research.tsx`; Dialog, Input, Textarea, Button and Empty |
| Feedback and explicit correction | WritingChecks | `components/missa/writing-checks.tsx`; Dialog and Button |
| Export action and format selection | WritingExport | `components/missa/writing-export.tsx`; Sheet, Input, NativeSelect and Button |
| Shared-copy display and feedback | WritingReader | `components/missa/writing-reader.tsx`; installed form controls and prose layout |

The component policy and catalogue register these compositions. They reuse the
installed shadcn components, Missa semantic tokens and existing WritingPages;
no vendor theme was installed. Loading, empty, error, disabled and saved states
are represented where applicable. Suggestions remain explicit author actions.

## Research and evidence boundaries

External references informed implementation; repository tests establish local
behavior. Neither establishes a deployed production journey.

- [Harper JavaScript documentation](https://writewithharper.com/docs/harperjs/introduction): local WebAssembly checking. The pinned package's license and notice are copied beside generated assets. Browser testing required replacing the upstream worker wrapper with an owned error-reporting worker; package spans are UTF-16 offsets.
- [Tiptap documentation](https://tiptap.dev/docs): existing editor extensions and transactions preserve document formatting and undo.
- [EPUB 3 specification](https://www.w3.org/TR/epub-33/): EPUB packaging, navigation and metadata.
- [Mammoth documentation](https://github.com/mwilliamson/mammoth.js): plain-text DOCX extraction; imports enforce actual inflated archive limits and avoid imported HTML execution.

Local verification includes 107 passing writing and CSP tests, including schema,
document mapping, export archives, manuscript helpers, structure, research,
sync, boundary and disposable PostgreSQL ownership/conflict/revocation tests.
Browser scenarios cover Harper request-only loading, emoji offsets, undo and
failed asset loading; rich links/tables/images with save and reload; combined
drafts, saved research, checkpoints, reader comments and revocation. Mobile
checks use a 390px viewport. Design-system, language and diff checks pass.

All six targeted Chromium scenarios pass, including the existing free-canvas
save/reopen journey, 390px containment and a clean automated Axe check on the
combined manuscript dialog. The production build, final TypeScript and focused
ESLint checks pass. Safari, Firefox, physical screen readers, 200% zoom,
large manuscripts and desktop Word/EPUB readers still require broader
certification. Existing older writing browser scenarios are not all certified
by the targeted new scenarios.

No commit, remote push, application deployment or production database migration
has been performed. The existing public concept URL does not show these source
changes. A reachable application preview needs its own deployment and compatible
preview database; localhost is not accessible from the owner's remote MacBook.
