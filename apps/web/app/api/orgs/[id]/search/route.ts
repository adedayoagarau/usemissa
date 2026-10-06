import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * Record search for the organization shell: submissions by submitter name or
 * email, Work title or opportunity title, and opportunities by title. At most
 * 20 results, each with the page that opens it.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'submissions.read' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const q = new URL(request.url).searchParams.get('q')?.trim().toLocaleLowerCase('en') ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] }, { headers });
  const base = `/organization/${encodeURIComponent(id)}`;
  const radar = result.access.radar;
  const label = (accountId: string) => { const account = radar.store.accounts.get(accountId); const profile = account?.userId ? radar.store.users.get(account.userId) : undefined; return { name: profile?.displayName || account?.displayName || account?.email || 'Submitter', email: account?.email ?? '' }; };
  const submissions = workspaceRelationalAuthorityEnabled()
    ? (await (await getRelationalWorkspace()).submissionsForOrganization(id)).map((submission) => ({ id: submission.id, submitterAccountId: submission.submitterAccountId, openCallId: submission.openCallId, openCallTitle: submission.openCallTitle, status: submission.status, works: submission.works.map((work) => work.title) }))
    : result.access.workspace.submissionsForOrganization(id).map((submission) => ({ id: submission.id, submitterAccountId: submission.submitterAccountId, openCallId: submission.openCallId, openCallTitle: submission.openCallTitle, status: submission.status, works: result.access.workspace.worksForSubmission(submission.id).map((work) => work.title) }));
  const results: Array<{ kind: 'submission' | 'opportunity'; title: string; detail: string; href: string }> = [];
  const opportunities = new Map<string, string>();
  for (const submission of submissions) {
    opportunities.set(submission.openCallId, submission.openCallTitle);
    const person = label(submission.submitterAccountId);
    const haystack = `${person.name} ${person.email} ${submission.works.join(' ')} ${submission.openCallTitle}`.toLocaleLowerCase('en');
    if (haystack.includes(q)) results.push({ kind: 'submission', title: person.name, detail: `${submission.works.join(', ') || 'No Works'} · ${submission.openCallTitle} · ${submission.status.replaceAll('-', ' ')}`, href: `${base}/submissions/${encodeURIComponent(submission.id)}` });
  }
  for (const [openCallId, title] of opportunities) if (title.toLocaleLowerCase('en').includes(q)) results.unshift({ kind: 'opportunity', title, detail: 'Opportunity · open its submissions', href: `${base}/submissions?opportunity=${encodeURIComponent(openCallId)}` });
  return NextResponse.json({ results: results.slice(0, 20) }, { headers });
}
