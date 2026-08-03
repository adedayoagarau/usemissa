# Story 3.7: Idempotent alert email delivery

Status: done

The scheduled Radar tick now optionally sends one bounded Resend digest per
submitter for pending user alerts. Alerts are marked `emailSentAt` only after
the provider accepts the message, so retries do not lose notifications and
failed recipients remain eligible on the next tick. Missing `RESEND_API_KEY` or
`RESEND_FROM` fails closed while Inbox remains the source of truth.

Validation: delivery is executed inside the locked worker tick before durable
persistence; the cron response reports sent, skipped, and partial outcomes.
