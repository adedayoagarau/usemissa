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
  type SnapshotRequest,
  type WritingSnapshot,
  type WritingSnapshotSummary,
} from "./writing-snapshots.ts";
import { storedCard, storedPlan, type ProjectPlan } from "./writing-cards.ts";

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
    const wordCount = countWords(request.body);
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
      [accountId, entryId, SNAPSHOTS_PER_PIECE],
    );
    return result.rows.map(snapshotSummary);
  }

  /**
   * Keeps a copy of a piece as it stands now. The piece must be in the
   * account. A retried request returns the snapshot already kept. The oldest
   * snapshots past the limit for one piece are let go.
   */
  async createSnapshot(
    accountId: string,
    entryId: string,
    request: SnapshotRequest,
  ): Promise<WritingSnapshotSummary | null> {
    const result = await this.query<SnapshotRow>(
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
    if (!row) return null;
    await this.query(
      `delete from creator_writing_snapshots where account_id=$1 and entry_id=$2 and id in (
         select id from creator_writing_snapshots where account_id=$1 and entry_id=$2
         order by created_at desc offset $3
       )`,
      [accountId, entryId, SNAPSHOTS_PER_PIECE],
    );
    return snapshotSummary(row);
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
  if (!globalThis.__missaWritingRepository) {
    globalThis.__missaWritingRepository = new WritingRepository(databaseUrl);
  }
  return globalThis.__missaWritingRepository;
}
