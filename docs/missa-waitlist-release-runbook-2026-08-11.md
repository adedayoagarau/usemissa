# Missa waitlist release runbook

The waitlist implementation and production promotion were validated on 2026-08-11 using a clean release slice and the production database target.

## Analytics contract

The waitlist records a bounded first-party funnel in `platform_analytics_events`:

- `page_view` on `/waitlist`
- `public.waitlist_cta_clicked`
- `public.waitlist_form_started`
- `public.waitlist_submit_attempted`
- `public.waitlist_join_failed`, with a coarse reason only
- `public.waitlist_joined`, emitted after the durable signup write

Attribution is limited to the five UTM fields, `device_class`, and `referrer_host`. The protected `/admin/waitlist` view reports the selected-window funnel, view-to-join rates, daily flow, and conversion grouped by source, campaign, device, and referrer. Durable joins remain anchored to `waitlist_signups`; analytics events are never treated as the signup ledger.

PostHog remains optional. The first-party ledger and admin reporting do not require a PostHog key.

## Preflight

From the intended clean release checkout, run the schema migration with the authorized production `DATABASE_URL`:

```sh
DATABASE_URL='[injected by the release environment]' npm run db:migrate --workspace=@missa/db
DATABASE_URL='[injected by the release environment]' npm run waitlist:check
```

The preflight prints only table shape and readiness. It does not print the connection string or signup rows. It must report `{"ready":true,...}` before publishing the route.

## Preview verification

Create a Vercel preview from the clean waitlist release slice and verify:

- `GET /waitlist` returns `200` and contains the waitlist heading and `Join the waitlist` CTA.
- `GET /waitlist?utm_source=bedside&secret=drop-me` redirects to the bounded UTM URL without `secret`.
- `GET /privacy`, `/robots.txt`, and `/sitemap.xml` return `200`.
- Invalid JSON/email requests return `400`; the honeypot returns `202` without a database write.
- The protected `/admin/waitlist` route is unavailable to anonymous visitors.

Do not use a real public email to test production persistence. The endpoint’s invalid and honeypot paths provide non-writing smoke checks; validate the first real signup through the admin read model after launch.

## Production promotion

Only after the migration and preview checks pass, promote the reviewed deployment to the Missa production domains. Recheck `/waitlist`, `/api/health/readiness`, and the response security headers immediately afterward. Confirm the old `/waitlist -> /signup` redirect is gone.

## Shared request throttling

The waitlist throttle is no longer in-process. Sign in, sign up, the waitlist, and Email Sync lifecycle changes all decide against one sliding window in Redis, so the published limits hold however many serverless instances are warm.

Set both halves of the Upstash REST credential on the web deployment before promotion:

```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

They address the same Upstash database the ingestion workers reach over the native `REDIS_URL`; the REST endpoint is used here because serverless instances are too short-lived to amortize a TCP connection. When the pair is absent the limiter falls back to a per-instance window and logs a warning at boot — acceptable for local development and previews, not for a campaign.

Enforced windows:

| Action | Limit | Window | Keyed by |
| --- | --- | --- | --- |
| Sign in | 5 failures | 15 min | email |
| Sign in | 50 failures | 15 min | client IP |
| Sign up | 30 attempts | 1 hour | client IP |
| Waitlist join | 5 attempts | 1 hour | client IP |
| Waitlist join | 3 attempts | 1 hour | email |
| Email Sync lifecycle | 3 attempts | 1 hour | account |

The two per-IP windows are deliberately loose. A workshop, a campus, a co-working space, and most mobile carriers put many genuine people behind one address, so a window sized for one person would lock out a room. They exist to stop scripted bulk activity, which looks nothing like thirty people signing up together. The tight windows are the ones keyed by email or account, where a single subject really is a single person.

For that reason `MISSA_RATE_LIMIT_SIGNUP_IP` and `MISSA_RATE_LIMIT_LOGIN_IP` can raise those two windows in automated test environments, which provision accounts far faster than any person. They default to the values above, so unset or malformed means the shipped limit. Do not set them on a real deployment.

Sign in counts failures only and clears the email window on success, so a person who mistypes a password and then gets it right never carries those failures forward.

The per-account window has a known, accepted cost: someone who knows an email address can deliberately spend its five failures and hold that account out for the remainder of the 15 minutes, from any IP. The window is deliberately short for that reason. Removing it would leave credential stuffing against a single known account bounded only by the much looser per-IP window, which a distributed client evades outright. If account-lockout abuse shows up in practice, the next step is a second factor on the account rather than a longer window.

Tracker imports are unaffected: they were already rate-limited durably in Postgres inside the import transaction, so they were never part of this gap.

If the shared store becomes unreachable the limiter degrades to the local window rather than refusing sign in, and records the degradation. That trades enforcement strength for availability; watch for `Shared rate limit store unavailable` in the logs.

Subjects are hashed before they are used as Redis keys, so no email address or IP is readable at rest in the throttle store.
