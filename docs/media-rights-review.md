# Media rights review

Status: owner decisions recorded 6 October 2026. The code is ready; the
production run waits for this branch to be merged and deployed (see
"Running it across all opportunities").

## Problem

`packages/radar-adapters/src/scripts/backfillRealOpportunityImages.ts` began
with an `UPDATE` that set `rights_status = 'cleared'` on every
`opportunity_identity_assets` row that was `unknown` and passed a few URL
spam filters. It then inserted new `og:image` URLs as `cleared` too.
`packages/radar-adapters/src/scripts/ingestAllCanonicalData.ts` did the same
for hero images. The browse query serves `cleared` and `permitted` images on
cards, so these images went live, hotlinked from organizers' sites, without
anyone checking their rights.

A check of the live catalogue on 6 October 2026 found 15 distinct card
images. 9 were logos or favicons, 2 were graphics, 3 were photographs, and 1
failed to load because the host refused hotlinking
(`docs/homepage-redesign-2026-10-06/03-official-call-images.md` on the
`claude/homepage-product-led` branch).

## Owner decisions (6 October 2026)

1. **Use organizers' `og:image`s across all opportunities, credited to the
   organizer.** An organizer publishes its page's `og:image` so that other
   sites show it when they link to the page.
2. **Do not print the credit on the website.** The credit is recorded in the
   data and in each opportunity page's structured data instead (see
   "Where the credit lives"). Alt text keeps describing the image.
3. **Logos are shown as a small mark, never as a cover.**
4. **Re-check the bulk-cleared images rather than hiding them.**
5. **Serve Missa's own copy of each image instead of hotlinking.**

## What each rights status means

| Status | Meaning | Shown on cards |
| --- | --- | --- |
| `cleared` | A person recorded that Missa holds the rights or the organizer granted them (`reviewMediaCandidate`, which writes `reviewer` and `reviewed_at`) | Yes |
| `permitted` | A person recorded that the organizer permits this use | Yes |
| `needs-attribution` | The organizer's own `og:image`, published by the automatic rule, with the credit in `attribution_requirement` | Yes, when the credit is recorded |
| `unknown` | Not yet reviewed | No |
| `rejected` | A person rejected it | No |

The browse query's rule is `SERVABLE_ASSET_RIGHTS` in
`packages/radar-adapters/src/opportunityRepository.ts`. No script or worker
writes `cleared` or `permitted`; `ingestAllCanonicalData.ts` now inserts hero
images as `unknown`.

## The automatic rule

`decideAutomaticRights` in `packages/radar-adapters/src/mediaRightsRule.ts`,
version `official-share-image-v1`. All of these must hold:

| Condition | Why |
| --- | --- |
| The extractor's heuristics did not reject the image | Tracking pixels, favicons, stock photos, platform branding and similar are excluded first |
| It is the page's `og:image` (not `twitter:image`, JSON-LD, or a page image) | The organizer chose this image for sharing |
| The page is an official opportunity page or the organization's page | Portals, directories, program pages and attachments do not qualify |
| The page's host is the organizer's recorded website or a subdomain of it | The page belongs to the organizer. The website comes from `gary_profiles.website_url` or `radar_organizations.data` |
| Neither the page, the image nor the recorded website is on a listing site (`LISTING_SITE_HOSTS`) | A listing site's page or CDN does not belong to any one organizer |
| The organizer has a name | The name is the credit |

When all hold, `promoteAttributedCandidate`
(`packages/radar-adapters/src/mediaCandidateStore.ts`) publishes the image as
the opportunity's identity asset `asset:og:<opportunity id>`:

- `rights_status = 'needs-attribution'`;
- `attribution_requirement = 'Image: <organizer name>'`;
- `source_url` is the organizer's page, and `evidence_passage` says where the
  image was found;
- `reviewer` and `reviewed_at` stay empty, because no person reviewed it.

It never overwrites an asset a person has reviewed. Everything the rule does
not accept stays `unknown` in `opportunity_media_candidates` for review.

The rule runs in three places:

- the enrichment worker, for every opportunity it processes from now on;
- `npm run media:queue-missing-images`, for every published opportunity
  without an image;
- the one-off re-check of bulk-cleared images (below).

### Logos

The extractor stores a share image as `candidate_kind = 'organization-logo'`
when `isLogoLikeImage` matches:

- its file name or alt text says logo, logotype, wordmark, brandmark,
  lockup, emblem, monogram, site icon or favicon (but not "catalogo");
- or it is square and no larger than 600px.

A logo is published as `organization-mark`. The browse query never uses that
kind as a cover. It returns the logo separately as `identityLogoUrl`, and
cards without an official image show it as a 48px `OrganizationMark` on the
plate (`apps/web/components/missa/organization-mark.tsx`). The query also no
longer uses `gary_profile_visuals` logos as covers.

An image from one call's page is not shared with the organizer's other calls.
Only a logo, or an image from the organization's own page, is linked to the
organization.

### Where the credit lives

- `opportunity_identity_assets.attribution_requirement`, with
  `source_url` and `evidence_passage`;
- the browse projection's `identityAssetCredit` (not displayed);
- the opportunity page's JSON-LD: `primaryImageOfPage` is an `ImageObject`
  with `creditText` and `creator` (the organizer), built by
  `identityImageJsonLd` in `apps/web/lib/seo.tsx`.

Alt text is not used for the credit. Screen readers use it to describe the
picture, and sighted visitors never see it.

If an organizer asks for an image to be removed, set that asset's
`rights_status` to `rejected` with a `reviewer` and `reviewed_at`. The rule
will not publish it again.

## Missa's stored copies

`mirrorServedImages` (`packages/radar-adapters/src/mediaMirror.ts`) copies
every image Missa shows into Vercel Blob at
`missa/opportunity-media/<sha256>.<ext>`. It records the copy in the asset's
`metadata.storedUrl`, which the browse query prefers over the original. It:

- fetches public addresses only (`isPublicHttpUrl`), before and after
  redirects;
- reads the image type from the file's bytes: JPEG, PNG, GIF, WebP or AVIF,
  never SVG;
- refuses files over 5 MB;
- records a failure as `metadata.storeFailedAt` and retries after seven days.
  The card keeps the original URL meanwhile.

The enrichment worker copies each newly published image when
`BLOB_READ_WRITE_TOKEN` is set. `npm run media:mirror-images` copies the rest.

## Running it across all opportunities

Run these in order. Step 2 must wait for step 1: the live site only shows
`needs-attribution` images once the new browse query is deployed.

1. **Merge and deploy** the web app and the workers. Give the enrichment
   worker (Railway) the web app's `BLOB_READ_WRITE_TOKEN` so new images are
   stored as they are published.
2. **Re-check the bulk-cleared images.** First preview it; this fetches each
   page but writes nothing:
   ```sh
   DATABASE_URL=... npm run media:recheck-bulk-cleared --workspace=@missa/radar-adapters -- --dry-run
   ```
   Then run it:
   ```sh
   DATABASE_URL=... BLOB_READ_WRITE_TOKEN=... npm run media:recheck-bulk-cleared --workspace=@missa/radar-adapters -- --apply --approved-by="<owner name>"
   ```
   For every bulk-cleared asset
   (`rights_status = 'cleared' AND reviewer IS NULL AND reviewed_at IS NULL`),
   this fetches the opportunity's page first, outside any transaction. Then,
   in one transaction, it:
   - backs up every changed row to `media_rights_revert_backup_2026_10`;
   - sets the bulk-cleared assets to `unknown`;
   - deletes their copies in `gary_profile_visuals`;
   - records the page's images as candidates;
   - publishes the organizer's current `og:image`, credited.

   Opportunities still without an image get their media job requeued. Cards
   whose organizer has a qualifying `og:image` keep an image throughout.
   Afterwards it copies the images to Blob.
3. **Fill in every other opportunity:**
   ```sh
   DATABASE_URL=... BLOB_READ_WRITE_TOKEN=... npm run media:queue-missing-images --workspace=@missa/radar-adapters
   ```
   This goes through every published opportunity without an image. It
   accepts `--dry-run`, `--limit=N`, and `--recheck` (revisit pages checked in
   the last seven days).
4. **Copy anything left over:**
   `npm run media:mirror-images --workspace=@missa/radar-adapters`.

### Rollback

```sh
DATABASE_URL=... npm run media:recheck-bulk-cleared --workspace=@missa/radar-adapters -- --restore
```

This puts each bulk-cleared asset's old rights back, unless a person has
reviewed it since, and reinserts the deleted profile visual copies. The
credited organizer images it published stay, because the rule allows them.
The backup table stays until the owner drops it.

## Reviewing other images

Candidates the rule does not accept wait in `opportunity_media_candidates`.
Record a decision with `reviewMediaCandidate`:

- `cleared` or `permitted` publishes the image;
- `rejected` or `needs-attribution` is recorded on the candidate only.

## Not covered

- `gary_profile_visuals` banners and issue covers from sources other than
  identity assets have no rights column. They remain the third fallback for
  covers.
- The legacy unused cards `opportunity-card.tsx` and
  `opportunity-detail-panel.tsx` were not changed.
