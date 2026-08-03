---
epic: 9
story: 9.1
status: review
title: Basic reporting dashboard
---

# Story 9.1: Basic reporting dashboard

Workspace now derives organization-scoped submission volume, accepted/declined/waitlisted counts, conversion, median days from submission to final Work decision, and monthly submission counts. The admin Submissions view exposes the metrics without leaking another organization's records.

API: `GET /api/orgs/:id/insights`.
