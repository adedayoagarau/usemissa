alter table "submissions" add column if not exists "idempotency_key" text;

create unique index if not exists "submissions_submitter_path_idempotency_idx"
  on "submissions" ("submitter_account_id", "submission_path_id", "idempotency_key")
  where "idempotency_key" is not null;
