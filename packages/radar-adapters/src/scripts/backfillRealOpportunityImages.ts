import pg from "pg";
import { fetchWithPolicy } from "../mediaFetcher.js";
import { extractMediaCandidates, inferSourceRole } from "../mediaExtractor.js";
import { applyAutomaticRights } from "../mediaRightsRule.js";
import { insertMediaCandidate, promoteAttributedCandidate } from "../mediaCandidateStore.js";
import { mirrorServedImages, vercelBlobImageStore } from "../mediaMirror.js";
import type { CandidateStatus } from "../mediaExtractionContracts.js";

/**
 * Finds images for every published opportunity that has no image Missa may
 * show, and records each one in opportunity_media_candidates.
 *
 * This script never clears or permits rights. The one automatic rule applies:
 * an og:image from the organizer's own website is published as
 * `needs-attribution`, credited to the organizer, and a logo becomes the
 * organization's mark rather than a cover. Everything else waits in the
 * candidate queue for a person to review. See docs/media-rights-review.md.
 *
 * Usage: npx tsx src/scripts/backfillRealOpportunityImages.ts [--dry-run] [--limit=N] [--recheck]
 *   --limit    stop after N opportunities (default: all)
 *   --recheck  also revisit opportunities whose page was checked in the last 7 days
 */

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is required. Set it in the environment (or pass --env-file=.env.local).");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const recheck = args.includes("--recheck");
const limitArg = Number(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1]);
const limit = Number.isFinite(limitArg) && limitArg > 0 ? Math.floor(limitArg) : null;

const { Pool } = pg;
const pool = new Pool({ connectionString: dbUrl, max: 10 });
pool.on("error", (error) => console.warn("Idle database connection closed:", error.message));

type MissingRow = {
  id: string;
  title: string;
  page_url: string;
  organization_id: string | null;
  organization_confirmed: boolean;
  source_kind: string | null;
  source_authority_kind: string | null;
  organizer_name: string | null;
  organizer_website_url: string | null;
};

async function run() {
  console.log(`=== FINDING OFFICIAL IMAGES FOR OPPORTUNITIES${dryRun ? " (dry run)" : ""} ===`);

  // Published opportunities with no image Missa may show.
  const missing = await pool.query<MissingRow>(
    `select o.id, o.title,
            case when o.guidelines_url ~* '^https?://' then o.guidelines_url else o.submission_url end as page_url,
            o.organization_id,
            coalesce(e.organization_confirmed, false) as organization_confirmed,
            s.kind as source_kind,
            s.authority_kind as source_authority_kind,
            coalesce(org_profile.name, org.data->>'name') as organizer_name,
            coalesce(org_profile.website_url, org.data->>'website_url', org.data->>'websiteUrl', org.data->>'website')
              as organizer_website_url
     from opportunities o
     left join opportunity_sources s on s.id = o.source_id
     left join radar_organizations org on org.id = o.organization_id
     left join gary_profiles org_profile on org_profile.id = o.organization_id
     left join lateral (
       select organization_confirmed from opportunity_source_evidence
       where opportunity_id = o.id order by checked_at desc limit 1
     ) e on true
     where o.publication_state = 'published'
       and (o.guidelines_url ~* '^https?://' or o.submission_url ~* '^https?://')
       and not exists (
         select 1 from opportunity_identity_assets a
         where a.opportunity_id = o.id and a.rights_status in ('cleared', 'permitted', 'needs-attribution')
       )
       and ($1::boolean or not exists (
         select 1 from opportunity_media_candidates c
         where c.opportunity_id = o.id and c.retrieved_at > now() - interval '7 days'
       ))
     order by o.deadline_date asc nulls last, o.id
     limit $2`,
    [recheck, limit],
  );

  console.log(`Extracting images for ${missing.rows.length} opportunities without one...`);

  const byStatus: Partial<Record<CandidateStatus, number>> = {};
  let pagesFailed = 0;
  let published = 0;

  async function queueImagesFor(row: MissingRow) {
    let fetched;
    try {
      fetched = await fetchWithPolicy(row.page_url, { expectedType: "html", checkRobots: true });
    } catch {
      pagesFailed++;
      return;
    }
    const html = typeof fetched.body === "string" ? fetched.body : fetched.body.toString("utf-8");
    const extraction = extractMediaCandidates(
      html,
      {
        opportunityId: row.id,
        title: row.title,
        pageUrl: fetched.finalUrl,
        sourceRole: inferSourceRole(fetched.finalUrl, {
          sourceKind: row.source_kind ?? undefined,
          sourceAuthorityKind: row.source_authority_kind ?? undefined,
          organizationId: row.organization_id ?? undefined,
        }),
        organizationId: row.organization_id ?? undefined,
        organizationConfirmed: row.organization_confirmed,
      },
      fetched.redirectChain,
      fetched.httpStatus,
    );

    for (const extracted of extraction.candidates) {
      const candidate = applyAutomaticRights(extracted, {
        organizerName: row.organizer_name,
        organizerWebsiteUrl: row.organizer_website_url,
      });
      byStatus[candidate.status] = (byStatus[candidate.status] ?? 0) + 1;
      if (dryRun) {
        if (candidate.rightsStatus === "needs-attribution") published++;
        continue;
      }
      await insertMediaCandidate(pool, candidate, { opportunityId: row.id });
      if (await promoteAttributedCandidate(pool, candidate, { opportunityId: row.id, fallbackAlt: row.title })) published++;
    }
  }

  // Concurrent batches of 15
  for (let i = 0; i < missing.rows.length; i += 15) {
    await Promise.all(missing.rows.slice(i, i + 15).map(queueImagesFor));
  }

  console.log(`${dryRun ? "Would record" : "Recorded"} candidates by status:`, byStatus);
  console.log(`${dryRun ? "Would publish" : "Published"} official og:images credited to the organizer: ${published}`);
  console.log(`Pages that could not be fetched (or robots.txt disallowed): ${pagesFailed}`);
  console.log("No rights were cleared. Other candidates wait for review.");

  if (!dryRun && process.env.BLOB_READ_WRITE_TOKEN) {
    console.log("Stored copies:", await mirrorServedImages(pool, { store: vercelBlobImageStore() }));
  } else if (!dryRun) {
    console.log("BLOB_READ_WRITE_TOKEN is not set: images are still served from organizers' sites. Run media:mirror-images.");
  }

  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
