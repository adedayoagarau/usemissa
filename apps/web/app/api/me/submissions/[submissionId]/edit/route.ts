import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { editableFields, ownedSubmissionFileUrl, submissionEditContext, submissionEditsAllowed, SUBMISSION_EDITS_UNAVAILABLE } from '@/lib/submissionEdits';
import { getWorkspaceEngine, persistWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

async function load(request: Request, submissionId: string) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: SUBMISSION_EDITS_UNAVAILABLE }, { status: 503, headers });
  const workspace = await getWorkspaceEngine();
  const context = submissionEditContext(workspace, submissionId);
  if (!context || context.submission.submitterAccountId !== session.account.id) return NextResponse.json({ error: 'Submission not found' }, { status: 404, headers });
  const organization = (await getEngine()).store.organizations.get(context.organizationId);
  const allowedByOrganization = submissionEditsAllowed(organization, context.openCallId);
  return { accountId: session.account.id, workspace, context, allowedByOrganization };
}

/** Whether this submission can still be changed, and the values that can be. */
export async function GET(request: Request, { params }: { params: Promise<{ submissionId: string }> }): Promise<Response> {
  const { submissionId } = await params;
  const found = await load(request, submissionId);
  if (found instanceof Response) return found;
  const editability = found.workspace.submissionEditability(submissionId, found.accountId, { allowedByOrganization: found.allowedByOrganization });
  return NextResponse.json({
    ...editability,
    pathId: found.context.path.id,
    works: found.workspace.worksForSubmission(submissionId).map((work) => ({ id: work.id, title: work.title, fileUrls: [...new Set([...(work.fileUrl ? [work.fileUrl] : []), ...(work.fileUrls ?? [])])] })),
    fields: editableFields(found.context.path.fields).map((field) => ({ id: field.id, label: field.label, type: field.type, required: field.required, value: found.context.submission.answers?.[field.id] ?? null })),
    revisions: found.workspace.revisionsForSubmission(submissionId).length,
  }, { headers });
}

/**
 * Changes Work titles, Work files and text or file answers while the call is
 * open and before reading starts. Files must be the submitter's own Missa
 * uploads; required answers cannot be cleared. Every change is recorded.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ submissionId: string }> }): Promise<Response> {
  const { submissionId } = await params;
  const found = await load(request, submissionId);
  if (found instanceof Response) return found;
  const body = await request.json().catch(() => ({}));
  const works = Array.isArray(body.works) ? body.works : [];
  const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers as Record<string, unknown> : {};
  const workEdits: Array<{ workId: string; title?: string; fileUrls?: string[] }> = [];
  for (const item of works) {
    if (!item || typeof item.workId !== 'string') return NextResponse.json({ error: 'Each Work change needs a workId' }, { status: 400, headers });
    if (item.title !== undefined && typeof item.title !== 'string') return NextResponse.json({ error: 'Work titles are text' }, { status: 400, headers });
    if (item.fileUrls !== undefined && (!Array.isArray(item.fileUrls) || item.fileUrls.some((url: unknown) => typeof url !== 'string' || !ownedSubmissionFileUrl(url, found.accountId)))) return NextResponse.json({ error: 'Work contains an invalid upload' }, { status: 400, headers });
    workEdits.push({ workId: item.workId, ...(item.title !== undefined ? { title: item.title } : {}), ...(item.fileUrls !== undefined ? { fileUrls: item.fileUrls } : {}) });
  }
  const fields = new Map(editableFields(found.context.path.fields).map((field) => [field.id, field]));
  const answerEdits: Record<string, string | string[] | null> = {};
  for (const [fieldId, value] of Object.entries(answers)) {
    const field = fields.get(fieldId);
    if (!field) return NextResponse.json({ error: 'That question cannot be changed after sending' }, { status: 400, headers });
    const values = value === null ? [] : Array.isArray(value) ? value : [value];
    if (values.some((item) => typeof item !== 'string')) return NextResponse.json({ error: `${field.label} must be text` }, { status: 400, headers });
    const clean = (values as string[]).map((item) => item.trim()).filter(Boolean);
    if (field.required && !clean.length) return NextResponse.json({ error: `${field.label} is required` }, { status: 400, headers });
    if (field.type === 'file-upload') {
      if (clean.some((url) => !ownedSubmissionFileUrl(url, found.accountId))) return NextResponse.json({ error: `${field.label} contains an invalid upload` }, { status: 400, headers });
      answerEdits[fieldId] = clean.length ? clean : null;
    } else {
      if (clean.join('\n').length > 10_000) return NextResponse.json({ error: `Keep ${field.label} under 10,000 characters` }, { status: 400, headers });
      answerEdits[fieldId] = typeof value === 'string' ? value : clean.length ? clean : null;
    }
  }
  try {
    const revision = found.workspace.editSubmission(submissionId, found.accountId, { works: workEdits, answers: answerEdits }, { allowedByOrganization: found.allowedByOrganization });
    await persistWorkspace();
    return NextResponse.json({ revision: { id: revision.id, at: revision.at, changes: revision.changes.length } }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Your changes were not saved';
    return NextResponse.json({ error: message }, { status: /locked|closed|withdrawn|does not take/.test(message) ? 409 : 400, headers });
  }
}
