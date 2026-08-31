# Phase 3 — Opportunities promotion and retirement plan

Date: 2026-08-31

Branch: `codex/phase-0-opportunities`

Status: In progress — promotion preflight

## Current authority and exposure

- The production API at `www.usemissa.com/api/opportunities` returned 556 published records on 2026-08-31.
- The bounded public source projection contained only `kind`, `name`, and `url`.
- The production customer route `/opportunities` redirects to `/waitlist` by explicit proxy policy.
- The read-only catalogue preview is reachable and returned the same 556-record authority.
- The latest Vercel production deployment is Ready, but that status alone is not UI or data-health proof.

Phase 3 will not change the waitlist policy. Public-shell exposure is a separate product decision.

## Promotion sequence

1. Add server-rendered presentation attribution and include the presentation in existing first-party discovery/view analytics.
2. Build the committed branch in production mode with all declared internal packages.
3. Let the server resolver select `disclosure-v2` by default in Vercel Preview while retaining `legacy` in Vercel Production. An explicit environment value remains the emergency override in either environment.
4. Deploy the branch as a Vercel Preview; do not use `--prod` and do not move production aliases.
5. Run the read-only observation harness against Preview at 390px and 1440px.
6. Confirm API/UI title, slug, source, total, metadata, responsive, accessibility, console, and presentation equivalence.
7. Separately verify anonymous Save intent only where the environment is isolated; never create Tracker, Follow, report, or preparation records against shared production data.
8. Record the observation window and rollback criteria before requesting production promotion.

## Rollback criteria

Keep `legacy` and both legacy components while any of these remain unproven:

- preview uses a different or unclear repository authority;
- presentation attribution is missing or inconsistent;
- browse/detail diverge from the bounded API projection;
- source or application handoffs diverge;
- metadata, accessibility, responsive containment, or hydration checks fail;
- Save/Tracker cannot be certified in an isolated authenticated environment;
- production public-shell exposure remains intentionally closed.

## Retirement gate

Legacy removal is not part of the preflight. It requires an observed production rollout, a defined observation window, clean first-party presentation metrics, verified rollback, and an explicit decision about the waitlist/public-shell policy. Repository selection, publication gates, Postgres configuration, and API response contracts remain unchanged.
