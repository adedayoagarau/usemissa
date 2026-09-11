-- Additive private application context. Existing submissions and public records are retained.
ALTER TABLE tracked_opportunities ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE tracked_status_events ADD COLUMN IF NOT EXISTS occurred_on date;

CREATE TABLE IF NOT EXISTS application_material_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  tracked_opportunity_id text NOT NULL REFERENCES tracked_opportunities(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES tracked_status_events(id) ON DELETE CASCADE,
  materials jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);
CREATE INDEX IF NOT EXISTS application_material_versions_owner_idx
  ON application_material_versions(account_id, tracked_opportunity_id);

-- Pin private file objects used in recorded submissions. Do not delete their bytes as a side effect of Library cleanup.
CREATE TABLE IF NOT EXISTS application_material_files (
  version_id uuid NOT NULL REFERENCES application_material_versions(id) ON DELETE CASCADE,
  file_id text NOT NULL REFERENCES creator_library_files(id) ON DELETE RESTRICT,
  PRIMARY KEY(version_id, file_id)
);
