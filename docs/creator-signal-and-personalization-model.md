# Creator signals and personalization model

This is the backend design contract for the creator onboarding, workspace,
recommendations and notification surfaces. It distinguishes what a creator
**tells Missa**, what they **do in Missa**, what Missa **derives**, and what
Missa is permitted to **send**. Those categories must never be silently merged.

## 1. Account and consent

| Bucket | Purpose | Examples | Existing foundation |
| --- | --- | --- | --- |
| Account identity | Login and account ownership | account ID, verified email, display name | `accounts` |
| Consent and privacy | Controls collection and use | email consent, public profile visibility, analytics consent, deletion/export state | per-feature; make authority explicit |
| Locale and time | Makes dates and delivery humane | timezone, locale, preferred units | needed for reminders and calendar |
| Product state | Makes the journey resumable | onboarding version, completed/skipped timestamps, dismissed prompts, last route | add a small versioned state record |

Do not use email, location, or public portfolio data as an unstated substitute
for consent. A skipped onboarding is a valid state, not missing data.

## 2. Declared creative practice

This is private matching context. It is not an eligibility ruling and is not
automatically public on a portfolio.

| Bucket | Granularity | Example | Storage direction |
| --- | --- | --- | --- |
| Broad practices | Canonical taxonomy family | `writing-and-literature`, `music-and-sound` | existing `account_taxonomy_preferences` / onboarding contract |
| Specific practices | Canonical term IDs, not free labels | `writing.poetry`, `film.documentary` | existing taxonomy preferences |
| Strength | Creator intent only | include / prefer / exclude, weight | existing taxonomy preferences |
| Practice role | Optional primary / secondary / interdisciplinary | primary: writing, secondary: sound | preserve in onboarding profile state; do not infer from order |
| Availability of materials | Opt-in readiness, never a quality score | has audio samples, has a manuscript, has work images | discipline facet payload; keep separate from public files |

The current preview exposes broad practices and optional refinements. The
backend should map every displayed choice to a versioned canonical taxonomy ID,
while retaining the onboarding version used to create it.

## 3. Declared opportunity intent

These fields power browse defaults, matching explanations, saved searches and
email eligibility. They should be editable in Profile and the workspace.

| Bucket | Examples | Existing foundation |
| --- | --- | --- |
| Opportunity types | grants, residencies, publications, exhibitions, fellowships, paid projects | `opportunity_preferences.types` |
| Discipline and genre | poetry, photography, documentary | `disciplines`, `genres`, taxonomy preferences |
| Reach and participation | location, local-only, remote, travel willingness | `locations`; extend travel/participation explicitly |
| Career and eligibility context | emerging, mid-career, established; student where creator chooses | `career_stages`; sensitive eligibility must be separately consented |
| Cost and timing | free-only, maximum fee, deadline horizon | `no_fee_only`, `max_fee_cents`, `deadline_within_days` |
| Application conditions | simultaneous submissions required, accessibility needs, language | `simultaneous_required`; add only when a concrete product action uses it |

The six first-screen interest cards map to types rather than a new parallel
vocabulary: grants → `grant`; residencies → `residency`; publication →
`magazine`/`open-call`; exhibitions → `open-call`/`commission`; fellowships →
`fellowship`/`award`; jobs → the canonical paid-work type after taxonomy review.

## 4. Private application workspace

This is the retention engine. It must remain private by default.

| Bucket | Purpose | Key fields |
| --- | --- | --- |
| Saved opportunities | Shortlist | opportunity ID, saved at, private note, source state |
| Application record | One creator's work on one opportunity | state, next action, official destination, creator-confirmed milestone, deadline snapshot |
| Application tasks | Concrete preparation | title, due date, completed at, work/material reference, reminder setting |
| Reusable materials | Reduce repeated work | work, bio, CV, statement, link, file metadata, version and visibility |
| External handoff | Honest bridge state | destination capability, opened at, copied/downloaded materials, creator-confirmed submission, confirmation number optional |
| Outcome | Learn and help next time | outcome chosen by creator, date, notes, visibility private |

Never mark an external application submitted merely because its official link
opened. Store the creator-confirmed event and its evidence separately from
provider-confirmed receipts.

## 5. Observed behavior events

Events improve relevance but must not overwrite a creator's declared intent.
Use a bounded event vocabulary, event time, source surface and opportunity or
organization ID. Avoid raw page text, third-party credentials and sensitive
application answers.

| Event family | Examples | Use |
| --- | --- | --- |
| Discovery | viewed, searched, filter changed, result dismissed | Improve browse ordering and identify unhelpful results |
| Intent | saved, unsaved, followed organization, saved search created | Strong but reversible relevance signal |
| Application progress | materials prepared, official destination opened, submitted confirmed, outcome recorded | Workspace next actions and reminders |
| Portfolio/material use | work attached, link copied, package downloaded | Material reuse suggestions, never public visibility |
| Communication | email opened/clicked/unsubscribed, in-app notification read | Frequency control and delivery diagnostics |

Store event purpose, retention policy, idempotency key and a minimal payload.
Behavior should decay over time; it should not become a permanent hidden score.

## 6. Derived matching and email buckets

Derived data is reproducible product output, not a user profile field.

| Bucket | Contains | Rule |
| --- | --- | --- |
| Match candidate | opportunity ID, score band, reasons, computed at, expiry | Recompute from current opportunity and signals; do not persist opaque permanent rankings |
| Match reasons | “Matches your poetry preference”, “Closes in 7 days” | Show only factual, explainable reasons |
| Suppression | excluded terms, dismissed item, closed/unavailable call, already applied | Never recommend until state changes or the creator reverses it |
| Email eligibility | event type × enabled channel × cadence × timezone × frequency cap | Evaluate at send time, not when a recommendation is created |
| Delivery outcome | queued, sent, provider accepted, bounced, complained, read where consented | Separate provider evidence from user engagement |

The existing recommendation route and notification preference fields are a
starting point. Add a versioned matching-policy ID to outputs so changes can
be audited and explained.

## 7. Notification and calendar preferences

Existing preferences cover in-app, email, digest cadence, saved-search,
follow and reminder eligibility. Add the following before broadening delivery:

| Bucket | Required fields |
| --- | --- |
| Channel | in-app, email; future SMS/push only after explicit opt-in and provider support |
| Event controls | deadline reminder, saved-search match, followed organization, application task, decision update |
| Timing | timezone, quiet hours, days-before-deadline, digest day/time, frequency cap |
| Delivery safety | unsubscribe state, provider status, bounce/complaint suppression, retry policy |
| Calendar | event source, selected dates, estimated versus exact date, export/sync consent |

There is no generic “notify me about everything” default. No email is sent
until the creator has an enabled channel and the event is eligible at send time.

## 8. Data boundaries

- **Public only by explicit publication:** portfolio identity, chosen work,
  books, links and contact details from the published portfolio snapshot.
- **Private by default:** preferences, saved items, application records,
  tasks, files, notes, outcomes, notification history and behavior events.
- **Sensitive and optional:** identity/eligibility details, accessibility
  needs, financial constraints and location precision. Collect only for a
  named feature and give a clear delete/edit path.
- **Never store:** third-party passwords, session cookies or application form
  responses solely to simulate a bridge.

## 9. Implementation order

1. Connect the approved onboarding screen to versioned explicit preferences;
   map cards to canonical terms and make skip/resume durable.
2. Add timezone and notification timing choices when a creator first creates a
   reminder, rather than during onboarding.
3. Build workspace application records, tasks and creator-confirmed external
   milestones around the existing saved/tracker data.
4. Produce explainable recommendation candidates from declared preferences and
   reversible behavior signals.
5. Build email eligibility and delivery records before designing scheduled
   campaigns; then add tested templates and provider outcomes.

## Next frontend slice

Connect onboarding to real account preferences, then send the creator to a
small “Your space” workspace with one useful next action: resume the original
save, explore matches, or prepare a saved opportunity. Do not make a large
empty dashboard before those records exist.
