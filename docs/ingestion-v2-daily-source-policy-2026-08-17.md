# Ingestion v2 daily source policy

Status: production operating boundary, verified 17 August 2026

## What “daily production” means

The daily set is intentionally smaller than the Creative Opportunity
Aggregators research directory. The directory contains discovery databases,
newsletters, submission-management products, marketplaces, job boards, and
individual institutions. Those are not interchangeable ingestion sources.

A source enters the daily production set only when it:

- exposes multiple current opportunities on a stable public index or API;
- permits a bounded fetch without an account or bypassing access controls;
- exposes a stable item identity and enough deadline evidence to reject stale
  records;
- can be reconciled to an organizer-owned destination when the source is an
  aggregator;
- has source-specific navigation and noise rules;
- remains human-review only. `publicationAuthority: none` is invariant.

The worker fetches the bounded root, compares its content hash, and stops before
child fetches when unchanged. Changed roots have source-specific scan and detail
budgets. This is how the daily lane avoids recrawling an entire site.

## Current production daily set

| Desk                       | Source                                | Structure                            | Bounded behavior                                                                               |
| -------------------------- | ------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Funding                    | Grants.gov Arts                       | POST JSON API plus detail API        | Filter open/forecast records and current deadlines; five detail records                        |
| Funding                    | EU Funding & Tenders: Creative Europe | multipart POST JSON API              | Creative Europe programme and open/forecast status only; five detail records                   |
| Cross-disciplinary         | On the Move                           | bounded editorial index              | Scan 15, follow at most five articles and one organizer hop per article                        |
| Writing                    | Poets & Writers Contests              | bounded index                        | Stabilize root contest URLs, inspect 15 and fetch at most five details                         |
| Writing                    | NewPages Calls and Contests           | bounded index                        | Submission-guide detail paths only; exclude roundup/navigation links; scan ten and follow five |
| Writing                    | Chill Subs Contests                   | public embedded structured data      | Join stable call IDs to organization profiles; collapse genre variants; follow five apply URLs |
| Residencies                | TransArtists Open Calls               | bounded index                        | Open-call articles only; scan ten and follow five                                              |
| Visual arts                | ArtConnect Opportunities              | embedded structured JSON             | Published, non-pending records with current deadlines; at most five                            |
| Visual arts                | CuratorSpace                          | bounded application-platform index   | Opportunity detail IDs only; scan ten and follow five                                          |
| Performing arts            | Playbill Jobs and Calls               | bounded index with source-card dates | Job detail paths carrying submission deadlines; scan ten and follow five                       |
| Music                      | Music In Africa Opportunities         | bounded editorial index              | Current open-call/apply articles; scan 15, follow five and one organizer hop                   |
| Architecture and design    | ArchDaily Competitions                | bounded editorial index              | Competition article paths only; exclude asset/navigation links; scan 15 and follow two         |
| Film and media             | Sundance Institute Deadlines          | official programme index             | Five application destinations; source-card fallback when an application host blocks fetches    |
| Residencies                | Res Artis Open Calls                  | bounded official open-call index     | Scan 15, follow five current open-call details and one organizer-owned application hop         |
| Visual arts and public art | Creative West Art Opportunities       | bounded application-platform index   | Stable opportunity/provider IDs; URL-stabilized scan of 15 and five current details            |
| Film and media             | Festhome Festivals                    | bounded application-platform index   | Canonical festival IDs; scan 15 and retain five details with current final deadlines           |
| Visual arts                | ArtDeadline Opportunities             | public WordPress RSS plus details    | Public feed items only; scan ten, follow five details and one organizer hop per item           |

All seventeen are configured for a 24-hour base cadence. Near and final deadlines
may tighten the next check, while repeated unchanged roots back off. A failed
source is retried or cooled down without expanding the crawl budget.

## Duplicate reconciliation

NewPages and Poets & Writers can describe the same organizer opportunity. The
source URL is evidence, not identity. Candidate identity is reconciled against:

1. the normalized organizer-owned destination URL;
2. a stable publisher item ID when no better destination exists;
3. normalized title plus organization and current deadline, or a distinctive
   exact title plus exact current deadline when an aggregator omitted the
   organization;
4. existing canonical records before any write.

Directory names never replace the organizer. Ambiguous matches remain in human
review. Candidate decisions are scoped per detail page so one good item cannot
promote siblings from the same index.

## Deadline treatment

- Expired dates and implausibly distant dates do not enter review.
- Published v2 records with an exact passed deadline transition from an active
  status to `closed` and remain available as public archive records.
- When a page contains several dates, deadline-labelled current dates outrank
  historical dates, publication dates, and navigation text.
- Source-card deadlines may be used only by a configured source whose cards
  bind the date to one destination.
- Unknown, rolling, and opening-soon are distinct states; none is silently
  converted into an exact deadline.
- A destination fetch failure never causes the directory's generic date to be
  treated as organizer-confirmed evidence.

The review-only boundary is keyed to the immutable `opp_v2_` opportunity and
`v2_source_` source ownership as well as evidence metadata. A later enrichment
write therefore cannot remove the hold by replacing mutable reconciliation
JSON. The durable database gate rejects new v2 publication transitions.

## Verified candidates not in the daily set

These were probed from the supplied research directory on 17 August 2026. They
remain outside production until a source-specific adapter and replay evidence
exist.

No additional research-directory source has passed the public-access,
structure, repeatability, destination, and deadline gates yet.

## Explicitly held sources

| Source                  | 17 August re-verification                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Duotrope                | Official homepage still returns a Cloudflare 403 to the server verifier and the useful database is primarily paid                                |
| NYFA Opportunities      | Official opportunities route still returns a Cloudflare 403; retain as a monitored access failure, not a daily crawler                           |
| FilmFreeway             | Official route still returns a Cloudflare 403; use an approved partner or feed route rather than bypassing controls                              |
| Music Gateway and Mandy | Both official routes still return Cloudflare 403 responses                                                                                       |
| Sonicbids               | Public homepage is reachable, but the registry `find-gigs` route returns a real 404; its WordPress API exposes editorial articles, not live gigs |
| SubmitHub               | Registry `/opportunities` route returns a real 404; the reachable curator directory is not a deadline-bound opportunity feed                     |
| Groover Opportunities   | Registry `/en/opportunities` route returns JSON 404; the reachable curator page is a product/curator-acquisition page, not live calls            |
| ShortFilmDepot          | Public festival route remains a JavaScript shell and the discovered private API is not an approved stable ingestion contract                     |

Blocked, paid, authenticated, stale, newsletter-only, marketplace-only, and
single-institution sources may still provide research signals. They do not enter
the daily ingestion set by default and must never be crawled by attempting to
bypass access controls.
