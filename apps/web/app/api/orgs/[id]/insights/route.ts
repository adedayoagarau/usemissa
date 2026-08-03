import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.access.workspace.reportingForOrganization(id), { headers: { 'Cache-Control': 'private, no-store' } });
}
