# Project Structure & Boundaries

## Complete Project Directory Structure (target — additions marked NEW)

```
usemissa/
├── .github/
│   └── workflows/
│       └── ci.yml                          # NEW — install, build, test on every PR
├── docs/                                    # unchanged
├── landing/                                 # unchanged — static marketing site at "/"
├── _bmad-output/                            # this planning output
├── apps/
│   └── web/                                 # NEW — Next.js 16 production app
│       ├── app/
│       │   ├── (passport)/                  # submitter-facing routes: Home, Opportunities, Tracker, Library, Calendar, Messages, Insights
│       │   ├── (workspace)/                 # org-facing routes: Opportunities, Submissions, Reviews, Decisions, Messages, Delivery, Insights, Settings
│       │   ├── (admin)/                     # verification queue, claim review, registry health
│       │   └── api/
│       │       ├── auth/                    # bridges to radar-engine's existing session/account primitives
│       │       ├── cron/tick/                # Vercel Cron target, CRON_SECRET-gated, replaces manual tick button in prod
│       │       ├── orgs/[id]/open-calls/     # NEW workspace-engine-backed routes
│       │       ├── orgs/[id]/submissions/
│       │       ├── orgs/[id]/review-rounds/
│       │       └── billing/                 # Stripe webhooks + Connect onboarding (built when Payments FRs are picked up)
│       ├── components/
│       ├── lib/
│       └── package.json
├── packages/
│   ├── radar-engine/                        # existing — unchanged in shape, extended cautiously
│   ├── radar-adapters/                      # existing — unchanged in shape
│   └── workspace-engine/                    # NEW — Submission-management domain
│       ├── src/
│       │   ├── domain/types.ts              # Entity/Program/OpenCall/SubmissionPath/Submission/Work/ReviewRound/Decision/DeliveryTask
│       │   ├── db/schema.ts                 # Drizzle schema for the tables above
│       │   ├── open-calls/
│       │   ├── submissions/
│       │   ├── review/
│       │   ├── decisions/
│       │   └── delivery/
│       ├── test/
│       └── package.json
├── package.json                             # add "apps/*" to workspaces
└── vercel.json                              # updated — see Deployment Boundaries below
```

## Architectural Boundaries

**API boundaries:** `apps/web/app/api/**` is the only production HTTP surface going forward. `radar-engine`'s own `server.ts`/`ui.ts` remains reachable only via the `missa-radar serve --demo` CLI path — it must never be the target of a production Vercel deployment once `apps/web` exists, to avoid two divergent API surfaces answering the same questions differently.

**Component boundaries:** `workspace-engine` may import types and functions from `radar-engine` (Account, Session, Opportunity, claim flow); `radar-engine` must **never** import from `workspace-engine` — the dependency direction is one-way, so Radar stays deployable/testable independent of Workspace.

**Service boundaries:** None — this is deliberately a single deployable (Next.js app + its workspace-package dependencies), not multiple services. The only "external services" are third-party APIs (Stripe, Postmark, WorkOS when adopted) called from within `apps/web`'s route handlers or from adapter packages, never a second internally-deployed service.

**Data boundaries:** One Postgres database; `radar-engine`'s existing tables and `workspace-engine`'s new tables can reference each other via real foreign keys (see Data Architecture). No separate database per domain.

## Requirements to Structure Mapping

| PRD capability area | Lives in |
|---|---|
| Radar — Discovery & Intelligence (FR1-13) | `packages/radar-engine` + `packages/radar-adapters` (existing) |
| Opportunities & Fit, Tracker (FR14-27) | `packages/radar-engine` (existing) + new UI in `apps/web/app/(passport)/` |
| Library (FR28-30) | New: `packages/radar-engine/src/library/` (submitter-owned content, closer to Radar's user-domain than Workspace's org-domain) + `apps/web/app/(passport)/library` |
| Accounts, Auth & Passport (FR31-36) | `packages/radar-engine/src/auth` (existing, extended) + `apps/web/app/(passport)/` profile pages |
| Missa Workspace — Organizations (FR37-49) | `packages/workspace-engine` (new) + `apps/web/app/(workspace)/` |
| Enterprise (FR50-52) | `packages/workspace-engine` (role/team extensions) + `apps/web/app/(workspace)/settings` — **deferred**, structure reserved not built |
| Payments & Billing (FR53-54) | `apps/web/app/api/billing/` + a thin `packages/workspace-adapters/src/stripe.ts` adapter (new, small — doesn't warrant a whole new package tier the way Radar's adapters did) |
| Import/Migration (FR55-57) | `packages/workspace-engine/src/import/` — **Growth tier**, structure reserved not built |
| Props (FR58) | `packages/radar-engine/src/props/` (submitter-side, small) — **Growth tier**, structure reserved not built |

---
