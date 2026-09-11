import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log("Starting non-blocking chunked purge of spurious 0-score pending links...");

  let totalPurged = 0;
  let batch = 1;

  while (true) {
    const res = await pool.query(`
      WITH to_delete AS (
        SELECT l.id
        FROM opportunity_profile_links l
        JOIN opportunities o ON o.id = l.opportunity_id
        WHERE l.status = 'pending'
          AND l.name_score = 0
          AND l.matched_host IN ('artconnect.com', 'resartis.org', 'curatorspace.com')
          AND (o.organization_id IS NULL OR o.organization_id <> l.profile_id)
        LIMIT 5000
      )
      DELETE FROM opportunity_profile_links
      WHERE id IN (SELECT id FROM to_delete);
    `);

    const count = res.rowCount || 0;
    totalPurged += count;

    if (count === 0) {
      console.log(`\n✔ Completed! Purged total ${totalPurged} spurious pending links.`);
      break;
    }

    process.stdout.write(`Batch ${batch++}: purged ${count} rows (Total: ${totalPurged})\r`);
    await new Promise((r) => setTimeout(r, 100));
  }

  const finalStats = await pool.query(
    "SELECT status, COUNT(*) FROM opportunity_profile_links GROUP BY status"
  );
  console.log("Final link counts:", finalStats.rows);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
