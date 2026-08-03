# Story 10.3: Tiered subscription billing

Status: review

Missa now exposes an organization-scoped billing boundary with Free, Indie,
Pro, Program, and Enterprise plan metadata, seat limits, Stripe Checkout
session creation, signed webhook handling, and a small Workspace plan panel.
Stripe remains hosted: Missa never receives card details. Production activation
requires `STRIPE_SECRET_KEY`, one `STRIPE_PRICE_*` value per paid tier, and
`STRIPE_WEBHOOK_SECRET`.

The route fails closed when those credentials are absent; it never pretends a
plan upgrade succeeded.
