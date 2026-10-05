# Opportunity provenance and destination policy

This is a publication rule, not a copy preference.

## The source graph

Every opportunity has two different URL roles:

- `source.url` is discovery and evidence. It tells us where Missa found or verified the listing.
- `fields.guidelinesUrl` / the official destination is the first-party program or application page users should visit.

A directory, aggregator, newsletter, or competitor may be retained as evidence, but it must not become the public “Official source” when a first-party destination exists.

## Five publication rules

1. Resolve the host organization from the opportunity page and linked first-party context. Do not use the directory name as the organization.
2. Resolve and store a first-party destination separately from the discovery source. The public CTA must use that destination.
3. Classify the opportunity from what the host is offering. A residency program is a `residency`; generic repost language such as “contest” does not override it.
4. If the destination cannot be reconciled to the host, keep the record reviewable and do not publish it as production-ready.
5. Preserve discovery provenance internally for audit and evidence, but do not send public traffic to a competitor or imply that a directory runs the opportunity.

## LLM boundary

DeepSeek may propose the organization, type, and official destination from page evidence. Deterministic validation and the publication rubric decide whether those proposals can enter the canonical record. The model may never turn an unverified directory URL into an official destination merely because it is the page it read.

## Intermediaries (owner decision, 2026-10-04)

ArtConnect, Submittable, Chill Subs, Poets & Writers, CLMP, Res Artis, CuratorSpace, TransArtists, On the Move, Artist Communities Alliance, Rivet, Open Call Radar, ArtDeadline, FundsforNGOs, ArtInfoLand and Playbill list or collect other organizations' calls. They are discovery evidence only. On a public page an intermediary is never the host, never linked, and never named, and a Submittable link never replaces the organization's own.

A listing is public only when it links to the organization itself: its guidelines, its own submission page, or its website. When Missa knows only an intermediary's page, the listing stays unpublished until the organization's page or website is found.

One list, enforced in four places:

| Where | What |
| --- | --- |
| `packages/radar-engine/src/editorial/intermediaries.ts` | The list (`INTERMEDIARY_PLATFORMS`), plus `isIntermediaryUrl`, `isIntermediaryName`, `mentionsIntermediary` and the SQL pattern. Add a platform here. |
| `toPublicOpportunity` (`publicOpportunity.ts`), applied by the Postgres opportunity repository | Every public read: intermediary links are removed or replaced with the organization's own page, platform hosts and sources are never shown, and write-ups that name one are withheld. |
| `canonicalListedOpportunityPredicate` | Browse, counts, facets, detail and the sitemap only list listings with an organization link. Creator-owned views (tracker, calendar) keep saved items. |
| Migration 0094 (`missa_intermediary_publication_hold`) and the review worker's `missing-organization-link` hold | A listing with no organization link cannot be published by any writer. The migration's host pattern must equal the TypeScript list (enforced by a test). |

Organization profiles and the rankings drop intermediary websites, citations, open-call links and "listed by" labels when they are read.
