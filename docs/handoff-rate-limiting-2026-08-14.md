# Handoff — shared rate limiting (2026-08-14)

State of the world for PR #69, parked mid-flight and handed to Codex. Everything described here is committed and pushed; there is no uncommitted work and no scratchpad state to recover.

- **Branch**: `claude/what-else-to-work-on-kw5qwv`
- **PR**: [#69](https://github.com/adedayoagarau/usemissa/pull/69), draft, base `main`
- **Commits**: `c931316` (the limiter), `4a35a4d` (per-IP window sizing)
- **Working tree**: clean

## The one thing to check first

**CI has not run on `4a35a4d`.** The only status on that commit is Vercel's deploy, which is green. The Actions run visible on the PR (`run 210`, conclusion `failure`) is for the *earlier* commit `c931316` and is already fixed by `4a35a4d` — do not read it as the current state.

I could not determine why the push did not trigger a `synchronize` run; the first push triggered one normally and the PR being a draft did not stop it. Re-trigger before trusting anything below: marking the PR ready for review, re-running the workflow, or pushing an empty commit all work.

Until that run is green, treat the E2E fix in `4a35a4d` as **argued but unverified** — it was verified locally by curl against a production build, not by Playwright, for the reason in "What I could not verify" below.

## What the change does

Three gaps, all on public edges:

- `/api/auth/login` had **no rate limit at all** — unbounded password attempts against a known email.
- `/api/auth/signup` had none.
- The waitlist and Email Sync limits existed but lived in module-level `Map`s that reset on every serverless cold start and were invisible to sibling instances, so they bounded one lambda's share of an attack rather than the attack.

Tracker imports were **not** part of this gap, despite also having in-memory counters in `apps/web/lib/engine.ts`. Those are the demo path only; production already rate-limits imports durably in Postgres inside the import transaction (`packages/radar-adapters/src/trackerImportPersistence.ts`, `rateLimitInTransaction`). Left unchanged deliberately — do not "fix" them.

### Shape

`packages/radar-adapters/src/rateLimit.ts` holds the whole mechanism behind a store port:

- **`createRedisRateLimitStore`** — sliding window over a Redis sorted set, driven by three Lua scripts so check-and-record is atomic. Talks to Upstash over REST rather than the native `REDIS_URL` the ingestion workers use, because serverless instances are too short-lived to amortize a TCP connection. The client is behind a dynamic import (`createRedisRateLimitStoreFromEnv`), so deployments without REST credentials never load it.
- **`createMemoryRateLimitStore`** — the original per-instance semantics, kept for local development, previews, and tests.
- **`createRateLimiter`** — composes them. On a shared-store error it falls back to the local window, calls `onDegraded`, and marks the decision `store: 'memory'` rather than refusing sign in.

Subjects (emails, IPs, account ids) are SHA-256 hashed before use as keys, so nothing identifying is readable at rest in the throttle store.

The limiter exposes `check` / `record` / `consume` / `reset` rather than only `consume`, specifically so login can count failures without spending a window on success.

`apps/web/lib/rate-limit.ts` is the thin web layer: the rules, a `globalThis`-cached limiter promise (same Next.js module-duplication reasoning documented in `lib/engine.ts`), `readClientIp`, and a `tooManyRequests` helper.

### Windows

| Action | Limit | Window | Keyed by |
| --- | --- | --- | --- |
| Sign in | 5 failures | 15 min | email |
| Sign in | 50 failures | 15 min | client IP |
| Sign up | 30 attempts | 1 hour | client IP |
| Waitlist join | 5 attempts | 1 hour | client IP |
| Waitlist join | 3 attempts | 1 hour | email |
| Email Sync lifecycle | 3 attempts | 1 hour | account |

The waitlist numbers are unchanged from what shipped — only where the window lives changed. The sign in and sign up numbers are new.

## Two judgement calls worth re-litigating rather than inheriting

**1. Per-IP windows are sized for shared egress, not for one person.** The first push had signup at 5/hour per IP. CI rejected 41 E2E tests, and that turned out to be a real defect rather than a fixture problem: the E2E suite provisions an account per test from one address, which is the same shape as a workshop, a campus, a co-working space, or a carrier NAT. A window sized for one person would have locked out a room of creators on launch day. Hence 30/hour signup and 50 failures/15min login on IP, with the tight windows kept where a subject really is one person.

If you disagree with the specific numbers, they are the only thing to change — the mechanism does not care.

**2. Per-account login lockout is a known, accepted DoS.** Sign in counts failures only and clears the email window on success, so a person's own typos never accumulate. But someone who knows an email address can still deliberately spend its 5 failures and hold that account out for 15 minutes, from any IP. That is the accepted cost of throttling per account; without it, credential stuffing against one known email is bounded only by the loose per-IP window, which a distributed client evades outright. The window is short for exactly this reason. Documented in the runbook and in a comment in `app/api/auth/login/route.ts`. If it ever bites in practice, the answer is a second factor, not a longer window.

## Required before this protects anything in production

Set both on the web deployment:

```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Take them from the Upstash console for the same database the ingestion workers reach over the native `REDIS_URL`. **Without this pair the limiter silently uses per-instance windows — the exact behavior this PR set out to remove.** It logs a warning at boot when `VERCEL_ENV === 'production'` and the credentials are missing; that warning is the only signal.

Set them *before* the app comes off the waitlist gate, not at merge time. Merging without them leaves the code looking protected while production is not.

Two things I did not verify and you should:

- Whether REST is enabled on that specific Upstash database. It is on by default for Upstash Redis, but confirm.
- Whether sharing the ingestion database is wanted. Keys are namespaced `missa:rl:` so there is no collision with BullMQ, but Upstash bills per request and this adds one round trip per login, signup, and waitlist hit. A separate free-tier database works identically; nothing in the code assumes they are the same instance.

`MISSA_RATE_LIMIT_SIGNUP_IP` and `MISSA_RATE_LIMIT_LOGIN_IP` raise those two per-IP windows for automated test environments only. They default to the shipped values, so unset or malformed is always the safe case (verified). **Do not set them on a real deployment.**

## Test coverage, and a gap behind it

- `packages/radar-adapters/test/rateLimit.test.ts` — 18 tests, each run against **both** stores via a Lua-free fake Redis that preserves the sorted-set semantics: limit boundary, window sliding, subject and rule isolation, check-without-spending, record-past-limit, reset, retry-after rounding, subject hashing, degraded-store fallback, and credential parsing. Full workspace `npm test` passes.
- `apps/web/e2e/rate-limit.spec.ts` — new, proves the limiter enforces against a real running server. It goes through the waitlist email window because nothing overrides that one, and is written to survive a Playwright retry (the previous attempt's window is still open on the same server, so it asserts a 429 *arrives* and is well formed, not that it arrives on a particular attempt).

**The gap**: `apps/web` has no `test` script, so the ~20 `.test.ts` files under it never run — root `npm test` only covers the seven packages. That is why the limiter's logic lives in `radar-adapters` rather than next to its callers. Wiring `apps/web` into CI is worth doing on its own and will probably surface a backlog of rotted tests; it was out of scope here.

## What I could not verify

Playwright could not run in my container: the preinstalled browser is build 1194 and the pinned `@playwright/test` wants 1234, so every spec failed at `browserType.launch: Executable doesn't exist` before any application code ran. CI installs its own Chromium and is the real signal.

Everything I could not get from Playwright, I got by curl against a production build (`next start`), and these all passed:

- 5 failed sign ins then 429, with `Retry-After: 891` on a 15-minute window
- a correct password clears the email window, so four further failures are still accepted afterward
- a locked account stays locked from a different IP
- signup and waitlist cut over at their limits; the waitlist per-email window holds across four different IPs
- malformed signup payloads do not spend the window
- with the override set, 40 signups from one IP all succeed while the waitlist window still throttles
- a malformed override (`MISSA_RATE_LIMIT_SIGNUP_IP=not-a-number`) yields exactly the shipped default of 30

## To finish

1. Re-trigger CI on `4a35a4d` and get `build-and-test` green. This is the only open work item in the code.
2. Decide the two judgement calls above, or accept them.
3. Set the Upstash REST credentials on the web deployment.
4. Mark #69 ready for review and merge.

I have unsubscribed from the PR, so nothing is watching it from my side.
