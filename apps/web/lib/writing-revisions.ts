import { z } from "zod";
import { isWritingEntryId } from "./writing.ts";
import { parseWritingDocument, proposedWritingDocument, documentText, serializeDocument } from "./writing-document.ts";

export const checkpointPieceSchema = z.object({
  id: z.string().refine(isWritingEntryId),
  title: z.string().max(200),
  body: z.string().max(500_000),
  document: z.string().max(2_000_000).nullable().refine((value) => value === null || parseWritingDocument(value) !== null),
});
export const checkpointSchema = z.object({
  id: z.string().uuid(), name: z.string().trim().min(1).max(120),
  createdAt: z.string().datetime(),
  pieces: z.array(checkpointPieceSchema).max(100),
});
export const revisionSchema = z.object({
  version: z.literal(1).default(1),
  checkpoints: z.array(checkpointSchema).max(10).default([]),
}).refine((value) => JSON.stringify(value).length <= 5_000_000, "Keep checkpoints under 5 MB. Download an older copy before removing it.");
export type WritingCheckpoint = z.infer<typeof checkpointSchema>;
export type RevisionState = z.infer<typeof revisionSchema>;
export const EMPTY_REVISIONS: RevisionState = { version: 1, checkpoints: [] };

/** Reader links expose only the proposed manuscript, while private history retains every mark. */
export function readerCheckpoint(checkpoint: WritingCheckpoint): WritingCheckpoint {
  return { ...checkpoint, pieces: checkpoint.pieces.flatMap((piece) => {
    const source = piece.document ? parseWritingDocument(piece.document) : null;
    if (source?.purpose === "research") return [];
    if (!source) return [piece];
    const doc = proposedWritingDocument(source);
    return [{ ...piece, body: documentText(doc), document: serializeDocument(doc) }];
  }) };
}
