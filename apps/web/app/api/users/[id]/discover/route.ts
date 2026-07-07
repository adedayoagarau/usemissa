import { NextResponse } from 'next/server';
import { requireSelf } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { opportunityView } from '@/lib/opportunityView';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = await getEngine();
  const list = [...engine.store.opportunities.values()]
    .filter((o) => !o.duplicateOfId && !['archived', 'closed', 'duplicate'].includes(o.status))
    .map((o) => opportunityView(engine, o, id))
    .sort((x, y) => (x.deadline ?? '9999').localeCompare(y.deadline ?? '9999'));

  return NextResponse.json(list);
}
