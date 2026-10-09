import { z } from "zod";
import { structureSchema, EMPTY_STRUCTURE } from "./writing-structure.ts";
import { researchSchema, EMPTY_RESEARCH } from "./writing-research-notes.ts";
import {
  revisionSchema,
  EMPTY_REVISIONS,
  type WritingCheckpoint,
} from "./writing-revisions.ts";
import { isWritingEntryId } from "./writing.ts";

export const STUDIO_BYTES_MAX = 8_000_000;
export const studioDataSchema = z
  .object({
    version: z.literal(1).default(1),
    structure: structureSchema.default(EMPTY_STRUCTURE),
    research: researchSchema.default(EMPTY_RESEARCH),
    revisions: revisionSchema.default(EMPTY_REVISIONS),
  })
  .superRefine((data, context) => {
    if (
      new TextEncoder().encode(JSON.stringify(data)).byteLength >
      STUDIO_BYTES_MAX
    ) {
      context.addIssue({
        code: "custom",
        message: "This project studio is too large to save.",
      });
    }
    const checkpoints = data.revisions.checkpoints;
    if (
      new Set(checkpoints.map((checkpoint) => checkpoint.id)).size !==
        checkpoints.length ||
      checkpoints.some(
        (checkpoint) =>
          new Set(checkpoint.pieces.map((piece) => piece.id)).size !==
          checkpoint.pieces.length,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Each checkpoint and piece needs its own ID.",
      });
    }
  });
export type StudioData = z.infer<typeof studioDataSchema>;
export type StudioRecord = { data: StudioData; revision: number };
export const EMPTY_STUDIO: StudioData = studioDataSchema.parse({});
export const studioSaveSchema = z
  .object({
    data: studioDataSchema,
    baseRevision: z.number().int().min(0).max(2_147_483_646),
  })
  .strict();
export const readerCommentSchema = z
  .object({
    pieceId: z.string().refine(isWritingEntryId),
    quote: z.string().min(1).max(2_000),
    body: z.string().trim().min(1).max(5_000),
  })
  .strict();
export type ReaderCommentInput = z.infer<typeof readerCommentSchema>;
export type ReaderComment = ReaderCommentInput & {
  id: string;
  createdAt: string;
};
export type ReaderShare = {
  id: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
};
export type ReaderCopy = {
  checkpoint: WritingCheckpoint;
  comments: ReaderComment[];
  expiresAt: string;
};

/** Stop reading before an untrusted body exceeds the limit, including chunked requests. */
export async function boundedWritingJson(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  if (
    Number(request.headers.get("content-length") ?? 0) > maxBytes ||
    !request.body
  )
    return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return undefined;
  } finally {
    reader.releaseLock();
  }
}
