import { randomUUID } from "node:crypto";
import type { ChecklistItem, ChecklistItemState, OpportunityChecklistView } from "@missa/radar-engine";
import type { Pool, PoolClient } from "pg";
import {
  CreatorConflictError,
  CreatorRepositoryBase,
  type CreatorCommandEnvelope,
  type CreatorReceipt,
} from "./creatorRepository.js";

export type CreatorTrackerList = Readonly<{
  id: string;
  userId: string;
  name: string;
  description?: string;
  colorToken?: string;
  archivedAt?: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}>;

export type CreatorTrackerListMembership = Readonly<{
  listId: string;
  userId: string;
  opportunityId: string;
  addedAt: string;
}>;

export type CreatorChecklistView = OpportunityChecklistView & Readonly<{ checklist: OpportunityChecklistView["checklist"] & { revision: number }; items: Array<ChecklistItem & { revision: number }> }>;

type ListRow = {
  id: string; name: string; description: string | null; color_token: string | null;
  archived_at: Date | string | null; revision: number; created_at: Date | string; updated_at: Date | string;
};

function iso(value: Date | string): string { return new Date(value).toISOString(); }
function listView(row: ListRow, userId: string): CreatorTrackerList {
  return {
    id: row.id, userId, name: row.name, revision: row.revision,
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
    ...(row.description ? { description: row.description } : {}),
    ...(row.color_token ? { colorToken: row.color_token } : {}),
    ...(row.archived_at ? { archivedAt: iso(row.archived_at) } : {}),
  };
}

export class PostgresCreatorTrackerRepository extends CreatorRepositoryBase {
  constructor(pool: Pool) { super(pool); }

  async lists(accountId: string, userId: string): Promise<CreatorTrackerList[]> {
    const result = await this.query<ListRow>(
      `select id,name,description,color_token,archived_at,revision,created_at,updated_at
       from tracker_lists where account_id=$1 and archived_at is null
       order by updated_at desc, lower(name), id`, [accountId],
    );
    return result.rows.map((row) => listView(row, userId));
  }

  async memberships(accountId: string, userId: string): Promise<CreatorTrackerListMembership[]> {
    const result = await this.query<{ list_id: string; opportunity_id: string; created_at: Date | string }>(
      `select m.list_id,t.opportunity_id,m.created_at from tracker_list_memberships m
       join tracked_opportunities t on t.id=m.tracked_opportunity_id and t.account_id=m.account_id
       where m.account_id=$1 order by m.created_at,m.target_key`, [accountId],
    );
    return result.rows.map((row) => ({ listId: row.list_id, userId, opportunityId: row.opportunity_id, addedAt: iso(row.created_at) }));
  }

  async checklist(accountId: string, userId: string, opportunityId: string): Promise<CreatorChecklistView | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const tracked = await client.query<{ id: string; tracked_at: Date | string }>(
        "select id,tracked_at from tracked_opportunities where account_id=$1 and opportunity_id=$2 for update", [accountId,opportunityId],
      );
      if (!tracked.rows[0]) { await client.query("ROLLBACK"); return undefined; }
      const checklistId = `checklist_${randomUUID()}`;
      const inserted = await client.query<{ id: string }>(
        `insert into tracker_checklists (id,account_id,tracked_opportunity_id,tracked_at,source_version)
         values ($1,$2,$3,$4,(select id from opportunity_versions where opportunity_id=$5 order by created_at desc,id desc limit 1))
         on conflict (account_id,tracked_opportunity_id) do nothing returning id`,
        [checklistId,accountId,tracked.rows[0].id,tracked.rows[0].tracked_at,opportunityId],
      );
      if (inserted.rows[0]) {
        await client.query(
          `insert into tracker_checklist_items
             (id,account_id,checklist_id,label,normalized_key,position,state,source,source_confidence)
           select 'checklist_item_' || gen_random_uuid()::text,$1,$2,m.label,
                  lower(regexp_replace(trim(m.label),'\\s+',' ','g')),row_number() over(order by m.sort_order,m.id)-1,
                  'missing','opportunity-required-material','unknown'
           from opportunity_required_materials m where m.opportunity_id=$3 and m.required=true
           on conflict (account_id,checklist_id,normalized_key) do nothing`,
          [accountId,checklistId,opportunityId],
        );
        const correlationId=randomUUID();
        await client.query(
          `insert into audit_events (account_id,action,target_type,target_id,detail,correlation_id)
           values ($1,'tracker-checklist.initialized','tracker-checklist',$2,$3::jsonb,$4)`,
          [accountId,checklistId,JSON.stringify({ opportunityId }),correlationId],
        );
        await client.query(
          `insert into outbox_events (topic,aggregate_type,aggregate_id,payload,event_key,correlation_id)
           values ('tracker-checklist.initialized','tracker-checklist',$1,$2::jsonb,$3,$4)`,
          [checklistId,JSON.stringify({ opportunityId }),`tracker-checklist.initialized:${checklistId}`,correlationId],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
    return this.readChecklist(accountId,userId,opportunityId);
  }

  async addChecklistItem(envelope: CreatorCommandEnvelope, opportunityId: string, input: { label: string; note?: string }): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const checklist = await this.lockChecklist(client,envelope,opportunityId);
      const id = `checklist_item_${randomUUID()}`;
      const normalized = input.label.trim().toLocaleLowerCase().replace(/\s+/gu," ");
      const result = await client.query<{ revision: number }>(
        `insert into tracker_checklist_items (id,account_id,checklist_id,label,normalized_key,position,state,source,note)
         values ($1,$2,$3,$4,$5,(select coalesce(max(position)+1,0) from tracker_checklist_items where checklist_id=$3),'missing','user-added',$6)
         returning revision`, [id,envelope.accountId,checklist.id,input.label,normalized,input.note ?? null],
      );
      await this.bumpChecklist(client,envelope.accountId,checklist.id,checklist.revision);
      return { resourceType: "tracker-checklist-item", resourceId: id, revision: result.rows[0]!.revision };
    });
  }

  async refreshChecklist(envelope: CreatorCommandEnvelope, opportunityId: string): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const checklist=await this.lockChecklist(client,envelope,opportunityId);
      await client.query(
        `update tracker_checklist_items i set
           label=m.label,position=m.position,source_confidence='unknown',updated_at=now()
         from (
           select label,lower(regexp_replace(trim(label),'\\s+',' ','g')) as normalized_key,
                  row_number() over(order by sort_order,id)-1 as position
           from opportunity_required_materials where opportunity_id=$1 and required=true
         ) m
         where i.account_id=$2 and i.checklist_id=$3 and i.source='opportunity-required-material'
           and i.normalized_key=m.normalized_key`,[opportunityId,envelope.accountId,checklist.id],
      );
      await client.query(
        `update tracker_checklist_items i set state='not-applicable',revision=revision+1,updated_at=now()
         where i.account_id=$1 and i.checklist_id=$2 and i.source='opportunity-required-material'
           and not exists (
             select 1 from opportunity_required_materials m where m.opportunity_id=$3 and m.required=true
               and lower(regexp_replace(trim(m.label),'\\s+',' ','g'))=i.normalized_key
           )`,[envelope.accountId,checklist.id,opportunityId],
      );
      await client.query(
        `insert into tracker_checklist_items
           (id,account_id,checklist_id,label,normalized_key,position,state,source,source_confidence)
         select 'checklist_item_' || gen_random_uuid()::text,$1,$2,m.label,m.normalized_key,m.position,
                'missing','opportunity-required-material','unknown'
         from (
           select label,lower(regexp_replace(trim(label),'\\s+',' ','g')) as normalized_key,
                  row_number() over(order by sort_order,id)-1 as position
           from opportunity_required_materials where opportunity_id=$3 and required=true
         ) m
         on conflict (account_id,checklist_id,normalized_key) do nothing`,[envelope.accountId,checklist.id,opportunityId],
      );
      const updated=await client.query<{revision:number}>(
        `update tracker_checklists set source_version=(select id from opportunity_versions where opportunity_id=$1 order by created_at desc,id desc limit 1),
           revision=revision+1,updated_at=now()
         where id=$2 and account_id=$3 and revision=$4 returning revision`,[opportunityId,checklist.id,envelope.accountId,checklist.revision],
      );
      return { resourceType:"tracker-checklist",resourceId:checklist.id,revision:updated.rows[0]!.revision };
    });
  }

  async updateChecklistItem(envelope: CreatorCommandEnvelope, itemId: string, input: { state?: ChecklistItemState; note?: string | null; libraryWorkId?: string | null; libraryFileId?: string | null; savedAnswerId?: string | null }): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const referenceValues=[input.libraryWorkId,input.libraryFileId,input.savedAnswerId].filter((value)=>typeof value==='string'&&value.length);
      if(referenceValues.length>1) throw new Error('Attach only one Library item.');
      const reference = input.libraryWorkId ? ['creator_library_works',input.libraryWorkId] : input.libraryFileId ? ['creator_library_files',input.libraryFileId] : input.savedAnswerId ? ['creator_saved_answers',input.savedAnswerId] : undefined;
      if(reference){await client.query("select pg_advisory_xact_lock(hashtext($1))",[`library-reference:${reference[1]}`]);const owned=await client.query(`select id from ${reference[0]} where id=$1 and account_id=$2 for share`,[reference[1],envelope.accountId]);if(!owned.rows[0])throw new Error('That Library item is not available.');}
      const changeReference=input.libraryWorkId!==undefined||input.libraryFileId!==undefined||input.savedAnswerId!==undefined;
      const result = await client.query<{ checklist_id: string; revision: number }>(
        `update tracker_checklist_items set state=coalesce($4,state),note=case when $5::boolean then $6 else note end,
           work_id=case when $7::boolean then $8 else work_id end,file_id=case when $7::boolean then $9 else file_id end,
           saved_answer_id=case when $7::boolean then $10 else saved_answer_id end,
           revision=revision+1,updated_at=now()
         where id=$1 and account_id=$2 and revision=$3 returning checklist_id,revision`,
        [itemId,envelope.accountId,envelope.expectedRevision,input.state ?? null,input.note !== undefined,input.note ?? null,changeReference,input.libraryWorkId??null,input.libraryFileId??null,input.savedAnswerId??null],
      );
      const row = result.rows[0];
      if (!row) {
        const current = await client.query<{ revision: number }>("select revision from tracker_checklist_items where id=$1 and account_id=$2 for update",[itemId,envelope.accountId]);
        throw new CreatorConflictError("tracker-checklist-item",itemId,envelope.expectedRevision,current.rows[0]?.revision ?? 0);
      }
      await client.query("update tracker_checklists set revision=revision+1,updated_at=now() where id=$1 and account_id=$2",[row.checklist_id,envelope.accountId]);
      return { resourceType: "tracker-checklist-item", resourceId: itemId, revision: row.revision };
    });
  }

  async deleteChecklistItem(envelope: CreatorCommandEnvelope, itemId: string): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const current = await client.query<{ checklist_id: string; source: string; revision: number }>(
        "select checklist_id,source,revision from tracker_checklist_items where id=$1 and account_id=$2 for update",[itemId,envelope.accountId],
      );
      const row = current.rows[0];
      if (!row || row.revision !== envelope.expectedRevision) throw new CreatorConflictError("tracker-checklist-item",itemId,envelope.expectedRevision,row?.revision ?? 0);
      if (row.source === "user-added") await client.query("delete from tracker_checklist_items where id=$1 and account_id=$2",[itemId,envelope.accountId]);
      else await client.query("update tracker_checklist_items set state='not-applicable',revision=revision+1,updated_at=now() where id=$1 and account_id=$2",[itemId,envelope.accountId]);
      await client.query("update tracker_checklists set revision=revision+1,updated_at=now() where id=$1 and account_id=$2",[row.checklist_id,envelope.accountId]);
      return { resourceType: "tracker-checklist-item", resourceId: itemId, revision: row.revision + 1 };
    });
  }

  async createList(envelope: CreatorCommandEnvelope, input: { name: string; description?: string; colorToken?: string }): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const id = `custom_list_${randomUUID()}`;
      const result = await client.query<{ revision: number }>(
        `insert into tracker_lists (id,account_id,name,description,color_token)
         values ($1,$2,$3,$4,$5) returning revision`,
        [id,envelope.accountId,input.name,input.description ?? null,input.colorToken ?? null],
      );
      return { resourceType: "tracker-list", resourceId: id, revision: result.rows[0]!.revision };
    });
  }

  async updateList(envelope: CreatorCommandEnvelope, listId: string, input: { name?: string; description?: string | null; colorToken?: string | null; archived?: boolean }): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const list = await this.lockList(client, envelope, listId, true);
      const result = await client.query<{ revision: number }>(
        `update tracker_lists set
           name=coalesce($4,name),
           description=case when $5::boolean then $6 else description end,
           color_token=case when $7::boolean then $8 else color_token end,
           archived_at=case when $9::boolean then case when $10::boolean then coalesce(archived_at,now()) else null end else archived_at end,
           revision=revision+1,updated_at=now()
         where id=$1 and account_id=$2 and revision=$3 returning revision`,
        [listId,envelope.accountId,list.revision,input.name ?? null,input.description !== undefined,input.description ?? null,input.colorToken !== undefined,input.colorToken ?? null,input.archived !== undefined,input.archived ?? false],
      );
      if (input.archived) await client.query("delete from tracker_list_memberships where account_id=$1 and list_id=$2", [envelope.accountId,listId]);
      return { resourceType: "tracker-list", resourceId: listId, revision: result.rows[0]!.revision };
    });
  }

  async deleteList(envelope: CreatorCommandEnvelope, listId: string): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const list = await this.lockList(client, envelope, listId, true);
      await client.query("delete from tracker_lists where id=$1 and account_id=$2 and revision=$3", [listId,envelope.accountId,list.revision]);
      return { resourceType: "tracker-list", resourceId: listId, revision: list.revision + 1 };
    });
  }

  async addOpportunity(envelope: CreatorCommandEnvelope, listId: string, opportunityId: string): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const list = await this.lockList(client, envelope, listId);
      const tracked = await client.query<{ id: string }>(
        "select id from tracked_opportunities where account_id=$1 and opportunity_id=$2", [envelope.accountId,opportunityId],
      );
      if (!tracked.rows[0]) throw new CreatorConflictError("tracked-opportunity", opportunityId, 1, 0);
      const inserted = await client.query(
        `insert into tracker_list_memberships (account_id,list_id,target_key,tracked_opportunity_id)
         values ($1,$2,$3,$4) on conflict (account_id,list_id,target_key) do nothing`,
        [envelope.accountId,listId,opportunityId,tracked.rows[0].id],
      );
      const revision = inserted.rowCount
        ? await this.bumpList(client, envelope.accountId, listId, list.revision)
        : list.revision;
      return { resourceType: "tracker-list", resourceId: listId, revision };
    });
  }

  async removeOpportunity(envelope: CreatorCommandEnvelope, listId: string, opportunityId: string): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const list = await this.lockList(client, envelope, listId);
      const removed = await client.query("delete from tracker_list_memberships where account_id=$1 and list_id=$2 and target_key=$3", [envelope.accountId,listId,opportunityId]);
      const revision = removed.rowCount
        ? await this.bumpList(client, envelope.accountId, listId, list.revision)
        : list.revision;
      return { resourceType: "tracker-list", resourceId: listId, revision };
    });
  }

  private async readChecklist(accountId: string, userId: string, opportunityId: string): Promise<CreatorChecklistView | undefined> {
    const checklist = await this.query<{ id: string; tracked_at: Date | string; source_version: string | null; revision: number; created_at: Date | string; updated_at: Date | string }>(
      `select c.id,c.tracked_at,c.source_version,c.revision,c.created_at,c.updated_at
       from tracker_checklists c join tracked_opportunities t on t.id=c.tracked_opportunity_id and t.account_id=c.account_id
       where c.account_id=$1 and t.opportunity_id=$2`,[accountId,opportunityId],
    );
    const row = checklist.rows[0];
    if (!row) return undefined;
    const itemRows = await this.query<{ id: string; label: string; normalized_key: string; position: number; state: ChecklistItemState; work_id: string | null; file_id: string | null; saved_answer_id: string | null; note: string | null; source: ChecklistItem["source"]; source_confidence: ChecklistItem["sourceConfidence"] | null; revision: number; created_at: Date | string; updated_at: Date | string }>(
      `select id,label,normalized_key,position,state,work_id,file_id,saved_answer_id,note,source,source_confidence,revision,created_at,updated_at
       from tracker_checklist_items where account_id=$1 and checklist_id=$2 order by position,created_at,id`,[accountId,row.id],
    );
    const materials = await this.query<{ label: string }>(
      "select label from opportunity_required_materials where opportunity_id=$1 and required=true order by sort_order,id",[opportunityId],
    );
    const items = itemRows.rows.map((item) => ({
      id:item.id,checklistId:row.id,label:item.label,normalizedKey:item.normalized_key,order:item.position,state:item.state,source:item.source,revision:item.revision,
      createdAt:iso(item.created_at),updatedAt:iso(item.updated_at),
      ...(item.work_id ? { libraryWorkId:item.work_id } : {}),...(item.file_id ? { libraryFileId:item.file_id } : {}),
      ...(item.saved_answer_id ? { savedAnswerId:item.saved_answer_id } : {}),...(item.note ? { note:item.note } : {}),
      ...(item.source_confidence ? { sourceConfidence:item.source_confidence } : {}),
    }));
    const count = (state: ChecklistItemState) => items.filter((item) => item.state === state).length;
    const total = items.length, complete=count("complete"), ready=count("ready"), missing=count("missing"), notApplicable=count("not-applicable");
    return {
      checklist:{ id:row.id,userId,opportunityId,trackedAt:iso(row.tracked_at),revision:row.revision,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at),...(row.source_version ? { sourceVersion:row.source_version } : {}) },
      items,
      progress:{ total,complete,ready,missing,notApplicable,percent:total ? Math.round(((complete+ready+notApplicable)/total)*100) : 0 },
      requirementsConfirmed:materials.rows.length>0,
      requiredMaterials:materials.rows.map((item)=>item.label),
    };
  }

  private async lockChecklist(client: PoolClient, envelope: CreatorCommandEnvelope, opportunityId: string): Promise<{ id: string; revision: number }> {
    const result = await client.query<{ id: string; revision: number }>(
      `select c.id,c.revision from tracker_checklists c join tracked_opportunities t on t.id=c.tracked_opportunity_id and t.account_id=c.account_id
       where c.account_id=$1 and t.opportunity_id=$2 for update of c`,[envelope.accountId,opportunityId],
    );
    const row=result.rows[0];
    if (!row || row.revision!==envelope.expectedRevision) throw new CreatorConflictError("tracker-checklist",opportunityId,envelope.expectedRevision,row?.revision ?? 0);
    return row;
  }

  private async bumpChecklist(client: PoolClient, accountId: string, checklistId: string, revision: number): Promise<number> {
    const result=await client.query<{revision:number}>("update tracker_checklists set revision=revision+1,updated_at=now() where id=$1 and account_id=$2 and revision=$3 returning revision",[checklistId,accountId,revision]);
    return result.rows[0]!.revision;
  }

  private async lockList(client: PoolClient, envelope: CreatorCommandEnvelope, listId: string, includeArchived = false): Promise<{ revision: number }> {
    const result = await client.query<{ revision: number }>(
      `select revision from tracker_lists where id=$1 and account_id=$2 ${includeArchived ? "" : "and archived_at is null"} for update`, [listId,envelope.accountId],
    );
    const row = result.rows[0];
    if (!row || row.revision !== envelope.expectedRevision) throw new CreatorConflictError("tracker-list", listId, envelope.expectedRevision, row?.revision ?? 0);
    return row;
  }

  private async bumpList(client: PoolClient, accountId: string, listId: string, revision: number): Promise<number> {
    const result = await client.query<{ revision: number }>(
      "update tracker_lists set revision=revision+1,updated_at=now() where id=$1 and account_id=$2 and revision=$3 returning revision",
      [listId,accountId,revision],
    );
    return result.rows[0]!.revision;
  }
}
