# Submission portal — Wave 2 handoff

Wave 2 turns the Wave 1 contracts into an operator-configurable portal and a version-aware applicant draft path. This is a locally verified implementation slice, not a hosted launch certification.

## Delivered

### Organization portal studio

- Owner and Admin navigation now includes **Submission portal**.
- Portal identity editing covers public name, introduction, support address, timezone, policy links, logo reference and controlled primary color.
- Poetry-prize and residency templates populate an editable draft without introducing organization-type feature branches.
- The adjacent applicant preview is explicitly marked as an unsaved projection.
- Save, review, approval and publication actions use the existing version lifecycle, idempotency receipts and optimistic concurrency.
- Published versions stay immutable; a later edit creates a new version.

### Form builder

- Operators can create a named, purpose-specific form.
- The builder supports every Wave 1 field variant, ordered questions, required state, deletion and accessible move controls.
- Forms have independent save, review, approval and publication actions.
- Existing form families and version history remain visible by stable definition key.
- Variant-specific advanced controls such as choice-option editing, numeric bounds and file policy tuning remain a focused follow-up rather than a generic settings bag.

### Opportunity and review workflow authority

- Form, Opportunity configuration and review-workflow versions now have typed list/create/update and lifecycle-transition endpoints.
- Draft mutation is rejected after publication.
- Publishing supersedes only the prior published version in the same form or Opportunity family.
- Every mutation commits through the relational command receipt, audit and outbox transaction.

### Applicant draft path

- Additive migration `0057_submission_draft_version_pins.sql` pins a draft to the published form and Opportunity configuration versions.
- Drafts now carry a revision, section progress, recovery receipt and 30-day expiry.
- Relational create, restore, update and delete commands are owner-scoped and concurrency-safe.
- The hosted application page works under both compatibility and relational authority.
- Applicants have an explicit **Save draft** action; a restored relational draft returns its revision for subsequent conflict-safe saves.
- Final submission copies the published portal, form, Opportunity and review-workflow version IDs into the immutable packet and removes the draft in the same transaction.

## Design-system evidence

- Intent: configuration, composition, preview and lifecycle feedback.
- Policy: `composition.submission-portal-studio`.
- Source: installed `Tabs`, `Button`, `Field`, `Input`, `Textarea`, `Checkbox` and `NativeSelect`; existing Organization product shell.
- Implementation: `apps/web/components/portal-studio.tsx`.
- Adaptation: compact operational editor with a responsive applicant preview; Organization color is controlled configuration data and cannot replace Missa typography, layout or interaction tokens.
- Covered states: new, draft, in review, approved, published, empty inventory, pending, success, error and unavailable relational authority.

## Verification

- Workspace engine tests: 52 passed; 2 live-PostgreSQL suites skipped because no disposable database URL was supplied.
- Workspace engine build: passed.
- Database package build: passed.
- Web TypeScript: passed.
- Web lint: passed with zero warnings.
- Design-system validation: passed with no new violations.
- `git diff --check`: passed.
- Web production build: see the final task handoff for the completed result.

## Remaining launch gates

- Apply migrations 0056 and 0057 to a disposable PostgreSQL database and run the live relational suites.
- Add variant-specific form controls and the full visual review-workflow stage editor.
- Replace logo URL entry with owned private upload, image validation and removal.
- Exercise publish, draft restore, concurrency conflict and final submission in a browser against the migrated relational database.
- Complete keyboard, screen-reader, 200% zoom, 390px, physical iPhone, physical Android and reduced-motion checks.
- Deploy only after the hosted migration and production data boundary are explicitly authorized.
