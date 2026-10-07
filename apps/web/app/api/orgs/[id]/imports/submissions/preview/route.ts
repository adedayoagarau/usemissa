import { NextResponse } from 'next/server';
import { planSubmissionImport } from '@missa/workspace-engine';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { resolveImportColumnMapping } from '@/lib/jevDecisions';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Imports are not available in this workspace yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.csv !== 'string') return NextResponse.json({ error: 'csv is required' }, { status: 400 });
  const accountByEmail = (email: string) => [...result.access.radar.store.accounts.values()].find((account) => account.email === email);
  try {
    const source = ['submittable', 'google-forms', 'airtable', 'generic'].includes(body.source) ? body.source : 'generic';
    const { columnMapping, columns } = await resolveImportColumnMapping({ kind: 'submission', csv: body.csv, organizationId: id, requestedMapping: body.columnMapping, recordInShadow: true });
    if (!columns) return NextResponse.json(planSubmissionImport(body.csv, result.access.workspace, id, accountByEmail, source));
    return NextResponse.json({ ...planSubmissionImport(body.csv, result.access.workspace, id, accountByEmail, source, { columnMapping }), columns });
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to parse submissions' }, { status: 400 }); }
}
