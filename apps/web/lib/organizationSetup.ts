import type { RadarEngine } from '@missa/radar-engine';
import type { WorkspaceEngine } from '@missa/workspace-engine';
import { organizationDestinationHref } from './organizationProduct';

export interface SetupStep {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  href: string;
  action: string;
}

/**
 * First-run checklist for an organization, ticked from real records only:
 * nothing is marked done because someone clicked past it.
 */
export function organizationSetupSteps(input: { radar: Pick<RadarEngine, 'store'>; workspace: WorkspaceEngine; organizationId: string }): SetupStep[] {
  const { radar, workspace, organizationId } = input;
  const id = encodeURIComponent(organizationId);
  const teams = workspace.entitiesForOrganization(organizationId);
  const programs = teams.flatMap((team) => workspace.programsForEntity(team.id));
  const calls = programs.flatMap((program) => workspace.openCallsForProgram(program.id));
  const forms = calls.flatMap((call) => workspace.submissionPathsForOpenCall(call.id));
  const rounds = calls.flatMap((call) => workspace.reviewRoundsForOpenCall(call.id));
  const readers = radar.store.memberships.filter((membership) => membership.organizationId === organizationId && membership.role === 'reviewer');
  const customization = radar.store.organizations.get(organizationId)?.customization;
  const batches = workspace.communicationBatchesForOrganization(organizationId);
  return [
    { id: 'structure', title: 'Create a team and a program', detail: 'Programs group your opportunities, for example "Annual prize".', done: programs.length > 0, href: `/workspace?organizationId=${id}`, action: 'Open the builder' },
    { id: 'opportunity', title: 'Publish an opportunity', detail: 'A published opportunity appears on your public page and accepts submissions.', done: calls.some((call) => call.status === 'published'), href: organizationDestinationHref('opportunities', organizationId), action: 'Open calls' },
    { id: 'form', title: 'Build the submission form', detail: 'Add the questions and files you need from each submitter.', done: forms.some((form) => form.fields.length > 0), href: `/workspace?organizationId=${id}`, action: 'Open the form builder' },
    { id: 'readers', title: 'Invite your readers', detail: 'Members with the reviewer role can be given reads and see only their own queue.', done: readers.length > 0, href: organizationDestinationHref('people', organizationId), action: 'Open People' },
    { id: 'round', title: 'Open a reading round', detail: 'Rounds hold reads, due dates and scores, and feed the next stage.', done: rounds.length > 0, href: organizationDestinationHref('reviews', organizationId), action: 'Open Reviews' },
    { id: 'appearance', title: 'Set your appearance and stage words', detail: 'Accent, logo, what you call each stage, and what submitters can see.', done: Boolean(customization?.accent || customization?.displayName || customization?.logoUrl || customization?.stageLabels || customization?.statusTransparency), href: `${organizationDestinationHref('settings', organizationId)}?section=brand`, action: 'Open Brand settings' },
    { id: 'communications', title: 'Set who letters come from', detail: 'Sender name, reply-to address and sign-off for every letter.', done: Boolean(customization?.communications?.senderName || customization?.communications?.replyTo || customization?.communications?.signoff), href: `${organizationDestinationHref('settings', organizationId)}?section=communications`, action: 'Open Communications settings' },
    { id: 'letter', title: 'Send your first letter', detail: 'Longlist, shortlist and decision letters go out after approval.', done: batches.some((batch) => batch.status === 'sent' || batch.status === 'partially-sent'), href: organizationDestinationHref('messages', organizationId), action: 'Open Messages' },
  ];
}
