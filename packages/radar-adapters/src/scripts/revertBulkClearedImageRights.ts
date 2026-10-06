import pg from "pg";
import {
  reportUnreviewedClearedAssets,
  restoreRevertedAssets,
  revertUnreviewedClearedAssets,
} from "../mediaRightsCleanup.js";

/**
 * One-off: puts identity assets that were cleared in bulk, without review,
 * back to `unknown`. Plan and approval: docs/media-rights-review.md.
 *
 *   npm run media:revert-bulk-cleared                 report only (default)
 *   npm run media:revert-bulk-cleared -- --apply --approved-by="Name"
 *   npm run media:revert-bulk-cleared -- --restore    undo from the backup table
 *
 * Do not run --apply against production until the owner has approved the plan.
 */

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is required. Set it in the environment (or pass --env-file=.env.local).");
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const restore = args.includes("--restore");
const approvedBy = args.find((arg) => arg.startsWith("--approved-by="))?.slice("--approved-by=".length) ?? "";

const pool = new pg.Pool({ connectionString: dbUrl, max: 2 });

async function run() {
  const client = await pool.connect();
  try {
    if (restore) {
      console.log("Restored:", await restoreRevertedAssets(client));
      return;
    }
    console.log("Unreviewed cleared assets:", await reportUnreviewedClearedAssets(client));
    if (!apply) {
      console.log("Report only. Nothing was changed. Pass --apply --approved-by=\"Name\" after the owner approves.");
      return;
    }
    if (!approvedBy.trim()) {
      console.error("--apply needs --approved-by=\"Name\" naming the owner who approved the plan.");
      process.exitCode = 1;
      return;
    }
    console.log("Reverted:", await revertUnreviewedClearedAssets(client, { approvedBy }));
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
