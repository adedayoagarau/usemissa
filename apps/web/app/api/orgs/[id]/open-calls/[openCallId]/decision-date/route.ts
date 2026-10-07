import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * The date an opportunity expects to decide by, shown to its submitters on
 * their status timeline. `date` is YYYY-MM-DD, or null to stop promising one.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (!workspaceRelationalAuthorityEnabled() && !result.access.scope.openCall(openCallId)) return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404, headers });
  const body = await request.json().catch(() => ({}));
  if (body.date !== null && (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || Number.isNaN(Date.parse(body.date)))) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD, or null to clear it' }, { status: 400, headers });
  }
  const organization = result.access.radar.store.organizations.get(id);
  if (!organization) return NextResponse.json({ error: 'Unknown organization' }, { status: 404, headers });
  const dates = { ...(organization.customization?.decisionDates ?? {}) };
  if (body.date === null) delete dates[openCallId];
  else dates[openCallId] = body.date;
  organization.customization = { ...(organization.customization ?? {}), decisionDates: dates };
  await persistOrganizationMutation(result.access, { action: 'opportunity.decision_date_set', targetType: 'open_call', targetId: openCallId, detail: { date: body.date } }, { workspace: false });
  return NextResponse.json({ openCallId, date: body.date }, { headers });
}
