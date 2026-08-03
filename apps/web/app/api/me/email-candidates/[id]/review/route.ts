import { NextResponse } from 'next/server';
import { EmailForwardingError, type EmailReviewDecision, type RadarStore } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } }); }
function restoreStore(target: RadarStore, snapshot: RadarStore) {
  for (const key of ['sources', 'snapshots', 'opportunities', 'versions', 'changes', 'organizations', 'claims', 'verificationTasks', 'radarProfiles', 'users', 'alerts', 'accounts'] as const) {
    const targetMap = target[key] as Map<string, unknown>;
    const snapshotMap = snapshot[key] as Map<string, unknown>;
    targetMap.clear();
    for (const [id, value] of snapshotMap) targetMap.set(id, value);
  }
  target.follows = snapshot.follows;
  target.tracked = snapshot.tracked;
  target.manualTrackerEntries = snapshot.manualTrackerEntries;
  target.forwardingAddresses = snapshot.forwardingAddresses;
  target.emailCandidates = snapshot.emailCandidates;
  target.emittedAlertKeys = snapshot.emittedAlertKeys;
  target.memberships = snapshot.memberships;
  target.auditLog = snapshot.auditLog;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { const session = await getSessionAccount(request.headers.get('cookie')); if (!session) return json({ error: 'Not authenticated' }, 401); if (!session.account.userId) return json({ error: 'Profile not found' }, 404); const { id } = await params; const decision = await request.json().catch(() => undefined) as EmailReviewDecision | undefined; if (!decision || typeof decision.idempotencyKey !== 'string' || !decision.kind) return json({ error: 'A review decision and idempotency key are required.' }, 400); const engine = await getEngine(); const before = structuredClone(engine.store); try { const existing = engine.store.emailCandidates.find((candidate) => candidate.id === id && candidate.userId === session.account.userId); const replay = existing?.reviewIdempotencyKey === decision.idempotencyKey && Boolean(existing.reviewResult); const result = engine.reviewEmailCandidate(session.account.userId, id, decision); if (!replay) { const auditAction = decision.kind === 'confirm' || decision.kind === 'create-manual' ? 'tracker.email_update_confirmed' : decision.kind === 'ignore' ? 'email.candidate_ignored' : 'email.candidate_deleted'; engine.recordAudit(session.account.id, auditAction, 'email_candidate', id, JSON.stringify({ userId: session.account.userId, candidateId: id, sourceMode: 'forwarding-address', ...(decision.kind === 'confirm' && result.candidate.proposedStatus ? { statusTransition: decision.status ?? result.candidate.proposedStatus } : {}), confidence: result.candidate.confidence })); await persistRadar(); } return json(result); } catch (error) { restoreStore(engine.store, before); if (error instanceof EmailForwardingError) return json({ error: error.message }, error.code === 'not-found' ? 404 : error.code === 'forbidden' ? 403 : error.code === 'expired' ? 409 : 400); return json({ error: 'We could not apply that review decision.' }, 500); } }
