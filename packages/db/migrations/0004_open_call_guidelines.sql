alter table "open_calls" add column if not exists "guideline_url" text;
alter table "open_calls" add column if not exists "guideline_text" text;
alter table "open_calls" add column if not exists "guideline_source_type" text;
alter table "open_calls" add column if not exists "guideline_imported_at" timestamptz;
alter table "open_calls" add column if not exists "guideline_import_report" jsonb;
