# Scope Boundaries & Risks

**No requirement from the source documents has been silently dropped.** Every MVP-Organization-Side and MVP-User-Side item listed above is carried forward as in-scope, even though most are unbuilt — "unbuilt" is a status, not a scope decision. Growth and Vision tiers reflect the strategy doc's own phasing (§30 MVP scope + §31 explicit deferrals), not phasing invented for this PRD.

**Key risks, carried forward from the strategy doc plus what the codebase audit surfaced:**

1. **Unit economics risk**: an Indie-heavy customer mix is explicitly flagged by the strategy doc's own modeling as unprofitable without cost discipline. This needs real tracking from the first paying cohort, not just at some future finance review.
2. **Branch/process risk**: this project had three divergent branches (`main`, `claude/missa-opportunity-layer-b6kk1a`, `cursor/opportunity-source-registry-d193`) with real unmerged work sitting in each, and no CI to catch drift. Recommend actual CI (build + test on every PR) as close to immediately as possible — see Non-Functional Requirements.
3. **Vocabulary-consistency risk**: the naming-decision rename has already had to be reapplied once after new Workspace/Admin UI landed on `main` without being checked against it (see the [PR #13](https://github.com/adedayoagarau/usemissa/pull/13) fixes). Every new UI surface must be checked against `docs/missa-naming-decisions.md` before merge — this should become a review checklist item, not a one-time audit.
4. **Item-level decision model risk** (see Innovation section): getting Submission-vs-Work wrong at the start of Workspace development is expensive to fix later.
5. **Web-scraping/legal risk**: production-scale fetching must stay robots-aware and cadence-limited per source (already a non-negotiable rule in `radar-engine-spec.md` and enforced in the `PlaywrightFetcher`'s robots.txt check) — this is a real compliance/reputational risk if violated at scale, not just a politeness nicety.
6. **Concurrency risk in the store layer**: the discovery findings note the historical `radar-app` design had a documented read-whole/write-whole race across concurrently cold-started serverless instances. If/when a serverless deployment path is resumed, this needs a real fix (row-level Postgres writes, not JSON blob read-modify-write), not a re-inherited known bug.

---
