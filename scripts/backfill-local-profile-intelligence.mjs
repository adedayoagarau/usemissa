import pg from 'pg';
import { extractProfileIntelligence } from '../packages/radar-adapters/dist/src/profileIntelligenceExtractor.js';

const { Client } = pg;

async function runLocalBackfill() {
  if (!process.env.DATABASE_URL) {
    console.log('\n[BACKFILL] Notice: DATABASE_URL is not set in this environment.');
    console.log('[BACKFILL] To run against Neon or local Postgres, provide: DATABASE_URL=postgres://... node scripts/backfill-local-profile-intelligence.mjs\n');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('=== STARTING ZERO-NETWORK PROFILE INTELLIGENCE BACKFILL ===\n');

    // Fetch latest observation for each profile
    const query = `
      WITH latest AS (
        SELECT DISTINCT ON (profile_id) *
        FROM gary_profile_observations
        ORDER BY profile_id, observed_at DESC
      )
      SELECT 
        profile_id,
        response_time,
        editorial_focus,
        editorial_tips,
        representative_authors,
        circulation,
        full_text
      FROM latest;
    `;

    console.log('Fetching existing observations from database...');
    const res = await client.query(query);
    console.log(`Found ${res.rows.length} profiles to process.\n`);

    const BATCH_SIZE = 100;
    let processed = 0;
    let tier1Count = 0;
    let tier2Count = 0;
    let tier3Count = 0;

    for (let i = 0; i < res.rows.length; i += BATCH_SIZE) {
      const batch = res.rows.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = [];

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const intel = extractProfileIntelligence({
          responseTime: row.response_time,
          editorialFocus: row.editorial_focus,
          editorialTips: row.editorial_tips,
          representativeAuthors: row.representative_authors,
          circulation: row.circulation,
          fullText: row.full_text,
        });

        if (intel.prestige.prestigeTier.includes("Tier 1")) tier1Count++;
        else if (intel.prestige.prestigeTier.includes("Tier 2")) tier2Count++;
        else tier3Count++;

        const offset = j * 10;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`);
        
        values.push(
          row.profile_id,
          intel.prestige.prestigeTier,
          intel.prestige.foundingYear,
          JSON.stringify(intel.prestige.honors),
          intel.demeanor.archetype,
          JSON.stringify(intel.demeanor.sentimentTags),
          intel.responseTime.minDays,
          intel.responseTime.maxDays,
          intel.responseTime.label,
          intel.responseTime.queryAllowedAfterDays ? `Queries allowed after ${intel.responseTime.queryAllowedAfterDays} days` : null
        );
      }

      if (placeholders.length > 0) {
        const insertSql = `
          INSERT INTO gary_profile_intelligence (
            profile_id,
            prestige_tier,
            founding_year,
            honors,
            editorial_archetype,
            sentiment_tags,
            response_days_min,
            response_days_max,
            response_label,
            query_policy
          ) VALUES ${placeholders.join(', ')}
          ON CONFLICT (profile_id) DO UPDATE SET
            prestige_tier = EXCLUDED.prestige_tier,
            founding_year = EXCLUDED.founding_year,
            honors = EXCLUDED.honors,
            editorial_archetype = EXCLUDED.editorial_archetype,
            sentiment_tags = EXCLUDED.sentiment_tags,
            response_days_min = EXCLUDED.response_days_min,
            response_days_max = EXCLUDED.response_days_max,
            response_label = EXCLUDED.response_label,
            query_policy = EXCLUDED.query_policy,
            updated_at = now();
        `;
        await client.query(insertSql, values);
      }

      processed += batch.length;
      if (processed % 500 === 0 || processed === res.rows.length) {
        console.log(`Processed ${processed} / ${res.rows.length} profiles...`);
      }
    }

    console.log('\n=== LOCAL BACKFILL FINISHED ===');
    console.log(`Total Profiles Updated: ${processed}`);
    console.log(`- Tier 1 (Flagship): ${tier1Count}`);
    console.log(`- Tier 2 (Established Contemporary): ${tier2Count}`);
    console.log(`- Tier 3 (Emerging & Community): ${tier3Count}`);
  } catch (err) {
    console.error('Backfill execution failed:', err.message);
  } finally {
    await client.end();
  }
}

runLocalBackfill();
