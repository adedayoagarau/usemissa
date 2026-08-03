import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

export const dynamic = 'force-dynamic';

export default async function SubmissionReceiptPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=/my-submissions/${(await params).submissionId}`);
  const { submissionId } = await params;
  const workspace = await getWorkspaceEngine();
  const submission = workspace.store.submissions.get(submissionId);
  if (!submission || submission.submitterAccountId !== session.account.id) notFound();
  const path = workspace.store.submissionPaths.get(submission.submissionPathId);
  const call = path ? workspace.store.openCalls.get(path.openCallId) : undefined;
  const entity = call ? workspace.store.entities.get(workspace.store.programs.get(call.programId)?.entityId ?? '') : undefined;
  const radar = await getEngine();
  const org = entity ? radar.store.organizations.get(entity.organizationId) : undefined;
  const decisions = workspace.decisionsForSubmission(entity?.organizationId ?? '', submission.id);
  return <main className="mx-auto max-w-2xl px-6 py-10"><Link href="/my-submissions" className="text-sm text-muted-foreground hover:text-foreground">← My submissions</Link><div className="mt-6 rounded-xl border border-border bg-white p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Submission receipt</p><h1 className="mt-3 font-heading text-3xl font-medium text-foreground">{call?.title ?? 'Submission'}</h1><p className="mt-1 text-sm text-muted-foreground">{org?.name ?? 'Organization'} · submitted {submission.submittedAt.slice(0, 10)}</p><div className="mt-6 rounded-lg border border-green/20 bg-green/5 p-4"><p className="font-medium text-foreground">{submission.status === 'submitted' ? 'Submitted successfully' : `Status: ${submission.status.replaceAll('-', ' ')}`}</p><p className="mt-1 text-sm text-muted-foreground">Keep this receipt for your records. Missa will show decisions here when the organization records them.</p></div><h2 className="mt-7 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Works</h2><ul className="mt-2 space-y-2">{workspace.worksForSubmission(submission.id).map((work) => { const decision = decisions.find((item) => item.workId === work.id); return <li key={work.id} className="flex items-center justify-between rounded-md border border-border px-3 py-3 text-sm"><span>{work.title}</span>{decision && <span className="text-xs text-muted-foreground">{decision.outcome}</span>}</li>; })}</ul></div></main>;
}
