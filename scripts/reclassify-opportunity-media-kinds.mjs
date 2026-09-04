#!/usr/bin/env node
/**
 * Reclassify opportunity_identity_assets into the surface-specific kinds:
 * - opportunity-artwork: catalogue / content cards
 * - editorial-hero: organization page banners
 * - organization-mark: organization logos
 *
 * Does not change rights_status. Safe to re-run.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(repoRoot, ".env.local");

function readDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  const env = readFileSync(envPath, "utf8");
  const match = env.match(/^DATABASE_URL\s*=\s*(.*)$/m);
  if (!match?.[1]) {
    throw new Error("DATABASE_URL missing from env or .env.local");
  }
  return match[1].trim().replace(/^["']|["']$/g, "");
}

const pool = new pg.Pool({ connectionString: readDatabaseUrl(), max: 2 });

async function main() {
  console.log("=== Reclassify opportunity identity asset kinds ===");

  // Organization-cover promotions that landed as covers belong on org banners.
  const coversAsHero = await pool.query(`
    UPDATE opportunity_identity_assets
    SET kind = 'editorial-hero'
    WHERE kind IN ('opportunity-cover', 'hero')
      AND rights_status IN ('cleared', 'permitted')
      AND (
        metadata->>'candidateKind' = 'organization-cover'
        OR metadata->>'candidate_kind' = 'organization-cover'
      )
  `);
  console.log(
    `→ editorial-hero from organization-cover metadata: ${coversAsHero.rowCount}`,
  );

  // Remaining photographic covers/heroes → artwork for browse cards
  const artwork = await pool.query(`
    UPDATE opportunity_identity_assets
    SET kind = 'opportunity-artwork'
    WHERE kind IN ('hero', 'opportunity-cover')
      AND rights_status IN ('cleared', 'permitted')
  `);
  console.log(`→ opportunity-artwork from hero/cover: ${artwork.rowCount}`);

  // Wide marks are usually banners, not logos
  const banners = await pool.query(`
    UPDATE opportunity_identity_assets
    SET kind = 'editorial-hero'
    WHERE kind = 'organization-mark'
      AND rights_status IN ('cleared', 'permitted')
      AND width IS NOT NULL
      AND height IS NOT NULL
      AND height > 0
      AND (width::float / height::float) >= 1.6
  `);
  console.log(`→ editorial-hero from wide organization-mark: ${banners.rowCount}`);

  const summary = await pool.query(`
    SELECT kind, rights_status, count(*)::int AS n
    FROM opportunity_identity_assets
    GROUP BY 1, 2
    ORDER BY n DESC
  `);
  console.log("Current kind × rights distribution:");
  for (const row of summary.rows) {
    console.log(`  ${row.kind} / ${row.rights_status}: ${row.n}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
