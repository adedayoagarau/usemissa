alter table "submissions" add column if not exists "payment_status" text not null default 'not-required';
alter table "submissions" add column if not exists "payment_session_id" text;
alter table "submissions" add column if not exists "fee_cents" integer;
