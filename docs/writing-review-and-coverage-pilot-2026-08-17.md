# Writing review and coverage pilot — 2026-08-17

## Production review snapshot

- Practice family: `Writing & literature`
- Queue snapshot: 302 `needs-human` records
- Full packet hash: `e98ca1574f203daecc1927867ca4dec0e959e5b2bd2c8a77701f3b52eb6dfa2f`
- Technically publish-ready: 19
- Repair-required: 279
- Deterministic suppressions: 4

The 19 technically ready records are not a publication batch. The broad
taxonomy contains incidental Writing assignments, including exhibitions,
film calls, and general residencies. Publication requires an exact reviewed
selection from that set.

## First verified Writing set

### Ready after explicit approval

1. `opp_655ee284-decb-40ed-adc4-087cd1b49d21` — Haven Spec Magazine Submissions
   - First-party source: <https://havenspec.com/submit/>
   - Current state: August is the general submissions month.
   - Deterministic gates: 5/5 pass.
   - Before publication: persist the first-party Acolyte submission form as
     the verified application destination rather than leaving
     `submission_state = missing`.

2. `opp_abc67398-2194-4479-ace5-a0fb6963fb48` — Reedsy Prompts Weekly Writing Contest.
   - First-party source: <https://reedsy.com/creative-writing-prompts/>
   - Current state: weekly recurring contest; Friday 11:59 PM EST deadline.
   - Deterministic gates: 5/5 pass.
   - Before publication: normalize the source identity from
     `Submission guidelines →` to `Reedsy` and persist the direct contest
     application destination and $5 contest fee.

Selected pair hash before those repairs:
`c6c3ab858a06189dbd46394902a9139706721c7548cb5d1013356a5e242565f2`.
Any repair changes the input version and therefore invalidates this hash. A
fresh preview and explicit approval are required after repair.

### Repair before publication

- Granta: currently closed; next fiction/non-fiction window is 1–30 September
  2026. Replace the third-party Grinder page with Granta's first-party
  submissions page and represent the phased window.
- Driftwood Press: the stored title merges Premium Fiction and Premium Poetry.
  Split or accurately model the different windows before publication.
- Sky Island Journal: replace `rolling` with the current Issue 37 deadline of
  30 September 2026 and persist the Submittable destination.
- Salamander: close the record; the magazine is on hiatus for the 2025–2026
  reading period.
- Strange Horizons: do not publish one generic rolling call. Fiction is closed
  until fall 2026 while other departments have separate states and guidelines.
- Santa Monica Review: first-party guidelines exist, but no current opening
  window is stated. Keep in review until its active postal reading period is
  verified.

## Writing coverage contract v1

The contract is executable and uses provisional thresholds. It cannot be
improved merely by adding more records.

### Required source segments

1. contests and awards
2. magazines and reading periods
3. grants and fellowships
4. residencies
5. publishers and manuscripts
6. playwriting and screenwriting
7. literary translation

### Production baseline

- Daily sources healthy: 3/3
- Canonical first-party sources: 0 (target: at least 2)
- Segments with an owner source: 2/7
- Active published records: 141
- Published deadline/window known: 141/141
- Published verified application destination: 12/141
- Reviewable records: 319
- Review SLA breaches over 48 hours: 238/319
- Active expired exact-deadline records: 0
- Active public duplicate URL groups: 3

### Contract targets

- healthy source rate: at least 95%
- canonical sources: at least 2
- required segment coverage: 100%
- published deadline/window known: at least 95%
- published verified destination: at least 90%
- published confirmed organization: at least 90%
- review SLA breach rate: at most 10%
- active expired exact-deadline records: 0
- active duplicate groups: 0

The same contract shape can be applied to every practice family after the
Writing pilot proves the review and publication workflow.
