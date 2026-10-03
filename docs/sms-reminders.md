# Text (SMS) reminders

Plus members can get deadline reminders by text. Email and in-app reminders
stay free. Texts go through Telnyx and are off everywhere until Telnyx is
configured.

## What gets texted

The same Tracker notices that go out by email: deadline reminders, response
check-ins, moved deadlines and early closures. A creator gets them by text only
when all of these are true:

- the account is on a plan with `smsReminders` in `CREATOR_PLAN_LIMITS`
  (Plus or Pro). When the plan lapses, texts stop on the next tick;
- the phone number is verified with a six-digit code;
- texts and reminders are switched on in Inbox notification settings.

Reminders and check-ins respect quiet hours because the reminder tick holds
them until the window ends. Moved deadlines and early closures are held in the
text query while the account's quiet hours are on (when the account has a
timezone). Only notices from the last day are texted; older ones are left to
email and the Inbox.

Each text is one GSM-7 segment (160 characters), for example:

```
Missa: Poetry Fellowship 2027 closes Fri 10 Oct. In your Tracker: preparing. www.usemissa.com/tracker?application=opp_123 Reply STOP to end.
```

## How sending works

`apps/web/lib/sms.ts` `sendSms()` checks, in order: Telnyx is configured, the
number is international (E.164), there is a sender for the destination, the
`sms_messages` ledger exists, and texts are not paused. The ledger then applies
the limits under one lock and writes the row before Telnyx is called:

- `SMS_MONTHLY_LIMIT_PER_ACCOUNT` (default 30) per account per calendar month.
  Verification codes and admin test texts do not count.
- `SMS_DAILY_GLOBAL_LIMIT` (default 200) across Missa per UTC day, every kind.

A text stopped by a limit is written as `skipped` with the reason and is never
retried. Every text has an idempotency key (`creator-reminder-sms:<notice>`,
`sms-verification:<id>`, `admin-test:<uuid>`), so the 15-minute cron never sends
one twice. A failed send retries on later ticks, up to three attempts.

US and Canadian numbers (+1) need `TELNYX_FROM_NUMBER`; without it those texts
are skipped with the reason "No US sender" and the settings form refuses +1
numbers. Everywhere else the messaging profile's alphanumeric sender `Missa`
is used. Many countries do not deliver replies to an alphanumeric sender, so
STOP replies only reach Missa where Telnyx supports two-way messaging.

## Phone verification

`/api/me/sms/start` sends a code (three per account per hour), and
`/api/me/sms/confirm` checks it: five tries, ten minutes. Codes are stored only
as an HMAC-SHA256 keyed with `MISSA_SESSION_SECRET` and bound to the account and
number. `PATCH /api/me/sms` switches texts on or off; `DELETE /api/me/sms`
removes the number.

## Webhook

Telnyx posts delivery reports and inbound texts to
`POST /api/sms/telnyx/webhook`. Requests must carry a valid
`telnyx-signature-ed25519` over `${telnyx-timestamp}|${body}` no more than five
minutes old; anything else gets 401 and is not read. Verified requests always
get 200.

- `message.sent` and `message.finalized` move the ledger row to sent, delivered
  or failed and record the cost.
- An inbound STOP, STOPALL, UNSUBSCRIBE, CANCEL, END or QUIT turns texts off for
  every account with that number and marks it opted out. Telnyx itself confirms
  and blocks further texts.
- START, UNSTOP or YES turns texts back on only for accounts that are still
  verified and on Plus.

## Admin

The Health page has a Text messages section: texts sent, delivered and failed
in the last 30 days, cost as Telnyx reports it, Plus members opted in, STOP
replies, and recent problems with their reasons. It also has a switch that
pauses every text (reminders, codes and tests) and a form to send a test text to
any number. Test texts skip the Plus check and the monthly limit but not the
pause or the daily limit. Both actions are written to `audit_events`. The admin
user profile shows the masked number, whether it is verified, whether texts are
on, and whether the plan includes them.

## Setup

1. In Telnyx, create a messaging profile with the alphanumeric sender ID
   `Missa`. For US and Canadian recipients, buy and register a long code (10DLC
   registration is required for US traffic) and assign it to the profile.
2. Set the profile's webhook URL to
   `https://www.usemissa.com/api/sms/telnyx/webhook` (API v2).
3. Set the environment variables below on Vercel and the creator worker.
4. Apply migration `0086_sms_reminders.sql`.
5. Send yourself a test text from Admin > Health, then reply STOP and START to
   check the opt-out sync.

| Variable | Needed for |
| --- | --- |
| `TELNYX_API_KEY` | Sending texts (required) |
| `TELNYX_MESSAGING_PROFILE_ID` | Sending texts (required) |
| `TELNYX_PUBLIC_KEY` | Verifying delivery reports and STOP replies (base64 Ed25519 key from Keys & Credentials) |
| `TELNYX_FROM_NUMBER` | Texting US and Canadian numbers (E.164 long code) |
| `SMS_MONTHLY_LIMIT_PER_ACCOUNT` | Optional, default 30 |
| `SMS_DAILY_GLOBAL_LIMIT` | Optional, default 200 |
| `MISSA_SESSION_SECRET` | Hashing verification codes (already required in production) |
