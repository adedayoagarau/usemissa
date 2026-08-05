# Story 14.4: Platform product analytics and metric definitions

Status: done

## Story

As a Missa platform operator, I want adoption, workflow funnel, Radar quality,
and operational trend metrics with definitions, so that I can make product
decisions from observed data rather than ambiguous counters.

## Scope

Build a platform-admin-only `/admin/analytics` derived read model from current
runtime stores. This story provides transparent operational/product summaries;
it does not pretend to be an event warehouse.

## Metric contract

Every visible metric must state its grain, calculation, source, freshness, and
maturity. Initial metrics:

- active organizations/accounts: organizations/accounts whose records are not
  inactive or whose observed membership/activity exists;
- open-call funnel: draft/published/closed counts from Workspace open calls;
- submission funnel: submissions by status and submission month;
- decision funnel: decisions by outcome and decision month;
- acceptance rate: accepted decisions divided by all decisions, with an empty
  denominator shown as `—`;
- delivery completion: completed delivery tasks divided by all delivery tasks;
- Radar freshness: active/attempted/fetched/processed/stale source counts;
- queue health: open/attention/in-progress rows from the existing operations
  read model.

## Explicit non-goals

Do not claim retention, cohorts, attribution, experiments, revenue recognition,
event-level activation, scheduled reports, or warehouse-grade historical facts.
Those need durable product-event/fact schemas and retention/privacy policy.

## Test plan

- Unit: denominators, month bucketing, zero-state formatting, source/freshness
  labels, and private-content exclusion.
- Page/route: platform-admin protection and dynamic read behavior.
- E2E: stacked mobile layout and table/chart region containment.

## Implementation and validation

- Added the derived `/admin/analytics` page and protected
  `GET /api/admin/analytics` route with current adoption, workflow, Radar
  quality, queue, and monthly flow metrics.
- Each metric includes a native grain, calculation/detail, source, freshness,
  and maturity boundary. Zero denominators render as `—` rather than a false
  success rate.
- Explicitly excluded retention, cohorts, attribution, experiments, revenue
  recognition, and warehouse-grade event claims until a durable event/fact
  model exists.
- Focused projection tests cover native grains, empty denominators, and the
  event-warehouse boundary; the platform E2E covers the page on desktop/mobile.
