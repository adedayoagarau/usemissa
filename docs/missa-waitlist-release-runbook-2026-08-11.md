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

The in-process waitlist throttle is a best-effort first-line control for serverless instances. If the campaign is expected to receive sustained or adversarial traffic, add a shared rate-limit provider before scaling promotion.
