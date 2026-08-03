import { NextResponse } from 'next/server';
import { planOpenCallImport } from '@missa/workspace-engine';
import { requireOrganizationAccess } from '@/lib/organizationAccess';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const body = await request.json().catch(() => ({}));
  if (typeof body.csv !== 'string') return NextResponse.json({ error: 'csv is required' }, { status: 400 });
  try {
    const source = ['submittable', 'google-forms', 'airtable', 'generic'].includes(body.source) ? body.source : 'generic';
    return NextResponse.json(planOpenCallImport(body.csv, result.access.workspace, id, source));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to parse CSV' }, { status: 400 });
  }
}
