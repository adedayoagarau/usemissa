import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

/**
 * Phase 1 is deliberately a deterministic baseline. The version belongs to
 * the run, not to the transcript, so later graph experiments can be compared
 * without rewriting historical conversations.
 */
export const CHAT_BASELINE_GRAPH_VERSION = "chat-baseline.v1";

export type ChatRunStatus = "running" | "completed" | "failed" | "blocked";
export type ChatMessageRole = "user" | "assistant";

export interface BeginChatTurnInput {
  accountId: string;
  organizationId?: string;
  conversationId?: string;
  idempotencyKey: string;
  message: string;
}

export interface BeginChatTurnResult {
  idempotent: boolean;
  conversationId: string;
  runId: string;
  userMessageId: string;
  status: ChatRunStatus;
}

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  runId?: string;
  sequence: number;
  role: ChatMessageRole;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ChatConversationRecord {
  id: string;
  accountId: string;
  organizationId?: string;
  status: "active" | "archived";
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversationView {
  conversation: ChatConversationRecord;
  messages: ChatMessageRecord[];
}

interface ChatConversationRow {
  id: string;
  account_id: string;
  organization_id: string | null;
  status: "active" | "archived";
  title: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ChatRunRecord {
  id: string;
  conversationId: string;
  accountId: string;
  organizationId?: string;
  status: ChatRunStatus;
  intent: string;
  graphVersion: string;
  idempotencyKey: string;
  inputMessageId?: string;
  outputMessageId?: string;
  error?: string;
  metadata: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
}

export interface ChatRunView {
  run: ChatRunRecord;
  messages: ChatMessageRecord[];
}

interface ChatRunRow {
  id: string;
  conversation_id: string;
  account_id: string;
  organization_id: string | null;
  status: ChatRunStatus;
  intent: string;
  graph_version: string;
  idempotency_key: string;
  input_message_id: string | null;
  output_message_id: string | null;
  error: string | null;
  metadata: unknown;
  started_at: Date | string;
  completed_at: Date | string | null;
}

interface ChatMessageRow {
  id: string;
  conversation_id: string;
  run_id: string | null;
  sequence: number;
  role: ChatMessageRole;
  content: string;
  metadata: unknown;
  created_at: Date | string;
}

function metadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function iso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRun(row: ChatRunRow): ChatRunRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    accountId: row.account_id,
    ...(row.organization_id ? { organizationId: row.organization_id } : {}),
    status: row.status,
    intent: row.intent,
    graphVersion: row.graph_version,
    idempotencyKey: row.idempotency_key,
    ...(row.input_message_id ? { inputMessageId: row.input_message_id } : {}),
    ...(row.output_message_id ? { outputMessageId: row.output_message_id } : {}),
    ...(row.error ? { error: row.error } : {}),
    metadata: metadata(row.metadata),
    startedAt: iso(row.started_at) ?? new Date(0).toISOString(),
    ...(iso(row.completed_at) ? { completedAt: iso(row.completed_at) } : {}),
  };
}

function mapMessage(row: ChatMessageRow): ChatMessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    ...(row.run_id ? { runId: row.run_id } : {}),
    sequence: row.sequence,
    role: row.role,
    content: row.content,
    metadata: metadata(row.metadata),
    createdAt: iso(row.created_at) ?? new Date(0).toISOString(),
  };
}

function mapConversation(row: ChatConversationRow): ChatConversationRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    ...(row.organization_id ? { organizationId: row.organization_id } : {}),
    status: row.status,
    ...(row.title ? { title: row.title } : {}),
    createdAt: iso(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date(0).toISOString(),
  };
}

/** The @missa/db migration owns these tables; this adapter never runs DDL. */
export class PostgresChatStore {
  constructor(private readonly pool: Pool) {}

  async beginTurn(input: BeginChatTurnInput): Promise<BeginChatTurnResult> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");

      // Serialize retries for the same account/key before creating any
      // conversation rows. Without this lock, two simultaneous requests can
      // both miss the idempotency lookup and race the unique index.
      await client.query(
        `select pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [`${input.accountId}:${input.idempotencyKey}`],
      );

      const existingRun = await client.query<ChatRunRow>(
        `select id, conversation_id, account_id, organization_id, status,
                intent, graph_version, idempotency_key, input_message_id,
                output_message_id, error, metadata, started_at, completed_at
           from chat_runs
          where account_id = $1 and idempotency_key = $2
          for update`,
        [input.accountId, input.idempotencyKey],
      );
      if (existingRun.rows[0]) {
        await client.query("commit");
        const run = existingRun.rows[0];
        return {
          idempotent: true,
          conversationId: run.conversation_id,
          runId: run.id,
          userMessageId: run.input_message_id ?? "",
          status: run.status,
        };
      }

      let conversationId = input.conversationId;
      if (conversationId) {
        const existingConversation = await client.query<{ id: string }>(
          `select id from chat_conversations
           where id = $1 and account_id = $2
             and organization_id is not distinct from $3
           for update`,
          [conversationId, input.accountId, input.organizationId ?? null],
        );
        if (!existingConversation.rows[0]) {
          throw new Error("Chat conversation is not available to this account");
        }
      } else {
        conversationId = randomUUID();
        await client.query(
          `insert into chat_conversations (id, account_id, organization_id, title)
           values ($1, $2, $3, $4)`,
          [conversationId, input.accountId, input.organizationId ?? null, input.message.slice(0, 120)],
        );
      }

      const sequenceResult = await client.query<{ next_sequence: number }>(
        `select coalesce(max(sequence), -1) + 1 as next_sequence
           from chat_messages where conversation_id = $1`,
        [conversationId],
      );
      const userMessageId = randomUUID();
      const runId = randomUUID();
      const sequence = Number(sequenceResult.rows[0]?.next_sequence ?? 0);
      await client.query(
        `insert into chat_messages
          (id, conversation_id, run_id, sequence, role, content, metadata)
         values ($1, $2, $3, $4, 'user', $5, '{}'::jsonb)`,
        [userMessageId, conversationId, runId, sequence, input.message],
      );
      await client.query(
        `insert into chat_runs
          (id, conversation_id, account_id, organization_id, status, intent,
           graph_version, idempotency_key, input_message_id, metadata)
         values ($1, $2, $3, $4, 'running', 'opportunity-search', $5, $6, $7, $8::jsonb)`,
        [
          runId,
          conversationId,
          input.accountId,
          input.organizationId ?? null,
          CHAT_BASELINE_GRAPH_VERSION,
          input.idempotencyKey,
          userMessageId,
          JSON.stringify({ baseline: true }),
        ],
      );
      await client.query(
        `insert into chat_run_events (id, run_id, sequence, event_type, payload)
         values ($1, $2, 0, 'run.started', $3::jsonb)`,
        [randomUUID(), runId, JSON.stringify({ graphVersion: CHAT_BASELINE_GRAPH_VERSION })],
      );
      await client.query(
        `update chat_conversations set updated_at = now() where id = $1`,
        [conversationId],
      );
      await client.query("commit");
      return { idempotent: false, conversationId, runId, userMessageId, status: "running" };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async completeRun(input: {
    runId: string;
    accountId: string;
    organizationId?: string;
    content: string;
    metadata: Record<string, unknown>;
  }): Promise<string | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const runResult = await client.query<ChatRunRow>(
        `select id, conversation_id, account_id, organization_id, status,
                intent, graph_version, idempotency_key, input_message_id,
                output_message_id, error, metadata, started_at, completed_at
           from chat_runs
          where id = $1 and account_id = $2
            and organization_id is not distinct from $3
          for update`,
        [input.runId, input.accountId, input.organizationId ?? null],
      );
      const run = runResult.rows[0];
      if (!run) throw new Error("Chat run is not available to this account");
      if (run.status === "completed") {
        await client.query("commit");
        return run.output_message_id ?? undefined;
      }
      if (run.status !== "running") {
        await client.query("commit");
        return undefined;
      }

      // A conversation may have multiple runs. Lock its row before allocating
      // the next message sequence so concurrent completions cannot choose the
      // same sequence number.
      await client.query(
        `select id from chat_conversations where id = $1 for update`,
        [run.conversation_id],
      );

      const sequenceResult = await client.query<{ next_sequence: number }>(
        `select coalesce(max(sequence), -1) + 1 as next_sequence
           from chat_messages where conversation_id = $1`,
        [run.conversation_id],
      );
      const messageId = randomUUID();
      const eventSequence = await this.nextEventSequence(client, input.runId);
      await client.query(
        `insert into chat_messages
          (id, conversation_id, run_id, sequence, role, content, metadata)
         values ($1, $2, $3, $4, 'assistant', $5, $6::jsonb)`,
        [messageId, run.conversation_id, input.runId, Number(sequenceResult.rows[0]?.next_sequence ?? 0), input.content, JSON.stringify(input.metadata)],
      );
      await client.query(
        `update chat_runs
            set status = 'completed', output_message_id = $2,
                metadata = metadata || $3::jsonb, completed_at = now()
          where id = $1`,
        [input.runId, messageId, JSON.stringify(input.metadata)],
      );
      await client.query(
        `insert into chat_run_events (id, run_id, sequence, event_type, payload)
         values ($1, $2, $3, 'run.completed', $4::jsonb)`,
        [randomUUID(), input.runId, eventSequence, JSON.stringify({ messageId })],
      );
      await client.query(
        `update chat_conversations set updated_at = now() where id = $1`,
        [run.conversation_id],
      );
      await client.query("commit");
      return messageId;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async failRun(input: {
    runId: string;
    accountId: string;
    organizationId?: string;
    error: string;
  }): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const runResult = await client.query<ChatRunRow>(
        `select id, conversation_id, account_id, organization_id, status,
                intent, graph_version, idempotency_key, input_message_id,
                output_message_id, error, metadata, started_at, completed_at
           from chat_runs
          where id = $1 and account_id = $2
            and organization_id is not distinct from $3
          for update`,
        [input.runId, input.accountId, input.organizationId ?? null],
      );
      const run = runResult.rows[0];
      if (!run || run.status !== "running") {
        await client.query("commit");
        return;
      }
      const eventSequence = await this.nextEventSequence(client, input.runId);
      await client.query(
        `update chat_runs set status = 'failed', error = $2, completed_at = now() where id = $1`,
        [input.runId, input.error.slice(0, 500)],
      );
      await client.query(
        `insert into chat_run_events (id, run_id, sequence, event_type, payload)
         values ($1, $2, $3, 'run.failed', $4::jsonb)`,
        [randomUUID(), input.runId, eventSequence, JSON.stringify({ error: input.error.slice(0, 500) })],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async getRun(input: { runId: string; accountId: string; organizationId?: string }): Promise<ChatRunView | null> {
    const [runResult, messageResult] = await Promise.all([
      this.pool.query<ChatRunRow>(
        `select id, conversation_id, account_id, organization_id, status,
                intent, graph_version, idempotency_key, input_message_id,
                output_message_id, error, metadata, started_at, completed_at
           from chat_runs
          where id = $1 and account_id = $2
            and organization_id is not distinct from $3`,
        [input.runId, input.accountId, input.organizationId ?? null],
      ),
      this.pool.query<ChatMessageRow>(
        `select m.id, m.conversation_id, m.run_id, m.sequence, m.role,
                m.content, m.metadata, m.created_at
           from chat_messages m
           join chat_runs r on r.conversation_id = m.conversation_id
                              and r.id = $1
          where r.account_id = $2
            and r.organization_id is not distinct from $3
          order by m.sequence asc`,
        [input.runId, input.accountId, input.organizationId ?? null],
      ),
    ]);
    const row = runResult.rows[0];
    if (!row) return null;
    return { run: mapRun(row), messages: messageResult.rows.map(mapMessage) };
  }

  async listConversations(input: { accountId: string; limit?: number }): Promise<ChatConversationRecord[]> {
    const result = await this.pool.query<ChatConversationRow>(
      `select id, account_id, organization_id, status, title, created_at, updated_at
         from chat_conversations
        where account_id = $1
        order by updated_at desc, id desc
        limit $2`,
      [input.accountId, Math.max(1, Math.min(input.limit ?? 20, 50))],
    );
    return result.rows.map(mapConversation);
  }

  async getConversation(input: { conversationId: string; accountId: string }): Promise<ChatConversationView | null> {
    const conversationResult = await this.pool.query<ChatConversationRow>(
      `select id, account_id, organization_id, status, title, created_at, updated_at
         from chat_conversations
        where id = $1 and account_id = $2`,
      [input.conversationId, input.accountId],
    );
    const conversation = conversationResult.rows[0];
    if (!conversation) return null;
    const messages = await this.pool.query<ChatMessageRow>(
      `select id, conversation_id, run_id, sequence, role, content, metadata, created_at
         from chat_messages
        where conversation_id = $1
        order by sequence asc`,
      [input.conversationId],
    );
    return { conversation: mapConversation(conversation), messages: messages.rows.map(mapMessage) };
  }

  private async nextEventSequence(client: PoolClient, runId: string): Promise<number> {
    const result = await client.query<{ next_sequence: number }>(
      `select coalesce(max(sequence), -1) + 1 as next_sequence
         from chat_run_events where run_id = $1`,
      [runId],
    );
    return Number(result.rows[0]?.next_sequence ?? 0);
  }
}

export function createPostgresChatStore(pool: Pool): PostgresChatStore {
  return new PostgresChatStore(pool);
}

export function createPostgresChatStoreFromUrl(connectionString: string): PostgresChatStore {
  // The adapter owns pg construction so Next route modules do not need to
  // import database-driver internals or duplicate pool lifecycle code.
  return new PostgresChatStore(new Pool({ connectionString, max: 4 }));
}
