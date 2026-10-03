# Missa Literary Magazine Index: ranking process

How the Missa Literary Magazine Index (MLMI) turns recorded facts into ranks.
References name files and functions rather than line numbers so they stay
valid as the code changes.

## Rule

Every stored value is either recorded by a cited source or null. The engine
never substitutes a default for a missing fact. A missing fact scores the
midpoint of the points it could earn and is shown as "Not recorded".

## Sources

| Source                                                                                   | What it records                                                                                                                      | Stored in                                                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Pushcart Prize tallies (cliffordgarstang.com, one table per genre and year)              | Per genre and year: rank, prior rank and a weighted score of Pushcart Prizes and special mentions. No per-year counts are published. | `missa_pushcart_rankings` (with `source_name`, `source_url`, `retrieved_on`)                         |
| Best Microfiction (2019 onward) and Best Small Fictions (2023 onward) tables of contents | One row per selected piece: title, author and the magazine the contents name                                                         | `missa_literary_awards` (`source_url` and `retrieved_on` are NOT NULL)                               |
| Poets & Writers listings (`gary_profile_observations`, `source_id` `pw.org.*`)           | Response-time band, reading fee yes/no, payment type, simultaneous submissions                                                       | `missa_magazine_rankings` fact columns, cited in `fact_sources`                                      |
| Submission categories on the magazine's own portal (Submittable, via `opportunities`)    | The regular fee per genre and whether a free category exists for some writers                                                        | `regular_fee_cents` and `charges_reading_fee` (per genre via `feesByGenre`), cited in `fact_sources` |
| Missa writer reports (`missa_submission_telemetry`)                                      | Submission and decision dates; no account identifier                                                                                 | Median response time once a magazine has `MIN_REPORTS_FOR_MEDIAN` decided reports                    |

Every non-null fact column has a key in `fact_sources` (`{ url, recordedOn }`);
the check constraint `missa_rankings_facts_source_check` enforces it.

A Poets & Writers listing or a portal category counts for a ranking year only if
it was recorded in or before that year, so 2024 and 2025 have few such facts.

### Fees from portal categories

`packages/radar-adapters/src/ranking/live/feeFacts.ts` reads each category with
the magazine's own name removed (`withoutMagazineName`), drops calls that are
not regular submissions (prizes, chapbooks, translations, reviews, art,
expedited reads and similar), and assigns genres (`categoryGenres`). The
regular fee for a genre is the cheapest category open to every writer. A free
category restricted to some writers (or a "limited free" window) records a
waiver, not a free route. Where Poets & Writers and the portal disagree, the
portal wins and the run summary lists the conflict.

## Live pipeline (`packages/radar-adapters/src/ranking/live/`)

1. **Refresh sources** (`refreshRankingSources`). Fetches the editions it
   maintains (Pushcart tallies for year−2 to year+1, Best Microfiction for the
   last ten years, every Best Small Fictions edition the index page lists),
   parses them (`sources.ts`) and stores each as a row in
   `missa_ranking_source_snapshots`. `validateEdition` rejects an edition with
   too few rows (100 for tallies, 40 for anthologies) or fewer than 80% of the
   previous snapshot. A 404 means "not published yet". Older accepted editions
   are settled and not fetched again. Requests are spaced 1.5 s apart and
   retried with backoff on 307, 429 and 5xx.
2. **Recompute** (`recomputeMagazineRankings`). Reads the latest accepted
   snapshot of each edition, matches each listed name to a `gary_profiles` row
   (`matchProfile`: exact name first; otherwise only when one name is the other
   plus a generic suffix or subtitle, the match is unique and the name is not
   on the ambiguous list) and reports names it cannot match. It never creates
   profiles. It builds one `MagazineScoringInput` per magazine per year from
   recorded facts only and calls `rankMagazines`.
3. **Publish** (`runMagazineIndexUpdate`). Writes Pushcart rows, anthology rows
   and ranking rows in one transaction, then logs the run in
   `missa_ranking_runs` (`published`, `dry_run` or `failed`). It
   refuses to publish if a year would lose more than 20% of its magazines, and
   skips if another run started within 30 minutes.

### Schedule

`apps/web/app/api/cron/magazine-rankings/route.ts` runs on the 3rd of each
month (`apps/web/vercel.json`). It needs `CRON_SECRET` and `DATABASE_URL`, and
publishes only when `MISSA_RANKINGS_AUTO_PUBLISH=1`; otherwise it records a dry
run. After a publish it revalidates the `magazine-rankings` cache tag, so the
public pages update without a rebuild. New annual editions are picked up by
the monthly run as soon as they appear.

### Manual run

`scripts/recompute-magazine-rankings.mjs` runs the same pipeline from the
command line. It is a dry run unless passed `--write`. Flags: `--years=`,
`--no-refresh` (use stored snapshots), `--report=` (write a JSON summary),
`--neon-http` (Neon's HTTPS SQL API where raw Postgres is blocked) and
`--allow-shrink` (manual override of the size guard; the schedule never uses
it). Run it against a Neon branch first:

```sh
npm run magazine:rankings -- --report=/tmp/report.json          # dry run
DATABASE_URL=… npm run magazine:rankings -- --write             # write
```

## Scoring (`packages/radar-engine/src/ranking/magazineRankingEngine.ts`)

Each pillar function returns `{ score, status }`, where `status` is `recorded`,
`partial` (a source records a range) or `unknown`.

| Pillar          | Max | Function                      | Rule                                                                                                                                                                                                                                                                       |
| --------------- | --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accolades       | 40  | `computeAccoladesScore`       | 40 × √(Pushcart tally score ÷ highest score in that index and year); overall sums the three genre scores. Plus 2.5 per Best Small Fictions and 2 per Best Microfiction selection in the last ten editions (half weight after five), capped at `ANTHOLOGY_POINTS_CAP` (10). |
| Pay             | 15  | `computePayScore`             | Pro (`PRO_PAY_THRESHOLDS`: 5¢/word, $50/poem, $100/piece) 15; semi-pro 10; $10+ 5; copies 2; unpaid 0. "Pays cash", no amount: partial, 8.5.                                                                                                                               |
| Turnaround      | 15  | `computeTurnaroundScore`      | Recorded median: ≤30 days 15, ≤60 12, ≤120 8, ≤180 4, ≤365 1, else 0. Listed band: partial, midpoint of the band (11.5 / 6 / 0.5). The report path calls this same function.                                                                                               |
| Fees            | 15  | `computeFeesScore`            | No fee 15; recorded waiver or free tier 11; ≤$3.50 7; ≤$5 4; more 0. Fee charged, amount not recorded: partial, 5.5.                                                                                                                                                       |
| Respect         | 10  | `computeRespectScore`         | Simultaneous allowed 6, conditional 3, forbidden 0; query window ≤180 days 4, longer 2. Unknown parts score their midpoints (3 and 2.5).                                                                                                                                   |
| Format & ethics | 5   | `computeFormatAndEthicsScore` | Archive 2, blind reading 1.5, debut-friendly 1.5; each unknown part scores half. No current source records these.                                                                                                                                                          |

`combinePillars` sums the pillars, assigns the tier (`TIER_THRESHOLDS`:
75 / 60 / 45) and computes coverage: the share of the 100 points whose pillar
is recorded (partial counts half). `rankMagazines` orders by total, then
accolades, then name (`compareScored`).

## Writer reports

`apps/web/app/api/rankings/report-response/route.ts` → `submitResponseReport`
(`apps/web/lib/responseReportSubmission.ts`) requires sign-in, limits reports
per account and per network address, derives response days from the two dates,
and stores no account identifier. `refreshTurnaroundFromReports`
(`packages/radar-adapters/src/ranking/magazineRankingRepository.ts`) then
rescores turnaround with `computeTurnaroundScore`, recomputes total, tier and
coverage, and re-ranks the year (`rerankYearGenre`).

## Serving

`PostgresMagazineRankingRepository.listRankings` collapses duplicate profiles
that share a website (or a name) with `CANONICAL_RANKINGS_CTE`.
`getIndexCoverage` uses the same CTE, so the methodology page's live magazine
counts and per-pillar coverage match the public list. Outside production, an
empty index shows fictional sample magazines (`SEED_MAGAZINES`), never real
magazine names.
