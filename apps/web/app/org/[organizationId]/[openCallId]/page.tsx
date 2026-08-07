import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { SubmitForm } from '@/components/submit-form';
import type { Metadata } from 'next';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ organizationId: string; openCallId: string }> }): Promise<Metadata> {
  const { organizationId, openCallId } = await params;
  try {
    const workspaceEngine = await getWorkspaceEngine();
    const openCall = workspaceEngine.store.openCalls.get(openCallId);
    if (!openCall || openCall.status !== 'published') return pageMetadata({ title: 'Open call not found', description: 'This public Missa call is not available.', path: `/org/${organizationId}/${openCallId}`, noIndex: true });
    return pageMetadata({ title: openCall.title, description: `Read the published details and submission path for ${openCall.title}.`, path: `/org/${organizationId}/${openCallId}` });
  } catch {
    return pageMetadata({ title: 'Open call', description: 'Published open call on Missa.', path: `/org/${organizationId}/${openCallId}`, noIndex: true });
  }
}

export default async function OpenCallDetailPage({
  params,
}: {
  params: Promise<{ organizationId: string; openCallId: string }>;
}) {
  const { organizationId, openCallId } = await params;
  const radarEngine = await getEngine();
  const org = radarEngine.store.organizations.get(organizationId);
  if (!org) notFound();

  const workspaceEngine = await getWorkspaceEngine();
  const openCall = workspaceEngine.store.openCalls.get(openCallId);
  if (!openCall || openCall.status !== 'published') notFound();
  const program = workspaceEngine.store.programs.get(openCall.programId);
  const entity = program ? workspaceEngine.store.entities.get(program.entityId) : undefined;
  if (!entity || entity.organizationId !== organizationId) notFound();

  const paths = workspaceEngine.submissionPathsForOpenCall(openCallId);
  const path = paths[0];
  const linkedOpportunity = openCall.radarOpportunityId ? await getOpportunityRepository().getById(openCall.radarOpportunityId).catch(() => null) : null;

  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: openCall.title, description: linkedOpportunity?.content?.summary ?? `Published open call from ${org.name}.`, url: absoluteUrl(`/org/${organizationId}/${openCallId}`), isPartOf: { '@type': 'WebSite', name: 'Missa', url: absoluteUrl('/') } }} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: org.name, path: `/org/${organizationId}` }, { name: openCall.title }])} />
      <Link href={`/org/${organizationId}`} className="text-sm text-muted-foreground hover:text-primary">
        ← {org.name}
      </Link>
      <h1 className="mt-2 font-heading text-3xl font-medium text-foreground">{openCall.title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Published by {org.name}. Read the official guidelines and confirm the current deadline before applying.</p>
      {linkedOpportunity && <div className="mt-6 grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Deadline</p><p className="mt-1">{linkedOpportunity.deadline.date ?? linkedOpportunity.deadline.raw ?? 'To be confirmed'}</p></div><div><p className="text-xs text-muted-foreground">Fee</p><p className="mt-1">{linkedOpportunity.fee.status === 'no-fee' ? 'No fee' : linkedOpportunity.fee.status === 'paid' ? 'Paid submission' : 'Fee not confirmed'}</p></div>{linkedOpportunity.source.url && <a href={linkedOpportunity.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-primary underline-offset-2 hover:underline sm:col-span-2">Read official source</a>}</div>}
      {openCall.guidelineText && <section className="mt-8 rounded-lg border border-border p-5"><h2 className="text-sm font-semibold">Guidelines</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{openCall.guidelineText}</p></section>}

      {!path ? (
        <p className="mt-4 text-muted-foreground">This call doesn&apos;t have a submission form yet.</p>
      ) : !session ? (
        <p className="mt-4 text-muted-foreground">
          <Link href={`/login?next=${encodeURIComponent(`/org/${organizationId}/${openCallId}`)}`} className="text-primary underline-offset-2 hover:underline">
            Log in
          </Link>{' '}
          to submit.
        </p>
      ) : (
        <SubmitForm pathId={path.id} categories={path.categories} fields={path.fields} feeCents={path.feeCents} />
      )}
    </main>
  );
}
