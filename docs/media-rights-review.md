# Media rights review

Status: rule in force from 6 October 2026. The cleanup of rows that were
already cleared in bulk waits for the owner's approval (see the end of this
page).

## Problem

`packages/radar-adapters/src/scripts/backfillRealOpportunityImages.ts` began
with an `UPDATE` that set `rights_status = 'cleared'` on every
`opportunity_identity_assets` row that was `unknown` and passed a few URL
spam filters. It then inserted new `og:image` URLs as `cleared` too.
`packages/radar-adapters/src/scripts/ingestAllCanonicalData.ts` did the same
for hero images. The public browse query serves `cleared` and `permitted`
images on cards, so these images went live, hotlinked from organizers' sites,
without anyone checking their rights.

A check of the live catalogue on 6 October 2026 found 15 distinct card
images. 9 were logos or favicons, 2 were graphics, 3 were photographs, and 1
failed to load because the host refused hotlinking
(`docs/homepage-redesign-2026-10-06/03-official-call-images.md` on the
`claude/homepage-product-led` branch).

## What "cleared" means now

`cleared` and `permitted` mean a person recorded the decision through
`reviewMediaCandidate` (`packages/radar-adapters/src/mediaReviewService.ts`).
That function always writes `reviewer` and `reviewed_at`. A `cleared` row
without both was cleared by a script.

No script or worker writes `cleared` or `permitted`:

- `backfillRealOpportunityImages.ts` (`npm run media:queue-missing-images`)
  no longer updates rights and never writes `opportunity_identity_assets`.
  It extracts images with the same extractor as the enrichment worker and
  queues them in `opportunity_media_candidates` for review. It accepts
  `--dry-run` and `--limit=N`.
- `ingestAllCanonicalData.ts` inserts hero images as `unknown`.
- The enrichment worker already wrote candidates as `unknown`, and still does.

## The automatic rule

`decideAutomaticRights` in `packages/radar-adapters/src/mediaRightsRule.ts`,
version `official-share-image-v1`.

An organizer sets its page's `og:image` so that other sites show that image
when they link to the page. When the page is on the organizer's own website,
Missa treats the image as shareable with credit. All of these must hold:

| Condition | Why |
| --- | --- |
| The candidate was not rejected by the extractor's heuristics | Tracking pixels, favicons, stock photos, platform branding and similar are excluded first |
| It came from the page's `og:image` (not `twitter:image`, JSON-LD, or a page image) | The organizer chose this image for sharing |
| The page is an official opportunity page or the organization's page | Portals, directories, program pages and attachments do not qualify |
| The page's host is the organizer's recorded website or a subdomain of it | The page belongs to the organizer. The website comes from `gary_profiles.website_url` or `radar_organizations.data` |
| Neither the page, the image nor the recorded website is on a listing site (`LISTING_SITE_HOSTS`) | A listing site's page or CDN does not belong to any one organizer |
| The organizer has a name | The name is the attribution |

When all hold, the candidate becomes `needs-attribution` with the
attribution `Image: <organizer name>`. Otherwise it stays `unknown`. The
reason is stored in the candidate's `metadata.rightsRule`.

The rule never returns `cleared` or `permitted`. The browse query does not
serve `needs-attribution`, because cards cannot show a credit line yet. So
the rule changes the order of the review queue, not what the public sees.
Deciding whether cards should show a credit is an open question for the
owner (see "Decisions for the owner").

### Logos stay distinguishable from photographs

Share images are often the site logo. The extractor now stores an
`og:image` or `twitter:image` as `candidate_kind = 'organization-logo'` when
`isLogoLikeImage` matches:

- its file name or alt text says logo, logotype, wordmark, brandmark,
  lockup, emblem, monogram, site icon or favicon (but not "catalogo");
- or it is square and no larger than 600px.

Everything else stays `opportunity-artwork`. HTML alone cannot tell a
photograph from a poster, so that distinction is left to the reviewer.

A logo can carry the organizer's credit like any other official share image.
When a reviewer approves it, `reviewMediaCandidate` promotes it as
`organization-mark`, a kind that card covers never use.

## Reviewing a candidate

Call `reviewMediaCandidate` with the candidate id, a reviewer and one of
these decisions:

- `cleared`: Missa holds the rights, or the organizer granted them. Put the
  evidence in `evidencePassage`.
- `permitted`: the organizer permits this use. Record the credit in
  `attributionRequirement`. For a `needs-attribution` candidate, use the
  candidate's `attribution_text`.
- `needs-attribution` or `rejected`: recorded on the candidate only. Nothing
  is promoted.

Only `cleared` and `permitted` reach `opportunity_identity_assets` and the
cards.

## Cleanup of rows already cleared in bulk

Not yet run. Do not run `--apply` against production until the owner has
approved it below.

### Which rows

```sql
rights_status = 'cleared' AND reviewer IS NULL AND reviewed_at IS NULL
```

The report breaks these down by origin. Ids beginning `asset_` come from
`backfillRealOpportunityImages.ts`, ids beginning `asset:hero:` come from
`ingestAllCanonicalData.ts`, and everything else is counted as other.
`permitted` rows are not touched, because no script wrote `permitted`.

### Steps

1. **Report.** Nothing changes:
   ```sh
   DATABASE_URL=... npm run media:revert-bulk-cleared --workspace=@missa/radar-adapters
   ```
   The report shows the total, counts by origin, by kind, and how many look
   like logos. It also shows how many are card images on published
   opportunities, how many published opportunities would lose their only card
   image, and how many copies `backfillProfileVisuals.ts` made into
   `gary_profile_visuals`. Attach the output to the approval below.
2. **Rehearse.** Run `--apply` against a Neon branch or a restored copy of
   production. Check the counts match the report, then run `--restore` there
   to confirm it undoes the change.
3. **Apply** after approval:
   ```sh
   DATABASE_URL=... npm run media:revert-bulk-cleared --workspace=@missa/radar-adapters -- --apply --approved-by="<owner name>"
   ```
   In one transaction, this:
   - copies every affected row into `media_rights_revert_backup_2026_10`;
   - sets those assets to `unknown` and records `metadata.rightsRevert` with
     the approver and time;
   - deletes the `gary_profile_visuals` copies made from those assets;
   - requeues each affected opportunity's completed or failed `media` job.
     The enrichment worker then queues fresh candidates for review. Jobs
     blocked by `robots.txt` stay blocked.
4. **Review.** Work through the queued candidates. Within the rule,
   `needs-attribution` candidates are the fastest to confirm.

### Effect on the site

Each affected card loses its image. A card falls back to its organization's
reviewed image if one exists. Failing that, it shows the tint with the
organization name. On 6 October, 18 of 24 first-page cards had an image.
Expect most of those to show the tint until review catches up. That is the
recommended state anyway for the 9 that were logos.

### Rollback

```sh
DATABASE_URL=... npm run media:revert-bulk-cleared --workspace=@missa/radar-adapters -- --restore
```

This restores each asset's previous rights, unless a person has reviewed the
asset since. It also reinserts the deleted profile visual copies. The backup
table stays until the owner drops it.

### Not covered

- `gary_profile_visuals` rows from sources other than identity assets, such
  as `gary_organization_media`, have no rights column. The browse query uses
  them as a third fallback, logos included. They need their own review.
- Images are still hotlinked. Copying approved images to Missa storage is a
  separate change.

## Decisions for the owner

- [ ] Approve the cleanup: approver ______, date ______, report output
      attached.
- [ ] Should cards show `needs-attribution` images with a visible credit
      line? Until they do, those images stay off the cards.
- [ ] Should the enrichment worker apply the automatic rule too? It
      currently writes every candidate as `unknown`, which is safe. The rule
      would need the organizer's name and website added to the claimed job.
