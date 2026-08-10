# Poets & Writers grants crawler

Bounded, provenance-preserving crawler for Poets & Writers Writing Contests,
Grants & Awards listings.

Run it from the repository root:

```bash
uv run --project tools/pw-grants-crawler pw-grants-crawl \
  --limit 5 \
  --max-site-pages 5 \
  --max-call-images 1 \
  --output-dir outputs/pw-grants-crawl
```

For JavaScript-rendered host sites, install the optional browser dependency once:

```bash
uv sync --project tools/pw-grants-crawler --extra render
uv run --project tools/pw-grants-crawler playwright install chromium
```

Then add `--render` to the crawl command. The renderer is bounded and only runs
when the static response is a JavaScript shell or too thin to inspect.

The crawler sorts index listings by deadline ascending, follows each P&W detail
page, fetches the official website URL, and follows a small number of relevant
same-site or submission-platform links. `--max-site-pages` is a hard cap that
includes static and rendered snapshots. It writes a JSON manifest and complete
HTML responses under `index.html`, `index-pages/`, `pages/`, and
`official-sites/`.

The P&W source schema knows two discovery routes: it follows the grants pager
until the linked pages are exhausted, and it can walk an inclusive month range
of `/submission_calendar/YYYY-MM` pages. For a full calendar backfill:

```bash
uv run --project tools/pw-grants-crawler pw-grants-crawl \
  --limit 500 \
  --max-index-pages 50 \
  --calendar-start-month 2026-01 \
  --calendar-end-month 2026-09 \
  --render \
  --output-dir outputs/pw-calendar-backfill
```

The source pages are deduplicated by normalized call detail URL before detail
pages are fetched. Calendar-only entries still receive their deadline from the
calendar cell; the detail page remains the authoritative full call record.

By default it downloads at most one primary call image per opportunity into
`assets/` and writes `crawl.sqlite3`. Selection prefers the official call pages,
Open Graph/Twitter images, and meaningful image candidates while excluding
icons, social buttons, tracking pixels, fonts, stylesheets, and unrelated page
media. If no call graphic can be tied confidently to the opportunity, it falls
back to the official organizer logo; the Poets & Writers logo is never used.
`--max-call-images` and `--max-asset-bytes` bound the work; failed downloads
remain in the manifest and database with their error instead of disappearing.

Each call includes `official_evidence` with the selected host page, every page
visited, extracted field candidates, missing fields, and any conflicts with the
P&W deadline, fee, or prize. Host status means:

- `verified`: organizer and call title match sufficiently, and either there is
  no comparable P&W field conflict or the host-canonical policy below passes;
- `conflict`: the host page is identified but a deadline, fee, or prize differs
  and the host-canonical policy did not pass;
- `partial`: only some identity evidence matches;
- `render_required`: static HTML was not sufficient and no rendered snapshot was
  available;
- `mismatch` / `unavailable`: the host page could not corroborate or be fetched.

When the host identity is strong, the host description has meaningful overlap
with the P&W description, and a host deadline shares the P&W deadline's
month/day, Gary marks `canonical_source` as `host` and stores the extracted
host values in `canonical_fields`. This intentionally tolerates an annual
deadline-year or formatting difference: the host is the current source of
truth for the call. The original P&W fields and every `field_conflicts` row
remain intact as provenance; Gary never erases the disagreement.

The tool does not submit forms, authenticate, or make changes on third-party
sites. Full page text and HTML are retained so missing extraction fields can be
reviewed against the source rather than silently inferred.

## Evidence review console

Export the latest completed Neon run as a self-contained review page:

```bash
DATABASE_URL="$DATABASE_URL" uv run gary-review --output outputs/gary-review/review.html
```

The console includes every non-verified observation, with filters for partial,
render-required, unavailable, and field-conflict cases. It keeps P&W and host
values side by side, links to the live source pages, shows captured host text,
and stores decisions in the browser's local storage. Use **Export decisions**
to download a JSON decision log. Import that log into the durable Neon review
table with:

```bash
DATABASE_URL="$DATABASE_URL" uv run gary-review \
  --import-decisions outputs/gary-review/gary-review-decisions-<run-id>.json
```

Review decisions are labels for improving source-specific matching and field
selection. They never overwrite the original P&W or host evidence.

The normalized SQLite design is documented in [SCHEMA.md](SCHEMA.md). Pass
`--database PATH` to store it outside the output directory.

## Neon production storage

Gary can ingest a manifest transactionally into Neon/Postgres. Set
`DATABASE_URL` to the Neon connection string and run the schema bootstrap once:

```bash
DATABASE_URL="$DATABASE_URL" uv run --project tools/pw-grants-crawler \
  python -c 'import os; from pw_grants_crawler.neon import NeonStore; NeonStore(os.environ["DATABASE_URL"]).ensure_schema()'
```

For a bounded backfill, use the worker once. The initial calendar bounds can be
passed as flags or through `GARY_BACKFILL_CALENDAR_START` and
`GARY_BACKFILL_CALENDAR_END`:

```bash
DATABASE_URL="$DATABASE_URL" \
GARY_BACKFILL_CALENDAR_START=2026-01 \
GARY_BACKFILL_CALENDAR_END=2026-09 \
uv run --project tools/pw-grants-crawler \
  gary-pw-worker --once --max-index-pages 50 --output-root outputs/gary-backfill
```

The worker can run continuously. It claims a source with a one-hour database lease,
backfills the configured historical calendar range once, then refreshes the
current and next calendar month when `next_refresh_at` is due. A completed
manifest is idempotent by source and content hash, so an unchanged daily run
does not create duplicate observations.

Set `GARY_RENDER=true` (or pass `--render`) when the source needs browser
execution for JavaScript-only host pages. Gary keeps the browser pass bounded
by the same page and asset limits.

The production layer is namespaced in thirteen `gary_*` tables. It stores raw
HTML/text snapshots, selected media payloads, field candidates and conflicts,
source links, crawl runs, and canonical opportunity observations. This is an
evidence/staging layer: promotion into Missa's public opportunity tables remains
an explicit reviewable step.

Identity is conservative across sources: exact source-detail URL aliases attach;
exact organizer + title + deadline attaches; the same official URL + title
attaches; a shared official hub URL alone never merges calls; similar labels
with a changed deadline create a `needs-review` candidate; everything else
stays separate. Every source URL remains an alias and every crawl remains an
observation under the canonical record.

## Publication profile discovery

Gary also includes a profile adapter for the Poets & Writers Literary Magazines
and Small Presses directories. With the approved `--neon` flag it stores the
profile observations and raw PW evidence in the durable profile lane. It
follows every explicit index pager, deduplicates profile URLs, and parses the
public profile fields:

```python
from pw_grants_crawler.fetcher import HttpFetcher
from pw_grants_crawler.profile_crawler import crawl_profiles
from pw_grants_crawler.profile_source import PwProfileSchema

fetcher = HttpFetcher()
try:
    result = crawl_profiles(
        PwProfileSchema("literary_magazine"),
        fetcher,
        limit=5,
        fetch_details=True,
    )
finally:
    fetcher.close()
```

PW's `robots.txt` specifies a ten-second crawl delay. Gary's profile CLI uses
that delay by default and should run with one detail fetcher for this source.
The directory FAQ also says publications supply and update their own listings,
so the PW observation remains provenance while the publication's own website is
canonical for current submission details.

For a live, non-persistent inventory count:

```bash
uv run --project tools/pw-grants-crawler pw-profile-discover --kind both
```

For a bounded parser validation that fetches public detail pages in memory:

```bash
uv run --project tools/pw-grants-crawler pw-profile-discover \
  --kind literary_magazine --limit 5 --fetch-details
```

For the approved Neon backfill, run one PW index page at a time so a stopped
job can resume without refetching earlier pages. The final page should include
`--backfill-complete`; earlier batches intentionally leave the source pending:

```bash
DATABASE_URL="$DATABASE_URL" uv run --project tools/pw-grants-crawler \
  pw-profile-discover --kind literary_magazine --neon \
  --start-index-page 0 --max-index-pages 1 \
  --max-profile-images 0
```

The profile lane is separate from calls: profile identities, observations,
pages, field observations, selected media, and profile-to-opportunity links
are stored in the `gary_profile_*` tables. Raw content remains source evidence
and is not silently promoted into the public opportunity projection.
