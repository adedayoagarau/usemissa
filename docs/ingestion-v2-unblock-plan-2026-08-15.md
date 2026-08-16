# v2 unblock plan — from 0.5% approval to a growing catalog

**Date:** 2026-08-15
**Goal (unchanged):** v2 publishes 50 correct opportunities to usemissa.com end to end, no Radar involvement.
**Ground truth this plan rests on** (measured against production, not assumed):

| Fact | Number |
|---|---|
| v2 runs / 24h | 1,016 (full registry sweep works) |
| Fetch success | 589 (58%) — 196 dead URLs, 83 blocked hosts |
| Publisher approvals | **3 of 589 (0.5%)** |
| v2 canonical records ever | 1 |
| Radar published since yesterday | +127 (122 → 249) |
| Reviewable records with no deadline | 1,480 of 2,363 (63%) |
| Model cache entries | 0 (unverified whether broken or just young) |
| Repair outcomes | 0 repaired / 2 needs-review / 61 unresolved |

---

## Blocker 1 — the publisher structurally rejects 98% of the registry

**Root cause, traced to lines:** `catalog.ts:50` gives every registry source
`destination: { pageRole, detailLimit }` — **no rules array**. Without rules,
`classifyDestination` marks every link `role: "unknown", authority: "source"`.
`isPotentialDestination` only rescues external links on `kind: "directory"`
sources — and 1,028 of 1,042 trusted sources are `organization-website`. So
`deterministicReconciliation` finds zero candidates and rejects with "No
authoritative detail or application link was classified."

**Why the rule itself is wrong, not just the config:** demanding an outbound
first-party link is the correct test for a *directory* (Res Artis must point
to Casa na Ilha). An organization's own site **is** first-party; demanding it
link outward to prove itself is asking the destination to link to a
destination.

**Fix** (in `publisher.ts`, one new branch ahead of the candidate loop):
- If `source.kind === "organization-website"` or `"profile"`: the fetched
  source page itself satisfies the destination requirement.
  `authoritativeUrl = sourceSnapshot.finalUrl`, reconciliation `pass` with a
  new basis `"first-party-source"`. Same-host detail candidates may still
  refine the URL when present.
- The DeepSeek publisher review **still runs** — its job shifts from "does
  the destination match the source" to "is this page actually a live
  opportunity", which is the risk that remains on an org page.
- Directories keep the existing path unchanged: external first-party
  destination, fetched, reconciled by identity. No weakening.

**Tests:** (a) an org-website source with no rules and no outbound links now
passes reconciliation with its own URL; (b) a directory source with no
reconcilable destination still rejects — the Res Artis regression tests must
stay green; (c) `basis: "first-party-source"` is recorded so approvals from
this path are distinguishable in the decision log.

**Verify live:** rerun one scheduled tick; approval count must move from
~3/day to hundreds. Spot-check 5 approvals by hand.

## Blocker 2 — 63% of records can never pass freshness (deadline parser)

**Root cause:** adapters emit deadlines as human text ("January 15, 2026");
`canonicalWriter.ts` `date()` accepts only `/^\d{4}-\d{2}-\d{2}$/` and
discards everything else → `deadline_date` null → `freshness_ok` false in the
`missa_publication_gate` trigger → unpublishable forever.

**Fix:** normalize at the writer boundary using radar-engine's existing
parser (`parseDate`, `isPlausibleOpportunityDate` — already a dependency, no
new code): parse raw deadline text against the run date, accept only
plausible ISO results, set `deadline_kind` correctly. Also stop hardcoding
`status: 'open'` blindly: an already-past deadline writes as closed, never
as an open record the browse query has to defend against.

**Tests:** "January 15, 2027" → `2027-01-15/exact`; "Deadline: March 1" →
year inferred forward, never backward; garbage → null/unknown; past deadline
→ not written as open.

**Verify live:** re-promote the benchmark P&W source; `deadline_date` lands
as a real date in production.

## Blocker 3 — nothing v2 writes reaches the site (publish flag off)

**Not a code fix — a supervised rollout, gated on 1+2:**
1. Dry-run the publication tick; read every decision.
2. `MISSA_INGESTION_V2_PUBLISH=1` with `V2_PUBLISH_LIMIT=10`.
3. Hand-check each published record on usemissa.com: correct title, real
   deadline, destination goes to the organization.
4. Widen the limit only after two clean batches. Any wrong record: flag off
   (one env var — that is the rollback), fix, repeat.

The DB trigger stays as the last line of defense: if v2 tries to publish an
unready record, Postgres raises and the transaction rolls back.

## Blocker 4 — a fifth of the registry is dead weight

196 `not-found` + 83 `blocked` sources re-fetched daily. **Fix:** a bounded
script that marks sources inactive after N consecutive `not-found`/`blocked`
runs (N=3, from `missa_ingestion_v2_runs` history), written as a report
first, applied second — same dry-run-then-apply pattern as everything else.
Not deleted: marked, reversible, and the blocked list becomes the render
service's first real work queue later.

## Blocker 5 — model cache shows 0 entries

Unverified whether broken or just younger than the last scheduled tick.
**Fix:** observe one tick after deploy; if still 0, instrument the `set()`
failure path (it currently swallows errors by design — correct for runs,
wrong for diagnosis) and fix what it reveals. Decision, not assumption.

## Blocker 6 — the quarantined backlog needs human eyes, not more heuristics

63 attempts: 0 auto-repaired. Proven low-yield. **Fix:** extend the existing
admin workbench (route + component already exist) with a needs-review queue:
show the record, the candidate destination, the evidence; one click approves
(writes the same repair evidence the auto path would) or rejects. Human
confirmation takes seconds per record and is the only honest path for
"SIM Residency | APPLY"-shaped ambiguity.

## Blocker 7 — Radar is still the only thing growing the catalog

No new work — a **retirement criterion** so this ends: once v2 has published
50 correct records (goal above) and held two consecutive weeks of clean
supervised batches, Radar's review agent is paused (service off, not
deleted), and v2's publication tick becomes the only publisher. Until that
criterion is met, Radar keeps running; nothing in this plan touches it.

---

## Order and effort

| Step | Blocker | Size | Gate to next |
|---|---|---|---|
| 1 | Org-website destination rule | small, high care | approvals jump on a real tick |
| 2 | Deadline parser | small | real deadlines in production rows |
| 3 | Supervised publish, 10 at a time | config + review time | two clean batches |
| 4 | Registry hygiene script | small | failure noise drops |
| 5 | Cache verification | trivial → unknown | entries > 0 |
| 6 | Needs-review workbench queue | medium | backlog moves |
| 7 | Radar pause | decision | 50-record criterion |

1 and 2 land together (2 is pointless without 1; 1 is invisible without 2).
3 is the milestone. 4–6 run behind it in any order. 7 is the finish line.

**Risks named:** the org-website branch is publisher-side relaxation — the
care spent on it goes into the directory regression tests, because the
failure mode is re-opening the door the 357 quarantine closed. The deadline
parser's failure mode is a wrong year on a real deadline — the plausibility
guard and the supervised batch both exist to catch exactly that before a
creator sees it.
