import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";

export type CreatorReceipt = Readonly<{
  resourceType: string;
  resourceId: string;
  revision: number;
  receiptId: string;
  replayed: boolean;
}>;

export type CreatorCommandEnvelope = Readonly<{
  accountId: string;
  commandType: string;
  idempotencyKey: string;
  expectedRevision: number;
  requestHash: string;
  correlationId: string;
}>;

export type CreatorAggregateKind =
  | "profile"
  | "opportunity-preferences"
  | "saved-search"
  | "organization-follow"
  | "tracker"
  | "inbox-alert"
  | "notification-preferences"
  | "calendar-feed-token"
  | "library-work"
  | "library-file"
  | "saved-answer";

export type CreatorAggregateView = Readonly<{
  kind: CreatorAggregateKind;
  id: string;
  accountId: string;
  revision: number;
  value: Readonly<Record<string, unknown>>;
}>;

export type CreatorAggregateCommand = Readonly<{
  kind: CreatorAggregateKind;
  resourceId: string;
  operation: "create" | "update" | "delete" | "mark-read" | "rotate" | "revoke";
  values: Readonly<Record<string, unknown>>;
}>;

/** Typed server-side port. HTTP routes never receive a Pool or SQL client. */
export interface CreatorRepositoryPort {
  read(accountId: string, kind: CreatorAggregateKind, resourceId?: string): Promise<CreatorAggregateView | undefined>;
  list(accountId: string, kind: CreatorAggregateKind): Promise<CreatorAggregateView[]>;
  command(envelope: CreatorCommandEnvelope, command: CreatorAggregateCommand): Promise<CreatorReceipt>;
}

export class CreatorCommandValidationError extends Error {}
export class CreatorConflictError extends Error {
  constructor(
    readonly resourceType: string,
    readonly resourceId: string,
    readonly expectedRevision: number,
    readonly actualRevision: number,
  ) {
    super("This item changed in another session. Refresh and try again.");
  }
}
export class CreatorIdempotencyConflictError extends Error {
  constructor() {
    super("This confirmation key belongs to a different creator action.");
  }
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalValue(item)]),
    );
  }
  return value;
}

export function canonicalCreatorRequestHash(
  commandType: string,
  payload: unknown,
  expectedRevision: number,
): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalValue({ commandType, expectedRevision, payload })))
    .digest("hex");
}

export function creatorCommandEnvelope(
  accountId: string,
  commandType: string,
  idempotencyKey: string,
  payload: unknown,
  expectedRevision: number,
  correlationId: string = randomUUID(),
): CreatorCommandEnvelope {
  if (!accountId || !commandType) throw new CreatorCommandValidationError("Creator command identity is required");
  if (!idempotencyKey || idempotencyKey.length > 200) {
    throw new CreatorCommandValidationError("Idempotency-Key must contain 1 to 200 characters");
  }
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
    throw new CreatorCommandValidationError("expectedRevision must be a positive integer");
  }
  return {
    accountId,
    commandType,
    idempotencyKey,
    expectedRevision,
    requestHash: canonicalCreatorRequestHash(commandType, payload, expectedRevision),
    correlationId,
  };
}

export function boundedCreatorReceipt(receipt: CreatorReceipt): CreatorReceipt {
  if (!receipt.resourceType || !receipt.resourceId || !receipt.receiptId || receipt.revision < 1) {
    throw new CreatorCommandValidationError("Invalid creator command receipt");
  }
  return Object.freeze({
    resourceType: receipt.resourceType,
    resourceId: receipt.resourceId,
    revision: receipt.revision,
    receiptId: receipt.receiptId,
    replayed: receipt.replayed,
  });
}

const creatorPools = new Map<string, Pool>();

/** Process-level pool ownership; routes receive repositories, never raw pools. */
export function creatorPoolFor(connectionString: string): Pool {
  const existing = creatorPools.get(connectionString);
  if (existing) return existing;
  const pool = new Pool({ connectionString, max: 10 });
  creatorPools.set(connectionString, pool);
  return pool;
}

type CreatorMutationResult = Readonly<{
  resourceType: string;
  resourceId: string;
  revision: number;
}>;

type ReceiptRow = { request_hash: string; result: CreatorReceipt };

export abstract class CreatorRepositoryBase {
  protected constructor(protected readonly pool: Pool) {}

  protected async query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(text, [...values]);
  }

  protected async executeOwnerCommand(
    envelope: CreatorCommandEnvelope,
    mutate: (client: PoolClient) => Promise<CreatorMutationResult>,
  ): Promise<CreatorReceipt> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const replay = await client.query<ReceiptRow>(
        `select request_hash, result
         from workspace_command_receipts
         where scope_type = 'owner' and scope_id = $1 and actor_account_id = $1
           and command_type = $2 and idempotency_key = $3
         for update`,
        [envelope.accountId, envelope.commandType, envelope.idempotencyKey],
      );
      const existing = replay.rows[0];
      if (existing) {
        if (existing.request_hash !== envelope.requestHash) throw new CreatorIdempotencyConflictError();
        await client.query("COMMIT");
        return boundedCreatorReceipt({ ...existing.result, replayed: true });
      }

      const mutation = await mutate(client);
      if (!Number.isSafeInteger(mutation.revision) || mutation.revision < 1) {
        throw new CreatorCommandValidationError("Creator mutation returned an invalid revision");
      }
      const receiptId = randomUUID();
      const result = boundedCreatorReceipt({ ...mutation, receiptId, replayed: false });
      await client.query(
        `insert into workspace_command_receipts
          (id, scope_type, scope_id, actor_account_id, command_type, idempotency_key,
           request_hash, result, correlation_id)
         values ($1, 'owner', $2, $2, $3, $4, $5, $6::jsonb, $7)`,
        [receiptId, envelope.accountId, envelope.commandType, envelope.idempotencyKey, envelope.requestHash, JSON.stringify(result), envelope.correlationId],
      );
      await client.query(
        `insert into audit_events
          (account_id, action, target_type, target_id, detail, correlation_id)
         values ($1, $2, $3, $4, $5::jsonb, $6)`,
        [envelope.accountId, envelope.commandType, mutation.resourceType, mutation.resourceId, JSON.stringify({ receiptId, revision: mutation.revision }), envelope.correlationId],
      );
      await client.query(
        `insert into outbox_events
          (topic, aggregate_type, aggregate_id, payload, event_key, correlation_id)
         values ($1, $2, $3, $4::jsonb, $5, $6)`,
        [envelope.commandType, mutation.resourceType, mutation.resourceId, JSON.stringify({ resourceId: mutation.resourceId, revision: mutation.revision }), receiptId, envelope.correlationId],
      );
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
