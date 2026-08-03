import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } }); }

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return json({ error: 'Not authenticated' }, 401);
  if (!session.account.userId) return json({ error: 'Profile not found' }, 404);
  const url = new URL(request.url);
  const state = url.searchParams.get('state') === 'all' ? 'all' : 'pending';
  const classification = url.searchParams.get('classification') || undefined;
  const source = url.searchParams.get('source');
  const engine = await getEngine();
  const candidates = engine.emailCandidates(session.account.userId, state, classification).filter((candidate) => !source || (source === 'gmail' ? candidate.sourceMode === 'gmail-sync' || candidate.sourceMode === 'autopilot' : candidate.sourceMode !== 'gmail-sync' && candidate.sourceMode !== 'autopilot'));
  return json({ candidates, pendingCount: engine.emailCandidates(session.account.userId, 'pending').length });
}
