# Gary publication-profile foundation

Gary's first production lane is opportunity evidence. Poets & Writers'
Literary Magazines and Small Presses directories are a related but different
entity type: a publication or press can own many submission opportunities and
can remain useful even when it has no active call.

## Current adapter boundary

`profile_source.py`, `profile_parser.py`, and `profile_crawler.py` provide a
side-effect-free discovery adapter for:

- `https://www.pw.org/literary_magazines`
- `https://www.pw.org/small_presses`

The adapter follows the explicit PW pager, deduplicates detail URLs, parses
the public profile fields, and returns the result in memory. With the approved
Neon mode, it writes the source snapshots and profile observations to the
durable `gary_profile_*` lane. PW's robots policy specifies a ten-second crawl
delay, so production runs use one detail fetcher and resumable index-page
batches.

## Recommended production tables

These tables are now present in `neon_schema.sql` and are populated only by an
explicit `--neon` run.

| Table | Purpose |
|---|---|
| `gary_profiles` | Canonical publication/press identity: kind, normalized name, canonical host URL, status, and timestamps. |
| `gary_profile_aliases` | PW profile URLs, host URLs, submission-guideline URLs, and other source aliases. |
| `gary_profile_observations` | A time-specific observation from PW or the host, with field-level provenance and source hash. |
| `gary_profile_pages` | Raw PW and host-page evidence, with the requested/final URL and content hash. |
| `gary_profile_links` | Many-to-many links between a profile and Gary opportunities, including match reason and confidence. |
| `gary_profile_media_assets` | At most one selected profile image per observation, with URL, hash, and provenance. |

## Canonical-source policy

PW is the discovery and editorial-vetting source. The publication or press
website is canonical for current submission guidelines, reading periods,
contact details, fees, and payment. PW values remain provenance and are never
silently substituted for current host values. If the PW profile and host look
like the same publication—matching title, description, and timing—Gary should
attach them and retain the host value for current fields.

Identity should be conservative:

1. Exact normalized host URL plus normalized name attaches to a profile.
2. Exact source-detail URL attaches as an alias when reuse is permitted.
3. Exact normalized name plus matching host domain can attach.
4. Similar names with different host domains create a review candidate.
5. A shared submission platform or shared parent domain alone never merges
   profiles.

## Link to opportunities

An opportunity should reference the profile only after the host URL and
organizer/name relationship are corroborated. One profile may own multiple
annual contests or open reading periods; annual opportunities remain separate
records.
