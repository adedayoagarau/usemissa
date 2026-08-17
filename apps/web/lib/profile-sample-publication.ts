import type { CopyBlobResult } from "@vercel/blob";
import {
  profileSampleKindForWork,
  PublicPortfolioValidationError,
  type ProfileSelectedWork,
  type ProfileSampleKind,
  type PublicPortfolioPublishInput,
  type RadarEngine,
} from "@missa/radar-engine";

type CopyBlob = (
  fromPathname: string,
  toPathname: string,
  options: {
    access: "public";
    addRandomSuffix: false;
    contentType: string;
    token?: string;
  },
) => Promise<CopyBlobResult>;

interface SampleDraft extends Record<string, unknown> {
  kind?: unknown;
  publicAssetUrl?: unknown;
  rightsConfirmed?: unknown;
  rightsConfirmedAt?: unknown;
}

interface WorkDraft extends Record<string, unknown> {
  id?: unknown;
  workId?: unknown;
  sampleSourceFileId?: unknown;
  sample?: unknown;
}

function publicSampleUrl(value: unknown, userId: string): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith(".public.blob.vercel-storage.com"))
      return undefined;
    if (!url.pathname.startsWith(`/missa/profiles/${userId}/samples/`))
      return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function contentTypeMatches(kind: ProfileSampleKind, contentType: string) {
  return contentType.startsWith(`${kind}/`);
}

function safeSuffix(filename: string): string {
  const match = filename.toLowerCase().match(/\.[a-z0-9]{1,8}$/u);
  return match?.[0] ?? "";
}

function invalid(message: string): never {
  throw new PublicPortfolioValidationError("selectedWorks", message);
}

function withoutPrivateFile(work: WorkDraft): Record<string, unknown> {
  const publicWork = { ...work };
  delete publicWork.sampleSourceFileId;
  return publicWork;
}

function withoutConfirmation(sample: SampleDraft): Record<string, unknown> {
  const publicSample = { ...sample };
  delete publicSample.rightsConfirmed;
  return publicSample;
}

export interface MaterializedProfileSamples {
  input: PublicPortfolioPublishInput;
  createdAssetUrls: string[];
}

/**
 * Converts owner-only sample references into public snapshot fields.
 * The returned object contains no Library file ID or private storage path.
 */
export async function materializeProfileSamples({
  body,
  userId,
  engine,
  now,
  copyBlob,
}: {
  body: Record<string, unknown>;
  userId: string;
  engine: RadarEngine;
  now: Date;
  copyBlob: CopyBlob;
}): Promise<MaterializedProfileSamples> {
  if (!Array.isArray(body.selectedWorks))
    invalid("Selected Work must be a list.");
  const sampleCount = body.selectedWorks.filter(
    (entry) =>
      Boolean(entry) &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      Boolean((entry as WorkDraft).sample),
  ).length;
  if (sampleCount > 1) invalid("Publish one featured sample at a time.");

  const currentById = new Map(
    (engine.store.users.get(userId)?.publicPortfolio?.selectedWorks ?? []).map(
      (work) => [work.id, work],
    ),
  );
  const createdAssetUrls: string[] = [];

  const selectedWorks = await Promise.all(
    body.selectedWorks.map(async (entry): Promise<Record<string, unknown>> => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry))
        return invalid("Each selected Work must be an object.");
      const work = entry as WorkDraft;
      if (!work.sample) return withoutPrivateFile(work);
      if (typeof work.sample !== "object" || Array.isArray(work.sample))
        return invalid("The public sample is not valid.");
      const sample = work.sample as SampleDraft;
      const publicationId = typeof work.id === "string" ? work.id : "";
      const existingSample = currentById.get(publicationId)?.sample;
      const confirmedNow = sample.rightsConfirmed === true;
      const rightsConfirmedAt =
        existingSample?.rightsConfirmedAt ??
        (confirmedNow ? now.toISOString() : undefined);
      if (!rightsConfirmedAt)
        return invalid("Confirm that you can publish this sample.");

      if (sample.kind === "text") {
        return {
          ...withoutPrivateFile(work),
          sample: { ...withoutConfirmation(sample), rightsConfirmedAt },
        };
      }

      const sourceWorkId = typeof work.workId === "string" ? work.workId : "";
      const sourceWork = engine.store.libraryWorks.get(sourceWorkId);
      if (!sourceWork || sourceWork.userId !== userId)
        return invalid("That Work is not available in your Library.");
      const sourceFileId =
        typeof work.sampleSourceFileId === "string"
          ? work.sampleSourceFileId
          : undefined;
      let publicAssetUrl = publicSampleUrl(sample.publicAssetUrl, userId);
      let contentType =
        typeof sample.contentType === "string" ? sample.contentType : undefined;

      if (sourceFileId) {
        const sourceFile = engine.store.libraryFiles.get(sourceFileId);
        if (
          !sourceFile ||
          sourceFile.userId !== userId ||
          sourceWork.fileId !== sourceFile.id
        )
          return invalid("That file is not attached to this Library Work.");
        const kind = profileSampleKindForWork(sourceWork, sourceFile);
        if (
          !kind ||
          kind === "text" ||
          !contentTypeMatches(kind, sourceFile.contentType)
        )
          return invalid("That Library file cannot be used as this sample.");
        const copied = await copyBlob(
          sourceFile.storageKey,
          `missa/profiles/${userId}/samples/${crypto.randomUUID()}${safeSuffix(sourceFile.filename)}`,
          {
            access: "public",
            addRandomSuffix: false,
            contentType: sourceFile.contentType,
            ...(process.env.BLOB_READ_WRITE_TOKEN
              ? { token: process.env.BLOB_READ_WRITE_TOKEN }
              : {}),
          },
        );
        publicAssetUrl = copied.url;
        contentType = sourceFile.contentType;
        createdAssetUrls.push(copied.url);
      } else if (
        !publicAssetUrl ||
        publicAssetUrl !== existingSample?.publicAssetUrl
      ) {
        return invalid("Choose the Library file again before publishing.");
      }

      return {
        ...withoutPrivateFile(work),
        sample: {
          ...withoutConfirmation(sample),
          publicAssetUrl,
          contentType,
          rightsConfirmedAt,
        },
      };
    }),
  );

  return {
    input: { ...body, selectedWorks } as unknown as PublicPortfolioPublishInput,
    createdAssetUrls,
  };
}

export function profileSampleAssetUrls(
  input: { selectedWorks?: ProfileSelectedWork[] } | undefined,
  userId: string,
): string[] {
  return (input?.selectedWorks ?? []).flatMap((work) => {
    const url = publicSampleUrl(work.sample?.publicAssetUrl, userId);
    return url ? [url] : [];
  });
}
