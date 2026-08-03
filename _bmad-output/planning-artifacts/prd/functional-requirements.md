# Functional Requirements

Organized by capability area (matching the approved user-facing module names from `docs/missa-naming-decisions.md` where applicable), stating *what* exists as a capability, not *how* it's implemented. Status tag shows current reality on the consolidated branch: **[Built]**, **[Partial]**, or **[Not built]**.

## Radar — Discovery & Intelligence

- FR1. The system discovers opportunities from a curated, per-source-cadence seed registry (currently 1,042 sources across 49 verticals). **[Built]**
- FR2. The system fetches source pages respecting robots.txt and per-source check cadence. **[Built]**
- FR3. The system detects content changes via snapshot hashing before running full extraction. **[Built]**
- FR4. The system extracts structured opportunity data (title, org, dates, fee, eligibility, materials, submission URL) deterministically from page content. **[Built]**
- FR5. The system supports an LLM-assisted extraction adapter whose output is validated through the same deterministic gate as the built-in extractor. **[Built]**
- FR6. The system validates every extracted candidate (parseable dates, sane URL, fee bounds, org presence) before it becomes canonical. **[Built]**
- FR7. The system deduplicates candidates against existing opportunities via URL and fuzzy org/title matching. **[Built]**
- FR8. The system records every field-level change to an opportunity as an immutable, attributable change record. **[Built]**
- FR9. The system scores every opportunity on freshness, confidence, and trust, and exposes the contributing signals for each score (never a bare number). **[Built]**
- FR10. The system derives opportunity status (Discovered, Needs Verification, Opening Soon, Open, Closing Soon, Deadline Extended, Closed, Archived, Uncertain, Duplicate) automatically from dates, signals, freshness, and conflicts — never hand-set except by admin/claim override. **[Built]**
- FR11. The system predicts a next-opening window (with confidence) for opportunities with ≥2 historical cycles, including correct handling of the December↔January year boundary. **[Built]**
- FR12. The system flags suspicious payment/scam language as a trust-score penalty. **[Built]**
- FR13. The system exposes engine-health metrics (discovered/verified counts, stale listings, claimed orgs, duplicate rate, trust distribution, alert volume). **[Built]**

## Opportunities & Fit (submitter-facing)

- FR14. Submitters can browse/discover open opportunities with organization, type, deadline, trust score, and status visible. **[Built]** (via `renderDiscover`/`/api/users/:id/discover`)
- FR15. Submitters can define saved-search profiles (type, genre, discipline, location, fee ceiling, no-fee-only, verified-only, deadline window, keywords, career stage). **[Built]** (`RadarProfile`, engine-level; UI for creating/editing profiles not yet exposed)
- FR16. Every match against a submitter's profile shows a self-explaining Fit Score (Strong/Possible/Weak/Not Eligible/Unknown) with reasons, watch-outs, and hard disqualifiers. **[Built]**
- FR17. Submitters can follow organizations to receive alerts on new calls, openings, deadline changes, results, and new categories. **[Built]** (engine-level; no dedicated "Following" management UI)
- FR18. Submitters receive a digest inbox (new for you, opening soon, closing soon, recently updated, from followed orgs, reminders, overdue, withdrawal suggestions) with a reason attached to every item. **[Built]**

## Tracker (submitter-facing "Tracker")

- FR19. Submitters can track any opportunity and record/update their own status through the full lifecycle vocabulary (Interested → … → Archived), independent of the opportunity's own status. **[Built]**
- FR20. Every status change is recorded as an auditable `StatusEvent` with source (user/email/Missa-hosted/Radar/import) and confidence. **[Built]**
- FR21. Submitters see pipeline, deadline, work-based, type, organization, and list views of their tracked opportunities. **[Partial]** — pipeline/deadline data exists in the engine; only a single flat tracker view is rendered today, not the full view set from `missa-naming-decisions.md`.
- FR22. The system fires deadline reminders on a 7/3/1-day ladder, stopping once submitted. **[Built]** (engine-level trigger logic; not yet wired to an actual email/push delivery channel)
- FR23. The system computes per-organization median/p90 response times and fires an overdue nudge once a submission exceeds the organization's typical response window. **[Built]**
- FR24. On recording an acceptance, the system suggests (once, never automatically) withdrawing other active submissions for the same work. **[Built]**
- FR25. Submitters can subscribe to a personal, token-scoped iCal feed of deadlines and expected-response events from any calendar client. **[Built]**
- FR26. Submitters can import an existing tracker via CSV. **[Not built]**
- FR27. Submitters can connect Gmail (forwarding address, Gmail Sync, or full Autopilot) to auto-update tracker status from email. **[Not built]**

## Library (submitter-facing)

- FR28. Submitters maintain a Library of Works, Files, and Saved Answers reusable across submissions. **[Built — CRUD and private storage boundary; Blob deployment configuration remains]**
- FR29. Submitters can prepare an opportunity-specific checklist of required materials before submitting. **[Built — private, owner-scoped checklist generation, reconciliation, progress, and API/UI foundations]**
- FR30. Submitters can organize opportunities into custom Lists. **[Built — private, owner-scoped CRUD, tracked-only memberships, and API foundations]**

## Accounts, Auth & Passport

- FR31. Users can sign up and log in with email/password (scrypt-hashed, HMAC-signed session cookies). **[Built]**
- FR32. Sessions are enforced server-side per route (own-user routes require own session; org routes require membership; admin routes require the admin flag). **[Built]**
- FR33. All auth and claim actions are recorded in an append-only audit log. **[Built]**
- FR34. Users have a public Profile / Passport page presenting their public-facing submitter identity. **[Not built]**
- FR35. Users can configure privacy settings controlling what's visible on their public profile. **[Not built]**
- FR36. Users can export their own tracker/library data. **[Not built]**

## Missa Workspace — Organizations

- FR37. Organizations can claim a Radar-discovered listing whose domain matches their own, with domain-match claims auto-approved and others routed to admin review. **[Built]**
- FR38. Approved claims flag the listing as claimed, grant the organization authoritative field overrides, and boost its trust score. **[Built]**
- FR39. Organization admins can view claimed-listing analytics (claimed/open counts, followers, average trust, pending reviews). **[Built]**
- FR40. Organizations can create an Entity/Program/Open Call hierarchy independent of a claimed Radar listing. **[Built]**
- FR41. Organizations can define Submission Paths (categories/tracks/rules per open call) via a Form Builder, without exposing "Submission Path" as a user-facing term (users see "form" and "categories"). **[Built]**
- FR42. Organizations get a public organization page presenting their open calls. **[Built]**
- FR43. Submitters can upload files against a Submission through the organization's defined form. **[Built]**
- FR44. Organizations have an admin inbox of incoming Submissions. **[Built]**
- FR45. Organizations can assign reviewers to Submissions/rounds and collect recommendations against a basic rubric. **[Built]**
- FR46. Organizations can record a Decision per Work (not just per Submission), supporting the item-level decision model. **[Built — owner-scoped decision CRUD, derived packet summaries, audit, and Neon persistence]**
- FR47. Organizations can send decisions via templated, bulk decision emails. **[Built — preview and Resend-backed bulk route; production sending requires Resend configuration]**
- FR48. Organizations can track Delivery tasks (award/publication/selection workflows) per accepted Work, with per-vertical relabeling (Awards/Publication/Selections). **[Built — accepted-Work guard, task lifecycle, org routes, and Neon persistence]**
- FR49. Organizations get basic reporting (submission volume, conversion, response times) and export. **[Built — organization-scoped metrics and CSV export]**

## Enterprise

- FR50. Institutions can operate multiple Teams (the user-facing label for `entity`) under one Organization, with per-institution relabeling (Departments/Imprints/Chapters). **[Built]**
- FR51. Enterprise admins can manage Seats and Members with role-based access (Owner/Admin, Team Admin, Program Manager, Reviewer, Finance, Legal, Viewer, Guest). **[Built — seat limits, role changes, revocation, and access capability mapping; SSO/SCIM remains FR52]**
- FR52. Enterprise institutions can enable SSO/SCIM for member provisioning. **[Partial — token-bound SCIM 2.0 provisioning is available for a configured organization; OIDC/SAML browser SSO remains provider-dependent]**

## Payments & Billing

- FR53. Organizations can collect submission fees via Stripe, with Missa taking a 1.5%-capped-at-$1.50 fee per transaction. **[Partial — hosted Connect onboarding and signed account webhooks; fee checkout/finalization remains]**
- FR54. Organizations are billed on a tiered subscription (Free/Indie/Pro/Program/Program Pro/Enterprise). **[Partial — Stripe Checkout, plan metadata, seat limits, and signed webhooks; Connect and self-serve cancellation remain]**

## Import / Migration (Growth-tier, tracked here for completeness)

- FR55. Organizations can import existing calls/submissions from Submittable exports, Google Forms, or Airtable. **[Partial — bounded Submittable-style calls and submissions CSV importers; Google Forms/Airtable adapters remain]**
- FR56. Organizations can import an open call's guidelines from a URL or PDF. **[Partial — bounded URL/HTML import and best-effort PDF extraction with confidence warnings]**
- FR57. The system reports the completeness/accuracy of any migration import (the "Import Report"). **[Built for supported CSV/URL flows — reports valid, invalid, duplicate, unmatched, warning, confidence, and created/skipped counts]**

## Props (Gamification)

- FR58. The system surfaces tasteful, non-cruel positive-reinforcement moments ("Props") on submitter milestones, with explicit rules against language that could feel punitive around rejection. **[Built — private progress projection and Profile surface]**

---
