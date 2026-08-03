---
epic: 8
story: 8.1
status: review
title: Per-Work decision recording
---

# Story 8.1: Per-Work decision recording

Decisions attach to a Work, never only to a Submission. A packet can therefore contain accepted, declined, and waitlisted Works while Missa derives the packet summary.

## Delivered

- One-decision-per-Work domain invariant with organization-scoped create/update/delete.
- Derived Submission summaries (`accepted`, `declined`, `waitlisted`, `partially-accepted`, `mixed`) with no hand-set terminal status.
- Append-only Workspace audit records and additive `decisions`/`workspace_audit_log` Neon tables.
- Admin route `POST /api/orgs/:id/works/:workId/decision` and Submission response decision projection.
- Admin inbox Work rows now expose keyboard-friendly outcome selection.

## Validation

Workspace engine: 21 passing, 1 live-Postgres integration test skipped. Web typecheck/build pass. Cross-organization Work IDs are rejected without disclosure.
