# Missa hosted Opportunity and application contract

Date: 8 August 2026  
Status: Option 2 applied to the existing local hosted route; complete application contract and deployment blocked  
Selected visual direction: **02 — Application desk**

## 1. Purpose

This journey helps a creator move from reading an Opportunity to holding a durable submission receipt. It must let them:

1. understand the Opportunity, deadline, fee, application route, and Organization requirements;
2. decide whether the stated eligibility and practice rules apply to them without Missa making that decision on their behalf;
3. prepare one or more Works and supporting answers;
4. leave and safely resume a private draft;
5. upload files with visible progress, recovery, and privacy boundaries;
6. review the exact packet the Organization will receive;
7. pay an application fee when required;
8. submit once, recover from ambiguous payment or network outcomes, and receive an immutable receipt.

The primary action changes by phase: **Start application**, **Continue**, **Review application**, then **Submit application** or **Pay and submit**. Reading the Opportunity remains possible without authentication.

## 2. Current implementation truth

The current hosted-call route already supports:

- public published-call reading and Organization scoping;
- safe same-origin return paths through login and signup;
- four dynamic field types: text, file upload, category select, and fee acknowledgement;
- one or more titled Works with multiple private file uploads;
- 25 MB per-file limits, executable/script rejection, submitter-owned blob paths, and malware scanning that fails closed;
- local session recovery plus a server draft that expires after 30 days;
- idempotent submission;
- Stripe Checkout for USD fees, connected-account checks, payment verification, and webhook reconciliation;
- submission creation, draft deletion, Tracker status update, and a receipt notification.

The current interface does not yet provide a safe complete application experience. It has no explicit review step, no continuous autosave contract, no local/server conflict resolution, no form-version snapshot, no per-file progress/cancel/retry/remove contract, no total upload quota, no conditional fields, no eligibility acknowledgement model, no deadline race handling in the UI, no currency/refund/waiver contract, and no complete immutable receipt projection. These are promotion blockers, not details to conceal with visual polish.

The existing local `/org/[organizationId]/[openCallId]` route now applies the Application desk around this compatibility behavior. Public Opportunity reading and private application state are visually and semantically separate. Optional approved Opportunity media appears only in the public header with a quiet fallback; the application workspace uses a bounded centre column, current section ledger, and Opportunity/requirements rail. Signed-out intent returns to the exact application anchor without creating a draft.

The current `SubmitForm` now places Works before Organization questions, states Required and Optional in text, names the 25 MB per-file limit, uses explicit no-fee or USD fee submit language, and warns that no separate recipient-visible Review step exists. It does not simulate form versioning, upload progress, deadline enforcement, payment reconciliation, or receipt completeness.

## 3. Route and phase model

- `/organizations/[slug]/opportunities/[callSlug]` is the canonical public detail.
- `/organizations/[slug]/opportunities/[callSlug]/apply` is the target authenticated application route.
- `/tracker/submissions/[submissionId]` is the target receipt and lifecycle route.
- Signed-out Start application preserves the exact return destination and section.
- Browser Back from authentication returns to the public detail without creating a draft.
- A draft starts only after an authenticated creator intentionally begins or edits the application.
- Public reading, private drafting, external payment, durable submission, and post-submission tracking are different states and must never be collapsed into one loading screen.

## 4. Information architecture

Every direction uses the same sections:

1. **Readiness** — deadline, fee, route, Work count, eligibility statements, practice rules, and requirements.
2. **Works** — choose from Library or add a submission-only Work snapshot; title and required files per Work.
3. **Questions** — Organization-authored fields with persistent labels, help, constraints, and conditional behavior.
4. **Review** — exact recipient-visible packet, declarations, fee, and unresolved errors.
5. **Submit** — payment when required, final server checks, durable result, and receipt.

Completed sections remain editable until final submission. Navigation cannot mark a section complete merely because it was visited.

## 5. Eligibility and taxonomy boundaries

- Opportunity type, identity eligibility, career stage, geography, dates, fees, and canonical creative-practice taxonomy remain separate facts.
- The application may expose only the small set of practice rules attached to this Opportunity: `accepted`, `preferred`, `required`, or `excluded`.
- **Accepted** means the Organization accepts the named practice; **preferred** is a preference and never an eligibility guarantee; **required** is an explicit requirement; **excluded** requires direct Organization-authored explanation.
- Missa never declares “You are eligible” from Profile or Library data. It may say which stated details appear to match and which the creator must confirm.
- Taxonomy labels use canonical IDs and facet-aware search. A flat list of 1,084 terms is prohibited.
- Missing or unrecognized labels remain unresolved. They are not silently mapped.
- Work taxonomy remains private unless a question explicitly says it will be included in the submitted packet.
- A creator can continue when a preferred term does not match. A missing required fact must be resolved or explicitly acknowledged according to the Organization’s rule.

## 6. Draft and form versioning

- Draft state names its storage outcome: Saving, Saved to Missa, Saved on this device, Offline changes waiting, Conflict needs review, or Could not save.
- Autosave is debounced, idempotent, and field-granular; it never blocks typing.
- The server owns a draft revision and the form owns an immutable published version. Every save includes both.
- Concurrent tabs or devices produce a compare-and-resolve state, never last-write-wins data loss.
- A changed form shows added, removed, and changed questions before migration. Removed answers remain recoverable until the creator accepts migration.
- The 30-day expiry is shown as a real date. Warning begins before expiration; expired drafts provide a recovery explanation.
- Delete draft is explicit, recoverable when feasible, and never bundled with leaving the page.
- Sensitive answers are not written before authentication without a separately approved client-storage policy.

## 7. Field contract

The target field vocabulary supports short text, long text, email, URL, number, date, single select, multi-select, radio, checkbox, yes/no, file upload, Work picker/repeater, consent or attestation, and non-interactive information blocks. Every field has:

- a stable ID and form-version relationship;
- a persistent visible label;
- explicit Required or Optional text;
- help, format, character, file, and privacy constraints before input;
- an associated inline error and an error-summary anchor;
- keyboard and screen-reader semantics;
- server validation equivalent to client validation;
- safe rendering of Organization-authored content.

Conditional fields announce appearance, preserve or intentionally clear hidden values according to a published rule, and never leave invisible blocking errors. Required meaning cannot depend on an asterisk alone.

## 8. Works and files

- Each submitted Work is an immutable submission snapshot. Later edits to the Library Work do not rewrite the packet.
- The form states minimum and maximum Work counts, files per Work, accepted formats, per-file size, total size, and whether links are accepted.
- The current implementation limit is 25 MB per file; any target total quota remains a contract requirement until implemented.
- Each file has queued, uploading, checking, ready, failed, rejected, and removed states.
- Uploads expose progress, cancel, retry, replace, and remove. A failed file does not erase a ready sibling.
- Customer copy may say “Checking file” or “File could not be accepted”; malware vendor, scan engine, blob path, and provider identifiers remain internal.
- Files remain private to the creator until submission and become visible only to authorized Organization reviewers after submission.

## 9. Payment and submission

- No-fee actions say **Submit application**. Paid actions say the exact currency and amount: **Pay $25 and submit**.
- Fee, currency, refund policy, waiver availability, payer, and external checkout transition are visible before leaving Missa.
- Payment authorization is not a submission receipt. After returning, Missa reconciles payment and durable submission separately.
- Cancelled, failed, processing, paid-but-submission-pending, duplicate, and refunded states are distinct.
- Final submission rechecks authentication, published form version, call status, deadline, required answers, Work/file ownership, eligibility acknowledgements, and payment.
- Double activation, browser refresh, webhook replay, and retry use one idempotency boundary.
- An ambiguous response shows “Checking submission” and polls the durable result; it never invites an immediate duplicate payment.
- The success page names the Opportunity, Organization, submitted time, Works, answers, files, fee/payment state, receipt ID, and current lifecycle status. Internal database, provider, and scan identifiers stay hidden.

## 10. Privacy, accessibility, and content

- Organization-authored guidelines and public facts are public; draft answers and files are creator-private; only the submitted packet crosses the boundary.
- Organization members receive only fields included in the published form and authorized submission view.
- Payment providers receive the minimum data required for payment.
- Accessibility or accommodation requests use an explicit route and are not inferred from Profile data.
- Error summary receives focus after failed Review or Submit and links to each invalid field.
- All controls meet a 44 by 44 pixel touch target where practical; zoom to 400 percent preserves a single reading order.
- Deadline includes date, time, and timezone; rolling, unknown, extended, conflicting, and closed states have literal text.
- There is no user-facing freshness, source confidence, source-health, queue, worker, or processing-provider language.

## 11. Required fixtures

The local comparison must cover at least: signed out and auth return; new, resumed, expiring, expired, offline, conflicting, and migrated drafts; exact, rolling, unknown, conflicting, extended, and just-closed deadlines; no-fee, paid, cancelled, failed, processing, paid-pending, waiver, and unsupported-currency payment; one and multiple Works; minimum/maximum Work count; Library and submission-only Works; allowed, rejected, oversized, checking, failed, retried, replaced, and removed files; required/optional/conditional field errors; long labels and Unicode; accepted, preferred, required, excluded, and unresolved taxonomy rules; no questions; long form; accessibility request; duplicate submit; ambiguous response; successful receipt; recoverable page failure; and 320, 390, 768, 1280, and 1536 pixel viewports with keyboard, screen-reader, 200 percent, and 400 percent zoom checks.

## 12. Premium Shadcn Studio anatomy

| Job | Premium anatomy | Missa adaptation |
| --- | --- | --- |
| Section status | `stepper/stepper-01` | Named destinations with complete, current, error, and locked states; visiting is not completion |
| Application shell | `card/card-07`, `sidebar/sidebar-07` | Quiet white workspace with a persistent Opportunity context rail on wide screens and linear mobile order |
| Questions | `form/form-06`, `field/field-01`, `input/input-14`, `textarea/textarea-05`, `select/select-01`, `radio-group/radio-group-09`, `checkbox/checkbox-01` | Persistent labels, constraints, field errors, and summary anchors; Organization content is sanitized |
| Work packet | `card/card-09`, `list/list-03`, `button-group/button-group-01` | Repeatable Work snapshots, Library choice, count requirements, and explicit edit/remove actions |
| File upload | `dropzone/dropzone-01`, `progress/progress-01` | Accepted formats and limits before selection; progress, cancel, retry, replace, remove, and checking states |
| Readiness and errors | `alert/alert-17` through `alert/alert-20` | Durable explanation and next action; no toast-only blocking error or internal provider detail |
| Review packet | `accordion/accordion-01`, `list/list-03`, `separator/separator-01` | All sections expanded or directly navigable; no final facts hidden in a modal |
| Payment handoff | `card/card-07`, `dialog/dialog-06` | Exact fee and consequence review; external checkout and return state remain explicit |
| Draft conflict or form change | `dialog/dialog-06` | Compare revisions and choose deliberately; preserve focus and both recoverable versions |
| Loading | `skeleton/skeleton-03`, `skeleton/skeleton-11` | Match section navigation, field, Work, and summary geometry |

## 13. Direction selection

### 01 — Guided steps

A horizontal progress-led flow with one section per page. It offers the strongest novice pacing but can hide cross-section dependencies and makes long applications feel artificially fragmented.

### 02 — Application desk — selected

A left section ledger, focused central editor, and right Opportunity/draft/requirements rail. It keeps context and unresolved work visible on wide screens, while mobile becomes one section at a time with a compact status header and sticky Next/Review action. This is the strongest overall direction for both short and complex forms.

### 03 — Packet builder

Works, files, and requirements form the main ledger, with questions attached to the packet. It is strongest for portfolio-heavy applications but overweights files when the Organization asks mostly narrative questions.

All three remain in the local comparison route. Option 02 is selected because it handles the broadest application weather without losing the applicant’s location, deadline, save state, or unresolved requirements.

## 14. Promotion gates

Product promotion remains blocked until form versioning, revision-aware autosave, conflict recovery, a broader typed field model, explicit conditional logic, Work snapshot semantics, upload lifecycle and deletion, total quotas, deadline enforcement, currency/refund/waiver contracts, payment reconciliation, immutable complete receipts, canonical target routes, sanitized Organization content, analytics, permission checks, and end-to-end keyboard, assistive-technology, mobile, zoom, failure, and retry QA exist and receive explicit approval.
