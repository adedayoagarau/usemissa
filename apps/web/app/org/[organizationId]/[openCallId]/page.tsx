import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { SubmitForm } from '@/components/submit-form';

export const dynamic = 'force-dynamic';

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

  const paths = workspaceEngine.submissionPathsForOpenCall(openCallId);
  const path = paths[0];

  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <Link href={`/org/${organizationId}`} className="text-sm text-muted-foreground hover:text-primary">
        ← {org.name}
      </Link>
      <h1 className="mt-2 font-heading text-3xl font-medium text-foreground">{openCall.title}</h1>

      {!path ? (
        <p className="mt-4 text-muted-foreground">This call doesn&apos;t have a submission form yet.</p>
      ) : !session ? (
        <p className="mt-4 text-muted-foreground">
          <Link href="/login" className="text-primary underline-offset-2 hover:underline">
            Log in
          </Link>{' '}
          to submit.
        </p>
      ) : (
        <SubmitForm pathId={path.id} categories={path.categories} fields={path.fields} />
      )}
    </main>
  );
}
