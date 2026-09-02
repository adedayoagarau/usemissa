import pg from 'pg';

const { Client } = pg;

async function runAudit() {
  if (!process.env.DATABASE_URL) {
    console.log('\n[AUDIT] Notice: DATABASE_URL is not set in this environment.');
    console.log('[AUDIT] To run against Neon or local Postgres, provide: DATABASE_URL=postgres://... node scripts/audit-profile-data-coverage.mjs\n');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('=== MISSA PROFILE DATA COVERAGE AUDIT ===\n');

    // 1. Total profiles
    const profilesRes = await client.query(`
      SELECT 
        profile_kind,
        COUNT(*) as count,
        COUNT(website_url) as with_website,
        COUNT(normalized_website_url) as with_normalized_website
      FROM gary_profiles
      GROUP BY profile_kind
      ORDER BY profile_kind;
    `);
    console.log('1. Canonical Profiles (gary_profiles):');
    let totalProfiles = 0;
    for (const row of profilesRes.rows) {
      const cnt = Number(row.count);
      totalProfiles += cnt;
      console.log(`   - ${row.profile_kind}: ${cnt} total, ${row.with_website} with website (${Math.round((row.with_website / cnt) * 100)}%)`);
    }
    console.log(`   Total Profiles: ${totalProfiles}\n`);

    // 2. Observations Coverage
    const obsRes = await client.query(`
      WITH latest AS (
        SELECT DISTINCT ON (profile_id) *
        FROM gary_profile_observations
        ORDER BY profile_id, observed_at DESC
      )
      SELECT 
        COUNT(*) as total_observed,
        COUNT(NULLIF(TRIM(response_time), '')) as with_response_time,
        COUNT(NULLIF(TRIM(editorial_focus), '')) as with_editorial_focus,
        COUNT(NULLIF(TRIM(editorial_tips), '')) as with_editorial_tips,
        COUNT(NULLIF(TRIM(representative_authors), '')) as with_authors,
        COUNT(NULLIF(TRIM(payment), '')) as with_payment,
        COUNT(NULLIF(TRIM(reading_fee), '')) as with_reading_fee,
        COUNT(NULLIF(TRIM(reading_period), '')) as with_reading_period,
        COUNT(NULLIF(TRIM(simultaneous_submissions), '')) as with_simultaneous
      FROM latest;
    `);

    if (obsRes.rows.length > 0) {
      const o = obsRes.rows[0];
      const tot = Number(o.total_observed) || 1;
      console.log('2. Latest Observations (gary_profile_observations):');
      console.log(`   - Observed profiles: ${tot}`);
      console.log(`   - Response time: ${o.with_response_time} (${Math.round((o.with_response_time / tot) * 100)}%)`);
      console.log(`   - Editorial focus: ${o.with_editorial_focus} (${Math.round((o.with_editorial_focus / tot) * 100)}%)`);
      console.log(`   - Editorial tips: ${o.with_editorial_tips} (${Math.round((o.with_editorial_tips / tot) * 100)}%)`);
      console.log(`   - Representative authors: ${o.with_authors} (${Math.round((o.with_authors / tot) * 100)}%)`);
      console.log(`   - Payment info: ${o.with_payment} (${Math.round((o.with_payment / tot) * 100)}%)`);
      console.log(`   - Reading fees: ${o.with_reading_fee} (${Math.round((o.with_reading_fee / tot) * 100)}%)`);
      console.log(`   - Reading period: ${o.with_reading_period} (${Math.round((o.with_reading_period / tot) * 100)}%)`);
      console.log(`   - Simultaneous submissions: ${o.with_simultaneous} (${Math.round((o.with_simultaneous / tot) * 100)}%)\n`);
    }

    // 3. Media Assets
    const mediaRes = await client.query(`
      SELECT 
        COUNT(DISTINCT p.id) as profiles_with_media,
        COUNT(m.id) as total_media_items
      FROM gary_profiles p
      JOIN gary_profile_observations o ON o.profile_id = p.id
      JOIN gary_profile_pages pg ON pg.profile_observation_id = o.id
      JOIN gary_profile_media_assets m ON m.profile_page_id = pg.id
      WHERE m.kind = 'image' AND m.error IS NULL;
    `);
    if (mediaRes.rows.length > 0) {
      const m = mediaRes.rows[0];
      console.log('3. Existing Media Assets (gary_profile_media_assets):');
      console.log(`   - Profiles with at least 1 image: ${m.profiles_with_media}`);
      console.log(`   - Total image assets: ${m.total_media_items}\n`);
    }

    // 4. Check Enriched / Future Tables
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('gary_profile_visuals', 'gary_prize_provenance', 'gary_profile_intelligence');
    `);
    console.log('4. Enrichment Tables Status:');
    const existingTables = new Set(tablesCheck.rows.map(r => r.table_name));
    for (const tbl of ['gary_profile_visuals', 'gary_prize_provenance', 'gary_profile_intelligence']) {
      if (existingTables.has(tbl)) {
        const countRes = await client.query(`SELECT COUNT(*) as cnt FROM ${tbl}`);
        console.log(`   - ${tbl}: EXISTS (${countRes.rows[0].cnt} rows)`);
      } else {
        console.log(`   - ${tbl}: NOT YET CREATED`);
      }
    }
    console.log('\n=== AUDIT COMPLETE ===');
  } catch (err) {
    console.error('Audit query failed:', err.message);
  } finally {
    await client.end();
  }
}

runAudit();
