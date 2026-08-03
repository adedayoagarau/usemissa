# Story 12.1: Open-call migration import

Status: review

Organization admins can preview and commit a bounded CSV import at
`/api/orgs/:id/imports/open-calls/{preview,commit}`. The importer accepts common
Submittable-style headers (`title`, `team/entity`, `program`, `status`, and
optional Radar opportunity id), detects duplicate rows, creates the Team →
Program → Open Call hierarchy, and creates an editable form shell for each
new call. Imports are capped at 2 MB and 1,000 rows and reject invalid rows
before commit. The preview is the Import Report: valid, invalid, duplicate,
warnings, and created/skipped counts are explicit.

Google Forms/Airtable adapters and guideline URL/PDF extraction remain future
provider ports; no external credentials are guessed.
