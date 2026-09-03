import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { ReviewMediaParams } from "./mediaExtractionContracts.js";

export interface MediaReviewResult {
  reviewId: string;
  candidateId: string;
  opportunityId: string;
  decision: "cleared" | "permitted" | "rejected" | "needs-attribution";
  promotedAssetId?: string;
  rightsStatus: string;
}

export async function reviewMediaCandidate(
  client: PoolClient | Pool,
  params: ReviewMediaParams,
): Promise<MediaReviewResult> {
  const { rows: candidateRows } = await client.query<{
    id: string;
    opportunity_id: string;
    resolved_url: string;
    page_url: string;
    candidate_kind: string;
    alt: string | null;
    width: number | null;
    height: number | null;
    content_hash: string | null;
    inheritance_level: string;
    linked_organization_id: string | null;
    linked_program_id: string | null;
    metadata: Record<string, unknown>;
  }>(
    `select id, opportunity_id, resolved_url, page_url, candidate_kind, alt, width, height,
            content_hash, inheritance_level, linked_organization_id, linked_program_id, metadata
     from opportunity_media_candidates
     where id = $1`,
    [params.candidateId],
  );

  if (candidateRows.length === 0) {
    throw new Error(`Candidate ${params.candidateId} not found`);
  }

  const candidate = candidateRows[0];
  const reviewId = randomUUID();

  // 1. Insert review decision record
  await client.query(
    `insert into opportunity_media_reviews
       (id, candidate_id, opportunity_id, reviewer, decision, evidence_passage,
        attribution_requirement, approved_crop, permitted_scope, reviewed_alt,
        notes, decided_at, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, now(), now())`,
    [
      reviewId,
      params.candidateId,
      params.opportunityId,
      params.reviewer,
      params.decision,
      params.evidencePassage ?? null,
      params.attributionRequirement ?? null,
      params.approvedCrop ? JSON.stringify(params.approvedCrop) : null,
      params.permittedScope ?? "missa-catalogue-and-briefs",
      params.reviewedAlt ?? null,
      params.notes ?? null,
    ],
  );

  // 2. Update candidate record status and rights_status
  await client.query(
    `update opportunity_media_candidates
     set status = $2, rights_status = $2, updated_at = now()
     where id = $1`,
    [params.candidateId, params.decision],
  );

  let promotedAssetId: string | undefined;

  // 3. If cleared or permitted: promote into opportunity_identity_assets
  if (params.decision === "cleared" || params.decision === "permitted") {
    promotedAssetId = randomUUID();
    const assetKind =
      candidate.candidate_kind === "organization-logo"
        ? "organization-mark"
        : "opportunity-cover";
    const finalAlt = params.reviewedAlt ?? candidate.alt;

    await client.query(
      `insert into opportunity_identity_assets
         (id, opportunity_id, url, alt, kind, rights_status, source_url, width, height,
          reviewer, reviewed_at, evidence_passage, attribution_requirement,
          approved_crop, permitted_scope, content_hash, inheritance_level,
          linked_organization_id, linked_program_id, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), $11, $12, $13::jsonb, $14, $15, $16, $17, $18, $19::jsonb, now())`,
      [
        promotedAssetId,
        candidate.opportunity_id,
        candidate.resolved_url,
        finalAlt ?? null,
        assetKind,
        params.decision,
        candidate.page_url,
        candidate.width,
        candidate.height,
        params.reviewer,
        params.evidencePassage ?? null,
        params.attributionRequirement ?? null,
        params.approvedCrop ? JSON.stringify(params.approvedCrop) : null,
        params.permittedScope ?? "missa-catalogue-and-briefs",
        candidate.content_hash,
        candidate.inheritance_level,
        candidate.linked_organization_id,
        candidate.linked_program_id,
        JSON.stringify({ candidateId: candidate.id, reviewId }),
      ],
    );
  }

  return {
    reviewId,
    candidateId: params.candidateId,
    opportunityId: params.opportunityId,
    decision: params.decision,
    promotedAssetId,
    rightsStatus: params.decision,
  };
}
