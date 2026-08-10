import { NextResponse } from 'next/server';

import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

type ReadRequest = { all?: boolean; ids?: string[] };

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return json({ error: 'Not authenticated' }, 401);
  if (!session.account.userId) return json({ error: 'Profile not found' }, 404);

  const body = await request.json().catch(() => undefined) as ReadRequest | undefined;
  const input: ReadRequest = body ?? {};
  const ids = Array.isArray(input.ids) ? input.ids.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(0, 100) : [];
  if (!input.all && !ids.length) return json({ error: 'Choose one or more Inbox updates.' }, 400);

  const engine = await getEngine();
  const requested = new Set(ids);
  const mine = [...engine.store.alerts.values()].filter((alert) =>
    alert.audience === 'user'
    && alert.userId === session.account.userId
    && (input.all || requested.has(alert.id)),
  );
  if (!input.all && mine.length !== requested.size) return json({ error: 'One or more Inbox updates were not found.' }, 404);

  const previous = mine.map((alert) => ({ alert, read: alert.read }));
  const auditLength = engine.store.auditLog.length;
  for (const alert of mine) alert.read = true;
  try {
    engine.recordAudit(session.account.id, input.all ? 'inbox.all_read' : 'inbox.items_read', 'inbox', session.account.userId, JSON.stringify({ count: mine.length }));
    await persistRadar();
    return json({ updated: mine.length, unread: [...engine.store.alerts.values()].filter((alert) => alert.audience === 'user' && alert.userId === session.account.userId && !alert.read).length });
  } catch {
    for (const entry of previous) entry.alert.read = entry.read;
    engine.store.auditLog.splice(auditLength);
    return json({ error: 'We could not update the Inbox read state.' }, 500);
  }
}
