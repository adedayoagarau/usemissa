# Missa public beta — release test plan

## Scope

This gate covers the public discovery promise and the private creator journey: discovery, rankings, canonical magazine profiles, signup, onboarding, Saved, Tracker, and account-owned reminder scheduling.

Production publication, outbound email delivery, payment, application submission, and physical-device certification are outside this local release check.

## Design references

- `docs/beta-readiness-2026-09-06.md`
- `docs/journal-profile-consolidation-2026-09-06.md`
- `docs/discovery-beta-and-rankings-2026-09-06.md`

## Environment

- Latest source must complete `npm run build --workspace=@missa/web`.
- App runs on `http://127.0.0.1:3100` with the configured Missa database and creator relational authority enabled.
- The Cloudflare quick tunnel is a review transport only.

## Release cases

| ID | Case | Priority | Pass condition |
| --- | --- | --- | --- |
| TC-01 | Creator account journey | P0 | Signup, onboarding, Save, Saved, and Tracker persist without a server error |
| TC-02 | Public discovery | P0 | Home, Opportunities, Directory, Rankings, comparison, methodology, and details resolve and fit mobile |
| TC-03 | Magazine consolidation | P0 | Legacy URLs redirect; ranking and publication data remain; public links use official destinations |
| TC-04 | Interaction quality | P1 | Keyboard, validation, reduced motion, and serious/critical accessibility checks pass |
| TC-05 | Deadline reminder timing | P0 | Same-day reminders remain future-bound, precede the provider close, and appear only on actual deadline events |

## Gate

All P0 cases must pass. P1 must have no serious or critical accessibility failure. Automated browser checks do not replace the final physical iPhone review.
