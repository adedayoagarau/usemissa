# Epic 15 production-like certification — 2026-08-27

Status: PARTIAL — database and deployed-runtime evidence completed; provider sandbox lifecycle evidence remains open.

## Environment discovery correction

The earlier statement that no live infrastructure was available was incorrect.
The repository has a working Neon connection, a linked Vercel production project,
and a live Railway Docker deployment. The active database was treated as read-only.
All migration and concurrency mutations ran only in uniquely named disposable
certification databases.

## Database evidence

- Active Neon connectivity passed on PostgreSQL 17.10. The active database is about
  4.2 GB with 151 public tables and was not mutated.
- Initial zero-to-current Drizzle replay failed because the journal omitted the
  reconciled 0003–0013 operational migrations and 0024. Migration 0015 attempted to
  index `radar_agent_runs.heartbeat_at` before omitted migration 0013 created it.
- The journal was repaired to retain the proven 33-migration sequence. A schema test
  asserts required entries, contiguous indexes, monotonic timestamps, and critical
  dependency order.
- Fresh Drizzle replay passed 33/33 migrations on disposable database
  `usemissa_cert_20260827_a`, producing 92 public tables.
- Upgrade rehearsal on `usemissa_cert_20260827_upgrade` passed 0028 and 0029 over the
  complete pre-0028 schema. Legacy message `sent` became `accepted`, unknown template
  fields remained `legacy-unknown`, and representative CRM and billing rows survived.
- Real-Postgres suites passed: Radar adapter/taxonomy 8/8, Workspace 1/1, and
  ingestion-v2 1/1.
- Eight simultaneous message requests converged on one effect, one attempt, and one
  permitted provider call. Event-before-response reconciliation reached `delivered`;
  duplicate provider replay retained one matched event.
- Six simultaneous agent-control requests converged on one request. Changed reason
  conflicted, processing/applied outcomes were appended, checkpoint acknowledgement
  stayed false, and exactly one linked replay child was created.

## Deployed runtime and provider evidence

- Vercel production is Ready and serves `usemissa.com`.
- `/api/health/readiness` returned 200/no-store with database, session, storage, cron,
  and email ready. Payments, Gmail, SCIM, and malware scanning were degraded.
- Vercel lists encrypted Resend production variables and deployment readiness reports
  email ready. The CLI-accessible environment returned zero-length values, so direct
  sandbox accepted/delivered/bounced reconciliation could not be executed safely.
- No Stripe variables are present in the linked Vercel project, and production reports
  payments degraded. Stripe sandbox refund/provider reconciliation is not certified.
- Railway `ingestion-v2-worker` has a successful Docker deployment; bounded logs show
  Postgres batches completing and review gates operating. The local host lacks Docker,
  so a local image rebuild/scan was not run.

## Remaining gates

1. Identify the Stripe test-mode secret/webhook secret and sandbox account; run one
   idempotent test refund and pending/succeeded/failed reconciliation without live funds.
2. Make a Resend sandbox credential available to this process or run the retained test
   in the provider-controlled environment; verify accepted, delivered, bounced,
   duplicate, and out-of-order events.
3. Deploy migrations 0028 and 0029 through the approved release process. Read-only
   inspection shows the active migration ledger currently ends at 0027.
4. Run the Railway image build and vulnerability scan in its Docker-enabled CI.

## Cleanup

The disposable databases contained only synthetic `.invalid` identities and
certification rows. They were removed after evidence capture. No production customer
record or provider side effect was created.
