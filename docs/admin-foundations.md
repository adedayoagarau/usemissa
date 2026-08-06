# Platform admin foundations

This slice adds the backend contracts required before Missa admin can become a
real operating surface:

| Foundation | Durable record | Admin truth |
| --- | --- | --- |
| Messaging | `platform_message_effects` + `platform_message_attempts` | Intent, attempts, provider acceptance, and sanitized failures. No message body is stored or rendered. |
| CRM | `platform_crm_timeline_events` | Organization-first internal notes plus redacted audit activity. Account activity is not silently assigned to an organization. |
| Billing | `platform_billing_ledger` | Stripe provider events and reconciliation state. It is not a revenue warehouse and does not infer payments from plan JSON. |
| Agent controls | `platform_agent_control_requests` | Authenticated operator intent, expected state, expiry, policy version, audit, outbox, and worker acknowledgement. A request is not execution evidence. |

## Transaction boundary

New writes use this sequence where the required base tables are available:

```text
business/effect record → audit_events → outbox_events
```

Message providers are called only after a message effect and attempt exist. The
provider result then closes the attempt and effect. Stripe webhooks are first
recorded as provider facts and then reconcile the compatibility organization or
submission state. Agent controls are emitted as outbox commands; the worker
owns target mutation and acknowledgement.

## Migration boundary

`packages/db/migrations/0014_platform_admin_foundations.sql` is registered in
the Drizzle journal and has been applied to the configured Neon target after a
read-only preflight confirmed that the separately numbered `0006`–`0013`
schema additions were already present. Other environments must still verify
their live history before applying `0014`; the repository's runtime adapter
retains a guarded bootstrap path for environments that may lag the migration.
A missing table is shown as unavailable by admin reads rather than as an empty
healthy queue.

## Worker controls

The Radar worker acknowledges queued control requests before its bounded tick.
Requeue/replay/release-stale can be applied only after target-state and lease
checks. Pause/resume/cancel/replay of a live run remains rejected until the
worker has a cooperative lifecycle state and cancellation check around provider
calls. This keeps the admin page honest while leaving the control contract ready
for that worker change.

Taxonomy proposal approval follows the same boundary: approval/rejection updates
the proposal, audit, and outbox transactionally; it does not apply terms or
publish a scheme. Apply and activate remain separate governed actions.
