import { NextResponse } from 'next/server';
import { commitSubmissionImport, planSubmissionImport } from '@missa/workspace-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const body = await request.json().catch(() => ({}));
  if (typeof body.csv !== 'string') return NextResponse.json({ error: 'csv is required' }, { status: 400 });
  const accountByEmail = (email: string) => [...result.access.radar.store.accounts.values()].find((account) => account.email === email);
  try {
    const source = ['submittable', 'google-forms', 'airtable', 'generic'].includes(body.source) ? body.source : 'generic';
    const plan = planSubmissionImport(body.csv, result.access.workspace, id, accountByEmail, source);
    if (plan.invalidRows > 0) return NextResponse.json({ error: 'Fix invalid rows before committing', plan }, { status: 422 });
    const imported = commitSubmissionImport(plan, result.access.workspace, id, accountByEmail);
    await persistOrganizationMutation(result.access, { action: 'submission.import', targetType: 'organization', targetId: id, detail: { created: imported.created.length, skipped: imported.skipped } });
    return NextResponse.json(imported, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to import submissions' }, { status: 400 }); }
}
