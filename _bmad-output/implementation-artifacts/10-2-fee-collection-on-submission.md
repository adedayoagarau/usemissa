# Story 10.2: Fee collection on submission

Status: review

Fee-bearing forms now create Stripe Checkout sessions using the organization’s
connected account, apply Missa’s 1.5% application fee capped at $1.50, and
return through a session-bound success URL. The submit route retrieves and
verifies the Checkout Session server-side (paid status, form, and account
metadata) before creating a Submission. Submission rows retain payment status,
fee, and session ID for reconciliation. Missing Stripe configuration or an
unverified session fails closed with a recoverable response.
