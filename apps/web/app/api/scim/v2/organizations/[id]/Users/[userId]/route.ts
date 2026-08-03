import { NextResponse } from 'next/server';
import { getEngine, persistRadar } from '@/lib/engine';
import { scimAuthorized, scimResource, scimRole } from '@/lib/scim';

function unauthorized() { return NextResponse.json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '401', detail: 'Invalid SCIM credentials' }, { status: 401 }); }

export async function GET(request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  if (!scimAuthorized(request, id)) return unauthorized();
  const resource = scimResource(await getEngine(), id, userId);
  return resource ? NextResponse.json(resource) : NextResponse.json({ detail: 'User not found' }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  if (!scimAuthorized(request, id)) return unauthorized();
  const engine = await getEngine();
  const account = engine.store.accounts.get(userId);
  const membership = engine.store.memberships.find((candidate) => candidate.organizationId === id && candidate.accountId === userId);
  if (!account || !membership) return NextResponse.json({ detail: 'User not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const operations = Array.isArray(body.Operations) ? body.Operations : [];
  const activeOperation = operations.find((operation: { path?: string }) => operation.path?.toLowerCase() === 'active');
  const roleOperation = operations.find((operation: { path?: string }) => operation.path?.toLowerCase() === 'role');
  const activeValue = typeof body.active === 'boolean' ? body.active : activeOperation ? Boolean(activeOperation.value) : undefined;
  const roleValue = body.roles?.[0]?.value ?? roleOperation?.value;
  if (activeValue === false) {
    const elevated = membership.role === 'admin' || membership.role === 'owner';
    const elevatedCount = engine.store.memberships.filter((candidate) => candidate.organizationId === id && (candidate.role === 'admin' || candidate.role === 'owner')).length;
    if (elevated && elevatedCount <= 1) return NextResponse.json({ detail: 'An organization must keep at least one admin or owner' }, { status: 409 });
    engine.revokeOrgMembership(userId, id);
    account.active = false;
  } else if (activeValue === true) {
    account.active = true;
  }
  if (roleValue !== undefined) membership.role = scimRole(roleValue);
  await persistRadar();
  return NextResponse.json(scimResource(engine, id, userId));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  if (!scimAuthorized(request, id)) return unauthorized();
  const engine = await getEngine();
  const membership = engine.store.memberships.find((candidate) => candidate.organizationId === id && candidate.accountId === userId);
  if (!membership) return NextResponse.json({ detail: 'User not found' }, { status: 404 });
  if ((membership.role === 'admin' || membership.role === 'owner') && engine.store.memberships.filter((candidate) => candidate.organizationId === id && (candidate.role === 'admin' || candidate.role === 'owner')).length <= 1) return NextResponse.json({ detail: 'An organization must keep at least one admin or owner' }, { status: 409 });
  engine.revokeOrgMembership(userId, id);
  const account = engine.store.accounts.get(userId); if (account) account.active = false;
  await persistRadar();
  return new NextResponse(null, { status: 204 });
}
