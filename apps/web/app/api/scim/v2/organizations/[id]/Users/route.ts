import { NextResponse } from 'next/server';
import { getEngine, persistRadar } from '@/lib/engine';
import { assertScimMembershipChange, scimActive, scimAuthorized, ScimError, scimErrorResponse, scimListResponse, scimMember, scimRefusal, scimResource, scimRole, scimUnauthorized, scimUserFilter } from '@/lib/scim';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!scimAuthorized(request, id)) return scimUnauthorized();
  const engine = await getEngine();
  try {
    const { searchParams } = new URL(request.url);
    const matches = scimUserFilter(searchParams.get('filter'));
    const users = engine.store.memberships
      .filter((membership) => membership.organizationId === id)
      .flatMap((membership) => {
        const account = engine.store.accounts.get(membership.accountId);
        return account ? [scimResource(id, account, membership)] : [];
      })
      .filter(matches);
    return NextResponse.json(scimListResponse(users, searchParams));
  } catch (error) { return scimRefusal(error); }
}

/**
 * Creates a user, or adds an existing Missa account to this Organization.
 * Account-wide state (sign-in, externalId, display name) changes only for
 * accounts this Organization's provisioning created and manages; for any
 * other account only this Organization's membership changes.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!scimAuthorized(request, id)) return scimUnauthorized();
  const body = (await request.json().catch(() => null)) ?? {};
  const email = typeof body.userName === 'string' ? body.userName.trim().toLowerCase() : '';
  const displayName = typeof body.name?.formatted === 'string' ? body.name.formatted : [body.name?.givenName, body.name?.familyName].filter(Boolean).join(' ');
  if (!email.includes('@')) return scimErrorResponse(400, 'userName must be an email address', 'invalidValue');
  const engine = await getEngine();
  if (!engine.store.organizations.has(id)) return scimErrorResponse(404, 'Organization not found');
  try {
    const role = scimRole(body.roles) ?? 'member';
    const active = scimActive(body.active) ?? true;
    const existing = [...engine.store.accounts.values()].find((account) => account.email === email);
    if (existing && scimMember(engine, id, existing.id)) throw new ScimError(409, 'A user with this userName already exists in this organization', 'uniqueness');
    if (active) {
      assertScimMembershipChange(engine, id, { nextRole: role });
      const seats = engine.organizationSeatUsage(id);
      if (seats.used >= seats.limit) throw new ScimError(409, `This organization has reached its ${seats.limit}-seat limit`);
    } else if (existing && !engine.organizationManagesAccount(id, existing.id)) {
      throw new ScimError(409, 'An existing Missa account uses this userName. SCIM can add it to this organization as an active user, but cannot deactivate an account this organization does not manage');
    }
    const provisioned = engine.provisionOrgAccount(id, { email, externalId: typeof body.externalId === 'string' ? body.externalId : undefined, displayName, active, role });
    engine.recordAudit(undefined, 'scim.user.provisioned', 'account', provisioned.account.id, JSON.stringify({ organizationId: id, role: provisioned.membership?.role, active, accountCreated: provisioned.created }));
    await persistRadar();
    return NextResponse.json(scimResource(id, provisioned.account, provisioned.membership), { status: 201, headers: { location: `/api/scim/v2/organizations/${id}/Users/${provisioned.account.id}` } });
  } catch (error) { return scimRefusal(error); }
}
