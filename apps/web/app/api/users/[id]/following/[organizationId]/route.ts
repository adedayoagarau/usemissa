import { NextResponse } from 'next/server';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

/**
 * Story 3.6: unfollow. @missa/radar-engine has followOrganization() but no
 * unfollow -- follows is a plain array on RadarStore (not keyed by id), so
 * this filters it directly, the same "manipulate the store where the engine
 * has no dedicated method" pattern already used for RadarProfile
 * PATCH/DELETE in Story 3.3.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; organizationId: string }> }) {
  const { id, organizationId } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = await getEngine();
  const before = engine.store.follows.length;
  engine.store.follows = engine.store.follows.filter((f) => !(f.userId === id && f.organizationId === organizationId));
  const removed = before !== engine.store.follows.length;
  if (removed) await persistRadar();

  return NextResponse.json({ ok: true, removed });
}
