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
- Paid checkout keeps text answers and work titles in a short-lived browser draft
  so a Stripe return can restore the form; files must be reselected after payment.
- Successful submissions expose a private receipt and a private `My submissions`
  list, scoped to the authenticated account.
- A Missa-hosted call linked to a Radar opportunity moves the submitter's Tracker
  item to `submitted` with a source note.
- New open calls can optionally link to a claimed Radar opportunity from the
  Workspace create flow.

## Still required before this story is done

- Durable draft/payment-intent records so files and checkout state survive a
  browser/device change.
- Multiple file attachments per Work and secure reviewer preview/download.
- Applicant withdrawal and status notification flows.
- Idempotency keys for submit and payment completion.
- File scanning, retention, and abandoned-upload cleanup.

## Validation

- Workspace engine tests: 28 passed, 1 expected live-Postgres skip.
- Web typecheck: passed.
- Web lint: passed with two existing warnings in the opportunities API route.
