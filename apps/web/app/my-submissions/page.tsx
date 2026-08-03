import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

export const dynamic = 'force-dynamic';

export default async function MySubmissionsPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login?next=/my-submissions');
  const workspace = await getWorkspaceEngine();
  const radar = await getEngine();
  const submissions = [...workspace.store.submissions.values()].filter((submission) => submission.submitterAccountId === session.account.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return <main className="mx-auto max-w-3xl px-6 py-10"><Link href="/opportunities" className="text-sm text-muted-foreground hover:text-foreground">← Back to opportunities</Link><h1 className="mt-5 font-heading text-4xl font-medium tracking-tight text-foreground">My submissions</h1><p className="mt-2 text-muted-foreground">Receipts and status for submissions sent through Missa.</p><div className="mt-8 space-y-3">{submissions.map((submission) => { const path = workspace.store.submissionPaths.get(submission.submissionPathId); const call = path ? workspace.store.openCalls.get(path.openCallId) : undefined; const entity = call ? workspace.store.entities.get(workspace.store.programs.get(call.programId)?.entityId ?? '') : undefined; const org = entity ? radar.store.organizations.get(entity.organizationId) : undefined; return <Link key={submission.id} href={`/my-submissions/${submission.id}`} className="block rounded-lg border border-border bg-white p-5 hover:border-primary/40"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-medium text-foreground">{call?.title ?? 'Submission'}</h2><p className="mt-1 text-sm text-muted-foreground">{org?.name ?? 'Organization'} · {submission.submittedAt.slice(0, 10)}</p></div><span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">{submission.status.replaceAll('-', ' ')}</span></div><p className="mt-3 text-sm text-muted-foreground">{workspace.worksForSubmission(submission.id).map((work) => work.title).join(', ')}</p></Link>; })}{submissions.length === 0 && <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">You have not submitted through Missa yet.</div>}</div></main>;
}
