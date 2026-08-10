# Missa Organization Insights screen contract

Date: 8 August 2026  
Status: Option 2 implemented as a local read-only Organization projection; production promotion blocked  
Selected visual direction: **02 — Program lens**

## 1. Purpose

Organization Insights is an operating review, not a vanity dashboard. It should help an authorized Organization member answer three questions:

1. Is intake arriving at a pace the team can handle?
2. Are reviews and Work-level decisions moving to completion?
3. Which Opportunities or workflow stages need attention next?

The screen must never imply that a high acceptance rate, a fast decision, or a large submission count means that a program is successful. It must expose metric definitions, denominators, scope, missing data, and non-comparable periods.

## 2. Current truth and known limits

The existing Organization report can currently derive:

- Submissions received by Organization and by `submittedAt` month;
- current Work-level decisions by outcome;
- current review assignments and whether each assignment is complete;
- current accepted-Work delivery task state;
- recorded Submission payment state and fee amount.

It cannot currently support the following customer-facing claims safely:

- call views, draft starts, or a viewed-to-submitted funnel;
- historical decision activity after corrections or deletion without reconstructing audit history;
- review lateness because review assignments have no created or due date;
- demographic or equity analysis because form answers are not classified for purpose, consent, sensitivity, or lawful use;
- currency-safe fee or payout totals because Submission fees do not carry a currency ledger;
- awards, refunds, waivers, grant amounts, contracts, or proof of fulfillment;
- additive percentage distributions across multi-valued practice taxonomy terms;
- reliable Organization-local date buckets because an Organization timezone is not yet configured.

The current `reportingForOrganization` helper also requires correction before product promotion:

- it calls accepted Work decisions divided by all Work decisions a conversion rate;
- it includes partially decided Submissions in decision-time calculation;
- for an even sample it chooses the upper middle value instead of averaging the two middle values;
- it mixes Submission and Work grains without explaining that difference.

The local library direction fixes the language and interaction contract without altering that compatibility helper. The canonical local `/organization/[id]/insights` route now uses a separate tested projection that deduplicates Work decisions, includes only fully decided Submissions in outcome-time, averages even medians, keeps all twelve taxonomy facets independent, and exposes exclusions. It remains all-time until Organization timezone exists.

## 3. Users and permission projections

| Role | Decisions supported | Data deliberately withheld |
| --- | --- | --- |
| Owner, Admin, Team admin | Organization-wide operational review | Sensitive person-level attributes unless separately authorized |
| Program manager | Programs and Opportunities in their assigned scope | Other programs, private reviewer notes, finance detail without capability |
| Reviewer | Their queue and aggregate round context | Other reviewers' identity, notes, or person-level ranking |
| Finance | Payment-state counts and exceptions when currency/accounting contracts exist | Artistic scores, reviewer notes, sensitive form answers |
| Legal | Consent, rights, agreement, and audit measures when those contracts exist | Artistic ranking and finance detail without capability |
| Viewer | Read-only approved aggregate views and exports | Mutations and restricted drill-down |
| Guest | No Insights by default | All Organization reporting unless explicitly granted |

The compatibility `member` role needs an explicit capability mapping before promotion. Role names alone must not decide access in product code.

## 4. Metric hierarchy

### Primary measures

| Metric | Formula | Grain | Date basis | Caveat |
| --- | --- | --- | --- | --- |
| Submissions received | count of in-scope Submissions | Submission | `submittedAt` | A Submission may contain multiple Works |
| Decided Works coverage | Works with a current decision / in-scope Works received | Work | Submission cohort | Withdrawn Work cannot yet be distinguished independently from a withdrawn Submission |
| Median complete-outcome time | median of days from `submittedAt` to the latest Work decision, only for Submissions where every Work has a decision | fully decided Submission | Submission cohort | Show no value when no Submission is fully decided; average the two middle values for an even sample |

### Drivers

- review completion: completed assignments / assignments in the selected current round or Opportunity;
- undecided Works count;
- partially decided Submissions count;
- current outcome counts by accepted, waitlisted, and declined Work;
- intake volume over time.

### Guardrails

- missing or invalid dates;
- Works with missing or deprecated practice taxonomy references;
- incomparable period warning;
- hidden sensitive or small-sample slices;
- imported records whose event dates or provenance are incomplete;
- records excluded from a metric, with a reason and count.

### Secondary diagnostic

`Accepted Works among decided Works = accepted current Work decisions / all current Work decisions.`

This is never labelled conversion, quality, impact, success, or performance. It is not displayed when the denominator is zero.

## 5. Scope and date rules

- Scope can be All Opportunities, a Program, or one Opportunity.
- Date range applies to the cohort described beside each metric. Intake and outcome-coverage views default to Submissions received in the selected period.
- Decision activity by `decidedAt` is a separate metric and must not silently replace cohort outcome coverage.
- Compare is available only when both periods have equivalent duration, scope, timezone, and metric definition.
- A missing timezone blocks date-bucket comparison. The screen may still show non-time-bucketed current counts with a clear setup action.
- Filters are URL-backed before product promotion and survive reload, export, and Back navigation.
- No customer-facing source freshness, update-health, worker, provider, or confidence fields appear.

## 6. Practice taxonomy rules

The 12 practice facets remain independent. Insights exposes one selected facet at a time and uses stable term IDs beneath human-readable labels.

- A Work can carry more than one term in a facet.
- Term rows therefore show **Works tagged**, not additive shares.
- The total across term rows may exceed the number of Works; the interface states this beside the table.
- Pie, donut, 100% stacked, and share-of-total charts are blocked until the domain records a primary term or an approved allocation rule.
- Free-text Submission category remains separate from canonical practice taxonomy.
- Practice taxonomy never stands in for eligibility, geography, demographics, source, fees, dates, outcome, or quality.
- Deprecated terms remain readable in historical records and are identified in the data-quality section.

## 7. Privacy and small samples

- General workflow totals can display exact counts to authorized Organization roles.
- Any person-level, reviewer-comparison, demographic, equity, or sensitive-answer slice is suppressed when `n < 10`.
- Complementary suppression is required where another visible cell would reveal a suppressed count by subtraction.
- The screen does not infer demographic attributes from names, text, geography, or practice taxonomy.
- Demographic/equity reporting is blocked until each field has purpose, consent, sensitivity, retention, and role-access metadata plus legal approval.
- Reviewer scoring is for rubric calibration, never an individual quality leaderboard. A reviewer sees their own records; authorized managers see privacy-safe aggregates only.
- Export applies the same permission and suppression rules as the screen.

## 8. Selected information architecture: Program lens

1. Organization and page identity.
2. Scope bar: date range, Program/Opportunity, comparison, metric definitions, export.
3. Three primary metric cards with denominator, cohort wording, and exclusion note.
4. Intake and capacity section with accessible trend and data-table fallback.
5. Review and decision section with completion, undecided Works, partial packets, and outcome counts.
6. Opportunity comparison table for operational prioritization.
7. Practice lens with a single facet selector and non-additive tagged-Work rows.
8. Data-quality and unavailable-analysis panel.

On narrow screens, cards become a compact vertical summary, charts retain a data-table alternative, and the comparison table becomes labelled Opportunity records. No horizontal page scroll is required.

## 9. Required states and adversarial fixtures

The local library must demonstrate:

1. healthy multi-Opportunity program;
2. first-use empty Organization;
3. one Submission and no decision denominator;
4. partially decided multi-Work Submission;
5. fully decided multi-Work Submission;
6. accepted/waitlisted/declined mix;
7. no completed review assignments;
8. reviews present with no due-date model;
9. decision corrected after initial entry;
10. deleted decision returns a Work to undecided;
11. imported record with missing date;
12. missing Organization timezone;
13. non-comparable previous period;
14. zero previous-period denominator;
15. very large volume;
16. one-month range;
17. long Opportunity names;
18. one Work with multiple terms in one facet;
19. deprecated taxonomy term;
20. no taxonomy terms;
21. sensitive slice below ten;
22. complementary suppression;
23. demographic analysis unavailable;
24. reviewer self projection;
25. reviewer-manager aggregate projection;
26. Finance projection without currency ledger;
27. Legal projection without consent metadata;
28. Viewer read-only projection;
29. Guest denied projection;
30. Program manager restricted to one Program;
31. slow loading;
32. recoverable data error;
33. offline cached structure without claiming current figures;
34. export permission denied;
35. accessible keyboard and screen-reader traversal;
36. 320, 390, 768, 1280, and 1536 pixel viewports.

## 10. Premium component anatomy

| Job | Premium Shadcn Studio anatomy | Missa adaptation |
| --- | --- | --- |
| Direction and section navigation | `tabs/tabs-11`, overflow behavior from `tabs/tabs-14` | Named, keyboard-operable destinations; not hidden page hierarchy |
| Metric cards | `card/card-09` and `card/card-07` | Quiet bordered cards with value, denominator, definition, and exclusion note; no decorative trend arrows |
| Scope controls | `select/select-01`, `date-picker/date-picker-10`, `popover/popover-01` | Labelled controls with URL-backed state before product promotion |
| Trend | Shadcn chart primitive with Recharts; premium card anatomy | Aubergine line/bar, semantic focus/tooltip, and always-present data table |
| Operational comparison | `data-table/data-table-04` desktop, `list/list-03` mobile | Opportunity, cohort, Works, coverage, review completion, and next action |
| Definitions and exclusions | `sheet/sheet-04`, `alert/alert-17` | Durable definitions and excluded-record reasons; never hover-only |
| Taxonomy lens | `select/select-01`, `table/table-03`, `badge/badge-04` | One facet at a time, non-additive tagged-Work counts, stable term identity |
| Empty/loading/error | `skeleton/skeleton-12`, `alert/alert-18`–`alert-20` | Geometry-matched loading and durable recovery states |

Animated, gradient, marketing KPI, social-proof, leaderboard, gauge, and gamified dashboard variants are rejected for this surface.

## 11. Product promotion gates

Promotion remains blocked until:

- metric formulas are implemented as versioned definitions with automated fixtures;
- Organization scope and typed role capabilities are enforced server-side;
- date basis and Organization timezone are explicit;
- correction/deletion history is represented for activity reporting;
- event instrumentation exists for any funnel stage shown;
- privacy classification, minimum-cell suppression, and export parity are implemented;
- URL-backed filtering and resilient export are complete;
- keyboard, screen-reader, zoom, phone, tablet, loading, error, and offline QA pass;
- the user explicitly approves product integration.

## 12. Local implementation boundary

The canonical local route is read-only. Owner and Admin receive the aggregate Program lens; Viewer receives the same non-person-level aggregate; Finance receives payment-state counts without currency totals. Team admin and Program manager totals remain withheld until their Team/Program scope is enforced by the server. The route adds no analytics event instrumentation, export, demographic slice, date comparison, mutation, schema change, or production deployment.
