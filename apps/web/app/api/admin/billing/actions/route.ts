import { NextResponse } from 'next/server';
import { requestPlatformBillingAction, type BillingActionKind } from '@missa/radar-adapters';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';

const headers = { 'cache-control': 'private, no-store' };
const actions = new Set<BillingActionKind>(['refund', 'correction', 'grant-entitlement', 'revoke-entitlement', 'reconcile']);

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'Governed billing actions are unavailable.' }, { status: 503, headers });
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim();
  if (!idempotencyKey) return NextResponse.json({ error: 'Idempotency-Key is required.' }, { status: 400, headers });
  const value = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = typeof value?.action === 'string' && actions.has(value.action as BillingActionKind) ? value.action as BillingActionKind : undefined;
  if (!action || typeof value?.organizationId !== 'string' || typeof value.reasonCode !== 'string' || typeof value.confirmation !== 'string') return NextResponse.json({ error: 'A supported action, organizationId, reasonCode, and exact confirmation are required.' }, { status: 400, headers });
  try {
    // No bounded Stripe execution/reconciliation worker is registered in this release.
    // Refund requests must therefore fail closed instead of becoming stranded 202s.
    const result = await requestPlatformBillingAction({ connectionString: process.env.DATABASE_URL, actorAccountId: auth.session.account.id, organizationId: value.organizationId, action, reasonCode: value.reasonCode, confirmation: value.confirmation, idempotencyKey, executionAndReconciliationReady: false, ...(typeof value.providerObjectId === 'string' ? { providerObjectId: value.providerObjectId } : {}), ...(typeof value.amountCents === 'number' ? { amountCents: value.amountCents } : {}), ...(typeof value.currency === 'string' ? { currency: value.currency } : {}), ...(typeof value.entitlementKey === 'string' ? { entitlementKey: value.entitlementKey } : {}), ...(typeof value.expectedState === 'string' ? { expectedState: value.expectedState } : {}), ...(typeof value.expectedVersion === 'number' ? { expectedVersion: value.expectedVersion } : {}), ...(typeof value.recoveryOfActionId === 'string' ? { recoveryOfActionId: value.recoveryOfActionId } : {}) });
    const code = result.status === 'requested' ? 202 : result.status === 'replayed' ? 200 : result.status === 'conflict' ? 409 : 503;
    return NextResponse.json(result.status === 'conflict' ? { error: 'Idempotency key conflicts with another billing action.' } : result, { status: code, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Billing action unavailable';
    const clientError = message.startsWith('Invalid') || message.includes('required') || message.includes('entitlement') || message === 'Exact confirmation is required';
    const code = message === 'Organization not found' ? 404 : error instanceof Error && error.name === 'ConflictError' ? 409 : clientError ? 400 : 503;
    return NextResponse.json({ error: code === 409 ? 'Billing action conflicts with authoritative billing state.' : code === 503 ? 'Governed billing actions are unavailable.' : message }, { status: code, headers });
  }
}
