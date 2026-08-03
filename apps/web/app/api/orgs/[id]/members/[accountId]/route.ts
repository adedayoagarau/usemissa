import { NextResponse } from 'next/server';
import { organizationRoleSchema } from '@missa/contracts';
import { AuthError } from '@missa/radar-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

type Params = { id: string; accountId: string };

function elevated(role: string): boolean {
  return role === 'admin' || role === 'owner';
}

function wouldRemoveLastAdmin(memberships: Array<{ accountId: string; organizationId: string; role: string }>, organizationId: string, accountId: string, nextRole?: string): boolean {
  const admins = memberships.filter((membership) => membership.organizationId === organizationId && elevated(membership.role));
  if (!admins.some((membership) => membership.accountId === accountId)) return false;
  if (nextRole && elevated(nextRole)) return false;
  return admins.length <= 1;
}

export async function PATCH(request: Request, { params }: { params: Promise<Params> }) {
  const { id, accountId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = organizationRoleSchema.safeParse((await request.json()).role);
  if (!body.success) return NextResponse.json({ error: 'A valid organization role is required' }, { status: 400 });
  const membership = result.access.radar.store.memberships.find((candidate) => candidate.organizationId === id && candidate.accountId === accountId);
  if (!membership) return NextResponse.json({ error: 'Organization membership not found' }, { status: 404 });
  if (wouldRemoveLastAdmin(result.access.radar.store.memberships, id, accountId, body.data)) {
    return NextResponse.json({ error: 'An organization must keep at least one admin or owner' }, { status: 409 });
  }
  membership.role = body.data;
  await persistOrganizationMutation(result.access, {
    action: 'membership.role_changed', targetType: 'account', targetId: accountId,
    detail: { organizationId: id, role: body.data },
  }, { workspace: false });
  return NextResponse.json(membership);
}

export async function DELETE(request: Request, { params }: { params: Promise<Params> }) {
  const { id, accountId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const membership = result.access.radar.store.memberships.find((candidate) => candidate.organizationId === id && candidate.accountId === accountId);
  if (!membership) return NextResponse.json({ error: 'Organization membership not found' }, { status: 404 });
  if (wouldRemoveLastAdmin(result.access.radar.store.memberships, id, accountId)) {
    return NextResponse.json({ error: 'An organization must keep at least one admin or owner' }, { status: 409 });
  }
  try {
    result.access.radar.revokeOrgMembership(accountId, id);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: 404 });
    throw error;
  }
  await persistOrganizationMutation(result.access, {
    action: 'membership.revoked', targetType: 'account', targetId: accountId,
    detail: { organizationId: id },
  }, { workspace: false });
  return new NextResponse(null, { status: 204 });
}
