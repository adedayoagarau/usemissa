# ADR-004: Fail closed when the production opportunity repository is unavailable

## Status

Accepted

## Date

2026-08-31

## Context

The current repository selector can use a deterministic compatibility repository when the explicit PostgreSQL configuration is absent. This is useful for local development and browser fixtures, but an accidental production fallback could display seeded records as though they were the public catalogue.

## Options Considered

### Option A: Preserve silent fallback in every environment

- Pros: the route continues rendering when configuration is missing
- Cons: availability is achieved by presenting non-authoritative data as real catalogue state

### Option B: Remove the compatibility repository

- Pros: one runtime implementation
- Cons: harms deterministic local development and isolated UI review

### Option C: Keep explicit local fixtures and fail closed in production

- Pros: truthful production behavior; deterministic local work remains possible; configuration failure is observable
- Cons: a production misconfiguration becomes a visible unavailable state

## Decision

We choose **Option C**. Local and test environments may select deterministic fixture data explicitly. Production requires the explicitly configured PostgreSQL repository and returns an observable unavailable response when that authority cannot be initialized. A presentation selector may never select data authority or bypass this rule.

## Consequences

- The selector has configuration tests for local, test, and production modes.
- Public APIs return a bounded `503`; pages render a customer-safe unavailable state.
- The public unavailable state must not expose credentials, connection details, worker state, or internal source-health metadata.
