import { NextResponse } from 'next/server';
import { COMMUNICATION_TEMPLATES, communicationTemplate, type CommunicationKind } from '@missa/workspace-engine';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { communicationCandidates, COMMUNICATIONS_UNAVAILABLE } from '@/lib/communicationsData';
import { resolveOrganizationCustomization } from '@/lib/organizationCustomization';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/** Recipient candidates for a kind within one opportunity, with the default selection marked. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: COMMUNICATIONS_UNAVAILABLE }, { status: 503, headers });
  const url = new URL(request.url);
  const openCallId = url.searchParams.get('openCallId')?.trim();
  const kind = url.searchParams.get('kind')?.trim() as CommunicationKind | undefined;
  if (!openCallId || !kind || !COMMUNICATION_TEMPLATES.some((template) => template.kind === kind)) {
    return NextResponse.json({ error: 'openCallId and a known kind are required' }, { status: 400, headers });
  }
  if (!result.access.scope.openCall(openCallId)) return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404, headers });
  const organization = result.access.radar.store.organizations.get(id);
  const customization = resolveOrganizationCustomization(organization ?? { name: id });
  const template = communicationTemplate(kind);
  const candidates = communicationCandidates({ radar: result.access.radar, workspace: result.access.workspace, organizationId: id, openCallId, kind });
  return NextResponse.json({
    kind,
    template: { ...template, stageLabel: template.stage ? customization.stageLabels[template.stage] : undefined },
    candidates: candidates.map((candidate) => ({ submissionId: candidate.submissionId, submitterAccountId: candidate.submitterAccountId, submitterLabel: candidate.submitterLabel, status: candidate.status, submittedAt: candidate.submittedAt, works: candidate.works, stagesTold: candidate.stagesTold, suggested: candidate.suggested, suggestedWorkIds: candidate.suggestedWorkIds })),
  }, { headers });
}
