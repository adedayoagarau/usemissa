import pg from 'pg';
import { extractProfileEnrichment } from '../packages/radar-adapters/dist/src/profileEnrichmentWorker.js';

const { Client } = pg;

async function runWebEnrichment() {
  if (!process.env.DATABASE_URL) {
    console.log('\n[ENRICHMENT] Notice: DATABASE_URL is not set.');
    console.log('[ENRICHMENT] Run with: node -r dotenv/config scripts/backfill-web-enrichment.mjs dotenv_config_path=.env.local\n');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('=== STARTING HIGH-SPEED WEB ENRICHMENT BACKFILL ===\n');

    // Fetch all profiles with a valid website URL
    const res = await client.query(`
      SELECT id, name, website_url
      FROM gary_profiles
      WHERE website_url IS NOT NULL AND BTRIM(website_url) <> ''
      ORDER BY name ASC;
    `);

    console.log(`Found ${res.rows.length} publisher sites to enrich.\n`);

    const CONCURRENCY = 16;
    let completed = 0;
    let logosFound = 0;
    let socialsFound = 0;
    let coversFound = 0;
    let winnersFound = 0;

    async function processProfile(row) {
      const profileId = row.id;
      const websiteUrl = row.website_url;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(websiteUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (MissaDiscoveryBot/1.0; +https://usemissa.com/bot)',
            'Accept': 'text/html,application/xhtml+xml',
          },
          redirect: 'follow',
        });
        clearTimeout(timeout);

        if (!response.ok) return;

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('xhtml')) return;

        const html = await response.text();
        const enrichment = extractProfileEnrichment(html, websiteUrl, { contestName: `${row.name} Annual Award` });

        // 1. Save Logo if discovered
        if (enrichment.logoUrl) {
          logosFound++;
          const logoId = `logo:${profileId}`;
          await client.query(`
            INSERT INTO gary_profile_visuals (id, profile_id, asset_type, image_url, label)
            VALUES ($1, $2, 'logo', $3, $4)
            ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url;
          `, [logoId, profileId, enrichment.logoUrl, `${row.name} Logo`]);
        }

        // 2. Update Social Links
        const socialValues = Object.values(enrichment.socialLinks).filter(Boolean);
        if (socialValues.length > 0) {
          socialsFound += socialValues.length;
          await client.query(`
            UPDATE gary_profile_intelligence
            SET social_links = $2::jsonb, updated_at = now()
            WHERE profile_id = $1;
          `, [profileId, JSON.stringify(enrichment.socialLinks)]);
        }

        // 3. Save Issue Covers
        if (enrichment.gallery.length > 0) {
          coversFound += enrichment.gallery.length;
          for (let idx = 0; idx < enrichment.gallery.length; idx++) {
            const item = enrichment.gallery[idx];
            const coverId = `cover:${profileId}:${idx}`;
            await client.query(`
              INSERT INTO gary_profile_visuals (id, profile_id, asset_type, image_url, label, issue_year, season)
              VALUES ($1, $2, 'issue_cover', $3, $4, $5, $6)
              ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url;
            `, [coverId, profileId, item.imageUrl, item.label ?? null, item.issueYear ?? null, item.season ?? null]);
          }
        }

        // 4. Save Prize Winners
        if (enrichment.prizeWinners.length > 0) {
          winnersFound += enrichment.prizeWinners.length;
          for (let idx = 0; idx < enrichment.prizeWinners.length; idx++) {
            const w = enrichment.prizeWinners[idx];
            const winnerId = `winner:${profileId}:${w.awardYear}:${idx}`;
            await client.query(`
              INSERT INTO gary_prize_provenance (id, profile_id, contest_name, award_year, winner_name, winning_title, judge_name)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (id) DO NOTHING;
            `, [winnerId, profileId, w.contestName, w.awardYear, w.winnerName, w.winningTitle ?? null, w.judgeName ?? null]);
          }
        }
      } catch {
        // Individual site fetch errors fail silently
      } finally {
        completed++;
        if (completed % 100 === 0 || completed === res.rows.length) {
          console.log(`Enriched ${completed} / ${res.rows.length} publisher sites (Logos: ${logosFound}, Socials: ${socialsFound}, Covers: ${coversFound}, Winners: ${winnersFound})...`);
        }
      }
    }

    // Process using concurrent worker pool
    const queue = [...res.rows];
    async function worker() {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) await processProfile(item);
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);

    console.log('\n=== WEB ENRICHMENT BACKFILL COMPLETE ===');
    console.log(`Total Publisher Sites Audited: ${completed}`);
    console.log(`- High-Res Vector/OG Logos Extracted: ${logosFound}`);
    console.log(`- Social Media Handles Attached: ${socialsFound}`);
    console.log(`- Issue Covers Archived: ${coversFound}`);
    console.log(`- Past Contest Winners Provenanced: ${winnersFound}`);

  } catch (err) {
    console.error('Enrichment failed:', err.message);
  } finally {
    await client.end();
  }
}

runWebEnrichment();
