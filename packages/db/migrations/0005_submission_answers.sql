alter table "submissions" add column if not exists "answers" jsonb;
alter table "submissions" add column if not exists "category" text;

create index if not exists "submissions_category_idx" on "submissions" ("category");
