import type { Organization } from '@missa/radar-engine';
import type { SubmissionField, SubmissionRevision, Work, WorkspaceEngine } from '@missa/workspace-engine';

export const SUBMISSION_EDITS_UNAVAILABLE = 'Changing a submission after sending it is not available while relational authority is enabled.';

/** Organizations allow edits until reading starts unless they lock submissions for this opportunity. */
export function submissionEditsAllowed(organization: Pick<Organization, 'customization'> | undefined, openCallId: string): boolean {
  return !organization?.customization?.eligibilityRules?.[openCallId]?.lockAfterSubmit;
}

/** A file belongs to the submitter when it was uploaded through Missa under their account. */
export function ownedSubmissionFileUrl(value: string, accountId: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.pathname.includes(`/missa/submissions/${accountId}/`);
  } catch {
    return false;
  }
}

/** The context an edit needs: the submission's organization, opportunity and form fields. */
export function submissionEditContext(workspace: WorkspaceEngine, submissionId: string) {
  const submission = workspace.store.submissions.get(submissionId);
  const path = submission ? workspace.store.submissionPaths.get(submission.submissionPathId) : undefined;
  const call = path ? workspace.store.openCalls.get(path.openCallId) : undefined;
  const program = call ? workspace.store.programs.get(call.programId) : undefined;
  const team = program ? workspace.store.entities.get(program.entityId) : undefined;
  if (!submission || !path || !call || !team) return undefined;
  return { submission, path, openCallId: call.id, organizationId: team.organizationId };
}

/** Fields a submitter can change after sending: text and file answers. */
export function editableFields(fields: SubmissionField[]): SubmissionField[] {
  return fields.filter((field) => field.type === 'text' || field.type === 'file-upload').sort((left, right) => left.order - right.order);
}

function fileName(url: string): string {
  try { return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? 'file').replace(/^[0-9a-f-]{36}-/, ''); } catch { return 'file'; }
}

/** Plain-language lines describing what one revision changed, for the organization's history. */
export function describeRevision(revision: SubmissionRevision, works: Pick<Work, 'id' | 'title'>[], fields: Pick<SubmissionField, 'id' | 'label'>[]): string[] {
  const workTitle = new Map(works.map((work) => [work.id, work.title]));
  const fieldLabel = new Map(fields.map((field) => [field.id, field.label]));
  return revision.changes.map((change) => {
    if (change.kind === 'work-title') return `Retitled “${change.before}” to “${change.after}”`;
    if (change.kind === 'work-files') {
      const files = change.after.map(fileName);
      return `Replaced the files on “${workTitle.get(change.workId) ?? 'a piece'}”${files.length ? ` with ${files.join(', ')}` : ', leaving none'}`;
    }
    const label = fieldLabel.get(change.fieldId) ?? 'a question no longer in the form';
    return change.after === undefined ? `Cleared the answer to ${label}` : `Changed the answer to ${label}`;
  });
}
