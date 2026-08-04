# Implementation Status — What Exists Today

This section is refreshed against the current repository and deployment state (2026-08-03). The product is no longer a Radar-only prototype.

- **Built and tested:** the Radar intelligence engine and production adapters, the Next.js application shell, auth/session flows, public profiles and privacy controls, opportunities browse/detail, saved searches, Inbox and alert delivery, Tracker views/imports, Library/Works/Saved Answers, Gmail review-mode sync, organization/team/program/open-call management, form builder, public organization pages, submitter drafts/uploads/submissions/receipts/withdrawal, reviewer assignment and rubric recording, per-work decisions and delivery tasks, reporting/export, Stripe billing flows, organization seats/roles, SCIM-style provisioning, open-call and submission migration imports, and private progress props.
- **Submission integrity hardening:** idempotent submission retries, payment lifecycle reconciliation, private Blob streaming, bounded draft cleanup, per-work attachments, private decision alerts, and malware scanning before storage are implemented. Production file uploads fail closed until a provider is configured; Preview/local use the executable-signature policy.
- **Current validation:** the package suite is green (7 contracts, 2 DB, 86 Radar, 20 Radar-adapter, 32 Workspace with one expected live-Postgres skip) and all 21 web Playwright flows pass.
- **Landing and application:** the public landing and app are separate Vercel deployments joined by the documented domain plan. The latest app Preview is available from the deployment notes; production has Neon configured for the application and opportunities repository.
- **Still deployment-dependent:** a hosted Radar worker (or the bounded cron fallback with `CRON_SECRET`), Resend, Stripe, Gmail OAuth/Pub/Sub, SCIM credentials, a production malware-scanning endpoint, and the final production app domain. These are external credentials/hosting choices, not missing application code.

The remaining MVP risk is operational readiness: supply and rehearse those provider integrations, then promote the verified Preview to production.
