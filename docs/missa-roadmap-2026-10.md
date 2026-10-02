# Missa roadmap — October 2026

## Scope and verification boundary

This roadmap lists what Missa needs to wire together, improve, and build to deliver the creator offer in [`missa-value-and-positioning.md`](./missa-value-and-positioning.md): source-first discovery, deadline management, submission planning, and accountability, paid for by creators through Plus and Pro alongside organization and institution revenue.

It is based on a source read of `main` on 2 October 2026 and on [`creator-workspace-backend-frontend-inventory-2026-09-05.md`](./creator-workspace-backend-frontend-inventory-2026-09-05.md) and [`calendar-connected-workflow-readiness-2026-09-09.md`](./calendar-connected-workflow-readiness-2026-09-09.md). "Exists" means the code or schema is present. It does not mean the service is configured, running, or verified in production. No production query, provider connection, or delivery test was performed for this document.

Product rules that apply throughout:

- No creator-facing AI, and no AI in product or marketing language.
- Submission status is confirmed by the creator. Evidence such as a confirmation email may propose a status; it does not set one silently. Opening an external link is never submission evidence.
- Every status, warning, estimate, and change explains itself in plain language. Estimates, creator-reported dates, and observed dates stay distinct.
- Calm register: no guilt-oriented progress UI, streak shaming, or alarm treatment.

## 1. Wire in: exists, not yet connected

| # | Connection | What exists | What is missing |
| --- | --- | --- | --- |
| W1 | Save → Calendar → reminders → Google export | Durable reminder records (0048), linked official deadlines (0052), Google/Microsoft OAuth, encrypted credentials, deduplicated sync jobs with retries | Save outbox work that completes when the browser closes; "Synced" only after provider acknowledgement; one proven Railway-triggered delivery, exactly once |
| W2 | Opportunity versions → deadline-change reconciliation | Version heads (0076, 0077); deadline-change fields on calendar events (0054) | Propagation: update the official event, recalculate unsent reminders, queue the provider update, write an old/new Inbox notice, flag preparation sessions now after the deadline, preserve closed or cancelled history |
| W3 | Email forwarding and Gmail sync → tracker | Forwarding routes, Gmail worker, email review repository, match confidence | Confirmation emails propose "Submitted (confirmation received)" for one-tap creator confirmation; response emails propose response dates. Behind the existing accuracy, configuration, and permission gate |
| W4 | Response data → one estimator | `responseStats`, call-profile response days, rankings telemetry, directory ranges | One provenance-aware estimator feeding `expectedResponseBy` into the canonical tracker projection, which lacks it today |
| W5 | `prediction.ts` → Calendar and alerts | Recurring-opening forecasts | Forecast ranges on the calendar with stated confidence; "it opened" alerts |
| W6 | `checklist.ts` and Library → planning | Extracted requirements; creator Library | Inputs for start-by dates, material readiness, and pre-submit checks |
| W7 | Notification preferences and SMS fields → messaging provider | `sms_enabled`, `sms_phone`, verification and provider state (0055) | Provider integration for SMS and WhatsApp (see B4) |
| W8 | Stripe billing → creator subscriptions | Organization-only Stripe plans (`indie`, `pro`, `program`) and webhook | Creator plans, entitlements, and a local processor (Paystack or Flutterwave) |
| W9 | Recommendation and eligibility → recovery | Matching and eligibility engine | "Similar open calls" after a missed deadline or a decline |
| W10 | Alert delivery → one authority | Deadline delivery iterates the legacy engine store while preferences use the relational repository | One account-backed path in which canonical saves create and cancel alerts |
| W11 | Two tracker paths → one | Legacy Radar pipeline and canonical tracker | One entry point and one contract |

Resolved since the September audits: canonical status updates now set `submitted_at`, and acknowledgements are excluded from response-time statistics.

## 2. Improve: exists, incomplete

- **Calendar.** Week view; event-kind filters; one Add menu; desktop side sheet; mobile week strip with selected-day agenda as default; deadline lane above scheduled hours; source and last-checked time in deadline details; personal targets for rolling or missing deadlines; keyboard, touch, and Move to alternatives; undo, rollback, and retry.
- **Reminders.** Account timezone; quiet hours; default timing; per-reminder channel; a digest that groups deadlines with preparation and excludes inactive work; one proven opted-in delivery.
- **Google export.** Visible connection, pending, failure, retry, and reconnect states; explicit export control.
- **Tracker.** Submission and response dates with provenance and correction; Saved / Awaiting responses / History; direct Apply; undo.
- **Opportunity picker.** Saved-first results; already-saved and already-in-calendar states; explicit loading, empty, unavailable, and retry states; rolling-date handling.
- **Onboarding.** Full signed-in onboarding-to-workspace QA.
- **Release matrix.** DST, date-only deadlines, concurrency, offline recovery, 390px, keyboard, 200% zoom, long content, reduced motion, typecheck, and `npm run check:design-system`.

## 3. Build: new

### A. Foundations

Everything in sections B to H depends on these.

- **Obligation ledger.** One record for deadlines, lead-time sub-deadlines, personal targets, commitments, partners, evidence, risk signals, escalations, and outcomes. Every entry is time-stamped and carries its source and visibility.
- **Consent and visibility model.** Who sees what: status only, type and deadline, or full detail. Partners and circles never see creative work.
- **Notification orchestrator.** One place for channel choice, the escalation ladder, frequency caps, quiet hours, country holiday calendars, and pause.
- **Entitlements.** Free, Plus, and Pro limits enforced in one service.
- **Measurement.** On-time submission rate with and without a partner; nudge timing effectiveness; paid conversion and retention.
- **Job runner health.** Observable Railway schedules so background delivery is provably running.

### B. Deadline management

- **Start-by dates.** Effort ranges per material type, corrected by the creator, producing the latest sensible start date with its reasoning shown.
- **Lead-time sub-deadlines.** References, transcripts, translations, budgets, and portfolio images.
- **Capacity check.** Planned hours against available time, with a plain explanation of which calls fit.
- **Season plan.** Yearly goals spread across recurring cycles, fee budget, and capacity, reduced to "this week's three".
- **Fee budget.** Monthly cap shown before a paid call is committed to.
- **Local cutoff.** Closing time in the creator's timezone, with date-only deadlines kept date-only.
- **Crunch forecasts.** Weeks where many relevant calls close.

### C. Submission integrity

- **Pre-submit check.** Word and page limits, file format, and the blind-review name check across file text and metadata.
- **Simultaneous-submission guard and exclusivity windows.**
- **Withdrawal and follow-up templates** the creator edits and sends.
- **Rights ledger** per piece.

### D. After submission

- **Awaiting responses** with provenance-aware expected dates and follow-up timing.
- **Recovery path.** Every miss or decline offers the next cycle or a similar open call.

### E. Messaging

- **Provider and compliance.** Provider selection; opt-in consent; STOP and HELP; US A2P 10DLC; country sender rules, including Nigeria DND; per-user caps.
- **Two-way replies.** DONE, SNOOZE, and DROP update the tracker.
- **Alerts.** Deadline-day rescue, it-opened, deadline moved earlier or cancelled, response overdue, and a weekly plan.
- **Text in a deadline** by link.
- **Wallet passes** with a countdown that updates when a deadline changes.

### F. Accountability

- **Partners.** Invitation by WhatsApp or SMS without a Missa account; three visibility levels; nudges only when something slips; one-tap replies; either side can stop.
- **Commitments.** Time-stamped targets with visible renegotiation. Optional stakes go to a fee-waiver fund, never to Missa, subject to legal and payments review.
- **Circles run by Missa.** Weekly check-in, Friday recap, monthly review, season kickoff and wrap, and circle health checks.
- **Sessions.** Shared focus sessions and a monthly Submission Sunday.
- **Reading swaps** between partners. Human feedback only.
- **Matching.** Opt-in partner and circle matching by discipline, timezone, goals, cadence, and language, renewed each season.
- **Mentor view** for workshop leaders and cohorts, without access to work.
- **Quiet mode and pause,** including life events and country holidays.

### G. Records and reflection

- **Money ledger** with tax-ready export.
- **Automatic creative CV and publication list.**
- **Monthly review** and a shareable **year in submissions** recap.

### H. Trust

- **Missa accuracy record.** Public deadline accuracy, corrections, and freshness.
- **Deadline guarantee.** If a Missa record error causes a missed deadline, Missa refunds the fee or credits a free month of Plus.
- **Organization reliability record.** Factual and sourced: stated versus observed response times, late deadline changes, fee changes. No ratings or free-text reviews.
- **Organization nudges,** such as applicants waiting past a stated response date.

### I. Revenue

- **Creator Plus and Pro.** Regional pricing, local processor, 14-day trial, founding-member presale, calm upgrade copy.
- **Missa for Programs.** Cohort dashboards for institutions.
- **Organization features.** Paid reach to eligible creators, eligibility screening, sponsored fee waivers.

## 4. Deferred

- The circulation loop described in the positioning document, until its trust conditions are met.
- Any creator-facing AI, including screenshot parsing that would require it.
- Assisted submission at external destinations. The application bridge remains a research track.

## 5. Sequence

### Phase 0: make the current promise true

W1, W2, W10, W11, W3 behind its gate, the reminder improvements, and the release matrix.

Exit: save → one official deadline → reminder delivered by email → explicit Google export → correct handling of a source deadline change, each verified in production.

### Phase 1: paid wedge

Foundations (A), creator billing, two-way SMS and WhatsApp, start-by dates and this week's three, the pre-submit check, partners, and proposed-then-confirmed submissions.

Primary metric: on-time submission rate with a partner compared with without.

### Phase 2: depth

Circles run by Missa, sessions, the simultaneous-submission guard, rights and money ledgers, season plan, monthly review and annual recap, it-opened alerts, and Wallet passes.

### Phase 3: network and trust

Matching, the Missa accuracy record and guarantee, the organization reliability record and nudges, Missa for Programs, and organization-side paid features.

Phase 0 is the dependency for everything else. Paid features are not credible while saved deadlines and reminders are not provably correct.
