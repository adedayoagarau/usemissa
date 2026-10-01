# Missa Pricing Pilot Plan

**Status:** planned. No billing credentials are used and no customer is charged until this plan is explicitly approved and instrumented.
**Date:** 2026-09-30
**Reads with:** `missa-pricing-entitlement-mapping.md`, `missa-pricing-wtp-interview-guide.md`

## Purpose

This is the only step that converts the pricing hypothesis into a price. It
bounds one paid experiment to a small cohort on real payment rails, measures
activation, renewal, and payment failure, and stops before a public price card
is shown. It is deliberately smaller than a launch.

## Scope of the pilot

- One offer: the creator leverage tier (`indie`), the segment the research
  flags as most plausible for optional paid workflow value.
- One region to start: Nigeria, because payment-rail behavior there differs from
  the default US card assumption and it is the equity case that matters most.
- Non-renewing 30-day pass as the primary instrument, alongside an optional
  auto-renewing monthly path for comparison. The pass form is the rail that
  reaches weak-currency and direct-debit-limited users.

## What must be true before the pilot runs

1. The `indie` entitlements from the mapping are implemented and fail closed.
2. Discovery, official links, core facts, basic Save, and export remain free.
3. The pass and subscription are both provider-hosted; Missa never touches card
   details.
4. Durable billing events (Stripe webhook ledger) and product events
   (`billing.plan_viewed`, `billing.plan_selected`, `billing.checkout_started`,
   `billing.subscription_cancel_scheduled`) are recording before any price is
   shown.

## Metrics

- Activation: passes and subscriptions started per `plan_selected` click.
- Conversion: completed checkout per `checkout_started` (from the webhook ledger).
- Renewal: pass repurchase and subscription period-end renewal rate.
- Payment failure: declined/failed checkout and failed renewal attempts, split
  by rail (card vs pass).
- Fairness guard: no change in free discovery usage or Save continuity
  attributable to the paywall.

None of these is revenue; conversion is measured against the durable webhook
ledger, never against checkout-session creation alone.

## Success and stop conditions

Stop and do not widen if: conversion is below the pre-agreed floor, payment
failure is materially higher on one rail, or the paywall measurably reduces
free discovery trust. Success is not "people paid once"; it is sustained
activation plus renewal at a rate that supports the tier without damaging the
free boundary.

## Output

A short report that maps the observed conversion and renewal onto the
provisional price band from the research, states the payment-rail constraint,
and either advances to a broader rollout or revises the hypothesis. Until that
report exists, no exact price is presented as settled.
