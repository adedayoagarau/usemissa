---
title: Missa pitch data pack
as_of: "2026-10-09"
refresh: psql "$DATABASE_URL" -X -f docs/pitch/metrics.sql
companions:
  - docs/pitch/missa-pitch-data.xlsx
  - Claude Doc "Missa pitch data pack" (shared copy)
---

# Missa pitch data pack

This is the one place every Missa pitch takes its numbers from. Pick your
audience below, take the numbers it lists from **Key numbers**, and refresh them
with `metrics.sql` before each use.

| Label    | Meaning                                                      | Safe in a pitch?           |
| -------- | ------------------------------------------------------------ | -------------------------- |
| Verified | Counted from the production database or checked against code | Yes, with the as-of date   |
| Estimate | Worked out from public data with stated assumptions          | Yes, say it's an estimate  |
| Gap      | Not known yet; see **Data gaps**                             | No                         |

## Key numbers (9 October 2026)

| Number                                       | Value                    | Status   | Source                                  |
| -------------------------------------------- | ------------------------ | -------- | --------------------------------------- |
| Published calls                              | 6,011                    | Verified | `opportunities`                         |
| Calls open or opening soon                   | 3,786                    | Verified | Deadline not passed                     |
| Organizations with a published call          | 2,526                    | Verified | `opportunities`                         |
| Organizations tracked in total               | 10,492                   | Verified | `radar_organizations`                   |
| Active sources monitored                     | 4,231 of 14,277          | Verified | `radar_sources`                         |
| Source pages stored as evidence              | 605,720                  | Verified | `gary_source_pages`                     |
| Publication profiles                         | 11,384                   | Verified | `gary_profiles`                         |
| Magazines in the ranking index               | 634                      | Verified | `missa_magazine_rankings`               |
| Calls added in the last 30 days              | 1,174                    | Verified | `opportunities.created_at`              |
| Calls rechecked in the last 30 days          | 1,017 (17%)              | Verified | `opportunities.source_checked_at`       |
| Calls with no entry fee                      | 1,797                    | Verified | `fee_status = no-fee`                   |
| Median entry fee, where charged              | $15                      | Verified | 1,421 USD-priced calls                  |
| Real sign-ups                                | 24                       | Verified | Excludes test domains                   |
| Calls saved / submissions by real users      | 10 / 1                   | Verified | `tracked_opportunities`                 |
| Site visitors, 3–9 Oct 2026                  | 220                      | Verified | `site_events`; tracking began 3 Oct     |
| Revenue                                      | $0                       | Verified | Stripe ledger holds one test only       |
| Plus price                                   | $6 a month or $60 a year | Verified | `apps/web/lib/creatorBilling.ts`        |
| Creator SAM                                  | $30–60M a year           | Estimate | See **Market size**                     |
| Submittable 2024 revenue                     | About $66.6M             | Estimate | Latka, third-party                      |

The account table holds 366 rows, but 341 are seeded `example.com` test
accounts. Never quote 366.

### Published calls by type

| Type                                    | Calls |
| --------------------------------------- | ----: |
| Magazines                               | 2,559 |
| Residencies                             | 1,227 |
| Contests                                |   739 |
| Grants                                  |   304 |
| Open calls                              |   297 |
| Fellowships                             |   286 |
| Awards                                  |   206 |
| Other (jobs, conferences, scholarships) |   146 |
| Exhibitions                             |   132 |
| Festivals                               |   115 |

Coverage gaps to fix before quoting coverage: 77% of calls have no country, 45%
have an unknown fee, and discipline labels have about 20 duplicate spellings.

## Market size (estimate)

| Layer                      | Assumption                                                                 | Estimate             |
| -------------------------- | -------------------------------------------------------------------------- | -------------------- |
| Creator TAM                | 2.9M US artists (NEA 2024), widened to 5–10M people, × $60 a year           | $300–600M a year     |
| Creator SAM                | 0.5–1M people who send work out regularly, × $60 a year                     | $30–60M a year       |
| Creator SOM, 2–3 years     | 10–20k paying Plus members                                                  | $0.6–1.2M a year     |
| Organization market        | Submittable about $66.6M a year, plus SurveyMonkey Apply, OpenWater, others | A few hundred million dollars a year |

## Competitors

| Company            | Who pays      | Price                                  | Scale                                                  |
| ------------------ | ------------- | -------------------------------------- | ------------------------------------------------------ |
| Submittable        | Organizations | Enterprise                             | About $66.6M revenue (2024); 1.18M applicants (2025)   |
| Chill Subs         | Writers       | Free; $10 a month; bundle $20 a month  | 80,000 users (March 2026)                              |
| Duotrope           | Writers       | $6 a month or $60 a year               | 7,211 publishers and agents listed                     |
| Submission Grinder | Donations     | Free                                   | 2,033 users in year one (2013)                         |
| FilmFreeway        | Festivals     | Fees per submission                    | 400,000+ filmmakers (undated)                          |

## Moats

| Moat                                 | State   | Strength today                              |
| ------------------------------------ | ------- | ------------------------------------------- |
| Source-linked catalogue kept current | Built   | Medium; only 17% rechecked in 30 days       |
| Each artist's submission history     | Built   | Low; few users                              |
| Response times from writers' reports | Built   | Low; 3 reports so far                       |
| Organizations claiming listings      | Planned | None; claim routes are switched off         |
| Two-sided marketplace                | Planned | None yet; the long-term moat                |

## Business model

| Plan          | Price                    | State                                   |
| ------------- | ------------------------ | --------------------------------------- |
| Free          | $0, up to 10 active calls | Live                                   |
| Plus          | $6 a month or $60 a year | Live in Stripe; no paying members yet   |
| Pro           | Not set                  | Advertised, no checkout                 |
| Organizations | Not set                  | Can't be sold yet                       |

## Audience modules

**Investors.** Open with the catalogue: 6,011 calls from 2,526 organizations,
each linked to the organizer's own page. Use creator SAM and Submittable's
revenue. Tell the marketplace story. Leave out user and revenue counts until
they grow.

**Accelerators and grants.** Open with the messaging line: Missa does the second
job of being an artist. Use 1,797 no-fee calls, the $15 median fee and 3,786
calls open now. Leave out the organization market unless the funder backs
companies.

**Organizations.** Open with "your call is already on Missa". Use 2,526
organizations and 634 ranked magazines. Show views and saves of their own
listing once those exist. Don't quote total users while they're small.

**Partners and press.** Open with one striking finding from the catalogue. Use
6,011 calls, 2,559 magazines, 1,227 residencies and 1,797 no-fee calls.

## Data gaps

- [ ] Remove or exclude the 341 seeded test accounts in production metrics
- [ ] Weekly sign-ups, weekly active users and saves per user, as a chart
- [ ] First paying Plus members
- [ ] Raise the 30-day recheck share above 17%
- [ ] Fill fee (45% unknown) and country (77% blank)
- [ ] Views and saves per organization listing
- [ ] 5–10 artist quotes and 3 editor or program-staff quotes
- [ ] One press-worthy finding from the catalogue
- [ ] Organization pricing and a Pro checkout
- [ ] Founder story, team and the ask

## Sources

- Missa production database, read-only queries in `metrics.sql`, 9 Oct 2026
- `docs/missa-feature-review-2026-10-06.md`
- [NEA: Artists in the workforce](https://www.arts.gov/sites/default/files/a1-report-202605.pdf)
- [Submittable 2025 year in review](https://www.submittable.com/blog/contentful-blog-2025-our-year-in-review)
- [Latka: Submittable](https://getlatka.com/companies/submittable)
- [Chill Subs March 2026 roundup](https://www.chillsubs.com/blog/march-2026-roundup)
- [Chill Subs memberships FAQ](https://support.chillsubs.com/faq/memberships)
- [Duotrope FAQ](https://duotrope.com/about/faq.aspx)
- [The State of the Grinder: Year One](https://www.diabolicalplots.com/?p=4021)
- [MovieMaker: FilmFreeway](https://www.moviemaker.com/filmfreeway/)

Web figures come from search summaries and third-party estimates. Confirm each
page before an investor sees it.
