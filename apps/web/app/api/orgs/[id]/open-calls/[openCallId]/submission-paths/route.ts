import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import type { SubmissionField } from '@missa/workspace-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const fieldTypes = new Set(['text', 'file-upload', 'category-select', 'fee-toggle']);
const taxonomyRules = new Set(['accepted', 'preferred', 'required', 'excluded']);

function validForm(body: Record<string, unknown>): boolean {
  if (!Array.isArray(body.categories) || body.categories.some((item) => typeof item !== 'string' || !item.trim())) return false;
  if (!Array.isArray(body.fields) || body.fields.some((item) => {
    if (!item || typeof item !== 'object') return true;
    const field = item as Record<string, unknown>;
    return (field.id !== undefined && (typeof field.id !== 'string' || !field.id.trim())) || typeof field.label !== 'string' || !field.label.trim()
      || !fieldTypes.has(String(field.type)) || typeof field.required !== 'boolean'
      || (field.order !== undefined && (!Number.isInteger(field.order) || Number(field.order) < 0));
  })) return false;
  if (body.taxonomyAssignments !== undefined && (!Array.isArray(body.taxonomyAssignments) || body.taxonomyAssignments.some((item) => {
    if (!item || typeof item !== 'object') return true;
    const assignment = item as Record<string, unknown>;
    return typeof assignment.termId !== 'string' || !assignment.termId.trim() || !taxonomyRules.has(String(assignment.rule))
      || (assignment.required !== undefined && typeof assignment.required !== 'boolean');
  }))) return false;
  return body.feeCents === undefined || (Number.isInteger(body.feeCents) && Number(body.feeCents) >= 0);
}

function normalizedFields(fields: Array<Record<string, unknown>>): SubmissionField[] {
  return fields.map((field, index) => ({
    id: typeof field.id === 'string' ? field.id : `field_${randomUUID()}`,
    type: field.type as SubmissionField['type'],
    label: String(field.label),
    required: field.required === true,
    order: Number.isInteger(field.order) ? Number(field.order) : index,
  }));
}

/** Story 6.3: Form Builder v1. The UI never shows "Submission Path" -- users
 * see "form" and "categories" (docs/missa-naming-decisions.md). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled() && !result.access.scope.openCall(openCallId)) {
    return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404 });
  }

  const body = await request.json();
  if (!validForm(body)) {
    return NextResponse.json({ error: 'Provide valid categories, fields, taxonomy assignments, and fee' }, { status: 400 });
  }

  if (workspaceRelationalAuthorityEnabled()) {
    try {
      const workspace = await getRelationalWorkspace();
      const payload = { openCallId, categories: body.categories, fields: normalizedFields(body.fields), feeCents: typeof body.feeCents === 'number' ? body.feeCents : undefined, ...(body.taxonomyAssignments ? { taxonomyAssignments: body.taxonomyAssignments } : {}) };
      const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'submission_path.create', payload });
      const created = await workspace.createSubmissionPath(command, payload);
      return NextResponse.json({ id: created.resourceId, ...payload, revision: created.revision, receiptId: created.receiptId, idempotent: created.replayed }, { status: created.replayed ? 200 : 201 });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'failed' }, { status: mapped?.status ?? 404 });
    }
  }
  const engine = result.access.workspace;
  try {
    const path = engine.createSubmissionPath(openCallId, body.categories, body.fields, body.feeCents, body.taxonomyAssignments);
    await persistOrganizationMutation(result.access, {
      action: 'submission-form.create',
      targetType: 'submission-path',
      targetId: path.id,
      detail: { opportunityId: openCallId },
    });
    return NextResponse.json(path, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled() && !result.access.scope.openCall(openCallId)) return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404 });
  const body = await request.json();
  if (typeof body.pathId !== 'string' || !validForm(body)) return NextResponse.json({ error: 'Provide a pathId and valid form fields' }, { status: 400 });
  if (workspaceRelationalAuthorityEnabled()) {
    try {
      const workspace = await getRelationalWorkspace();
      const payload = { pathId: body.pathId, openCallId, categories: body.categories, fields: normalizedFields(body.fields), feeCents: typeof body.feeCents === 'number' ? body.feeCents : undefined, ...(body.taxonomyAssignments !== undefined ? { taxonomyAssignments: body.taxonomyAssignments } : {}) };
      const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'submission_path.update', payload, expectedRevision: body.expectedRevision });
      const updated = await workspace.updateSubmissionPath(command, body.pathId, payload);
      return NextResponse.json({ id: updated.resourceId, openCallId, categories: body.categories, fields: body.fields, feeCents: payload.feeCents, revision: updated.revision, receiptId: updated.receiptId, idempotent: updated.replayed });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'failed' }, { status: mapped?.status ?? 400 });
    }
  }
  const path = result.access.workspace.store.submissionPaths.get(body.pathId);
  if (!path || path.openCallId !== openCallId) return NextResponse.json({ error: 'Unknown form for this opportunity' }, { status: 404 });
  try {
    const updated = result.access.workspace.updateSubmissionPath(path.id, { categories: body.categories, fields: body.fields, feeCents: typeof body.feeCents === 'number' ? body.feeCents : undefined, taxonomyAssignments: body.taxonomyAssignments });
    await persistOrganizationMutation(result.access, { action: 'submission-form.update', targetType: 'submission-path', targetId: updated.id, detail: { opportunityId: openCallId } });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 400 });
  }
}
