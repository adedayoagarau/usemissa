import { NextResponse } from 'next/server';
import type { ProfileMaterialKind, ProfileMaterialStatus, ProfileMaterialVisibility } from '@missa/radar-engine';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const kinds = new Set<ProfileMaterialKind>(['bio', 'statement', 'cv', 'work', 'link', 'saved-answer']);
const statuses = new Set<ProfileMaterialStatus>(['draft', 'ready', 'needs-review', 'archived']);
const visibilities = new Set<ProfileMaterialVisibility>(['private', 'submission-only', 'public']);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const engine = await getEngine();
  return NextResponse.json(engine.getProfile(id).materials);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const kind = body.kind as ProfileMaterialKind;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!kinds.has(kind) || !title) return NextResponse.json({ error: 'kind and title are required' }, { status: 400 });
  const status = statuses.has(body.status as ProfileMaterialStatus) ? body.status as ProfileMaterialStatus : 'draft';
  const visibility = visibilities.has(body.visibility as ProfileMaterialVisibility) ? body.visibility as ProfileMaterialVisibility : 'private';
  const engine = await getEngine();
  const material = engine.addProfileMaterial(id, {
    kind,
    title,
    description: typeof body.description === 'string' ? body.description.trim() : undefined,
    content: typeof body.content === 'string' ? body.content : undefined,
    url: typeof body.url === 'string' ? body.url.trim() : undefined,
    status,
    visibility,
  });
  await persistRadar();
  return NextResponse.json(material, { status: 201 });
}
