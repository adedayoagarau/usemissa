# Success Criteria

## User Success

A submitter feels Missa is "worth it" when:
- They stop maintaining a spreadsheet because Missa's tracker already reflects reality (deadline moved, call closed, reopened) without them checking anything manually.
- An alert tells them something changed *and why* — never an unexplained ping.
- Missa surfaces an opportunity they wouldn't have found themselves, scored against their own profile with a legible reason.
- **[decision] Proposed measurable outcome:** a submitter's tracked-and-Missa-verified opportunities require zero manual freshness upkeep — i.e., the user never has to re-check a listing Missa already tracks to know if it's still open.

## Business Success

From the strategy doc's own framing, sharpened here for measurability:

- **Activation metric — Time to Live Open Call** (doc §4, line 4577): the north-star onboarding metric. Target thresholds by segment: small magazine live in **<15 minutes** from signup; enterprise rollout live in **2–4 weeks**. **[decision]** treat this as the primary activation KPI to instrument from week one of Workspace development — every onboarding flow decision should be judged against it.
- **Beachhead-to-expansion sequencing** (doc §"Product Discovery Findings," line 7543): launch and prove value with **writers + small/mid-size literary magazines**, then expand to contests → fellowships/residencies → arts grants → awards → universities → enterprise, in that order. **[decision]** this sequencing should gate scope: don't build enterprise-only features (SSO/SCIM rollouts, multi-entity billing) before the beachhead segment has organic paying customers.
- **Revenue model validation:** Indie ($15/mo) → Pro ($39/mo) → Program ($99/mo) → Program Pro ($199/mo) → Enterprise Starter ($4,800/yr) → Enterprise ($9–12k/yr), plus 1.5%-capped-at-$1.50 payment take rate. The strategy doc's own unit-economics section warns that an Indie-heavy mix is unprofitable without cost discipline — **this is a real business risk, not a solved problem**, and should be tracked from the first paying cohort.

## Technical Success

- The deterministic-validators-first architecture must hold as new adapters (LLM extraction, web-scale sources) are added — a regression here (an unvalidated AI-extracted fact reaching a user as fact rather than a scored candidate) is a trust failure, not a bug.
- Radar's existing 50/50 test pass rate (44 radar-engine + 6 radar-adapters, verified on the consolidated branch) must be maintained as a non-negotiable gate — every new Workspace feature that touches the shared domain model needs equivalent test coverage before merge.
- Zero vocabulary leaks of internal names (`SubmissionPath`, `Trust Layer`, verb-module names, raw status slugs) into user-facing surfaces — this PRD inherits the naming-decision doc as binding, not optional style guidance (see [Terminology Reference](#terminology-reference)).

## Measurable Outcomes

- [decision] Median time from organization signup to first live open call: **<15 min** (small orgs), **<4 weeks** (enterprise).
- [decision] Radar freshness: percentage of tracked opportunities with a "last checked" timestamp under the source's configured cadence — target **>95%** once seed-source ingestion is running in production (not yet measurable; no production ingestion is live today).
- Duplicate rate and trust-score distribution are already exposed as engine metrics (`packages/radar-engine` stats snapshot) — carry these into a real operator dashboard rather than re-deriving them.

---
