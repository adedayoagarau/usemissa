# Story 10.1: Stripe Connect onboarding

Status: review

Organization admins can start hosted Stripe Express onboarding from the
organization billing boundary. Missa stores only the connected account ID and
status, returns a hosted onboarding link, and processes signed `account.updated`
webhooks to reflect whether charges and payouts are enabled. Card details and
identity documents never pass through Missa. Production requires
`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
