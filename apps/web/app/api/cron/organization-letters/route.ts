import { NextResponse } from 'next/server';
import { cronAuthorization } from '@/lib/cron-auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { sendCommunicationBatch } from '@/lib/communicationsSend';
import { getWorkspaceEngine, persistWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Sends approved organization letters whose scheduled time has arrived. Each
 * batch goes through the same send path as the Send button, acting as the
 * admin who approved it; a batch whose wording changed after approval fails
 * the engine's check and stays unsent.
 */
export async function GET(request: Request) {
  const auth = cronAuthorization(request);
  if (auth === 'unconfigured') return NextResponse.json({ error: 'Scheduled letters are not configured.' }, { status: 503 });
  if (auth === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ skipped: 'relational-authority' }, { headers: { 'Cache-Control': 'no-store' } });
  const [radar, workspace] = await Promise.all([getEngine(), getWorkspaceEngine()]);
  const due = workspace.dueScheduledCommunicationBatches().slice(0, 10);
  const results: Array<{ batchId: string; organizationId: string; status: string; error?: string }> = [];
  for (const batch of due) {
    const actor = batch.approvedByAccountId ?? batch.createdByAccountId;
    const outcome = await sendCommunicationBatch({ radar, workspace, organizationId: batch.organizationId, batchId: batch.id, actorAccountId: actor, connectionString: process.env.DATABASE_URL });
    results.push(outcome.ok ? { batchId: batch.id, organizationId: batch.organizationId, status: outcome.batch.status } : { batchId: batch.id, organizationId: batch.organizationId, status: 'not-sent', error: outcome.error });
    radar.recordAudit(actor, 'communication.scheduled_send', 'communication_batch', batch.id, JSON.stringify({ status: outcome.ok ? outcome.batch.status : 'not-sent' }));
  }
  if (due.length) {
    await persistWorkspace();
    await persistRadar();
  }
  return NextResponse.json({ due: due.length, results }, { headers: { 'Cache-Control': 'no-store' } });
}
