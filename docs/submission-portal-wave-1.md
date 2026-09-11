# Submission portal — Wave 1 handoff

Wave 1 establishes the configurable, versioned foundation for organization submission portals. It does not yet ship the organization-facing builder or applicant submission form UI.

## Delivered

### Domain and configuration contracts

- Portal identity and policy configuration with explicit lifecycle states.
- Discriminated form field definitions for text, long text, number, date, email, URL, checkbox, single choice, multiple choice, file upload, and display content.
- Versioned form, opportunity, and review-workflow contracts.
- Review stages that reference configured review forms.
- Capability grants with discriminated organization, program, opportunity, submission, and review-round scopes.
- Data-driven poetry-prize and residency templates. Organization behavior is not selected through organization-type branches.

### Persistence and auditability

- Additive migration for immutable portal, form, opportunity, and review-workflow versions.
- Version and revision constraints, supersession links, and one-published-version indexes.
- Portal configuration create, update, lifecycle transition, publish, and rollback commands.
- Existing transactional command receipts, audit events, and outbox effects are used for mutations.
- Typed relational projections for administrative portal configuration and public open calls.

### HTTP and public projection

- Authenticated organization endpoints to list, create, read, update, transition, and roll back portal configurations.
- Boundary validation for portal copy, support and policy links, timezone, and controlled brand values.
- A public endpoint that exposes only the published portal configuration.
- The existing public organization route now reads the relational authority safely and projects published portal copy and open calls.

## Product and design-system boundary

The public route uses the existing organization-profile composition and local implementation. No new component family or policy entry was added. Organization branding remains controlled configuration: arbitrary organization CSS, fonts, scripts, and layout overrides are outside this wave.

## Verification

- `npm test --workspace=@missa/workspace-engine`: 52 passed, 2 skipped because no disposable PostgreSQL URL was supplied.
- `npm run build --workspace=@missa/db`: passed.
- `npm run typecheck --workspace=@missa/web`: passed.
- `npm run lint --workspace=@missa/web`: passed with zero warnings.
- `npm run check:design-system`: passed with no violations.
- `npm run build --workspace=@missa/web`: passed, including static generation of 260 pages.
- `git diff --check`: passed.

These checks prove the local repository build and contract tests. They do not prove that migration `0056` has run in a hosted database or that the portal works against production data.

## Deliberate Wave 2 boundary

- Organization-facing portal builder and preview UI.
- Form, opportunity, and review-workflow editing endpoints and lifecycle controls.
- Applicant-facing application form and draft persistence.
- Organization logo upload and approved brand rendering.
- End-to-end relational tests against a disposable PostgreSQL database.
- Hosted migration, deployment, and production-data verification.
