#!/usr/bin/env node

import pg from "pg";
import {
  extractMediaCandidates,
  fetchWithPolicy,
  inferSourceRole,
  reviewMediaCandidate,
  ensureEnrichmentSchema,
} from "../packages/radar-adapters/dist/src/index.js";

const { Pool } = pg;

function parseArgs(args) {
  const options = {
    limit: 50,
    opportunityId: null,
    apply: false,
    autoClearVerified: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--limit" && args[i + 1]) {
      options.limit = Math.max(1, Number(args[++i]) || 50);
    } else if (arg === "--opportunity" && args[i + 1]) {
      options.opportunityId = args[++i];
    } else if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--auto-clear-verified") {
      options.autoClearVerified = true;
    } else if (arg === "--verbose") {
      options.verbose = true;
    }
  }
  return options;
}

async function runBackfill() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("\n[ERROR] DATABASE_URL is not set.");
    console.error("Run with: node -r dotenv/config scripts/backfill-opportunity-media.mjs dotenv_config_path=.env.local\n");
    process.exitCode = 1;
    return;
  }

  const options = parseArgs(process.argv.slice(2));

  console.log("=================================================");
  console.log("  MISSA OPPORTUNITY MEDIA ENRICHMENT BACKFILL   ");
  console.log("=================================================");
  console.log(`Mode:                 ${options.apply ? "LIVE APPLY (writes to database)" : "DRY-RUN (read-only verification)"}`);
  console.log(`Auto-Clear Verified:  ${options.autoClearVerified ? "YES (Fair-use editorial policy)" : "NO (All held as 'unknown')"}`);
  console.log(`Limit:                ${options.limit}`);
  if (options.opportunityId) console.log(`Target Opportunity:   ${options.opportunityId}`);
  console.log("=================================================\n");

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false },
    max: 4,
  });

  try {
    if (options.apply) {
      await ensureEnrichmentSchema(pool);
    }

    const query = options.opportunityId
      ? {
          text: `
            select o.id, o.title, coalesce(o.guidelines_url, o.submission_url, s.url) as "sourceUrl",
                   o.organization_id as "organizationId", s.kind as "sourceKind",
                   s.authority_kind as "sourceAuthorityKind",
                   (coalesce(evidence.organization_confirmed, false) or exists (
                     select 1 from opportunity_profile_links link
                     where link.opportunity_id = o.id and link.status = 'confirmed' and link.verified_until > now()
                   )) as "organizationConfirmed"
            from opportunities o
            left join opportunity_sources s on s.id = o.source_id
            left join opportunity_source_evidence evidence on evidence.opportunity_id = o.id
            where o.id = $1`,
          values: [options.opportunityId],
        }
      : {
          text: `
            select o.id, o.title, coalesce(o.guidelines_url, o.submission_url, s.url) as "sourceUrl",
                   o.organization_id as "organizationId", s.kind as "sourceKind",
                   s.authority_kind as "sourceAuthorityKind",
                   (coalesce(evidence.organization_confirmed, false) or exists (
                     select 1 from opportunity_profile_links link
                     where link.opportunity_id = o.id and link.status = 'confirmed' and link.verified_until > now()
                   )) as "organizationConfirmed"
            from opportunities o
            left join opportunity_sources s on s.id = o.source_id
            left join opportunity_source_evidence evidence on evidence.opportunity_id = o.id
            where o.publication_state in ('published', 'reviewable')
              and coalesce(o.guidelines_url, o.submission_url, s.url) is not null
              and not exists (
                select 1 from opportunity_identity_assets a
                where a.opportunity_id = o.id and a.rights_status in ('cleared', 'permitted')
              )
            order by
              (case when o.organization_id is not null or coalesce(evidence.organization_confirmed, false) then 0 else 1 end),
              (case when o.deadline_date is not null and o.deadline_date <= current_date + 30 then 0 else 1 end),
              o.created_at desc
            limit $1`,
          values: [options.limit],
        };

    const { rows } = await pool.query(query.text, query.values);
    console.log(`Found ${rows.length} opportunities needing identity media.\n`);

    const stats = {
      checked: 0,
      found: 0,
      rejected: 0,
      reviewable: 0,
      autoCleared: 0,
      failed: 0,
      blocked: 0,
    };

    for (const opp of rows) {
      stats.checked++;
      console.log(`[${stats.checked}/${rows.length}] Checking: ${opp.title} (${opp.id})`);
      console.log(`    URL: ${opp.sourceUrl}`);

      const sourceRole = inferSourceRole(opp.sourceUrl, {
        sourceAuthorityKind: opp.sourceAuthorityKind,
        sourceKind: opp.sourceKind,
        organizationId: opp.organizationId,
      });

      try {
        const fetchResult = await fetchWithPolicy(opp.sourceUrl, {
          expectedType: "html",
          checkRobots: true,
          timeoutMs: 8000,
        });

        const html = typeof fetchResult.body === "string" ? fetchResult.body : fetchResult.body.toString("utf-8");
        const extraction = extractMediaCandidates(
          html,
          {
            opportunityId: opp.id,
            title: opp.title,
            pageUrl: fetchResult.finalUrl,
            sourceRole,
            organizationId: opp.organizationId,
            organizationConfirmed: opp.organizationConfirmed,
          },
          fetchResult.redirectChain,
          fetchResult.httpStatus,
        );

        stats.found += extraction.totalDiscovered;
        const reviewableCandidates = extraction.candidates.filter((c) => c.status === "reviewable");
        const rejectedCandidates = extraction.candidates.filter((c) => c.status === "rejected");

        stats.reviewable += reviewableCandidates.length;
        stats.rejected += rejectedCandidates.length;

        console.log(`    Discovered: ${extraction.totalDiscovered} | Reviewable: ${reviewableCandidates.length} | Rejected: ${rejectedCandidates.length}`);

        if (options.apply) {
          const client = await pool.connect();
          try {
            await client.query("BEGIN");

            for (const c of extraction.candidates) {
              const candidateId = `cand_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
              const insertRes = await client.query(`
                INSERT INTO opportunity_media_candidates
                  (id, opportunity_id, original_url, resolved_url, page_url, source_role,
                   candidate_kind, alt, caption, title, width, height, mime_type, file_size,
                   retrieved_at, http_status, redirect_chain, content_hash, attribution_text,
                   inheritance_level, linked_organization_id, extraction_method, parser_version,
                   confidence, rejection_reasons, status, rights_status, metadata)
                VALUES
                  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now(), $15,
                   $16::jsonb, $17, $18, $19, $20, $21, $22, $23, $24, $25, 'unknown', $26::jsonb)
                ON CONFLICT (opportunity_id, resolved_url) DO UPDATE SET
                  updated_at = now(),
                  http_status = EXCLUDED.http_status,
                  rejection_reasons = EXCLUDED.rejection_reasons
                RETURNING id;
              `, [
                candidateId,
                opp.id,
                c.originalUrl,
                c.resolvedUrl,
                c.pageUrl,
                c.sourceRole,
                c.candidateKind,
                c.alt ?? null,
                c.caption ?? null,
                c.title ?? null,
                c.width ?? null,
                c.height ?? null,
                c.mimeType ?? null,
                c.fileSize ?? null,
                c.httpStatus ?? 200,
                JSON.stringify(c.redirectChain ?? []),
                c.contentHash ?? null,
                c.attributionText ?? null,
                c.inheritanceLevel,
                opp.organizationId ?? null,
                c.extractionMethod,
                c.parserVersion,
                c.confidence,
                c.rejectionReasons,
                c.status,
                JSON.stringify(c.metadata ?? {}),
              ]);

              const actualCandidateId = insertRes.rows[0]?.id ?? candidateId;

              // Auto-clearance under operator Fair Use policy:
              // 1. Authentic opportunity artwork directly from the call page (inheritance_level='opportunity')
              // 2. Or organization brand mark fallback if organization is confirmed
              const eligibleForFairUseAutoClear =
                options.autoClearVerified &&
                c.status === "reviewable" &&
                ((c.inheritanceLevel === "opportunity" && c.candidateKind === "opportunity-artwork") ||
                 (opp.organizationConfirmed && (c.candidateKind === "opportunity-artwork" || c.candidateKind === "organization-logo")));

              if (eligibleForFairUseAutoClear) {
                await reviewMediaCandidate(client, {
                  candidateId: actualCandidateId,
                  opportunityId: opp.id,
                  decision: "cleared",
                  reviewer: opp.organizationConfirmed ? "system:verified-org-fair-use" : "system:call-artwork-fair-use",
                  evidencePassage: "Fair use editorial directory reference for authentic call artwork",
                  reviewedAlt: c.alt ?? `${opp.title} cover artwork`,
                  permittedScope: "missa-catalogue-and-briefs",
                });
                stats.autoCleared++;
                console.log(`    -> [AUTO-CLEARED] Promoted asset: ${c.resolvedUrl}`);
                break; // One primary identity asset per opportunity
              }
            }

            await client.query("COMMIT");
          } catch (txError) {
            await client.query("ROLLBACK");
            throw txError;
          } finally {
            client.release();
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === "robots-blocked") {
          stats.blocked++;
          console.log(`    [BLOCKED] robots.txt disallows scraping: ${opp.sourceUrl}`);
        } else {
          stats.failed++;
          console.log(`    [FAILED] ${msg}`);
        }
      }
      console.log("");
    }

    console.log("=================================================");
    console.log("BACKFILL SUMMARY");
    console.log("=================================================");
    console.log(`  Checked targets:       ${stats.checked}`);
    console.log(`  Discovered candidates: ${stats.found}`);
    console.log(`  Reviewable:            ${stats.reviewable}`);
    console.log(`  Rejected by gates:     ${stats.rejected}`);
    console.log(`  Auto-cleared (live):   ${stats.autoCleared}`);
    console.log(`  Robots blocked:        ${stats.blocked}`);
    console.log(`  Failed targets:        ${stats.failed}`);
    console.log("=================================================\n");
  } finally {
    await pool.end();
  }
}

runBackfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exitCode = 1;
});
