CREATE TABLE IF NOT EXISTS gary_sources (
    id TEXT PRIMARY KEY,
    adapter TEXT NOT NULL,
    name TEXT NOT NULL,
    seed_url TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    freshness_hours INTEGER NOT NULL DEFAULT 24 CHECK (freshness_hours BETWEEN 1 AND 8760),
    backfill_status TEXT NOT NULL DEFAULT 'pending' CHECK (backfill_status IN ('pending', 'running', 'complete', 'blocked')),
    next_refresh_at TIMESTAMPTZ,
    last_started_at TIMESTAMPTZ,
    last_successful_at TIMESTAMPTZ,
    lease_owner TEXT,
    lease_until TIMESTAMPTZ,
    consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
    last_error TEXT,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gary_crawl_runs (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES gary_sources(id) ON DELETE RESTRICT,
    mode TEXT NOT NULL CHECK (mode IN ('backfill', 'refresh')),
    manifest_hash TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'partial', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    error TEXT,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_id, manifest_hash)
);

CREATE TABLE IF NOT EXISTS gary_crawl_jobs (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES gary_sources(id) ON DELETE CASCADE,
    run_id TEXT REFERENCES gary_crawl_runs(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('index', 'call', 'refresh')),
    target_url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'blocked')),
    priority INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    lease_until TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_id, kind, normalized_url)
);

CREATE INDEX IF NOT EXISTS gary_crawl_jobs_ready_idx
    ON gary_crawl_jobs(status, available_at, lease_until, priority DESC);

CREATE TABLE IF NOT EXISTS gary_opportunities (
    id TEXT PRIMARY KEY,
    identity_key TEXT NOT NULL,
    canonical_key TEXT NOT NULL UNIQUE,
    organizer_key TEXT NOT NULL,
    title_key TEXT NOT NULL,
    deadline_key TEXT NOT NULL,
    organizer TEXT NOT NULL,
    title TEXT NOT NULL,
    official_website TEXT,
    normalized_official_url TEXT,
    identity_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (identity_status IN ('confirmed', 'needs-review')),
    identity_confidence NUMERIC(4, 3) NOT NULL DEFAULT 0 CHECK (identity_confidence BETWEEN 0 AND 1),
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gary_opportunities_identity_idx
    ON gary_opportunities(identity_key);

CREATE INDEX IF NOT EXISTS gary_opportunities_label_idx
    ON gary_opportunities(organizer_key, title_key);

CREATE TABLE IF NOT EXISTS gary_opportunity_aliases (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL REFERENCES gary_opportunities(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES gary_sources(id) ON DELETE RESTRICT,
    alias_kind TEXT NOT NULL CHECK (alias_kind IN ('detail', 'official', 'submission', 'alternate')),
    url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gary_opportunity_aliases_opp_idx
    ON gary_opportunity_aliases(opportunity_id);

ALTER TABLE gary_opportunity_aliases
    DROP CONSTRAINT IF EXISTS gary_opportunity_aliases_normalized_url_key;

CREATE UNIQUE INDEX IF NOT EXISTS gary_opportunity_aliases_opportunity_url_idx
    ON gary_opportunity_aliases(opportunity_id, normalized_url);

CREATE UNIQUE INDEX IF NOT EXISTS gary_opportunity_aliases_detail_url_idx
    ON gary_opportunity_aliases(normalized_url)
    WHERE alias_kind = 'detail';

CREATE TABLE IF NOT EXISTS gary_identity_candidates (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES gary_crawl_runs(id) ON DELETE CASCADE,
    incoming_opportunity_id TEXT NOT NULL REFERENCES gary_opportunities(id) ON DELETE CASCADE,
    existing_opportunity_id TEXT NOT NULL REFERENCES gary_opportunities(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (run_id, incoming_opportunity_id, existing_opportunity_id)
);

CREATE TABLE IF NOT EXISTS gary_call_observations (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES gary_crawl_runs(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES gary_sources(id) ON DELETE RESTRICT,
    opportunity_id TEXT NOT NULL REFERENCES gary_opportunities(id) ON DELETE CASCADE,
    source_detail_url TEXT NOT NULL,
    official_website TEXT,
    rank INTEGER NOT NULL CHECK (rank > 0),
    deadline DATE,
    deadline_note TEXT,
    entry_fee TEXT,
    cash_prize TEXT,
    genres_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    description TEXT,
    contact_email TEXT,
    contact_details TEXT,
    full_text TEXT NOT NULL,
    host_status TEXT,
    host_match_score NUMERIC(4, 3),
    canonical_source TEXT NOT NULL DEFAULT 'p_and_w',
    canonical_deadline_text TEXT,
    canonical_entry_fee TEXT,
    canonical_cash_prize TEXT,
    missing_fields_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    observation_hash TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (run_id, source_detail_url)
);

ALTER TABLE gary_call_observations
    ADD COLUMN IF NOT EXISTS canonical_source TEXT NOT NULL DEFAULT 'p_and_w';
ALTER TABLE gary_call_observations
    ADD COLUMN IF NOT EXISTS canonical_deadline_text TEXT;
ALTER TABLE gary_call_observations
    ADD COLUMN IF NOT EXISTS canonical_entry_fee TEXT;
ALTER TABLE gary_call_observations
    ADD COLUMN IF NOT EXISTS canonical_cash_prize TEXT;

CREATE INDEX IF NOT EXISTS gary_call_observations_opportunity_idx
    ON gary_call_observations(opportunity_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS gary_source_pages (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES gary_crawl_runs(id) ON DELETE CASCADE,
    observation_id TEXT REFERENCES gary_call_observations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('index', 'pw_detail', 'official')),
    requested_url TEXT NOT NULL,
    final_url TEXT NOT NULL,
    status_code INTEGER,
    content_type TEXT,
    title TEXT NOT NULL,
    text_content TEXT NOT NULL,
    html_content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    error TEXT,
    rendered BOOLEAN NOT NULL DEFAULT FALSE,
    resource_urls_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    html_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (run_id, html_path)
);

CREATE INDEX IF NOT EXISTS gary_source_pages_observation_idx
    ON gary_source_pages(observation_id, role);

CREATE TABLE IF NOT EXISTS gary_media_blobs (
    id TEXT PRIMARY KEY,
    sha256 TEXT NOT NULL UNIQUE,
    content_type TEXT,
    byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
    payload BYTEA,
    local_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gary_media_assets (
    id TEXT PRIMARY KEY,
    source_page_id TEXT NOT NULL REFERENCES gary_source_pages(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    final_url TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('image', 'video', 'audio', 'document', 'stylesheet', 'font', 'other')),
    content_type TEXT,
    status_code INTEGER,
    byte_size INTEGER,
    blob_id TEXT REFERENCES gary_media_blobs(id) ON DELETE SET NULL,
    alt_text TEXT,
    relation TEXT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_page_id, original_url, relation)
);

CREATE INDEX IF NOT EXISTS gary_media_assets_blob_idx
    ON gary_media_assets(blob_id);

CREATE TABLE IF NOT EXISTS gary_field_observations (
    id TEXT PRIMARY KEY,
    observation_id TEXT NOT NULL REFERENCES gary_call_observations(id) ON DELETE CASCADE,
    source_page_id TEXT REFERENCES gary_source_pages(id) ON DELETE SET NULL,
    field_name TEXT NOT NULL,
    value TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('pw', 'host')),
    selected BOOLEAN NOT NULL DEFAULT FALSE,
    candidate_rank INTEGER
);

CREATE TABLE IF NOT EXISTS gary_field_conflicts (
    id TEXT PRIMARY KEY,
    observation_id TEXT NOT NULL REFERENCES gary_call_observations(id) ON DELETE CASCADE,
    source_page_id TEXT REFERENCES gary_source_pages(id) ON DELETE SET NULL,
    field_name TEXT NOT NULL,
    host_value TEXT,
    expected_value TEXT,
    detail TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gary_source_links (
    id TEXT PRIMARY KEY,
    source_page_id TEXT NOT NULL REFERENCES gary_source_pages(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    relation TEXT NOT NULL,
    followed BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (source_page_id, target_url, relation)
);

CREATE TABLE IF NOT EXISTS gary_review_decisions (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES gary_crawl_runs(id) ON DELETE CASCADE,
    observation_id TEXT NOT NULL REFERENCES gary_call_observations(id) ON DELETE CASCADE,
    opportunity_id TEXT NOT NULL REFERENCES gary_opportunities(id) ON DELETE CASCADE,
    reviewer TEXT NOT NULL,
    identity_decision TEXT NOT NULL CHECK (identity_decision IN ('same_call', 'not_same_call', 'unresolved')),
    page_action TEXT NOT NULL CHECK (page_action IN ('static_sufficient', 'render_then_review', 'retry_later', 'unresolved')),
    field_decisions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (run_id, observation_id, reviewer)
);

CREATE INDEX IF NOT EXISTS gary_review_decisions_run_idx
    ON gary_review_decisions(run_id, updated_at DESC);

-- Publication and press profiles are a separate identity lane from calls.
CREATE TABLE IF NOT EXISTS gary_profiles (
    id TEXT PRIMARY KEY,
    identity_key TEXT NOT NULL,
    canonical_key TEXT NOT NULL UNIQUE,
    profile_kind TEXT NOT NULL CHECK (profile_kind IN ('literary_magazine', 'small_press')),
    name_key TEXT NOT NULL,
    name TEXT NOT NULL,
    website_url TEXT,
    normalized_website_url TEXT,
    identity_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (identity_status IN ('confirmed', 'needs-review')),
    identity_confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.5 CHECK (identity_confidence BETWEEN 0 AND 1),
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gary_profiles_kind_name_idx
    ON gary_profiles(profile_kind, name_key);

CREATE INDEX IF NOT EXISTS gary_profiles_website_idx
    ON gary_profiles(normalized_website_url);

CREATE TABLE IF NOT EXISTS gary_profile_aliases (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES gary_profiles(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES gary_sources(id) ON DELETE RESTRICT,
    alias_kind TEXT NOT NULL CHECK (alias_kind IN ('detail', 'official', 'submission', 'alternate')),
    url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (profile_id, normalized_url)
);

CREATE INDEX IF NOT EXISTS gary_profile_aliases_profile_idx
    ON gary_profile_aliases(profile_id);

CREATE INDEX IF NOT EXISTS gary_profile_aliases_url_idx
    ON gary_profile_aliases(normalized_url);

CREATE TABLE IF NOT EXISTS gary_profile_observations (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES gary_crawl_runs(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES gary_sources(id) ON DELETE RESTRICT,
    profile_id TEXT NOT NULL REFERENCES gary_profiles(id) ON DELETE CASCADE,
    source_detail_url TEXT NOT NULL,
    profile_kind TEXT NOT NULL CHECK (profile_kind IN ('literary_magazine', 'small_press')),
    rank INTEGER NOT NULL CHECK (rank > 0),
    name TEXT NOT NULL,
    source_summary TEXT,
    website_url TEXT,
    submission_guidelines_url TEXT,
    genres_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    subgenres_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    representative_authors TEXT,
    formats_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    book_types_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    reading_period TEXT,
    response_time TEXT,
    reading_fee TEXT,
    unsolicited_submissions TEXT,
    simultaneous_submissions TEXT,
    payment TEXT,
    editorial_focus TEXT,
    editorial_tips TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_details TEXT,
    issues_per_year TEXT,
    issue_price TEXT,
    subscription_price TEXT,
    circulation TEXT,
    titles_per_year TEXT,
    publishes_through_contests_only TEXT,
    last_updated TEXT,
    full_text TEXT NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    observation_hash TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (run_id, source_detail_url)
);

CREATE INDEX IF NOT EXISTS gary_profile_observations_profile_idx
    ON gary_profile_observations(profile_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS gary_profile_observations_source_idx
    ON gary_profile_observations(source_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS gary_profile_pages (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES gary_crawl_runs(id) ON DELETE CASCADE,
    profile_observation_id TEXT REFERENCES gary_profile_observations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('index', 'profile', 'official', 'submission_guidelines')),
    requested_url TEXT NOT NULL,
    final_url TEXT NOT NULL,
    status_code INTEGER,
    content_type TEXT,
    title TEXT NOT NULL,
    text_content TEXT NOT NULL,
    html_content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    error TEXT,
    rendered BOOLEAN NOT NULL DEFAULT FALSE,
    resource_urls_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    html_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (run_id, html_path)
);

CREATE INDEX IF NOT EXISTS gary_profile_pages_observation_idx
    ON gary_profile_pages(profile_observation_id, role);

CREATE TABLE IF NOT EXISTS gary_profile_field_observations (
    id TEXT PRIMARY KEY,
    profile_observation_id TEXT NOT NULL REFERENCES gary_profile_observations(id) ON DELETE CASCADE,
    profile_page_id TEXT REFERENCES gary_profile_pages(id) ON DELETE SET NULL,
    field_name TEXT NOT NULL,
    value TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('pw', 'host')),
    selected BOOLEAN NOT NULL DEFAULT FALSE,
    candidate_rank INTEGER
);

CREATE INDEX IF NOT EXISTS gary_profile_field_observations_idx
    ON gary_profile_field_observations(profile_observation_id, field_name);

CREATE TABLE IF NOT EXISTS gary_profile_media_assets (
    id TEXT PRIMARY KEY,
    profile_page_id TEXT NOT NULL REFERENCES gary_profile_pages(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    final_url TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('image', 'document', 'other')),
    content_type TEXT,
    status_code INTEGER,
    byte_size INTEGER,
    blob_id TEXT REFERENCES gary_media_blobs(id) ON DELETE SET NULL,
    alt_text TEXT,
    relation TEXT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (profile_page_id, original_url, relation)
);

CREATE INDEX IF NOT EXISTS gary_profile_media_assets_blob_idx
    ON gary_profile_media_assets(blob_id);

CREATE TABLE IF NOT EXISTS gary_profile_links (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES gary_profiles(id) ON DELETE CASCADE,
    opportunity_id TEXT NOT NULL REFERENCES gary_opportunities(id) ON DELETE CASCADE,
    relation TEXT NOT NULL CHECK (relation IN ('organizer', 'host', 'submission')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
    evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (profile_id, opportunity_id, relation)
);

CREATE INDEX IF NOT EXISTS gary_profile_links_opportunity_idx
    ON gary_profile_links(opportunity_id, status);

-- Gary's agent harness. These tables are the durable control plane shared by
-- the crawler, AI reviewer, publication gate, email digest, and admin UI.
CREATE TABLE IF NOT EXISTS gary_harness_releases (
    id TEXT PRIMARY KEY,
    git_sha TEXT NOT NULL,
    artifact_version TEXT NOT NULL,
    adapter_version TEXT NOT NULL,
    parser_version TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'rolled_back')),
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS gary_harness_releases_active_idx
    ON gary_harness_releases(status)
    WHERE status = 'active';

CREATE TABLE IF NOT EXISTS gary_worker_heartbeats (
    worker_kind TEXT PRIMARY KEY CHECK (worker_kind IN ('crawler', 'reviewer')),
    instance_id TEXT NOT NULL,
    release_id TEXT REFERENCES gary_harness_releases(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('starting', 'idle', 'working', 'healthy', 'degraded', 'failed', 'stopped')),
    current_run_id TEXT REFERENCES gary_crawl_runs(id) ON DELETE SET NULL,
    current_job_id TEXT,
    progress_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_error TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gary_worker_heartbeats_freshness_idx
    ON gary_worker_heartbeats(heartbeat_at DESC);

CREATE TABLE IF NOT EXISTS gary_review_queue (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL REFERENCES gary_opportunities(id) ON DELETE CASCADE,
    observation_id TEXT NOT NULL REFERENCES gary_call_observations(id) ON DELETE CASCADE,
    run_id TEXT NOT NULL REFERENCES gary_crawl_runs(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES gary_sources(id) ON DELETE RESTRICT,
    observation_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
        'queued', 'processing', 'recommended', 'published', 'needs_human',
        'held', 'rejected', 'failed', 'superseded'
    )),
    priority INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 4 CHECK (max_attempts BETWEEN 1 AND 20),
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    lease_owner TEXT,
    lease_until TIMESTAMPTZ,
    requested_action TEXT CHECK (requested_action IN ('review', 'publish', 'retry', 'hold', 'reject')),
    requested_by TEXT,
    operator_note TEXT,
    recommendation TEXT CHECK (recommendation IN ('publish', 'needs_human', 'reject')),
    confidence NUMERIC(4, 3) CHECK (confidence BETWEEN 0 AND 1),
    decision_id TEXT,
    published_opportunity_id TEXT,
    reviewed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (opportunity_id, observation_hash)
);

CREATE INDEX IF NOT EXISTS gary_review_queue_claim_idx
    ON gary_review_queue(status, available_at, lease_until, priority DESC, created_at);

CREATE INDEX IF NOT EXISTS gary_review_queue_dashboard_idx
    ON gary_review_queue(updated_at DESC, status);

CREATE TABLE IF NOT EXISTS gary_ai_review_decisions (
    id TEXT PRIMARY KEY,
    queue_id TEXT NOT NULL REFERENCES gary_review_queue(id) ON DELETE CASCADE,
    opportunity_id TEXT NOT NULL REFERENCES gary_opportunities(id) ON DELETE CASCADE,
    observation_id TEXT NOT NULL REFERENCES gary_call_observations(id) ON DELETE CASCADE,
    release_id TEXT REFERENCES gary_harness_releases(id) ON DELETE SET NULL,
    model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    output_hash TEXT NOT NULL,
    recommendation TEXT NOT NULL CHECK (recommendation IN ('publish', 'needs_human', 'reject')),
    confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    checks_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_output_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    input_tokens INTEGER CHECK (input_tokens IS NULL OR input_tokens >= 0),
    output_tokens INTEGER CHECK (output_tokens IS NULL OR output_tokens >= 0),
    estimated_cost_usd NUMERIC(12, 8) CHECK (estimated_cost_usd IS NULL OR estimated_cost_usd >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (queue_id, input_hash, model, prompt_version)
);

CREATE INDEX IF NOT EXISTS gary_ai_review_decisions_queue_idx
    ON gary_ai_review_decisions(queue_id, created_at DESC);

ALTER TABLE gary_review_queue
    DROP CONSTRAINT IF EXISTS gary_review_queue_decision_id_fkey;
ALTER TABLE gary_review_queue
    ADD CONSTRAINT gary_review_queue_decision_id_fkey
    FOREIGN KEY (decision_id) REFERENCES gary_ai_review_decisions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS gary_daily_digests (
    id TEXT PRIMARY KEY,
    digest_date DATE NOT NULL,
    timezone TEXT NOT NULL,
    recipient_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
    summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    provider_message_id TEXT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (digest_date, timezone, recipient_hash)
);

CREATE INDEX IF NOT EXISTS gary_daily_digests_status_idx
    ON gary_daily_digests(status, digest_date DESC);

CREATE TABLE IF NOT EXISTS gary_harness_audit_events (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT UNIQUE,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('crawler', 'reviewer', 'operator', 'system')),
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gary_harness_audit_events
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS gary_harness_audit_events_idempotency_idx
    ON gary_harness_audit_events(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS gary_harness_audit_events_target_idx
    ON gary_harness_audit_events(target_type, target_id, created_at DESC);

-- Creative Preparation Backfill: Visuals, Prize Provenance, Intelligence & Socials
CREATE TABLE IF NOT EXISTS gary_profile_visuals (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES gary_profiles(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'banner', 'issue_cover')),
    image_url TEXT NOT NULL,
    label TEXT,
    issue_year INTEGER,
    season TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gary_profile_visuals_profile_idx
    ON gary_profile_visuals(profile_id, asset_type);

CREATE TABLE IF NOT EXISTS gary_prize_provenance (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES gary_profiles(id) ON DELETE CASCADE,
    opportunity_id TEXT,
    contest_name TEXT NOT NULL,
    award_year INTEGER NOT NULL,
    winner_name TEXT NOT NULL,
    winning_title TEXT,
    winning_work_url TEXT,
    judge_name TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gary_prize_provenance_profile_idx
    ON gary_prize_provenance(profile_id, award_year DESC);

CREATE TABLE IF NOT EXISTS gary_profile_intelligence (
    profile_id TEXT PRIMARY KEY REFERENCES gary_profiles(id) ON DELETE CASCADE,
    prestige_tier TEXT NOT NULL DEFAULT 'Tier 3 (Emerging)',
    founding_year INTEGER,
    honors JSONB NOT NULL DEFAULT '[]'::jsonb,
    editorial_archetype TEXT NOT NULL DEFAULT 'Unspecified',
    sentiment_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    response_days_min INTEGER,
    response_days_max INTEGER,
    response_label TEXT,
    query_policy TEXT,
    social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    popularity_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

