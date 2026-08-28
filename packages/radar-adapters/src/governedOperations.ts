import { createHash, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

export const GOVERNED_POLICY_VERSION = "platform-governance.v1";
export const KNOWN_ENTITLEMENTS = ["radar.pro", "workspace.team", "reviewer.seats"] as const;
export type BillingActionKind = "refund" | "correction" | "grant-entitlement" | "revoke-entitlement" | "reconcile";
export type GovernedActionStatus = "requested" | "processing" | "provider-accepted" | "applied" | "rejected" | "failed" | "expired" | "canceled" | "unknown";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function governedIdentity(value: Record<string, unknown>): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export function expectedConfirmation(input: { organizationId: string; action: BillingActionKind; amountCents?: number; currency?: string; entitlementKey?: string }): string {
  const subject = input.entitlementKey ?? (input.amountCents === undefined ? "no-amount" : `${input.amountCents} ${input.currency}`);
  return `CONFIRM ${input.organizationId} ${input.action} ${subject}`;
}

export function validateBillingAction(input: { organizationId: string; action: BillingActionKind; amountCents?: number; currency?: string; entitlementKey?: string; reasonCode: string; confirmation: string }): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,239}$/.test(input.organizationId)) throw new Error("Invalid organization id");
  if (!/^[a-z][a-z0-9-]{1,79}$/.test(input.reasonCode)) throw new Error("Invalid billing reason code");
  if (["refund", "correction"].includes(input.action)) {
    if (!Number.isInteger(input.amountCents) || input.amountCents === 0) throw new Error("A non-zero integer amount is required");
    if (input.action === "refund" && (input.amountCents ?? 0) < 1) throw new Error("Refund amount must be positive");
    if (!/^[A-Z]{3}$/.test(input.currency ?? "")) throw new Error("ISO currency is required");
    if (input.entitlementKey) throw new Error("Financial actions cannot include an entitlement");
  } else if (["grant-entitlement", "revoke-entitlement"].includes(input.action)) {
    if (!KNOWN_ENTITLEMENTS.includes(input.entitlementKey as typeof KNOWN_ENTITLEMENTS[number])) throw new Error("Unknown entitlement");
    if (input.amountCents !== undefined || input.currency !== undefined) throw new Error("Entitlement actions cannot include an amount");
  }
  if (input.confirmation !== expectedConfirmation(input)) throw new Error("Exact confirmation is required");
}

export interface RequestBillingActionInput {
  connectionString: string; organizationId: string; actorAccountId: string; action: BillingActionKind;
  providerObjectId?: string; amountCents?: number; currency?: string; entitlementKey?: string;
  expectedState?: string; expectedVersion?: number; reasonCode: string; confirmation: string;
  idempotencyKey: string; recoveryOfActionId?: string;
  /** True only after the bounded executor and provider reconciler are both configured. */
  executionAndReconciliationReady?: boolean;
}

export function validateAuthoritativeRefundFact(input: { organizationId: string; currency: string; amountCents: number; expectedState: string; expectedVersion: number }, fact: { organizationId: string; currency: string; amountCents: number; status: string; reconciliationVersion: number }, reservedCents: number): void {
  if (fact.organizationId !== input.organizationId || fact.currency !== input.currency || fact.status !== input.expectedState || fact.reconciliationVersion !== input.expectedVersion) {
    throw Object.assign(new Error("Refund authoritative fact conflict"), { name: "ConflictError" });
  }
  if (input.amountCents > fact.amountCents - reservedCents) throw Object.assign(new Error("Refund exceeds authoritative refundable remainder"), { name: "ConflictError" });
}

export async function requestPlatformBillingAction(input: RequestBillingActionInput): Promise<{ status: "requested" | "replayed" | "conflict" | "unavailable"; actionId?: string }> {
  validateBillingAction(input);
  // Creating any action without its bounded executor and provider reconciler would
  // strand a durable request that this release cannot safely complete.
  if (!input.executionAndReconciliationReady) return { status: "unavailable" };
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,239}$/.test(input.idempotencyKey)) throw new Error("Invalid idempotency key");
  const requestIdentity = governedIdentity({ actorAccountId: input.actorAccountId, organizationId: input.organizationId, action: input.action, providerObjectId: input.providerObjectId ?? null, amountCents: input.amountCents ?? null, currency: input.currency ?? null, entitlementKey: input.entitlementKey ?? null, expectedState: input.expectedState ?? null, expectedVersion: input.expectedVersion ?? null, reasonCode: input.reasonCode, policyVersion: GOVERNED_POLICY_VERSION, recoveryOfActionId: input.recoveryOfActionId ?? null });
  const confirmationDigest = governedIdentity({ confirmation: input.confirmation, requestIdentity });
  const pool = new Pool({ connectionString: input.connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    const available = await pool.query<{ ready: boolean }>(`select to_regclass('public.platform_billing_actions') is not null and to_regclass('public.platform_billing_action_outcomes') is not null and to_regclass('public.audit_events') is not null and to_regclass('public.outbox_events') is not null as ready`);
    if (!available.rows[0]?.ready) return { status: "unavailable" };
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [`billing:${input.organizationId}:${input.idempotencyKey}`]);
      const org = await client.query(`select id from radar_organizations where id = $1`, [input.organizationId]);
      if (!org.rows[0]) throw Object.assign(new Error("Organization not found"), { name: "NotFoundError" });
      const existing = await client.query<{ id: string; request_identity: string }>(`select id, request_identity from platform_billing_actions where organization_id = $1 and idempotency_key = $2 for update`, [input.organizationId, input.idempotencyKey]);
      if (existing.rows[0]) { await client.query("commit"); return existing.rows[0].request_identity === requestIdentity ? { status: "replayed", actionId: existing.rows[0].id } : { status: "conflict", actionId: existing.rows[0].id }; }
      if (input.action === "refund") {
        if (!input.providerObjectId || !input.currency || input.expectedVersion === undefined || !input.expectedState) {
          throw new Error("Refund requires an authoritative provider object, currency, expected state, and expected version");
        }
        const fact = await client.query<{ organization_id: string; amount_cents: number; currency: string; reconciliation_version: number; status: string }>(
          `select organization_id, amount_cents, currency, reconciliation_version, status
             from platform_billing_ledger
            where organization_id=$1 and provider='stripe' and provider_object_id=$2
              and entry_type in ('payment','invoice','checkout') and status='processed'
            order by occurred_at desc nulls last, created_at desc limit 1 for update`,
          [input.organizationId, input.providerObjectId],
        );
        const authoritative = fact.rows[0];
        if (!authoritative) throw Object.assign(new Error("Refund authoritative fact conflict"), { name: "ConflictError" });
        const reserved = await client.query<{ total: number }>(
          `select coalesce(sum(amount_cents),0)::int as total from platform_billing_actions
            where organization_id=$1 and provider_object_id=$2 and action='refund'
              and status not in ('rejected','failed','expired','canceled')`,
          [input.organizationId, input.providerObjectId],
        );
        validateAuthoritativeRefundFact(
          { organizationId: input.organizationId, currency: input.currency, amountCents: input.amountCents ?? 0, expectedState: input.expectedState, expectedVersion: input.expectedVersion },
          { organizationId: authoritative.organization_id, currency: authoritative.currency, amountCents: authoritative.amount_cents, status: authoritative.status, reconciliationVersion: authoritative.reconciliation_version },
          Number(reserved.rows[0]?.total ?? 0),
        );
      }
      const id = `billing_action_${randomUUID()}`;
      await client.query(`insert into platform_billing_actions (id, organization_id, action, provider_object_id, amount_cents, currency, entitlement_key, expected_state, expected_version, policy_version, actor_account_id, reason_code, confirmation_digest, idempotency_key, request_identity, provider_idempotency_key, recovery_of_action_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$1,$16)`, [id, input.organizationId, input.action, input.providerObjectId ?? null, input.amountCents ?? null, input.currency ?? null, input.entitlementKey ?? null, input.expectedState ?? null, input.expectedVersion ?? null, GOVERNED_POLICY_VERSION, input.actorAccountId, input.reasonCode, confirmationDigest, input.idempotencyKey, requestIdentity, input.recoveryOfActionId ?? null]);
      await appendBillingEvidence(client, id, input, "requested");
      await client.query("commit");
      return { status: "requested", actionId: id };
    } catch (error) { await client.query("rollback").catch(() => undefined); throw error; } finally { client.release(); }
  } catch (error) {
    if ((error as Error).name === "NotFoundError" || (error as Error).name === "ConflictError") throw error;
    if ((error as Error).message.startsWith("Invalid") || (error as Error).message.includes("required") || (error as Error).message.includes("entitlement")) throw error;
    if ((error as { code?: string }).code === "42P01") return { status: "unavailable" };
    throw error;
  } finally { await pool.end(); }
}

async function appendBillingEvidence(client: PoolClient, id: string, input: RequestBillingActionInput, status: GovernedActionStatus): Promise<void> {
  await client.query(`insert into platform_billing_action_outcomes (id, action_id, status) values ($1,$2,$3)`, [`billing_outcome_${randomUUID()}`, id, status]);
  await client.query(`insert into audit_events (account_id, organization_id, action, target_type, target_id, detail) values ($1,$2,'billing.action.requested','billing_action',$3,$4::jsonb)`, [input.actorAccountId, input.organizationId, id, JSON.stringify({ action: input.action, reasonCode: input.reasonCode, policyVersion: GOVERNED_POLICY_VERSION })]);
  await client.query(`insert into outbox_events (topic, aggregate_type, aggregate_id, payload) values ('billing.action.requested','billing_action',$1,$2::jsonb)`, [id, JSON.stringify({ actionId: id, action: input.action, organizationId: input.organizationId })]);
}

/** Claims a bounded batch. Provider calls are intentionally outside this adapter;
 * absence of a configured worker therefore cannot trigger Stripe from HTTP. */
export async function claimPlatformBillingActions(connectionString: string, workerId: string, limit = 10): Promise<Array<{ id: string; organizationId: string; action: BillingActionKind; providerIdempotencyKey: string }>> {
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const result = await client.query<{ id: string; organization_id: string; action: BillingActionKind; provider_idempotency_key: string }>(`update platform_billing_actions a set status='processing', lease_owner=$1, lease_until=now()+interval '2 minutes', attempt_count=attempt_count+1, updated_at=now() where a.id in (select id from platform_billing_actions where status='requested' or (status='processing' and lease_until < now()) order by created_at limit $2 for update skip locked) returning id, organization_id, action, provider_idempotency_key`, [workerId, Math.min(Math.max(limit, 1), 25)]);
      for (const row of result.rows) await client.query(`insert into platform_billing_action_outcomes (id,action_id,status) values ($1,$2,'processing')`, [`billing_outcome_${randomUUID()}`, row.id]);
      await client.query("commit");
      return result.rows.map((row) => ({ id: row.id, organizationId: row.organization_id, action: row.action, providerIdempotencyKey: row.provider_idempotency_key }));
    } catch (error) { await client.query("rollback").catch(() => undefined); throw error; } finally { client.release(); }
  } finally { await pool.end(); }
}
