# Submission portal — Wave 3 handoff

Wave 3 completes the operator setup loop and strengthens the applicant journey around real assets, review stages, and immutable evidence.

## Delivered

- Constrained Organization logo upload endpoint using private server credentials, detected image bytes, approved image types and a 5 MB limit.
- Portal Studio logo upload control, accessible logo description, and preview rendering.
- Review-workflow editor with stage list, review-type selection, new stages, draft save, optimistic concurrency and publication controls.
- Applicant draft save now carries explicit section progress and a relational revision.
- Relational drafts pin the published form and Opportunity configuration at creation and return a recovery receipt.
- Finalized submissions pin portal, form, Opportunity and review-workflow versions and delete the active draft atomically.
- Hosted application route and finalization path operate under relational authority without compatibility-engine reads.
- Public Open Call projections are typed rather than generic row records.
- Organization navigation and the design-system catalogue/policy include the Submission Portal Studio composition.

## Verification

- Workspace engine tests: 52 passed; 2 live PostgreSQL suites skipped because no disposable database URL is configured.
- Workspace engine build: passed.
- Database package build: passed.
- Web TypeScript: passed.
- Web lint: passed with zero warnings.
- Design-system validation: passed with no new violations.
- Organization navigation tests: 3 passed.
- Web production build: passed; 260 pages generated.
- `git diff --check`: passed.

## Evidence boundary

This proves the local contracts, build, route compilation, and UI policy. It does not prove that migrations 0056/0057 are applied to a hosted database, that Blob credentials are configured, that an uploaded logo is publicly reachable, or that a real applicant/operator completed the journey on physical devices.

## Next gate

Run migrations 0056 and 0057 against a disposable PostgreSQL database, seed two Organizations and one published Open Call each, then exercise:

`publish portal → open public portal → sign in → save/restore draft → upload → submit → inspect pinned receipt → edit review workflow → publish replacement`

Capture desktop, 390px, keyboard, screen-reader, 200% zoom, reduced-motion, iPhone and Android evidence before any hosted deployment.
