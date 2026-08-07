import { Pool, type PoolClient } from "pg";

export type PlatformAdminQueue = "review" | "enrichment" | "outbox";
export type PlatformAdminQueueAction = "retry" | "release-stale";

export interface PlatformAdminQueueMutation {
  action: PlatformAdminQueueAction;
  queue: PlatformAdminQueue;
  id?: string;
}

export interface PlatformAdminQueueMutationResult {
  status: "updated";
  action: PlatformAdminQueueAction;
  queue: PlatformAdminQueue;
  affected: number;
  id?: string;
  previousStatus?: string;
}

const QUEUES: Record<PlatformAdminQueue, { table: string; targetType: string; retryStatuses: string[] }> = {
  review: { table: "radar_review_jobs", targetType: "radar_review_job", retryStatuses: ["failed", "blocked"] },
  enrichment: { table: "radar_enrichment_jobs", targetType: "radar_enrichment_job", retryStatuses: ["failed", "blocked"] },
  outbox: { table: "outbox_events", targetType: "outbox_event", retryStatuses: ["failed"] },
};

async function tablePresent(pool: Pool, table: string): Promise<boolean> {
  const result = await pool.query<{ present: boolean }>(
    `select to_regclass('public.' || $1) is not null as present`,
    [table],
  );
  return result.rows[0]?.present === true;
}

function assertSafeId(id: string | undefined): string {
  if (!id || id.length > 200 || !/^[A-Za-z0-9_:.\-]+$/.test(id)) throw new Error("Invalid queue item id");
  return id;
}

async function writeAudit(pool: PoolClient, actorAccountId: string, action: string, targetType: string, targetId: string, detail: Record<string, unknown>): Promise<void> {
  await pool.query(
    `insert into audit_events (account_id, action, target_type, target_id, detail)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [actorAccountId, action, targetType, targetId, JSON.stringify(detail)],
  );
}

export async function recordPlatformAdminAudit(
  connectionString: string,
  actorAccountId: string,
  action: string,
  targetType: string,
  targetId: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    if (!(await tablePresent(pool, "audit_events"))) throw new Error("audit_events is not deployed");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await writeAudit(client, actorAccountId, action, targetType, targetId, detail);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

/**
 * Performs only bounded, auditable queue recovery operations. No payloads are
 * read or rewritten, and every identifier is parameterized. The worker still
 * owns execution; admin only makes an eligible item runnable again.
 */
export async function mutatePlatformAdminQueue(
  connectionString: string,
  actorAccountId: string,
  input: PlatformAdminQueueMutation,
): Promise<PlatformAdminQueueMutationResult> {
  const queue = QUEUES[input.queue];
  if (!queue) throw new Error("Unsupported admin queue");
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    if (!(await tablePresent(pool, queue.table))) throw new Error(`${queue.table} is not deployed`);
    if (!(await tablePresent(pool, "audit_events"))) throw new Error("audit_events is not deployed");

    const client = await pool.connect();
    try {
      await client.query("begin");
      if (input.action === "retry") {
        const id = assertSafeId(input.id);
        const row = await client.query<{ status: string }>(`select status from ${queue.table} where id = $1 for update`, [id]);
        const current = row.rows[0]?.status;
        if (!current) {
          await client.query("rollback");
          const error = new Error("Queue item not found");
          error.name = "NotFoundError";
          throw error;
        }
        if (!queue.retryStatuses.includes(current)) {
          await client.query("rollback");
          const error = new Error(`Queue item is ${current}; only failed or blocked items can be retried`);
          error.name = "ConflictError";
          throw error;
        }
        const update = input.queue === "outbox"
          ? `update outbox_events set status = 'pending', available_at = now(), locked_at = null, last_error = null where id = $1`
          : `update ${queue.table} set status = 'queued', next_attempt_at = now(), lease_until = null, last_error = null, updated_at = now() where id = $1`;
        await client.query(update, [id]);
        await writeAudit(client, actorAccountId, "platform_admin.queue_retry", queue.targetType, id, { queue: input.queue, previousStatus: current });
        await client.query("commit");
        return { status: "updated", action: input.action, queue: input.queue, affected: 1, id, previousStatus: current };
      }

      const update = input.queue === "outbox"
        ? `update outbox_events set status = 'pending', available_at = now(), locked_at = null, last_error = null where status = 'processing' and locked_at < now() - interval '15 minutes'`
        : `update ${queue.table} set status = 'queued', next_attempt_at = now(), lease_until = null, last_error = null, updated_at = now() where status = 'processing' and lease_until < now()`;
      const result = await client.query(update);
      await writeAudit(client, actorAccountId, "platform_admin.queue_release_stale", queue.targetType, input.queue, { queue: input.queue, affected: result.rowCount ?? 0 });
      await client.query("commit");
      return { status: "updated", action: input.action, queue: input.queue, affected: result.rowCount ?? 0, id: input.queue };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
