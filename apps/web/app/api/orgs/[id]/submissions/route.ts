import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';

/** Story 7.1: admin inbox -- every Submission this org has ever received,
 * across all Open Calls (draft and published). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const engine = result.access.workspace;
  return NextResponse.json(engine.submissionsForOrganization(id));
}
