# Missa feature review — 6 October 2026

Source read of `main` at commit 0220923 (5 October 2026), checked against `PRODUCT.md`, `docs/missa-value-and-positioning.md`, `docs/missa-roadmap-2026-10.md`, `docs/anonymous-capability-policy.md` and the Phase 0 runbook. "Exists" means the code is present and its checks pass locally. It does not mean the service is configured or verified in production, except where the Phase 0 runbook log says so.

## 1. Summary

Missa today is a working source-first catalogue with a real creator workspace behind it. Discovery, save, deadline projection, email reminders and deadline-change handling are built and were proven in production on 4–5 October. Deadline management, Plus billing and text reminders landed in the same week, ahead of the October roadmap. The organization and reviewer product is mostly read-only and gated behind an authority flag that makes half of its pages throw when the other half works.

The repository is in good shape: every local check passes and there are no TODO markers. The risks are structural, not hygiene: two creator storage backends chosen by one environment flag, a Pro plan that is advertised but cannot be bought, and 74 of 82 browser specs that CI never runs.

## 2. Repository health

| Check                                                                                                             | Result                                                                 |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Package builds (contracts, taxonomy, decisions, db, radar-engine, radar-adapters, ingestion-v2, workspace-engine) | Pass                                                                   |
| `npm run typecheck`                                                                                               | Pass                                                                   |
| `npm run lint` (max-warnings 0)                                                                                   | Pass                                                                   |
| `npm run check:language`                                                                                          | Pass                                                                   |
| `npm run check:design-system`                                                                                     | Pass: 58 Studio families, 790 variants, no new violations              |
| `npm test` (package suites)                                                                                       | Pass, 0 failures; database-backed cases skipped without `DATABASE_URL` |
| `npm run test:unit` (web)                                                                                         | 620 tests, 598 pass, 0 fail, 22 skipped                                |
| `TODO` / `FIXME` markers in app, lib, components, packages, scripts                                               | None                                                                   |

The September beta-readiness note recorded lint as "non-clean". That is no longer true.

**CI coverage gap.** `apps/web/e2e` holds 82 Playwright specs. CI runs 1 of them in the main job (`organization-access.spec.ts`) and the 7 relational specs in the Postgres job (`playwright.config.ts:11-19`). The other 74 run only when someone runs them by hand.

## 3. Roadmap drift

The October roadmap was written from a 2 October read. 174 commits landed between 1 and 5 October, and several items the roadmap lists as "build" or "wire in" have since landed. The roadmap now understates the product and should be re-based.

| Roadmap item                                                                           | Roadmap (2 Oct) | Code (6 Oct)                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 exit: save → official deadline → reminder email once → deadline change handled | Target          | Verified in production 4–5 Oct (`docs/phase-0-production-runbook.md` log). Google/Microsoft export still unverified.                                                                                                   |
| W7 SMS provider                                                                        | Missing         | Telnyx text reminders for Plus, phone verification, admin pause and test (#169, migration 0087)                                                                                                                        |
| W8 creator billing                                                                     | Missing         | Stripe Plus checkout, portal and webhook (0081–0082). Pro has no checkout (see §6).                                                                                                                                    |
| W10 one alert authority                                                                | Two paths       | Legacy engine delivery skips when creator relational authority is on (`apps/web/lib/alert-delivery.ts:27`)                                                                                                             |
| W11 two tracker paths                                                                  | Two paths       | Still two, selected by `MISSA_CREATOR_RELATIONAL_AUTHORITY` (see §6)                                                                                                                                                   |
| B. Deadline management                                                                 | Build           | Tiers, stages, cycle forecasts, obligation ledger, planning preferences, Season page, status-aware reminders (#182, migration 0088)                                                                                    |
| C. Pre-submit check, D. recovery path                                                  | Build           | Pre-submit and "similar calls" sections in the Tracker sheet (`tracker-item-sheet.tsx:719,884`)                                                                                                                        |
| A. Entitlements                                                                        | Build           | `CREATOR_PLAN_LIMITS` and `planIncludes` in radar-adapters, used in product code                                                                                                                                       |
| A. Decision ledger (not in roadmap)                                                    | —               | `@missa/decisions` package and `data_decisions` ledger (0090). Jev model answers typed questions about catalogue data; shadow mode by default; creator-private data refused unless `JEV_ALLOW_CREATOR_PRIVATE_DATA=1`. |

## 4. Public discovery

**What works**

- `/opportunities` is the live catalogue: search, 14 filter parameters, 5 sorts, cursor paging, `noindex` when filtered, CollectionPage JSON-LD. `/opportunities-preview` is now a permanent redirect to it.
- Opportunity detail hides non-open records from anonymous visitors (404) and shows them to signed-in users.
- Directory pages (`/directory`, `/journals`, `/presses`, `/grants`, `/organizations`, `/residencies`, `/countries`) run on the Postgres profile repository with window, country and sort filters.
- 12 discovery collections at `/discover/[slug]`, a manuscript matcher at `/discover/match`, and static prize data at `/discover/prizes`.
- Magazine and residency rankings, with seed data only outside production or with `MISSA_RANKINGS_SEED_PREVIEW=1`.
- Anonymous capability policy holds for Save, Calendar and Follow: all redirect to signup with a bounded `next`. Opening the official link records only an analytics event (`official-destination-link.tsx:26`), never a status. The public page never downloads an `.ics`.
- Sitemaps, robots, `llms.txt` and a public cached `/api/opportunities` exist.

**Gaps and defects**

- `/guides` does not exist. The README links to it, the IndexNow workflow submits it daily (`.github/workflows/indexnow-refresh.yml:31`), and 7 guides are defined in `lib/discoveryGuides.ts` with no route.
- Two Save buttons behave differently: `SaveToTrackerButton` sends anonymous visitors to `/signup`, the older `SaveOpportunityButton` sends them to `/login`. The card falls back to the older one when `signedIn` is undefined.
- Follow exists only on opportunity detail. Organization, journal, press and residency profiles have no follow button, although the policy says they should.
- The shared sort control offers "recently opened", which `/discover/[slug]` ignores.
- `/waitlist` is live and in the sitemap, but the waitlist redirect is hard-coded off and signup needs no invite. It is a leftover.
- `/publication-claim` is a dead end ("Verification is not available in this release") and nothing links to it. `POST /api/rankings/claim` returns 410.
- "Beta" is a label only: `DISCOVERY_BETA = true` and the gate never fires.

## 5. Creator workspace

**What a signed-in creator can do end to end**

- **Save** a published opportunity. Save creates the official deadline event, default 7-day and 1-day reminders and, on Plus, a default plan (`lib/tracker-save-hooks.ts`). Free accounts are limited to 10 active calls; the Tracker shows the allowance.
- **Track** with 19 statuses, optimistic locking, status events and a material snapshot on first submit. Record a status with a date and note from the record sheet; future dates are rejected; matching reminders are cancelled.
- **Calendar**: month, week, day and agenda views with a deadline lane; personal, preparation, attendance and unavailable events with drag and resize; personal targets; reminders from an event; a private ICS feed with type and alarm filters; Google and Microsoft OAuth export drained by the creator worker.
- **Reminders**: deadline, preparation and response kinds; snooze or cancel; quiet hours and timezone; email through Resend; text through Telnyx for Plus with phone verification.
- **Deadline management**: tiers, stages, forecasts, obligation ledger, planning preferences, Season page with this week's three and crunch weeks.
- **Home**: applications, reminders, goals and recommendations with checklist ticks and response check-ins.
- **Inbox**, **Library** (works, files, saved answers linked to checklists), **Goals** (create, edit, pause, check in, move date), **Profile** and **public portfolio** at `/@handle` with inquiries and invitations, **Onboarding**, **CSV import**, **Plus billing**.
- Email forwarding and Gmail sync exist but are off by default behind `MISSA_EMAIL_FORWARDING_ENABLED` and `MISSA_GMAIL_SYNC_ENABLED`.

**Structural risk: two creator backends**

`MISSA_CREATOR_RELATIONAL_AUTHORITY=1` (`packages/radar-adapters/src/creatorAuthority.ts`) switches the Tracker, Saved, Season and all Tracker writes to the canonical `tracked_opportunities` tables. Home, Calendar, reminders, Goals, Library, Inbox and Profile use Postgres whenever `DATABASE_URL` is set and ignore the flag. `.env.example` ships the flag as 0. The Phase 0 runbook queried `tracked_opportunities` successfully in production, so production appears to have it on, but the mixed configuration is one environment variable away:

- Tracker shows the legacy store while Home, Calendar and reminders show the canonical one.
- Remove, the per-item reminder toggle and personal target return 503; Work linking returns 400.

Even with the flag on, three writes still go only to the legacy store and never reach the canonical Tracker: hosted submit setting "submitted" (`api/submission-paths/[pathId]/submit/route.ts:164-172`, confirmed), withdrawing a hosted submission (`api/me/submissions/[submissionId]/withdraw/route.ts`), and an organization decision setting the creator's status (`api/orgs/[id]/works/[workId]/decision/route.ts`).

**Defects found (confirmed in code)**

1. **Calendar "Add opportunity" cannot add an unsaved call.** The picker searches the whole catalogue and promises "We'll add its deadline first", but `chooseOpportunity` only opens the event editor (`calendar-workspace.tsx:562-583`); the server then rejects the event with "Choose one of your saved applications." The right-clicked day is also discarded (`void day`, line 560).
2. **The per-item "deadline reminders" toggle does not stop default reminders.** It sets `tracked_opportunities.notify`, which only opening alerts and the deadline-changed notice read. `lib/deadline-reminders.ts` never reads `notify`, so default reminders, the deadline-day alarm, tier endings and their emails and texts still send.
3. **Quiet hours apply to in-app reminders and texts, not to change emails.** The reminder email query (`creatorReminderEmail.ts`) has no quiet-hours check, so "deadline moved" and "closed early" emails go out inside quiet hours. Goal check-ins are not held either.
4. **Two "submitted" paths record different dates.** The Tracker card dropdown sends no date, so `submitted_at` becomes the server's UTC midnight; the record sheet uses the creator's local noon. The two also cancel different reminder kinds.
5. **Calendar API allows editing protected events.** `assertPersonalEvent` blocks only the four mirror purposes; the input schema accepts `official-deadline` and `personal-target`, so a client can create, edit or delete those rows. Only the UI prevents it. A second official deadline would hit the unique index and return a 500.
6. **Three timezones.** Onboarding writes `creator_profiles.timezone`; reminders and quiet hours read `notification_preferences.timezone`; Home takes the first reminder's or goal's timezone. The reminder email query also compares deadlines with the database server's date.
7. **Awaiting responses, History and Undo exist only in the design preview** (`applications-design-preview.tsx`, served at `/design-system/applications-v2`). In the live Tracker, `?view=awaiting` and `?view=history` alias to `submissions`, and Remove uses `window.confirm`. The roadmap lists these as improvements to existing features; they are not yet shipped.
8. **Goal check-ins are stored as `deadline-reminder` notices** and recognised in the Inbox by matching text in the reason field.
9. **Two public profile renderers.** `/profile/[userId]` uses the older component unless a handle exists; `/@handle` uses the portfolio version.
10. **Reminders cannot be edited or rescheduled**, only snoozed 1 or 7 days or cancelled.

## 6. Plans and billing

- Free: 10 active calls, no texts, no planning. Plus: unlimited, texts, start-by planning, deadline-day alarm, fee-tier and opening alerts. Pro: adds capacity planning and the full season view (`creatorEntitlements.ts:11-41`).
- Plus has a complete path: Stripe Checkout monthly or yearly with regional prices, billing portal, webhook with out-of-order protection, cancellation on account close. Without Stripe prices the page says "Plus is coming soon."
- **Pro cannot be bought or assigned.** The only checkout is `startPlusCheckout`; the only writes to `creator_plans` are the Plus webhook path and test fixtures. Yet `/season` shows three "Included with Pro. See Pro" hints that link to `/plan`, which offers only Plus. Either add a Pro checkout or remove the Pro hints and fold capacity and season into Plus until it exists.
- Organization billing (indie, pro, program) exists in code but is off behind `MISSA_ORG_BILLING_ENABLED`, and nothing applies a paid org subscription to `billingTier`. Submission fee checkout requires a Stripe Connect state that nothing ever sets. Admin refund actions fail closed by design.

## 7. Organization, reviewer and admin

- **Authority flag splits the org product in two.** With `MISSA_WORKSPACE_RELATIONAL_AUTHORITY=1`, `getWorkspaceEngine()` throws, so the overview, opportunities, new opportunity, insights, people, settings, delivery, reviews, legacy workspace and submissions pages all fail. With it off, `/portal` and about 25 org API routes (inbox views, exports, erasure, reassign, decision messages, review settings, versions) return 503. `PATCH open-calls/[id]` returns 501 when it is on. There is no configuration in which the whole org product works.
- **No self-serve organization creation.** `/organization` offers a `mailto:` link; organizations are created only through fixtures and the CLI. Members can be added by API or SCIM.
- **Reviewer UI is read-only.** `reviewer-evidence-desk.tsx` says "Review controls are not available yet"; the review POST endpoint exists for both modes.
- **Hosted applications** work for draft, upload and submit in both modes, but upload needs blob storage and a malware scanner; without `MALWARE_SCAN_PROVIDER` it fails closed with 503 in production.
- **Opportunity claims** have an engine model but no web API; admin only shows counts.
- **Admin** is gated on `account.isAdmin`. Write surfaces: operations queue retries, support cases, CRM notes, taxonomy approvals, agent control requests, Gary queue, publication review, content review, magazine windows, deadline facts, SMS pause and test, metric shares. No admin API adds or edits sources.
- `/for-organizations` is honest about this: it labels reviews, communication, people/billing and insights as limited and delivery as planned.

## 8. Background jobs

| Scheduler                                                                                                       | Job                                                                                                                                                                                         | Creator feature depending on it       |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Railway `creator-worker`, every 60 s                                                                            | Deadline sweep, obligation recalculation, forecasts, opening alerts, status-aware reminders, email and text delivery, digest, goals, followed programs, calendar mirror and provider export | Tracker, Calendar, reminders, Season  |
| Railway cron, daily                                                                                             | `run-daily-freshness.mjs`: auto-close past deadlines, HEAD-check stale guideline links, harvest Submittable, Res Artis, Rivet, TransArtists, CuratorSpace, reconcile magazine windows       | Catalogue freshness and new listings  |
| Vercel `/api/cron/tick`, every 15 min                                                                           | Goals tick, legacy engine alert emails (skipped under relational authority), coverage and taxonomy passes                                                                                   | Alert digests, goals                  |
| Vercel `gmail-sync`, `submission-cleanup`, `observability`, `weekly-digest` (admin digest), `magazine-rankings` | As named                                                                                                                                                                                    | Gmail import, hosted drafts, rankings |
| Railway radar, research, enrichment, review, taxonomy-discovery workers                                         | Ingestion pipeline                                                                                                                                                                          | Catalogue                             |

Notes: `tickGoals` runs in both the Vercel tick and the creator worker; it is protected by `on conflict do nothing`. `docs/railway-topology.md:63` says `vercel.json` lists three crons; it lists six. The content worker is implemented but not provisioned. Ingestion v2 remains shadow-only and refuses to run against production without explicit approval.

## 9. Product-rule compliance

| Rule                                                                         | Finding                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No creator-facing AI                                                         | Holds. Jev decisions are internal, shadow by default, and never write text. The creator question set (#192) can only narrow, reorder, hold or ask; creator-private data is refused without an explicit no-retention flag. `/ask` chat is behind `MISSA_CHAT_ENABLED` and redirects when off. Worth a stated policy on whether chat will ever ship. |
| Submission status confirmed by the creator; opening a link is never evidence | Holds for the external link (analytics event only). Email suggestions propose and the creator confirms. Hosted submit does set "submitted", which is correct since Missa observed it, but only in the legacy store (§5).                                                                                                                           |
| Every status, estimate and change explained                                  | Mostly holds. Deadline labels (Confirmed, Predicted, Changed, Needs checking) carry provenance and last-checked time. Migration 0091 removed invented defaults; 0088 cleared placeholder response statistics. Goal check-ins masquerading as deadline reminders is the exception.                                                                  |
| Calm register, no guilt UI                                                   | Holds in the copy reviewed. Season page uses "this week's three" rather than streaks.                                                                                                                                                                                                                                                              |
| Organization authority visible, provenance out of public UI                  | Holds; listing platforms are kept off Missa (#200).                                                                                                                                                                                                                                                                                                |

## 10. Recommended order of work

1. **Close the Pro gap** before anyone sees `/season`: add Pro checkout or remove the Pro hints and regrade capacity and season into Plus.
2. **Make the canonical Tracker the only write target.** Route hosted submit, withdraw and organization decision writes through `canonicalTracker`, and either retire the legacy branch or make the flag's absence impossible in production.
3. **Fix the reminder toggle and quiet hours** so the per-item toggle gates default reminders and change emails respect quiet hours. Unify the three timezone sources on `notification_preferences.timezone`.
4. **Fix the Calendar "Add opportunity" flow**: save to Tracker first, then open the editor; keep the right-clicked day; reject protected purposes server-side.
5. **Unify the "submitted" paths** so both record the creator's local date and cancel the same reminder kinds.
6. **Ship or remove** Awaiting responses, History and Undo from the roadmap's "Improve" list; they are preview-only today.
7. **Decide the org authority flag.** Pick one mode, make every org page and API work in it, and remove the other.
8. **Run more of the e2e suite in CI**, at least the creator product specs (calendar, tracker, inbox, library, goals, plan).
9. **Clean up public leftovers**: ship or drop `/guides` and stop submitting it to IndexNow; retire `/waitlist` and `/publication-claim` or link them; use one Save button; add Follow to profile pages.
10. **Re-base the roadmap** on this read, and verify Google/Microsoft export in production to finish Phase 0.
