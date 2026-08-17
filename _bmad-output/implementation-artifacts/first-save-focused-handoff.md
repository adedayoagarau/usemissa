---
title: "First-Save focused handoff"
type: "feature"
created: "2026-08-17"
status: "done"
baseline_commit: "0074fe81a8b0f324ff42eb85b5ac97d77aa1c5b5"
context:
  - "{project-root}/DESIGN.md"
  - "{project-root}/docs/missa-content-style-guide.md"
  - "{project-root}/docs/missa-auth-onboarding-contract-2026-08-08.md"
  - "{project-root}/_bmad-output/planning-artifacts/missa-first-save-onboarding-journey-specification-2026-08-16.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Signed-out Save currently puts the action in the URL, authentication performs an unreviewed client-side Tracker write, and the person returns to the public page without a focused next action. A source change, lost response, or repeated request can therefore produce ambiguous feedback even though the canonical Tracker table already prevents duplicates.

**Approach:** Add a short-lived, signed, HttpOnly first-Save intent; revalidate its material Opportunity facts after authentication; reconcile an idempotent canonical Tracker result; and hand the person to the existing Tracker with one contextual, dismissible next action. Reuse the approved focused-handoff visual direction and existing auth/Tracker pages instead of creating a tour or Profile wizard.

## Boundaries & Constraints

**Always:** Keep public Opportunity reading open. Create intent only after explicit Save. Use an allowlisted same-origin return path and a 30-minute signed cookie containing a bounded Opportunity snapshot, expiry, nonce, and journey ID. Never place private intent state in a URL. Re-check status, deadline, fee, source, eligibility digest, and application destination before saving. Treat created and already-saved as different canonical receipts. Preserve `Invalid email or password`, password-manager behavior, field-associated errors, focus/status announcements, and the private/eligibility/submission boundaries. Analytics must use allowlisted domain properties and server authority for writes.

**Ask First:** Any database migration, server-persisted cross-device anonymous intent, production deployment, feature promotion beyond the existing Opportunity/auth/Tracker routes, or change to waitlist/invitation policy.

**Never:** Require Profile completion, preferences, Work upload, notification/calendar/integration permission, public publication, automatic eligibility, or automatic submission. Do not claim the same-browser signed cookie is cross-device persistence. Do not send passwords, answers, files, eligibility details, arbitrary URLs, or names to analytics.

## I/O & Edge-Case Matrix

| Scenario                | Input / State                                                            | Expected Output / Behavior                                                                  | Error Handling                                                 |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| New or returning person | Signed-out public Opportunity, explicit Save                             | Cookie intent; auth explains private persistence; successful auth resumes exact Opportunity | Auth failure retains intent and entered email where safe       |
| Current Opportunity     | Intent snapshot matches current canonical facts                          | Create-or-get Tracker item; return created or already-saved receipt and next action         | Lost response is reconciled by retrying the same intent        |
| Material change         | Deadline, fee, source, eligibility, destination, or availability differs | Show old/current fact before write; require explicit acknowledgement of current version     | A second change causes another review, never a stale save      |
| Closed or removed       | Current state cannot be saved normally                                   | Do not write; explain state and link back to the public record/source where safe            | Temporary repository failure keeps intent for retry            |
| Duplicate/multi-tab     | Same account and Opportunity requested repeatedly                        | Return one canonical Tracker row; each journey event deduplicates by journey/transition     | Unique constraint or legacy lookup reconciles to already-saved |
| Interrupted browser     | Redirect/write/response interruption within 30 minutes                   | Resume from cookie and canonical state without duplicating                                  | Expired/tampered intent is cleared with a recoverable restart  |

</frozen-after-approval>

## Code Map

- `apps/web/lib/authRedirect.ts` -- same-origin return-path contract; legacy URL intent must stop being the primary path.
- `apps/web/components/opportunity-detail-view.tsx` and `opportunity-catalogue-card.tsx` -- current signed-out Save links.
- `apps/web/components/save-to-tracker-button.tsx` -- explicit Save control and direct signed-in mutation.
- `apps/web/components/auth-form.tsx` -- auth, intent context, revalidation/review, and recovery states.
- `apps/web/app/api/me/tracker/route.ts` -- current legacy/Postgres create-or-get boundary.
- `packages/radar-adapters/src/canonicalTracker.ts` -- relational transaction and unique Tracker authority.
- `apps/web/components/tracker-product.tsx` -- existing next-action UI and contextual handoff target.
- `apps/web/lib/platformAnalytics.ts` -- first-party server event ledger.

## Tasks & Acceptance

**Execution:**

- [x] `apps/web/lib/firstSaveIntent.ts` plus tests -- sign, verify, expire, fingerprint, and compare bounded material snapshots.
- [x] `apps/web/app/api/journey/first-save/intent/route.ts` -- validate the public Opportunity, issue the HttpOnly intent, and record intent/auth-required transitions.
- [x] `apps/web/app/api/journey/first-save/resume/route.ts` -- authenticate, revalidate, block or request review, acknowledge only the current fingerprint, create-or-get, retain recovery through a lost receipt, and return a receipt/next action; Tracker handoff or explicit decline clears the intent.
- [x] Opportunity Save surfaces -- replace URL-carried intent with the intent API while preserving keyboard, loading, retry, and decline paths.
- [x] Auth pages and `auth-form.tsx` -- render exact Opportunity/private context and the revalidation, changed, closed, error, success, and already-saved states without collecting extra data.
- [x] Tracker page/product styling -- consume a tab-scoped receipt, focus the canonical item, present one meaningful action, and support dismiss/replay without a mandatory ritual.
- [x] Analytics route/tests -- allow and validate the named journey transitions with bounded properties and idempotency keys.
- [x] Focused integration tests -- cover signup/login, existing account, invalid credentials, material change, closed state, lost response, duplicate save, decline, expiry, and accessible keyboard/status behavior.

**Acceptance Criteria:**

- Given a public Opportunity, when Save is chosen, then authentication is requested only for private persistence and the exact bounded intent survives same-browser interruption.
- Given successful authentication, when the intent resumes, then current canonical facts are checked before one idempotent Tracker result is presented.
- Given a changed or closed Opportunity, when revalidation completes, then reliance on stale facts is blocked until review or safe exit.
- Given created or already-saved canonical state, when Tracker opens, then the matching private item and one real next action are identifiable, optional guidance can be dismissed/replayed, and Save is never described as eligibility or submission.

## Spec Change Log

- 2026-08-17: Kept the signed intent until Tracker handoff so a successful write with a lost response can reconcile as already saved; explicit decline and completed handoff clear it.
- 2026-08-17: Three independent reviews were deduplicated and resolved. The patch now binds intent and receipts to the authenticated account and exact journey, treats analytics as non-authoritative, detects same-host path changes, persists legacy retries, moves first-action evidence to canonical mutations, and hardens focus, optional-name, error, and multi-tab recovery. Transactional Opportunity locking, dispute authority, provider verification, and durable recommendation provenance remain explicit domain/service gates in `deferred-work.md`.

## Design Notes

The signed cookie is recovery state, not a database authority. Postgres Opportunities and `tracked_opportunities` remain authoritative when configured; the legacy Radar store remains the local fallback. Cross-device anonymous intent requires separately approved server persistence and must remain explicitly unclaimed in this slice.

## Verification

**Commands:**

- `npm run lint` -- expected: zero warnings and errors.
- `npm run typecheck` -- expected: all workspaces pass.
- Focused Node/route tests -- expected: intent tamper/expiry, material comparisons, duplicate reconciliation, and analytics property controls pass.
- Focused Playwright journey tests -- expected: mobile and desktop paths complete with no duplicate rows, lost intent, inaccessible errors, or horizontal overflow.

**Local evidence (production unverified):**

- `npm run typecheck` -- passed after the review fixes.
- `npm run lint` -- passed with zero warnings after the review fixes.
- `NODE_OPTIONS='--conditions=react-server' npx tsx --test lib/authRedirect.test.ts lib/firstSaveIntent.test.ts app/api/analytics/events/route.test.ts` -- 10 of 10 passed.
- `PLAYWRIGHT_BASE_URL='http://127.0.0.1:3101' npx playwright test e2e/first-save-focused-handoff.spec.ts --project=chromium --workers=1` against an isolated demo-backed checkout -- 6 of 6 passed, including optional-name mobile signup, existing-account recovery, changed/closed state, lost response and duplicate reconciliation, decline, expiry, focus, Axe, and reflow checks.

## Suggested Review Order

**Canonical lifecycle**

- Start with account binding, revalidation, change review, and idempotent reconciliation.
  [`resume/route.ts:41`](../../apps/web/app/api/journey/first-save/resume/route.ts#L41)

- See how explicit public Save creates the bounded HttpOnly intent.
  [`intent/route.ts:17`](../../apps/web/app/api/journey/first-save/intent/route.ts#L17)

- Confirm relational and legacy writes share one create-or-get boundary.
  [`saveOpportunityToTracker.ts:17`](../../apps/web/lib/saveOpportunityToTracker.ts#L17)

**Authentication and recovery**

- Review optional-name authentication, account recovery, and single-owner resume behavior.
  [`auth-form.tsx:163`](../../apps/web/components/auth-form.tsx#L163)

- Verify decoded redirects stay within ordinary customer destinations.
  [`authRedirect.ts:2`](../../apps/web/lib/authRedirect.ts#L2)

**Tracker value and evidence**

- Inspect canonical status mutations and signed first-action completion evidence.
  [`status/route.ts:14`](../../apps/web/app/api/me/tracker/%5BopportunityId%5D/status/route.ts#L14)

- Review focused-item handoff, optional guidance, dismissal, and replay.
  [`tracker-product.tsx:766`](../../apps/web/components/tracker-product.tsx#L766)

**Validation**

- Follow the mobile, auth, change, interruption, duplicate, decline, and expiry fixtures.
  [`first-save-focused-handoff.spec.ts:29`](../../apps/web/e2e/first-save-focused-handoff.spec.ts#L29)

- Check material snapshot, source-path, expiry, tamper, and receipt-claim coverage.
  [`firstSaveIntent.test.ts:59`](../../apps/web/lib/firstSaveIntent.test.ts#L59)
