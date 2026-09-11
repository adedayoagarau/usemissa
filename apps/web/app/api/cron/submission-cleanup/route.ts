import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getRelationalWorkspace, getWorkspaceEngine, persistWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  const authorized = request.headers.get('authorization') === `Bearer ${secret}` || new URL(request.url).searchParams.get('secret') === secret;
  if (!authorized) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (workspaceRelationalAuthorityEnabled()) {
    const workspace = await getRelationalWorkspace();
    const expired = await workspace.pool.query<{ id: string; organization_id: string; answers: Record<string, string | string[]> }>('select d.id,e.organization_id,d.answers from submission_drafts d join submission_paths sp on sp.id=d.submission_path_id join open_calls o on o.id=sp.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where d.expires_at<=now() order by d.expires_at,d.id limit 100');
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const urls = expired.rows.flatMap((draft) => Object.values(draft.answers ?? {}).flatMap((value) => Array.isArray(value) ? value : [value]).filter((value): value is string => typeof value === 'string' && value.startsWith('https://')));
    if (urls.length > 0 && !token) return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is not configured' }, { status: 503 });
    if (token && urls.length > 0) {
      try { await del(urls, { token }); } catch { return NextResponse.json({ error: 'Could not remove expired uploads' }, { status: 502 }); }
    }
    const client = await workspace.pool.connect();
    try {
      await client.query('begin');
      for (const draft of expired.rows) {
        await client.query('delete from submission_drafts where id=$1', [draft.id]);
        const correlationId = randomUUID();
        await client.query('insert into audit_events (account_id,organization_id,action,target_type,target_id,detail,correlation_id) values (null,$1,$2,$3,$4,$5,$6)', [draft.organization_id, 'submission_draft.expired', 'submission_draft', draft.id, JSON.stringify({ source: 'submission-cleanup' }), correlationId]);
        await client.query('insert into outbox_events (topic,aggregate_type,aggregate_id,payload,organization_id,event_key,correlation_id) values ($1,$2,$3,$4,$5,$6,$7)', ['submission_draft.expired', 'submission_draft', draft.id, JSON.stringify({ organizationId: draft.organization_id }), draft.organization_id, `submission-draft-expired:${draft.id}`, correlationId]);
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
    return NextResponse.json({ expiredDrafts: expired.rows.length, deletedFiles: urls.length, authority: 'relational' });
  }
  const workspace = await getWorkspaceEngine();
  const drafts = workspace.expiredSubmissionDrafts().slice(0, 100);
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (drafts.length > 0 && !token) return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is not configured' }, { status: 503 });
  const urls = drafts.flatMap((draft) => Object.values(draft.answers).flatMap((value) => Array.isArray(value) ? value : [value]).filter((value): value is string => typeof value === 'string' && value.startsWith('https://')));
  let deletedFiles = 0;
  if (token && urls.length > 0) {
    try { await del(urls, { token }); deletedFiles = urls.length; } catch { return NextResponse.json({ error: 'Could not remove expired uploads' }, { status: 502 }); }
  }
  for (const draft of drafts) workspace.deleteSubmissionDraft(draft.submissionPathId, draft.submitterAccountId);
  if (drafts.length > 0) await persistWorkspace();
  return NextResponse.json({ expiredDrafts: drafts.length, deletedFiles });
}
