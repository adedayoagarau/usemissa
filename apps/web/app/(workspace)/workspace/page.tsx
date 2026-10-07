import { notFound, redirect } from 'next/navigation';
import { organizationRoleCan } from '@/lib/organizationProduct';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { CreateTeamForm, CreateProgramForm, CreateOpenCallForm, PublishButton } from '@/components/workspace-forms';
import { FormBuilder } from '@/components/form-builder';
import { OrganizationSeats } from '@/components/organization-seats';
import { OrganizationBilling } from '@/components/organization-billing';
import { OpenCallControls } from '@/components/open-call-controls';
import { loginRedirectForCurrentRequest } from '@/lib/serverAuthRedirect';
import { Sp } from "@/components/missa/spelling";

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect(await loginRedirectForCurrentRequest());

  const requestedOrganizationId = (await searchParams).organizationId;
  const targetOrg = session.memberships.find((membership) => membership.organizationId === requestedOrganizationId);

  // If scoped to a valid organization membership, render organization admin workspace
  if (requestedOrganizationId && targetOrg) {
    // This legacy surface is the Organization builder (structure, forms,
    // seats, billing), so it needs the same capability as those mutations.
    // Other roles use their projected /organization/[id] destinations.
    if (!organizationRoleCan(targetOrg.role, 'organization.manage')) notFound();
    const organizationId = targetOrg.organizationId;
    const membership = targetOrg;
    const radarEngine = await getEngine();
    const org = radarEngine.store.organizations.get(organizationId);
    const radarOpportunities = [...radarEngine.store.opportunities.values()]
      .filter((opportunity) => opportunity.claimedByOrganizationId === organizationId)
      .map((opportunity) => ({
        id: opportunity.id,
        title: opportunity.fields.title,
      }));
    const workspaceEngine = await getWorkspaceEngine();
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
        <h1 className="font-heading text-3xl font-medium text-foreground">
          {org?.name ?? organizationId}
          {org?.verified && <span className="ml-2 align-middle font-sans text-xs font-normal text-muted-foreground"><Sp>Verified organization</Sp></span>}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Public organization page: <Link href={`/org/${organizationId}`}>View page</Link>
        </p>

        <div className="mt-6">
          <OrganizationSeats organizationId={organizationId} canManage={membership.role === 'admin' || membership.role === 'owner'} />
        </div>
        <div className="mt-6">
          <OrganizationBilling organizationId={organizationId} canManage={membership.role === 'admin' || membership.role === 'owner'} />
        </div>

        <div className="mt-6">
          <CreateTeamForm organizationId={organizationId} />
        </div>

        <div className="mt-6 space-y-6">
          {entities.map((entity) => (
            <div key={entity.id} className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <h2 className="font-heading text-xl font-medium text-foreground">{entity.name}</h2>
              <div className="mt-2">
                <CreateProgramForm organizationId={organizationId} entityId={entity.id} />
              </div>
              <div className="mt-4 space-y-3">
                {entity.programs.map((program) => (
                  <div key={program.id} className="rounded-md border border-border bg-background p-3">
                    <h3 className="font-heading text-base font-medium text-foreground">{program.name}</h3>
                    <div className="mt-2">
                      <CreateOpenCallForm organizationId={organizationId} programId={program.id} radarOpportunities={radarOpportunities} />
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
                          <OpenCallControls organizationId={organizationId} openCall={call} />
                          <FormBuilder organizationId={organizationId} openCallId={call.id} existingPath={call.submissionPaths[0]} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {entities.length === 0 && <p className="text-muted-foreground"><Sp>Create your first team to begin a program.</Sp></p>}
        </div>
      </main>
    );
  }

  // "/workspace" is the Organization entry. Members who can manage an
  // organization land on its builder; creators land on Home.
  const managed = session.memberships.find((membership) => organizationRoleCan(membership.role, 'organization.manage'));
  if (managed) redirect(`/workspace?organizationId=${encodeURIComponent(managed.organizationId)}`);
  redirect('/home');
}
