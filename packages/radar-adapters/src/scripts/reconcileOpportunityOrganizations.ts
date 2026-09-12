import pg from "pg";

const { Pool } = pg;

interface OrganizationMatch {
  opportunity_id: string;
  profile_id: string;
  organization_id: string;
  profile_name: string;
  profile_url: string | null;
  opportunity_url: string | null;
  matched_host: string;
  basis: "confirmed-link" | "unique-official-host";
  confidence: number;
  publication_state: string;
}

function buildMatchQuery(hasProfileOrganizationLinks: boolean): string {
  const profileOrganizations = hasProfileOrganizationLinks
    ? `profile_organizations AS (
    SELECT p.id AS profile_id,
           coalesce(confirmed.organization_id, p.id) AS organization_id
    FROM gary_profiles p
    LEFT JOIN LATERAL (
      SELECT l.organization_id
      FROM gary_profile_organization_links l
      WHERE l.profile_id = p.id AND l.status = 'confirmed'
      ORDER BY l.confidence DESC NULLS LAST, l.updated_at DESC NULLS LAST
      LIMIT 1
    ) confirmed ON true
  ),`
    : `profile_organizations AS (
    SELECT p.id AS profile_id, p.id AS organization_id
    FROM gary_profiles p
  ),`;

  return `
  WITH confirmed AS (
    SELECT
      l.opportunity_id,
      min(l.profile_id) AS profile_id,
      max(l.confidence)::numeric AS confidence
    FROM opportunity_profile_links l
    WHERE l.status = 'confirmed'
    GROUP BY l.opportunity_id
    HAVING count(DISTINCT l.profile_id) = 1
  ),
  ${profileOrganizations}
  opportunities_with_host AS (
    SELECT
      o.id,
      o.organization_id,
      o.publication_state,
      coalesce(o.guidelines_url, o.submission_url, s.url) AS opportunity_url,
      regexp_replace(
        regexp_replace(
          lower(coalesce(o.guidelines_url, o.submission_url, s.url)),
          '^https?://(www\\.)?',
          ''
        ),
        '/.*$',
        ''
      ) AS matched_host
    FROM opportunities o
    LEFT JOIN opportunity_sources s ON s.id = o.source_id
  ),
  profile_hosts AS (
    SELECT
      p.id AS profile_id,
      p.name AS profile_name,
      p.website_url AS profile_url,
      regexp_replace(
        regexp_replace(
          lower(coalesce(p.website_url, p.normalized_website_url)),
          '^https?://(www\\.)?',
          ''
        ),
        '/.*$',
        ''
      ) AS matched_host
    FROM gary_profiles p
    WHERE coalesce(p.website_url, p.normalized_website_url) IS NOT NULL
  ),
  unique_hosts AS (
    SELECT matched_host, min(profile_id) AS profile_id
    FROM profile_hosts
    WHERE matched_host IS NOT NULL AND matched_host <> ''
    GROUP BY matched_host
    HAVING count(DISTINCT profile_id) = 1
  )
  SELECT
    oh.id AS opportunity_id,
    oh.publication_state,
    p.id AS profile_id,
    po.organization_id,
    p.name AS profile_name,
    p.website_url AS profile_url,
    oh.opportunity_url,
    coalesce(ph.matched_host, oh.matched_host) AS matched_host,
    CASE WHEN c.profile_id IS NOT NULL THEN 'confirmed-link' ELSE 'unique-official-host' END AS basis,
    CASE WHEN c.profile_id IS NOT NULL THEN greatest(coalesce(c.confidence, 0.82), 0.82) ELSE 0.9 END AS confidence
  FROM opportunities_with_host oh
  LEFT JOIN confirmed c ON c.opportunity_id = oh.id
  LEFT JOIN gary_profiles confirmed_profile ON confirmed_profile.id = c.profile_id
  LEFT JOIN unique_hosts uh ON uh.matched_host = oh.matched_host
  LEFT JOIN profile_hosts ph ON ph.profile_id = coalesce(c.profile_id, uh.profile_id)
  JOIN gary_profiles p ON p.id = coalesce(c.profile_id, uh.profile_id)
  JOIN profile_organizations po ON po.profile_id = p.id
  JOIN radar_organizations org ON org.id = po.organization_id
  WHERE (oh.organization_id IS NULL OR oh.organization_id <> po.organization_id)
    AND (c.profile_id IS NOT NULL OR uh.profile_id IS NOT NULL)
  ORDER BY oh.id
`;
}

async function run(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const dryRun = process.argv.includes("--dry-run");
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const client = await pool.connect();

  try {
    const before = await client.query<{ total: string; missing: string; publishedMissing: string }>(
      `SELECT count(*)::text AS total,
              count(*) FILTER (WHERE organization_id IS NULL)::text AS missing,
              count(*) FILTER (WHERE organization_id IS NULL AND publication_state = 'published')::text AS "publishedMissing"
       FROM opportunities`,
    );
    const profileOrganizationLinks = await client.query<{ exists: boolean }>(
      "SELECT to_regclass('public.gary_profile_organization_links') IS NOT NULL AS exists",
    );
    const matchQuery = buildMatchQuery(Boolean(profileOrganizationLinks.rows[0]?.exists));
    const matchesResult = await client.query<OrganizationMatch>(matchQuery);
    const matches = matchesResult.rows;
    const unique = new Map<string, OrganizationMatch>();
    for (const match of matches) unique.set(match.opportunity_id, match);

    const summary = {
      dryRun,
      before: before.rows[0],
      deterministicMatches: unique.size,
      byBasis: {
        confirmedLink: [...unique.values()].filter((m) => m.basis === "confirmed-link").length,
        uniqueOfficialHost: [...unique.values()].filter((m) => m.basis === "unique-official-host").length,
      },
    };
    if (dryRun) {
      console.log(JSON.stringify(summary));
      return;
    }

    await client.query("BEGIN");
    const matchesSql = `(${matchQuery}) matches`;
    await client.query(
      `INSERT INTO radar_organizations (id, data, created_at, updated_at)
       SELECT organization_id, jsonb_build_object('id', organization_id, 'name', profile_name, 'websiteUrl', profile_url), now(), now()
       FROM ${matchesSql}
       GROUP BY organization_id, profile_name, profile_url
       ON CONFLICT (id) DO UPDATE SET
         data = radar_organizations.data || EXCLUDED.data,
         updated_at = now()`,
    );
    await client.query(
      `UPDATE opportunities o
       SET organization_id = matches.organization_id, updated_at = now()
       FROM ${matchesSql}
       WHERE o.id = matches.opportunity_id
         AND o.publication_state <> 'published'
         AND (o.organization_id IS NULL OR o.organization_id <> matches.organization_id)`,
    );
    // Publication authority is a deferred constraint trigger. Make it
    // statement-immediate so a blocked published row can be isolated to its
    // savepoint instead of aborting the whole reconciliation transaction.
    await client.query("SET CONSTRAINTS missa_opportunity_authority_publication_gate_trigger IMMEDIATE");
    let publishedApplied = 0;
    let publishedSkipped = 0;
    for (const match of unique.values()) {
      if (match.publication_state !== "published") continue;
      await client.query("SAVEPOINT reconcile_published_match");
      try {
        const result = await client.query(
          `UPDATE opportunities
           SET organization_id = $2, updated_at = now()
           WHERE id = $1
             AND (organization_id IS NULL OR organization_id <> $2)`,
          [match.opportunity_id, match.organization_id],
        );
        publishedApplied += result.rowCount ?? 0;
        await client.query("RELEASE SAVEPOINT reconcile_published_match");
      } catch {
        publishedSkipped += 1;
        await client.query("ROLLBACK TO SAVEPOINT reconcile_published_match");
        await client.query("RELEASE SAVEPOINT reconcile_published_match");
      }
    }
    await client.query(
      `INSERT INTO opportunity_profile_links
         (id, opportunity_id, profile_id, relation, status, confidence, matched_host,
          opportunity_url, profile_url, name_score, matched_name_tokens, evidence_json,
          profile_checked_at, opportunity_checked_at, verified_at, verified_until)
       SELECT md5(matches.opportunity_id || ':' || matches.profile_id || ':host'),
              matches.opportunity_id, matches.profile_id, 'host', 'confirmed', matches.confidence,
              matches.matched_host, matches.opportunity_url, matches.profile_url, 1, '{}',
              jsonb_build_object('matcherVersion', 'unique-official-host-backfill-v1', 'rule', 'unique-official-host'),
              null, null, now(), now() + interval '7 days'
       FROM ${matchesSql}
       WHERE matches.basis = 'unique-official-host'
       ON CONFLICT (profile_id, opportunity_id, relation) DO UPDATE SET
         status = 'confirmed', confidence = EXCLUDED.confidence,
         matched_host = EXCLUDED.matched_host, opportunity_url = EXCLUDED.opportunity_url,
         profile_url = EXCLUDED.profile_url, evidence_json = EXCLUDED.evidence_json,
         verified_at = now(), verified_until = now() + interval '7 days', updated_at = now()`,
    );
    await client.query("COMMIT");

    const after = await client.query<{ total: string; missing: string; publishedMissing: string }>(
      `SELECT count(*)::text AS total,
              count(*) FILTER (WHERE organization_id IS NULL)::text AS missing,
              count(*) FILTER (WHERE organization_id IS NULL AND publication_state = 'published')::text AS "publishedMissing"
       FROM opportunities`,
    );
    console.log(JSON.stringify({ ...summary, publishedApplied, publishedSkipped, after: after.rows[0] }));
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
