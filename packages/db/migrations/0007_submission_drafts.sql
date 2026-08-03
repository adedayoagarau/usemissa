create table if not exists "submission_drafts" (
  "id" text primary key,
  "submission_path_id" text not null references "submission_paths"("id") on delete cascade,
  "submitter_account_id" text not null references "radar_accounts"("id") on delete cascade,
  "answers" jsonb not null,
  "category" text,
  "work_titles" jsonb not null,
  "idempotency_key" text,
  "updated_at" timestamptz not null default now(),
  "expires_at" timestamptz not null
);
create unique index if not exists "submission_drafts_submitter_path_idx" on "submission_drafts" ("submitter_account_id", "submission_path_id");
create index if not exists "submission_drafts_expires_idx" on "submission_drafts" ("expires_at");
