---
epic: 9
story: 9.2
status: review
title: Organization data export
---

# Story 9.2: Organization data export

Admins can download `GET /api/orgs/:id/insights/export` as CSV with Submission, Work, and Decision rows. Organization access is resolved from the session before any rows are assembled; foreign organization IDs return 403/404 and never alter the export.
