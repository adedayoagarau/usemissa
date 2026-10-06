import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { DiscoveredMediaCandidate } from "./mediaExtractionContracts.js";

/**
 * Records an extracted image in the review queue. A candidate that is already
 * queued keeps its status and rights: a later extraction never overwrites a
 * review decision.
 */
export async function insertMediaCandidate(
  client: Pick<PoolClient | Pool, "query">,
  candidate: DiscoveredMediaCandidate,
  target: { opportunityId: string; jobId?: string | null },
): Promise<void> {
  await client.query(
    `insert into opportunity_media_candidates
       (id, opportunity_id, job_id, original_url, resolved_url, page_url,
        source_role, candidate_kind, alt, caption, title, width, height,
        mime_type, file_size, retrieved_at, http_status, redirect_chain,
        content_hash, attribution_text, inheritance_level,
        linked_organization_id, linked_program_id, extraction_method,
        parser_version, confidence, rejection_reasons, status, rights_status,
        metadata, created_at, updated_at)
     values
       ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        now(), $16, $17::jsonb, $18, $19, $20, $21, $22, $23, $24, $25,
        $26, $27, $28, $29::jsonb, now(), now())
     on conflict (opportunity_id, resolved_url) do update set
       updated_at = now(),
       http_status = excluded.http_status,
       redirect_chain = excluded.redirect_chain,
       rejection_reasons = excluded.rejection_reasons,
       metadata = opportunity_media_candidates.metadata || excluded.metadata`,
    [
      randomUUID(),
      target.opportunityId,
      target.jobId ?? null,
      candidate.originalUrl,
      candidate.resolvedUrl,
      candidate.pageUrl,
      candidate.sourceRole,
      candidate.candidateKind,
      candidate.alt ?? null,
      candidate.caption ?? null,
      candidate.title ?? null,
      candidate.width ?? null,
      candidate.height ?? null,
      candidate.mimeType ?? null,
      candidate.fileSize ?? null,
      candidate.httpStatus ?? null,
      JSON.stringify(candidate.redirectChain ?? []),
      candidate.contentHash ?? null,
      candidate.attributionText ?? null,
      candidate.inheritanceLevel,
      candidate.linkedOrganizationId ?? null,
      candidate.linkedProgramId ?? null,
      candidate.extractionMethod,
      candidate.parserVersion,
      candidate.confidence,
      candidate.rejectionReasons,
      candidate.status,
      candidate.rightsStatus,
      JSON.stringify(candidate.metadata ?? {}),
    ],
  );
}
