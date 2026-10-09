import { z } from "zod";
import {
  documentText,
  parseWritingDocument,
  serializeDocument,
  type JsonNode,
  type WritingDocument,
} from "./writing-document.ts";
import {
  isWritingEntryId,
  newWritingEntryId,
  WRITING_BODY_MAX,
  WRITING_TITLE_MAX,
} from "./writing.ts";
import {
  isWritingProjectId,
  isProjectTemplate,
  isPieceStatus,
  newWritingProjectId,
  type WritingProject,
  type PieceStatus,
} from "./writing-projects.ts";
import {
  parseCard,
  parseProjectPlan,
  type PieceCard,
} from "./writing-cards.ts";
import { studioDataSchema, type StudioData } from "./writing-studio-data.ts";
import { parseRevisionTools } from "./writing-revision-tools.ts";

export const PROJECT_BACKUP_FILE_MAX = 32_000_000;
export const PROJECT_RESTORE_BYTES_MAX = 4_000_000;
export type BackupPiece = {
  id: string;
  title: string;
  document: string;
  synopsis: string;
  status: PieceStatus;
  card: PieceCard;
};
export type ProjectBackup = {
  version: 1;
  project: WritingProject;
  pieces: BackupPiece[];
  studio: StudioData;
  deviceRevisions: Record<string, string | null>;
};
export type PreparedProjectRestore = ProjectBackup & {
  project: WritingProject;
};
const pieceSchema = z.object({
  id: z.string().refine(isWritingEntryId),
  title: z.string().max(WRITING_TITLE_MAX),
  document: z.string().max(2_000_000),
  synopsis: z.string().max(1_000).default(""),
  status: z.string().refine(isPieceStatus).default(""),
  card: z.unknown().default({}),
});
const projectSchema = z.object({
  id: z.string().refine(isWritingProjectId),
  title: z.string().max(WRITING_TITLE_MAX),
  template: z.string().refine(isProjectTemplate),
  plan: z.unknown().default({ plotlines: [] }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
const envelopeSchema = z.object({
  version: z.literal(1),
  project: projectSchema,
  pieces: z.array(pieceSchema).max(500),
  studio: z.unknown(),
  deviceRevisions: z
    .record(
      z.string().refine(isWritingEntryId),
      z.string().max(2_000_000).nullable(),
    )
    .default({}),
});

/** Missing default fields may be filled; supplied data must never be silently dropped. */
function suppliedFieldsSurvive(source: unknown, parsed: unknown): boolean {
  if (Array.isArray(source))
    return (
      Array.isArray(parsed) &&
      source.length === parsed.length &&
      source.every((value, i) => suppliedFieldsSurvive(value, parsed[i]))
    );
  if (source && typeof source === "object")
    return Boolean(
      parsed &&
      typeof parsed === "object" &&
      Object.entries(source).every(([key, value]) =>
        suppliedFieldsSurvive(value, Reflect.get(parsed as object, key)),
      ),
    );
  return source === parsed;
}
function validDocument(raw: string): WritingDocument {
  const parsed = parseWritingDocument(raw);
  if (!parsed)
    throw new Error(
      "A piece in this backup has an unreadable writing document.",
    );
  if (!suppliedFieldsSurvive(JSON.parse(raw), parsed))
    throw new Error(
      "This backup contains document data this version of Missa cannot keep. Keep the file and restore it with a compatible version.",
    );
  if (documentText(parsed).length > WRITING_BODY_MAX)
    throw new Error(
      "A piece in this backup is too long to save. Keep the backup and split that piece first.",
    );
  return parsed;
}
export function parseProjectBackup(raw: string): ProjectBackup {
  if (new TextEncoder().encode(raw).byteLength > PROJECT_BACKUP_FILE_MAX)
    throw new Error("Choose a project backup smaller than 32 MB.");
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new Error("This file is not a readable Missa project backup.");
  }
  const parsed = envelopeSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      "This file is not a supported version 1 Missa whole-project backup.",
    );
  const value = parsed.data;
  if (
    new Set(value.pieces.map((piece) => piece.id)).size !== value.pieces.length
  )
    throw new Error("Each piece in the backup needs a distinct ID.");
  const plan = parseProjectPlan(value.project.plan);
  if ("error" in plan) throw new Error(plan.error);
  if (!suppliedFieldsSurvive(value.project.plan, plan))
    throw new Error(
      "This backup contains planning data this version cannot keep.",
    );
  const studio = studioDataSchema.parse(value.studio);
  if (!suppliedFieldsSurvive(value.studio, studio))
    throw new Error(
      "This backup contains project notes this version of Missa cannot keep.",
    );
  const pieces = value.pieces.map((piece) => {
    const card = parseCard(piece.card);
    if ("error" in card) throw new Error(card.error);
    if (!suppliedFieldsSurvive(piece.card, card))
      throw new Error(
        "This backup contains piece metadata this version cannot keep.",
      );
    return {
      ...piece,
      status: piece.status as PieceStatus,
      card,
      document: serializeDocument(validDocument(piece.document)),
    };
  });
  for (const [id, notes] of Object.entries(value.deviceRevisions)) {
    if (!pieces.some((piece) => piece.id === id))
      throw new Error("Revision notes refer to a missing piece in the backup.");
    if (notes !== null) parseRevisionTools(notes);
  }
  return {
    version: 1,
    project: {
      ...value.project,
      template: value.project.template as WritingProject["template"],
      plan,
    },
    pieces,
    studio,
    deviceRevisions: value.deviceRevisions,
  };
}

/** The download includes the local draft, complete project notes and piece metadata. */
export function createProjectBackup(
  project: WritingProject,
  pieces: { id: string; title: string; doc: WritingDocument }[],
  studio: StudioData,
  deviceRevisions: Record<string, string | null>,
  metadata: {
    id: string;
    synopsis?: string;
    status?: string;
    card?: PieceCard;
  }[] = [],
): ProjectBackup {
  return parseProjectBackup(
    JSON.stringify({
      version: 1,
      project,
      pieces: pieces.map((piece) => {
        const item = metadata.find((value) => value.id === piece.id);
        return {
          id: piece.id,
          title: piece.title,
          document: serializeDocument(piece.doc),
          synopsis: item?.synopsis ?? "",
          status: item?.status ?? "",
          card: item?.card ?? {},
        };
      }),
      studio,
      deviceRevisions,
    }),
  );
}

/** Only exact internal entry destinations change. Authored prose and external links stay literal. */
export function remapDocument(raw: string, ids: Map<string, string>): string {
  const document = validDocument(raw);
  function visit(node: JsonNode) {
    for (const mark of node.marks ?? []) {
      if (mark.type !== "link" || typeof mark.attrs?.href !== "string")
        continue;
      const match =
        /^\/doc\?entry=(writing_[0-9a-f-]+)(#[A-Za-z0-9_-]+)?$/.exec(
          mark.attrs.href,
        );
      if (match && ids.has(match[1]!))
        mark.attrs.href = `/doc?entry=${ids.get(match[1]!)}${match[2] ?? ""}`;
    }
    (node.content ?? []).forEach(visit);
  }
  for (const page of document.pages) {
    visit(page.content);
    for (const block of page.blocks ?? []) visit(block.content);
  }
  return serializeDocument(document);
}
export function prepareProjectRestore(
  backup: ProjectBackup,
): PreparedProjectRestore {
  const ids = new Map<string, string>();
  const mapped = (id: string) => {
    if (!ids.has(id)) ids.set(id, newWritingEntryId());
    return ids.get(id)!;
  };
  backup.pieces.forEach((piece) => mapped(piece.id));
  backup.studio.revisions.checkpoints.forEach((checkpoint) =>
    checkpoint.pieces.forEach((piece) => mapped(piece.id)),
  );
  const studio = structuredClone(backup.studio);
  studio.structure.records.forEach((record) => {
    record.pieceIds = record.pieceIds.map(mapped);
  });
  studio.structure.gridRows.forEach((row) => {
    row.cells = Object.fromEntries(
      Object.entries(row.cells).map(([id, value]) => [mapped(id), value]),
    );
  });
  studio.structure.goal.pieceIds = studio.structure.goal.pieceIds.map(mapped);
  studio.structure.timeline.forEach((event) => {
    if (event.pieceId) event.pieceId = mapped(event.pieceId);
  });
  studio.structure.pieceValues = Object.fromEntries(
    Object.entries(studio.structure.pieceValues).map(([id, value]) => [
      mapped(id),
      value,
    ]),
  );
  studio.research.notes.forEach((note) => {
    note.pieceId = mapped(note.pieceId);
  });
  studio.revisions.checkpoints.forEach((checkpoint) => {
    checkpoint.id = crypto.randomUUID();
    checkpoint.pieces.forEach((piece) => {
      piece.id = mapped(piece.id);
      if (piece.document) piece.document = remapDocument(piece.document, ids);
    });
  });
  const pieces = backup.pieces.map((piece) => ({
    ...piece,
    id: mapped(piece.id),
    document: remapDocument(piece.document, ids),
  }));
  const deviceRevisions = Object.fromEntries(
    Object.entries(backup.deviceRevisions).map(([id, raw]) => [
      mapped(id),
      raw,
    ]),
  );
  const now = new Date().toISOString();
  const result: PreparedProjectRestore = {
    version: 1,
    project: {
      ...backup.project,
      id: newWritingProjectId(),
      title: `${backup.project.title || "Untitled project"} (restored)`.slice(
        0,
        WRITING_TITLE_MAX,
      ),
      createdAt: now,
      updatedAt: now,
    },
    pieces,
    studio,
    deviceRevisions,
  };
  parseProjectBackup(JSON.stringify(result));
  if (
    new TextEncoder().encode(JSON.stringify({ ...result, deviceRevisions: {} }))
      .byteLength > PROJECT_RESTORE_BYTES_MAX
  )
    throw new Error(
      "This backup is larger than the 4 MB account restore limit. Keep the file; no project was changed.",
    );
  return result;
}
