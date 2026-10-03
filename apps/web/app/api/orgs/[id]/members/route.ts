import { NextResponse } from 'next/server';
import { organizationMemberMutationSchema } from '@missa/contracts';
import { AuthError } from '@missa/radar-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { MEMBER_INVITE_ACCEPTED_MESSAGE, membershipChangeVerdict } from '@/lib/organizationPeople';

/** Story 7.2's AC needs "at least one other org member" to assign as a
 * reviewer -- radar-engine has membershipsFor(accountId) but no reverse
 * membersOf(organizationId), so this reads RadarStore.memberships directly. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'people.read' });
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
 * to a second account at all. Takes an email and a role and grants membership
 * via radar-engine's existing grantOrgMembership when the email belongs to an
 * existing Missa account -- doesn't invent new auth/invite logic. The response
 * is identical (202) whether or not the account exists.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = organizationMemberMutationSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'A valid email and organization role are required' }, { status: 400 });
  }

  const engine = result.access.radar;
  const organizationMemberships = engine.store.memberships.filter((membership) => membership.organizationId === id);
  // Existing members are already visible to managers through GET, so their
  // memberships may shape the response; non-members must not.
  const existing = organizationMemberships.find((membership) => engine.store.accounts.get(membership.accountId)?.email === body.data.email);
  const verdict = membershipChangeVerdict({
    actorRole: result.access.membership.role,
    currentRole: existing?.role,
    nextRole: body.data.role,
    organizationRoles: organizationMemberships.map((membership) => membership.role),
  });
  if (!verdict.ok) return NextResponse.json({ error: verdict.error }, { status: verdict.status });
  if (!existing) {
    const seats = engine.organizationSeatUsage(id);
    if (seats.used >= seats.limit) {
      return NextResponse.json({ error: `This organization has reached its ${seats.limit}-seat limit` }, { status: 409 });
    }
  }

  const accepted = () => NextResponse.json({ email: body.data.email, role: body.data.role, message: MEMBER_INVITE_ACCEPTED_MESSAGE }, { status: 202 });
  const account = existing
    ? engine.store.accounts.get(existing.accountId)
    : [...engine.store.accounts.values()].find((candidate) => candidate.email === body.data.email);
  if (!account) return accepted();

  try {
    engine.grantOrgMembership(account.id, id, body.data.role);
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
  return accepted();
}
