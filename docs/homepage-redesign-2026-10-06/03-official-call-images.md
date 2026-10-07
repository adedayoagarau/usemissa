# Official call images on cards

Checked 6 October 2026 against the live catalogue at usemissa.com.

## What ships today

The browse card already shows an official image when the call has one.
The image comes from `opportunity_identity_assets`, falls back to the
organization's asset, and only appears when its rights status is
`cleared` or `permitted`. Calls without one show a pale tint with the
organization name. Local development fixtures carry no images, which is
why local screenshots show only tints.

On the live catalogue's first page, 18 of 24 cards carry an image.
Those 18 cards use 15 distinct files, shown in
`03-live-card-images.png` as the card crops them:

| Kind | Count | Examples |
| --- | --- | --- |
| Logo, wordmark or favicon | 9 | YoungArts, Fulbright (white logo), Cave Canem favicon, O+, Lambda Literary, The Loft icon |
| Poster or graphic | 2 | Festival poster screenshot, abstract orange share image |
| Photograph | 3 | Pool scene, film still, Northern Stage building |
| Failed to load | 1 | arlingtonva.us refuses hotlinking (403) |

## Problems

- **Most are not photos.** Logos fill the card with `object-fit: cover`,
  so wordmarks are cropped mid-letter and a white logo sits on a pale
  tint.
- **Hotlinked from organizers' sites.** Images load from third-party
  servers. Some are plain `http`, some refuse hotlinking, and any can
  change or disappear without notice.
- **Rights are not actually reviewed.**
  `packages/radar-adapters/src/scripts/backfillRealOpportunityImages.ts`
  sets every `unknown` asset to `cleared` in bulk, so "cleared" does not
  mean a person checked it.

## Recommendation

Use official images, but only where they are photographs, and keep a
designed fallback for the rest.

1. **Cover only real photographs.** Use `candidate_kind` (already stored:
   `opportunity-artwork`, `venue/place`, `editorial-image` versus
   `organization-logo`) to decide. Logos never fill the cover.
2. **Logos become a small mark.** Show the logo contained in a white chip
   on the cover, over the illustrated type cover from the illustration
   packet (Packet A).
3. **Store a copy.** Copy approved images to Missa storage and serve them
   through `next/image`, instead of hotlinking.
4. **Review rights for real.** Stop bulk-clearing; keep share images
   (`og:image`) as presumptively shareable with attribution to the
   organizer, and review anything else.

With this split, most cards today would show the illustrated type cover
with the organizer's logo, and a minority would show a real photograph.
That is why Packet A is still the first illustration packet to produce.
