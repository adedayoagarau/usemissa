import { NextResponse } from 'next/server';
import { commitOpenCallImport, planOpenCallImport } from '@missa/workspace-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const body = await request.json().catch(() => ({}));
  if (typeof body.csv !== 'string') return NextResponse.json({ error: 'csv is required' }, { status: 400 });
  try {
    const source = ['submittable', 'google-forms', 'airtable', 'generic'].includes(body.source) ? body.source : 'generic';
    const plan = planOpenCallImport(body.csv, result.access.workspace, id, source);
    if (plan.invalidRows > 0) return NextResponse.json({ error: 'Fix invalid rows before committing', plan }, { status: 422 });
    const imported = commitOpenCallImport(plan, result.access.workspace, id);
    for (const openCall of imported.created) {
      result.access.radar.recordAudit(result.access.session.account.id, 'open_call.imported', 'open_call', openCall.id, JSON.stringify({ organizationId: id }));
    }
    await persistOrganizationMutation(result.access, {
      action: 'open_call.import', targetType: 'organization', targetId: id,
      detail: { created: imported.created.length, skipped: imported.skipped },
    });
    return NextResponse.json(imported, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to import open calls' }, { status: 400 });
  }
}
