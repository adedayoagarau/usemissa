import pg from "pg";
import { mirrorServedImages, vercelBlobImageStore } from "../mediaMirror.js";
import {
  recheckUnreviewedClearedAssets,
  reportUnreviewedClearedAssets,
  restoreRevertedAssets,
} from "../mediaRightsCleanup.js";

/**
 * One-off: re-checks identity assets that were cleared in bulk, without
 * review. The organizer's own og:image is kept, credited to the organizer;
 * everything else is set back to `unknown` for review.
 * Plan and approval: docs/media-rights-review.md.
 *
 *   npm run media:recheck-bulk-cleared                 counts only (default)
 *   npm run media:recheck-bulk-cleared -- --dry-run    also fetches pages and previews the result
 *   npm run media:recheck-bulk-cleared -- --apply --approved-by="Name"
 *   npm run media:recheck-bulk-cleared -- --restore    put the old rights back from the backup table
 */

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is required. Set it in the environment (or pass --env-file=.env.local).");
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const dryRun = args.includes("--dry-run");
const restore = args.includes("--restore");
const approvedBy = args.find((arg) => arg.startsWith("--approved-by="))?.slice("--approved-by=".length) ?? "";

const pool = new pg.Pool({ connectionString: dbUrl, max: 2 });
// Fetching every organizer page takes a while; an idle connection the server
// closes meanwhile must not crash the run. Each step takes a fresh one.
pool.on("error", (error) => console.warn("Idle database connection closed:", error.message));

async function run() {
  try {
    if (restore) {
      const client = await pool.connect();
      try {
        console.log("Restored:", await restoreRevertedAssets(client));
      } finally {
        client.release();
      }
      return;
    }
    console.log("Unreviewed cleared assets:", await reportUnreviewedClearedAssets(pool));
    if (dryRun) {
      console.log("Preview (nothing written):", await recheckUnreviewedClearedAssets(pool, { approvedBy, dryRun: true }));
      return;
    }
    if (!apply) {
      console.log("Counts only. Pass --dry-run to preview, or --apply --approved-by=\"Name\" to run.");
      return;
    }
    if (!approvedBy.trim()) {
      console.error("--apply needs --approved-by=\"Name\" naming the owner who approved the plan.");
      process.exitCode = 1;
      return;
    }
    console.log("Re-checked:", await recheckUnreviewedClearedAssets(pool, { approvedBy, connect: () => pool.connect() }));
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      console.log("Stored copies:", await mirrorServedImages(pool, { store: vercelBlobImageStore() }));
    } else {
      console.log("BLOB_READ_WRITE_TOKEN is not set: run media:mirror-images to stop hotlinking.");
    }
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
