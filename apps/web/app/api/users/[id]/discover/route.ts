import { NextResponse } from 'next/server';
import { requireSelf } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { opportunityView } from '@/lib/opportunityView';
import { getCreatorAccountRepository } from '@/lib/creatorRepositories';
import { getOpportunityRepository } from '@/lib/opportunityRepository';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (getCreatorAccountRepository()) {
    const page = await getOpportunityRepository().browse({
      sort: 'soonest-deadline', limit: 200, openNow: true, types: [],
      disciplines: [], genres: [], locations: [],
    }, { accountId: auth.session.account.id });
    return NextResponse.json(page.items);
  }

  const engine = await getEngine();
  const nowIso = new Date().toISOString().slice(0, 10);
  const list = [...engine.store.opportunities.values()]
    .filter((o) => !o.duplicateOfId && !['archived', 'closed', 'duplicate'].includes(o.status))
    .filter((o) => !o.fields.deadline?.date || o.fields.deadline.date >= nowIso)
    .map((o) => opportunityView(engine, o, id))
    .sort((x, y) => (x.deadline ?? '9999').localeCompare(y.deadline ?? '9999'));

  return NextResponse.json(list);
}
