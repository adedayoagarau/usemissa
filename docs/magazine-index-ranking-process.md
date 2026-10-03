# Missa Literary Magazine Index: ranking process

How the Missa Literary Magazine Index (MLMI) turns recorded facts into ranks.
References name files and functions rather than line numbers so they stay
valid as the code changes.

## Rule

Every stored value is either recorded by a cited source or null. The engine
never substitutes a default for a missing fact. A missing fact scores the
midpoint of the points it could earn and is shown as "Not recorded".

## Sources

| Source                                                                                 | What it records                                                                                                                                                       | Stored in                                                                                                                                    |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Clifford Garstang, Literary Magazine Rankings (cliffordgarstang.com, 2024–2026 tables) | Per genre and year: rank, prior rank and a ten-year weighted score of Pushcart Prizes and special mentions. Garstang does not publish per-year counts or the weights. | `packages/radar-adapters/src/ranking/data/garstang-pushcart-rankings.json` → `missa_pushcart_rankings` (with `source_url`, `retrieved_on`)   |
| Best Microfiction 2019–2026 and Best Small Fictions 2023–2025 tables of contents       | One row per selected piece: title, author and the magazine the contents name                                                                                          | `packages/radar-adapters/src/ranking/data/anthology-citations.json` → `missa_literary_awards` (`source_url` and `retrieved_on` are NOT NULL) |
| Poets & Writers listings (`gary_profile_observations`, `source_id` `pw.org.*`)         | Response-time band, reading fee yes/no, payment type, simultaneous submissions                                                                                        | `missa_magazine_rankings` fact columns, with `facts_source_url` and `facts_recorded_on`                                                      |
| Missa writer reports (`missa_submission_telemetry`)                                    | Submission and decision dates; no account identifier                                                                                                                  | Median response time once a magazine has `MIN_REPORTS_FOR_MEDIAN` decided reports                                                            |

Not used: Erika Krouse's tiers, the Best American series, the O. Henry Prize and
Best of the Net. No source in the index records them per magazine. Best Small
Fictions editions before 2023 are left out for every magazine because their
contents are no longer published.

A Poets & Writers listing counts for a ranking year only if it was last updated
in or before that year, so 2024 and 2025 have almost no listing facts.

## Pipeline

1. `scripts/recompute-magazine-rankings.mjs` reads the two data files, matches
   each listed name to a `gary_profiles` row (`matchProfile`: exact name first;
   otherwise only when one name is the other plus a generic suffix or subtitle,
   and the match is unique) and reports names it cannot match. It never
   creates profiles.
2. It builds one `MagazineScoringInput` per magazine per year from recorded
   facts only, then calls `rankMagazines`.
3. It writes Pushcart rows, anthology rows and ranking rows in one transaction.
   It is a dry run unless passed `--write`. It reads `DATABASE_URL` from the
   environment; `--neon-http` uses Neon's HTTPS SQL API where raw Postgres is
   blocked.

Run it against a Neon branch first:

```sh
npm run magazine:rankings -- --report=/tmp/report.json          # dry run
DATABASE_URL=… npm run magazine:rankings -- --write             # write
```

## Scoring (`packages/radar-engine/src/ranking/magazineRankingEngine.ts`)

Each pillar function returns `{ score, status }`, where `status` is `recorded`,
`partial` (a source records a range) or `unknown`.

| Pillar          | Max | Function                      | Rule                                                                                                                                                                                                                                                                 |
| --------------- | --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accolades       | 40  | `computeAccoladesScore`       | 40 × √(Garstang score ÷ highest score in that index and year); overall sums the three genre scores. Plus 2.5 per Best Small Fictions and 2 per Best Microfiction selection in the last ten editions (half weight after five), capped at `ANTHOLOGY_POINTS_CAP` (10). |
| Pay             | 15  | `computePayScore`             | Pro (`PRO_PAY_THRESHOLDS`: 5¢/word, $50/poem, $100/piece) 15; semi-pro 10; $10+ 5; copies 2; unpaid 0. "Pays cash", no amount: partial, 8.5.                                                                                                                         |
| Turnaround      | 15  | `computeTurnaroundScore`      | Recorded median: ≤30 days 15, ≤60 12, ≤120 8, ≤180 4, ≤365 1, else 0. Listed band: partial, midpoint of the band (11.5 / 6 / 0.5). The report path calls this same function.                                                                                         |
| Fees            | 15  | `computeFeesScore`            | No fee 15; recorded waiver or free tier 11; ≤$3.50 7; ≤$5 4; more 0. Fee charged, amount not recorded: partial, 5.5.                                                                                                                                                 |
| Respect         | 10  | `computeRespectScore`         | Simultaneous allowed 6, conditional 3, forbidden 0; query window ≤180 days 4, longer 2. Unknown parts score their midpoints (3 and 2.5).                                                                                                                             |
| Format & ethics | 5   | `computeFormatAndEthicsScore` | Archive 2, blind reading 1.5, debut-friendly 1.5; each unknown part scores half. No current source records these.                                                                                                                                                    |

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
