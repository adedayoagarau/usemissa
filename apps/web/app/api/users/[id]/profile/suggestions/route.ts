import { NextResponse } from 'next/server';
import { profileSuggestions } from '@missa/radar-engine';
import { requireSelf } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const engine = await getEngine();
  const user = engine.store.users.get(id);
  if (!user) return NextResponse.json({ error: 'Unknown user' }, { status: 404 });
  return NextResponse.json({ provider: 'deterministic', suggestions: profileSuggestions(user) });
}
