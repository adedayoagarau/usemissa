-- The first Neon baseline had an empty submission_drafts table for a
-- different draft concept (account_id/opportunity_id). Preserve it and let
-- the Workspace runtime create the current path-scoped table on boot.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = current_schema() and table_name = 'submission_drafts'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = current_schema() and table_name = 'submission_drafts' and column_name = 'submitter_account_id'
  ) then
    if not exists (
      select 1 from information_schema.tables
      where table_schema = current_schema() and table_name = 'submission_drafts_legacy_20260803'
    ) then
      alter table submission_drafts rename to submission_drafts_legacy_20260803;
    else
      execute 'alter table submission_drafts rename to submission_drafts_legacy_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
    end if;
  end if;
end $$;

create table if not exists submission_drafts (
  id text primary key,
  submission_path_id text not null references submission_paths(id) on delete cascade,
  submitter_account_id text not null references radar_accounts(id) on delete cascade,
  answers jsonb not null,
  category text,
  work_titles jsonb not null,
  idempotency_key text,
  payment_session_id text,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create unique index if not exists submission_drafts_owner_path_idx on submission_drafts (submitter_account_id, submission_path_id);
create index if not exists submission_drafts_expires_idx on submission_drafts (expires_at);
alter table works add column if not exists file_urls jsonb;
