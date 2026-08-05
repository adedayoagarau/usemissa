import { NextResponse } from 'next/server';
import {
  PLATFORM_AGENT_CONTROL_ACTIONS,
  requestPlatformAgentControl,
  type PlatformAgentControlAction,
  type PlatformAgentTargetType,
} from '@missa/radar-adapters';
import { getPlatformAdminAgentControls } from '@/lib/platformAdminFoundations';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';

const headers = { 'cache-control': 'private, no-store' };
const TARGET_TYPES = new Set<PlatformAgentTargetType>(['agent-run', 'handoff', 'review-job', 'enrichment-job']);

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;
  return NextResponse.json(await getPlatformAdminAgentControls(), { headers });
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'A durable agent control queue is required.' }, { status: 503, headers });
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim();
  if (!idempotencyKey) return NextResponse.json({ error: 'Idempotency-Key is required.' }, { status: 400, headers });
  const body = await request.json().catch(() => ({}));
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid agent control request.' }, { status: 400, headers });
  const value = body as Record<string, unknown>;
  const targetType = typeof value.targetType === 'string' && TARGET_TYPES.has(value.targetType as PlatformAgentTargetType) ? value.targetType as PlatformAgentTargetType : undefined;
  const targetId = typeof value.targetId === 'string' ? value.targetId.trim() : '';
  const action = typeof value.action === 'string' && PLATFORM_AGENT_CONTROL_ACTIONS.includes(value.action as PlatformAgentControlAction) ? value.action as PlatformAgentControlAction : undefined;
  const reason = typeof value.reason === 'string' ? value.reason.trim() : undefined;
  if (!targetType || !targetId || !action) return NextResponse.json({ error: 'targetType, targetId, and a supported action are required.' }, { status: 400, headers });
  try {
    const result = await requestPlatformAgentControl({ connectionString: process.env.DATABASE_URL, actorAccountId: auth.session.account.id, targetType, targetId, action, reason, idempotencyKey });
    return NextResponse.json(result, { headers, status: result.idempotent ? 200 : 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent control unavailable';
    const status = message === 'Invalid idempotency key' || message === 'Unsupported agent control action' || message === 'Invalid agent target id' ? 400 : message === 'Agent target not found' ? 404 : 503;
    return NextResponse.json({ error: status === 503 ? 'Agent control unavailable.' : message }, { status, headers });
  }
}
