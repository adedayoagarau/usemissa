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
- Uploads reject known executable content types, and final submission validates
  every file URL against the submitting account's private Blob prefix.
- Verified `checkout.session.completed` and async-success webhooks finalize a
  matching paid draft with event-idempotent processing, even when the applicant
  does not return to the browser.
- A scheduled, authenticated cleanup route deletes expired draft metadata and
  its private Blob uploads in bounded batches.
- Each Work can now carry multiple private file URLs; the organization file
  preview route authorizes and streams attachments individually.
- Payment lifecycle events are reconciled beyond success: expired/failed
  payments, refunds, and disputes are idempotently audited and reflected on
  the Submission payment status without hiding the receipt.
- Submission receipts and organization decisions emit private Inbox alerts;
  the existing bounded Resend digest can deliver them when configured.

## Still required before this story is done

- Malware scanning remains; cleanup now covers expired draft uploads.

## Validation

- Workspace engine tests: 33 total, 32 passed, 1 expected live-Postgres skip.
- Web typecheck: passed.
- Web lint: passed with two existing warnings in the opportunities API route.
