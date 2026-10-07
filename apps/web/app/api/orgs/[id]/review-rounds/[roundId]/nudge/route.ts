import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { resolveOrganizationCustomization } from '@/lib/organizationCustomization';
import { compatibilityRoundOperationsView, relationalRoundOperationsView } from '@/lib/readerOperationsData';
import { deliverReaderReminder } from '@/emails/reader-reminder';
import { getRelationalWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * Emails every reader with open assignments in the round. Idempotent per
 * reader, round and day, so a second click on the same day replays instead
 * of sending twice. An optional note from the organization is included.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const body = await request.json().catch(() => ({}));
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1_000) : undefined;
  const only: string[] | undefined = Array.isArray(body.readerAccountIds) ? body.readerAccountIds.filter((value: unknown): value is string => typeof value === 'string') : undefined;

  const view = workspaceRelationalAuthorityEnabled()
    ? await relationalRoundOperationsView({ radar: result.access.radar, relational: await getRelationalWorkspace(), organizationId: id, roundId })
    : compatibilityRoundOperationsView({ radar: result.access.radar, workspace: result.access.workspace, organizationId: id, roundId });
  if (!view) return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404, headers });

  const organization = result.access.radar.store.organizations.get(id);
  const customization = resolveOrganizationCustomization(organization ?? { name: 'Your organization' });
  const day = new Date().toISOString().slice(0, 10);
  const targets = view.readers.filter((reader) => reader.open > 0 && reader.email && (!only || only.includes(reader.reviewerAccountId)));
  const outcomes: Array<{ reviewerAccountId: string; label: string; status: string; reason?: string }> = [];
  for (const reader of targets) {
    const report = await deliverReaderReminder({
      readerName: reader.label === reader.email ? undefined : reader.label,
      organizationName: customization.displayName,
      opportunityTitle: view.round.openCallTitle,
      roundName: view.round.name,
      openAssignments: reader.open,
      overdueAssignments: reader.overdue,
      note,
      recipientEmail: reader.email!,
      recipientAccountId: reader.reviewerAccountId,
      organizationId: id,
      actorAccountId: result.access.session.account.id,
      reviewRoundId: roundId,
      day,
      replyTo: customization.communications.replyTo,
    }, process.env.DATABASE_URL);
    outcomes.push({ reviewerAccountId: reader.reviewerAccountId, label: reader.label, status: report.status, reason: report.reason });
  }
  if (!workspaceRelationalAuthorityEnabled()) {
    await persistOrganizationMutation(result.access, { action: 'review-round.readers_nudged', targetType: 'review_round', targetId: roundId, detail: { readers: outcomes.length, sent: outcomes.filter((item) => item.status === 'sent').length } }, { workspace: false });
  }
  return NextResponse.json({ nudged: outcomes.filter((item) => item.status === 'sent' || item.status === 'replayed').length, outcomes }, { headers });
}
