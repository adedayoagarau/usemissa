import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { getCreatorPreferenceRepository, getCreatorLibraryRepository } from '@/lib/creatorRepositories';
import { creatorRelationalAuthorityEnabled, listCanonicalTrackedOpportunities } from '@missa/radar-adapters';
import { CreateTeamForm, CreateProgramForm, CreateOpenCallForm, PublishButton } from '@/components/workspace-forms';
import { FormBuilder } from '@/components/form-builder';
import { OrganizationSeats } from '@/components/organization-seats';
import { OrganizationBilling } from '@/components/organization-billing';
import { OpenCallControls } from '@/components/open-call-controls';
import { CreatorWorkspace } from '@/components/creator-workspace';
import type { TrackerProductItem } from '@/components/tracker-product';
import {
  mapOpportunityTypesToInterestLabels,
  mapTaxonomyToPracticeLabels,
} from '@/lib/creatorOnboardingTaxonomy';

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');

  const requestedOrganizationId = (await searchParams).organizationId;
  const targetOrg = session.memberships.find((membership) => membership.organizationId === requestedOrganizationId);

  // If scoped to a valid organization membership, render organization admin workspace
  if (requestedOrganizationId && targetOrg) {
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
          {org?.verified && <span className="ml-2 align-middle font-sans text-xs font-normal text-muted-foreground">Verified organization</span>}
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
          {entities.length === 0 && <p className="text-muted-foreground">Create your first team to begin a program.</p>}
        </div>
      </main>
    );
  }

  // Otherwise, render the Creator's personal workspace: "Your space"
  const preferenceRepo = getCreatorPreferenceRepository();
  const radarEngine = await getEngine();
  const libraryRepo = getCreatorLibraryRepository();

  let practices: string[] = [];
  let refinements: string[] = [];
  let interests: string[] = [];
  let onboardingStatus: "not_started" | "in_progress" | "completed" | "skipped" = "not_started";

  if (preferenceRepo) {
    const pState = await preferenceRepo.productState(session.account.id);
    if (pState) onboardingStatus = pState.onboardingStatus;
    const taxPrefs = await preferenceRepo.taxonomyPreferences(session.account.id);
    const oppPrefs = await preferenceRepo.opportunityPreferences(session.account.id);
    const mapping = mapTaxonomyToPracticeLabels(taxPrefs.map((t) => t.termId));
    practices = mapping.practices;
    refinements = mapping.refinements;
    if (oppPrefs?.types) {
      interests = mapOpportunityTypesToInterestLabels(oppPrefs.types);
    }
  } else if (session.account.userId) {
    const user = radarEngine.store.users.get(session.account.userId);
    if (user?.taxonomyPreferences) {
      const mapping = mapTaxonomyToPracticeLabels(user.taxonomyPreferences.map((t) => t.termId));
      practices = mapping.practices;
      refinements = mapping.refinements;
    }
    if (user?.opportunityPreferences?.types) {
      interests = mapOpportunityTypesToInterestLabels(user.opportunityPreferences.types);
    }
    if (practices.length > 0) onboardingStatus = "completed";
  }

  const relational = creatorRelationalAuthorityEnabled(process.env) && Boolean(process.env.DATABASE_URL);
  const savedOpportunities: TrackerProductItem[] = relational && process.env.DATABASE_URL
    ? (await listCanonicalTrackedOpportunities(process.env.DATABASE_URL, session.account.id)).filter(
        (i) => ["interested", "saved", "preparing"].includes(i.myStatus)
      )
    : session.account.userId
    ? Object.values(radarEngine.getTracker(session.account.userId).pipeline)
        .flat()
        .filter((i) => ["interested", "saved", "preparing"].includes(i.myStatus))
        .map((i) => ({
          opportunityId: i.opportunityId,
          title: i.title,
          organizationName: i.organizationName,
          type: i.type,
          opportunityStatus: i.opportunityStatus,
          myStatus: i.myStatus,
          deadline: i.deadline,
          deadlineKind: i.deadlineKind,
          daysToDeadline: i.daysToDeadline,
          expectedResponseBy: i.expectedResponseBy,
          daysOverdue: i.daysOverdue,
          isManual: i.isManual,
          manualId: i.manualId,
          notes: i.notes,
          workId: i.workId,
          workTitle: i.workTitle,
          importId: i.importId,
        }))
    : [];

  let libraryWorksCount = 0;
  if (libraryRepo && session.account.userId) {
    const lib = await libraryRepo.library(session.account.id, session.account.userId);
    libraryWorksCount = lib.works.length;
  }

  const organizations = session.memberships.map((membership) => ({
    id: membership.organizationId,
    name: radarEngine.store.organizations.get(membership.organizationId)?.name ?? membership.organizationId,
  }));

  return (
    <CreatorWorkspace
      displayName={session.account.displayName || "Creative Practitioner"}
      onboardingStatus={onboardingStatus}
      practices={practices}
      refinements={refinements}
      interests={interests}
      savedOpportunities={savedOpportunities}
      libraryCount={{ works: libraryWorksCount, books: 0 }}
      organizations={organizations}
    />
  );
}
