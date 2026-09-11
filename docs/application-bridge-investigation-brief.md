# Backend worker brief: application bridge feasibility

## Assignment

Determine whether Missa can reduce repeated application work while creators complete ONE application at its actual destination. Investigate and prototype supported paths; do not build duplicate application forms. Return evidence and a frontend capability contract. Do not equate an organizer API with applicant-side authorization.

Use isolated accounts, synthetic documents and authorized test forms. No real applications, payments, messages, acceptance of declarations or withdrawals. Complete submission tests only in a sandbox or explicitly authorized test call; otherwise report NOT TESTED. Do not bypass CAPTCHA, MFA or platform restrictions. Do not collect passwords/session cookies into Missa. Workers should coordinate ownership and avoid changing the shared frontend or production schema.

## Destination selection

First inventory canonical application URLs in the current published Missa catalogue with a read-only query. Count distinct opportunities and organizations by final application destination; separate source/discovery domains from submission destinations. Report query, date, denominator, unknown destinations, redirect chains and duplicate treatment. Do not assume the proposed priority reflects actual coverage.

| Priority | Destination | Required emphasis |
| --- | --- | --- |
| P0 | Submittable | Applicant access versus organizer APIs; journal, residency and grant variants; custom questions, attachments, drafts and receipts |
| P0 | Organization-owned ordinary web forms | Three materially different implementations from the catalogue; no universal autofill assumption |
| P0 | Email applications | Compose/export package, required subject, attachment limits, user-controlled sending; sent versus received distinction |
| P1 | SlideRoom | Applicant portfolio/media reuse, organization-scoped API access, custom questions, portfolio ordering |
| P1 | CaFÉ / CallForEntry | Current Creative West identity transition, existing artwork portfolio reuse, image metadata and checkout |
| P1 | Google Forms | Prefilled links, account-restricted uploads, multi-page and conditional questions |
| P1 | Jotform, Typeform, Tally | Test each present in catalogue separately; embed/cross-origin limits and supported prefilling |
| P2 | Duosuma and Moksha | Literary submission workflows, manuscript requirements, declarations and status access |
| P2 | FilmFreeway | Film project reuse, screening links, category selection and fees |
| P2 | SurveyMonkey Apply | Multi-stage grants/residencies, applicant versus administrator integration rights |
| P2 | Other high-volume destinations | Promote based on catalogue coverage; explicitly document omitted platforms |
| Control | Missa-hosted application | Baseline of one-entry submission, materials reuse and reliable completion status |

For each P0 destination, inspect three distinct forms where available: simple, conditional/multi-step, and media-heavy. For lower priorities, initially inspect one and expand only after a promising result. Report unavailable fixtures rather than claiming coverage. Repeated skins of the same form are not independent coverage.

## Test matrix — run for every destination

Record PASS / FAIL / PARTIAL / BLOCKED / NOT APPLICABLE / NOT TESTED for every ID, with evidence. A documentation claim is not a runtime pass.

### A. Official access and permissions

A1. Locate current primary API/integration/extension documentation and relevant platform rules; cite exact passages and dates.
A2. Identify who can authorize access: applicant, recipient organization, partner, or administrator. Identify plan/contract requirements and costs where documented.
A3. Check independently: read form schema, prefill/create draft, upload file, update draft, submit, read receipt, read status, webhook. Separate read from write scopes.
A4. Check OAuth/token scopes, revocation, rate limits, pagination and sandbox availability. Unknown costs/permissions remain unknown.
A5. Decide whether a supported applicant integration exists. Document browser-assisted feasibility separately from official support; never call private endpoints a public API.

### B. Entry, identity and resume

B1. Open exact application URL from Missa: logged out, logged in, expired session, wrong account, closed call.
B2. Verify login/signup returns to the exact call and preserves existing destination drafts.
B3. Test account switching and resumed drafts without exposing another person's materials.
B4. Identify stable application/form identifiers, redirects, expiring URLs and whether linking directly to a draft is supported.

### C. Transfer without re-entry

C1. Reuse name, email, website, bio and location with a creator-reviewed mapping.
C2. Test long text, Unicode names, poetry line breaks, rich text, paragraphs, word/character limits and truncation. Never silently alter content.
C3. Test selects, multi-select, dates, radio/checkbox, conditional and repeated fields, multi-page forms and dynamically loaded fields.
C4. Preserve manually entered destination values; show conflicts and let the user choose. Repeat assistance without duplicate entries.
C5. Treat eligibility answers, sensitive information, signatures, declarations and fee acceptance as explicit creator decisions.
C6. Verify input/change/blur behavior and that transferred values actually persist after next page and reload, not merely appear in the DOM.
C7. Test localization, missing labels, ambiguous fields, form revisions and iframe boundaries. Unknown mapping must stop for review.

### D. Media and documents

D1. Transfer supported PDF/DOCX/images/audio/video/links as applicable; record per-form size/type/count limits.
D2. Test filenames, title/creator/year metadata, ordering, captions and blind-submission restrictions.
D3. Verify uploaded content survives draft resume and is attached to the intended application; remove/replace/retry without duplicates.
D4. Test interrupted upload, oversized/unsupported file, expired signed URL and phone file picker.
D5. Compare existing destination portfolio reuse with Missa transfer. Do not make users upload the same assets again if the destination already holds them.
D6. Distinguish direct upload support from download-then-manual-upload fallback and measure extra steps.

### E. Draft and completion truth

E1. Save/resume across tabs, browser restart and second device; identify where the authoritative draft lives.
E2. Determine whether Missa can recover progress without reading unauthorized/private data or inventing completion percentages.
E3. In an authorized fixture only: review then submit once; handle double-click, timeout and uncertain response without automatic duplicate submission.
E4. Record reliable confirmation: application ID, timestamp, receipt, supported webhook or API status. Opening a portal or clicking submit is not proof.
E5. If only user acknowledgement is possible, label it creator-confirmed; if email receipt parsing is possible, test separately with explicit mailbox consent and synthetic receipts.
E6. Check status changes, withdrawal, resubmission and edited submissions only in fixtures; state which cannot be observed.
E7. Payments/CAPTCHA/MFA stay with the user. Determine safe pause/resume behavior; do not automate acceptance or purchases.

### F. Browser and mobile

F1. Desktop Chrome, Safari and Firefox: document version and supported mechanism.
F2. Real iOS Safari and Android Chrome: open, sign in, transfer text, upload and resume. Emulation alone is insufficient.
F3. Test ordinary browser experience separately from an installed extension. Record installation, permissions and maintenance burden.
F4. Test app/in-app-browser → destination transitions, blocked popups, third-party cookies, cross-origin restrictions and return to Missa.
F5. Verify keyboard/focus, screen-reader labels, zoom, slow network, offline interruption and actionable failure messages.
F6. Provide a usable no-extension mobile fallback; explicitly state what still requires copying or uploading.

### G. Reliability, privacy and operations

G1. Detect destination form changes and disable unsafe mappings instead of silently populating the wrong fields.
G2. Isolate accounts; redact logs, revoke access, expire temporary files and define retention/deletion.
G3. Keep sensitive text/files out of analytics; assess minimum extension permissions and supported access boundaries.
G4. Verify retries, deduplication, rate limiting and recovery after server/browser failure.
G5. Estimate maintenance per destination, operational dependencies, integration cost and release-blocking risks.

### H. Does it actually reduce effort?

H1. Use the same synthetic application baseline: manual entry versus proposed bridge, with comparable familiarity and clean starting state.
H2. Measure elapsed active time, fields entered twice, copy/paste operations, downloads/uploads, clicks, errors and successful completion. Include setup/install time separately.
H3. Run at least three repeats on supported fixtures, including mobile. Small samples demonstrate feasibility, not general conversion impact.
H4. Report median and range, plus failures. State whether benefit remains for a first-time user and a returning creator.
H5. Recommend proceed, narrow pilot, fallback only, or stop. Explain the recommendation using measured effort saved and reliability, not the existence of an API.

## Required report per destination

1. Executive verdict and feasible user journey in plain language.
2. Exact tested forms/URLs, fixture authorization, account role, device/browser, date and versions.
3. Capability matrix for A1–H5 with status, reproducible steps, expected/actual results, sanitized screenshots or logs and source citations.
4. Officially supported versus experimentally observed behavior; applicant versus organization authorization.
5. Baseline/assisted measurements; manual steps still required and unsupported cases.
6. Recommended integration, browser companion or fallback; cost, constraints and maintenance estimate with uncertainty.
7. What frontend may truthfully say and what it must not say.
8. Blocking questions and minimal next experiment. Do not hide blocked tests behind a general success verdict.

Return a summary table across all destinations, raw sanitized evidence, and a machine-readable capability file. Suggested fields:

```json
{
  "destination": "submittable",
  "verifiedAt": "ISO timestamp",
  "formScope": [],
  "authorizationRole": "unknown",
  "mode": "unknown",
  "capabilities": {
    "readRequirements": "not_tested",
    "prefillText": "not_tested",
    "uploadMedia": "not_tested",
    "resumeDraft": "not_tested",
    "confirmSubmission": "not_tested",
    "readStatus": "not_tested"
  },
  "devices": {},
  "manualSteps": [],
  "evidence": [],
  "blockers": []
}
```

Do not store credentials or applicant content in reports. Evidence must identify the tested form/version; a successful single form does not certify an entire platform.

## Frontend work that can proceed now

Continue authentication/recovery, optional orientation, saved opportunities and a unified workspace. Build reusable private materials, application next actions, calendar and notification preferences around existing data. Keep destination capabilities explicit: unknown, external handoff, assisted, or native. Default external calls to “Continue to application”; never show auto-submit or automatic status sync based on this investigation plan. Keep destination drafts authoritative and avoid a mandatory duplicate questionnaire. Use fixtures to design loading, unsupported, interrupted, review-needed and creator-confirmed states while backend findings arrive.

## Primary-source starting points (checked September 4, 2026)

- Submittable advertises integrations and a two-way API. This does not establish applicant-level submission access: https://www.submittable.com/features/integrations
- SlideRoom's documentation describes exports from an organization's account; investigate applicant-side capabilities independently: https://api.slideroom.com/Documentation
- CaFÉ application help describes form questions, work samples and checkout: https://artist-help.callforentry.org/col/intro

These are investigation leads, not completed bridge tests. Verify current documentation and catalogue relevance for every other destination before implementing.
