import pg from "pg";
import { mirrorServedImages, vercelBlobImageStore } from "../mediaMirror.js";

/**
 * Copies every image Missa shows into Missa's storage (Vercel Blob), so cards
 * stop hotlinking organizers' sites. Safe to re-run: images already copied are
 * skipped, and failures are retried after seven days.
 *
 * Usage: BLOB_READ_WRITE_TOKEN=... npx tsx src/scripts/mirrorOpportunityImages.ts [--limit=N]
 */

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is required. Set it in the environment (or pass --env-file=.env.local).");
  process.exit(1);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is required: it is the web app's Vercel Blob token.");
  process.exit(1);
}

const limitArg = Number(process.argv.slice(2).find((arg) => arg.startsWith("--limit="))?.split("=")[1]);
const limit = Number.isFinite(limitArg) && limitArg > 0 ? Math.floor(limitArg) : undefined;

const pool = new pg.Pool({ connectionString: dbUrl, max: 2 });
pool.on("error", (error) => console.warn("Idle database connection closed:", error.message));

mirrorServedImages(pool, { store: vercelBlobImageStore(), limit })
  .then((result) => console.log("Stored copies:", result))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
