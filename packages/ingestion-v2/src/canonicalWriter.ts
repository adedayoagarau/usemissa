import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { ExtractionResult, SourceDefinition } from "./contracts.js";
import type { PublisherReview } from "./publisher.js";
import type { CandidatePublisherReview } from "./publisher.js";
import type { ShadowArtifact } from "./execution.js";
import { writeWithDeepSeek } from "./deepseekWriter.js";
import { resolveCurrentDeadline } from "./deadline.js";

function field(fields: ExtractionResult["fields"], name: string): string | undefined {
  const item = [...fields].reverse().find((candidate) => candidate.fieldName === name);
  return typeof item?.normalizedValue === "string" && item.normalizedValue.trim() ? item.normalizedValue.trim() : item?.rawValue?.trim() || undefined;
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
  deadline: string,
): Promise<CanonicalDuplicateMatch[]> {
  const opportunityId = canonicalId(authoritativeUrl);
  const destinationKey = normalizedDestinationKey(authoritativeUrl);
  const titleKeys = fieldValues(extraction.fields, "title").map(identityText).filter(Boolean);
  const organizationKeys = fieldValues(extraction.fields, "organization").map(identityText).filter((value) => value.length >= 4);
  const result = await db.query<CanonicalDuplicateMatch>(
    `select o.id, o.publication_state from opportunities o
     left join radar_organizations org on org.id = o.organization_id
     where o.id = $1
        or lower(regexp_replace(regexp_replace(split_part(split_part(coalesce(o.submission_url, ''), '?', 1), '#', 1), '^https?://(www\\.)?', '', 'i'), '/+$', '')) = $2
        or lower(regexp_replace(regexp_replace(split_part(split_part(coalesce(o.guidelines_url, ''), '?', 1), '#', 1), '^https?://(www\\.)?', '', 'i'), '/+$', '')) = $2
        or (
          regexp_replace(lower(o.title), '[^a-z0-9]+', '', 'g') = any($3::text[])
          and o.deadline_date = $4::date
          and cardinality($5::text[]) > 0
          and (
            regexp_replace(lower(coalesce(org.data->>'name', '')), '[^a-z0-9]+', '', 'g') = any($5::text[])
            or exists (
              select 1 from unnest($5::text[]) organization_key
              where regexp_replace(lower(coalesce(o.search_document, '')), '[^a-z0-9]+', '', 'g') like '%' || organization_key || '%'
            )
          )
        )
     order by case
       when o.id = $1 then 0
       when lower(regexp_replace(regexp_replace(split_part(split_part(coalesce(o.submission_url, ''), '?', 1), '#', 1), '^https?://(www\\.)?', '', 'i'), '/+$', '')) = $2 then 1
       when lower(regexp_replace(regexp_replace(split_part(split_part(coalesce(o.guidelines_url, ''), '?', 1), '#', 1), '^https?://(www\\.)?', '', 'i'), '/+$', '')) = $2 then 1
       else 2
     end, o.id
     limit 2`,
    [opportunityId, destinationKey, titleKeys, deadline, organizationKeys],
  );
  return result.rows;
}

export type CanonicalPromotionResult = { opportunityId: string; created: boolean; publicationState: "reviewable" };
export type CanonicalCandidateHandoffResult =
  | { opportunityId: string; status: "created-reviewable" | "updated-reviewable"; publicationState: "reviewable" }
  | { opportunityId: string; status: "duplicate-existing"; publicationState: "published" | "reviewable" | "suppressed" };

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
  const resolvedDeadline = resolveCurrentDeadline(extraction.fields, url);
  const deadline = resolvedDeadline.date;
  if (!deadline || resolvedDeadline.conflict) throw new Error("v2 candidate handoff requires one non-conflicting current explicit deadline");
  const type = field(extraction.fields, "opportunityType") ?? "other";
  const searchDocument = [title, organization, type, field(extraction.fields, "description")].filter(Boolean).join(" ").toLowerCase();
  const organizationConfirmed = Boolean(review.reconciliation.sourceIdentity.organization || review.reconciliation.destinationIdentity?.organization);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const semanticLock = [deadline, ...fieldValues(extraction.fields, "title").map(identityText).sort(), ...fieldValues(extraction.fields, "organization").map(identityText).sort()].join("|");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [semanticLock]);
    const existing = await findCanonicalDuplicateMatches(client, extraction, url, deadline);
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
      [opportunityId, `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 100)}-${opportunityId}`, title, canonicalSourceId, type, deadline, deadline ? "exact" : "unknown", url, new URL(url).host, searchDocument],
    );
    if (persisted.rowCount !== 1) throw new Error("v2 candidate handoff could not preserve the reviewable publication boundary");
    await client.query(
      `insert into opportunity_source_evidence (id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled,destination_reconciliation,verified_until)
       values ($1,$2,$3,$4,$5,$6,now(),now(),$7,true,$8::jsonb,null)
       on conflict (id) do update set checked_at=now(),processing_succeeded_at=now(),organization_confirmed=excluded.organization_confirmed,destination_reconciled=true,destination_reconciliation=excluded.destination_reconciliation`,
      [`${opportunityId}:evidence:${canonicalSourceId}`, opportunityId, canonicalSourceId, source.kind, source.name, source.url, organizationConfirmed, JSON.stringify(review.reconciliation)],
    );
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

async function upsertSource(client: PoolClient, source: SourceDefinition, id: string): Promise<void> {
  await client.query(
    `insert into opportunity_sources (id,name,url,kind,active,source_tier,follows_outbound_links,check_interval_hours,last_checked_at,last_successful_fetch_at,last_processed_at)
     values ($1,$2,$3,$4,true,0,true,$5,now(),now(),now())
     on conflict (id) do update set name=excluded.name,url=excluded.url,kind=excluded.kind,active=true,last_checked_at=now(),last_successful_fetch_at=now(),last_processed_at=now(),updated_at=now()`,
    [id, source.name, source.url, source.kind, Math.max(1, Math.round(source.schedule.cadenceHours))],
  );
}
