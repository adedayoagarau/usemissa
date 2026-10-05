import { NextResponse } from 'next/server';
import { organizationRoleSchema } from '@missa/contracts';
import { AuthError } from '@missa/radar-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { membershipChangeVerdict } from '@/lib/organizationPeople';

type Params = { id: string; accountId: string };

export async function PATCH(request: Request, { params }: { params: Promise<Params> }) {
  const { id, accountId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = organizationRoleSchema.safeParse((await request.json().catch(() => ({})))?.role);
  if (!body.success) return NextResponse.json({ error: 'A valid organization role is required' }, { status: 400 });
  const organizationMemberships = result.access.radar.store.memberships.filter((candidate) => candidate.organizationId === id);
  const membership = organizationMemberships.find((candidate) => candidate.accountId === accountId);
  if (!membership) return NextResponse.json({ error: 'Organization membership not found' }, { status: 404 });
  const verdict = membershipChangeVerdict({
    actorRole: result.access.membership.role,
    currentRole: membership.role,
    nextRole: body.data,
    organizationRoles: organizationMemberships.map((candidate) => candidate.role),
  });
  if (!verdict.ok) return NextResponse.json({ error: verdict.error }, { status: verdict.status });
  membership.role = body.data;
  await persistOrganizationMutation(result.access, {
    action: 'membership.role_changed', targetType: 'account', targetId: accountId,
    detail: { organizationId: id, role: body.data },
  }, { workspace: false });
  return NextResponse.json(membership);
}

export async function DELETE(request: Request, { params }: { params: Promise<Params> }) {
  const { id, accountId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const organizationMemberships = result.access.radar.store.memberships.filter((candidate) => candidate.organizationId === id);
  const membership = organizationMemberships.find((candidate) => candidate.accountId === accountId);
  if (!membership) return NextResponse.json({ error: 'Organization membership not found' }, { status: 404 });
  const verdict = membershipChangeVerdict({
    actorRole: result.access.membership.role,
    currentRole: membership.role,
    nextRole: undefined,
    organizationRoles: organizationMemberships.map((candidate) => candidate.role),
  });
  if (!verdict.ok) return NextResponse.json({ error: verdict.error }, { status: verdict.status });
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
