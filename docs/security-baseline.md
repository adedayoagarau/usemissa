# Missa security baseline

Updated 2026-08-15. This is an implementation record, not a certification or
claim of ISO 27001, SOC 2, or HIPAA compliance.

## Implemented in the web app

- Sign-in and sign-up use the existing shared sliding-window limiter. It uses
  hashed subjects, Upstash Redis when configured, and a bounded in-process
  fallback when the shared store is unavailable.
- Login failures use a generic response, and sign-up failures do not reveal
  whether an email address already has an account.
- Authenticated-session responses use `private, no-store`, preventing browser
  and intermediary caches from retaining account or membership data.
- Production responses include HSTS, `nosniff`, frame denial, a restrictive
  referrer policy, a minimal Permissions Policy, disabled DNS prefetch, and no
  cross-domain policy.
- Existing controls include salted `scrypt` password hashes, signed session
  cookies, server-side organization/platform-admin authorization, verified
  inbound webhook signatures, private object storage for user files, and
  append-only audit entries for many mutations.

## Operational boundary

The shared limiter is stronger than an in-memory-only guard only when the
shared Redis path is healthy. If Redis is unavailable, the application keeps a
bounded local guard for availability and logs the degradation. Production
verification must therefore include a controlled rate-limit check against the
exact deployed host; configuration presence alone is not proof of
cross-instance enforcement.

On 2026-08-15, the configured production Redis service returned its provider
maximum-request error during a direct probe. The production variables were
present, but shared enforcement was not proven operational until that quota is
restored.

## Still required before a compliance claim

Define the data inventory and retention/deletion rules; verify database, object
storage, backups, restore testing, and access-review procedures; establish
incident response and breach-notification procedures; add dependency and
secret scanning; review every API route and integration boundary; verify MFA,
session revocation, and recovery controls; and map evidence to the chosen
framework. HIPAA would additionally require an actual healthcare use case,
appropriate contractual coverage, and a scoped assessment rather than a badge
on the product.
