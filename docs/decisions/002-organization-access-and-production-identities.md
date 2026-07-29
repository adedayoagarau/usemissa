# ADR-002: Centralize Organization Access and use UUID-backed production identities

## Status

Accepted

## Date

2026-07-29

## Context

Organization routes currently check membership independently and several nested mutations do not prove that their Team, Program, Opportunity, Submission, or Review Round belongs to the organization in the URL. Any member can also grant administrative membership. Both Radar and Workspace restart sequential ID counters on a production cold start, allowing collisions with loaded records.

## Options Considered

### Option A: Continue route-local checks and counters

- Pros: smallest code change
- Cons: authorization rules keep leaking across routes; cold starts can overwrite existing IDs

### Option B: Central Organization Access module and injected ID adapters

- Pros: one policy interface; negative tests exercise the same interface as callers; deterministic IDs remain available in tests
- Cons: compatibility stores still require a later row-persistence cutover

### Option C: Adopt an external identity platform immediately

- Pros: managed sessions and enterprise identity features
- Cons: does not solve resource ownership; requires an identity and organization migration before requirements are stable

## Decision

We choose **Option B**. Web routes authorize through one Organization Access module that resolves the session, membership role, and organization-owned resource. Structural mutations require the `admin` role; reviewer actions remain scoped to the assigned account.

Radar and Workspace production construction use prefixed UUID IDs. Tests and deterministic demos keep sequential adapters through the same ID interface.

## Consequences

- Cross-tenant nested IDs return a not-found response without revealing foreign resources.
- Members cannot grant or elevate organization roles.
- Privileged Workspace mutations append an audit event through the current compatibility implementation. Audit and Workspace writes are not atomic until row repositories share one transaction.
- External identity remains deferred until the enterprise roles, seats, and SSO migration is designed.
