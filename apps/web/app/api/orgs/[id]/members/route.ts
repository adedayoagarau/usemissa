import { NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

/** Story 7.2's AC needs "at least one other org member" to assign as a
 * reviewer -- radar-engine has membershipsFor(accountId) but no reverse
 * membersOf(organizationId), so this reads RadarStore.memberships directly. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireOrgMember(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = await getEngine();
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
  const auth = await requireOrgMember(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (typeof body.email !== 'string') return NextResponse.json({ error: 'email is required' }, { status: 400 });

  const engine = await getEngine();
  const account = [...engine.store.accounts.values()].find((a) => a.email === body.email.trim().toLowerCase());
  if (!account) return NextResponse.json({ error: 'No account with that email' }, { status: 404 });

  const role = body.role === 'admin' ? 'admin' : 'member';
  const membership = engine.grantOrgMembership(account.id, id, role);
  return NextResponse.json(membership, { status: 201 });
}
