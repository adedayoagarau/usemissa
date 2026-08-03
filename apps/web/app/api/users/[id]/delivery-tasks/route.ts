import { NextResponse } from 'next/server';
import { requireSelf } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const workspace = await getWorkspaceEngine();
  const submissionIds = new Set([...workspace.store.submissions.values()].filter((submission) => submission.submitterAccountId === auth.session.account.id).map((submission) => submission.id));
  const workIds = new Set([...workspace.store.works.values()].filter((work) => submissionIds.has(work.submissionId)).map((work) => work.id));
  const tasks = [...workspace.store.deliveryTasks.values()].filter((task) => workIds.has(task.workId));
  return NextResponse.json(tasks, { headers: { 'Cache-Control': 'private, no-store' } });
}
