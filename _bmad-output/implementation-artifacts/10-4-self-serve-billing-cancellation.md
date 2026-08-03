# Story 10.4: Self-serve period-end cancellation

Status: done

Organization admins can schedule Stripe subscription cancellation at period end
from Workspace. The route is organization-scoped, records an audit event, and
tracks `billingCancelAtPeriodEnd`; Stripe webhooks remain authoritative for the
final canceled state. Provider configuration is still required in production.
