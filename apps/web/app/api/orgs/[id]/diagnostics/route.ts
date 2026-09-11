import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Diagnostics are not available yet' }, { status: 503 });
  const workspace = await getRelationalWorkspace();
  const [outbox, failedAttempts, stuckReviews] = await Promise.all([
    workspace.pool.query<{ pending: string; oldest_at: Date | null }>(`select count(*) filter (where delivered_at is null)::text pending,min(created_at) filter (where delivered_at is null) oldest_at from outbox_events where organization_id=$1`, [id]),
    workspace.pool.query<{ failed: string }>(`select count(*)::text failed from message_delivery_attempts where organization_id=$1 and provider_status='failed'`, [id]),
    workspace.pool.query<{ stuck: string }>(`select count(*)::text stuck from review_assignments ra join review_rounds rr on rr.id=ra.review_round_id join open_calls o on o.id=rr.open_call_id join programs p on p.id=o.program_id join entities e on e.id=p.entity_id where e.organization_id=$1 and ra.completed_at is null and ra.created_at < now() - interval '14 days'`, [id]),
  ]);
  const pending = Number(outbox.rows[0]?.pending ?? 0);
  const oldest = outbox.rows[0]?.oldest_at;
  return NextResponse.json({ organizationId: id, generatedAt: new Date().toISOString(), outbox: { pending, oldestPendingAt: oldest?.toISOString() ?? null }, delivery: { failedAttempts: Number(failedAttempts.rows[0]?.failed ?? 0) }, review: { stuckAssignments: Number(stuckReviews.rows[0]?.stuck ?? 0) }, source: 'relational-operator-diagnostics' }, { headers: { 'Cache-Control': 'no-store' } });
}
