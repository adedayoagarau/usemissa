import pg from 'pg';
import { resolveMagazineSchedule } from '../packages/radar-engine/dist/src/index.js';

const { Client } = pg;

async function run() {
  const isDryRun = process.argv.includes('--dry-run');

  if (!process.env.DATABASE_URL) {
    console.log('\n[MAGAZINE SCHEDULE] Notice: DATABASE_URL is not set.');
    console.log('[MAGAZINE SCHEDULE] Usage: node scripts/backfill-magazine-schedules.mjs [--dry-run]');
    console.log('[MAGAZINE SCHEDULE] Or with env: DATABASE_URL=postgres://... node scripts/backfill-magazine-schedules.mjs\n');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('=== MISSA MAGAZINE SCHEDULE AUDIT & BACKFILL ===');
    console.log(`Mode: ${isDryRun ? 'DRY-RUN (Audit only)' : 'PERSIST (Updating database)'}\n`);

    // 1. Fetch magazine and press profiles with their latest observation
    const res = await client.query(`
      WITH latest_obs AS (
        SELECT DISTINCT ON (profile_id)
          profile_id,
          reading_period,
          reading_fee,
          payment,
          source_detail_url,
          website_url,
          submission_guidelines_url
        FROM gary_profile_observations
        ORDER BY profile_id, observed_at DESC
      )
      SELECT
        p.id,
        p.name,
        p.profile_kind,
        o.reading_period,
        o.source_detail_url,
        COALESCE(o.submission_guidelines_url, o.website_url, 'https://usemissa.com') as source_url
      FROM gary_profiles p
      JOIN latest_obs o ON o.profile_id = p.id
      WHERE p.profile_kind IN ('literary_magazine', 'small_press')
      ORDER BY p.name ASC;
    `);

    console.log(`Found ${res.rows.length} total magazine & press profiles to evaluate.\n`);

    const stats = {
      total: res.rows.length,
      withReadingPeriod: 0,
      alwaysOpen: 0,
      openNow: 0,
      closingSoon: 0,
      openingSoon: 0,
      closed: 0,
      unknown: 0,
      callWindowsCreated: 0,
      callProfilesUpdated: 0,
    };

    const samplesByState = {
      always_open: [],
      open: [],
      closing_soon: [],
      opening_soon: [],
      closed: [],
      unknown: [],
    };

    const now = new Date();

    // Prefetch all confirmed linked opportunities in one fast query
    const allLinksRes = await client.query(`
      SELECT
        l.profile_id,
        o.id,
        o.title,
        o.status,
        o.deadline_date as deadline
      FROM opportunity_profile_links l
      JOIN opportunities o ON o.id = l.opportunity_id
      WHERE l.status = 'confirmed'
    `);
    const oppsByProfileId = new Map();
    for (const opp of allLinksRes.rows) {
      const pid = String(opp.profile_id);
      if (!oppsByProfileId.has(pid)) oppsByProfileId.set(pid, []);
      oppsByProfileId.get(pid).push({
        id: String(opp.id),
        title: String(opp.title),
        status: String(opp.status),
        deadline: opp.deadline ? String(opp.deadline).slice(0, 10) : null,
      });
    }

    for (const row of res.rows) {
      const readingPeriod = row.reading_period ? row.reading_period.trim() : null;
      if (readingPeriod) stats.withReadingPeriod++;

      const opportunities = oppsByProfileId.get(String(row.id)) || [];

      const schedule = resolveMagazineSchedule({
        readingPeriod,
        opportunities,
        now,
      });

      switch (schedule.state) {
        case 'always_open':
          stats.alwaysOpen++;
          break;
        case 'open':
          stats.openNow++;
          break;
        case 'closing_soon':
          stats.closingSoon++;
          break;
        case 'opening_soon':
          stats.openingSoon++;
          break;
        case 'closed':
          stats.closed++;
          break;
        default:
          stats.unknown++;
          break;
      }

      if (samplesByState[schedule.state].length < 3) {
        samplesByState[schedule.state].push({
          name: row.name,
          readingPeriod: readingPeriod || '(none)',
          badge: schedule.badgeLabel,
          detail: schedule.detailLabel || '',
        });
      }

      // If persisting and we have linked opportunities
      if (!isDryRun && opportunities.length > 0) {
        for (const opp of opportunities) {
          try {
            // Update call profile reading period metadata
            await client.query(`
              INSERT INTO opportunity_call_profiles (
                opportunity_id,
                call_kind,
                market_kind,
                publication_formats,
                accepted_formats,
                subgenres,
                reading_period_kind,
                reading_period_label,
                payment_type,
                reprints_allowed,
                previously_unpublished_required,
                multiple_submissions_allowed,
                confidence,
                source_url,
                metadata,
                created_at,
                updated_at
              ) VALUES (
                $1,
                'general-submission',
                'journal',
                ARRAY['print', 'online']::text[],
                ARRAY['Fiction', 'Poetry', 'Nonfiction']::text[],
                ARRAY[]::text[],
                $2,
                $3,
                'token',
                false,
                true,
                true,
                'probable',
                $4,
                '{}'::jsonb,
                now(),
                now()
              )
              ON CONFLICT (opportunity_id) DO UPDATE SET
                reading_period_kind = EXCLUDED.reading_period_kind,
                reading_period_label = EXCLUDED.reading_period_label,
                updated_at = now();
            `, [
              opp.id,
              schedule.windowKind,
              schedule.badgeLabel,
              row.source_url,
            ]);
            stats.callProfilesUpdated++;
          } catch {
            // Silently continue
          }

          if (schedule.nextDate && (schedule.state === 'open' || schedule.state === 'closing_soon' || schedule.state === 'opening_soon')) {
            try {
              const windowId = `win:sched:${opp.id}`;
              await client.query(`
                INSERT INTO opportunity_call_windows (
                  id,
                  opportunity_id,
                  label,
                  opens_at,
                  closes_at,
                  kind,
                  timezone,
                  current,
                  source_url,
                  confidence,
                  created_at,
                  updated_at
                ) VALUES (
                  $1,
                  $2,
                  $3,
                  $4::date,
                  $5::date,
                  $6,
                  'America/New_York',
                  true,
                  $7,
                  'probable',
                  now(),
                  now()
                )
                ON CONFLICT (id) DO UPDATE SET
                  closes_at = EXCLUDED.closes_at,
                  label = EXCLUDED.label,
                  current = EXCLUDED.current,
                  updated_at = now();
              `, [
                windowId,
                opp.id,
                `Reading Window: ${schedule.badgeLabel}`,
                now.toISOString().slice(0, 10),
                schedule.nextDate,
                schedule.windowKind,
                row.source_url,
              ]);
              stats.callWindowsCreated++;
            } catch {
              // Silently continue
            }
          }
        }
      }
    }

    console.log('=== AUDIT BREAKDOWN ===');
    console.log(`Total Evaluated:              ${stats.total}`);
    console.log(`With Source Reading Period:   ${stats.withReadingPeriod}`);
    console.log(`Always Open:                  ${stats.alwaysOpen}`);
    console.log(`Open Now:                     ${stats.openNow}`);
    console.log(`Closing Soon:                 ${stats.closingSoon}`);
    console.log(`Opening Soon (within 6 mo):   ${stats.openingSoon}`);
    console.log(`Closed:                       ${stats.closed}`);
    console.log(`Check Schedule / Varies:      ${stats.unknown}\n`);

    if (!isDryRun) {
      console.log('=== PERSISTENCE STATS ===');
      console.log(`Call Profiles Updated:        ${stats.callProfilesUpdated}`);
      console.log(`Opening Windows Created/Sync: ${stats.callWindowsCreated}\n`);
    }

    console.log('=== REPRESENTATIVE SAMPLES ===');
    for (const [state, samples] of Object.entries(samplesByState)) {
      if (samples.length > 0) {
        console.log(`\n[${state.toUpperCase()}]`);
        for (const s of samples) {
          console.log(` • ${s.name}`);
          console.log(`   Raw: "${s.readingPeriod}"`);
          console.log(`   Badge: [${s.badge}] ${s.detail ? `(${s.detail})` : ''}`);
        }
      }
    }

    console.log('\n[DONE] Magazine schedule backfill complete.');
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
