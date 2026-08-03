---
epic: 8
story: 8.2
status: review
title: Decision email templates and bulk send
---

# Story 8.2: Decision email templates and bulk send

## Delivered

- Admin-only preview route `POST /api/orgs/:id/decision-emails/preview` with per-Work interpolation (`{{workTitle}}`, `{{outcome}}`) and recipient resolution.
- Admin-only bulk send route `POST /api/orgs/:id/decision-emails/send` using Resend when `RESEND_API_KEY` and `RESEND_FROM` are configured.
- Every successful send records recipient, subject, decision, and timestamp in the audit log; missing provider configuration fails closed with a setup response.

## Release gate

Configure and verify Resend in Vercel before enabling production sends. Preview remains available without a mail provider.
