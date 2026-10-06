import type { Pool, PoolClient } from "pg";
import { extractMediaCandidates, inferSourceRole, isLogoLikeImage } from "./mediaExtractor.js";
import { fetchWithPolicy } from "./mediaFetcher.js";
import { applyAutomaticRights } from "./mediaRightsRule.js";
import { insertMediaCandidate, promoteAttributedCandidate } from "./mediaCandidateStore.js";
import type { DiscoveredMediaCandidate } from "./mediaExtractionContracts.js";

/**
 * One-off cleanup for identity assets that backfillRealOpportunityImages.ts
 * (before 6 October 2026) and ingestAllCanonicalData.ts marked `cleared`
 * without anyone reviewing them. Each is re-checked against the automatic
 * rule rather than simply hidden. The plan, and the owner approval it needs,
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
type Connection = Queryable & { release?: () => void };

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

export interface RecheckPage {
  html: string;
  finalUrl: string;
  redirectChain?: string[];
  httpStatus?: number;
}

/** Fetches an opportunity's official page; null when it cannot be read. */
export type RecheckPageFetcher = (url: string) => Promise<RecheckPage | null>;

export const fetchRecheckPage: RecheckPageFetcher = async (url) => {
  try {
    const fetched = await fetchWithPolicy(url, { expectedType: "html", checkRobots: true });
    const html = typeof fetched.body === "string" ? fetched.body : fetched.body.toString("utf-8");
    return { html, finalUrl: fetched.finalUrl, redirectChain: fetched.redirectChain, httpStatus: fetched.httpStatus };
  } catch {
    return null;
  }
};

export interface RecheckResult {
  /** Opportunities whose bulk-cleared images were re-checked. */
  opportunities: number;
  /** Bulk-cleared assets set to unknown (backed up first). */
  reverted: number;
  /** Opportunities whose organizer's own og:image is now shown, credited. */
  attributedImages: number;
  /** Of those, the og:image was the organizer's logo and became its mark. */
  attributedLogos: number;
  /** Opportunities whose page could not be fetched; their images wait for review. */
  pagesUnavailable: number;
  /** Opportunities whose page has no og:image the rule accepts; images wait for review. */
  needsReview: number;
  profileVisualCopiesRemoved: number;
  mediaJobsRequeued: number;
}

type RecheckOpportunity = {
  id: string;
  title: string;
  page_url: string | null;
  organization_id: string | null;
  organization_confirmed: boolean;
  source_kind: string | null;
  source_authority_kind: string | null;
  organizer_name: string | null;
  organizer_website_url: string | null;
};

/**
 * Re-checks every unreviewed `cleared` asset against the automatic rule
 * instead of simply hiding it.
 *
 * 1. Fetches each affected opportunity's official page (outside any
 *    transaction) and applies the rule to its images.
 * 2. In one transaction: backs up every row it changes, sets the bulk-cleared
 *    assets to `unknown`, removes their gary_profile_visuals copies, records
 *    the page's candidates, and publishes the organizer's own og:image as
 *    `needs-attribution` with the organizer's credit (a logo becomes the
 *    organization's mark).
 * 3. Requeues the media job for opportunities left without an image.
 *
 * Cards whose organizer has a qualifying og:image keep an image throughout.
 * With `dryRun`, pages are fetched and the result is computed, but nothing is
 * written. Fetching every page takes a while, so pass `connect` (for example
 * `() => pool.connect()`) to run the transaction on a fresh connection rather
 * than one left idle the whole time; otherwise `client` must be a dedicated
 * client, not a pool.
 */
export async function recheckUnreviewedClearedAssets(
  reader: Queryable,
  options: {
    approvedBy: string;
    dryRun?: boolean;
    fetchPage?: RecheckPageFetcher;
    concurrency?: number;
    connect?: () => Promise<Connection>;
  },
): Promise<RecheckResult> {
  const approvedBy = options.approvedBy.trim();
  if (!approvedBy && !options.dryRun) throw new Error("The owner's approval is required: pass the approver's name.");
  const fetchPage = options.fetchPage ?? fetchRecheckPage;

  const { rows: opportunities } = await reader.query<RecheckOpportunity>(
    `select o.id, o.title,
            case when o.guidelines_url ~* '^https?://' then o.guidelines_url
                 when o.submission_url ~* '^https?://' then o.submission_url end as page_url,
            o.organization_id,
            coalesce((select e.organization_confirmed from opportunity_source_evidence e
                      where e.opportunity_id = o.id order by e.checked_at desc limit 1), false) as organization_confirmed,
            s.kind as source_kind,
            s.authority_kind as source_authority_kind,
            coalesce(org_profile.name, org.data->>'name') as organizer_name,
            coalesce(org_profile.website_url, org.data->>'website_url', org.data->>'websiteUrl', org.data->>'website')
              as organizer_website_url
     from opportunities o
     left join opportunity_sources s on s.id = o.source_id
     left join radar_organizations org on org.id = o.organization_id
     left join gary_profiles org_profile on org_profile.id = o.organization_id
     where exists (select 1 from opportunity_identity_assets a where a.opportunity_id = o.id and ${UNREVIEWED_CLEARED_WHERE})
     order by o.id`,
  );

  // 1. Fetch and apply the rule, outside any transaction.
  const candidatesByOpportunity = new Map<string, DiscoveredMediaCandidate[]>();
  let pagesUnavailable = 0;
  const concurrency = Math.max(1, options.concurrency ?? 10);
  for (let i = 0; i < opportunities.length; i += concurrency) {
    await Promise.all(
      opportunities.slice(i, i + concurrency).map(async (row) => {
        const page = row.page_url ? await fetchPage(row.page_url) : null;
        if (!page) {
          pagesUnavailable++;
          return;
        }
        const extraction = extractMediaCandidates(
          page.html,
          {
            opportunityId: row.id,
            title: row.title,
            pageUrl: page.finalUrl,
            sourceRole: inferSourceRole(page.finalUrl, {
              sourceKind: row.source_kind ?? undefined,
              sourceAuthorityKind: row.source_authority_kind ?? undefined,
              organizationId: row.organization_id ?? undefined,
            }),
            organizationId: row.organization_id ?? undefined,
            organizationConfirmed: row.organization_confirmed,
          },
          page.redirectChain ?? [],
          page.httpStatus ?? 200,
        );
        candidatesByOpportunity.set(
          row.id,
          extraction.candidates.map((candidate) =>
            applyAutomaticRights(candidate, {
              organizerName: row.organizer_name,
              organizerWebsiteUrl: row.organizer_website_url,
            }),
          ),
        );
      }),
    );
  }

  const attributed = new Map<string, DiscoveredMediaCandidate>();
  for (const [opportunityId, candidates] of candidatesByOpportunity) {
    const official = candidates.find((candidate) => candidate.rightsStatus === "needs-attribution");
    if (official) attributed.set(opportunityId, official);
  }
  const attributedLogos = [...attributed.values()].filter((c) => c.candidateKind === "organization-logo").length;
  const titles = new Map(opportunities.map((row) => [row.id, row.title]));

  const { rows: countRows } = await reader.query<{ n: string }>(
    `select count(*) as n from opportunity_identity_assets a where ${UNREVIEWED_CLEARED_WHERE}`,
  );
  const summary = {
    opportunities: opportunities.length,
    attributedImages: attributed.size,
    attributedLogos,
    pagesUnavailable,
    needsReview: opportunities.length - attributed.size - pagesUnavailable,
  };
  if (options.dryRun) {
    return { ...summary, reverted: Number(countRows[0]?.n ?? 0), profileVisualCopiesRemoved: 0, mediaJobsRequeued: 0 };
  }

  // 2. One transaction: back up, revert, record candidates, publish credited og:images.
  const client: Connection = options.connect ? await options.connect() : reader;
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

    if (await tableExists(client, "opportunity_media_candidates")) {
      for (const [opportunityId, candidates] of candidatesByOpportunity) {
        for (const candidate of candidates) await insertMediaCandidate(client, candidate, { opportunityId });
      }
    }
    for (const [opportunityId, candidate] of attributed) {
      await promoteAttributedCandidate(client, candidate, { opportunityId, fallbackAlt: titles.get(opportunityId) });
    }

    // 3. Requeue media jobs for opportunities still without an image.
    let mediaJobsRequeued = 0;
    const withoutImage = [...new Set(reverted.rows.map((row) => row.opportunity_id))].filter((id) => !attributed.has(id));
    if (withoutImage.length > 0 && (await tableExists(client, "radar_enrichment_jobs"))) {
      const requeued = await client.query(
        `update radar_enrichment_jobs
         set status = 'queued', next_attempt_at = now(), lease_until = null, updated_at = now()
         where kind = 'media' and status in ('completed', 'failed') and opportunity_id = any($1::text[])`,
        [withoutImage],
      );
      mediaJobsRequeued = requeued.rowCount ?? 0;
    }

    await client.query("commit");
    return { ...summary, reverted: reverted.rowCount ?? 0, profileVisualCopiesRemoved, mediaJobsRequeued };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    if (options.connect) client.release?.();
  }
}

/**
 * Undoes recheckUnreviewedClearedAssets from its backup table: puts each
 * asset's rights back unless a person has reviewed it since, and reinserts the
 * removed profile visual copies. The organizer og:images it published stay,
 * because the automatic rule allows them.
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
