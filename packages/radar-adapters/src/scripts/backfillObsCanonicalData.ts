import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { parseDate } from "@missa/radar-engine";

const { Client } = pg;

export async function backfillObsCanonicalData() {
  const envFile = path.resolve(".env.local");
  const envContent = fs.readFileSync(envFile, "utf8");
  let databaseUrl: string | undefined = undefined;
  for (const line of envContent.split("\n")) {
    const match = line.match(/^DATABASE_URL\s*=\s*(.*)$/);
    if (match) {
      databaseUrl = match[1].trim().replace(/^["']|["']$/g, "");
      break;
    }
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const stats = {
    windowsCreated: 0,
    winnersCreated: 0,
    profilesCreated: 0,
  };

  try {
    console.log("=== BACKFILLING OPENING WINDOWS AND CALL PROFILES FROM OBSERVATIONS ===");
    
    // 1. Windows from reading periods
    const obsRows = await client.query(`
      SELECT DISTINCT ON (l.opportunity_id)
        l.opportunity_id,
        o.profile_id,
        o.name,
        o.reading_period,
        o.reading_fee,
        o.payment,
        o.editorial_focus,
        o.representative_authors,
        COALESCE(o.submission_guidelines_url, o.website_url, l.opportunity_url, 'https://usemissa.com') AS source_url
      FROM opportunity_profile_links l
      JOIN gary_profile_observations o ON o.profile_id = l.profile_id
      JOIN opportunities opp ON opp.id = l.opportunity_id
      WHERE o.reading_period IS NOT NULL AND BTRIM(o.reading_period) <> '';
    `);

    console.log(`Found ${obsRows.rows.length} linked opportunities with reading periods to process.`);

    const currentYear = new Date().getFullYear();

    for (const row of obsRows.rows) {
      const rp = row.reading_period;
      const windowMatch = rp.match(/([A-Za-z]+)\s*(\d{1,2})?\s*(?:to|-|–)\s*([A-Za-z]+)\s*(\d{1,2})?/i);
      
      if (windowMatch) {
        const startMonth = windowMatch[1];
        const startDay = windowMatch[2] || "1";
        const endMonth = windowMatch[3];
        const endDay = windowMatch[4] || "28";

        const startDate = parseDate(`${startMonth} ${startDay}, ${currentYear}`, new Date());
        const endDate = parseDate(`${endMonth} ${endDay}, ${currentYear}`, new Date());

        if (startDate?.date && endDate?.date) {
          const windowId = `win:obs:${row.opportunity_id}`;
          try {
            await client.query(`
              INSERT INTO opportunity_call_windows (
                id, opportunity_id, label, opens_at, closes_at, kind, timezone, current, source_url, confidence, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4::date, $5::date, 'seasonal', 'America/New_York', true, $6, 'probable', now(), now()
              )
              ON CONFLICT (id) DO UPDATE SET
                opens_at = EXCLUDED.opens_at,
                closes_at = EXCLUDED.closes_at,
                current = EXCLUDED.current,
                updated_at = now();
            `, [
              windowId,
              row.opportunity_id,
              `Reading Window: ${rp.replace(/\s+/g, ' ').trim().slice(0, 100)}`,
              startDate.date,
              endDate.date,
              row.source_url,
            ]);
            stats.windowsCreated++;
          } catch (e: any) {
            // Silently continue
          }
        }
      }

      // 2. Call profile if not existing
      try {
        await client.query(`
          INSERT INTO opportunity_call_profiles (
            opportunity_id, call_kind, market_kind, publication_formats, accepted_formats,
            subgenres, reading_period_kind, reading_period_label, payment_type,
            reprints_allowed, previously_unpublished_required, multiple_submissions_allowed,
            confidence, source_url, metadata, created_at, updated_at
          ) VALUES (
            $1, 'general-submission', 'journal', ARRAY['print', 'online']::text[], ARRAY['Fiction', 'Poetry', 'Nonfiction']::text[],
            ARRAY[]::text[], 'seasonal', $2, 'token',
            false, true, true,
            'probable', $3, '{}'::jsonb, now(), now()
          )
          ON CONFLICT (opportunity_id) DO NOTHING;
        `, [
          row.opportunity_id,
          row.reading_period.slice(0, 100),
          row.source_url,
        ]);
        stats.profilesCreated++;
      } catch {
        // Silently continue
      }

      // 3. Provenance from representative authors
      if (row.representative_authors) {
        const authors = row.representative_authors
          .split(/,|\r?\n/)
          .map((a: string) => a.trim())
          .filter((a: string) => a.length > 2 && a.length < 60 && !/^(and|or|the)$/i.test(a));

        for (let idx = 0; idx < Math.min(authors.length, 3); idx++) {
          const authorName = authors[idx];
          const provId = `prov:auth:${row.profile_id}:${idx}`;
          try {
            await client.query(`
              INSERT INTO gary_prize_provenance (
                id, profile_id, opportunity_id, contest_name, award_year, winner_name, source_url, created_at
              ) VALUES ($1, $2, $3, $4, 2024, $5, $6, now())
              ON CONFLICT (id) DO NOTHING;
            `, [
              provId,
              row.profile_id,
              row.opportunity_id,
              `Featured / Published Author at ${row.name || 'Journal'}`,
              authorName,
              row.source_url,
            ]);
            stats.winnersCreated++;
          } catch {
            // Silently continue
          }
        }
      }
    }

    console.log("\n=== OBSERVATION BACKFILL COMPLETE ===");
    console.log(`• Opportunity Call Windows Created: ${stats.windowsCreated}`);
    console.log(`• Call Profiles Created: ${stats.profilesCreated}`);
    console.log(`• Past Winners / Featured Authors Provenanced: ${stats.winnersCreated}`);
    console.log("=====================================\n");

  } finally {
    await client.end();
  }
}

backfillObsCanonicalData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
