-- Read-only assistant baseline. This migration is intentionally additive.
-- Reconcile it with the target migration journal and a disposable database
-- before registering/applying it in any shared environment.

CREATE TABLE IF NOT EXISTS chat_conversations (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  organization_id text REFERENCES radar_organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_conversations_status_check CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS chat_conversations_account_updated_idx
  ON chat_conversations (account_id, updated_at);
CREATE INDEX IF NOT EXISTS chat_conversations_organization_updated_idx
  ON chat_conversations (organization_id, updated_at);

CREATE TABLE IF NOT EXISTS chat_runs (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  organization_id text REFERENCES radar_organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  intent text NOT NULL DEFAULT 'opportunity-search',
  graph_version text NOT NULL DEFAULT 'chat-baseline.v1',
  idempotency_key text NOT NULL,
  input_message_id text,
  output_message_id text,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT chat_runs_status_check CHECK (status IN ('running', 'completed', 'failed', 'blocked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS chat_runs_account_idempotency_idx
  ON chat_runs (account_id, idempotency_key);
CREATE INDEX IF NOT EXISTS chat_runs_conversation_started_idx
  ON chat_runs (conversation_id, started_at);
CREATE INDEX IF NOT EXISTS chat_runs_organization_status_idx
  ON chat_runs (organization_id, status, started_at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  run_id text REFERENCES chat_runs(id) ON DELETE SET NULL,
  sequence integer NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_conversation_sequence_key UNIQUE (conversation_id, sequence),
  CONSTRAINT chat_messages_role_check CHECK (role IN ('user', 'assistant')),
  CONSTRAINT chat_messages_sequence_check CHECK (sequence >= 0)
);

CREATE INDEX IF NOT EXISTS chat_messages_run_idx
  ON chat_messages (run_id, created_at);

CREATE TABLE IF NOT EXISTS chat_run_events (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES chat_runs(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_run_events_run_sequence_key UNIQUE (run_id, sequence),
  CONSTRAINT chat_run_events_sequence_check CHECK (sequence >= 0)
);

CREATE INDEX IF NOT EXISTS chat_run_events_type_created_idx
  ON chat_run_events (event_type, created_at);
