# Crawler storage schema

The crawler stores each run in SQLite by default at `<output-dir>/crawl.sqlite3`.
Use `--database PATH` to choose another file. The JSON manifest and HTML/media
files remain the durable raw evidence; SQLite is the queryable index over that
evidence.

## Core relationships

```text
crawl_runs
  └── call_observations ── opportunities
          └── source_pages
  └── media_assets ── media_blobs
          ├── field_observations
          ├── field_conflicts
          └── source_links
  └── review_decisions
```

## Important tables

| Table | Purpose | Important rule |
|---|---|---|
| `crawl_runs` | One immutable crawl execution and its configuration | Never overwrite a run; ingesting again creates a new run ID. |
| `opportunities` | Canonical identity across runs | Deduplicated by the P&W detail URL. |
| `call_observations` | The P&W fields and host evidence status for one opportunity in one run | This is the time-specific record used for sorting and review; `canonical_source` says whether the host or P&W projection is trusted. |
| `source_pages` | Every index, P&W detail, official, and rendered/static page snapshot | Raw HTML stays on disk; the table records its path, URL, status, text, and render variant. |
| `media_assets` | The selected call graphic or official organizer logo | Keeps original URL, final URL, kind, relation, status, and error. The schema remains extensible, but the production crawl writes zero or one selected image/logo per opportunity. |
| `media_blobs` | A unique content-addressed downloaded payload | Stores one SHA-256, byte count, content type, and local path even when many pages reference it. |
| `field_observations` | P&W values and every host-page candidate value | `selected=1` identifies the value used by the extractor. |
| `field_conflicts` | Host/P&W disagreements requiring review or provenance | Conflicts remain stored even when the host-canonical policy makes the host value trusted. |
| `source_links` | Bounded links followed from an evidence page | Makes discovery auditable. |

## Storage lifecycle

1. Follow the source schema: grants index pages plus the configured calendar
   month range.
2. Deduplicate discovered detail URLs, sort calls by deadline, and fetch each
   P&W detail page.
3. Save raw discovery/detail snapshots and bounded host-page evidence.
4. Select at most one primary call image across the official and P&W snapshots,
   then download it within the byte limit. Each successful asset is
   content-hashed; failures are retained as rows with an error.
5. Write the manifest and raw files.
6. Ingest the manifest transactionally into SQLite or Neon.

This separates canonical identity from observations. A future crawl can show
that a call changed, a host page went stale, or an asset disappeared without
rewriting historical evidence.

## Host-canonical field policy

`call_observations` keeps P&W's typed fields (`deadline`, `entry_fee`, and
`cash_prize`) for source provenance and sorting. When host verification passes
the identity, description, and deadline policy, it records the host projection
separately:

- `canonical_source`: `host` or `p_and_w`;
- `canonical_deadline_text`: the host's extracted deadline/range when host is canonical;
- `canonical_entry_fee`: the host's extracted fee when host is canonical;
- `canonical_cash_prize`: the host's extracted prize when host is canonical.

The rule requires a strong organizer/title match, at least 35% meaningful
description-token coverage, a comparable host deadline with the same month/day,
and at least one usable host field. A year or formatting difference is retained
as a conflict but does not block the host from being canonical. The raw host
page, P&W values, candidate fields, and conflict rows remain available for
audit.

## Useful queries

```sql
-- Calls that need editorial review in the latest run
SELECT o.organizer, o.title, c.deadline, c.host_status, f.field_name, f.detail
FROM call_observations AS c
JOIN opportunities AS o ON o.id = c.opportunity_id
LEFT JOIN field_conflicts AS f ON f.observation_id = c.id
WHERE c.host_status IN ('conflict', 'partial', 'render_required', 'unavailable');

-- Calls whose host page is trusted as the canonical field source
SELECT o.organizer, o.title, c.canonical_source,
       c.canonical_deadline_text, c.canonical_entry_fee, c.canonical_cash_prize
FROM call_observations AS c
JOIN opportunities AS o ON o.id = c.opportunity_id
WHERE c.canonical_source = 'host';

-- Downloaded media by call
SELECT o.organizer, o.title, m.kind, COUNT(*) AS asset_count,
       SUM(CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END) AS downloaded
FROM media_assets AS m
JOIN source_pages AS p ON p.id = m.source_page_id
LEFT JOIN media_blobs AS b ON b.id = m.blob_id
JOIN call_observations AS c ON c.id = p.observation_id
JOIN opportunities AS o ON o.id = c.opportunity_id
GROUP BY o.id, m.kind
ORDER BY o.organizer, m.kind;

-- Host fields that differ from P&W
SELECT o.organizer, o.title, f.field_name, f.host_value, f.expected_value, f.detail
FROM field_conflicts AS f
JOIN call_observations AS c ON c.id = f.observation_id
JOIN opportunities AS o ON o.id = c.opportunity_id;
```

## Neon production layer

The continuously running Gary worker uses the same manifest as the local
SQLite index, but writes a namespaced Postgres evidence layer. The schema is in
`src/pw_grants_crawler/neon_schema.sql` and is safe to bootstrap with
`NeonStore.ensure_schema()` because it only creates `gary_*` tables and indexes.

The important production tables are:

| Table | Purpose |
|---|---|
| `gary_sources` | Source adapter, freshness cadence, backfill state, lease, and last error |
| `gary_crawl_runs` | Immutable backfill/refresh execution, manifest hash, and status |
| `gary_opportunities` | Canonical Gary identity shared by observations from multiple sources |
| `gary_opportunity_aliases` | Every normalized detail, official, submission, or alternate URL |
| `gary_identity_candidates` | Possible duplicates that need review instead of an automatic merge |
| `gary_call_observations` | Source-specific normalized call data, host verification status, and host/P&W canonical field projection |
| `gary_source_pages` | Full HTML/text snapshots for index, P&W detail, and official pages |
| `gary_media_blobs` / `gary_media_assets` | Content-addressed media bytes plus one-page provenance |
| `gary_field_observations` / `gary_field_conflicts` | Extracted values, selected candidates, and disagreements |
| `gary_source_links` | Bounded links discovered and followed from evidence pages |
| `gary_review_decisions` | Human identity/page/field decisions exported from the review console |

### Cross-source duplicate policy

Gary resolves identity in this order:

1. An exact normalized source-detail URL alias attaches to the existing
   canonical record. Shared official hub URLs are not sufficient.
2. Exact normalized organizer, title, and deadline attaches to the same record.
3. The same normalized official URL plus title attaches to the same record.
4. Similar organizer/title labels with a conflicting or missing deadline create
   a separate `needs-review` record and a pending identity candidate.
5. No match creates a new canonical record.

This avoids collapsing annual editions or similarly named awards. It also
preserves provenance: aliases identify where a call appeared, observations
identify what each source said on a particular run, and the canonical record
is only the identity grouping. A later editorial/projector step can accept or
reject pending candidates without rewriting raw evidence.

The worker uses `FOR UPDATE SKIP LOCKED` leases for sources/jobs and a stable
source-plus-manifest hash for idempotent retries. `gary_media_assets` is
validated so the production crawl selects at most one primary image per call;
the selected call graphic is preferred and the organizer logo is the fallback.

Review decisions are appendable labels attached to a specific run and
observation. They do not mutate `gary_call_observations`, `gary_source_pages`,
or `gary_field_conflicts`; later source-adapter improvements can use them to
adjust matching and extraction rules while keeping the original evidence
auditable.
