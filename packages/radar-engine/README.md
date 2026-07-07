# @missa/radar-engine

Missa Radar — the opportunity intelligence engine. It discovers, structures, monitors, updates,
and predicts open opportunities (calls, grants, awards, fellowships, festivals, contests, …) and
turns them into personalized, trustworthy signal for **users** (submitters) and
**organizations**. Spec: [`docs/radar-engine-spec.md`](../../docs/radar-engine-spec.md), distilled
from [`docs/missa-strategy.md`](../../docs/missa-strategy.md).

## Try it

```bash
npm install
npm test          # 25 tests, node:test
npm run demo -w @missa/radar-engine
```

The demo simulates a month of Radar against fixture pages: discovery of 5 seed sources, dedup of
a directory listing with a **conflicting deadline** (→ Needs Verification + admin queue), a
scam-flavored contest (→ trust 0 + suspicious-language task), self-explaining **fit scores**, an
organization **claiming** its discovered call via domain match, a **deadline extension** detected
and alerted, the call **closing** (cycle recorded), and a **predicted reopening** with a proactive
alert two weeks ahead.

## One tick = the whole pipeline

```
schedule → fetch → snapshot(hash) → change-detect → extract → validate
  → dedup/canonicalize → upsert (version + field-level change records)
  → score (freshness · confidence · trust) → derive status → predict reopenings
  → match saved searches → alert users/orgs → verification sweep
```

```ts
import { RadarEngine, HttpFetcher } from '@missa/radar-engine';

const engine = new RadarEngine({ fetcher: new HttpFetcher() });
engine.addSource({ name: 'North River Review', url: 'https://…/submissions', kind: 'organization-website' });
const ada = engine.addUser({ displayName: 'Ada', genres: ['poetry'], attributes: {} });
engine.createRadarProfile(ada.id, 'No-fee poetry', { genres: ['poetry'], noFeeOnly: true });

await engine.tick();                    // run on a schedule (cron/Temporal)
engine.getInboxDigest(ada.id);          // "Missa Radar found N updates for you: …"
engine.fitFor(ada.id, opportunityId);   // ✓ reasons / ⚠ watch-outs / ✕ disqualifiers
```

## Design rules (from the strategy doc)

- **Not purely AI.** The shipped extractor is deterministic; an LLM extractor can plug into the
  `Extractor` port but everything passes the same deterministic validators (dates, fees, URLs,
  plausibility windows).
- **Evidence everywhere.** Raw page snapshots, immutable versions, field-level change history,
  per-signal trust breakdowns, and every alert carries its reason.
- **Conflicts are surfaced, never resolved silently.** Two sources disagreeing on a deadline ⇒
  `Needs Verification` + an admin queue task; a claimed organization's edits are authoritative.
- **Curated sources, polite crawling.** Per-source cadence with failure backoff; swap the
  built-in fetcher for Crawlee + Playwright behind the `Fetcher` port.
- **Ports & adapters.** `Fetcher`, `Extractor`, `Clock`, and the store are injectable; the
  in-memory/JSON store is the dev adapter, Postgres is the production target.

## Layout

| Path | What lives there |
| --- | --- |
| `src/domain/types.ts` | The full data model (Source → Snapshot → Candidate → Opportunity → Version/Change, claims, verification, profiles, alerts) |
| `src/ingestion/` | Scheduler (cadence + backoff), fetchers, content hashing |
| `src/extraction/` | Signal phrases, date/fee parsers, deterministic extractor, validators |
| `src/dedup/` | Canonical matching (URL, org + title similarity) |
| `src/scoring/` | Freshness decay, confidence, weighted trust signals |
| `src/status/` | Derived status state machine (the strategy's 11 statuses) |
| `src/prediction/` | Recurring-cycle reopening prediction (circular day-of-year stats) |
| `src/matching/` | Saved-search matching + self-explaining fit score |
| `src/alerts/` | User/org alert engine with dedup + Opportunity Inbox digests |
| `src/claims/` | Organization claim flow (domain-match auto-verify or manual review) |
| `src/verification/` | Human QA queue ("Radar Queue"), conflict resolution |
| `src/engine.ts` | `RadarEngine` — the tick orchestrator and public API |
| `src/fixtures/`, `src/cli.ts` | Demo world + CLI |
