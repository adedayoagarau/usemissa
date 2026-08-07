import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getWorkspaceEngine, persistWorkspace } from '@/lib/workspaceEngine';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  const authorized = request.headers.get('authorization') === `Bearer ${secret}` || new URL(request.url).searchParams.get('secret') === secret;
  if (!authorized) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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
