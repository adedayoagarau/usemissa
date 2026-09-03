#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
import { extractMediaCandidates } from "./mediaExtractor.js";
import { fetchWithPolicy } from "./mediaFetcher.js";
import { inferSourceRole } from "./enrichmentWorker.js";
import type { MediaEnrichmentTelemetry, SourceRole } from "./mediaExtractionContracts.js";

interface CliArgs {
  fixture?: string;
  opportunityId?: string;
  sourceRole?: SourceRole;
  limit: number;
  verbose: boolean;
  minWidth?: number;
  minHeight?: number;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    limit: 10,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--fixture" && args[i + 1]) {
      result.fixture = args[++i];
    } else if (arg === "--opportunity" && args[i + 1]) {
      result.opportunityId = args[++i];
    } else if (arg === "--source-role" && args[i + 1]) {
      result.sourceRole = args[++i] as SourceRole;
    } else if (arg === "--limit" && args[i + 1]) {
      result.limit = Math.max(1, Number(args[++i]) || 10);
    } else if (arg === "--verbose") {
      result.verbose = true;
    } else if (arg === "--min-width" && args[i + 1]) {
      result.minWidth = Number(args[++i]);
    } else if (arg === "--min-height" && args[i + 1]) {
      result.minHeight = Number(args[++i]);
    }
  }

  return result;
}

export async function runDryRun(cliArgs: CliArgs): Promise<{
  telemetry: MediaEnrichmentTelemetry;
  rejectionBreakdown: Record<string, number>;
  details: Array<{
    opportunityId: string;
    sourceUrl: string;
    candidatesFound: number;
    reviewableCount: number;
    rejectedCount: number;
  }>;
}> {
  const telemetry: MediaEnrichmentTelemetry = {
    checked: 0,
    found: 0,
    rejected: 0,
    reviewable: 0,
    cleared: 0,
    blocked: 0,
    failed: 0,
  };
  const rejectionBreakdown: Record<string, number> = {};
  const details: Array<{
    opportunityId: string;
    sourceUrl: string;
    candidatesFound: number;
    reviewableCount: number;
    rejectedCount: number;
  }> = [];

  // Scenario A: Fixture file provided (offline / disposable)
  if (cliArgs.fixture) {
    let filePath = resolve(cliArgs.fixture);
    if (!existsSync(filePath)) {
      const candidates = [
        resolve(process.cwd(), cliArgs.fixture),
        resolve(process.cwd(), "packages/radar-adapters", cliArgs.fixture),
        resolve(process.cwd(), "../..", cliArgs.fixture),
      ];
      const found = candidates.find((c) => existsSync(c));
      if (found) {
        filePath = found;
      } else {
        throw new Error(`Fixture file not found: ${filePath}`);
      }
    }
    const content = readFileSync(filePath, "utf-8");
    telemetry.checked++;

    const extraction = extractMediaCandidates(
      content,
      {
        opportunityId: cliArgs.opportunityId ?? "opp_dryrun_fixture",
        title: "Dry Run Fixture Opportunity",
        pageUrl: "https://example.org/calls/dry-run-fixture",
        sourceRole: cliArgs.sourceRole ?? "official-opportunity-page",
        organizationId: "org_dryrun",
        organizationConfirmed: true,
        minWidth: cliArgs.minWidth,
        minHeight: cliArgs.minHeight,
      },
      ["https://example.org/calls/dry-run-fixture"],
      200,
    );

    telemetry.found += extraction.totalDiscovered;
    let rev = 0;
    let rej = 0;
    for (const c of extraction.candidates) {
      if (c.status === "reviewable") rev++;
      else rej++;
    }
    telemetry.reviewable += rev;
    telemetry.rejected += rej;

    for (const [k, v] of Object.entries(extraction.rejectionCounts)) {
      rejectionBreakdown[k] = (rejectionBreakdown[k] ?? 0) + v;
    }

    details.push({
      opportunityId: cliArgs.opportunityId ?? "opp_dryrun_fixture",
      sourceUrl: "https://example.org/calls/dry-run-fixture",
      candidatesFound: extraction.totalDiscovered,
      reviewableCount: rev,
      rejectedCount: rej,
    });

    if (cliArgs.verbose) {
      console.log("\n[VERBOSE] Discovered Candidates in Fixture:");
      for (const [idx, c] of extraction.candidates.entries()) {
        console.log(`  [${idx + 1}] ${c.resolvedUrl}`);
        console.log(`      Kind: ${c.candidateKind} | Method: ${c.extractionMethod} | Status: ${c.status}`);
        console.log(`      Alt: ${c.alt ?? "(none)"} | Dimensions: ${c.width ?? "?"}x${c.height ?? "?"}`);
        if (c.rejectionReasons.length > 0) {
          console.log(`      Rejections: ${c.rejectionReasons.join(", ")}`);
        }
      }
    }

    return { telemetry, rejectionBreakdown, details };
  }

  // Scenario B: Database targets (read-only check)
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or --fixture <path> is required for dry-run.");
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const query = cliArgs.opportunityId
      ? {
          text: `select o.id, o.title, coalesce(o.guidelines_url, o.submission_url, s.url) as "sourceUrl",
                        o.organization_id as "organizationId", s.kind as "sourceKind", s.authority_kind as "sourceAuthorityKind",
                        coalesce(evidence.organization_confirmed, false) as "organizationConfirmed"
                 from opportunities o
                 left join opportunity_sources s on s.id = o.source_id
                 left join opportunity_source_evidence evidence on evidence.opportunity_id = o.id
                 where o.id = $1`,
          values: [cliArgs.opportunityId],
        }
      : {
          text: `select o.id, o.title, coalesce(o.guidelines_url, o.submission_url, s.url) as "sourceUrl",
                        o.organization_id as "organizationId", s.kind as "sourceKind", s.authority_kind as "sourceAuthorityKind",
                        coalesce(evidence.organization_confirmed, false) as "organizationConfirmed"
                 from opportunities o
                 left join opportunity_sources s on s.id = o.source_id
                 left join opportunity_source_evidence evidence on evidence.opportunity_id = o.id
                 where o.publication_state in ('published', 'reviewable')
                   and coalesce(o.guidelines_url, o.submission_url, s.url) is not null
                 order by o.created_at desc
                 limit $1`,
          values: [cliArgs.limit],
        };

    const { rows } = await pool.query<{
      id: string;
      title: string;
      sourceUrl: string;
      organizationId: string | null;
      sourceKind: string | null;
      sourceAuthorityKind: string | null;
      organizationConfirmed: boolean;
    }>(query.text, query.values);

    for (const opp of rows) {
      telemetry.checked++;
      const sourceRole =
        cliArgs.sourceRole ??
        inferSourceRole(opp.sourceUrl, {
          id: opp.id,
          opportunityId: opp.id,
          kind: "media",
          attempts: 0,
          sourceUrl: opp.sourceUrl,
          title: opp.title,
          opportunityType: "open-call",
          genres: [],
          organizationId: opp.organizationId ?? undefined,
          sourceKind: opp.sourceKind ?? undefined,
          sourceAuthorityKind: opp.sourceAuthorityKind ?? undefined,
          organizationConfirmed: opp.organizationConfirmed,
        });

      try {
        const fetchResult = await fetchWithPolicy(opp.sourceUrl, { expectedType: "html", checkRobots: true });
        const html = typeof fetchResult.body === "string" ? fetchResult.body : fetchResult.body.toString("utf-8");
        const extraction = extractMediaCandidates(
          html,
          {
            opportunityId: opp.id,
            title: opp.title,
            pageUrl: fetchResult.finalUrl,
            sourceRole,
            organizationId: opp.organizationId ?? undefined,
            organizationConfirmed: opp.organizationConfirmed,
            minWidth: cliArgs.minWidth,
            minHeight: cliArgs.minHeight,
          },
          fetchResult.redirectChain,
          fetchResult.httpStatus,
        );

        telemetry.found += extraction.totalDiscovered;
        let rev = 0;
        let rej = 0;
        for (const c of extraction.candidates) {
          if (c.status === "reviewable") rev++;
          else rej++;
        }
        telemetry.reviewable += rev;
        telemetry.rejected += rej;

        for (const [k, v] of Object.entries(extraction.rejectionCounts)) {
          rejectionBreakdown[k] = (rejectionBreakdown[k] ?? 0) + v;
        }

        details.push({
          opportunityId: opp.id,
          sourceUrl: opp.sourceUrl,
          candidatesFound: extraction.totalDiscovered,
          reviewableCount: rev,
          rejectedCount: rej,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === "robots-blocked") telemetry.blocked++;
        else telemetry.failed++;
      }
    }

    return { telemetry, rejectionBreakdown, details };
  } finally {
    await pool.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log("=================================================");
  console.log("  MISSA OPPORTUNITY MEDIA ENRICHMENT DRY RUN    ");
  console.log("=================================================");
  if (args.fixture) console.log(`Fixture: ${args.fixture}`);
  if (args.opportunityId) console.log(`Opportunity ID: ${args.opportunityId}`);
  console.log(`Limit: ${args.limit}`);
  console.log("");

  const start = Date.now();
  try {
    const result = await runDryRun(args);
    const elapsedSec = ((Date.now() - start) / 1000).toFixed(2);

    console.log("-------------------------------------------------");
    console.log("TELEMETRY SUMMARY");
    console.log("-------------------------------------------------");
    console.log(`  Checked targets:      ${result.telemetry.checked}`);
    console.log(`  Total found:          ${result.telemetry.found}`);
    console.log(`  Rejected candidates:  ${result.telemetry.rejected}`);
    console.log(`  Reviewable candidates:${result.telemetry.reviewable}`);
    console.log(`  Cleared candidates:   ${result.telemetry.cleared}`);
    console.log(`  Blocked targets:      ${result.telemetry.blocked}`);
    console.log(`  Failed targets:       ${result.telemetry.failed}`);
    console.log(`  Elapsed time:         ${elapsedSec}s`);
    console.log("-------------------------------------------------");
    console.log("REJECTION BREAKDOWN");
    console.log("-------------------------------------------------");
    const entries = Object.entries(result.rejectionBreakdown);
    if (entries.length === 0) {
      console.log("  (no rejections triggered)");
    } else {
      for (const [reason, count] of entries) {
        console.log(`  - ${reason}: ${count}`);
      }
    }
    console.log("=================================================");
  } catch (error) {
    console.error("Dry run failed:", error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && process.argv[1].endsWith("mediaDryRunCli.js")) {
  main();
}
