import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'insights.read' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Insights are not available in this workspace yet' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  return NextResponse.json(result.access.workspace.reportingForOrganization(id), { headers: { 'Cache-Control': 'private, no-store' } });
}
