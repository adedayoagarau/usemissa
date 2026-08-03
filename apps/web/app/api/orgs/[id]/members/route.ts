import { NextResponse } from 'next/server';
import { organizationMemberMutationSchema } from '@missa/contracts';
import { AuthError } from '@missa/radar-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

/** Story 7.2's AC needs "at least one other org member" to assign as a
 * reviewer -- radar-engine has membershipsFor(accountId) but no reverse
 * membersOf(organizationId), so this reads RadarStore.memberships directly. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const engine = result.access.radar;
  const members = engine.store.memberships
    .filter((m) => m.organizationId === id)
    .map((m) => ({
      accountId: m.accountId,
      email: engine.store.accounts.get(m.accountId)?.email ?? m.accountId,
      role: m.role,
    }));

  return NextResponse.json(members);
}

/**
 * Minimal member-invite endpoint -- not one of the 37 planned MVP stories,
 * added because Story 7.2's AC explicitly needs "at least one other org
 * member" to assign as a reviewer, and there was no way to grant membership
 * to a second account at all. Takes an email (must already have a Missa
 * account) and a role, grants membership via radar-engine's existing
 * grantOrgMembership -- doesn't invent new auth/invite logic, just exposes
 * what the engine already supports.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = organizationMemberMutationSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: 'A valid email and organization role are required' }, { status: 400 });
  }

  const engine = result.access.radar;
  const account = [...engine.store.accounts.values()].find((candidate) => candidate.email === body.data.email);
  if (!account) return NextResponse.json({ error: 'No account with that email' }, { status: 404 });

  const existing = engine.store.memberships.find(
    (membership) => membership.accountId === account.id && membership.organizationId === id,
  );
  const adminCount = engine.store.memberships.filter(
    (membership) => membership.organizationId === id && membership.role === 'admin',
  ).length;
  if (existing?.role === 'admin' && body.data.role === 'member' && adminCount === 1) {
    return NextResponse.json({ error: 'An organization must keep at least one admin' }, { status: 409 });
  }

  let membership;
  try {
    membership = engine.grantOrgMembership(account.id, id, body.data.role);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
  await persistOrganizationMutation(
    result.access,
    {
      action: 'membership.upsert',
      targetType: 'account',
      targetId: account.id,
      detail: { organizationId: id, role: body.data.role },
    },
    { workspace: false },
  );
  return NextResponse.json(membership, { status: 201 });
}
