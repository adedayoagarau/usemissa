# Admin observability

What the platform admin measures, where each number comes from, and how to
turn each part on.

## Pages

| Page | Path | Source |
| --- | --- | --- |
| Dashboard | `/admin` | Everything below, summarised |
| Traffic | `/admin/traffic` | `site_events` (cookieless visits) |
| Sign-ups & users | `/admin/growth` | `radar_accounts`, `platform_analytics_events`, sign-up goals |
| Funnels | `/admin/funnels` | `site_events` pages and goals; product journey from `platform_analytics_events` |
| Revenue | `/admin/revenue` | Stripe subscriptions and paid invoices (live, cached 5 minutes) |
| Health | `/admin/health` | Uptime checks, Core Web Vitals, browser errors, email ledger, worker heartbeat |
| Share metrics | `/admin/metrics` | Headline numbers, PNG cards, monthly CSV, public `/stats/<token>` links |
| User profile | `/admin/users/<id>` | Account, plan, organizations, activity timeline |

Press **⌘K** (Ctrl+K) anywhere in the admin to jump to a page, user, or organization.

## Cookieless visit counting

`components/site-beacon.tsx` posts pageviews, Core Web Vitals, and browser
errors to `/api/analytics/hit` for every visitor, whether or not they accepted
analytics. No cookie or storage is used on the device. The server keeps only:

- a visitor hash: SHA-256 of a random daily salt, host, IP, and user agent.
  Salts rotate each UTC day and are deleted after a day, so the hash cannot be
  reversed or linked across days;
- the page path (query strings dropped, id-like segments collapsed), the
  referring host, UTM tags, country, device class, browser, and OS.

Bots, `/admin`, `/api`, and visitors sending Global Privacy Control are not
counted. Error messages are scrubbed of emails, query strings, and long numbers.
Rows are kept for 400 days. The privacy notice describes this.

Conversion goals (`signup`, `waitlist_join`, `checkout_started`) are recorded
server-side in the routes that perform them, and inherit the visitor's landing
source so sign-ups can be credited to a channel.

Because the visitor hash changes daily, a visitor is unique per day. Multi-day
totals sum daily visitors, and website funnels follow a visitor within one day.

## Monitoring and alerts

`/api/cron/observability` (every 15 minutes) probes `/`, `/opportunities`, and
`/api/health/readiness`, evaluates alert rules, emails founders when an alert
starts or clears, and purges expired data. Rules:

- a page is down for two checks in a row;
- browser errors in the last hour exceed 10 and three times the usual rate;
- visitors in the last 24 hours fall below 40% of the 7-day average (needs 20+ a day);
- no sign-ups in 24 hours when the 14-day average is 3+ a day;
- 5+ emails failed to send in 24 hours;
- the background worker reports failed or stale.

`/api/cron/weekly-digest` sends a Monday summary at 07:53 UTC.

## Environment

| Variable | Needed for |
| --- | --- |
| `DATABASE_URL` or `MISSA_ANALYTICS_DATABASE_URL` | All analytics, health, and share links |
| `CRON_SECRET` | Uptime checks, alerts, weekly digest |
| `ADMIN_ALERT_EMAILS` | Alert and digest recipients (defaults to platform admins) |
| `RESEND_API_KEY`, `RESEND_FROM` | Sending alert and digest emails |
| `STRIPE_SECRET_KEY` | Revenue page and MRR on the dashboard and share cards |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Optional stack traces and server errors |

Apply migration `0083_site_observability.sql` before deploying.
