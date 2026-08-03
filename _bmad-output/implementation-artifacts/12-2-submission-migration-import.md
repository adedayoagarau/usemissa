# Story 12.2: Submission migration import

Status: done

Organization admins can preview and commit bounded submission CSVs at
`/api/orgs/:id/imports/submissions/{preview,commit}`. The migration matches
open calls within the organization and existing Missa accounts by email,
rejects unknown or duplicate rows before commit, preserves submitted dates and
safe status vocabulary, and creates Work records without inventing accounts or
cross-organization rows. The report separates invalid, duplicate, and
unmatched-account rows.

The importer also accepts a source label (`submittable`, `google-forms`,
`airtable`, or `generic`) and maps common provider export headers while keeping
the same preview, duplicate, account-match, and commit gates.
