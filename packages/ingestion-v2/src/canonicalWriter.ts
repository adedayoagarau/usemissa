import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { registryVerticalCompatibility } from "@missa/radar-engine";
import type { ExtractionResult, SourceDefinition } from "./contracts.js";
import type { PublisherReview } from "./publisher.js";
import type { CandidatePublisherReview } from "./publisher.js";
import type { ShadowArtifact } from "./execution.js";
import { writeWithDeepSeek } from "./deepseekWriter.js";
import { resolveCurrentDeadline } from "./deadline.js";
import { isAggregateOpportunityPage } from "./identity.js";

function field(fields: ExtractionResult["fields"], name: string): string | undefined {
  for (const candidate of [...fields].reverse()) {
    if (candidate.fieldName !== name) continue;
    const normalized = typeof candidate.normalizedValue === "string" ? candidate.normalizedValue.trim() : "";
    const raw = candidate.rawValue?.trim() ?? "";
    if (normalized || raw) return normalized || raw;
  }
  return undefined;
}
function fieldValues(fields: ExtractionResult["fields"], name: string): string[] {
  return [...new Set(fields.flatMap((candidate) => {
    if (candidate.fieldName !== name) return [];
    const value = typeof candidate.normalizedValue === "string" ? candidate.normalizedValue : candidate.rawValue;
    return value?.trim() ? [value.trim()] : [];
  }))];
}
function identityText(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function canonicalId(url: string): string { return `opp_v2_${createHash("sha256").update(url).digest("hex").slice(0, 32)}`; }
function sourceId(source: SourceDefinition): string { return `v2_source_${createHash("sha256").update(source.url).digest("hex").slice(0, 24)}`; }
function normalizedDestinationKey(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
}

export interface CanonicalDuplicateMatch {
  id: string;
  publication_state: "published" | "reviewable" | "suppressed";
}

/** Conservative cross-source duplicate lookup. URL aliases are strongest;
 * semantic matching additionally requires title, deadline, and organization. */
export async function findCanonicalDuplicateMatches(
  db: Pool | PoolClient,
  extraction: ExtractionResult,
  authoritativeUrl: string,
  deadline: string | null,
  deadlineKind = deadline ? "exact" : "unknown",
): Promise<CanonicalDuplicateMatch[]> {
  const opportunityId = canonicalId(authoritativeUrl);
  const destinationKey = normalizedDestinationKey(authoritativeUrl);
  const titleKeys = fieldValues(extraction.fields, "title").map(identityText).filter(Boolean);
  // A long exact title plus an exact deadline is a strong cross-directory
  // identity even when an aggregator did not expose the organizer name. This
  // catches overlap such as NewPages and Poets & Writers without treating
  // generic labels like "Open Call" as identities.
  const distinctiveTitleKeys = titleKeys.filter((value) => value.length >= 16);
  const organizationKeys = fieldValues(extraction.fields, "organization").map(identityText).filter((value) => value.length >= 4);
  const result = await db.query<CanonicalDuplicateMatch>(
    `select o.id, o.publication_state from opportunities o
     left join radar_organizations org on org.id = o.organization_id
     where o.id = $1
        or lower(regexp_replace(regexp_replace(split_part(split_part(coalesce(o.submission_url, ''), '?', 1), '#', 1), '^https?://(www\\.)?', '', 'i'), '/+$', '')) = $2
        or lower(regexp_replace(regexp_replace(split_part(split_part(coalesce(o.guidelines_url, ''), '?', 1), '#', 1), '^https?://(www\\.)?', '', 'i'), '/+$', '')) = $2
        or (
          regexp_replace(lower(o.title), '[^a-z0-9]+', '', 'g') = any($3::text[])
          and ((
            $4::date is not null and o.deadline_date = $4::date and (
            regexp_replace(lower(o.title), '[^a-z0-9]+', '', 'g') = any($6::text[])
            or (
              cardinality($5::text[]) > 0
              and (
                regexp_replace(lower(coalesce(org.data->>'name', '')), '[^a-z0-9]+', '', 'g') = any($5::text[])
                or exists (
                  select 1 from unnest($5::text[]) organization_key
                  where regexp_replace(lower(coalesce(o.search_document, '')), '[^a-z0-9]+', '', 'g') like '%' || organization_key || '%'
                )
              )
            )
          )) or (
            $4::date is null and $7 in ('rolling', 'year-round', 'seasonal', 'until-filled') and o.deadline_kind = $7
            and cardinality($5::text[]) > 0
            and (
              regexp_replace(lower(coalesce(org.data->>'name', '')), '[^a-z0-9]+', '', 'g') = any($5::text[])
              or exists (select 1 from unnest($5::text[]) organization_key where regexp_replace(lower(coalesce(o.search_document, '')), '[^a-z0-9]+', '', 'g') like '%' || organization_key || '%')
            )
          ))
        )
     order by case
       when o.id = $1 then 0
       when lower(regexp_replace(regexp_replace(split_part(split_part(coalesce(o.submission_url, ''), '?', 1), '#', 1), '^https?://(www\\.)?', '', 'i'), '/+$', '')) = $2 then 1
       when lower(regexp_replace(regexp_replace(split_part(split_part(coalesce(o.guidelines_url, ''), '?', 1), '#', 1), '^https?://(www\\.)?', '', 'i'), '/+$', '')) = $2 then 1
       else 2
     end, o.id
     limit 2`,
    [opportunityId, destinationKey, titleKeys, deadline, organizationKeys, distinctiveTitleKeys, deadlineKind],
  );
  return result.rows;
}

export type CanonicalPromotionResult = { opportunityId: string; created: boolean; publicationState: "reviewable" };
export type CanonicalCandidateHandoffResult =
  | { opportunityId: string; status: "created-reviewable" | "updated-reviewable"; publicationState: "reviewable" }
  | { opportunityId: string; status: "duplicate-existing"; publicationState: "published" | "reviewable" | "suppressed" };

/** Preserve published opportunities as public archive records while closing
 * exact v2 deadlines that have passed. The durable publication trigger permits
 * only this fact-preserving lifecycle transition. */
export async function closeExpiredPublishedV2Opportunities(db: Pool | PoolClient): Promise<string[]> {
  const result = await db.query<{ id: string }>(
    `update opportunities
     set status = 'closed', last_changed_at = now(), updated_at = now()
     where id like 'opp_v2_%'
       and publication_state = 'published'
       and status in ('opening-soon', 'open', 'closing-soon', 'deadline-extended')
       and deadline_date < current_date
     returning id`,
  );
  return result.rows.map((row) => row.id);
}

/** Reviewable evidence also leaves the active queue when its exact deadline
 * passes. This does not delete it or change publication state. */
export async function closeExpiredReviewableV2Opportunities(db: Pool | PoolClient): Promise<string[]> {
  const result = await db.query<{ id: string }>(
    `update opportunities
     set status = 'closed', last_changed_at = now(), updated_at = now()
     where id like 'opp_v2_%'
       and publication_state = 'reviewable'
       and status in ('opening-soon', 'open', 'closing-soon', 'deadline-extended')
       and deadline_kind = 'exact'
       and deadline_date < current_date
     returning id`,
  );
  return result.rows.map((row) => row.id);
}

/** Idempotent repair for v2 records created before canonical taxonomy
 * propagation was added. Reviewer-owned assignments are never replaced. */
export async function backfillV2SourceTaxonomy(db: Pool | PoolClient, source: SourceDefinition): Promise<number> {
  const canonicalSourceId = sourceId(source);
  let inserted = 0;
  const sourceTermIds = sourceTaxonomyTermIds(source);
  for (const termId of sourceTermIds) {
    await db.query(
      `insert into opportunity_source_taxonomy_terms (source_id,term_id,coverage_kind,assignment_origin,source_phrase,confidence,updated_at)
       select id,$2,'accepts','registry','ingestion-v2 source manifest',90,now() from opportunity_sources where id=$1
       on conflict (source_id,term_id,coverage_kind) do nothing`,
      [canonicalSourceId, termId],
    );
  }
  const rows = await db.query<{ id: string; title: string; search_document: string }>(
    `select id,title,search_document from opportunities where source_id=$1 and id like 'opp_v2_%'`,
    [canonicalSourceId],
  );
  const writingRules = writingTaxonomyRules(source);
  for (const row of rows.rows) {
    const evidence = `${row.title} ${row.search_document}`;
    const expected = writingRules.length
      ? writingRules.filter((rule) => rule.pattern.test(evidence)).map((rule) => rule.termId)
      : sourceTermIds;
    await db.query(
      `delete from opportunity_taxonomy_terms
       where opportunity_id=$1 and assignment_origin='registry' and source_phrase='ingestion-v2 source manifest'
         and not (term_id=any($2::text[]))`,
      [row.id, expected],
    );
    for (const termId of expected) {
      const result = await db.query(
        `insert into opportunity_taxonomy_terms (opportunity_id,term_id,source_evidence_id,source_phrase,normalized_phrase,assignment_origin,certainty,"primary",updated_at)
         select $1,$2,(select e.id from opportunity_source_evidence e where e.opportunity_id=$1 order by e.checked_at desc limit 1),
           'ingestion-v2 source manifest','ingestion-v2 source manifest','registry','probable',$3,now()
         on conflict (opportunity_id,term_id) do nothing returning opportunity_id`,
        [row.id, termId, termId === "taxterm_pf-writing-and-literature"],
      );
      inserted += result.rowCount ?? 0;
    }
  }
  return inserted;
}

/** Idempotently writes approved v2 evidence to canonical storage; it never writes public state. */
export async function promoteApprovedArtifact(pool: Pool, source: SourceDefinition, artifact: ShadowArtifact): Promise<CanonicalPromotionResult> {
  const review: PublisherReview | undefined = artifact.publisher;
  if (!review || review.decision !== "approve" || review.reconciliation.decision !== "pass") throw new Error("v2 promotion requires an approved, reconciled publisher review");
  if (review.candidateReviews?.length) throw new Error("v2 aggregate promotion is disabled for candidate-scoped artifacts");
  const result = await writeApprovedEvidence(pool, source, artifact, artifact.extraction, review);
  if (result.status === "duplicate-existing") throw new Error(`v2 promotion candidate is already represented by ${result.opportunityId}`);
  return { opportunityId: result.opportunityId, created: result.status === "created-reviewable", publicationState: "reviewable" };
}

/** Hands one gate-approved destination into canonical human review. Exact URL
 * duplicates are reported, never inserted or used to rewrite a public row. */
export async function handoffApprovedCandidate(
  pool: Pool,
  source: SourceDefinition,
  artifact: ShadowArtifact,
  candidate: CandidatePublisherReview,
): Promise<CanonicalCandidateHandoffResult> {
  if (candidate.review.decision !== "approve" || candidate.review.reconciliation.decision !== "pass") {
    throw new Error("v2 candidate handoff requires an approved, reconciled publisher review");
  }
  return writeApprovedEvidence(pool, source, artifact, candidate.extraction, candidate.review);
}

async function writeApprovedEvidence(
  pool: Pool,
  source: SourceDefinition,
  artifact: ShadowArtifact,
  extraction: ExtractionResult,
  review: PublisherReview,
): Promise<CanonicalCandidateHandoffResult> {
  const url = review.reconciliation.authoritativeUrl;
  const title = field(extraction.fields, "title");
  if (!url || !title) throw new Error("v2 promotion requires an authoritative URL and title");
  if (new URL(url).protocol !== "https:") throw new Error("v2 promotion requires a safe HTTPS authoritative URL");
  const opportunityId = canonicalId(url);
  const canonicalSourceId = sourceId(source);
  const organization = field(extraction.fields, "organization");
  if (isAggregateOpportunityPage(extraction, url)) throw new Error("v2 candidate handoff rejected a directory or roundup page");
  const resolvedDeadline = resolveCurrentDeadline(extraction.fields, url);
  const deadline = resolvedDeadline.date;
  if (resolvedDeadline.conflict || (!deadline && resolvedDeadline.kind === "unknown")) throw new Error("v2 candidate handoff requires a non-conflicting current deadline or declared rolling window");
  const deadlineKind = resolvedDeadline.kind;
  const type = field(extraction.fields, "opportunityType") ?? "other";
  const searchDocument = [title, organization, type, field(extraction.fields, "description")].filter(Boolean).join(" ").toLowerCase();
  // Review-mode ingestion can extract an organization name, but only a human
  // or the separately approved promotion path may confirm that identity for
  // the durable publication gate.
  const reviewOnlyReconciliation = { ...review.reconciliation, v2ReviewOnly: true };
  const client = await pool.connect();
  try {
    await client.query("begin");
    const semanticLock = [deadline ?? deadlineKind, ...fieldValues(extraction.fields, "title").map(identityText).sort(), ...fieldValues(extraction.fields, "organization").map(identityText).sort()].join("|");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [semanticLock]);
    const existing = await findCanonicalDuplicateMatches(client, extraction, url, deadline, deadlineKind);
    const owned = existing.find((row) => row.id === opportunityId);
    const duplicate = existing.find((row) => row.id !== opportunityId) ?? (owned && owned.publication_state !== "reviewable" ? owned : undefined);
    if (duplicate) {
      await client.query("rollback");
      return { opportunityId: duplicate.id, status: "duplicate-existing", publicationState: duplicate.publication_state };
    }
    await upsertSource(client, source, canonicalSourceId);
    const persisted = await client.query(
      `insert into opportunities (id,slug,title,source_id,status,publication_state,type,genres,deadline_date,deadline_kind,fee_status,guidelines_url,submission_url,submission_host,submission_state,search_document,source_checked_at,processing_succeeded_at,last_changed_at,created_at,updated_at)
       values ($1,$2,$3,$4,'open','reviewable',$5,'{}'::text[],$6,$7,'unknown',$8,$8,$9,'available',$10,now(),now(),now(),now(),now())
       on conflict (id) do update set title=excluded.title,source_id=excluded.source_id,type=excluded.type,deadline_date=excluded.deadline_date,deadline_kind=excluded.deadline_kind,guidelines_url=excluded.guidelines_url,submission_url=excluded.submission_url,submission_host=excluded.submission_host,submission_state=excluded.submission_state,search_document=excluded.search_document,source_checked_at=excluded.source_checked_at,processing_succeeded_at=excluded.processing_succeeded_at,last_changed_at=excluded.last_changed_at,updated_at=now()
       where opportunities.publication_state = 'reviewable'
       returning id`,
      [opportunityId, `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 100)}-${opportunityId}`, title, canonicalSourceId, type, deadline, deadlineKind, url, new URL(url).host, searchDocument],
    );
    if (persisted.rowCount !== 1) throw new Error("v2 candidate handoff could not preserve the reviewable publication boundary");
    await client.query(
      `insert into opportunity_source_evidence (id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled,destination_reconciliation,verified_until)
       values ($1,$2,$3,$4,$5,$6,now(),now(),$7,true,$8::jsonb,null)
       on conflict (id) do update set checked_at=now(),processing_succeeded_at=now(),organization_confirmed=excluded.organization_confirmed,destination_reconciled=true,destination_reconciliation=excluded.destination_reconciliation`,
      [`${opportunityId}:evidence:${canonicalSourceId}`, opportunityId, canonicalSourceId, source.kind, source.name, source.url, false, JSON.stringify(reviewOnlyReconciliation)],
    );
    await writeDeadlineWindows(client, opportunityId, url, resolvedDeadline);
    await writeTaxonomyAssignments(client, source, canonicalSourceId, opportunityId, extraction);
    const content = await writeWithDeepSeek({ title, organization, type, deadline, authoritativeUrl: url, fields: extraction.fields });
    await client.query(
      `insert into opportunity_contents (opportunity_id,input_version,builder_version,content,review_status,review_score,review_reasons,review_checks,generated_at,updated_at)
       values ($1,$2,$3,$4::jsonb,'pending',0,'[]'::jsonb,'{}'::jsonb,$5,now())
       on conflict (opportunity_id) do update set input_version=excluded.input_version,builder_version=excluded.builder_version,content=excluded.content,review_status='pending',review_score=0,review_reasons='[]'::jsonb,review_checks='{}'::jsonb,generated_at=excluded.generated_at,updated_at=now()`,
      [opportunityId, artifact.run.id, content.builderVersion, JSON.stringify(content), content.generatedAt],
    );
    await client.query("commit");
    return { opportunityId, status: owned ? "updated-reviewable" : "created-reviewable", publicationState: "reviewable" };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
}

function sourceTaxonomyTermIds(source: SourceDefinition): string[] {
  const manifest = source.config.sourceManifest as { desk?: string; artFormVerticalIds?: string[] } | undefined;
  const verticals = manifest?.artFormVerticalIds ?? [];
  return [...new Set([
    ...(manifest?.desk === "writing" ? ["taxterm_pf-writing-and-literature"] : []),
    ...verticals.flatMap((vertical) => registryVerticalCompatibility(vertical).taxonomyTermIds),
  ])];
}

function writingTaxonomyRules(source: SourceDefinition): Array<{ termId: string; pattern: RegExp }> {
  const manifest = source.config.sourceManifest as { desk?: string; id?: string; artFormVerticalIds?: string[] } | undefined;
  if (manifest?.desk !== "writing") return [];
  const dedicated = manifest.id !== "chill-subs-contests";
  const rules = new Map<string, RegExp>();
  rules.set("taxterm_pf-writing-and-literature", dedicated
    ? /./
    : /\b(?:writ(?:e|er|ing|ten)|literary|poetr?y|poem|fiction|nonfiction|non-fiction|essay|memoir|prose|story|stories|novel|book|manuscript|chapbook|playwrit|screenwrit|journal|magazine)\b/i);
  const verticalPatterns: Record<string, RegExp> = {
    poetry: /\b(?:poetry|poem|poet|chapbook)\b/i,
    "literary-fiction": /\b(?:fiction|story|stories|novel|prose)\b/i,
    "creative-nonfiction": /\b(?:creative nonfiction|non-fiction|nonfiction|essay|memoir)\b/i,
    "flash-hybrid": /\b(?:flash|hybrid|cross-genre)\b/i,
    "novel-book": /\b(?:novel|book|manuscript)\b/i,
  };
  const verticalAliases: Record<string, string> = {
    "fiction-short-stories": "literary-fiction",
    "nonfiction-essay": "creative-nonfiction",
    "hybrid-cross-genre": "flash-hybrid",
  };
  const termPatterns: Record<string, RegExp> = {
    "taxterm_disc-fiction": /\b(?:fiction|story|stories|novel|prose)\b/i,
    "taxterm_genre-literary-fiction": /\bliterary fiction\b/i,
    "taxterm_disc-creative-nonfiction": /\b(?:creative nonfiction|non-fiction|nonfiction|essay)\b/i,
    "taxterm_form-memoir": /\bmemoir\b/i,
    "taxterm_form-flash-fiction": /\bflash fiction\b/i,
    "taxterm_disc-hybrid-writing": /\b(?:hybrid|cross-genre)\b/i,
  };
  for (const vertical of manifest.artFormVerticalIds ?? []) {
    const canonicalVertical = verticalAliases[vertical] ?? vertical;
    const pattern = verticalPatterns[canonicalVertical];
    if (!pattern) continue;
    for (const termId of registryVerticalCompatibility(canonicalVertical).taxonomyTermIds) rules.set(termId, termPatterns[termId] ?? pattern);
  }
  return [...rules].map(([termId, pattern]) => ({ termId, pattern }));
}

export function opportunityTaxonomyTermIds(source: SourceDefinition, extraction: ExtractionResult): string[] {
  const rules = writingTaxonomyRules(source);
  if (!rules.length) return sourceTaxonomyTermIds(source);
  const evidence = extraction.fields
    .filter((candidate) => ["title", "description", "eligibility", "opportunityType"].includes(candidate.fieldName))
    .map((candidate) => String(candidate.normalizedValue ?? candidate.rawValue ?? ""))
    .join(" ");
  return rules.filter((rule) => rule.pattern.test(evidence)).map((rule) => rule.termId);
}

async function writeTaxonomyAssignments(client: PoolClient, source: SourceDefinition, canonicalSourceId: string, opportunityId: string, extraction: ExtractionResult): Promise<void> {
  const sourceTermIds = sourceTaxonomyTermIds(source);
  const termIds = opportunityTaxonomyTermIds(source, extraction);
  const evidenceId = `${opportunityId}:evidence:${canonicalSourceId}`;
  for (const termId of sourceTermIds) {
    await client.query(
      `insert into opportunity_source_taxonomy_terms (source_id,term_id,coverage_kind,assignment_origin,source_phrase,confidence,updated_at)
       values ($1,$2,'accepts','registry',$3,90,now())
       on conflict (source_id,term_id,coverage_kind) do update set source_phrase=excluded.source_phrase,confidence=excluded.confidence,updated_at=now()`,
      [canonicalSourceId, termId, "ingestion-v2 source manifest"],
    );
  }
  await client.query(
    `delete from opportunity_taxonomy_terms
     where opportunity_id=$1 and assignment_origin='registry' and source_phrase='ingestion-v2 source manifest'
       and not (term_id=any($2::text[]))`,
    [opportunityId, termIds],
  );
  for (const termId of termIds) {
    await client.query(
      `insert into opportunity_taxonomy_terms (opportunity_id,term_id,source_evidence_id,source_phrase,normalized_phrase,assignment_origin,certainty,"primary",updated_at)
       values ($1,$2,$3,$4,$4,'registry','probable',$5,now())
       on conflict (opportunity_id,term_id) do update set
         source_evidence_id=case when opportunity_taxonomy_terms.assignment_origin in ('organization','reviewer') then opportunity_taxonomy_terms.source_evidence_id else excluded.source_evidence_id end,
         assignment_origin=case when opportunity_taxonomy_terms.assignment_origin in ('organization','reviewer') then opportunity_taxonomy_terms.assignment_origin else excluded.assignment_origin end,
         certainty=case when opportunity_taxonomy_terms.assignment_origin in ('organization','reviewer') then opportunity_taxonomy_terms.certainty else excluded.certainty end,
         updated_at=now()`,
      [opportunityId, termId, evidenceId, "ingestion-v2 source manifest", termId === "taxterm_pf-writing-and-literature"],
    );
  }
}

async function writeDeadlineWindows(client: PoolClient, opportunityId: string, sourceUrl: string, resolved: ReturnType<typeof resolveCurrentDeadline>): Promise<void> {
  await client.query("delete from opportunity_call_windows where opportunity_id=$1", [opportunityId]);
  const today = new Date().toISOString().slice(0, 10);
  const dates = resolved.values.filter((date) => date >= today);
  for (const [index, date] of dates.entries()) {
    await client.query(
      `insert into opportunity_call_windows (id,opportunity_id,label,closes_at,kind,current,source_url,confidence,updated_at)
       values ($1,$2,$3,$4,'exact',$5,$6,'confirmed',now())`,
      [`${opportunityId}:window:${date}`, opportunityId, dates.length > 1 ? `Deadline ${index + 1}` : "Deadline", date, date === resolved.date, sourceUrl],
    );
  }
  if (!dates.length && ["rolling", "year-round", "seasonal"].includes(resolved.kind)) {
    const labels = { rolling: "Rolling submissions", "year-round": "Year-round submissions", seasonal: "Seasonal submissions" } as const;
    await client.query(
      `insert into opportunity_call_windows (id,opportunity_id,label,kind,current,source_url,confidence,updated_at)
       values ($1,$2,$3,$4,true,$5,'confirmed',now())`,
      [`${opportunityId}:window:${resolved.kind}`, opportunityId, labels[resolved.kind as keyof typeof labels], resolved.kind, sourceUrl],
    );
  }
}

async function upsertSource(client: PoolClient, source: SourceDefinition, id: string): Promise<void> {
  await client.query(
    `insert into opportunity_sources (id,name,url,kind,active,source_tier,follows_outbound_links,check_interval_hours,last_checked_at,last_successful_fetch_at,last_processed_at)
     values ($1,$2,$3,$4,true,0,true,$5,now(),now(),now())
     on conflict (id) do update set name=excluded.name,url=excluded.url,kind=excluded.kind,active=true,last_checked_at=now(),last_successful_fetch_at=now(),last_processed_at=now(),updated_at=now()`,
    [id, source.name, source.url, source.kind, Math.max(1, Math.round(source.schedule.cadenceHours))],
  );
}
