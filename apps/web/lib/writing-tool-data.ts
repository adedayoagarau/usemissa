import { z } from "zod";
import {
  parseRevisionTools,
  emptyRevisionTools,
} from "./writing-revision-tools";
export const writingToolKind = z.enum(["checks", "dictionary", "revisions"]);
export type WritingToolKind = z.infer<typeof writingToolKind>;
const stringList = (max: number, length: number) =>
  z.array(z.string().max(length)).max(max);
export const checkSettingsSchema = z
  .object({
    dialect: z.number().int().min(0).max(4),
    disabledRules: stringList(500, 100),
    ignoredHashes: z.array(z.string().regex(/^\d{1,20}$/)).max(2000),
  })
  .strict();
export const dictionarySchema = z
  .object({ words: stringList(2000, 100) })
  .strict();
const anchorSchema = z
  .object({
    source: z.string().max(200),
    from: z.number().int().min(0).max(10000000),
    to: z.number().int().min(0).max(10000000),
    original: z.string().max(200000),
    signature: z.string().max(500000),
  })
  .strict()
  .refine((value) => value.to >= value.from);
const revisionDataSchema = z
  .object({
    version: z.literal(1),
    suggestions: z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            anchor: anchorSchema,
            replacement: z.string().max(200000),
          })
          .strict(),
      )
      .max(1000),
    comments: z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            anchor: anchorSchema,
            text: z.string().max(20000),
            kind: z
              .enum(["Verify this", "Revisit", "Keep this passage"])
              .optional(),
            resolved: z.boolean(),
          })
          .strict(),
      )
      .max(1000),
    cuttings: z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            text: z.string().max(200000),
            createdAt: z.string().max(100),
            richSlice: z.record(z.string(), z.unknown()).optional(),
          })
          .strict(),
      )
      .max(1000),
  })
  .strict();
export function parseToolData(kind: WritingToolKind, value: unknown): unknown {
  if (kind === "checks") return checkSettingsSchema.parse(value);
  if (kind === "dictionary") return dictionarySchema.parse(value);
  const raw = JSON.stringify(value);
  if (raw.length > 1000000) throw new Error("Revision notes are too large");
  const state = revisionDataSchema.parse(parseRevisionTools(raw));
  if (
    state.comments.length > 1000 ||
    state.suggestions.length > 1000 ||
    state.cuttings.length > 1000
  )
    throw new Error("Too many revision records");
  return state;
}
export const emptyToolData = (kind: WritingToolKind) =>
  kind === "checks"
    ? { dialect: 0, disabledRules: [], ignoredHashes: [] }
    : kind === "dictionary"
      ? { words: [] }
      : emptyRevisionTools();
export type WritingToolRecord = { revision: number; data: unknown };

export function hasWritingToolLocal(key: string | null) {
  try {
    return Boolean(
      key && typeof window !== "undefined" && localStorage.getItem(key),
    );
  } catch {
    return false;
  }
}

export function toolLoadIsCurrent(
  requestToken: number,
  currentToken: number,
  incomingRevision: number,
  knownRevision: number | null,
) {
  return (
    requestToken === currentToken &&
    (knownRevision === null || incomingRevision >= knownRevision)
  );
}
