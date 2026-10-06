import type { Pool, PoolClient } from "pg";
import { isLogoLikeImage } from "./mediaExtractor.js";

/**
 * One-off cleanup for identity assets that backfillRealOpportunityImages.ts
 * (before 6 October 2026) and ingestAllCanonicalData.ts marked `cleared`
 * without anyone reviewing them. The plan, and the owner approval it needs,
 * is in docs/media-rights-review.md.
 *
 * A reviewed asset always has a reviewer and a review time, because
 * reviewMediaCandidate writes both. A cleared asset with neither was cleared
 * by a script.
 */
export const UNREVIEWED_CLEARED_WHERE =
  "a.rights_status = 'cleared' and a.reviewer is null and a.reviewed_at is null";

export const RIGHTS_REVERT_BACKUP_TABLE = "media_rights_revert_backup_2026_10";

type Queryable = Pick<PoolClient | Pool, "query">;

const CARD_KINDS = "('opportunity-artwork', 'opportunity-cover')";

export interface UnreviewedClearedReport {
  total: number;
  byOrigin: Record<string, number>;
  byKind: Record<string, number>;
  /** Assets whose file name, alt text or shape says logo, favicon or icon. */
  logoLike: number;
  /** Assets a card can show today: a card kind on a published opportunity. */
  onCards: number;
  /** Published opportunities whose card would fall back to the tint. */
  opportunitiesLosingCardImage: number;
  /** Copies already made into gary_profile_visuals by backfillProfileVisuals. */
  profileVisualCopies: number;
}

async function tableExists(client: Queryable, table: string): Promise<boolean> {
  const { rows } = await client.query<{ exists: boolean }>(
    "select to_regclass($1) is not null as exists",
    [table],
  );
  return Boolean(rows[0]?.exists);
}

function tally(rows: Array<{ key: string; n: number | string }>): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row.key, Number(row.n)]));
}

export async function reportUnreviewedClearedAssets(client: Queryable): Promise<UnreviewedClearedReport> {
  const { rows: assets } = await client.query<{
    id: string;
    url: string;
    alt: string | null;
    width: number | null;
    height: number | null;
  }>(`select a.id, a.url, a.alt, a.width, a.height from opportunity_identity_assets a where ${UNREVIEWED_CLEARED_WHERE}`);

  const { rows: origins } = await client.query<{ key: string; n: string }>(
    `select case
              when a.id like 'asset\\_%' escape '\\' then 'backfillRealOpportunityImages'
              when a.id like 'asset:hero:%' then 'ingestAllCanonicalData'
              else 'other'
            end as key, count(*) as n
     from opportunity_identity_assets a where ${UNREVIEWED_CLEARED_WHERE} group by 1`,
  );
  const { rows: kinds } = await client.query<{ key: string; n: string }>(
    `select a.kind as key, count(*) as n
     from opportunity_identity_assets a where ${UNREVIEWED_CLEARED_WHERE} group by 1`,
  );
  const { rows: cards } = await client.query<{ n: string }>(
    `select count(*) as n
     from opportunity_identity_assets a
     join opportunities o on o.id = a.opportunity_id
     where ${UNREVIEWED_CLEARED_WHERE} and a.kind in ${CARD_KINDS} and o.publication_state = 'published'`,
  );
  const { rows: losing } = await client.query<{ n: string }>(
    `select count(distinct o.id) as n
     from opportunities o
     join opportunity_identity_assets a on a.opportunity_id = o.id
     where o.publication_state = 'published' and a.kind in ${CARD_KINDS} and ${UNREVIEWED_CLEARED_WHERE}
       and not exists (
         select 1 from opportunity_identity_assets kept
         where kept.opportunity_id = o.id and kept.kind in ${CARD_KINDS}
           and kept.rights_status in ('cleared', 'permitted')
           and (kept.reviewer is not null or kept.reviewed_at is not null)
       )`,
  );

  let profileVisualCopies = 0;
  if (await tableExists(client, "gary_profile_visuals")) {
    const { rows } = await client.query<{ n: string }>(
      `select count(*) as n
       from gary_profile_visuals v
       join opportunity_identity_assets a on a.id = v.metadata->>'sourceId'
       where v.metadata->>'source' = 'opportunity_identity_assets' and ${UNREVIEWED_CLEARED_WHERE}`,
    );
    profileVisualCopies = Number(rows[0]?.n ?? 0);
  }

  return {
    total: assets.length,
    byOrigin: tally(origins),
    byKind: tally(kinds),
    logoLike: assets.filter((asset) =>
      isLogoLikeImage({
        resolvedUrl: asset.url,
        alt: asset.alt ?? undefined,
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
      }),
    ).length,
    onCards: Number(cards[0]?.n ?? 0),
    opportunitiesLosingCardImage: Number(losing[0]?.n ?? 0),
    profileVisualCopies,
  };
}

export interface RevertResult {
  reverted: number;
  profileVisualCopiesRemoved: number;
  mediaJobsRequeued: number;
}

/**
 * Sets every unreviewed `cleared` asset back to `unknown`, removes the copies
 * made from them into gary_profile_visuals, and requeues the opportunity's
 * media job so its images return through the review queue. Every changed row
 * is copied into the backup table first; restoreRevertedAssets undoes it.
 *
 * Runs in one transaction. Pass a dedicated client, not a pool.
 */
export async function revertUnreviewedClearedAssets(
  client: Queryable,
  options: { approvedBy: string; requeueMedia?: boolean },
): Promise<RevertResult> {
  const approvedBy = options.approvedBy.trim();
  if (!approvedBy) throw new Error("The owner's approval is required: pass the approver's name.");

  await client.query("begin");
  try {
    await client.query(
      `create table if not exists ${RIGHTS_REVERT_BACKUP_TABLE} (
         source_table text not null,
         row_id text not null,
         row_data jsonb not null,
         approved_by text not null,
         backed_up_at timestamptz not null default now(),
         primary key (source_table, row_id)
       )`,
    );
    await client.query(
      `insert into ${RIGHTS_REVERT_BACKUP_TABLE} (source_table, row_id, row_data, approved_by)
       select 'opportunity_identity_assets', a.id, to_jsonb(a), $1
       from opportunity_identity_assets a where ${UNREVIEWED_CLEARED_WHERE}
       on conflict (source_table, row_id) do nothing`,
      [approvedBy],
    );

    let profileVisualCopiesRemoved = 0;
    if (await tableExists(client, "gary_profile_visuals")) {
      await client.query(
        `insert into ${RIGHTS_REVERT_BACKUP_TABLE} (source_table, row_id, row_data, approved_by)
         select 'gary_profile_visuals', v.id, to_jsonb(v), $1
         from gary_profile_visuals v
         join opportunity_identity_assets a on a.id = v.metadata->>'sourceId'
         where v.metadata->>'source' = 'opportunity_identity_assets' and ${UNREVIEWED_CLEARED_WHERE}
         on conflict (source_table, row_id) do nothing`,
        [approvedBy],
      );
      const removed = await client.query(
        `delete from gary_profile_visuals v
         using opportunity_identity_assets a
         where a.id = v.metadata->>'sourceId'
           and v.metadata->>'source' = 'opportunity_identity_assets' and ${UNREVIEWED_CLEARED_WHERE}`,
      );
      profileVisualCopiesRemoved = removed.rowCount ?? 0;
    }

    const reverted = await client.query<{ opportunity_id: string }>(
      `update opportunity_identity_assets a
       set rights_status = 'unknown',
           metadata = a.metadata || jsonb_build_object('rightsRevert', jsonb_build_object(
             'from', 'cleared',
             'reason', 'cleared in bulk without review',
             'approvedBy', $1::text,
             'revertedAt', now()))
       where ${UNREVIEWED_CLEARED_WHERE}
       returning a.opportunity_id`,
      [approvedBy],
    );

    let mediaJobsRequeued = 0;
    const opportunityIds = [...new Set(reverted.rows.map((row) => row.opportunity_id))];
    if (options.requeueMedia !== false && opportunityIds.length > 0 && (await tableExists(client, "radar_enrichment_jobs"))) {
      const requeued = await client.query(
        `update radar_enrichment_jobs
         set status = 'queued', next_attempt_at = now(), lease_until = null, updated_at = now()
         where kind = 'media' and status in ('completed', 'failed') and opportunity_id = any($1::text[])`,
        [opportunityIds],
      );
      mediaJobsRequeued = requeued.rowCount ?? 0;
    }

    await client.query("commit");
    return { reverted: reverted.rowCount ?? 0, profileVisualCopiesRemoved, mediaJobsRequeued };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

/**
 * Undoes revertUnreviewedClearedAssets from its backup table: puts each
 * asset's rights back unless a person has reviewed it since, and reinserts the
 * removed profile visual copies.
 */
export async function restoreRevertedAssets(client: Queryable): Promise<{ restored: number; profileVisualCopiesRestored: number }> {
  await client.query("begin");
  try {
    const restored = await client.query(
      `update opportunity_identity_assets a
       set rights_status = b.row_data->>'rights_status',
           metadata = a.metadata - 'rightsRevert'
       from ${RIGHTS_REVERT_BACKUP_TABLE} b
       where b.source_table = 'opportunity_identity_assets' and b.row_id = a.id
         and a.rights_status = 'unknown' and a.reviewer is null and a.reviewed_at is null`,
    );
    let profileVisualCopiesRestored = 0;
    if (await tableExists(client, "gary_profile_visuals")) {
      const visuals = await client.query(
        `insert into gary_profile_visuals
         select (jsonb_populate_record(null::gary_profile_visuals, b.row_data)).*
         from ${RIGHTS_REVERT_BACKUP_TABLE} b
         where b.source_table = 'gary_profile_visuals'
         on conflict (id) do nothing`,
      );
      profileVisualCopiesRestored = visuals.rowCount ?? 0;
    }
    await client.query("commit");
    return { restored: restored.rowCount ?? 0, profileVisualCopiesRestored };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
