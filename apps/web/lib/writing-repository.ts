import { CreatorRepositoryBase, creatorPoolFor } from "@missa/radar-adapters";
import {
  countWords,
  sameWritingContent,
  writingPreview,
  WRITING_LIST_LIMIT,
  type WritingEntry,
  type WritingEntrySummary,
  type WritingSaveRequest,
} from "./writing.ts";

/**
 * The only code that reads or writes creator_writing_entries (migrations 0095, 0096).
 * Every query is scoped to one account. writing-boundary.test.ts fails when
 * another file names the table, so nothing else can read a creator's writing.
 */

type Row = {
  id: string;
  title: string;
  body?: string;
  document?: string | null;
  preview?: string;
  word_count: number;
  revision: number;
  created_at: Date;
  updated_at: Date;
};

export type WritingSaveResult =
  | { kind: "saved"; entry: WritingEntrySummary }
  | { kind: "conflict"; current: WritingEntry }
  | { kind: "not-found" };

const SUMMARY_COLUMNS =
  "id,title,left(regexp_replace(btrim(left(body,400)),'\\s+',' ','g'),120) as preview,word_count,revision,created_at,updated_at";
const ENTRY_COLUMNS =
  "id,title,body,document,word_count,revision,created_at,updated_at";

function summary(row: Row): WritingEntrySummary {
  return {
    id: row.id,
    title: row.title,
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
               insert into creator_writing_entries (id,account_id,body,word_count,title,document)
               values ($1,$2,$3,$4,$5,$6)
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
      const {
        id: storedId,
        title,
        preview,
        wordCount: words,
        revision,
        createdAt,
        updatedAt,
      } = current;
      return {
        kind: "saved",
        entry: {
          id: storedId,
          title,
          preview,
          wordCount: words,
          revision,
          createdAt,
          updatedAt,
        },
      };
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
