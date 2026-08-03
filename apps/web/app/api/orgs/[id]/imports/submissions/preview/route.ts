import { NextResponse } from 'next/server';
import { planSubmissionImport } from '@missa/workspace-engine';
import { requireOrganizationAccess } from '@/lib/organizationAccess';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const body = await request.json().catch(() => ({}));
  if (typeof body.csv !== 'string') return NextResponse.json({ error: 'csv is required' }, { status: 400 });
  const accountByEmail = (email: string) => [...result.access.radar.store.accounts.values()].find((account) => account.email === email);
  try { return NextResponse.json(planSubmissionImport(body.csv, result.access.workspace, id, accountByEmail)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to parse submissions' }, { status: 400 }); }
}
