# Submission portal — Wave 8 certification handoff

Wave 8 is the hosted-certification and launch-hardening pass for the Wave 7
submission portal. It confirms what can be proven on a real Vercel Preview and
keeps external-provider, tenant-isolation, and production-promotion claims
explicitly out of the proof boundary until they are exercised.

## Preview deployment

- Preview URL: `https://missa-9v7h6bclh-adedayoagarau.vercel.app`
- The deployment was created from the current `Ideas` working tree with
  `vercel deploy --yes --target=preview`.
- It was not promoted to the production alias.
- No secret values were printed or copied. Vercel environment inspection was
  limited to variable names and deployment metadata.

## Provider and runtime boundary

The Vercel project has a Preview `DATABASE_URL`, `MISSA_CREATOR_RELATIONAL_AUTHORITY`,
Neon auth variables, `BLOB_READ_WRITE_TOKEN`, and shared-rate-limit variables.
The Preview readiness endpoint reports:

| Check | Result |
| --- | --- |
| Database | ready (required) |
| Session | ready (required) |
| Creator authority | ready (required) |
| File storage (Blob) | ready |
| Shared rate limiting | ready |
| Cron, email, payments, Gmail, SCIM | degraded / optional |
| Malware scanning | degraded / optional |

No malware-provider environment variable was present in the Vercel variable
inventory (`MALWARE_SCAN_PROVIDER`, `MALWARE_SCAN_URL`, and
`MALWARE_SCAN_TOKEN` were absent). This proves the configured provider boundary
is still unavailable; it does not prove clean, rejected, unavailable, or
retryable malware outcomes.

The presence of a Preview database variable is not proof of a dedicated or
isolated Preview Neon tenant. That must be verified by an explicit database
identity check before applicant data is used for certification.

## Hosted route checks

Unauthenticated HTTP checks against the Preview returned:

- `/api/health/readiness` — 200
- `/api/opportunities` — 200 with a valid browse response
- `/opportunities` — 200
- `/` — 200
- `GET /api/submission-paths/not-a-real-path/submit` — 405, as expected for the
  POST-only submission endpoint

The browser-level pass at the default desktop viewport found the public
opportunity catalogue, search field, Type/Discipline/Location/Deadline/Fee
filters, sort control, result count, cards, calendar links, pagination, and
the sign-in-required Save affordance. A public opportunity detail also rendered
its deadline, fee, overview, requirements, official application link, source
warning, and Save/Apply actions.

At a 390 × 844 viewport the navigation collapsed to an accessible “Open
navigation” button, filters collapsed to a labelled Filters button, the search
control remained usable, and the first opportunity card retained its title,
metadata, calendar action, and View opportunity action without horizontal
overflow in the captured viewport. The focusable-element inspection included
the skip link, navigation, search input/button, filters, and card links.

No browser console errors or warnings were reported for the inspected Preview
routes. No Save, Apply, login, upload, or submit action was activated.

## Production regression found during certification

The current production alias still returns HTTP 500 for `/api/opportunities`.
Vercel runtime logs identify a Zod response failure caused by legacy
`source_kind` values that are not in the public contract's finite source-kind
union. The current branch already contains the source-authoritative
compatibility mapping in `packages/radar-adapters/src/opportunityRepository.ts`,
which normalizes unknown persisted kinds to `organization-website`; the Preview
deployment returned HTTP 200 using that code.

Production therefore needs a deliberate deployment of the current fix plus a
production-data verification. A green Preview route is not production proof.

Wave 9 completed that correction: the optional visual-read guard and the
production relational-authority setting were deployed, and the production
alias subsequently returned HTTP 200 for `/api/opportunities`.

## Remaining launch gates

1. Verify a dedicated Preview Neon database identity and seed a disposable test
   organization, opportunity, published form, and applicant account.
2. Configure the selected malware provider and prove clean, rejected,
   unavailable, and retryable upload outcomes with Vercel Blob.
3. Run the hosted applicant journey: draft creation, autosave, revision
   conflict recovery, file retry, packet review, final submission, and a
   relational receipt.
4. Run the hosted organization journey: reviewer assignment, blind projection,
   review completion, decision finalization, message approval, delivery, and
   retry/outbox behavior.
5. Complete screen-reader semantics, keyboard traversal, 200% zoom,
   reduced-motion, physical iPhone, and physical Android checks on the seeded
   journey—not only the public catalogue.
6. Deploy and verify the current source-kind compatibility fix on the
   production alias, then recheck `/api/opportunities` and readiness against
   the production database.
7. Verify Railway/outbox worker health independently from Vercel readiness.

Wave 8 therefore certifies the current public Preview surface and records the
exact external boundaries. It does not certify production launch or claim that
an outbound application link is a submission receipt.
