import type { RadarEngine } from '@missa/radar-engine';
import { intakeFlags, type IntakeFlag, type WorkspaceEngine } from '@missa/workspace-engine';

/** Intake flags for every submission in an organization, opportunity by opportunity, with each opportunity's own rules. */
export function organizationIntakeFlags(input: { radar: Pick<RadarEngine, 'store'>; workspace: WorkspaceEngine; organizationId: string }): Map<string, IntakeFlag[]> {
  const { radar, workspace, organizationId } = input;
  const rulesByCall = radar.store.organizations.get(organizationId)?.customization?.eligibilityRules ?? {};
  const byCall = new Map<string, ReturnType<WorkspaceEngine['submissionsForOrganization']>>();
  for (const submission of workspace.submissionsForOrganization(organizationId)) byCall.set(submission.openCallId, [...(byCall.get(submission.openCallId) ?? []), submission]);
  const all = new Map<string, IntakeFlag[]>();
  for (const [openCallId, submissions] of byCall) {
    const flags = intakeFlags(submissions.map((submission) => ({ id: submission.id, submitterAccountId: submission.submitterAccountId, status: submission.status, category: submission.category, submittedAt: submission.submittedAt, works: workspace.worksForSubmission(submission.id) })), rulesByCall[openCallId] ?? {});
    for (const [id, list] of flags) all.set(id, list);
  }
  return all;
}

export const INTAKE_FLAG_LABELS: Record<IntakeFlag['code'], string> = {
  'repeat-submitter': 'Repeat submitter',
  'duplicate-title': 'Same title elsewhere',
  'duplicate-file': 'Same file elsewhere',
  'too-many-works': 'Too many Works',
  'category-not-accepted': 'Category not accepted',
  'missing-file': 'Missing file',
};
