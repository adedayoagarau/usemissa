#!/usr/bin/env node

import { Pool } from "pg";
import {
  discoverOrganizationMedia,
  type MediaDiscoveryResult,
  type MediaGroup,
} from "../organizationMediaDiscovery.js";
import type { ProfileKind } from "../profileRepository.js";

interface CliOptions {
  dryRun: boolean;
  limit?: number;
  concurrency: number;
  kind?: ProfileKind;
  id?: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let dryRun = false;
  let limit: number | undefined = undefined;
  let concurrency = 3;
  let kind: ProfileKind | undefined = undefined;
  let id: string | undefined = undefined;

  for (const arg of args) {
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg.startsWith("--limit=")) {
      limit = Math.max(1, parseInt(arg.split("=")[1], 10) || 10);
    } else if (arg.startsWith("--concurrency=")) {
      concurrency = Math.max(1, Math.min(10, parseInt(arg.split("=")[1], 10) || 3));
    } else if (arg.startsWith("--kind=")) {
      kind = arg.split("=")[1] as ProfileKind;
    } else if (arg.startsWith("--id=")) {
      id = arg.split("=")[1];
    }
  }

  return { dryRun, limit, concurrency, kind, id };
}

async function main() {
  const options = parseArgs();
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("Error: DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl, max: options.concurrency + 2 });

  console.log("==================================================================");
  console.log(" Organization Media Discovery & Backfill Engine");
  console.log(` Mode: ${options.dryRun ? "DRY RUN (preview only)" : "LIVE WRITE (persisting to DB)"}`);
  if (options.kind) console.log(` Target Organization Kind: ${options.kind}`);
  if (options.id) console.log(` Target Profile ID: ${options.id}`);
  if (options.limit) console.log(` Limit: ${options.limit}`);
  console.log("==================================================================\n");

  const queryValues: unknown[] = [];
  let sql = `
    SELECT p.id, p.name, p.profile_kind, p.website_url
    FROM gary_profiles p
    WHERE p.website_url IS NOT NULL
  `;

  if (options.id) {
    queryValues.push(options.id);
    sql += ` AND p.id = $${queryValues.length}`;
  }

  if (options.kind) {
    queryValues.push(options.kind);
    sql += ` AND p.profile_kind = $${queryValues.length}`;
  }

  sql += ` ORDER BY p.name ASC`;

  if (options.limit) {
    queryValues.push(options.limit);
    sql += ` LIMIT $${queryValues.length}`;
  }

  const res = await pool.query<{
    id: string;
    name: string;
    profile_kind: ProfileKind;
    website_url: string;
  }>(sql, queryValues);

  console.log(`Found ${res.rows.length} organization profiles to process.\n`);

  const summary = {
    totalProcessed: 0,
    discovered: 0,
    empty: 0,
    error: 0,
    mediaByGroup: {
      identity: 0,
      issues: 0,
      books: 0,
      photos: 0,
      exhibitions: 0,
      projects: 0,
    } as Record<MediaGroup, number>,
  };

  for (let i = 0; i < res.rows.length; i += options.concurrency) {
    const chunk = res.rows.slice(i, i + options.concurrency);
    const results = await Promise.all(
      chunk.map(async (prof) => {
        try {
          const result = await discoverOrganizationMedia(pool, prof.id, {
            dryRun: options.dryRun,
            maxPages: 4,
          });
          return { prof, result };
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          return {
            prof,
            result: {
              profileId: prof.id,
              status: "error" as const,
              totalDiscovered: 0,
              groupCounts: { identity: 0, issues: 0, books: 0, photos: 0, exhibitions: 0, projects: 0 },
              sourcePagesChecked: [],
              lastError: errMsg,
            },
          };
        }
      })
    );

    for (const { prof, result } of results) {
      summary.totalProcessed += 1;
      if (result.status === "discovered") summary.discovered += 1;
      else if (result.status === "empty") summary.empty += 1;
      else summary.error += 1;

      for (const group of Object.keys(summary.mediaByGroup) as MediaGroup[]) {
        summary.mediaByGroup[group] += result.groupCounts[group] || 0;
      }

      console.log(
        `[${prof.profile_kind}] ${prof.name} -> status=${result.status}, total=${result.totalDiscovered} ` +
        `(id:${result.groupCounts.identity}, iss:${result.groupCounts.issues}, bks:${result.groupCounts.books}, ` +
        `pho:${result.groupCounts.photos}, exh:${result.groupCounts.exhibitions}, prj:${result.groupCounts.projects})`
      );

      if (options.dryRun && result.proposedItems && result.proposedItems.length > 0) {
        console.log(`   Sample item: [${result.proposedItems[0].mediaGroup}/${result.proposedItems[0].mediaType}] "${result.proposedItems[0].title}" (${result.proposedItems[0].imageUrl})`);
      }
      if (result.lastError) {
        console.log(`   Error: ${result.lastError}`);
      }
    }
  }

  console.log("\n==================================================================");
  console.log(" Execution Summary");
  console.log(` Organizations Processed: ${summary.totalProcessed}`);
  console.log(` Discovered: ${summary.discovered}`);
  console.log(` Empty: ${summary.empty}`);
  console.log(` Error: ${summary.error}`);
  console.log(" Media Items Found By Group:");
  console.log(`   - Identity:    ${summary.mediaByGroup.identity}`);
  console.log(`   - Issues:      ${summary.mediaByGroup.issues}`);
  console.log(`   - Books:       ${summary.mediaByGroup.books}`);
  console.log(`   - Photos:      ${summary.mediaByGroup.photos}`);
  console.log(`   - Exhibitions: ${summary.mediaByGroup.exhibitions}`);
  console.log(`   - Projects:    ${summary.mediaByGroup.projects}`);
  console.log("==================================================================\n");

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
