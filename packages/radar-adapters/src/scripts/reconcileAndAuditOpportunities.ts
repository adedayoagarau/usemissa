import { Pool } from "pg";
import { reconcileExpiredOpportunitiesInDatabase } from "../databaseReconciliation.js";

export interface LinkAuditResult {
  totalAudited: number;
  healthy: number;
  broken: number;
  redirects: number;
  blockedByWaf: number;
}

export async function checkLinkHealth(urlStr: string): Promise<"healthy" | "broken" | "blocked"> {
  try {
    const parsed = new URL(urlStr);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "broken";
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    try {
      const resp = await fetch(urlStr, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 MissaRadar/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      clearTimeout(timer);

      if (resp.status >= 200 && resp.status < 400) {
        return "healthy";
      }
      if (resp.status === 404 || resp.status === 410) {
        return "broken";
      }
      if (resp.status === 403 || resp.status === 401 || resp.status === 429) {
        // Cloudflare / WAF blocking automated HEAD check
        return "blocked";
      }
      return "healthy";
    } catch (headErr) {
      clearTimeout(timer);
      // Try GET with short range if HEAD is method not allowed
      try {
        const getController = new AbortController();
        const getTimer = setTimeout(() => getController.abort(), 4000);
        const getResp = await fetch(urlStr, {
          method: "GET",
          signal: getController.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 MissaRadar/1.0",
            Range: "bytes=0-1024",
          },
        });
        clearTimeout(getTimer);
        if (getResp.status >= 200 && getResp.status < 400) {
          return "healthy";
        }
        if (getResp.status === 404 || getResp.status === 410) {
          return "broken";
        }
        return "blocked";
      } catch {
        return "broken";
      }
    }
  } catch {
    return "broken";
  }
}

export async function runReconciliationAndAudit(
  pool: Pool,
  options: { auditLinksLimit?: number; concurrency?: number } = {}
) {
  const auditLimit = options.auditLinksLimit ?? 100;
  const concurrency = options.concurrency ?? 5;

  console.log("\n=== 1. Reconciling Expired Opportunities in Database ===");
  const reconciliation = await reconcileExpiredOpportunitiesInDatabase(pool, new Date());
  console.log(`✔ Closed expired canonical opportunities: ${reconciliation.canonicalClosed}`);
  console.log(`✔ Closed expired compatibility radar opportunities: ${reconciliation.radarClosed}`);

  console.log(`\n=== 2. Auditing Link Health for Active Opportunities (Sample up to ${auditLimit}) ===`);
  const client = await pool.connect();
  const auditStats: LinkAuditResult = {
    totalAudited: 0,
    healthy: 0,
    broken: 0,
    redirects: 0,
    blockedByWaf: 0,
  };

  try {
    const oppsRes = await client.query(`
      SELECT id, title, submission_url, guidelines_url, submission_state
      FROM opportunities
      WHERE status = 'open'
        AND (submission_url IS NOT NULL OR guidelines_url IS NOT NULL)
      ORDER BY coalesce(submission_verified_at, '1970-01-01'::timestamptz) ASC
      LIMIT $1
    `, [auditLimit]);

    const rows = oppsRes.rows;
    auditStats.totalAudited = rows.length;
    console.log(`Auditing ${rows.length} opportunities with concurrency ${concurrency}...`);

    for (let i = 0; i < rows.length; i += concurrency) {
      const batch = rows.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (row) => {
          const targetUrl = row.submission_url || row.guidelines_url;
          if (!targetUrl) return;

          const health = await checkLinkHealth(targetUrl);
          if (health === "healthy") {
            auditStats.healthy++;
            await pool.query(
              `UPDATE opportunities
               SET submission_state = 'available', submission_verified_at = now()
               WHERE id = $1`,
              [row.id]
            );
          } else if (health === "broken") {
            auditStats.broken++;
            console.log(`  ⚠ Broken link flagged [${row.id}]: ${targetUrl}`);
            await pool.query(
              `UPDATE opportunities
               SET submission_state = 'missing', submission_verified_at = now()
               WHERE id = $1`,
              [row.id]
            );
          } else {
            auditStats.blockedByWaf++;
            // Don't mark as broken if protected by Cloudflare/WAF, just record verification timestamp
            await pool.query(
              `UPDATE opportunities
               SET submission_verified_at = now()
               WHERE id = $1`,
              [row.id]
            );
          }
        })
      );
    }
  } finally {
    client.release();
  }

  console.log(`\n=== Link Health Audit Summary ===`);
  console.log(`Total Opportunities Audited: ${auditStats.totalAudited}`);
  console.log(`Healthy / Verified: ${auditStats.healthy}`);
  console.log(`Cloudflare / WAF Protected: ${auditStats.blockedByWaf}`);
  console.log(`Broken Links Flagged: ${auditStats.broken}`);

  return {
    reconciliation,
    auditStats,
  };
}

if (process.argv[1] && /reconcileAndAuditOpportunities\.(ts|js)$/.test(process.argv[1])) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  runReconciliationAndAudit(pool, { auditLinksLimit: 120, concurrency: 6 })
    .then(() => pool.end())
    .catch((err) => {
      console.error("[reconcileAndAudit] Error:", err);
      pool.end();
      process.exit(1);
    });
}
