import { NextResponse } from 'next/server';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const statuses = new Set(['draft', 'ready', 'needs-review', 'archived']);
const visibilities = new Set(['private', 'submission-only', 'public']);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; materialId: string }> }) {
  const { id, materialId } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const allowed = ['title', 'description', 'content', 'url', 'status', 'visibility'];
  const patch = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
  if (patch.title !== undefined && (typeof patch.title !== 'string' || !patch.title.trim())) return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 });
  if (patch.status !== undefined && !statuses.has(String(patch.status))) return NextResponse.json({ error: 'invalid material status' }, { status: 400 });
  if (patch.visibility !== undefined && !visibilities.has(String(patch.visibility))) return NextResponse.json({ error: 'invalid material visibility' }, { status: 400 });
  const engine = await getEngine();
  try {
    const material = engine.updateProfileMaterial(id, materialId, patch);
    await persistRadar();
    return NextResponse.json(material);
  } catch { return NextResponse.json({ error: 'Unknown profile material' }, { status: 404 }); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; materialId: string }> }) {
  const { id, materialId } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const engine = await getEngine();
  try {
    engine.removeProfileMaterial(id, materialId);
    await persistRadar();
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Unknown profile material' }, { status: 404 }); }
}
