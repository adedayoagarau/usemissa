# Media provenance

Provenance records for media served from `apps/web/public`: the generation
prompt, origin, license, or attribution behind each asset.

Next.js serves everything under `public/`, so these records live here instead.
Each record sits at the same path as its asset, with `.json` appended:

| Asset                                        | Record                                                      |
| -------------------------------------------- | ----------------------------------------------------------- |
| `public/media/home/hero-artist-studio.webp`  | `media-provenance/media/home/hero-artist-studio.webp.json`  |
| `public/media/home/generated/community.webp` | `media-provenance/media/home/generated/community.webp.json` |

Image tools such as the Impeccable `generate-image.mjs` script write the
record beside the image. Move it here before committing.
`npm run check:public-media` fails when a record is left under `public/` or
when a record here no longer has a matching asset.
