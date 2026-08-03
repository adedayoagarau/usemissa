import { NextResponse } from 'next/server';
import { importGuidelines } from '@missa/workspace-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const openCall = result.access.scope.openCall(openCallId);
  if (!openCall) return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.url !== 'string' || !body.url.trim()) return NextResponse.json({ error: 'A guideline URL is required' }, { status: 400 });
  try {
    const imported = await importGuidelines(body.url.trim());
    openCall.guidelineUrl = imported.report.sourceUrl;
    openCall.guidelineText = imported.text;
    openCall.guidelineSourceType = imported.report.sourceType;
    openCall.guidelineImportedAt = new Date().toISOString();
    openCall.guidelineImportReport = imported.report;
    await persistOrganizationMutation(result.access, { action: 'guidelines.imported', targetType: 'open-call', targetId: openCallId, detail: { ...imported.report } });
    return NextResponse.json({ openCall, report: imported.report });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to import guidelines' }, { status: 422 });
  }
}
