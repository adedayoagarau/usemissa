# User Journeys

## 1. Submitter — Success Path (Primary)

A poet has been keeping a spreadsheet of magazines she submits to. She signs up for Missa Passport, connects her Gmail (Autopilot mode), and imports her existing tracker via CSV. Within minutes, Missa has classified her in-flight submissions by status and started monitoring the organizations she's already submitted to. Radar surfaces three new opportunities matching her saved search (genre: poetry, no-fee-only, deadline within 60 days) with fit reasons attached (`✓ open to poetry, ✓ no fee, ⚠ international submissions may face customs delay`). She tracks one. Two weeks later, Missa detects the organization moved the deadline and alerts her with the specific field that changed (old deadline → new deadline), not a generic "something changed" ping. The submission window's "Expected Response" (Medium confidence, based on 40 historical responses) later flags the response as overdue, and Missa surfaces a "consider withdrawing elsewhere" suggestion once she's accepted somewhere else — surfaced once, not repeatedly.

**Capabilities required:** account/auth, tracker (implemented in engine), CSV import (not built), email sync/Autopilot (not built), RadarProfile saved search + Fit Score (implemented), alerts/change detection (implemented), response-time overdue nudge (implemented), acceptance-triggered withdrawal suggestion (implemented).

## 2. Submitter — Edge Case: Item-Level Decisions

A short-story writer submits a packet of five poems to a magazine as one Submission. The magazine's review process accepts one poem and declines the other four. Missa must reflect this at the **Work** level, not just mark the whole Submission "Accepted" or "Declined" — the writer needs to see exactly which piece was accepted, and the organization's Delivery workflow needs to send a delivery notification per accepted Work, not per Submission.

**Capabilities required:** Submission → Work data model separation (a strategy-doc requirement not yet implemented — Radar's domain model today covers Opportunity/tracking, not the org-side Submission/Work workflow at all), per-Work decision recording, per-Work delivery task.

## 3. Organization Admin — Managing an Open Call (Missa Workspace)

A small literary magazine's editor discovers Missa found their submission page via Radar and sent a claim invite ("Missa found an open call on your website. Claim it to update details, receive submissions, and send decisions."). She claims it — domain match auto-approves instantly (this flow is implemented in `packages/radar-engine`). She's now inside Missa Workspace for the first time: she needs to go from "claimed a listing" to "receiving real submissions through Missa" in under 15 minutes (the activation metric). She uses the Form Builder to define a Submission Path (poetry/fiction categories, file upload, no fee), publishes it to her public page, and it's live. **This entire post-claim Workspace flow — Form Builder, Submission Path creation, public page, admin inbox — does not exist in code today.** It is the single largest gap between the current implementation and MVP scope.

**Capabilities required:** organization account/membership (auth exists), claim flow (implemented), Form Builder (not built), Submission Path model (not built), public organization page (not built), admin inbox (not built).

## 4. Reviewer — Review & Decision (Missa Workspace)

A reviewer assigned to a submission round opens their queue, applies a basic rubric, and records a recommendation. The editor makes the final Decision, and a bulk decision-email job notifies all Submitters in that round with the org's Delivery templates. None of this exists in code today — it depends entirely on the not-yet-built Submission/Review/Decision/Delivery data model.

**Capabilities required:** ReviewRound/ReviewAssignment model (not built), rubric (not built), Decision recording (not built), bulk email delivery (not built), Delivery task tracking (not built).

## 5. Admin/Operations — Verification Queue & Registry Health (Missa Radar, internal)

A Missa admin opens the Admin tab (already implemented) to review a `Needs Verification` task flagged because two sources disagree on a deadline. They resolve it, which updates the canonical `Opportunity` record and clears the flag. Separately, an operator runs `missa-radar registry stats` (implemented on the unmerged, now-consolidated registry branch) to check seed-source health per vertical before scheduling a production ingestion run — production ingestion itself is not yet wired to run automatically (no CI/cron currently configured on the consolidated branch beyond the historical `radar-app` Vercel Cron design referenced in the discovery findings).

**Capabilities required:** verification queue (implemented), claim approve/reject (implemented), registry stats CLI (implemented), production scheduled ingestion (not wired up on the consolidated branch — needs the `radar-app`-style Vercel Cron deployment or equivalent).

---
