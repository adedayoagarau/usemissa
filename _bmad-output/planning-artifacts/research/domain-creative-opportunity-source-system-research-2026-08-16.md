---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - packages/radar-engine/src/registry/sources.json
  - packages/radar-engine/src/registry/types.ts
  - packages/radar-engine/src/registry/taxonomy.ts
  - packages/ingestion-v2/src/catalog.ts
  - packages/ingestion-v2/src/canonicalWriter.ts
  - packages/ingestion-v2/src/execution.ts
  - docs/missa-strategy.md
workflowType: 'research'
lastStep: 6
research_type: 'domain'
research_topic: 'creative opportunity source system'
research_goals: 'Identify the trusted source desks practitioners use by Missa art form, understand how those desks receive and update opportunities, and define source, crawl, reconciliation, deadline, deduplication, and submission rules for ingestion v2.'
user_name: 'Adedayo Agarau'
date: '2026-08-16'
web_research_enabled: true
source_verification: true
---

# From Discovery Desk to Trusted Record: Missa's Creative Opportunity Source System

**Date:** 2026-08-16
**Author:** Adedayo Agarau with Codex research support
**Research Type:** Domain and source-system research

---

## Executive Summary

Missa should not try to make a directory page “canonical.” A directory, newsletter, application platform, and organizer page perform different jobs. The high-volume desk tells Missa that an opportunity may exist; the organizer's official page or application endpoint establishes the authoritative title, eligibility, fee, deadline, and application route. Missa becomes trusted by preserving both: the discovery trail and the reconciled first-party record.

The current repository is broader than the operational system can safely support. It contains 1,123 source entries across 41 audience-facing opportunity verticals and nine platform verticals. Most first-party entries use a blanket seven-day interval; directory entries are generally marked `needs-review`; and ingestion v2 currently derives canonical opportunity identity only from an authoritative URL. That is not yet a durable source design: reused URLs can collapse annual cycles, URL variants can split one cycle, and an exact-date-only deadline parser loses time zones, rolling calls, reading periods, extensions, and conflicts.

The recommended operating model is eight practitioner source desks, supplied by a small daily core of high-yield indexes and structured APIs. Daily work should be index-first and delta-driven. Missa checks an API, feed, sitemap, or bounded listing page, compares stable item IDs and content validators, and fetches only new or materially changed detail pages. First-party records enter a hotter monitoring window when open or near a deadline. A source manifest controls role, art-form coverage, geography, permissions, structure, observed change rate, crawl budget, and publication authority.

Missa should open three intake routes: verified organization submission, creator suggestion, and organization claim/correction. None should bypass review and publication gates. The source moat is not the volume scraped; it is the evidence graph, deadline precision, visible last-checked state, corrections, and a reliable route for organizers to own their records.

## Research Scope and Method

The research covers:

- all current Missa creative-practice verticals, grouped by how practitioners actually search;
- high-yield discovery desks, official program pages, application platforms, and public APIs;
- how representative platforms receive and moderate listings;
- publishing rhythm versus the cadence Missa should use;
- opportunity identity, cycles, duplicate evidence, deadlines, and status changes;
- the source manifest and incremental crawl pattern required by ingestion v2;
- organization submission, creator suggestion, claim, correction, and removal routes.

Current public pages were used to verify source function and intake models. When a source does not publish a formal update schedule, the recommended crawl cadence below is an engineering policy, not a claim about that source's publishing schedule. Missa should replace those recommendations with observed change rates after a 30-day measurement period.

## 1. The Vocabulary Missa Needs

“Canonical source” is overloaded. The system should use four explicit roles.

| Role | What it establishes | Examples | May establish public truth? |
|---|---|---|---|
| Discovery desk | That a possible opportunity exists | On the Move, ArtConnect, NewPages, ArchDaily | No |
| Application platform | The live application route and, sometimes, structured deadline/fee fields | Submittable, FilmFreeway, CaFÉ, CuratorSpace | Yes for application availability; other fields still reconcile |
| Official publisher | The organizer's policy, eligibility, benefits, dates, and contact | Organizer program/call page | Yes |
| Structured authority | Stable public IDs and statuses from an official data provider | Grants.gov and EU Funding & Tenders APIs | Yes within the provider's jurisdiction |

One opportunity can therefore have many `ListingEvidence` records, one `OpportunityFamily`, and one or more `OpportunityCycle` records. This prevents source attribution from being mistaken for opportunity identity.

## 2. Practitioner Source Desks by Missa Art Form

The 41 audience-facing verticals should remain available for taxonomy and matching, but ingestion operations should be organized into eight source desks.

| Source desk | Missa verticals covered | Where a practitioner is most likely to look | Recommended high-yield core | Recommended Missa cadence |
|---|---|---|---|---|
| Writing and publishing | literary-fiction, poetry, creative-nonfiction, flash-hybrid, novel-book, ya-children, translation, science-nature-writing, literary-festivals, writing-residency | Contest databases, calls-for-submissions roundups, magazine directories, application platforms | Poets & Writers, NewPages, CLMP, Submittable Discover, TransArtists for residencies | Daily index delta; new/changed destination immediately; stable magazine guideline page every 7 days; open reading period every 24–72 hours |
| Visual arts, residencies, curatorial, photography, public art | visual-open-call, visual-residency, photography, public-art, printmaking-ceramics, curatorial, museum-gallery | Open-call platforms, residency networks, public-art application portals, curatorial submission tools | ArtConnect, CuratorSpace, CaFÉ/Creative West, Res Artis, TransArtists, World Photography Organisation | Daily bounded indexes; portal/API/partner feed preferred; destination fetch only for new/changed calls; official seasonal pages every 7 days, then daily while open |
| Film, screenwriting, documentary, animation and new media | film-festival, screenwriting, documentary, animation-new-media | Festival/application platforms and a small set of institutional program calendars | FilmFreeway, Sundance, Film Independent, IDA, Annecy, Ars Electronica | Partner/authorized platform delta daily; official deadlines/program index daily while active, otherwise every 7 days; hot deadline pages every 6–24 hours |
| Theatre, dance and live performance | theater-playwriting, dance-choreography, performance-art | Jobs/casting boards, theatre commons, dance service organizations, mobility desks | Playbill, HowlRound, Dance/NYC, On the Move | Daily index delta; high-turnover listings can be 6–12 hours; official project calls every 72 hours while open |
| Music and sound | music-composition | Regional industry desks, funders, professional-development programs, mobility calls | Music In Africa, PRS Foundation, New Music USA, On the Move, Help Musicians | Music In Africa index daily; funder/program pages every 72 hours while open and every 7 days otherwise |
| Architecture, design, craft, comics and illustration | architecture-built, craft-design, comics-illustration | Competition indexes and professional bodies | ArchDaily Competitions, Designboom, World Architecture Community, AIGA, Society of Illustrators | Daily or 48-hour index delta; first-party competition page on discovery and daily inside the final 14 days |
| Grants, fellowships, scholarships, awards and festivals | grants-us-national, grants-us-state, grants-international, fellowships, scholarships, awards-prizes, arts-festivals, conference-cfp | Government APIs, arts councils, funders, mobility desks and professional bodies | Grants.gov API, EU Funding & Tenders API, On the Move, national arts councils, named funders | Structured API delta daily; high-yield funder index daily/48 hours; single annual program weekly outside predicted opening window |
| Identity- and community-led opportunity lenses | bipoc-focused, lgbtq-focused, disability-arts, indigenous-arts | Specialist advocacy/service organizations plus every relevant art-form desk | Disability Arts Online, Queer\|Art, Indigenous arts bodies, regional African and diaspora desks | Daily/48-hour specialist index delta; first-party verification mandatory; retain lens separately from art form |

Identity-led rows are eligibility and community lenses, not standalone creative practices. A disability arts opportunity can also be theatre, dance, writing, or visual art; the source system should preserve both dimensions.

### Evidence behind the core choices

- Poets & Writers says its contest database covers the contests it published during the previous year and that staff review contest practices and policies. It is a curated literary discovery source, not the final authority for each application ([Poets & Writers](https://www.pw.org/grants)).
- NewPages accepts paid calls and contest listings, vets eligibility, posts classified ads on set weekdays, and publishes a weekly roundup. This gives Missa an observable update rhythm and also means advertiser text must be reconciled to the publisher's own page ([NewPages FAQ](https://www.newpages.com/faq/), [weekly roundup](https://www.newpages.com/blog/where-to-submit/)).
- On the Move covers all art forms and regions for supported international mobility and publishes explicit editorial criteria. Its calls are a cross-disciplinary discovery desk, while the linked organizer remains authoritative ([On the Move](https://on-the-move.org/), [editorial policy](https://www.on-the-move.org/about/editorial-policy)).
- TransArtists accepts residency submissions, manually checks them, distinguishes fixed from ongoing deadlines, and says publication can take eight to ten weeks. That makes it strong residency evidence, but not a real-time deadline authority ([TransArtists](https://www.transartists.org/en/join-database-and-update-your-listing)).
- ArtConnect lets registered users add opportunities and subjects posts to quality review. This is a high-volume, moderated user-supplied discovery channel ([posting guide](https://artconnect.zendesk.com/hc/en-us/articles/7992690237458-How-can-I-post-an-opportunity-residency-or-open-call), [quality policy](https://artconnect.zendesk.com/hc/en-us/articles/360017743600-Posting-opportunities)).
- CuratorSpace is both a continuously updated listing and an application manager created by curators. Its detail pages contain deadline, fee, organizer, FAQ and application state, so it can be treated as an application platform while the organizer identity remains independently verifiable ([CuratorSpace](https://www.curatorspace.com/opportunities), [platform model](https://www.curatorspace.com/support/tutorials/the-artists-guide-to-submitting-successful-opportunity-applications/293)).
- Submittable Discover is populated by organizations making live projects discoverable and stores deadline and tags in project settings. It is potentially the broadest structured source, but Missa should pursue a partner or permitted access route rather than assume crawling permission ([Discover](https://www.submittable.com/discover), [organization setup](https://submittable.help/en/articles/1611781-how-can-my-organization-use-submittable-s-discover-feature-to-promote-calls)).
- FilmFreeway is organizer-supplied and requires evidence from new festivals before listing them. It is the primary application rail for many festivals, but a partnership or licensed feed should precede systematic ingestion ([listing requirements](https://filmfreeway.com/help/article/16060/what-is-required-to-list-my-festival-on-filmfreeway)).
- Playbill accepts paid job and casting notices, reviews them, and says approval can take up to two business days. Its high turnover justifies a daily or twice-daily index delta, but listing payment is not proof of organizer authority ([Playbill](https://playbill.com/post-a-job)).
- Music In Africa describes opportunity research as a core editorial activity and says its portal publishes daily. It is the strongest region-specific daily music desk found in this pass ([Music In Africa FAQ](https://musicinafrica.net/about/faqs/), [annual report](https://www.musicinafrica.net/sites/default/files/attachments/press_release/202310/miafannualreport2022-23.pdf)).
- The Grants.gov public search API returns structured IDs, status, open date and close date without authentication for its search endpoint; the EU Funding & Tenders Portal exposes public REST services including grant updates. These should be queried as data sources, not scraped as websites ([Grants.gov API guide](https://www.grants.gov/api/api-guide), [EU APIs](https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/support/apis)).

## 3. How Opportunity Desks Obtain Their Supply

Representative desks use five supply models.

| Supply model | Representative sources | Implication for Missa |
|---|---|---|
| Organization self-service | Submittable, ArtConnect, CuratorSpace, FilmFreeway | High volume and structured fields; require organizer verification and platform-specific stable IDs |
| Paid classified or posting | NewPages, Playbill | Predictable publishing rhythm; paid placement is not a trust signal; preserve advertiser-provided provenance |
| Membership portal | Res Artis | Member identity is useful evidence; listing can lag the organizer and needs first-party reconciliation |
| Editorial curation and research | Poets & Writers, On the Move, Music In Africa | Strong screening and context; updates are editorial rather than transactional; retain editor/source timestamp |
| Official publisher/API | Grants.gov, EU Funding & Tenders, arts councils, named funders | Best source for stable IDs and status; use structured deltas and provider status transitions |

Missa should combine the best parts of these models: a free organization submission route, an explicit editorial/review gate, stable IDs, and evidence-backed updates. Paid promotion, if introduced later, must never buy a verification badge or alter ranking without clear labeling.

## 4. The Daily Core Versus the Long Tail

### Daily core

The daily core should contain sources that regularly expose multiple live opportunities or structured updates:

1. On the Move
2. Poets & Writers
3. NewPages
4. ArtConnect
5. CuratorSpace
6. Res Artis and TransArtists open-call indexes
7. CaFÉ/Creative West Opportunities
8. FilmFreeway only through a permitted or partner route
9. Playbill
10. Music In Africa
11. ArchDaily Competitions and one design competition index
12. Grants.gov and EU Funding & Tenders APIs
13. Disability Arts Online and a deliberately selected regional/identity desk set

These are not all equal. APIs and application platforms can provide structured authority; editorial directories provide discovery evidence. The source manifest must encode the difference.

### Long tail

Single-program organization pages should not be crawled every day year-round. They should be scheduled by state:

- dormant annual program: every 7–30 days, accelerating around the predicted opening window;
- open program, deadline more than 14 days away: every 72 hours;
- deadline inside 14 days: daily;
- deadline inside 72 hours: every 6–12 hours when the source permits it;
- rolling or until-filled: every 72 hours;
- closed program: verify once after closure, then weekly for 30 days, then return to seasonal monitoring;
- saved or followed opportunity: may receive a hotter user-facing monitoring lane, but still within source limits.

## 5. Incremental Crawl Design for Ingestion v2

Missa should never begin a daily run by crawling an entire domain.

```text
source schedule fires
  -> conditional API/feed/sitemap/index request
  -> compare ETag, Last-Modified, stable item IDs and semantic content hash
  -> no material delta: record healthy check and stop
  -> delta: enumerate bounded new/changed/removed listing evidence
  -> fetch only affected detail/application/official pages
  -> reconcile identity, deadline, fee, eligibility and destination
  -> write versioned reviewable evidence
  -> publication remains a separate gated action
```

Conditional requests using ETags and `If-None-Match` are defined by HTTP semantics and allow unchanged resources to return without transferring the full representation ([RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)). Sitemap `lastmod` is useful only when it reflects significant changes; Missa should measure whether each source uses it honestly before trusting it ([Google Search Central](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)). All source adapters must honor robots.txt according to the Robots Exclusion Protocol and also respect site terms and contractual restrictions ([RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html)).

### Required source-manifest fields

```yaml
source_id: stable internal id
name: human-readable source
source_role: structured-authority | official-publisher | application-platform | discovery-desk | community-signal
art_form_vertical_ids: []
eligibility_lenses: []
geographies: []
languages: []
entrypoint_url: https://...
structure: api | rss | sitemap | bounded-index | detail-page | newsletter
stable_item_id: provider id, URL rule, or selector
terms_status: allowed | partner-required | manual-only | blocked | unknown
robots_status: allowed | partial | blocked | unknown
expected_publish_rhythm: source-stated or unknown
observed_change_rate_30d: measured
base_cadence_hours: manifest policy
hot_window_policy: deadline/open-state policy
max_index_pages: bounded integer
max_changed_children_per_run: bounded integer
conditional_get: true
first_party_destination_required: true
publication_authority: none | application-state | full
failure_budget: consecutive failures and cooldown
submission_model: editorial | paid | membership | self-serve | api
last_human_reviewed_at: timestamp
```

`expected_publish_rhythm` and `base_cadence_hours` are deliberately separate. A weekly newsletter can summarize a website that changes daily; a daily news site may publish relevant opportunities only occasionally.

## 6. Duplicate Reconciliation

The current v2 writer hashes the authoritative URL to create an opportunity ID. That is insufficient for a multi-source, recurring system.

### Recommended identity model

1. `Organization`: verified issuer identity and domains.
2. `OpportunityFamily`: persistent program identity, such as “Annual Poetry Prize.”
3. `OpportunityCycle`: the 2026 call, application round, or edition.
4. `OpportunityTrack`: distinct categories that can have different eligibility, fees, or deadlines.
5. `ListingEvidence`: every directory, platform, official page, PDF, email, or user submission that describes the cycle.

### Matching priority

1. provider stable ID plus issuer;
2. application-platform project ID plus issuer;
3. normalized first-party application URL plus cycle;
4. official program URL plus explicit edition/year;
5. fallback fingerprint of verified issuer, normalized program name, cycle, geography, and deadline window.

The matcher must never merge solely because titles are similar. It must also avoid splitting one cycle because tracking parameters, language variants, or directory redirect URLs differ. Ambiguous matches become a `possible_duplicate` review edge, not an automatic merge.

When two sources disagree, retain both evidence records. Prefer the most recent authoritative first-party or structured-provider value for the public projection, and expose the conflict to review. Merge and split actions should produce an audit receipt so future runs do not repeat the same ambiguity.

## 7. Deadline Semantics

A deadline is an evidenced temporal claim, not one nullable date column.

### Required fields

```text
raw_text
kind: exact-instant | exact-date | date-range | rolling | ongoing | until-filled | recurring-window | unknown
local_date
local_time
timezone
timezone_evidence
precision
source_url
source_checked_at
announced_at
supersedes_deadline_id
confidence
conflict_state
```

### Rules

- Preserve the exact source wording before normalization.
- If the source gives a date but no time, do not invent UTC. Display the date and only use source-local end-of-day when the relevant timezone is known and the product clearly labels that interpretation.
- If a platform exposes an exact closing instant, it outranks an imprecise directory date for application availability.
- `Rolling`, `ongoing`, and `until filled` are distinct. None receives a fabricated deadline.
- An extension creates a new deadline version and a `deadline_extended` change event; it does not silently overwrite history.
- Conflicting first-party page and application-platform deadlines require review unless one source explicitly records the extension or closure.
- The public `closing soon` label is derived from the authoritative instant/date interpretation; it is not a source status.
- If the application endpoint closes early, mark application state closed immediately and retain the conflicting announced deadline as evidence.
- Unknown deadlines may remain discoverable with a clear “verify at source” warning, but they must not be sorted as though they had an exact date.
- Recurring annual calls receive a new `OpportunityCycle`; a previous deadline is evidence for prediction, never the current deadline.

## 8. Organization Submission, Creator Suggestion and Claim Routes

### Verified organization submission

Organizations should be able to submit or update an opportunity with:

- official organization identity and domain;
- official program and application URLs;
- raw deadline wording, local time and timezone;
- opening and closing states;
- fees, waivers, compensation, funding and benefits;
- eligibility, geography, languages and accessibility;
- Missa art-form taxonomy selections;
- contact and correction channel;
- confirmation that the submitter is authorized to represent the organization.

Domain-email verification or organization admin verification moves the record from `submitted` to `organization-confirmed`; it still enters `reviewable`, not public state.

### Creator suggestion

A creator supplies a URL and optional note. This creates discovery evidence only. Missa fetches the official destination, reconciles it, and reviews it. The creator is not presented as the publisher.

### Claim and correction

An organization can claim an existing record, prove control, view the evidence Missa has, propose corrections, and optionally convert the listing into a Missa-managed call. Public corrections should retain a change log. A removal request should have a clear, fast route and an auditable outcome.

### Trust display

The public record should say:

- source/organizer;
- application destination;
- “last checked” time;
- whether the organization is confirmed;
- deadline precision and timezone;
- whether a material field changed;
- a correction link.

That is how Missa becomes a trusted source: it makes evidence, freshness and correction legible.

## 9. What Must Change in v2

### Keep

- source-to-first-party destination reconciliation;
- robots checks and bounded destination fetching;
- reviewable writes separated from public publication;
- content hashes and stored snapshots;
- fail-closed publication gates.

### Replace or extend

1. Replace URL-only opportunity IDs with family/cycle/track identity.
2. Add listing evidence as a many-to-one graph rather than treating a source URL as the opportunity.
3. Replace blanket cadence with manifest and observed-change scheduling.
4. Add API/feed/sitemap/index adapter classes before adding more generic HTML crawling.
5. Store ETag, Last-Modified, semantic hashes and stable listing IDs; stop after an unchanged root.
6. Add deadline kind, time, timezone, raw value, versions and conflicts.
7. Add removed/closed detection from index deltas.
8. Add per-source crawl budgets, circuit breakers, health SLOs and manual-only/partner-required states.
9. Add organization submission, creator suggestion, claim, correction and removal evidence types.
10. Keep every newly ingested record review-only until replay parity, deterministic gates and explicit publication approval pass.

## 10. Recommended First Source Tranche

Start with twelve integrations, not the entire 1,123-entry registry.

| Priority | Source | Why first | Adapter |
|---|---|---|---|
| 1 | Grants.gov | Stable structured IDs/status/dates | API delta |
| 2 | EU Funding & Tenders | Public API plus update service | API delta |
| 3 | On the Move | Global, all-art-form, high-quality mobility calls | Bounded index + destination reconciliation |
| 4 | Poets & Writers | High-trust literary curation | Bounded database/index + destination reconciliation |
| 5 | NewPages | Observable weekly/daily publishing rhythm | Bounded index + destination reconciliation |
| 6 | TransArtists | Global multi-disciplinary residency structure | Bounded calls index + official residency destination |
| 7 | ArtConnect | High-volume visual opportunity discovery | Bounded index; discovery only |
| 8 | CuratorSpace | Structured visual/curatorial opportunity and application pages | Bounded index + platform detail |
| 9 | Playbill | High-turnover theatre/casting/jobs | Bounded index + detail |
| 10 | Music In Africa | Daily Africa-focused music opportunity desk | Tag/feed index + official destination |
| 11 | ArchDaily Competitions | High-yield architecture competition index | Bounded index + official competition destination |
| 12 | Sundance deadlines/applications | Well-structured film program calendar | Purpose-built deadlines adapter |

Submittable, FilmFreeway, CaFÉ and Res Artis are strategically important, but should enter the tranche through an approved access, partner, or platform-specific route. Do not make systematic crawling the default assumption.

## 11. Thirty-Day Validation Plan

For each tranche source, capture daily:

- root HTTP status, ETag, Last-Modified and semantic hash;
- number of listing IDs seen, new, changed, removed and unchanged;
- number of child fetches avoided;
- true opportunity yield and noise;
- first-party destination resolution rate;
- duplicate rate before and after reconciliation;
- exact/rolling/unknown/conflicting deadline distribution;
- source-to-first-party deadline disagreement rate;
- human review acceptance/rejection reasons;
- requests, bytes, time and failures per accepted record.

After 30 days, set cadence from evidence. Keep a source in the daily core only if it has repeated opportunity yield or provides structured status changes. A prestigious annual program can remain trusted without being daily.

## 12. Strategic Conclusion

Missa should not compete by crawling more pages. It should operate a disciplined source network:

1. high-yield desks reveal supply;
2. official pages and application platforms establish facts;
3. an evidence graph reconciles duplicates and conflicts;
4. precise deadline semantics protect creator trust;
5. delta-based monitoring avoids waste;
6. organizations and creators can submit, claim and correct;
7. publication remains separate, reviewed and auditable.

The next research layer is the supply-side partnership map: for each core desk, document who submits the opportunity, whether the source charges, how it moderates, whether it offers an API/export/partner feed, and what a mutually beneficial syndication arrangement with Missa would look like. That is the route from consuming other trusted sources to becoming infrastructure they can publish into.

## Source Limitations

- Public pages do not consistently publish formal update schedules. Recommended cadences are policy hypotheses until measured.
- Platform access and reuse terms require source-by-source legal and partnership review; robots permission alone is not a reuse license.
- Regional coverage in this first pass is uneven. The daily core should be expanded deliberately with Africa, Asia, Latin America, Middle East and Oceania source desks after the first tranche proves the model.
- Source prestige does not guarantee that every listing is accurate. Opportunity-level reconciliation and freshness are always required.
