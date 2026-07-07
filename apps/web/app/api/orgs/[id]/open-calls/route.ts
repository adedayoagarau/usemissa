import { NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireOrgMember(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = getWorkspaceEngine();
  const programs = engine.entitiesForOrganization(id).flatMap((e) => engine.programsForEntity(e.id));
  const openCalls = programs.flatMap((p) => engine.openCallsForProgram(p.id));
  return NextResponse.json(openCalls);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireOrgMember(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (typeof body.programId !== 'string' || typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: 'programId and title are required' }, { status: 400 });
  }

  const engine = getWorkspaceEngine();
  const ownsProgram = engine.entitiesForOrganization(id).some((e) => engine.programsForEntity(e.id).some((p) => p.id === body.programId));
  if (!ownsProgram) return NextResponse.json({ error: 'Unknown program for this organization' }, { status: 404 });

  const openCall = engine.createOpenCall(body.programId, body.title.trim(), body.radarOpportunityId);
  return NextResponse.json(openCall, { status: 201 });
}
