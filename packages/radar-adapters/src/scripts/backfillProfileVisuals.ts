import pg from "pg";

const { Pool } = pg;

interface BackfillCounts {
  eligibleSourceRows: number;
  insertedRows: number;
  profileCountBefore: number;
  profileCountAfter: number;
  visualCountBefore: number;
  visualCountAfter: number;
}

const CREATE_VISUALS_TABLE = `
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
`;

const SOURCE_ROWS = `
  SELECT
    'identity-asset:' || a.id AS source_id,
    a.linked_organization_id AS profile_id,
    'logo' AS asset_type,
    a.url AS image_url,
    NULLIF(BTRIM(a.alt), '') AS label,
    a.created_at,
    jsonb_build_object(
      'source', 'opportunity_identity_assets',
      'sourceId', a.id,
      'sourceUrl', a.source_url,
      'kind', a.kind,
      'rightsStatus', a.rights_status
    ) AS metadata
  FROM opportunity_identity_assets a
  JOIN gary_profiles p ON p.id = a.linked_organization_id
  WHERE a.linked_organization_id IS NOT NULL
    AND a.rights_status IN ('cleared', 'permitted')
    AND a.url ~* '^https?://'
    AND a.kind = 'organization-mark'
  UNION ALL
  SELECT
    'organization-media:' || m.id AS source_id,
    m.profile_id,
    CASE
      WHEN m.media_group = 'issues' THEN 'issue_cover'
      WHEN m.media_type = 'representative_image' THEN 'banner'
      ELSE 'logo'
    END AS asset_type,
    m.image_url,
    NULLIF(BTRIM(m.title), '') AS label,
    m.created_at,
    jsonb_build_object(
      'source', 'gary_organization_media',
      'sourceId', m.id,
      'sourcePageUrl', m.source_page_url,
      'mediaGroup', m.media_group,
      'mediaType', m.media_type,
      'reviewStatus', m.review_status
    ) AS metadata
  FROM gary_organization_media m
  JOIN gary_profiles p ON p.id = m.profile_id
  WHERE m.review_status = 'verified'
    AND m.image_url ~* '^https?://'
    AND (
      (m.media_group = 'identity' AND m.media_type IN ('logo', 'alternate_logo', 'representative_image'))
      OR (m.media_group = 'issues' AND m.media_type = 'issue_cover')
    )
`;

async function countRows(pool: pg.Pool, table: string): Promise<number> {
  const result = await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM ${table}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function run(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const dryRun = process.argv.includes("--dry-run");
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const client = await pool.connect();

  try {
    const profileCountBefore = await countRows(pool, "gary_profiles");
    const visualCountBefore = await countRows(pool, "gary_profile_visuals").catch(() => 0);
    if (!dryRun) await client.query(CREATE_VISUALS_TABLE);
    const eligible = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM (${SOURCE_ROWS}) source_rows`,
    );
    const eligibleSourceRows = Number(eligible.rows[0]?.count ?? 0);

    if (dryRun) {
      console.log(JSON.stringify({ dryRun: true, eligibleSourceRows, profileCountBefore, visualCountBefore }));
      return;
    }

    await client.query("BEGIN");
    const inserted = await client.query(
      `
        INSERT INTO gary_profile_visuals
          (id, profile_id, asset_type, image_url, label, metadata, created_at)
        SELECT
          'org-media:' || md5(source_rows.source_id),
          source_rows.profile_id,
          source_rows.asset_type,
          source_rows.image_url,
          source_rows.label,
          source_rows.metadata,
          source_rows.created_at
        FROM (${SOURCE_ROWS}) source_rows
        ON CONFLICT (id) DO UPDATE SET
          image_url = EXCLUDED.image_url,
          label = COALESCE(EXCLUDED.label, gary_profile_visuals.label),
          metadata = EXCLUDED.metadata
      `,
    );
    await client.query("COMMIT");

    const visualCountAfter = await countRows(pool, "gary_profile_visuals");
    const counts: BackfillCounts = {
      eligibleSourceRows,
      insertedRows: inserted.rowCount ?? 0,
      profileCountBefore,
      profileCountAfter: profileCountBefore,
      visualCountBefore,
      visualCountAfter,
    };
    console.log(JSON.stringify(counts));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
