# Missa Literary Magazine Index: ranking process

This is a traceable walkthrough of how the Missa Literary Magazine Index
(MLMI) ranks literary magazines. Every claim points to a source file and line
number so a reader (human or agent) can verify the behavior in the repo rather
than trust a summary. Line numbers reflect the state of the repository at the
time this document was written and may drift as the code changes; the cited
function names are the stable anchors.

## How to read the citations

Citations use `repo-relative/path:line`. For example,
`packages/radar-engine/src/ranking/magazineRankingEngine.ts:256` means line 256
of that file. A citation points at the first line of the relevant block; read
the surrounding function or table to see the full logic.

## The pipeline at a glance

1. Assemble a `MagazineScoringInput` per journal from one of three sources
   (seed dataset, live crawl hydration, or historical backfill).
2. Score the input across six weighted pillars into a 0-100 total
   (`scoreMagazine`).
3. Assign a prestige tier from the total (`assignMissaTier`).
4. Rank each roster descending by score and stamp `rankPosition`
   (`rankMagazines`).
5. Persist rows to `missa_magazine_rankings`, keyed by
   `(profile_id, ranking_year, genre)`.
6. Serve from Postgres with an in-memory seed fallback when the table is
   absent.

The scoring model and tiering are deterministic and rule-based. The input
quality is not uniform across sources; that is called out in "Evidence
boundary" below.

## Step 1 - Scoring inputs

The scoring model consumes `MagazineScoringInput`
(`packages/radar-engine/src/ranking/magazineRankingEngine.ts:27`). Its fields:

- `profileId`, `name`, `genresPublished`
- `awards[]` - one `LiteraryAwardCitation` per accolade (genre, anthology,
  awardType, year)
- `medianResponseDays`, `simultaneousSubmissions`, `queryAllowedAfterDays`
- `regularSubmissionFeeCents`, `hasSubsidizedFeeCategory`
- `contributorPay` - `{ poetryPerPoemCents, prosePerPieceCents,
  prosePerWordCents, copiesOnly, unpaid }`
- `digitalPermanenceArchive`, `openAccessOnline`,
  `printArchivalLongevityYears`, `blindReadingProcess`,
  `debutFriendlyRoster`

Inputs are assembled three different ways:

### Seed baseline

`SEED_MAGAZINES` in
`packages/radar-adapters/src/ranking/data/seedRankings.ts:8` is a hand-verified
dataset for flagship and distinguished journals (Ploughshares, The Paris
Review, One Story, Kenyon Review, Poetry, and others). The header comment at
`seedRankings.ts:4` states it covers 10-year accolades, response times, fees,
and contributor compensation. This is the highest-trust input source.

### Live crawl hydration

`scripts/seed-rankings-fast.mjs` is the primary production hydration path. It:

- reads the Garstang decade of Pushcart tallies from
  `packages/radar-adapters/src/ranking/data/garstang-10yr-history.json`
  (`seed-rankings-fast.mjs:46`),
- loads matching profiles and their latest observations from
  `gary_profiles` joined to `gary_profile_observations`
  (`seed-rankings-fast.mjs:52`),
- creates missing profiles and fuzzy-matches names,
- derives an award citation per appearance, mapping rank into award type
  (`win` for rank <= 10, `special_mention` for rank <= 40, otherwise
  `notable`) at `seed-rankings-fast.mjs:156`,
- infers the non-award fields from the latest observation row: fee from
  `reading_fee` (`seed-rankings-fast.mjs:211`), response days from
  `response_time` (`seed-rankings-fast.mjs:214`), pay from `payment`
  (`seed-rankings-fast.mjs:222`), with neutral defaults when the observation
  is absent.

This is the important provenance nuance: award citations come from a rich
crawl, while pay, speed, fees, and ethics are inferred from observation fields
and often defaulted.

### Historical backfill

`scripts/sync-historical-rankings.mjs` recomputes 2024 and 2025 standings. It
loads awards from `missa_literary_awards` (`sync-historical-rankings.mjs:25`),
keeps only awards `<= year` for each target year
(`sync-historical-rankings.mjs:54`), and scores with neutral operational
defaults. This is how historical ranks are reconstructed without re-crawling.

## Step 2 - Six-pillar scoring

`scoreMagazine` (`packages/radar-engine/src/ranking/magazineRankingEngine.ts:256`)
sums six capped sub-scores. The public methodology page
(`apps/web/app/rankings/methodology/page.tsx:158`) documents the same six
pillars.

| Pillar | Max | Function | Rules |
| --- | --- | --- | --- |
| Accolades | 40 | `computeAccoladesScore` (`:74`) | 10-year rolling window; age <= 5 is 1.0x, age 6-10 is 0.5x, older dropped. Per-anthology base points: Pushcart win 5 / mention 2; Best American win 5 / notable 1.5; O. Henry 5; Best of the Net win 3.5 / 1.0; Best Small Fictions 2.5; Best Microfiction 2.0; Whiting or major grant 2.0. Genre filter applied unless `overall`; hybrid awards always count. |
| Contributor pay | 15 | `computePayScore` (`:134`) | Pro (>= $50/poem, >= $100/piece, or >= 5c/word) = 15; semi-pro ($25-49 poem or $40-99 piece) = 10; token ($10-24) = 5; copies-only = 2; unpaid = 0. |
| Turnaround | 15 | `computeTurnaroundScore` (`:167`) | <=30d = 15, <=60d = 12, <=120d = 8, <=180d = 4, <=365d = 1, >365d = 0; null = neutral 7. |
| Fees | 15 | `computeFeesScore` (`:181`) | $0 = 15; subsidized/waiver = 11; <= $3.50 = 7; <= $5 = 4; > $5 = 0. |
| Editorial respect | 10 | `computeRespectScore` (`:199`) | Simultaneous: allowed 6 / conditional 3 / forbidden 0. Query horizon: <=180d 4, >180d 2, unknown 1. |
| Format and ethics | 5 | `computeFormatAndEthicsScore` (`:225`) | Digital archive or >= 10y print = 2; blind reading = 1.5; debut-friendly = 1.5. Capped at 5. |

The total is the sum of the six sub-scores, rounded to one decimal and capped
at 100 (`magazineRankingEngine.ts:274`).

## Step 3 - Tiers and ranks

`assignMissaTier` (`packages/radar-engine/src/ranking/magazineRankingEngine.ts:246`)
maps the total:

- >= 75: Tier 1 (Flagship Luminary)
- >= 60: Tier 2 (High Distinction)
- >= 45: Tier 3 (Distinguished Contemporary)
- < 45: Tier 4 (Emerging & Community)

The same thresholds are mirrored in the methodology page
(`apps/web/app/rankings/methodology/page.tsx:318` through `:368`).

`rankMagazines` (`packages/radar-engine/src/ranking/magazineRankingEngine.ts:296`)
scores each journal for `overall` plus every genre it publishes, sorts each
roster descending by total score, and stamps `rankPosition`. Genre standings
filter awards to that genre (hybrid awards always count); the overall uses all
awards. The same journal can therefore hold different ranks across fiction,
poetry, and nonfiction.

## Step 4 - Persistence

The schema is defined in
`packages/db/migrations/0042_missa_magazine_rankings.sql`:

- `missa_literary_awards` holds award citations keyed to `gary_profiles`
  (`0042_missa_magazine_rankings.sql:3`).
- `missa_submission_telemetry` holds writer-reported submission and decision
  dates, which can refresh turnaround medians
  (`0042_missa_magazine_rankings.sql:21`).
- `missa_magazine_rankings` stores the computed standings, with all six
  sub-scores and the operational fields, keyed by
  `(profile_id, ranking_year, genre)` (`0042_missa_magazine_rankings.sql:38`).

The hydration scripts truncate and rewrite these tables
(`scripts/seed-rankings-fast.mjs:170` and `:171`) and bulk-insert the computed
rows (`scripts/seed-rankings-fast.mjs:282`).

## Step 5 - Serving

`apps/web/app/rankings/magazines/page.tsx` renders the index. It caches the
rankings per genre (`page.tsx:20`) and reads through
`getMagazineRankingRepository()`.

`apps/web/lib/magazineRankingRepository.ts:105` exposes
`getMagazineRankingRepository()`. Its `listRankings` queries Postgres and
returns `dataSource: "database"`. When the rankings table is missing (a `42P01`
error), it falls back to `getFallbackRankings`
(`magazineRankingRepository.ts:27`), which computes `SEED_MAGAZINES` in memory
(`magazineRankingRepository.ts:29`) and returns `dataSource: "seed"`.

The page keys off that flag: it shows a "Rankings preview" banner
(`page.tsx:68`) and passes `preview={page.dataSource === "seed"}`
(`page.tsx:81`) to suppress fees, schedules, and response reporting in seed
mode. So there are two visibly distinct states: seed (illustrative) and
database (live crawl-derived).

## Downstream consumers

`buildSubmissionPortfolioPlan`
(`packages/radar-engine/src/ranking/magazineRankingEngine.ts:440`) consumes
ranked candidates to assemble reach/target/safety submission portfolios. It is
a recommendation layer on top of the ranking, not part of ranking itself.

## Evidence boundary

The scoring is deterministic and rule-based, but the inputs are not uniform:

- Accolades are richly sourced from the Garstang decade history.
- Pay, speed, fees, and ethics are often inferred from the latest
  `gary_profile_observations` row and defaulted when absent
  (`scripts/seed-rankings-fast.mjs:211`, `:214`, `:222`).
- The seed path is explicitly illustrative, not the live index.

The methodology page states the same boundary: "Scores reflect the fields
currently available to the index" (`apps/web/app/rankings/methodology/page.tsx:60`)
and frames the result as a comparison aid rather than a certification of
quality or current terms. Treat the ranking as a strategic compass, not a
gatekeeper.

## Re-verification

To re-run the scoring pipeline locally:

- Unit-level: `packages/radar-engine/test/magazineRankingEngine.test.ts`
  exercises `compute*` and `rankMagazines`.
- Full hydration: `node scripts/seed-rankings-fast.mjs` (requires a reachable
  `DATABASE_URL`; it truncates and rewrites the ranking tables).
- Historical backfill: `node scripts/sync-historical-rankings.mjs`.

Re-run these after any change to the scoring functions, the seed dataset, or
the hydration scripts to confirm the index still computes as documented.
