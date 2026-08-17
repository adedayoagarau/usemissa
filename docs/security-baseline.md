# Missa security baseline

Updated 2026-08-15. This is an implementation record, not a certification or
claim of ISO 27001, SOC 2, or HIPAA compliance.

## Implemented in the web app

- Authentication requests are bounded by IP and normalized-email buckets. The
  hosted path uses Upstash Redis; local development has a bounded in-process
  fallback. `/api/health/readiness` reports whether the shared limiter is
  configured.
- Authenticated-session responses use `private, no-store`, preventing browser
  and intermediary caches from retaining account or membership data.
- Password-login failures return a generic message, avoiding accidental
  disclosure of internal error details.
- Production responses include HSTS, `nosniff`, frame denial, a restrictive
  referrer policy, a minimal Permissions Policy, disabled DNS prefetch, and no
  cross-domain policy.
- Existing controls include salted `scrypt` password hashes, signed session
  cookies, server-side organization/platform-admin authorization, verified
  inbound webhook signatures, private object storage for user files, and
  append-only audit entries for many mutations.

## Dependency scan status

`npm audit --omit=dev` on 2026-08-15 reported 29 production-tree advisories (7
moderate and 22 high). The report includes findings in the Next.js
`postcss`/`sharp` chain, Workflow transitive dependencies, `fast-uri`, and
`xlsx` (which had no available fix in the report). Remediation is pending as a
separate dependency tranche; `npm audit fix --force` was not run because it
proposes breaking upgrades in the current checkout.

## Hosted verification status

Vercel production has the session secret plus both Vercel KV-compatible Redis
variables and a native `REDIS_URL`. On 2026-08-15, direct commands through both
Redis paths returned `ERR max requests limit exceeded` with usage `500001` of
`500000`. The shared limiter therefore could not be proven operational; the
local fallback was used by the non-production probe. No application records or
schemas were changed, and no deployment was made from this checkout.

## Production activation

Set `MISSA_SESSION_SECRET` and one shared Redis configuration in the production
web service: explicit `UPSTASH_REDIS_REST_URL` plus
`UPSTASH_REDIS_REST_TOKEN`, Vercel KV-compatible `KV_REST_API_URL` plus
`KV_REST_API_TOKEN`, or a credentialed `REDIS_URL`. Confirm the readiness report
shows `session` and `sharedRateLimiting` as `ready`, then exercise login, logout,
re-login, and a controlled rate-limit check against the exact deployed host.
The local fallback is not evidence of a multi-instance production control.

## Still required before a compliance claim

Define the data inventory and retention/deletion rules; verify database, object
storage, backups, restore testing, and access-review procedures; establish
incident response and breach-notification procedures; add dependency and
secret scanning; review every API route and integration boundary; verify MFA,
session revocation, and recovery controls; and map evidence to the chosen
framework. HIPAA would additionally require an actual healthcare use case,
appropriate contractual coverage, and a scoped assessment rather than a badge
on the product.
