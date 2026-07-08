import { NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

/** Story 7.1: admin inbox -- every Submission this org has ever received,
 * across all Open Calls (draft and published). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireOrgMember(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = await getWorkspaceEngine();
  return NextResponse.json(engine.submissionsForOrganization(id));
}
