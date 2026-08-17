# Edge-case hunter review prompt

You are the edge-case reviewer for the first-Save focused handoff. Use the `bmad-review-edge-case-hunter` method. You may inspect the repository, but treat the supplied diff as the change under review and preserve unrelated dirty-tree work.

Trace these failure families through public Opportunity reading, Save intent, authentication, revalidation, canonical Tracker persistence, receipt recovery, and next-action handoff:

- concurrent tabs, retries, lost responses, expired or tampered cookies, and session expiry
- Opportunity removal, closure, deadline/fee/source/eligibility/destination changes, including a second change after acknowledgement
- existing-account recovery, incorrect credentials, waitlist/invite degradation, and missing Tracker provisioning
- keyboard, screen reader, focus, zoom/reflow, reduced motion, mobile, slow network, and interrupted navigation
- analytics authority, deduplication, prohibited properties, and URL leakage
- relational Postgres and legacy Radar fallback differences

For each concrete issue provide severity, exact evidence, reproduction, consequence, and smallest fix. Do not report speculative architecture wishes or pre-existing unrelated work.

## Diff input

`{{FIRST_SAVE_SCOPED_DIFF}}`
