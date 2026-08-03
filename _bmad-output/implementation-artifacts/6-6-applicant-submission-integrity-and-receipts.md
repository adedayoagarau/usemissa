---
epic: 6
story: 6.6
status: in-progress
title: Applicant submission integrity and receipts
---

# Story 6.6: Applicant submission integrity and receipts

## Goal

Make the Missa-hosted submission path preserve the applicant's actual form
response and connect a successful submission to the submitter's Tracker.

## Delivered in this slice

- Submission records now persist category and answers keyed by the saved form
  field IDs.
- The applicant form supports multiple Works and renders category-select fields
  as selects instead of generic text inputs.
- Paid checkout keeps a browser and server-backed draft so a Stripe return or
  second device can restore answers, work titles, and uploaded private files.
- Successful submissions expose a private receipt and a private `My submissions`
  list, scoped to the authenticated account.
- A Missa-hosted call linked to a Radar opportunity moves the submitter's Tracker
  item to `submitted` with a source note.
- New open calls can optionally link to a claimed Radar opportunity from the
  Workspace create flow.
- Submission retries accept an `Idempotency-Key` and return the original receipt
  rather than creating a second packet; the relational proposal includes the
  corresponding scoped unique index.
- Applicants can withdraw an undecided submission from its receipt; linked
  Tracker state follows the withdrawal.
- Organization reviewers can stream private Vercel Blob files through an
  organization-scoped endpoint instead of receiving an unprotected file URL.
- Drafts expire after 30 days and are removed when the submission succeeds.

## Still required before this story is done

- Provider-level payment-intent/webhook reconciliation beyond the Checkout
  idempotency key.
- Multiple file attachments per Work, malware scanning, retention, and
  abandoned-upload cleanup (the current draft retains one file URL per form
  field and maps the first file to the first Work).
- Applicant status notifications (receipt is available; outbound delivery is
  still provider-dependent).
- Stripe Checkout creation forwards the same browser draft key as a Stripe
  idempotency key; provider webhook reconciliation is still separate.

## Validation

- Workspace engine tests: 32 total, 31 passed, 1 expected live-Postgres skip.
- Web typecheck: passed.
- Web lint: passed with two existing warnings in the opportunities API route.
