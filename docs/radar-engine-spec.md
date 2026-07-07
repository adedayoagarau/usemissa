# Missa Radar — Opportunity Intelligence Engine Spec

> Distilled from `docs/missa-strategy.md` (§ Opportunity Intelligence Layer, § Radar / Opportunity
> Intelligence Stack, § Radar: Opportunity Intelligence, § Opportunity Trust System, § Fit Score,
> § Opportunity Matching / Inbox / Follows, § MVP Radar). This is the buildable spec for the first
> working engine.

## 1. What Radar is

Missa Radar continuously **finds, structures, monitors, updates, and predicts** open opportunities
(open calls, magazines, grants, awards, fellowships, residencies, festivals, contests, RFPs,
scholarships, conference abstracts) and turns them into live, trustworthy, personalized signal for
two audiences:

- **Users (submitters)** — "Radar found 14 new opportunities matching your profile. 3 close this
  week. 2 had deadlines extended." Fit-scored, explained, alert-driven.
- **Organizations** — "Missa found an open call on your website. Claim it to update details,
  receive submissions, and send decisions." Claimed listings become verified and self-updating.

Radar must answer, for every opportunity: what is it, who runs it, when does it open/close, what
does it accept, what does it cost, what changed since last time, is it trustworthy, is it a
duplicate, and who should be notified.

## 2. Non-negotiable rules (from strategy)

1. **Not purely AI.** AI may extract/summarize/classify behind a port; deterministic rules validate
   dates, fees, URLs, domains, open/closed status, duplicates, and confidence. The engine ships
   with a fully deterministic extractor; an LLM extractor is a pluggable adapter.
2. **Start with curated seed sources, not web-scale crawling.** Politeness: per-source check
   cadence, robots-aware fetch port, snapshots stored for audit.
3. **Every claim shows its evidence.** Source URL, last-checked timestamp, deadline confidence,
   change history. Conflicting data surfaces as *Needs Verification*, never silently resolved.
4. **Organizations can claim, correct, or remove their listings.** Claimed data outranks crawled
   data.
5. **Noisy alerts are a product failure.** Matching is profile-driven and every alert carries a
   reason.

## 3. Architecture

Modular monolith package (`packages/radar-engine`), TypeScript, zero runtime dependencies,
**ports & adapters** so the production stack from the strategy doc (Postgres/Drizzle, Temporal,
Crawlee + Playwright, LLM extraction, Typesense) can replace the built-in adapters without touching
the domain:

- `Fetcher` port — built-in: fixture/HTTP fetcher. Production: Crawlee + Playwright.
- `Extractor` port — built-in: deterministic text extractor. Production: LLM-assisted, always
  passed through the same deterministic validators.
- `RadarStore` port — built-in: in-memory + JSON-file persistence. Production: Postgres.
- `Clock` port — injectable time for tests and deterministic prediction.

### Pipeline (one tick)

```
SourceRegistry ─▶ Scheduler (due sources, per-source cadence)
   ─▶ Fetch (robots-aware port) ─▶ PageSnapshot (content hash, stored)
   ─▶ ChangeDetection (hash + semantic field diff; unchanged pages stop here)
   ─▶ Extraction (signals, dates, fees, eligibility, materials → OpportunityCandidate)
   ─▶ Validation (deterministic: dates parseable, URL sane, fee bounds, org present)
   ─▶ Dedup / Canonical match (URL, org+title fuzzy) ─▶ Opportunity upsert
        ├─ OpportunityVersion (immutable snapshot of fields)
        └─ OpportunityChange (field-level diff: deadline moved, fee changed, …)
   ─▶ Scoring (freshness, confidence, trust)
   ─▶ StatusEngine (Discovered → Open → Closing Soon → Closed …)
   ─▶ PredictionEngine (recurring cycles → expected opening windows)
   ─▶ MatchingEngine (radar profiles, saved searches, follows → scored matches + fit)
   ─▶ AlertEngine (user alerts, org claim invites, admin verification tasks)
```

## 4. Data model

Objects (strategy § Radar Requirements): `Source`, `PageSnapshot`, `OpportunityCandidate`,
`Opportunity`, `OpportunityVersion`, `OpportunityChange`, `TrustSignal`, `ClaimRequest`,
`VerificationTask`, `RadarProfile` (saved search), `OrganizationFollow`, `TrackedOpportunity`,
`Alert`.

### Opportunity (canonical record)

Title, Organization, Type, Genres/Categories/Tracks, Eligibility, Location, Open Date, Deadline
(+ deadline kind: exact / inferred / rolling / until-filled / conflicting / unknown), Fee, Prize /
Funding / Outcome, Submission URL, Guidelines/Source URL, Required Materials, Status, Freshness
Score, Confidence Score, Trust Score, Trust Signals, Last Checked At, Last Changed At, Change
History, Claimed-by (org), Recurrence pattern + predicted next opening.

### Statuses (exactly the strategy's set)

`Discovered`, `Needs Verification`, `Opening Soon`, `Open`, `Closing Soon`, `Deadline Extended`,
`Closed`, `Archived`, `Uncertain`, `Duplicate`, `Claimed by Organization` (claim is also tracked
as an orthogonal flag so a claimed call can still be Open/Closing Soon).

## 5. Detection signals (deterministic)

- **Opening:** "submissions open", "now accepting", "call for entries", "applications are open",
  "grant cycle opens", "reading period begins", "rolling submissions".
- **Closing:** "deadline", "closes", "applications due", "submissions close", "reading period
  ends", "until filled", "rolling deadline".
- **Closed:** "submissions are closed", "no longer accepting", "call closed".
- **Change:** new deadline, new fee, new category, new eligibility, new submission URL, call
  closed/reopened, deadline extended, guidelines updated — all emitted as `OpportunityChange`
  records with old/new values.
- **Trust:** official domain matches org, contact email present, fee disclosed, clear guidelines,
  historical call exists, org claimed, no suspicious payment language (wire transfer, gift cards,
  "processing fee to receive prize"), stable/recent checks.

## 6. Scoring

- **Freshness (0–100):** decays with time since last successful check; boosted by claimed
  listings (org keeps it current), floored to stale-warning threshold.
- **Confidence (0–100):** how sure the extraction is — exact parsed deadline > inferred year >
  unknown; org identified; submission URL present; conflicting values across sources tank it and
  open a `VerificationTask`.
- **Trust (0–100):** weighted trust signals minus suspicious-language penalties; claimed +
  verified-source listings rank highest. Every score exposes its contributing signals — the UI
  never shows a bare number.

## 7. Status + prediction engines

Status is **derived, never hand-set** (except admin/claim overrides): from open/close dates
relative to now, detected signals, freshness (stale → `Uncertain`), conflicts (→ `Needs
Verification`), and dedup (→ `Duplicate`). `Closing Soon` = deadline within 14 days; `Opening
Soon` = opens within 21 days or predicted to. Deadline moving later than a previously published
deadline ⇒ `Deadline Extended` + change record.

Prediction (strategy § "Opportunity Opens" Prediction): for opportunities with ≥2 historical
cycles, compute the typical opening month/day window, project the next occurrence, attach a
confidence (tighter historical spread + more cycles ⇒ higher), and schedule "expected to reopen"
alerts ~2 weeks ahead. Predicted windows are labeled as predictions with confidence, never shown
as facts.

## 8. Users: matching, fit, inbox

- **RadarProfile** = saved search: types, genres, disciplines, locations, max fee, no-fee-only,
  verified-only, deadline window, keywords, career stage. Users can have several.
- **Follows:** following an org alerts on new call, opened, deadline changed, results, new
  category.
- **Fit Score** (`Strong Fit` / `Possible Fit` / `Weak Fit` / `Not Eligible` / `Unknown`) always
  self-explains: ✓ reasons, ⚠ watch-outs, ✕ disqualifiers (hard eligibility misses ⇒ Not
  Eligible regardless of other matches).
- **Opportunity Inbox digest:** new for you, opening soon, closing soon, recently updated /
  deadline extended, from organizations you follow — each item carries its reason. Tracked
  opportunities get change alerts (deadline moved, fee changed, page disappeared, expected reopen).

## 9. Organizations: discovery → claim → verified

1. Radar discovers a call whose domain/org matches an organization → `OrganizationMatch` + claim
   invite alert ("Missa found an open call on your website. Claim it…").
2. Org files `ClaimRequest`; verification = domain match (auto-approvable) or admin review.
3. Approved claim ⇒ listing flagged claimed, org edits become authoritative field overrides, trust
   boosted, "Claimed by Organization" surfaced; org may also correct or unlist.

## 10. Admin: verification queue

`VerificationTask`s open on: low confidence, conflicting deadlines/fees across sources, suspected
duplicates, suspicious trust language, claim requests needing review, stale-but-popular listings.
Queue is grouped by reason (the strategy's "Radar Queue: needs verification / likely duplicate /
deadline changed / opening-soon prediction / high-confidence").

## 11. Engine metrics

Opportunities discovered / verified, stale listings, claimed organizations, corrections, deadline
accuracy, duplicate rate, trust score distribution, alert volume per user — exposed from the
engine as a stats snapshot.

## 12. MVP cut shipped here (strategy § MVP Radar)

Seed source list ✔, opportunity + deadline extraction ✔, change detection ✔, freshness/trust/
confidence ✔, statuses + prediction ✔, user profiles/follows/tracking + fit + digests ✔, org
claim flow ✔, human verification queue ✔, JSON persistence + demo CLI + tests ✔.
Explicitly deferred: autonomous web-scale crawling, LLM extraction adapter, Temporal scheduling,
Postgres adapter, search index — the ports exist for all of them.
