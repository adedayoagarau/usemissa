import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { CreateTeamForm, CreateProgramForm, CreateOpenCallForm, PublishButton } from '@/components/workspace-forms';
import { FormBuilder } from '@/components/form-builder';

export default async function WorkspacePage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');

  if (session.memberships.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-foreground">Missa Workspace</h1>
        <p className="mt-2 text-muted-foreground">
          You are not a member of any organization yet. Request a claim on a listing your organization owns from
          the Opportunities tab — a domain match approves instantly, otherwise an admin reviews it.
        </p>
      </main>
    );
  }

  const organizationId = session.memberships[0].organizationId;
  const radarEngine = await getEngine();
  const org = radarEngine.store.organizations.get(organizationId);
  const workspaceEngine = getWorkspaceEngine();
  const entities = workspaceEngine.entitiesForOrganization(organizationId).map((e) => ({
    ...e,
    programs: workspaceEngine.programsForEntity(e.id).map((p) => ({
      ...p,
      openCalls: workspaceEngine.openCallsForProgram(p.id).map((call) => ({
        ...call,
        submissionPaths: workspaceEngine.submissionPathsForOpenCall(call.id),
      })),
    })),
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-foreground">
        {org?.name ?? organizationId}
        {org?.verified && <span className="ml-2 text-xs text-muted-foreground">verified</span>}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Public page: <Link href={`/org/${organizationId}`}>/org/{organizationId}</Link>
      </p>

      <div className="mt-6">
        <CreateTeamForm organizationId={organizationId} />
      </div>

      <div className="mt-6 space-y-6">
        {entities.map((entity) => (
          <div key={entity.id} className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-medium text-foreground">{entity.name}</h2>
            <div className="mt-2">
              <CreateProgramForm organizationId={organizationId} entityId={entity.id} />
            </div>
            <div className="mt-4 space-y-3">
              {entity.programs.map((program) => (
                <div key={program.id} className="rounded-md border border-border p-3">
                  <h3 className="text-sm font-medium text-foreground">{program.name}</h3>
                  <div className="mt-2">
                    <CreateOpenCallForm organizationId={organizationId} programId={program.id} />
                  </div>
                  <div className="mt-2 space-y-3">
                    {program.openCalls.map((call) => (
                      <div key={call.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span>
                            {call.title} — <span className="text-muted-foreground">{call.status}</span>
                          </span>
                          {call.status === 'draft' && <PublishButton organizationId={organizationId} openCallId={call.id} />}
                        </div>
                        {call.submissionPaths.length === 0 ? (
                          <FormBuilder organizationId={organizationId} openCallId={call.id} />
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Form saved · {call.submissionPaths[0].categories.join(', ') || 'no categories'} ·{' '}
                            {call.submissionPaths[0].fields.length} field(s)
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {entities.length === 0 && <p className="text-muted-foreground">Create your first Team to get started.</p>}
      </div>
    </main>
  );
}
