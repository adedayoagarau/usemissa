import pg from 'pg';

const { Client } = pg;

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function extractDomain(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

const GENERIC_NAMES = new Set([
  'apply',
  'art-organization',
  'creative-organization',
  'forms',
  'subscribers',
  'organization',
  'artist',
  'writer',
  'contact',
  'about',
  'home',
  'www',
]);

async function run() {
  const isDryRun = process.argv.includes('--dry-run');

  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL not found.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  console.log('\n================================================================================');
  console.log('                 MISSA ORGANIZATION DEDUPLICATION & CLEANSER                   ');
  console.log('================================================================================');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (Audit only)' : 'LIVE EXECUTION (Merging & Purging)'}\n`);

  try {
    // 1. Ensure gary_profile_redirects table exists
    if (!isDryRun) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS gary_profile_redirects (
          source_id_or_slug TEXT PRIMARY KEY,
          target_profile_id TEXT NOT NULL REFERENCES gary_profiles(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
    }

    // 2. Fetch all profiles with their child entity stats
    console.log('1. Analyzing all organization profiles and child linkages...');
    const profilesRes = await client.query(`
      WITH opp_counts AS (
        SELECT profile_id, count(*) as count
        FROM opportunity_profile_links
        GROUP BY profile_id
      ), obs_counts AS (
        SELECT profile_id, count(*) as count,
          bool_or(reading_period IS NOT NULL) as has_reading_period,
          bool_or(website_url IS NOT NULL) as has_website,
          bool_or(source_summary IS NOT NULL) as has_summary,
          (array_agg(website_url) FILTER (WHERE website_url IS NOT NULL))[1] as obs_website
        FROM gary_profile_observations
        GROUP BY profile_id
      ), visual_counts AS (
        SELECT profile_id, count(*) as count
        FROM gary_profile_visuals
        GROUP BY profile_id
      )
      SELECT
        p.id,
        p.name,
        p.profile_kind,
        COALESCE(p.website_url, obs.obs_website) as website_url,
        COALESCE(oc.count, 0) as opp_count,
        COALESCE(obs.count, 0) as obs_count,
        COALESCE(obs.has_reading_period, false) as has_reading_period,
        COALESCE(obs.has_website, false) as has_website,
        COALESCE(obs.has_summary, false) as has_summary,
        COALESCE(vc.count, 0) as visual_count,
        (ro.id IS NOT NULL) as is_radar_org
      FROM gary_profiles p
      LEFT JOIN opp_counts oc ON oc.profile_id = p.id
      LEFT JOIN obs_counts obs ON obs.profile_id = p.id
      LEFT JOIN visual_counts vc ON vc.profile_id = p.id
      LEFT JOIN radar_organizations ro ON ro.id = p.id
      WHERE p.name IS NOT NULL AND trim(p.name) != '';
    `);

    console.log(`   Fetched ${profilesRes.rows.length} total profiles.\n`);

    // 3. Group profiles into clusters:
    // - For distinctive names: group by normalizeName(row.name)
    // - For generic names (e.g. "Creative Organization", "Apply"): group by normalizeName + domain
    const clusters = new Map();
    for (const row of profilesRes.rows) {
      const nameKey = normalizeName(row.name);
      if (!nameKey || nameKey.length < 2) continue;

      let clusterKey = nameKey;
      if (GENERIC_NAMES.has(nameKey)) {
        const domain = extractDomain(row.website_url);
        // If no domain for generic name and 0 opps, don't cluster — it will be purged in spam cleanup
        if (!domain) {
          clusterKey = `generic_orphan:${row.id}`;
        } else {
          clusterKey = `${nameKey}:${domain}`;
        }
      }

      if (!clusters.has(clusterKey)) clusters.set(clusterKey, []);
      clusters.get(clusterKey).push(row);
    }

    // Score function to pick the canonical profile
    function scoreProfile(p) {
      let score = 0;
      if (p.is_radar_org) score += 1000;
      score += Number(p.opp_count) * 20;
      score += Number(p.obs_count) * 5;
      score += Number(p.visual_count) * 5;
      if (p.has_reading_period) score += 15;
      if (p.has_website || p.website_url) score += 10;
      if (p.has_summary) score += 10;
      if (!p.id.startsWith('org_artconn_') && !p.id.startsWith('org_ta_') && !p.id.startsWith('org_resartis_')) {
        score += 5;
      }
      return score;
    }

    const duplicateClusters = [];
    for (const [key, rows] of clusters.entries()) {
      if (rows.length > 1 && !key.startsWith('generic_orphan:')) {
        rows.sort((a, b) => scoreProfile(b) - scoreProfile(a));
        duplicateClusters.push({
          key,
          canonical: rows[0],
          duplicates: rows.slice(1),
        });
      }
    }

    console.log(`2. Identified ${duplicateClusters.length} distinct duplicate clusters (${duplicateClusters.reduce((acc, c) => acc + c.duplicates.length, 0)} excess profiles).`);

    // Print representative clusters
    console.log('\n=== REPRESENTATIVE DUPLICATE CLUSTERS ===');
    for (const cluster of duplicateClusters.slice(0, 10)) {
      console.log(` • Cluster "${cluster.key}":`);
      console.log(`   ✔ Canonical: [${cluster.canonical.id}] "${cluster.canonical.name}" (${cluster.canonical.profile_kind}, opps: ${cluster.canonical.opp_count}, score: ${scoreProfile(cluster.canonical)})`);
      for (const dupe of cluster.duplicates) {
        console.log(`   ✖ Merging:   [${dupe.id}] "${dupe.name}" (${dupe.profile_kind}, opps: ${dupe.opp_count}, score: ${scoreProfile(dupe)})`);
      }
    }

    let mergedClustersCount = 0;
    let purgedProfilesCount = 0;
    let relinkedOpportunitiesCount = 0;

    if (!isDryRun) {
      console.log('\n3. Merging duplicate clusters into canonical profiles in batches...');

      // Process in batches of 50 clusters
      const BATCH_SIZE = 50;
      for (let i = 0; i < duplicateClusters.length; i += BATCH_SIZE) {
        const batch = duplicateClusters.slice(i, i + BATCH_SIZE);
        await client.query('BEGIN');
        try {
          for (const cluster of batch) {
            const canonicalId = cluster.canonical.id;

            for (const dupe of cluster.duplicates) {
              const dupeId = dupe.id;

              // a. Re-link opportunity_profile_links
              const oppRes = await client.query(`
                UPDATE opportunity_profile_links
                SET profile_id = $1
                WHERE profile_id = $2
                  AND NOT EXISTS (
                    SELECT 1 FROM opportunity_profile_links existing
                    WHERE existing.profile_id = $1
                      AND existing.opportunity_id = opportunity_profile_links.opportunity_id
                      AND existing.relation = opportunity_profile_links.relation
                  )
                RETURNING id;
              `, [canonicalId, dupeId]);
              relinkedOpportunitiesCount += oppRes.rowCount;
              await client.query('DELETE FROM opportunity_profile_links WHERE profile_id = $1', [dupeId]);

              // a2. Re-link gary_profile_links
              await client.query(`
                UPDATE gary_profile_links
                SET profile_id = $1
                WHERE profile_id = $2
                  AND NOT EXISTS (
                    SELECT 1 FROM gary_profile_links existing
                    WHERE existing.profile_id = $1
                      AND existing.opportunity_id = gary_profile_links.opportunity_id
                      AND existing.relation = gary_profile_links.relation
                  )
              `, [canonicalId, dupeId]);
              await client.query('DELETE FROM gary_profile_links WHERE profile_id = $1', [dupeId]);

              // b. Re-link observations
              await client.query('UPDATE gary_profile_observations SET profile_id = $1 WHERE profile_id = $2', [canonicalId, dupeId]);

              // c. Re-link visuals
              await client.query('UPDATE gary_profile_visuals SET profile_id = $1 WHERE profile_id = $2', [canonicalId, dupeId]);

              // d. Re-link issues
              await client.query('UPDATE gary_profile_issues SET profile_id = $1 WHERE profile_id = $2', [canonicalId, dupeId]);

              // e. Re-link organization media
              await client.query('UPDATE gary_organization_media SET profile_id = $1 WHERE profile_id = $2', [canonicalId, dupeId]);

              // f. Re-link handles
              await client.query('UPDATE handles SET reserved_from_profile_id = $1 WHERE reserved_from_profile_id = $2', [canonicalId, dupeId]);

              // g. Save redirect alias
              await client.query(`
                INSERT INTO gary_profile_redirects (source_id_or_slug, target_profile_id, created_at)
                VALUES ($1, $2, now())
                ON CONFLICT (source_id_or_slug) DO UPDATE SET target_profile_id = EXCLUDED.target_profile_id;
              `, [dupeId, canonicalId]);

              // h. Delete redundant profile
              await client.query('DELETE FROM gary_profiles WHERE id = $1', [dupeId]);
              purgedProfilesCount++;
            }
            mergedClustersCount++;
          }
          await client.query('COMMIT');
          process.stdout.write(`   Processed ${Math.min(i + BATCH_SIZE, duplicateClusters.length)}/${duplicateClusters.length} clusters...\r`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`\nError processing batch at ${i}:`, err.message);
          throw err;
        }
      }
      console.log(`\n   ✔ Successfully merged ${mergedClustersCount} clusters (${purgedProfilesCount} redundant profile rows purged).`);
    }

    // 4. Clean up junk non-arts commercial scrapings with 0 opportunities
    console.log('\n4. Auditing junk non-arts commercial crawl artifacts...');
    const junkQuery = await client.query(`
      SELECT p.id, p.name, p.profile_kind
      FROM gary_profiles p
      LEFT JOIN opportunity_profile_links l ON l.profile_id = p.id
      WHERE (
        lower(p.name) ~ 'plumbing|mechanical|hvac|roofing|air conditioning|auto repair|bail bonds|locksmith|pest control|towing service'
        OR lower(trim(p.name)) IN ('subscribers', 'www', 'contact us', 'privacy policy', 'terms of service', 'about us')
      )
      GROUP BY p.id, p.name, p.profile_kind
      HAVING count(l.opportunity_id) = 0;
    `);

    console.log(`   Found ${junkQuery.rows.length} confirmed non-arts commercial junk profiles with 0 opportunities.`);

    if (!isDryRun && junkQuery.rows.length > 0) {
      const junkIds = junkQuery.rows.map(r => r.id);
      await client.query('DELETE FROM gary_profiles WHERE id = ANY($1::text[])', [junkIds]);
      console.log(`   ✔ Purged ${junkIds.length} non-arts commercial scrapings from database.`);
    }

    // 5. Final Statistics
    const finalCount = await client.query('SELECT count(*) as count FROM gary_profiles;');
    console.log('\n================================================================================');
    console.log('                          CLEANUP & DEDUPLICATION SUMMARY                       ');
    console.log('================================================================================');
    console.log(`  • Initial Total Profiles:           ${profilesRes.rows.length}`);
    console.log(`  • Duplicate Clusters Merged:        ${isDryRun ? duplicateClusters.length : mergedClustersCount}`);
    console.log(`  • Redundant Rows Purged:            ${isDryRun ? duplicateClusters.reduce((acc, c) => acc + c.duplicates.length, 0) : purgedProfilesCount}`);
    console.log(`  • Opportunities Re-linked:          ${isDryRun ? 'Audit mode' : relinkedOpportunitiesCount}`);
    console.log(`  • Spam/Junk Crawl Artifacts Purged: ${junkQuery.rows.length}`);
    console.log(`  • Clean Unique Profiles:            ${finalCount.rows[0].count}`);
    console.log('================================================================================\n');

  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
