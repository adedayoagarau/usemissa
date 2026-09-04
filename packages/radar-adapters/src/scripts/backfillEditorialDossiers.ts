#!/usr/bin/env node

import { Pool } from "pg";
import {
  reviewOpportunityContent,
  type OpportunityContent,
  type OpportunityContentBuildInput,
} from "@missa/radar-engine";
import {
  writeOpportunityEditorial,
  writeOrganizationEditorial,
} from "../editorialWriter.js";

interface CliOptions {
  batchSize: number;
  concurrency: number;
  limit?: number;
  onlyActive: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let batchSize = 25;
  let concurrency = 5;
  let limit: number | undefined = undefined;
  let onlyActive = true;

  for (const arg of args) {
    if (arg.startsWith("--batch=")) {
      batchSize = Math.max(1, parseInt(arg.split("=")[1], 10) || 25);
    } else if (arg.startsWith("--concurrency=")) {
      concurrency = Math.max(1, Math.min(20, parseInt(arg.split("=")[1], 10) || 5));
    } else if (arg.startsWith("--limit=")) {
      limit = Math.max(1, parseInt(arg.split("=")[1], 10) || 100);
    } else if (arg === "--all") {
      onlyActive = false;
    }
  }

  return { batchSize, concurrency, limit, onlyActive };
}

function iso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function materialArray(value: unknown): Array<{ label: string; limit?: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { label?: unknown; limit?: unknown };
    if (typeof row.label !== "string" || !row.label.trim()) return [];
    return [{ label: row.label.trim(), ...(typeof row.limit === "string" && row.limit.trim() ? { limit: row.limit.trim() } : {}) }];
  });
}

async function main() {
  const options = parseArgs();
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is required to run backfillEditorialDossiers.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl, max: Math.max(10, options.concurrency * 2) });

  console.log("=================================================================");
  console.log("  Missa Radar — Editorial Curatorial Dossier Backfill");
  console.log("=================================================================");
  console.log(`  Options: concurrency=${options.concurrency}, limit=${options.limit ?? "unlimited"}, activeOnly=${options.onlyActive}`);
  console.log(`  AI Engine: ${process.env.DEEPSEEK_API_KEY ? "DeepSeek V3 (Active)" : process.env.OPENAI_API_KEY ? "OpenAI (Active)" : "Deterministic Elevated (Fallback)"}`);
  console.log("-----------------------------------------------------------------\n");

  const queryClause = options.onlyActive
    ? "and (o.deadline_date is null or o.deadline_date >= current_date)"
    : "";

  const candidateQuery = `
    select o.id, o.title, o.type, o.status, o.discipline, o.genres,
      coalesce(c.content->>'description', (select obs.description from gary_call_observations obs where obs.opportunity_id = o.id and obs.description is not null order by obs.observed_at desc limit 1)) as description,
      o.organization_id,
      org.data->>'name' as organization_name,
      org.data as organization_data,
      o.deadline_kind, o.deadline_date::text as deadline_date,
      nullif(o.deadline_date::text, '') as deadline_raw,
      o.fee_status, o.fee_cents, o.fee_currency, o.prize, o.location,
      o.submission_url, o.guidelines_url, o.submission_state,
      s.url as source_url,
      coalesce(evidence.processing_succeeded_at, o.processing_succeeded_at) as processing_succeeded_at,
      coalesce(evidence.organization_confirmed, false) as organization_confirmed,
      coalesce(profile.accepted_formats, '{}') as accepted_formats,
      coalesce((select jsonb_agg(jsonb_build_object('label', m.label, 'limit', m."limit") order by m.sort_order)
                from opportunity_required_materials m where m.opportunity_id = o.id), '[]'::jsonb) as required_materials,
      profile.eligibility_summary,
      profile.reading_period_kind,
      org.data->>'description' as editorial_focus,
      coalesce(o.last_changed_at, o.updated_at, o.created_at)::text as input_version
    from opportunities o
    join opportunity_sources s on s.id = o.source_id
    left join radar_organizations org on org.id = o.organization_id
    left join opportunity_contents c on c.opportunity_id = o.id
    left join lateral (
      select e.processing_succeeded_at, e.organization_confirmed
      from opportunity_source_evidence e
      where e.opportunity_id = o.id order by e.checked_at desc limit 1
    ) evidence on true
    left join opportunity_call_profiles profile on profile.opportunity_id = o.id
    where o.publication_state in ('published', 'reviewable')
      ${queryClause}
      and not exists (
        select 1 from opportunity_contents c
        where c.opportunity_id = o.id
          and c.builder_version = 'editorial-writer.v2'
          and c.content->>'curatorialOverview' is not null
      )
    order by 
      case 
        when o.deadline_date is not null and o.deadline_date between current_date and current_date + 30 then 1
        when o.deadline_date is not null and o.deadline_date >= current_date then 2
        when o.deadline_date is null then 3
        else 4
      end,
      o.created_at desc
    ${options.limit ? `limit ${options.limit}` : ""}
  `;

  console.log("Fetching candidate opportunities requiring editorial dossiers...");
  const candidatesRes = await pool.query(candidateQuery);
  const rows = candidatesRes.rows;
  console.log(`Found ${rows.length} opportunities needing curatorial dossiers.\n`);

  if (rows.length === 0) {
    console.log("All published opportunities already have active editorial curatorial dossiers!");
    await pool.end();
    return;
  }

  let processedCount = 0;
  let approvedCount = 0;
  let needsHumanCount = 0;
  let orgsEnrichedCount = 0;
  const startTime = Date.now();

  async function processOpportunity(row: (typeof rows)[0], index: number) {
    const oppStart = Date.now();
    const buildInput: OpportunityContentBuildInput = {
      title: row.title,
      type: row.type,
      status: row.status,
      organizationName: row.organization_name ?? undefined,
      discipline: row.discipline ?? undefined,
      genres: row.genres ?? [],
      deadline: { kind: row.deadline_kind, date: row.deadline_date ?? undefined, raw: row.deadline_raw ?? undefined },
      fee: { status: row.fee_status, amountCents: row.fee_cents ?? undefined, currency: row.fee_currency ?? undefined },
      prize: row.prize ?? undefined,
      location: row.location ?? undefined,
      submissionUrl: row.submission_url ?? undefined,
      guidelinesUrl: row.guidelines_url ?? undefined,
      submissionState: row.submission_state,
      requiredMaterials: materialArray(row.required_materials),
      acceptedFormats: row.accepted_formats ?? [],
      sourceUrl: row.source_url,
      sourceProcessedAt: iso(row.processing_succeeded_at),
      organizationConfirmed: row.organization_confirmed,
      generatedAt: new Date().toISOString(),
      description: row.description ?? undefined,
      editorialFocus: row.editorial_focus ?? undefined,
      organizationSummary: typeof row.organization_data?.description === "string" ? row.organization_data.description : undefined,
      eligibilitySummary: row.eligibility_summary ?? undefined,
      readingPeriodKind: row.reading_period_kind ?? undefined,
    };

    // 1. Synthesize curatorial dossier
    const content = await writeOpportunityEditorial(buildInput);

    // 2. Synthesize institutional profile if missing
    if (row.organization_id && row.organization_data && !row.organization_data.editorialProfile) {
      try {
        const orgEditorial = await writeOrganizationEditorial({
          name: row.organization_name || String(row.organization_data.name || ""),
          websiteUrl: String(row.organization_data.website_url || row.organization_data.websiteUrl || ""),
          kind: String(row.organization_data.kind || ""),
          location: buildInput.location,
          rawDescription: String(row.organization_data.description || row.organization_data.biography || ""),
          editorialFocus: buildInput.editorialFocus,
          sampleCalls: [buildInput.title],
        });
        await pool.query(
          `update radar_organizations
           set data = jsonb_set(data, '{editorialProfile}', $2::jsonb),
               updated_at = now()
           where id = $1`,
          [row.organization_id, JSON.stringify(orgEditorial)],
        );
        orgsEnrichedCount++;
      } catch {
        // Non-critical org failure
      }
    }

    // 3. Review curatorial content
    const reviewResult = reviewOpportunityContent(content, {
      sourceUrl: row.source_url,
      sourceProcessedAt: iso(row.processing_succeeded_at),
      organizationConfirmed: row.organization_confirmed,
      submissionState: row.submission_state,
    });

    const reviewedContent: OpportunityContent = {
      ...content,
      review: {
        status: reviewResult.decision === "approved" ? "approved" : "needs-human",
        score: reviewResult.score,
        reasons: reviewResult.reasons,
        checks: reviewResult.checks,
        reviewedAt: new Date().toISOString(),
      },
    };

    // 4. Persist to opportunity_contents
    await pool.query(
      `insert into opportunity_contents
         (opportunity_id, input_version, builder_version, content, review_status, review_score, review_reasons, review_checks, generated_at, reviewed_at, updated_at)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8::jsonb, $9, now(), now())
       on conflict (opportunity_id) do update set
         input_version = excluded.input_version,
         builder_version = excluded.builder_version,
         content = excluded.content,
         review_status = excluded.review_status,
         review_score = excluded.review_score,
         review_reasons = excluded.review_reasons,
         review_checks = excluded.review_checks,
         generated_at = excluded.generated_at,
         reviewed_at = now(),
         updated_at = now()`,
      [
        row.id,
        row.input_version,
        reviewedContent.builderVersion,
        JSON.stringify(reviewedContent),
        reviewedContent.review.status,
        reviewedContent.review.score,
        JSON.stringify(reviewedContent.review.reasons),
        JSON.stringify(reviewedContent.review.checks),
        reviewedContent.generatedAt,
      ],
    );

    // 5. Update review job status
    await pool.query(
      `insert into radar_content_review_jobs (id, opportunity_id, priority, input_version, status, updated_at)
       values (md5('content:' || $1), $1, 20, $2, $3, now())
       on conflict (opportunity_id) do update set
         status = excluded.status, input_version = excluded.input_version, updated_at = now()`,
      [row.id, row.input_version, reviewedContent.review.status === "approved" ? "completed" : "needs-human"],
    );

    const elapsed = ((Date.now() - oppStart) / 1000).toFixed(1);
    processedCount++;
    if (reviewedContent.review.status === "approved") {
      approvedCount++;
    } else {
      needsHumanCount++;
    }

    const stages = content.targetAudience?.careerStages?.join(", ") ?? "general";
    const tipsCount = content.insiderTips?.length ?? 0;
    const titleSnippet = row.title.length > 38 ? row.title.slice(0, 36) + "…" : row.title;
    const orgSnippet = row.organization_name ? ` (${row.organization_name})` : "";

    console.log(
      `[${processedCount}/${rows.length}] "${titleSnippet}"${orgSnippet} ` +
      `-> Dossier (${content.curatorialOverview?.length ?? 0} ch), Audience [${stages}], ${tipsCount} tips. ` +
      `Decision: ${reviewedContent.review.status} (${reviewedContent.review.score} pts) [${elapsed}s]`
    );
  }

  // Process in chunks with controlled concurrency
  for (let i = 0; i < rows.length; i += options.concurrency) {
    const chunk = rows.slice(i, i + options.concurrency);
    await Promise.all(chunk.map((row, idx) => processOpportunity(row, i + idx)));
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n=================================================================");
  console.log("  Editorial Backfill Complete");
  console.log("=================================================================");
  console.log(`  Total Opportunities Processed: ${processedCount}`);
  console.log(`  Approved Content:              ${approvedCount}`);
  console.log(`  Flagged for Human Review:      ${needsHumanCount}`);
  console.log(`  Institutions Enriched:         ${orgsEnrichedCount}`);
  console.log(`  Total Time Elapsed:            ${totalTime}s (avg ${(parseFloat(totalTime) / processedCount).toFixed(2)}s/call)`);
  console.log("=================================================================\n");

  await pool.end();
}

main().catch((err) => {
  console.error("Backfill failed with unhandled error:", err);
  process.exit(1);
});
