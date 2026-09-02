import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Pool } from 'pg';
import type { WorkspaceStore } from '../store/store.js';

export type WorkspaceParityReason = 'missing-relational' | 'unexpected-relational' | 'status-mismatch' | 'relationship-mismatch';
export interface WorkspaceParityMismatch { resourceType: string; opaqueId: string; reason: WorkspaceParityReason }
export interface WorkspaceParityReport {
  organizationId: string;
  generatedAt: string;
  totals: { compatibility: number; relational: number; matched: number; mismatched: number };
  mismatches: WorkspaceParityMismatch[];
}

export interface WorkspaceBackfillResult { organizationId: string; inserted: Record<string, number> }

function opaque(id: string): string {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `ws_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function reconcileWorkspaceLaunchSlice(pool: Pool, store: WorkspaceStore, organizationId: string, now = () => new Date().toISOString()): Promise<WorkspaceParityReport> {
  const entityIds = new Set([...store.entities.values()].filter((row) => row.organizationId === organizationId).map((row) => row.id));
  const programIds = new Set([...store.programs.values()].filter((row) => entityIds.has(row.entityId)).map((row) => row.id));
  const callIds = new Set([...store.openCalls.values()].filter((row) => programIds.has(row.programId)).map((row) => row.id));
  const pathIds = new Set([...store.submissionPaths.values()].filter((row) => callIds.has(row.openCallId)).map((row) => row.id));
  const submissionIds = new Set([...store.submissions.values()].filter((row) => pathIds.has(row.submissionPathId)).map((row) => row.id));
  const workIds = new Set([...store.works.values()].filter((row) => submissionIds.has(row.submissionId)).map((row) => row.id));
  const roundIds = new Set([...store.reviewRounds.values()].filter((row) => callIds.has(row.openCallId)).map((row) => row.id));
  const expected: Array<[string,string,string?]> = [
    ...[...entityIds].map((id) => ['entity',id,store.entities.get(id)?.organizationId] as [string,string,string]),
    ...[...programIds].map((id) => ['program',id,store.programs.get(id)?.entityId] as [string,string,string]),
    ...[...callIds].map((id) => ['open_call',id,`${store.openCalls.get(id)?.programId}:${store.openCalls.get(id)?.status}`] as [string,string,string]),
    ...[...pathIds].map((id) => ['submission_path',id,store.submissionPaths.get(id)?.openCallId] as [string,string,string]),
    ...[...submissionIds].map((id) => ['submission',id,`${store.submissions.get(id)?.submissionPathId}:${store.submissions.get(id)?.status}`] as [string,string,string]),
    ...[...workIds].map((id) => ['work',id,store.works.get(id)?.submissionId] as [string,string,string]),
    ...[...roundIds].map((id) => ['review_round',id,store.reviewRounds.get(id)?.openCallId] as [string,string,string]),
    ...[...store.reviewAssignments.values()].filter((row) => roundIds.has(row.reviewRoundId) && submissionIds.has(row.submissionId)).map((row) => ['review_assignment',row.id,`${row.reviewRoundId}:${row.submissionId}:${Boolean(row.completedAt)}`] as [string,string,string]),
    ...[...store.decisions.values()].filter((row) => workIds.has(row.workId)).map((row) => ['decision',row.id,`${row.workId}:${row.outcome}`] as [string,string,string]),
    ...[...store.deliveryTasks.values()].filter((row) => workIds.has(row.workId)).map((row) => ['delivery_task',row.id,`${row.workId}:${row.status}`] as [string,string,string]),
  ];
  const actual = await pool.query<{ type:string; id:string; status:string|null }>(`select * from (
    select 'entity' type,e.id,e.organization_id status from entities e where e.organization_id=$1 union all
    select 'program',p.id,p.entity_id from programs p join entities e on e.id=p.entity_id where e.organization_id=$1 union all
    select 'open_call',o.id,o.program_id||':'||o.status from open_calls o join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where e.organization_id=$1 union all
    select 'submission_path',sp.id,sp.open_call_id from submission_paths sp join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where e.organization_id=$1 union all
    select 'submission',s.id,s.submission_path_id||':'||s.status from submissions s join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where e.organization_id=$1 union all
    select 'work',w.id,w.submission_id from works w join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where e.organization_id=$1 union all
    select 'review_round',rr.id,rr.open_call_id from review_rounds rr join open_calls o on o.id=rr.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where e.organization_id=$1 union all
    select 'review_assignment',ra.id,ra.review_round_id||':'||ra.submission_id||':'||(ra.completed_at is not null)::text from review_assignments ra join review_rounds rr on rr.id=ra.review_round_id join open_calls o on o.id=rr.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where e.organization_id=$1 union all
    select 'decision',d.id,d.work_id||':'||d.outcome from decisions d join works w on w.id=d.work_id join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where e.organization_id=$1 union all
    select 'delivery_task',dt.id,dt.work_id||':'||dt.status from delivery_tasks dt join works w on w.id=dt.work_id join submissions s on s.id=w.submission_id join submission_paths sp on sp.id=s.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where e.organization_id=$1
  ) parity order by type,id`, [organizationId]);
  const expectedMap = new Map(expected.map(([type,id,status]) => [`${type}:${id}`,status]));
  const actualMap = new Map(actual.rows.map((row) => [`${row.type}:${row.id}`,row.status ?? undefined]));
  const mismatches: WorkspaceParityMismatch[]=[];
  for (const [key,status] of expectedMap) {
    const [resourceType,id]=key.split(':',2) as [string,string];
    if (!actualMap.has(key)) mismatches.push({resourceType,opaqueId:opaque(id),reason:'missing-relational'});
    else if (status !== undefined && actualMap.get(key)!==status) mismatches.push({resourceType,opaqueId:opaque(id),reason:['entity','program','open_call','submission_path','submission','work','review_round','review_assignment','decision','delivery_task'].includes(resourceType)?'relationship-mismatch':'status-mismatch'});
  }
  for (const key of actualMap.keys()) if (!expectedMap.has(key)) { const [resourceType,id]=key.split(':',2) as [string,string]; mismatches.push({resourceType,opaqueId:opaque(id),reason:'unexpected-relational'}); }
  mismatches.sort((a,b)=>`${a.resourceType}:${a.opaqueId}:${a.reason}`.localeCompare(`${b.resourceType}:${b.opaqueId}:${b.reason}`));
  return {organizationId:opaque(organizationId),generatedAt:now(),totals:{compatibility:expectedMap.size,relational:actualMap.size,matched:expectedMap.size-mismatches.filter((m)=>m.reason!=='unexpected-relational').length,mismatched:mismatches.length},mismatches};
}

export async function writeWorkspaceParityArtifact(outputPath: string, report: WorkspaceParityReport): Promise<void> {
  if (!outputPath.endsWith('.json')) throw new Error('Workspace parity artifacts must use a .json path');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

/** Loads one organization into an empty disposable relational slice. This is a
 * rehearsal helper, not a production backfill: it refuses a non-empty tenant
 * and deliberately excludes drafts, audit history, outbox, and receipts. */
export async function backfillWorkspaceLaunchSlice(pool: Pool, store: WorkspaceStore, organizationId: string): Promise<WorkspaceBackfillResult> {
  const client = await pool.connect();
  const inserted: Record<string, number> = {};
  const count = (type: string) => { inserted[type] = (inserted[type] ?? 0) + 1; };
  try {
    await client.query('begin');
    const occupied = await client.query('select 1 from entities where organization_id=$1 limit 1', [organizationId]);
    if (occupied.rowCount) throw new Error('Relational backfill target is not empty for this organization');
    const entities = [...store.entities.values()].filter((row) => row.organizationId === organizationId);
    const entityIds = new Set(entities.map((row) => row.id));
    const programs = [...store.programs.values()].filter((row) => entityIds.has(row.entityId));
    const programIds = new Set(programs.map((row) => row.id));
    const calls = [...store.openCalls.values()].filter((row) => programIds.has(row.programId));
    const callIds = new Set(calls.map((row) => row.id));
    const paths = [...store.submissionPaths.values()].filter((row) => callIds.has(row.openCallId));
    const pathIds = new Set(paths.map((row) => row.id));
    const submissions = [...store.submissions.values()].filter((row) => pathIds.has(row.submissionPathId));
    const submissionIds = new Set(submissions.map((row) => row.id));
    const works = [...store.works.values()].filter((row) => submissionIds.has(row.submissionId));
    const workIds = new Set(works.map((row) => row.id));
    const rounds = [...store.reviewRounds.values()].filter((row) => callIds.has(row.openCallId));
    const roundIds = new Set(rounds.map((row) => row.id));
    const assignments = [...store.reviewAssignments.values()].filter((item) => roundIds.has(item.reviewRoundId) && submissionIds.has(item.submissionId));
    const assignmentIds = new Set(assignments.map((row) => row.id));
    for (const row of entities) { await client.query('insert into entities (id,organization_id,name,label,created_at,updated_at) values ($1,$2,$3,$4,$5,$5)', [row.id,row.organizationId,row.name,row.label ?? null,row.createdAt]); count('entity'); }
    for (const row of programs) { await client.query('insert into programs (id,entity_id,name,created_at,updated_at) values ($1,$2,$3,$4,$4)', [row.id,row.entityId,row.name,row.createdAt]); count('program'); }
    for (const row of calls) { await client.query('insert into open_calls (id,program_id,title,status,radar_opportunity_id,created_at,updated_at,published_at) values ($1,$2,$3,$4,$5,$6,$6,$7)', [row.id,row.programId,row.title,row.status,row.radarOpportunityId ?? null,row.createdAt,row.publishedAt ?? null]); count('open_call'); }
    for (const row of paths) { await client.query('insert into submission_paths (id,open_call_id,categories,fields,fee_cents,created_at,updated_at) values ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$6)', [row.id,row.openCallId,JSON.stringify(row.categories),JSON.stringify(row.fields),row.feeCents ?? null,row.createdAt]); count('submission_path'); }
    for (const row of submissions) { await client.query('insert into submissions (id,submission_path_id,submitter_account_id,status,submitted_at,payment_status,payment_session_id,fee_cents,idempotency_key,answers,category,updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$5)', [row.id,row.submissionPathId,row.submitterAccountId,row.status,row.submittedAt,row.paymentStatus ?? 'not-required',row.paymentSessionId ?? null,row.feeCents ?? null,row.idempotencyKey ?? null,row.answers ?? null,row.category ?? null]); count('submission'); }
    for (const row of works) { await client.query('insert into works (id,submission_id,title,file_url,file_urls,"order",created_at,updated_at) values ($1,$2,$3,$4,$5,$6,now(),now())', [row.id,row.submissionId,row.title,row.fileUrl ?? null,row.fileUrls ? JSON.stringify(row.fileUrls) : null,row.order]); count('work'); }
    for (const row of rounds) { await client.query('insert into review_rounds (id,open_call_id,name,created_at,updated_at) values ($1,$2,$3,$4,$4)', [row.id,row.openCallId,row.name,row.createdAt]); count('review_round'); }
    for (const row of assignments) { await client.query('insert into review_assignments (id,review_round_id,submission_id,reviewer_account_id,completed_at,created_at,updated_at) values ($1,$2,$3,$4,$5,now(),now())', [row.id,row.reviewRoundId,row.submissionId,row.reviewerAccountId,row.completedAt ?? null]); count('review_assignment'); }
    for (const row of [...store.reviewRecommendations.values()].filter((item) => assignmentIds.has(item.reviewAssignmentId))) { await client.query('insert into review_recommendations (review_assignment_id,score,notes,recorded_at,updated_at) values ($1,$2,$3,$4,$4)', [row.reviewAssignmentId,row.score ?? null,row.notes ?? null,row.recordedAt]); count('review_recommendation'); }
    for (const row of [...store.decisions.values()].filter((item) => workIds.has(item.workId))) { await client.query('insert into decisions (id,work_id,outcome,decided_by_account_id,decided_at,updated_at) values ($1,$2,$3,$4,$5,$5)', [row.id,row.workId,row.outcome,row.decidedByAccountId,row.decidedAt]); count('decision'); }
    for (const row of [...store.deliveryTasks.values()].filter((item) => workIds.has(item.workId))) { await client.query('insert into delivery_tasks (id,work_id,status,due_date,completed_at,created_at,updated_at) values ($1,$2,$3,$4,$5,now(),now())', [row.id,row.workId,row.status,row.dueDate ?? null,row.completedAt ?? null]); count('delivery_task'); }
    await client.query('commit');
    return { organizationId: opaque(organizationId), inserted };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
