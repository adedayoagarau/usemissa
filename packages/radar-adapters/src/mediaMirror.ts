import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { put } from "@vercel/blob";
import { fetchWithPolicy } from "./mediaFetcher.js";
import { isPublicHttpUrl } from "./officialSiteResolver.js";
import { SERVABLE_ASSET_RIGHTS } from "./opportunityRepository.js";

/**
 * Copies the images Missa shows into Missa's own storage (Vercel Blob), so
 * cards no longer hotlink organizers' sites: some refuse hotlinking, some are
 * plain http, and any can change or vanish. The copy's URL is stored in the
 * asset's `metadata.storedUrl`, which the browse query prefers over the
 * original. Only images Missa may show are copied.
 */

type Queryable = Pick<PoolClient | Pool, "query">;

export const MAX_MIRRORED_IMAGE_BYTES = 5 * 1024 * 1024;

const MIRRORED_KINDS = "('opportunity-artwork', 'opportunity-cover', 'organization-banner', 'organization-mark')";

export interface StoredImage {
  url: string;
}

/** Saves image bytes publicly and returns the public URL. */
export type ImageStore = (pathname: string, bytes: Buffer, contentType: string) => Promise<StoredImage>;

/** Downloads an image; null when it cannot be fetched. */
export type ImageDownloader = (url: string) => Promise<{ bytes: Buffer; finalUrl: string } | null>;

export function vercelBlobImageStore(token = process.env.BLOB_READ_WRITE_TOKEN): ImageStore {
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is required to store images.");
  return async (pathname, bytes, contentType) => {
    const blob = await put(pathname, bytes, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });
    return { url: blob.url };
  };
}

/** Third-party image URLs are untrusted: only public addresses are fetched. */
export const downloadPublicImage: ImageDownloader = async (url) => {
  if (!(await isPublicHttpUrl(url))) return null;
  try {
    const fetched = await fetchWithPolicy(url, { expectedType: "image", maxBytes: MAX_MIRRORED_IMAGE_BYTES });
    if (!(await isPublicHttpUrl(fetched.finalUrl))) return null;
    const bytes = typeof fetched.body === "string" ? Buffer.from(fetched.body) : fetched.body;
    return { bytes, finalUrl: fetched.finalUrl };
  } catch {
    return null;
  }
};

/**
 * The image type read from the file's own bytes. SVG and anything else are
 * refused: a declared content type from a third-party server is not trusted.
 */
export function sniffImageType(bytes: Buffer): { contentType: string; extension: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { contentType: "image/png", extension: "png" };
  }
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString("latin1"))) {
    return { contentType: "image/gif", extension: "gif" };
  }
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") {
    return { contentType: "image/webp", extension: "webp" };
  }
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString("latin1") === "ftyp" && /^avi[fs]$/.test(bytes.subarray(8, 12).toString("latin1"))) {
    return { contentType: "image/avif", extension: "avif" };
  }
  return null;
}

export interface MirrorResult {
  checked: number;
  stored: number;
  failed: number;
}

/**
 * Copies shown images that have no stored copy yet. A failed copy is recorded
 * and retried after seven days; the card keeps the original URL meanwhile.
 */
export async function mirrorServedImages(
  client: Queryable,
  options: { store: ImageStore; download?: ImageDownloader; limit?: number; assetIds?: string[] },
): Promise<MirrorResult> {
  const download = options.download ?? downloadPublicImage;
  const { rows } = await client.query<{ id: string; url: string }>(
    `select a.id, a.url
     from opportunity_identity_assets a
     where ${SERVABLE_ASSET_RIGHTS}
       and a.kind in ${MIRRORED_KINDS}
       and a.url ~* '^https?://'
       and coalesce(a.metadata->>'storedUrl', '') = ''
       and coalesce((a.metadata->>'storeFailedAt')::timestamptz, '-infinity') < now() - interval '7 days'
       and ($1::text[] is null or a.id = any($1::text[]))
     order by a.created_at desc
     limit $2`,
    [options.assetIds ?? null, options.limit ?? null],
  );

  let stored = 0;
  let failed = 0;
  for (const row of rows) {
    const downloaded = await download(row.url);
    const type = downloaded && downloaded.bytes.length <= MAX_MIRRORED_IMAGE_BYTES ? sniffImageType(downloaded.bytes) : null;
    if (!downloaded || !type) {
      failed++;
      await client.query(
        `update opportunity_identity_assets
         set metadata = metadata || jsonb_build_object('storeFailedAt', now())
         where id = $1`,
        [row.id],
      );
      continue;
    }
    const digest = createHash("sha256").update(downloaded.bytes).digest("hex");
    try {
      const copy = await options.store(`missa/opportunity-media/${digest}.${type.extension}`, downloaded.bytes, type.contentType);
      await client.query(
        `update opportunity_identity_assets
         set metadata = (metadata - 'storeFailedAt') || jsonb_build_object(
           'storedUrl', $2::text, 'storedAt', now(), 'storedSha256', $3::text,
           'storedFrom', $4::text, 'storedContentType', $5::text)
         where id = $1`,
        [row.id, copy.url, digest, downloaded.finalUrl, type.contentType],
      );
      stored++;
    } catch {
      failed++;
      await client.query(
        `update opportunity_identity_assets
         set metadata = metadata || jsonb_build_object('storeFailedAt', now())
         where id = $1`,
        [row.id],
      );
    }
  }
  return { checked: rows.length, stored, failed };
}
