---
title: Missa Library and Work Detail screen contract
version: "1.0"
status: approved-and-implemented-locally
date: "2026-08-08"
parent_plan: ./missa-website-overhaul-plan-2026-08-08.md
current_routes:
  - /library
target_routes:
  - /library
  - /library/works/[workId]
component_selection_status: approved-local-option-2-working-archive
product_promotion_status: implemented-local-not-deployed
runtime_visual_audit_status: focused-desktop-mobile-accessibility-passed
---

# Missa Library and Work Detail screen contract

This contract defines the private creator Library. Option 2, Working Archive, is selected and promoted locally to `/library` and `/library/works/[workId]`. It has not been deployed. The product implementation uses real owner-scoped Library, Tracker, and checklist data and deliberately does not invent versions or submission provenance that the current model cannot prove.

## Local implementation outcome

- `/library` is now a retrieval-first Working Archive with URL-backed Works, Files, Saved Answers, search, and sort state.
- Creation uses a focused dialog with persistent labels and real Work/File/Saved Answer APIs rather than permanent creation cards beside retrieval.
- `/library/works/[workId]` is now the canonical private Work route with identity editing, one provable current file, structured canonical terms by facet, Tracker connections, checklist references, and created/updated history.
- Signed-out access preserves the exact Library return path through Login; cross-owner Work detail returns 404.
- Work, File, and Saved Answer deletion now blocks when a private Tracker, checklist, or Work reference would be orphaned. File bytes are checked only after reference preflight.
- Private file streaming is owner-scoped and no-store when the configured private Blob store is available; unavailable storage is shown as unavailable rather than as an empty Library.
- Desktop and 390px product routes passed focused Playwright, serious/critical Axe, no-overflow, mutation, ownership, and return-state checks.
- Work versions, archive/restore, immutable Library-version submission links, checksums/duplicate detection, multi-file versions, and transactional Blob compensation remain data-model work. The product does not present those as complete.

## 1. Product job

Library is the creator’s private source of reusable material. It should help someone answer:

1. Which Works do I have available?
2. Which files and versions belong to each Work?
3. How is the Work described across Missa’s canonical practice taxonomy?
4. Where has this Work been used or submitted?
5. Which reusable answers can I safely adapt?
6. What will change if I edit, replace, archive, publish, or delete something?

Library is not:

- a public portfolio by default;
- a generic cloud drive;
- the Tracker status model;
- a submission receipt;
- an Organization review record;
- a place where taxonomy predicts eligibility or artistic quality;
- a collection of unrelated upload, text, and delete cards.

Success feels like: “My creative material is organized, private, reusable, and historically accurate when I submit it.”

## 2. People and modes

| Person or mode | Primary need | Risk to prevent |
|---|---|---|
| First-time creator | Understand Work, File, and Saved Answer without setup overload | Empty dashboard, creating a file when they meant a Work |
| Active applicant | Find the right Work/version quickly | Wrong file, overwritten submission snapshot, duplicate upload |
| Multi-disciplinary creator | Describe one Work across several independent facets | Forced single discipline, flat 1,084-term picker, taxonomy used as eligibility |
| High-volume creator | Search, sort, filter, archive, and batch-review a large Library | Card sprawl, slow rendering, destructive bulk changes |
| Returning creator | See where a Work has been used and what changed | History silently rewritten by current metadata |
| Creator with an imported archive | Preserve filenames and free text while mapping canonical concepts | Silent canonicalization, duplicate Works, lost provenance |
| Mobile creator | Find one Work, inspect a file, or reuse an answer | Desktop editor squeezed onto a phone, hidden destructive scope |
| Public-profile owner | Deliberately publish selected material later | Private Library content leaking because Profile is public |

All Library content is private by default. Public Profile publication requires a separate, explicit projection and per-item publishing action; current Library rows contain no public-visibility contract.

## 3. Canonical object boundaries

### Library Work

A private creative object owned by one creator. It has stable identity, title, description, canonical taxonomy assignments, and versions/files. A Work may be linked to many Tracker items and used in many submissions.

### Work version

An immutable or append-only snapshot of the Work at a meaningful point: uploaded, marked current, or submitted. Submission history must reference the exact version/files sent, not whatever the Work contains today.

### Library File

A private stored file and its metadata. A file may support a Work version or remain unattached while being organized. Filename, content type, size, storage state, checksum/deduplication state, and upload status are file facts—not Work identity.

### Saved Answer

A private reusable text source such as a short bio, statement, or recurring response. Reuse creates a submission answer snapshot; editing the Saved Answer later must not rewrite a submitted answer.

### Tracker link

A private relationship between one Tracker item and one Library Work. Tracker stage, deadline, Organization, and outcome remain Tracker/submission facts. The Work does not inherit those statuses.

### Submission Work

The current Organization submission engine creates a separate Work row beneath a Submission with title and file URL(s). It is a historical submission object, not automatically the same row as a creator Library Work.

### Public Profile item

A future explicit public projection of selected Work identity and media. It must never expose private files, private taxonomy, Saved Answers, Tracker links, submission outcomes, or drafts by inheritance.

## 4. Current implementation evidence and gaps

### What exists

- `/library` renders one client component with Works, Files, and Saved Answers tabs.
- `LibraryWork` currently stores title, optional description, one optional `fileId`, up to 32 canonical taxonomy assignments, and timestamps.
- `LibraryFile` stores private blob metadata and enforces a 1-byte to 100 MiB upload limit.
- `SavedAnswer` stores a name and body up to 20,000 characters.
- APIs are private/no-store, owner-scoped, audited, and expose create/update/delete flows.
- Tracker may link one tracked opportunity to one current Library Work.
- Library export supports JSON and CSV with spreadsheet-formula neutralization.
- Submission Works preserve title and one or more file URLs beneath a Submission.

### Remaining data and lifecycle gaps

- Initial authenticated rendering now distinguishes a valid empty Library from route failure; focused mutation errors remain inline and associated with their current surface.
- Works support only one `fileId`; there is no Work-version model, current-version pointer, checksum, or submitted snapshot link.
- Archive/restore does not yet exist; deletion is blocked rather than allowed to orphan current Tracker, checklist, Work, File, or Saved Answer references.
- Radar Library Works are JSON rows while relational submission Works and `work_taxonomy_terms` use a different Work model. The similarly named objects are not yet one safe canonical lifecycle.
- Submission creation does not carry a Library Work/version identifier, so current UI cannot prove which Library version was sent.
- Current file deletion removes blob bytes before durable Library persistence succeeds, creating a cross-system failure window.
- Owner-scoped file opening and unavailable-storage states now exist. Upload progress, cancel, retry, duplicate detection, checksum, suspicious-file state, and full preview support remain unresolved.
- No archive/restore path exists; deletion is the only removal model.
- Current Work cards render all selected taxonomy as one comma-separated sentence, flattening the 12-facet structure.
- There is no public/private item control. That is safer than accidental publication, but public Profile work needs a separate future contract.
- Saved Answers have no version/history or “used in” context.
- Search and sort now work with restorable URL state. Large-inventory pagination, facet filtering, and virtualization remain unresolved.

## 5. Target route and information architecture

### `/library`

The private Library index.

1. Page title and short private-use explanation.
2. Search across Work title, filename, and Saved Answer name; body search requires a privacy/performance decision.
3. Primary views: Works, Files, Saved Answers.
4. Contextual Create action for the active view.
5. Compact result count, sort, and relevant filters when inventory warrants them.
6. Results optimized for retrieval, not simultaneous creation.
7. Empty, loading, error, and import/storage states.

Works is the default because it is the creator-level object connecting taxonomy, files, Tracker, and submission history. Files and Saved Answers remain first-class views, not subordinate folders hidden inside every Work.

### `/library/works/[workId]`

The private Work detail and editing route.

1. Back to preserved Library query/view/scroll state.
2. Work identity: title, optional description, private state.
3. Current file/version and preview/download availability.
4. Version history and meaningful change notes.
5. Structured 12-facet taxonomy assignments.
6. Tracker connections and submission history.
7. Saved Answers or supporting files used with this Work only when explicitly linked.
8. Edit, add version, link file, archive, and export actions.
9. Destructive area with consequence-specific confirmation.

## 6. Library index item contracts

### Work result

- title;
- optional source-provided or creator-provided cover image when one exists, with a quiet fallback;
- short description only when useful;
- current version/file summary;
- small curated practice summary grouped by facet;
- Tracker/submission usage summary, e.g. `3 active · 5 submitted`, without outcomes becoming Work status;
- updated date as private organization metadata, not customer-facing backend freshness;
- one primary action: Open Work;
- secondary menu: rename/edit, duplicate, archive, export, delete.

### File result

- filename, type, size, created date;
- upload/storage/availability state;
- linked Works and version usage;
- preview/download when supported;
- one primary action appropriate to type;
- secondary menu for attach, rename metadata, replace through a new version, or delete.

### Saved Answer result

- name;
- concise body excerpt;
- word/character count where relevant to reuse;
- updated date;
- usage count/context only when reliable;
- one primary action: Open/Edit;
- Copy is an accelerator, not the only reuse mechanism;
- secondary menu for duplicate, archive, export, delete.

## 7. Work Detail contract

### Identity and description

- Title is required and up to 200 characters under the current engine contract.
- Description is optional and up to 4,000 characters.
- Long multilingual titles and descriptions wrap without hiding actions.
- Duplicate titles are allowed only if Work identity remains clear through version/media/context; warn rather than silently merge.

### Files and versions

- A Work may have several files and versions across media types.
- One version may be current for preparation, but historical submitted versions remain immutable.
- Replacing a file creates a new version; it does not rewrite receipts or reviewer access.
- Deleted/unavailable bytes preserve filename, historical reference, and explanation when a submission snapshot depends on them.
- Preview support varies by type; unsupported preview does not imply unsupported upload.
- Upload progress, cancel, retry, failure, duplicate, size limit, storage unavailable, malware/policy rejection, and interrupted-session states require explicit UI.

### Taxonomy

- Store stable canonical term IDs, never display labels.
- Show the 12 independent practice facets in a relevant, progressive structure: discipline, form, genre, subgenre, medium, technique, mode, role, theme, audience, language, and career/experience context only where the canonical scheme defines it.
- Do not force one primary hierarchy where a Work has several legitimate parents.
- Current engine maximum is 32 Work terms; the UI explains the limit before rejection.
- The first chosen term must not silently become “primary” without explaining what primary affects.
- Assignment origin stays private operational metadata unless the creator must resolve an imported/extracted suggestion.
- Deprecated terms remain readable on historical versions and offer canonical replacements only during current metadata editing.
- Taxonomy helps retrieval and explainable opportunity intersections; it never determines eligibility, status, or quality.

### Tracker and submission history

- Active Tracker links show opportunity, Organization, stage, deadline/response context, and safe next action.
- Submission history shows exact submitted Work version/files, date, receipt provenance, and per-Work decision.
- A multi-Work packet remains one Submission with several Work rows; Work Detail links to that packet without duplicating the Submission.
- Editing current Work metadata never rewrites the submitted snapshot.
- Acceptance/withdrawal guidance uses same-Work identity and submitted version evidence, not title similarity alone.

### Privacy and publication

- Library Work, files, taxonomy, Saved Answers, and history are private by default.
- Public Profile publication is a separate opt-in action with a preview of exactly what becomes public.
- “Public” never means the original file or submission history is downloadable.
- Unpublishing affects the public projection, not Library history or submission evidence.
- Organization access is limited to the Work/files submitted to that Organization, not the creator’s Library Work or other versions.

## 8. States to design before component selection

### Library page

- loading/streaming;
- first-use empty;
- populated Works, Files, and Saved Answers;
- one result and very large inventory;
- search result and zero result;
- repository failure and expired session with safe return;
- create success, validation failure, network failure, duplicate warning;
- all items archived;
- export ready, cooldown, and failure.

### Work

- text-only Work;
- one file;
- multiple files and media types;
- several versions;
- long title/description;
- no taxonomy and rich multi-facet taxonomy;
- deprecated/imported taxonomy term;
- no Tracker history, active Tracker links, many submissions;
- accepted, declined, waitlisted, mixed, withdrawn, and archived historical uses;
- current edit differs from submitted snapshot;
- orphaned legacy Tracker/checklist reference;
- duplicate title or probable duplicate file;
- archived and restored;
- delete blocked by history, detach-only choice, and recoverable archive alternative.

### File

- uploading with progress;
- cancel, retry, offline, expired auth;
- zero byte, over 100 MiB, unsupported preview, suspicious type, name sanitized;
- duplicate bytes with different name;
- storage not configured;
- blob uploaded but metadata persistence failed;
- metadata exists but bytes unavailable;
- attached to zero, one, or many Work versions;
- deletion scope includes current Work, historical snapshot, or neither.

### Saved Answer

- short and 20,000-character boundary;
- unsaved changes;
- duplicate name;
- copied/reused successfully;
- submitted snapshot differs from current answer;
- archived, restored, delete with history preserved;
- multiline, multilingual, and assistive-technology text editing.

## 9. Interaction contract

- Primary view, search, sort, filters, pagination, and selected Work use restorable URL state.
- Creation opens a focused sheet/page/dialog appropriate to the task; it does not permanently occupy half the retrieval page.
- Every field has a persistent visible label, help, length/size constraints, and associated error.
- Upload and mutation state is announced without stealing focus.
- Tabs use complete keyboard semantics or ordinary navigation links; role-only tabs without panels/arrow behavior are rejected.
- Closing a creation/edit surface restores focus to its trigger or the updated item.
- Item menus have stable accessible names and do not make the whole card an invalid nested control.
- Archive is the default reversible removal action when history exists.
- Delete confirmations name the object, linked Works/Tracker/submissions, byte removal, and what history remains.
- Work/file deletion cannot leave silent orphan references.
- Optimistic updates require pending, failure, rollback, and retry behavior.

## 10. Responsive and accessibility contract

- 44px minimum touch targets for creator actions.
- No horizontal page overflow at 320px or 390px.
- The first mobile viewport prioritizes title, search/view control, Create, and the first useful item—not a permanent creation form.
- Work Detail reads identity, current version, primary actions, taxonomy, then history on narrow screens.
- File previews preserve intrinsic ratio and never trap zoom/pan without an exit.
- Drag/drop upload always has a labelled file-picker alternative.
- Status and file availability never rely on color alone.
- Destructive consequence text remains readable at 200% zoom.
- Keyboard, screen-reader, contrast, reduced-motion, touch, large-text, and mobile safe-area checks are promotion gates.

## 11. Analytics and privacy contract

Track only product questions:

- Library/view opened;
- create Work/File/Saved Answer intent, success, and failure category;
- Work opened;
- taxonomy editor opened and canonical selections changed as approved aggregate counts;
- file upload size band/type category, not filename or content;
- Work linked to Tracker;
- version created and used in a submission;
- archive/restore/delete intent and outcome;
- public-profile publish preview/open/confirm only after that feature has its own contract.

Never send Work titles, filenames, Saved Answer bodies, file contents, private taxonomy IDs beyond approved analytics policy, submission text, or private Organization history.

## 12. Data and architecture changes implied

- Reconcile Radar `LibraryWork` and relational submission `Work` names into explicit creator-Work versus submitted-Work concepts.
- Add a durable Library Work detail read model.
- Add Work versions and Work-version files with immutable submission snapshot references.
- Add LibraryWork/version identifiers to hosted submission Works where the creator intentionally used Library material.
- Define archive/restore and referential deletion behavior for Work, File, Saved Answer, Tracker, checklist, and submission history.
- Make file/blob deletion transactional or compensating across blob storage and Library persistence.
- Add file availability, upload, preview, duplicate/checksum, and storage-error states.
- Add URL-backed Library view/search/sort/filter/pagination.
- Preserve canonical taxonomy IDs and facet structure across current metadata and historical snapshots.
- Keep public Profile Work projection separate, explicit, and privacy-reviewed.

## 13. Acceptance gates before premium component comparison

- Library, File, Saved Answer, Work version, Tracker link, submitted Work, and public Profile boundaries approved.
- Private-by-default and Organization-scoped access approved.
- Work/version/submission snapshot model agreed.
- Delete/archive/reference behavior agreed.
- 12-facet taxonomy editing and deprecation behavior agreed.
- All listed empty, loading, error, upload, large-inventory, version, history, and privacy states represented in exactly three visual directions.
- 320px, 390px, tablet, desktop, and 200% zoom layouts reviewed.
- Current behavior-to-preserve and current defects mapped to tests.
- Product-route promotion remains explicitly separate from local component selection.
