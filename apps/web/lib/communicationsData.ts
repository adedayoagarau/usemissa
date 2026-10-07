import type { RadarEngine } from '@missa/radar-engine';
import {
  communicationContentHash,
  communicationTemplate,
  defaultRecipientsFor,
  describeOutcomes,
  joinTitles,
  type CommunicationBatch,
  type CommunicationKind,
  type RecipientCandidate,
  type WorkspaceEngine,
} from '@missa/workspace-engine';
import { renderCommunicationForRecipient, type CommunicationMergeValues } from '@/emails/organization-communication';
import type { ResolvedOrganizationCustomization } from './organizationCustomization';

type Radar = Pick<RadarEngine, 'store'>;

export const COMMUNICATIONS_UNAVAILABLE = 'Letter batches are kept on the compatibility workspace, which is unavailable while relational authority is enabled.';

export interface CandidateView extends RecipientCandidate {
  submitterLabel: string;
  email?: string;
  submittedAt: string;
  /** True when the default rule for the requested kind selects this submission. */
  suggested: boolean;
  suggestedWorkIds: string[];
}

function submitterIdentity(radar: Radar, accountId: string): { label: string; givenName?: string; email?: string } {
  const account = radar.store.accounts.get(accountId);
  const profile = account?.userId ? radar.store.users.get(account.userId) : undefined;
  const label = profile?.displayName || account?.displayName || account?.email || accountId;
  return { label, givenName: account?.givenName || profile?.displayName?.split(' ')[0] || account?.displayName?.split(' ')[0], email: account?.email };
}

/** Every submission in an opportunity, annotated with the default selection for a kind. */
export function communicationCandidates(input: { radar: Radar; workspace: WorkspaceEngine; organizationId: string; openCallId: string; kind: CommunicationKind }): CandidateView[] {
  const { radar, workspace, organizationId, openCallId, kind } = input;
  const scope = workspace.organizationScope(organizationId);
  if (!scope.openCall(openCallId)) return [];
  const candidates: RecipientCandidate[] = workspace.submissionsForOpenCall(openCallId).map((submission) => {
    const decisions = workspace.decisionsForSubmission(organizationId, submission.id);
    return {
      submissionId: submission.id,
      submitterAccountId: submission.submitterAccountId,
      status: submission.status,
      works: workspace.worksForSubmission(submission.id).map((work) => ({ id: work.id, title: work.title, outcome: decisions.find((decision) => decision.workId === work.id)?.outcome })),
      stagesTold: workspace.stageEventsForSubmission(submission.id).map((event) => event.stage),
    };
  });
  const defaults = new Map(defaultRecipientsFor(kind, candidates).map((selection) => [selection.submissionId, selection.workIds]));
  return candidates
    .map((candidate) => {
      const submission = workspace.store.submissions.get(candidate.submissionId)!;
      const identity = submitterIdentity(radar, candidate.submitterAccountId);
      return { ...candidate, submitterLabel: identity.label, email: identity.email, submittedAt: submission.submittedAt, suggested: defaults.has(candidate.submissionId), suggestedWorkIds: defaults.get(candidate.submissionId) ?? [] };
    })
    .sort((left, right) => Number(right.suggested) - Number(left.suggested) || left.submitterLabel.localeCompare(right.submitterLabel));
}

/** Merge values for one recipient of a batch. */
export function mergeValuesForRecipient(input: { radar: Radar; workspace: WorkspaceEngine; batch: Pick<CommunicationBatch, 'organizationId' | 'openCallId' | 'kind' | 'stage'>; recipient: { submissionId: string; submitterAccountId: string; workIds: string[] }; customization: ResolvedOrganizationCustomization }): CommunicationMergeValues {
  const { radar, workspace, batch, recipient, customization } = input;
  const openCall = workspace.store.openCalls.get(batch.openCallId);
  const works = workspace.worksForSubmission(recipient.submissionId);
  const chosen = recipient.workIds.length ? works.filter((work) => recipient.workIds.includes(work.id)) : works;
  const decisions = workspace.decisionsForSubmission(batch.organizationId, recipient.submissionId);
  const identity = submitterIdentity(radar, recipient.submitterAccountId);
  return {
    submitterName: identity.givenName || identity.label,
    opportunityTitle: openCall?.title ?? 'this opportunity',
    organizationName: customization.displayName,
    workTitles: joinTitles(chosen.map((work) => work.title)),
    stageLabel: batch.stage ? customization.stageLabels[batch.stage].toLocaleLowerCase('en') : '',
    outcome: describeOutcomes(chosen.flatMap((work) => { const outcome = decisions.find((decision) => decision.workId === work.id)?.outcome; return outcome ? [outcome] : []; })),
    senderName: customization.communications.senderName,
  };
}

export interface RenderedRecipientLetter {
  submissionId: string;
  submitterLabel: string;
  to?: string;
  subject: string;
  html: string;
  text: string;
}

export function renderBatchLetters(input: { radar: Radar; workspace: WorkspaceEngine; batch: CommunicationBatch; customization: ResolvedOrganizationCustomization; limit?: number }): RenderedRecipientLetter[] {
  const { radar, workspace, batch, customization } = input;
  return batch.recipients.slice(0, input.limit ?? batch.recipients.length).map((recipient) => {
    const identity = submitterIdentity(radar, recipient.submitterAccountId);
    const values = mergeValuesForRecipient({ radar, workspace, batch, recipient, customization });
    const rendered = renderCommunicationForRecipient({ kind: batch.kind, organizationName: customization.displayName, subjectTemplate: batch.subject, bodyTemplate: batch.body, signoff: customization.communications.signoff, values, submissionId: recipient.submissionId });
    return { submissionId: recipient.submissionId, submitterLabel: identity.label, to: identity.email, ...rendered };
  });
}

export function batchTemplateVersion(batch: Pick<CommunicationBatch, 'subject' | 'body'>): string {
  return `organization-communication.${communicationContentHash(batch.subject, batch.body)}`;
}

/** Summary shape sent to the client; recipients keep ids and states, never addresses. */
export function batchSummary(batch: CommunicationBatch, radar: Radar, delivery?: Map<string, string>) {
  const counts = batch.recipients.reduce((totals, recipient) => { totals[recipient.status] = (totals[recipient.status] ?? 0) + 1; return totals; }, {} as Record<string, number>);
  const label = (accountId?: string) => (accountId ? submitterIdentity(radar, accountId).label : undefined);
  return {
    id: batch.id,
    openCallId: batch.openCallId,
    kind: batch.kind,
    kindLabel: communicationTemplate(batch.kind).label,
    stage: batch.stage,
    subject: batch.subject,
    body: batch.body,
    status: batch.status,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
    approvalRequestedAt: batch.approvalRequestedAt,
    approvedAt: batch.approvedAt,
    scheduledFor: batch.scheduledFor,
    sentAt: batch.sentAt,
    deliveryKnown: Boolean(delivery),
    createdBy: label(batch.createdByAccountId),
    createdByAccountId: batch.createdByAccountId,
    approvedBy: label(batch.approvedByAccountId),
    recipients: batch.recipients.map((recipient) => ({ submissionId: recipient.submissionId, submitterLabel: submitterIdentity(radar, recipient.submitterAccountId).label, workIds: recipient.workIds, status: recipient.status, reason: recipient.reason, sentAt: recipient.sentAt, delivery: recipient.effectId ? delivery?.get(recipient.effectId) : undefined })),
    counts,
  };
}

export type CommunicationBatchSummary = ReturnType<typeof batchSummary>;
