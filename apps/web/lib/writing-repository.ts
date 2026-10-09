import {
  parseToolData,
  emptyToolData,
  type WritingToolKind,
  type WritingToolRecord,
} from "./writing-tool-data.ts";
import { readerCheckpoint } from "./writing-revisions.ts";
import { isDeepStrictEqual } from "node:util";
import { documentText, parseWritingDocument } from "./writing-document.ts";
import {
  parseProjectBackup,
  type PreparedProjectRestore,
} from "./writing-project-backup.ts";
import { CreatorRepositoryBase, creatorPoolFor } from "@missa/radar-adapters";
import {
  countWords,
  newWritingEntryId,
  sameWritingContent,
  writingPreview,
  WRITING_LIST_LIMIT,
  type WritingEntry,
  type WritingEntrySummary,
  type WritingSaveRequest,
} from "./writing.ts";
import {
  PROJECT_TEMPLATES,
  PROJECTS_MAX,
  type PieceChange,
  type ProjectTemplateId,
  type WritingProject,
} from "./writing-projects.ts";
import {
  SNAPSHOTS_PER_PIECE,
  NAMED_VERSIONS_PER_PIECE,
  NamedVersionLimitError,
  type SnapshotRequest,
  type WritingSnapshot,
  type WritingSnapshotSummary,
} from "./writing-snapshots.ts";
import { storedCard, storedPlan, type ProjectPlan } from "./writing-cards.ts";
import { createHash, randomUUID } from "node:crypto";
import { checkpointSchema } from "./writing-revisions.ts";
import {
  EMPTY_STUDIO,
  studioDataSchema,
  type StudioRecord,
  type StudioData,
  readerCommentSchema,
  type ReaderShare,
  type ReaderCopy,
  type ReaderComment,
  type ReaderCommentInput,
} from "./writing-studio-data.ts";

/**
 * The only code that reads or writes creator_writing_entries,
 * creator_writing_projects and creator_writing_snapshots (migrations 0095 to
 * 0100).
 * Every query is scoped to one account. writing-boundary.test.ts fails when
 * another file names the table, so nothing else can read a creator's writing.
 */

type Row = {
  id: string;
  title: string;
  body?: string;
  document?: string | null;
  preview?: string;
  project_id: string | null;
  position: number;
  synopsis: string;
  status: string;
  call_id: string | null;
  card: unknown;
  word_count: number;
  revision: number;
  created_at: Date;
  updated_at: Date;
};

export type WritingSaveResult =
  | { kind: "saved"; entry: WritingEntrySummary }
  | { kind: "conflict"; current: WritingEntry }
  | { kind: "not-found" };

const CARD_COLUMNS = "project_id,position,synopsis,status,call_id,card";
const SUMMARY_COLUMNS = `id,title,left(regexp_replace(btrim(left(body,400)),'\\s+',' ','g'),120) as preview,${CARD_COLUMNS},word_count,revision,created_at,updated_at`;
const ENTRY_COLUMNS = `id,title,body,document,${CARD_COLUMNS},word_count,revision,created_at,updated_at`;
const PROJECT_COLUMNS = "id,title,template,plan,created_at,updated_at";

type ProjectRow = {
  id: string;
  title: string;
  template: ProjectTemplateId;
  plan: unknown;
  created_at: Date;
  updated_at: Date;
};

type SnapshotRow = {
  id: string;
  name: string;
  title: string;
  word_count: number;
  created_at: Date;
  body?: string;
  document?: string | null;
};

const SNAPSHOT_SUMMARY = "id,name,title,word_count,created_at";

function validReaderToken(token: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    token,
  );
}
function readerTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function snapshotSummary(row: SnapshotRow): WritingSnapshotSummary {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    wordCount: row.word_count,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function project(row: ProjectRow): WritingProject {
  return {
    id: row.id,
    title: row.title,
    template: row.template,
    plan: storedPlan(row.plan),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function summary(row: Row): WritingEntrySummary {
  return {
    id: row.id,
    title: row.title,
    projectId: row.project_id,
    position: row.position,
    synopsis: row.synopsis,
    status: row.status,
    callId: row.call_id ?? null,
    card: storedCard(row.card),
    preview: writingPreview(row.preview ?? row.body ?? ""),
    wordCount: row.word_count,
    revision: row.revision,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function entry(row: Row): WritingEntry {
  return {
    ...summary(row),
    body: row.body ?? "",
    document: row.document ?? null,
  };
}

export class WritingRepository extends CreatorRepositoryBase {
  constructor(databaseUrl: string) {
    super(creatorPoolFor(databaseUrl));
  }

  async getToolRecord(
    accountId: string,
    kind: WritingToolKind,
    scopeId: string,
  ): Promise<WritingToolRecord | null> {
    if (kind !== "dictionary" && !(await this.get(accountId, scopeId)))
      return null;
    const result = await this.query<{ revision: number; data: unknown }>(
      "select revision,data from creator_writing_tool_records where account_id=$1 and kind=$2 and scope_id=$3",
      [accountId, kind, scopeId],
    );
    const row = result.rows[0];
    return row
      ? { revision: row.revision, data: parseToolData(kind, row.data) }
      : { revision: 0, data: emptyToolData(kind) };
  }
  async saveToolRecord(
    accountId: string,
    kind: WritingToolKind,
    scopeId: string,
    data: unknown,
    baseRevision: number,
  ) {
    const checked = parseToolData(kind, data);
    // Ownership is rechecked inside the atomic statement, including initial creation.
    const owned =
      "($2='dictionary' OR EXISTS(select 1 from creator_writing_entries e where e.account_id=$1 and e.id=$3))";
    const result = await this.query<{ revision: number; data: unknown }>(
      baseRevision === 0
        ? `insert into creator_writing_tool_records(account_id,kind,scope_id,data) select $1,$2,$3,$4::jsonb where ${owned} on conflict(account_id,kind,scope_id) do nothing returning revision,data`
        : `update creator_writing_tool_records set data=$4::jsonb,revision=revision+1,updated_at=now() where account_id=$1 and kind=$2 and scope_id=$3 and revision=$5 and ${owned} returning revision,data`,
      baseRevision === 0
        ? [accountId, kind, scopeId, JSON.stringify(checked)]
        : [accountId, kind, scopeId, JSON.stringify(checked), baseRevision],
    );
    if (result.rows[0])
      return { kind: "saved" as const, record: result.rows[0] };
    const current = await this.getToolRecord(accountId, kind, scopeId);
    return current
      ? { kind: "conflict" as const, current }
      : { kind: "not-found" as const };
  }

  /** An absent studio is an empty revision zero, only for an owned project. */
  async getStudio(
    accountId: string,
    projectId: string,
  ): Promise<StudioRecord | null> {
    const result = await this.query<{ data: unknown; revision: number | null }>(
      `select s.data,s.revision from creator_writing_projects p
       left join creator_writing_studios s on s.project_id=p.id and s.account_id=p.account_id
       where p.account_id=$1 and p.id=$2`,
      [accountId, projectId],
    );
    const row = result.rows[0];
    return row
      ? {
          data:
            row.revision === null
              ? studioDataSchema.parse({})
              : studioDataSchema.parse(row.data),
          revision: row.revision ?? 0,
        }
      : null;
  }

  /** Compare-and-save, including the first save; a stale revision never replaces data. */
  async saveStudio(
    accountId: string,
    projectId: string,
    request: { data: StudioData; baseRevision: number },
    allowStructureChange = true,
  ): Promise<
    | { kind: "saved"; studio: StudioRecord }
    | { kind: "conflict"; current: StudioRecord }
    | { kind: "not-found" }
    | { kind: "locked" }
  > {
    const data = studioDataSchema.parse(request.data);
    const value = JSON.stringify(data);
    const result = await this.query<{ data: unknown; revision: number }>(
      request.baseRevision === 0
        ? `insert into creator_writing_studios(project_id,account_id,data)
         select p.id,p.account_id,$3::jsonb from creator_writing_projects p
         where p.account_id=$1 and p.id=$2 and ($5 or $3::jsonb->'structure'=$4::jsonb)
         on conflict(project_id) do nothing returning data,revision`
        : `update creator_writing_studios set data=$3::jsonb,revision=revision+1,updated_at=now()
         where account_id=$1 and project_id=$2 and revision=$4
         and ($5 or data->'structure'=$3::jsonb->'structure') returning data,revision`,
      request.baseRevision === 0
        ? [
            accountId,
            projectId,
            value,
            JSON.stringify(EMPTY_STUDIO.structure),
            allowStructureChange,
          ]
        : [
            accountId,
            projectId,
            value,
            request.baseRevision,
            allowStructureChange,
          ],
    );
    const row = result.rows[0];
    if (row)
      return {
        kind: "saved",
        studio: {
          data: studioDataSchema.parse(row.data),
          revision: row.revision,
        },
      };
    const current = await this.getStudio(accountId, projectId);
    if (!current) return { kind: "not-found" };
    if (current.revision !== request.baseRevision)
      return { kind: "conflict", current };
    return { kind: "locked" };
  }

  async listReaderShares(
    accountId: string,
    projectId: string,
  ): Promise<ReaderShare[] | null> {
    if (!(await this.getStudio(accountId, projectId))) return null;
    const result = await this.query<{
      id: string;
      created_at: Date;
      expires_at: Date;
    }>(
      `select id,created_at,expires_at from creator_writing_reader_shares
       where account_id=$1 and project_id=$2 order by created_at desc limit 20`,
      [accountId, projectId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      revoked: false,
    }));
  }

  /** Share one immutable checkpoint. The plaintext secret is returned once and never stored. */
  async createReaderShare(
    accountId: string,
    projectId: string,
    checkpointId: string,
  ): Promise<
    | {
        kind: "created";
        share: { id: string; urlToken: string; expiresAt: string };
      }
    | { kind: "not-found" }
    | { kind: "limit" }
  > {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const owned = await client.query(
        `select id from creator_writing_projects where account_id=$1 and id=$2 for update`,
        [accountId, projectId],
      );
      if (!owned.rowCount) {
        await client.query("commit");
        return { kind: "not-found" };
      }
      await client.query(
        `delete from creator_writing_reader_shares where account_id=$1 and project_id=$2 and expires_at<=now()`,
        [accountId, projectId],
      );
      const count = await client.query<{ count: number }>(
        `select count(*)::int as count from creator_writing_reader_shares where account_id=$1 and project_id=$2`,
        [accountId, projectId],
      );
      if (count.rows[0]!.count >= 20) {
        await client.query("commit");
        return { kind: "limit" };
      }
      const studio = await client.query<{ data: unknown }>(
        `select data from creator_writing_studios where account_id=$1 and project_id=$2`,
        [accountId, projectId],
      );
      const checkpoint = studio.rows[0]
        ? studioDataSchema
            .parse(studio.rows[0].data)
            .revisions.checkpoints.find((item) => item.id === checkpointId)
        : undefined;
      if (!checkpoint) {
        await client.query("commit");
        return { kind: "not-found" };
      }
      const id = randomUUID();
      const urlToken = randomUUID();
      const result = await client.query<{ expires_at: Date }>(
        `insert into creator_writing_reader_shares(id,project_id,account_id,token_hash,checkpoint)
         values($1,$2,$3,$4,$5::jsonb) returning expires_at`,
        [
          id,
          projectId,
          accountId,
          readerTokenHash(urlToken),
          JSON.stringify(readerCheckpoint(checkpoint)),
        ],
      );
      await client.query("commit");
      return {
        kind: "created",
        share: {
          id,
          urlToken,
          expiresAt: result.rows[0]!.expires_at.toISOString(),
        },
      };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeReaderShare(
    accountId: string,
    projectId: string,
    id: string,
  ): Promise<boolean> {
    const result = await this.query(
      `delete from creator_writing_reader_shares where account_id=$1 and project_id=$2 and id=$3`,
      [accountId, projectId, id],
    );
    return result.rowCount === 1;
  }

  async readReaderCopy(token: string): Promise<ReaderCopy | null> {
    if (!validReaderToken(token)) return null;
    // One snapshot and statement: a revoked/expired share never returns comments alone.
    const result = await this.query<{
      checkpoint: unknown;
      expires_at: Date;
      comments: ReaderComment[];
    }>(
      `select s.checkpoint,s.expires_at,coalesce((
         select jsonb_agg(jsonb_build_object('id',c.id,'pieceId',c.piece_id,'quote',c.quote,'body',c.body,'createdAt',c.created_at) order by c.created_at,c.id)
         from creator_writing_reader_comments c where c.share_id=s.id
       ),'[]'::jsonb) as comments
       from creator_writing_reader_shares s where s.token_hash=$1 and s.expires_at>clock_timestamp()`,
      [readerTokenHash(token)],
    );
    const row = result.rows[0];
    return row
      ? {
          checkpoint: checkpointSchema.parse(row.checkpoint),
          expiresAt: row.expires_at.toISOString(),
          comments: row.comments,
        }
      : null;
  }

  /** The writer can revisit feedback without retaining or revealing the reader secret. */
  async getReaderFeedback(
    accountId: string,
    projectId: string,
    shareId: string,
  ): Promise<ReaderCopy | null> {
    const result = await this.query<{
      checkpoint: unknown;
      expires_at: Date;
      comments: ReaderComment[];
    }>(
      `select s.checkpoint,s.expires_at,coalesce((
         select jsonb_agg(jsonb_build_object('id',c.id,'pieceId',c.piece_id,'quote',c.quote,'body',c.body,'createdAt',c.created_at) order by c.created_at,c.id)
         from creator_writing_reader_comments c where c.share_id=s.id
       ),'[]'::jsonb) as comments from creator_writing_reader_shares s
       where s.account_id=$1 and s.project_id=$2 and s.id=$3`,
      [accountId, projectId, shareId],
    );
    const row = result.rows[0];
    return row
      ? {
          checkpoint: checkpointSchema.parse(row.checkpoint),
          expiresAt: row.expires_at.toISOString(),
          comments: row.comments,
        }
      : null;
  }

  /** Only comments are inserted; a reader cannot mutate a piece or checkpoint. */
  async addReaderComment(
    accountId: string,
    token: string,
    input: ReaderCommentInput,
  ): Promise<
    | { kind: "created"; comment: ReaderComment }
    | { kind: "not-found" }
    | { kind: "invalid-anchor" }
    | { kind: "limit" }
  > {
    if (!validReaderToken(token)) return { kind: "not-found" };
    const request = readerCommentSchema.parse(input);
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      // Serializing an account's writes makes the durable per-account budget race safe.
      await client.query(
        `select id from radar_accounts where id=$1 for update`,
        [accountId],
      );
      const shares = await client.query<{ id: string; checkpoint: unknown }>(
        `select id,checkpoint from creator_writing_reader_shares where token_hash=$1 and expires_at>clock_timestamp() for update`,
        [readerTokenHash(token)],
      );
      const share = shares.rows[0];
      if (!share) {
        await client.query("commit");
        return { kind: "not-found" };
      }
      const checkpoint = checkpointSchema.parse(share.checkpoint);
      const piece = checkpoint.pieces.find(
        (item) => item.id === request.pieceId,
      );
      if (!piece || !piece.body.includes(request.quote)) {
        await client.query("commit");
        return { kind: "invalid-anchor" };
      }
      const budget = await client.query<{
        account_count: number;
        share_count: number;
      }>(
        `select (select count(*)::int from creator_writing_reader_comments where account_id=$1 and created_at>now()-interval '15 minutes') as account_count,
                (select count(*)::int from creator_writing_reader_comments where share_id=$2) as share_count`,
        [accountId, share.id],
      );
      if (
        budget.rows[0]!.account_count >= 30 ||
        budget.rows[0]!.share_count >= 500
      ) {
        await client.query("commit");
        return { kind: "limit" };
      }
      const id = randomUUID();
      const created = await client.query<{ created_at: Date }>(
        `insert into creator_writing_reader_comments(id,share_id,account_id,piece_id,quote,body)
         select $1,id,$3,$4,$5,$6 from creator_writing_reader_shares where id=$2 and expires_at>clock_timestamp() returning created_at`,
        [id, share.id, accountId, request.pieceId, request.quote, request.body],
      );
      await client.query("commit");
      return created.rows[0]
        ? {
            kind: "created",
            comment: {
              ...request,
              id,
              createdAt: created.rows[0].created_at.toISOString(),
            },
          }
        : { kind: "not-found" };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async list(accountId: string): Promise<WritingEntrySummary[]> {
    const result = await this.query<Row>(
      `select ${SUMMARY_COLUMNS} from creator_writing_entries where account_id=$1 order by updated_at desc limit $2`,
      [accountId, WRITING_LIST_LIMIT],
    );
    return result.rows.map(summary);
  }

  async get(accountId: string, id: string): Promise<WritingEntry | null> {
    const result = await this.query<Row>(
      `select ${ENTRY_COLUMNS} from creator_writing_entries where account_id=$1 and id=$2`,
      [accountId, id],
    );
    return result.rows[0] ? entry(result.rows[0]) : null;
  }

  /**
   * Saves text written on `baseRevision`. Saving the same text twice is
   * harmless: a retried save that already landed returns the stored entry.
   * Text written on an older revision is refused with the stored entry, so
   * the caller can keep both versions.
   */
  async save(
    accountId: string,
    id: string,
    request: WritingSaveRequest,
  ): Promise<WritingSaveResult> {
    const savedDocument = request.document
      ? parseWritingDocument(request.document)
      : null;
    const wordCount =
      savedDocument?.purpose === "research"
        ? 0
        : countWords(
            savedDocument ? documentText(savedDocument) : request.body,
          );
    const written =
      request.baseRevision === 0
        ? await this.query<Row>(
            `with inserted as (
               insert into creator_writing_entries (id,account_id,body,word_count,title,document,project_id,position)
               select $1,$2,$3,$4,$5,$6,p.id,
                 coalesce((select max(position)+1 from creator_writing_entries where account_id=$2 and project_id=p.id),0)
               from (select (select id from creator_writing_projects where id=$7 and account_id=$2) as id) p
               on conflict (id) do nothing
               returning ${ENTRY_COLUMNS}
             ), audited as (
               insert into audit_events (account_id,action,target_type,target_id,detail)
               select $2,'writing.entry_created','writing_entry',id,'{"revision":1}'::jsonb from inserted
             )
             select * from inserted`,
            [
              id,
              accountId,
              request.body,
              wordCount,
              request.title,
              request.document,
              request.projectId ?? null,
            ],
          )
        : await this.query<Row>(
            `update creator_writing_entries
             set body=$3, word_count=$4, title=$6, document=$7, revision=revision+1, updated_at=now()
             where account_id=$1 and id=$2 and revision=$5
             returning ${ENTRY_COLUMNS}`,
            [
              accountId,
              id,
              request.body,
              wordCount,
              request.baseRevision,
              request.title,
              request.document,
            ],
          );
    if (written.rows[0])
      return { kind: "saved", entry: summary(written.rows[0]) };

    const current = await this.get(accountId, id);
    if (!current) return { kind: "not-found" };
    if (sameWritingContent(current, request)) {
      const { body: _body, document: _document, ...stored } = current;
      return { kind: "saved", entry: stored };
    }
    return { kind: "conflict", current };
  }

  async delete(accountId: string, id: string): Promise<boolean> {
    const result = await this.query<{ id: string }>(
      `with deleted as (
         delete from creator_writing_entries where account_id=$1 and id=$2 returning id
       ), audited as (
         insert into audit_events (account_id,action,target_type,target_id)
         select $1,'writing.entry_deleted','writing_entry',id from deleted
       )
       select id from deleted`,
      [accountId, id],
    );
    return result.rowCount === 1;
  }

  /** All restored data lands together in a separate project; retries never overwrite a row. */
  async restoreProjectBackup(
    accountId: string,
    input: PreparedProjectRestore,
  ): Promise<
    | {
        kind: "restored" | "exists";
        project: WritingProject;
        entries: WritingEntrySummary[];
      }
    | { kind: "taken" | "limit" }
  > {
    const backup = parseProjectBackup(JSON.stringify(input));
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "select id from radar_accounts where id=$1 for update",
        [accountId],
      );
      const existing = await client.query<ProjectRow & { account_id: string }>(
        `select ${PROJECT_COLUMNS},account_id from creator_writing_projects where id=$1 for update`,
        [backup.project.id],
      );
      if (existing.rows[0]) {
        const old = existing.rows[0];
        const oldPieces = await client.query<Row>(
          `select ${ENTRY_COLUMNS} from creator_writing_entries where account_id=$1 and project_id=$2 order by position,id`,
          [accountId, backup.project.id],
        );
        const oldStudio = await client.query<{ data: unknown }>(
          "select data from creator_writing_studios where account_id=$1 and project_id=$2",
          [accountId, backup.project.id],
        );
        const matches =
          old.account_id === accountId &&
          old.title === backup.project.title &&
          old.template === backup.project.template &&
          isDeepStrictEqual(storedPlan(old.plan), backup.project.plan) &&
          isDeepStrictEqual(oldStudio.rows[0]?.data, backup.studio) &&
          oldPieces.rows.length === backup.pieces.length &&
          backup.pieces.every((piece, index) => {
            const stored = oldPieces.rows[index];
            return (
              stored?.id === piece.id &&
              stored.title === piece.title &&
              stored.document === piece.document &&
              stored.synopsis === piece.synopsis &&
              stored.status === piece.status &&
              isDeepStrictEqual(storedCard(stored.card), piece.card)
            );
          });
        await client.query("ROLLBACK");
        return matches
          ? {
              kind: "exists",
              project: project(old),
              entries: oldPieces.rows.map(summary),
            }
          : { kind: "taken" };
      }
      const counts = await client.query<{ projects: number; entries: number }>(
        "select (select count(*)::int from creator_writing_projects where account_id=$1) as projects,(select count(*)::int from creator_writing_entries where account_id=$1) as entries",
        [accountId],
      );
      if (
        counts.rows[0]!.projects >= PROJECTS_MAX ||
        counts.rows[0]!.entries + backup.pieces.length > WRITING_LIST_LIMIT
      ) {
        await client.query("ROLLBACK");
        return { kind: "limit" };
      }
      const created = await client.query<ProjectRow>(
        `insert into creator_writing_projects(id,account_id,title,template,plan) values($1,$2,$3,$4,$5::jsonb) returning ${PROJECT_COLUMNS}`,
        [
          backup.project.id,
          accountId,
          backup.project.title,
          backup.project.template,
          JSON.stringify(backup.project.plan),
        ],
      );
      const entries: WritingEntrySummary[] = [];
      for (const [position, piece] of backup.pieces.entries()) {
        const document = parseWritingDocument(piece.document)!;
        const body = documentText(document);
        const saved = await client.query<Row>(
          `insert into creator_writing_entries(id,account_id,title,body,document,project_id,position,synopsis,status,card,word_count) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) returning ${ENTRY_COLUMNS}`,
          [
            piece.id,
            accountId,
            piece.title,
            body,
            piece.document,
            backup.project.id,
            position,
            piece.synopsis,
            piece.status,
            JSON.stringify(piece.card),
            document.purpose === "research" ? 0 : countWords(body),
          ],
        );
        entries.push(summary(saved.rows[0]!));
      }
      await client.query(
        "insert into creator_writing_studios(project_id,account_id,data) values($1,$2,$3::jsonb)",
        [backup.project.id, accountId, JSON.stringify(backup.studio)],
      );
      await client.query(
        "insert into audit_events(account_id,action,target_type,target_id,detail) values($1,'writing.project_restored','writing_project',$2,$3::jsonb)",
        [
          accountId,
          backup.project.id,
          JSON.stringify({ pieces: backup.pieces.length }),
        ],
      );
      await client.query("COMMIT");
      return { kind: "restored", project: project(created.rows[0]!), entries };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      // A conflicting piece ID cannot leave the project or earlier pieces partially restored.
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      )
        return { kind: "taken" };
      throw error;
    } finally {
      client.release();
    }
  }

  async listProjects(accountId: string): Promise<WritingProject[]> {
    const result = await this.query<ProjectRow>(
      `select ${PROJECT_COLUMNS} from creator_writing_projects where account_id=$1 order by updated_at desc limit $2`,
      [accountId, PROJECTS_MAX],
    );
    return result.rows.map(project);
  }

  /**
   * Creates a project and its template's first pieces in one statement. A
   * retried create returns the project already made and adds nothing.
   */
  async createProject(
    accountId: string,
    request: { id: string; title: string; template: ProjectTemplateId },
  ): Promise<
    | {
        kind: "created";
        project: WritingProject;
        entries: WritingEntrySummary[];
      }
    | { kind: "exists"; project: WritingProject }
    | { kind: "taken" }
    | { kind: "limit" }
  > {
    const titles = [...PROJECT_TEMPLATES[request.template].pieces];
    const ids = titles.map(() => newWritingEntryId());
    const result = await this.query<{
      project: ProjectRow | null;
      entries: Row[] | null;
    }>(
      `with allowed as (
         select (select count(*) from creator_writing_projects where account_id=$2) < $7 as ok
       ), created as (
         insert into creator_writing_projects (id,account_id,title,template)
         select $1,$2,$3,$4 from allowed where ok
         on conflict (id) do nothing
         returning ${PROJECT_COLUMNS}
       ), pieces as (
         insert into creator_writing_entries (id,account_id,title,project_id,position)
         select t.id,$2,t.title,c.id,(t.n-1)::int
         from created c, unnest($5::text[],$6::text[]) with ordinality as t(id,title,n)
         returning ${ENTRY_COLUMNS}
       ), audited as (
         insert into audit_events (account_id,action,target_type,target_id)
         select $2,'writing.project_created','writing_project',id from created
       )
       select (select row_to_json(c) from created c) as project,
              (select json_agg(p order by p.position) from pieces p) as entries`,
      [
        request.id,
        accountId,
        request.title,
        request.template,
        ids,
        titles,
        PROJECTS_MAX,
      ],
    );
    const row = result.rows[0];
    if (row?.project) {
      const revive = (value: Row): Row => ({
        ...value,
        created_at: new Date(value.created_at),
        updated_at: new Date(value.updated_at),
      });
      return {
        kind: "created",
        project: project({
          ...row.project,
          created_at: new Date(row.project.created_at),
          updated_at: new Date(row.project.updated_at),
        }),
        entries: (row.entries ?? []).map((value) => summary(revive(value))),
      };
    }
    const existing = await this.query<ProjectRow & { account_id: string }>(
      `select ${PROJECT_COLUMNS},account_id from creator_writing_projects where id=$1`,
      [request.id],
    );
    const found = existing.rows[0];
    if (!found) return { kind: "limit" };
    return found.account_id === accountId
      ? { kind: "exists", project: project(found) }
      : { kind: "taken" };
  }

  /** Replaces a project's plan: its plotlines. Never touches its pieces. */
  async setProjectPlan(
    accountId: string,
    id: string,
    plan: ProjectPlan,
  ): Promise<WritingProject | null> {
    const result = await this.query<ProjectRow>(
      `update creator_writing_projects set plan=$3::jsonb, updated_at=now()
       where account_id=$1 and id=$2 returning ${PROJECT_COLUMNS}`,
      [accountId, id, JSON.stringify(plan)],
    );
    return result.rows[0] ? project(result.rows[0]) : null;
  }

  async renameProject(
    accountId: string,
    id: string,
    title: string,
  ): Promise<WritingProject | null> {
    const result = await this.query<ProjectRow>(
      `update creator_writing_projects set title=$3, updated_at=now()
       where account_id=$1 and id=$2 returning ${PROJECT_COLUMNS}`,
      [accountId, id, title],
    );
    return result.rows[0] ? project(result.rows[0]) : null;
  }

  /** Deletes a project. Its pieces stay in the account as loose pieces. */
  async deleteProject(accountId: string, id: string): Promise<boolean> {
    const result = await this.query<{ id: string }>(
      `with deleted as (
         delete from creator_writing_projects where account_id=$1 and id=$2 returning id
       ), audited as (
         insert into audit_events (account_id,action,target_type,target_id)
         select $1,'writing.project_deleted','writing_project',id from deleted
       )
       select id from deleted`,
      [accountId, id],
    );
    return result.rowCount === 1;
  }

  /**
   * Puts the named pieces in the project, in this order. Pieces of the
   * project left out keep their place after the named ones.
   */
  async orderPieces(
    accountId: string,
    projectId: string,
    entryIds: string[],
  ): Promise<boolean> {
    const result = await this.query<{ id: string }>(
      `with owned as (
         update creator_writing_projects set updated_at=now()
         where account_id=$1 and id=$2 returning id
       ), named as (
         update creator_writing_entries e
         set project_id=o.id, position=(t.n-1)::int
         from owned o, unnest($3::text[]) with ordinality as t(id,n)
         where e.account_id=$1 and e.id=t.id
         returning e.id
       ), rest as (
         update creator_writing_entries e
         set position=cardinality($3::text[]) + r.n::int
         from (
           select id, row_number() over (order by position, created_at) as n
           from creator_writing_entries
           where account_id=$1 and project_id=$2 and not (id = any($3::text[]))
         ) r, owned o
         where e.id=r.id
         returning e.id
       )
       select id from owned`,
      [accountId, projectId, entryIds],
    );
    return result.rowCount === 1;
  }

  /** Moves a piece between projects or changes its index card. Never changes its text or revision. */
  async changePiece(
    accountId: string,
    id: string,
    change: PieceChange,
  ): Promise<WritingEntrySummary | "no-project" | null> {
    if (change.projectId) {
      const owned = await this.query(
        `select 1 from creator_writing_projects where account_id=$1 and id=$2`,
        [accountId, change.projectId],
      );
      if (!owned.rowCount) return "no-project";
    }
    const moving = change.projectId !== undefined;
    const result = await this.query<Row>(
      `update creator_writing_entries e set
         project_id = case when $3 then $4::text else e.project_id end,
         position = case
           when $3 and $4::text is not null and e.project_id is distinct from $4::text then
             coalesce((select max(position)+1 from creator_writing_entries where account_id=$1 and project_id=$4::text),0)
           when $3 and $4::text is null then 0
           else e.position end,
         synopsis = coalesce($5, e.synopsis),
         status = coalesce($6, e.status),
         call_id = case when $7 then $8::text else e.call_id end,
         card = case when $9 then $10::jsonb else e.card end
       where e.account_id=$1 and e.id=$2
       returning ${SUMMARY_COLUMNS}`,
      [
        accountId,
        id,
        moving,
        change.projectId ?? null,
        change.synopsis ?? null,
        change.status ?? null,
        change.callId !== undefined,
        change.callId ?? null,
        change.card !== undefined,
        JSON.stringify(change.card ?? {}),
      ],
    );
    return result.rows[0] ? summary(result.rows[0]) : null;
  }

  /** A project and its pieces, in order, with their full text, for compiling. */
  async compile(
    accountId: string,
    projectId: string,
  ): Promise<{ project: WritingProject; entries: WritingEntry[] } | null> {
    const found = await this.query<ProjectRow>(
      `select ${PROJECT_COLUMNS} from creator_writing_projects where account_id=$1 and id=$2`,
      [accountId, projectId],
    );
    if (!found.rows[0]) return null;
    const result = await this.query<Row>(
      `select ${ENTRY_COLUMNS} from creator_writing_entries
       where account_id=$1 and project_id=$2 order by position, created_at`,
      [accountId, projectId],
    );
    return { project: project(found.rows[0]), entries: result.rows.map(entry) };
  }

  async listSnapshots(
    accountId: string,
    entryId: string,
  ): Promise<WritingSnapshotSummary[]> {
    const result = await this.query<SnapshotRow>(
      `select ${SNAPSHOT_SUMMARY} from creator_writing_snapshots
       where account_id=$1 and entry_id=$2 order by created_at desc limit $3`,
      [accountId, entryId, SNAPSHOTS_PER_PIECE * 2],
    );
    return result.rows.map(snapshotSummary);
  }

  /**
   * Keeps a copy of a piece as it stands now. The piece must be in the
   * account. Retried requests return the already-kept version. Up to 100 named
   * versions are protected; only the oldest automatic versions are pruned.
   */
  async createSnapshot(
    accountId: string,
    entryId: string,
    request: SnapshotRequest,
  ): Promise<WritingSnapshotSummary | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const owned = await client.query(
        "select id from creator_writing_entries where account_id=$1 and id=$2 for update",
        [accountId, entryId],
      );
      if (!owned.rows.length) {
        await client.query("ROLLBACK");
        return null;
      }
      if (request.name) {
        const count = await client.query<{ n: number }>(
          "select count(*)::int as n from creator_writing_snapshots where account_id=$1 and entry_id=$2 and name<>'' and id<>$3",
          [accountId, entryId, request.id],
        );
        if (count.rows[0]!.n >= NAMED_VERSIONS_PER_PIECE)
          throw new NamedVersionLimitError();
      }
      const result = await client.query<SnapshotRow>(
        `with owned as (
         select id from creator_writing_entries where account_id=$1 and id=$2
       ), kept as (
         insert into creator_writing_snapshots (id,account_id,entry_id,name,title,body,document,word_count)
         select $3,$1,o.id,$4,$5,$6,$7,$8 from owned o
         on conflict (id) do nothing
         returning ${SNAPSHOT_SUMMARY}
       )
       select * from kept
       union all
       select ${SNAPSHOT_SUMMARY} from creator_writing_snapshots
       where id=$3 and account_id=$1 and entry_id=$2 and not exists (select 1 from kept)`,
        [
          accountId,
          entryId,
          request.id,
          request.name,
          request.title,
          request.body,
          request.document,
          countWords(request.body),
        ],
      );
      const row = result.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return null;
      }
      await client.query(
        `delete from creator_writing_snapshots where account_id=$1 and entry_id=$2 and id in (
         select id from creator_writing_snapshots where account_id=$1 and entry_id=$2 and name=''
         order by created_at desc offset $3
       )`,
        [accountId, entryId, SNAPSHOTS_PER_PIECE],
      );
      await client.query("COMMIT");
      return snapshotSummary(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getSnapshot(
    accountId: string,
    entryId: string,
    id: string,
  ): Promise<WritingSnapshot | null> {
    const result = await this.query<SnapshotRow>(
      `select ${SNAPSHOT_SUMMARY},body,document from creator_writing_snapshots
       where account_id=$1 and entry_id=$2 and id=$3`,
      [accountId, entryId, id],
    );
    const row = result.rows[0];
    return row
      ? {
          ...snapshotSummary(row),
          body: row.body ?? "",
          document: row.document ?? null,
        }
      : null;
  }

  /** Naming protects a version from automatic-history pruning. Content never changes. */
  async renameSnapshot(
    accountId: string,
    entryId: string,
    id: string,
    name: string,
  ): Promise<WritingSnapshotSummary | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const owned = await client.query(
        "select id from creator_writing_entries where account_id=$1 and id=$2 for update",
        [accountId, entryId],
      );
      if (!owned.rows.length) {
        await client.query("ROLLBACK");
        return null;
      }
      if (name) {
        const count = await client.query<{ n: number }>(
          "select count(*)::int as n from creator_writing_snapshots where account_id=$1 and entry_id=$2 and name<>'' and id<>$3",
          [accountId, entryId, id],
        );
        if (count.rows[0]!.n >= NAMED_VERSIONS_PER_PIECE)
          throw new NamedVersionLimitError();
      }
      const result = await client.query<SnapshotRow>(
        `update creator_writing_snapshots set name=$4 where account_id=$1 and entry_id=$2 and id=$3 returning ${SNAPSHOT_SUMMARY}`,
        [accountId, entryId, id, name],
      );
      await client.query("COMMIT");
      return result.rows[0] ? snapshotSummary(result.rows[0]) : null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteSnapshot(
    accountId: string,
    entryId: string,
    id: string,
  ): Promise<boolean> {
    const result = await this.query(
      `delete from creator_writing_snapshots where account_id=$1 and entry_id=$2 and id=$3`,
      [accountId, entryId, id],
    );
    return result.rowCount === 1;
  }

  /** Every entry with its full text, for the creator's own account export. */
  async exportAll(accountId: string): Promise<WritingEntry[]> {
    const result = await this.query<Row>(
      `select ${ENTRY_COLUMNS} from creator_writing_entries where account_id=$1 order by created_at`,
      [accountId],
    );
    return result.rows.map(entry);
  }
}

declare global {
  var __missaWritingRepository: WritingRepository | undefined;
}

/** Undefined when the deployment has no database; the writing room then keeps text on the device. */
export function getWritingRepository(): WritingRepository | undefined {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;
  // Development reloads can otherwise retain an instance without new methods.
  if (!(globalThis.__missaWritingRepository instanceof WritingRepository)) {
    globalThis.__missaWritingRepository = new WritingRepository(databaseUrl);
  }
  return globalThis.__missaWritingRepository;
}
