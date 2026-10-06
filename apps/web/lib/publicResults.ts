import type { OrganizationSubmissionStage, RadarEngine } from '@missa/radar-engine';
import type { WorkspaceEngine } from '@missa/workspace-engine';
import { resolveOrganizationCustomization } from './organizationCustomization';

export interface PublicResultsConfig {
  stages: OrganizationSubmissionStage[];
  includeWinners: boolean;
  introduction?: string;
}

export interface PublicResultsEntry { name: string; workTitles: string[] }

export interface PublicResults {
  organizationName: string;
  opportunityTitle: string;
  introduction?: string;
  stages: Array<{ stage: OrganizationSubmissionStage; label: string; entries: PublicResultsEntry[] }>;
  winners: PublicResultsEntry[];
}

const ORDER: OrganizationSubmissionStage[] = ['longlist', 'shortlist', 'finalist'];

/**
 * What a public results page would show for one opportunity. A stage lists
 * only submissions that were actually sent that stage's letter; winners are
 * Works with an accepted decision. Withdrawn submissions never appear. Only
 * names and Work titles are public; nothing else about the submission is.
 */
export function publicResultsFor(input: { radar: Pick<RadarEngine, 'store'>; workspace: WorkspaceEngine; organizationId: string; openCallId: string; config: PublicResultsConfig }): PublicResults | undefined {
  const { radar, workspace, organizationId, openCallId, config } = input;
  const openCall = workspace.organizationScope(organizationId).openCall(openCallId);
  const organization = radar.store.organizations.get(organizationId);
  if (!openCall || !organization) return undefined;
  const customization = resolveOrganizationCustomization(organization);
  const submissions = workspace.submissionsForOpenCall(openCallId).filter((submission) => submission.status !== 'withdrawn');
  const nameFor = (accountId: string) => {
    const account = radar.store.accounts.get(accountId);
    const profile = account?.userId ? radar.store.users.get(account.userId) : undefined;
    return profile?.displayName || account?.displayName || 'Name withheld';
  };
  const byName = (left: PublicResultsEntry, right: PublicResultsEntry) => left.name.localeCompare(right.name, 'en');
  const stages = ORDER.filter((stage) => config.stages.includes(stage)).map((stage) => ({
    stage,
    label: customization.stageLabels[stage],
    entries: submissions
      .filter((submission) => workspace.stageEventsForSubmission(submission.id).some((event) => event.stage === stage))
      .map((submission) => ({ name: nameFor(submission.submitterAccountId), workTitles: workspace.worksForSubmission(submission.id).map((work) => work.title) }))
      .sort(byName),
  }));
  const winners = config.includeWinners
    ? submissions.flatMap((submission) => {
        const accepted = workspace.decisionsForSubmission(organizationId, submission.id).filter((decision) => decision.outcome === 'accepted');
        if (!accepted.length) return [];
        const titles = new Map(workspace.worksForSubmission(submission.id).map((work) => [work.id, work.title]));
        return [{ name: nameFor(submission.submitterAccountId), workTitles: accepted.map((decision) => titles.get(decision.workId) ?? 'Work') }];
      }).sort(byName)
    : [];
  return { organizationName: customization.displayName, opportunityTitle: openCall.title, introduction: config.introduction, stages, winners };
}
