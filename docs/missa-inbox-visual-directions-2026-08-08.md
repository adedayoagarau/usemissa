---
title: Missa creator Inbox visual directions
version: "1.1"
status: option-2-selected-and-promoted-locally
date: "2026-08-08"
screen_contract: ./missa-inbox-screen-contract-2026-08-08.md
review_route: /design-system/inbox-directions
selected_direction: option-2-daily-briefing-with-option-3-email-review-desk
selected_review_route: /design-system/inbox
product_promotion_status: implemented-locally-not-deployed
---

# Missa creator Inbox visual directions

These three local directions use the same customer language, fixtures, and private event model. They do not change `/inbox`, `/messages`, Tracker, email ingestion, or production.

## 01 — Attention Queue

A consequence-first list-detail layout. Decisions and email reviews lead, followed by material opportunity changes, reminders, receipts, and quiet discovery. The selected item explains what happened, why the creator is seeing it, linked facts, and one primary action.

Strengths: strongest default for mixed Inbox work; clear desktop triage; direct path from list to consequence; safe narrow-screen detail. Risk: requires a durable customer-facing Inbox projection and action destinations.

## 02 — Daily Briefing — selected

A grouped editorial digest: Act now, Changed in your Tracker, Submission record, and From Organizations you follow. It makes the daily scan calm and readable.

Strengths: clearest hierarchy and strongest Missa editorial voice; good for low/medium volume. Risk: groups can become long, and consequential item decisions still need a separate detail treatment.

## 03 — Review Desk

A decision-first email-review surface with candidate list and focused correction/confirmation area. It translates machine processing into ordinary customer choices and explains exactly what confirmation changes.

Strengths: best for high-volume email import and ambiguous updates. Risk: too specialized to replace the complete Inbox; strongest as the Email review view inside a broader direction.

## Shared contract represented

- active, caught-up, one-decision, ambiguous email, conflicting official fact, repository failure, and 24-item history fixtures;
- no customer-facing confidence, raw match classification, queue names, freshness, checked time, or provider internals;
- read state, archive intent, search, filters, one primary item action, and polite mutation feedback;
- submission history remains in submissions, Tracker stage remains in Tracker, and email excerpts remain private;
- local desktop QA only; phone/tablet/zoom and assistive-technology runtime remain gates.

## Selected synthesis

Daily Briefing is the broad Inbox default, as explicitly selected after reviewing the responsive web directions. Review Desk remains the focused Email Review destination inside the same Inbox navigation rather than a separate product. Attention Queue remains a reference for a future high-volume searchable history, not the default information architecture.

This selection wins because it:

- groups mixed Inbox work by consequence without turning discovery into urgency;
- keeps each event, its customer explanation, and one typed primary destination together;
- gives high-volume email review a purpose-built correction flow without making every Inbox item a form;
- preserves submission history in submissions and Tracker stage in Tracker;
- handles search, read, archive, ambiguous email, conflicting official facts, caught-up, failure, and large-history states;
- becomes a focused detail or Email Review page on narrow screens instead of squeezing a desktop split view.

The selected composition is now implemented locally on `/inbox` with owner-scoped alerts, customer-authored explanations, typed Opportunity/Tracker destinations, durable read and mark-all-read mutation, a URL-restorable Briefing/Email Review view, and no customer-facing confidence or source-freshness internals. It is not deployed. Durable archive/handled state, exact Submission IDs on every event, search/pagination for large histories, and broader tablet/zoom/manual assistive-technology QA remain open gates.
