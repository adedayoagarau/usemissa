import type { Pool, PoolClient } from "pg";

type VersionHeadQueryable = Pool | PoolClient;

/**
 * ADR-006 canonical Opportunity version-head authority. The head is the single
 * source of truth for "which version is current" and is the lock target for the
 * guarded First-Save transaction. The material fingerprint is opaque to this
 * module: the canonical writer computes and stores it, and the guarded save
 * compares it byte-for-byte against what revalidation observed.
 */

export const OPPORTUNITY_VERSION_HEAD_TABLE = "opportunity_version_heads";

export type OpportunityVersionHead = {
  opportunityId: string;
  versionId: string;
  publicationState:
    | "draft"
    | "reviewable"
    | "published"
    | "suppressed"
    | "withdrawn";
  safetyState: "clear" | "disputed" | "removed" | "unsafe" | "unknown";
  materialFingerprint: string;
  canonicalAt: string;
};

export class OpportunityVersionHeadMissingError extends Error {
  constructor(public readonly opportunityId: string) {
    super("Opportunity has no canonical version head; save authority is unavailable.");
    this.name = "OpportunityVersionHeadMissingError";
  }
}

export class OpportunityRevalidationRequiredError extends Error {
  constructor(
    public readonly opportunityId: string,
    public readonly observedVersionId: string,
    public readonly currentVersionId: string,
  ) {
    super("Opportunity version changed after revalidation; revalidate before saving.");
    this.name = "OpportunityRevalidationRequiredError";
  }
}

interface HeadRow {
  opportunity_id: string;
  version_id: string;
  publication_state: OpportunityVersionHead["publicationState"];
  safety_state: OpportunityVersionHead["safetyState"];
  material_fingerprint: string;
  canonical_at: Date | string;
}

function headFromRow(row: HeadRow): OpportunityVersionHead {
  return {
    opportunityId: row.opportunity_id,
    versionId: row.version_id,
    publicationState: row.publication_state,
    safetyState: row.safety_state,
    materialFingerprint: row.material_fingerprint,
    canonicalAt:
      row.canonical_at instanceof Date
        ? row.canonical_at.toISOString()
        : row.canonical_at,
  };
}

/**
 * Atomically set (create or replace) the canonical head. A canonical
 * publication/correction writer must call this in the same transaction as the
 * projection and immutable version-row write so the head never advances ahead
 * of its backing rows.
 */
export async function setOpportunityVersionHead(
  client: VersionHeadQueryable,
  input: {
    opportunityId: string;
    versionId: string;
    publicationState: OpportunityVersionHead["publicationState"];
    safetyState: OpportunityVersionHead["safetyState"];
    materialFingerprint: string;
  },
): Promise<OpportunityVersionHead> {
  const result = await client.query<HeadRow>(
    `insert into ${OPPORTUNITY_VERSION_HEAD_TABLE}
       (opportunity_id, version_id, publication_state, safety_state, material_fingerprint, canonical_at)
     values ($1, $2, $3, $4, $5, now())
     on conflict (opportunity_id) do update set
       version_id = excluded.version_id,
       publication_state = excluded.publication_state,
       safety_state = excluded.safety_state,
       material_fingerprint = excluded.material_fingerprint,
       canonical_at = now()
     returning opportunity_id, version_id, publication_state, safety_state, material_fingerprint, canonical_at`,
    [
      input.opportunityId,
      input.versionId,
      input.publicationState,
      input.safetyState,
      input.materialFingerprint,
    ],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Opportunity version head insert returned no row.");
  }
  return headFromRow(row);
}

/** Read the current head without taking a lock. */
export async function readOpportunityVersionHead(
  client: VersionHeadQueryable,
  opportunityId: string,
): Promise<OpportunityVersionHead | null> {
  const result = await client.query<HeadRow>(
    `select opportunity_id, version_id, publication_state, safety_state, material_fingerprint, canonical_at
     from ${OPPORTUNITY_VERSION_HEAD_TABLE}
     where opportunity_id = $1`,
    [opportunityId],
  );
  const row = result.rows[0];
  return row ? headFromRow(row) : null;
}
