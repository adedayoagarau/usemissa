import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const organization = result.access.radar.store.organizations.get(id);
  if (!organization) return NextResponse.json({ error: 'Unknown organization' }, { status: 404 });
  return NextResponse.json({
    organizationId: id,
    plan: organization.billingTier ?? 'free',
    ...result.access.radar.organizationSeatUsage(id),
  });
}
