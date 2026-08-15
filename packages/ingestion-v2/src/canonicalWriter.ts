import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { ExtractionResult, SourceDefinition } from "./contracts.js";
import type { PublisherReview } from "./publisher.js";
import type { ShadowArtifact } from "./execution.js";
import { writeWithDeepSeek } from "./deepseekWriter.js";
import { parseDate, isPlausibleOpportunityDate } from "@missa/radar-engine";

function field(fields: ExtractionResult["fields"], name: string): string | undefined {
  const item = [...fields].reverse().find((candidate) => candidate.fieldName === name);
  return typeof item?.normalizedValue === "string" && item.normalizedValue.trim() ? item.normalizedValue.trim() : item?.rawValue?.trim() || undefined;
}
function canonicalId(url: string): string { return `opp_v2_${createHash("sha256").update(url).digest("hex").slice(0, 32)}`; }
function sourceId(source: SourceDefinition): string { return `v2_source_${createHash("sha256").update(source.url).digest("hex").slice(0, 24)}`; }
/**
 * Adapters emit deadlines as whatever the page said — "January 15, 2027",
 * "Deadline: March 1", sometimes ISO. The previous ISO-only check discarded
 * everything else, which is why 63% of reviewable records had no deadline and
 * could never pass the publication gate's freshness check. parseDate handles
 * the formats opportunity pages actually use and infers a missing year
 * forward, never backward; the plausibility guard then rejects anything that
 * parsed but cannot be a real opportunity date.
 */
export function normalizeOpportunityDeadline(value: string | undefined, now = new Date()): { date: string; inferred: boolean } | null {
  if (!value) return null;
  const parsed = parseDate(value, now);
  if (!parsed) return null;
  if (!isPlausibleOpportunityDate(parsed.date, now)) return null;
  return { date: parsed.date, inferred: parsed.yearInferred };
}

export type CanonicalPromotionResult = { opportunityId: string; created: boolean; publicationState: "reviewable" };

/** Idempotently writes approved v2 evidence to canonical storage; it never writes public state. */
export async function promoteApprovedArtifact(pool: Pool, source: SourceDefinition, artifact: ShadowArtifact): Promise<CanonicalPromotionResult> {
  const review: PublisherReview | undefined = artifact.publisher;
  if (!review || review.decision !== "approve" || review.reconciliation.decision !== "pass") throw new Error("v2 promotion requires an approved, reconciled publisher review");
  const url = review.reconciliation.authoritativeUrl;
  const title = field(artifact.extraction.fields, "title");
  if (!url || !title) throw new Error("v2 promotion requires an authoritative URL and title");
  const opportunityId = canonicalId(url);
  const canonicalSourceId = sourceId(source);
  const organization = field(artifact.extraction.fields, "organization");
  const normalizedDeadline = normalizeOpportunityDeadline(field(artifact.extraction.fields, "deadline"));
  const deadline = normalizedDeadline?.date ?? null;
  // A deadline already behind us must never be written as an open call the
  // browse query has to defend against; the record still lands, reviewable
  // and closed, so history is kept without pretending it is actionable.
  const today = new Date().toISOString().slice(0, 10);
  const status = deadline && deadline < today ? "closed" : "open";
  // "inferred" is not a deadline kind the app understands (the UI switches on
  // exact/rolling/until-filled/unknown/conflicting) — year inference is a
  // confidence matter, and the parsed date itself is exact.
  const deadlineKind = deadline ? "exact" : "unknown";
  const type = field(artifact.extraction.fields, "opportunityType") ?? "other";
  const searchDocument = [title, organization, type, field(artifact.extraction.fields, "description")].filter(Boolean).join(" ").toLowerCase();
  const organizationConfirmed = Boolean(review.reconciliation.sourceIdentity.organization || review.reconciliation.destinationIdentity?.organization);
  const client = await pool.connect();
  try {
    await ensurePromotionSchema(client);
    await client.query("begin");
    await upsertSource(client, source, canonicalSourceId);
    const existing = await client.query("select id from opportunities where id = $1", [opportunityId]);
    await client.query(
      `insert into opportunities (id,slug,title,source_id,status,publication_state,type,genres,deadline_date,deadline_kind,fee_status,guidelines_url,submission_url,submission_host,submission_state,search_document,source_checked_at,processing_succeeded_at,last_changed_at,created_at,updated_at)
       values ($1,$2,$3,$4,$11,'reviewable',$5,'{}'::text[],$6,$7,'unknown',$8,$8,$9,'available',$10,now(),now(),now(),now(),now())
       on conflict (id) do update set title=excluded.title,source_id=excluded.source_id,status=excluded.status,type=excluded.type,deadline_date=excluded.deadline_date,deadline_kind=excluded.deadline_kind,guidelines_url=excluded.guidelines_url,submission_url=excluded.submission_url,submission_host=excluded.submission_host,submission_state=excluded.submission_state,search_document=excluded.search_document,source_checked_at=excluded.source_checked_at,processing_succeeded_at=excluded.processing_succeeded_at,last_changed_at=excluded.last_changed_at,updated_at=now()`,
      [opportunityId, `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 100)}-${opportunityId}`, title, canonicalSourceId, type, deadline, deadlineKind, url, new URL(url).host, searchDocument, status],
    );
    await client.query(
      `insert into opportunity_source_evidence (id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled,destination_reconciliation,verified_until)
       values ($1,$2,$3,$4,$5,$6,now(),now(),$7,true,$8::jsonb,null)
       on conflict (id) do update set checked_at=now(),processing_succeeded_at=now(),organization_confirmed=excluded.organization_confirmed,destination_reconciled=true,destination_reconciliation=excluded.destination_reconciliation`,
      [`${opportunityId}:evidence:${canonicalSourceId}`, opportunityId, canonicalSourceId, source.kind, source.name, source.url, organizationConfirmed, JSON.stringify(review.reconciliation)],
    );
    const content = await writeWithDeepSeek({ title, organization, type, deadline, authoritativeUrl: url, fields: artifact.extraction.fields });
    await client.query(
      `insert into opportunity_contents (opportunity_id,input_version,builder_version,content,review_status,review_score,review_reasons,review_checks,generated_at,updated_at)
       values ($1,$2,$3,$4::jsonb,'pending',0,'[]'::jsonb,'{}'::jsonb,$5,now())
       on conflict (opportunity_id) do update set input_version=excluded.input_version,builder_version=excluded.builder_version,content=excluded.content,review_status='pending',review_score=0,review_reasons='[]'::jsonb,review_checks='{}'::jsonb,generated_at=excluded.generated_at,updated_at=now()`,
      [opportunityId, artifact.run.id, content.builderVersion, JSON.stringify(content), content.generatedAt],
    );
    await client.query("commit");
    return { opportunityId, created: !existing.rows[0], publicationState: "reviewable" };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
}

async function ensurePromotionSchema(client: PoolClient): Promise<void> {
  await client.query("alter table opportunity_source_evidence add column if not exists destination_reconciled boolean not null default false");
  await client.query("alter table opportunity_source_evidence add column if not exists destination_reconciliation jsonb not null default '{}'::jsonb");
}

async function upsertSource(client: PoolClient, source: SourceDefinition, id: string): Promise<void> {
  await client.query(
    `insert into opportunity_sources (id,name,url,kind,active,source_tier,follows_outbound_links,check_interval_hours,last_checked_at,last_successful_fetch_at,last_processed_at)
     values ($1,$2,$3,$4,true,0,true,$5,now(),now(),now())
     on conflict (id) do update set name=excluded.name,url=excluded.url,kind=excluded.kind,active=true,last_checked_at=now(),last_successful_fetch_at=now(),last_processed_at=now(),updated_at=now()`,
    [id, source.name, source.url, source.kind, Math.max(1, Math.round(source.schedule.cadenceHours))],
  );
}
