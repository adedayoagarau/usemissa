import { CreatorRepositoryBase, creatorPoolFor } from '@missa/radar-adapters';
import type { MyStatus } from '@missa/radar-engine';

export type MaterialKind = 'work' | 'file' | 'answer';
export type MaterialUsage = {
  applications: { opportunityId: string; title: string; status: MyStatus; current: boolean; preserved: boolean }[];
  versions: { id: string; opportunityId: string; title: string; recordedAt: string; material: Record<string, unknown> }[];
};

export class LibraryMaterialUsageRepository extends CreatorRepositoryBase {
  constructor() {
    if (!process.env.DATABASE_URL) throw new Error('Library storage unavailable');
    super(creatorPoolFor(process.env.DATABASE_URL));
  }

  async usage(accountId: string, kind: MaterialKind, id: string): Promise<MaterialUsage | null> {
    const table = { work: 'creator_library_works', file: 'creator_library_files', answer: 'creator_saved_answers' }[kind];
    const owned = await this.query(`select id from ${table} where account_id=$1 and id=$2`, [accountId, id]);
    if (!owned.rowCount) return null;
    const key = { work: 'works', file: 'files', answer: 'answers' }[kind];
    const [current, versions] = await Promise.all([
      this.query<MaterialUsage['applications'][number]>(`
        select distinct t.opportunity_id as "opportunityId",o.title,t.status,true as current,false as preserved
        from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
        where t.account_id=$1 and (
          ($3='work' and t.work_id=$2) or
          ($3='file' and exists(select 1 from creator_library_works w where w.account_id=$1 and w.id=t.work_id and w.metadata->>'fileId'=$2)) or
          exists(select 1 from tracker_checklists c join tracker_checklist_items i on i.checklist_id=c.id and i.account_id=c.account_id
            left join creator_library_works w on w.id=i.work_id and w.account_id=i.account_id
            where c.tracked_opportunity_id=t.id and c.account_id=$1 and (
              ($3='work' and i.work_id=$2) or ($3='file' and (i.file_id=$2 or w.metadata->>'fileId'=$2)) or
              ($3='answer' and i.saved_answer_id=$2))))`, [accountId, id, kind]),
      this.query<MaterialUsage['versions'][number] & { status: MyStatus }>(`
        select v.id,t.opportunity_id as "opportunityId",o.title,t.status,v.created_at as "recordedAt",m as material
        from application_material_versions v join tracked_opportunities t on t.id=v.tracked_opportunity_id and t.account_id=v.account_id
        join opportunities o on o.id=t.opportunity_id
        cross join lateral jsonb_array_elements(coalesce(v.materials->$3,'[]'::jsonb)) m
        where v.account_id=$1 and m->>'id'=$2 order by v.created_at desc`, [accountId, id, key]),
    ]);
    const applications = new Map(current.rows.map(row => [row.opportunityId, row]));
    for (const version of versions.rows) {
      const entry = applications.get(version.opportunityId);
      applications.set(version.opportunityId, entry ? { ...entry, preserved: true } : {
        opportunityId: version.opportunityId, title: version.title, status: version.status, current: false, preserved: true,
      });
    }
    return { applications: [...applications.values()], versions: versions.rows.map(({ status: _status, ...v }) => v) };
  }
}
