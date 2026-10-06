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

/**
 * Publishes a candidate the automatic rule marked `needs-attribution` (an
 * og:image from the organizer's own site) as the opportunity's identity asset,
 * credited to the organizer. A logo becomes the organization's mark, never a
 * card cover. An asset a person has reviewed is never overwritten.
 *
 * Returns the asset id, or undefined when the candidate does not qualify.
 */
export async function promoteAttributedCandidate(
  client: Pick<PoolClient | Pool, "query">,
  candidate: DiscoveredMediaCandidate,
  target: { opportunityId: string; fallbackAlt?: string },
): Promise<string | undefined> {
  if (candidate.rightsStatus !== "needs-attribution" || !candidate.attributionText) return undefined;
  const isLogo = candidate.candidateKind === "organization-logo";
  // An image is shared across the organization's other calls only when it
  // stands for the organization: its logo, or the image on its own page. A
  // poster for one call must not appear on the organizer's other calls.
  const organizationWide = isLogo || candidate.sourceRole === "organization-page";
  const assetId = `asset:og:${target.opportunityId}`;
  await client.query(
    `insert into opportunity_identity_assets
       (id, opportunity_id, url, alt, kind, rights_status, source_url, width, height,
        evidence_passage, attribution_requirement, permitted_scope, content_hash,
        inheritance_level, linked_organization_id, metadata, created_at)
     values ($1, $2, $3, $4, $5, 'needs-attribution', $6, $7, $8, $9, $10,
             'missa-catalogue-and-briefs', $11, $12, $13, $14::jsonb, now())
     on conflict (id) do update set
       url = excluded.url, alt = excluded.alt, kind = excluded.kind,
       rights_status = excluded.rights_status, source_url = excluded.source_url,
       width = excluded.width, height = excluded.height,
       evidence_passage = excluded.evidence_passage,
       attribution_requirement = excluded.attribution_requirement,
       content_hash = excluded.content_hash, inheritance_level = excluded.inheritance_level,
       linked_organization_id = excluded.linked_organization_id,
       metadata = opportunity_identity_assets.metadata || excluded.metadata
     where opportunity_identity_assets.reviewer is null and opportunity_identity_assets.reviewed_at is null`,
    [
      assetId,
      target.opportunityId,
      candidate.resolvedUrl,
      candidate.alt ?? target.fallbackAlt ?? null,
      isLogo ? "organization-mark" : "opportunity-artwork",
      candidate.pageUrl,
      candidate.width ?? null,
      candidate.height ?? null,
      `og:image published on ${candidate.pageUrl}, the organizer's own website.`,
      candidate.attributionText,
      candidate.contentHash ?? null,
      organizationWide ? "organization" : "opportunity",
      organizationWide ? (candidate.linkedOrganizationId ?? null) : null,
      JSON.stringify({
        rightsRule: candidate.metadata?.rightsRule ?? null,
        candidateKind: candidate.candidateKind,
        extractionMethod: candidate.extractionMethod,
      }),
    ],
  );
  return assetId;
}
