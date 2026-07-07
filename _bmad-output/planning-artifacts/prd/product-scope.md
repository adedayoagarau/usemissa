# Product Scope

## MVP — Minimum Viable Product

Per the strategy doc's final, most complete MVP synthesis (§30, line 7632) plus `radar-engine-spec.md` §12 for the Radar cut specifically:

**MVP Radar** (**built and tested** — see [Implementation Status](#implementation-status-what-exists-today)):
seed source list · opportunity + deadline extraction · change detection · freshness/confidence/trust scoring · statuses + prediction · user profiles/follows/tracking + fit + digests · organization claim flow · human verification queue · JSON persistence + demo CLI + tests. On the consolidated branch, this is further ahead than the original spec: real auth, Postgres store, Playwright fetcher, LLM extractor (behind the same deterministic validators), iCal calendar feed, response-time overdue nudges, and a 1,042-source registry across 49 verticals.

**MVP User Side (Missa Passport)** — **not yet built** beyond what Radar's engine already exposes (tracker, fit, digests, calendar feed):
- Free account creation *(auth exists; account/profile UX does not)*
- Manual tracker entry + "save from Radar" *(engine API exists; polished UI does not)*
- Works library
- My-Status pipeline with the full status vocabulary *(engine + status derivation implemented; UI renders it, but library/import/reminders UI does not exist)*
- Deadline reminders (7/3/1-day ladder — **implemented in engine**, not yet delivered as email/push)
- Calendar/pipeline views *(tracker view implemented; calendar/pipeline UI is minimal)*
- CSV import
- Email-forwarding parser
- Missa-hosted auto-tracking (email sync — "Autopilot" mode)
- Expected Response Window v1 *(response-time analytics implemented in engine; UI surface pending)*
- Basic Props (gamification)
- Privacy settings
- Export

**MVP Organization Side (Missa Workspace)** — **almost entirely unbuilt** (only claim/verification exists today):
- Entity (Organization) creation
- Open call creation
- Submission Paths (forms/categories, hidden from the user as "form" + "categories")
- Public organization page
- Form Builder
- File upload
- Admin inbox
- Reviewer assignments
- Basic rubric
- Decisions
- Email templates + bulk decision emails
- Delivery tasks
- Basic reporting
- Export

**Explicitly deferred** (strategy doc §31, "Do Not Build Early" — binding, not a suggestion): social feed, public per-opportunity comments, rejection leaderboards, full mobile app, full AI reviewer, deep social network, marketplace ads, every vertical at launch, Kubernetes/microservices, heavy enterprise implementation tooling before there's real enterprise demand.

## Growth Features (Post-MVP)

- Import/migration stack: Submittable export, Google Forms, Airtable import, guidelines-URL/PDF import, Migration/Import Report (internal name; user sees "Import Report").
- Full reviewer portal: blind review, multi-round review, decision batching workflows.
- Delivery workflows beyond bulk email: templated award letters, publication scheduling, selection notifications, per-vertical Delivery relabeling (Awards/Publication/Selections).
- Calendar sync to Google/Apple/Outlook beyond the current iCal feed (native two-way sync, if ever justified).
- Search index (Typesense/Meilisearch → OpenSearch) once catalog scale outgrows in-memory/Postgres filtering.
- Web-scale crawling beyond the curated seed registry (explicitly deferred at MVP per non-negotiable rule #2 in `radar-engine-spec.md`).
- Enterprise layer: multi-entity hierarchy, Teams, Seats, WorkOS SSO/SCIM, branded pages, admin console beyond the current claim/verification queue.

## Vision (Future)

- Missa as the system of record for the entire submissions economy across verticals (grants, awards, festivals, RFPs, scholarships, conference abstracts) — not just literary.
- NSF SBIR-framed AI opportunity-intelligence R&D positioning (per the strategy doc's funding section) — a research narrative around the deterministic+AI hybrid extraction/verification pipeline, not core product scope.
- Full data portability in both directions — Missa as a neutral layer organizations and submitters can leave without lock-in, which the strategy doc frames as a trust-building long-term bet, not a v1 feature.

---
