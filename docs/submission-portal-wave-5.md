# Submission portal — Wave 5 handoff

Wave 4 establishes the relational authority and proves the core applicant
journey against disposable Neon state. Wave 5 turns that foundation into a
complete organization operating surface and a production-ready submission
experience.

## Proof carried forward

- Database `missa_story_16_1_wave4_20260911b` was created in the `usemissa`
  Neon project on the auto-expiring rehearsal branch.
- Canonical journal migrations plus `0056` and `0057` are applied.
- Relational workspace tests: 53 passed, 1 skipped; no failures.
- Two seeded organizations publish distinct portal versions and calls without
  feature-code branches.
- Authenticated draft save/restore and final submission return durable receipts,
  pin the published form/configuration versions, and enforce idempotency.
- The Wave 4 JSON boundary fix serializes structured values before `jsonb`
  persistence.

## Wave 5 outcomes

### Applicant completion

- **In progress:** the applicant form now has an explicit Review application
  state, summary, back-to-edit action, and deliberate final confirmation.
- **In progress:** submission fields now carry optional organization-authored
  help text through the API, relational model, and applicant form.
- **In progress:** fields can now declare a typed visibility rule; hidden fields
  are omitted from the applicant UI and are not incorrectly treated as missing
  during final validation.
- **In progress:** private file upload now resolves published forms through the
  relational authority instead of falling back to the compatibility store.
- **In progress:** the organization submissions API now has a tenant-scoped
  relational projection including Works, review assignments, and decisions.
- **In progress:** the organization submissions page now consumes that
  projection when relational authority is enabled, preserving its filters and
  dossier lanes.
- **In progress:** organization dossier pages now resolve the selected
  submission, answers, Works, assignments, and decisions from the same
  relational projection.
- Render the complete published form definition, including conditional fields,
  repeated sections, answer constraints, and clear required-field summaries.
- Add draft recovery UI, review-before-submit, confirmation receipt, and a
  read-only submitted packet.
- Add private provider-backed uploads: ownership checks, content-type/size
  limits, virus scanning state, retryable failures, and deletion/retention
  policy. Keep opaque provider URLs out of public responses.

### Organization operations

- Build the organization submission inbox with tenant-scoped filters, search,
  category/status views, and redacted list rows.
- Add reviewer assignment, conflict/withdrawal handling, review notes,
  decisions per work, and applicant-visible outcome states.
- Add workflow version replacement with explicit impact preview; never mutate a
  published workflow or reinterpret an existing submission.
- Add export packages that contain reviewable metadata and stable receipts, not
  submission proof by themselves.

### Reliability and release

- Add receipt/email delivery with provider health, retries, dedupe, and an
  operator-visible failure state; do not present disabled SMS as available.
- Add retention cleanup and upload lifecycle jobs on the existing worker host.
- Run hosted preview checks with production-like variables, then separately
  verify production database state and delivery. Local success is not hosted
  readiness.
- Complete physical iPhone/Android, keyboard, screen-reader, 200% zoom, and
  reduced-motion checks for both applicant and organization routes.

## Tiny task sequence

1. Lock the Wave 5 form-definition and upload-provider contracts.
2. Add conditional/repeated field persistence and boundary tests.
3. Implement applicant review/confirmation and receipt views.
4. Integrate private uploads, scanning, cleanup, and failure recovery.
5. Implement organization inbox, reviewer assignment, and decision surfaces.
6. Add workflow replacement preview and immutable version pin tests.
7. Add delivery receipts, retry telemetry, and operator diagnostics.
8. Run the cross-tenant, idempotency, accessibility, and hosted-preview gates.

## Explicit handoff boundary

Wave 5 may use the disposable Neon rehearsal database for development and
replay. It must not connect development scripts to a hosted production
database, and a Vercel deployment is not complete until hosted data, uploads,
receipts, and the full journey are independently verified.

## Completion gate status

The relational implementation and local checks are complete. Wave 5 remains
open for external certification because this environment currently has no
`BLOB_READ_WRITE_TOKEN` and no malware-scan provider configuration. Hosted
upload, receipt delivery, and physical-device accessibility checks remain
unverified.
