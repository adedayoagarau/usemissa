PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS crawl_runs (
    id TEXT PRIMARY KEY,
    index_url TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'partial')),
    config_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY,
    source_detail_url TEXT NOT NULL UNIQUE,
    organizer TEXT NOT NULL,
    title TEXT NOT NULL,
    official_website TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS call_observations (
    id INTEGER PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
    opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL CHECK (rank > 0),
    deadline TEXT,
    deadline_note TEXT,
    entry_fee TEXT,
    cash_prize TEXT,
    genres_json TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    description TEXT,
    contact_email TEXT,
    contact_details TEXT,
    full_text TEXT NOT NULL,
    host_status TEXT,
    host_match_score REAL CHECK (host_match_score IS NULL OR host_match_score BETWEEN 0 AND 1),
    canonical_source TEXT NOT NULL DEFAULT 'p_and_w',
    canonical_deadline_text TEXT,
    canonical_entry_fee TEXT,
    canonical_cash_prize TEXT,
    missing_fields_json TEXT NOT NULL,
    UNIQUE (run_id, opportunity_id)
);

CREATE TABLE IF NOT EXISTS source_pages (
    id INTEGER PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
    observation_id INTEGER REFERENCES call_observations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('index', 'pw_detail', 'official')),
    requested_url TEXT NOT NULL,
    final_url TEXT NOT NULL,
    status_code INTEGER,
    content_type TEXT,
    title TEXT NOT NULL,
    text_content TEXT NOT NULL,
    error TEXT,
    rendered INTEGER NOT NULL CHECK (rendered IN (0, 1)),
    resource_urls_json TEXT NOT NULL,
    html_path TEXT NOT NULL,
    UNIQUE (run_id, html_path)
);

CREATE TABLE IF NOT EXISTS media_blobs (
    id INTEGER PRIMARY KEY,
    sha256 TEXT NOT NULL UNIQUE,
    content_type TEXT,
    byte_size INTEGER NOT NULL,
    local_path TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_assets (
    id INTEGER PRIMARY KEY,
    source_page_id INTEGER NOT NULL REFERENCES source_pages(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    final_url TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('image', 'video', 'audio', 'document', 'stylesheet', 'font', 'other')),
    content_type TEXT,
    status_code INTEGER,
    byte_size INTEGER,
    blob_id INTEGER REFERENCES media_blobs(id) ON DELETE SET NULL,
    alt_text TEXT,
    relation TEXT,
    error TEXT,
    UNIQUE (source_page_id, original_url, relation)
);

CREATE TABLE IF NOT EXISTS field_observations (
    id INTEGER PRIMARY KEY,
    observation_id INTEGER NOT NULL REFERENCES call_observations(id) ON DELETE CASCADE,
    source_page_id INTEGER REFERENCES source_pages(id) ON DELETE SET NULL,
    field_name TEXT NOT NULL,
    value TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('pw', 'host')),
    selected INTEGER NOT NULL CHECK (selected IN (0, 1)),
    candidate_rank INTEGER
);

CREATE TABLE IF NOT EXISTS field_conflicts (
    id INTEGER PRIMARY KEY,
    observation_id INTEGER NOT NULL REFERENCES call_observations(id) ON DELETE CASCADE,
    source_page_id INTEGER REFERENCES source_pages(id) ON DELETE SET NULL,
    field_name TEXT NOT NULL,
    host_value TEXT,
    expected_value TEXT,
    detail TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_links (
    id INTEGER PRIMARY KEY,
    source_page_id INTEGER NOT NULL REFERENCES source_pages(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    relation TEXT NOT NULL,
    followed INTEGER NOT NULL CHECK (followed IN (0, 1)),
    UNIQUE (source_page_id, target_url, relation)
);

CREATE INDEX IF NOT EXISTS idx_call_observations_run_rank
    ON call_observations(run_id, rank);
CREATE INDEX IF NOT EXISTS idx_call_observations_opportunity
    ON call_observations(opportunity_id, run_id);
CREATE INDEX IF NOT EXISTS idx_source_pages_observation
    ON source_pages(observation_id, role);
CREATE INDEX IF NOT EXISTS idx_media_assets_sha256
    ON media_assets(blob_id);
CREATE INDEX IF NOT EXISTS idx_field_conflicts_observation
    ON field_conflicts(observation_id);
