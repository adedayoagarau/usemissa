import { NextResponse } from 'next/server';
import { getEngine, persistRadar } from '@/lib/engine';
import { assertScimMembershipChange, removeScimMember, scimAuthorized, ScimError, scimMember, scimNotFound, scimPatchChanges, scimRefusal, scimResource, scimUnauthorized } from '@/lib/scim';

type Params = { id: string; userId: string };

export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const { id, userId } = await params;
  if (!scimAuthorized(request, id)) return scimUnauthorized();
  const member = scimMember(await getEngine(), id, userId);
  return member ? NextResponse.json(scimResource(id, member.account, member.membership)) : scimNotFound();
}

/** Deactivation removes the user from this Organization (see removeScimMember).
 * Role changes follow the same owner and last-administrator safeguards as the
 * in-product People controls. Every applied change is audited. */
export async function PATCH(request: Request, { params }: { params: Promise<Params> }) {
  const { id, userId } = await params;
  if (!scimAuthorized(request, id)) return scimUnauthorized();
  const engine = await getEngine();
  const member = scimMember(engine, id, userId);
  if (!member) return scimNotFound();
  const { account, membership } = member;
  try {
    const changes = scimPatchChanges(await request.json().catch(() => null));
    if (changes.active === false) {
      removeScimMember(engine, id, member, 'scim.user.deactivated');
      await persistRadar();
      return NextResponse.json(scimResource(id, account));
    }
    const nextRole = changes.role !== undefined && changes.role !== membership.role ? changes.role : undefined;
    if (nextRole) assertScimMembershipChange(engine, id, { currentRole: membership.role, nextRole });
    const reactivate = changes.active === true && account.active === false;
    if (reactivate && !engine.organizationManagesAccount(id, userId)) {
      throw new ScimError(403, 'SCIM can reactivate only accounts this organization provisioned and manages');
    }
    if (nextRole) {
      engine.recordAudit(undefined, 'scim.user.role_changed', 'account', userId, JSON.stringify({ organizationId: id, from: membership.role, to: nextRole }));
      membership.role = nextRole;
    }
    if (reactivate) {
      account.active = true;
      engine.recordAudit(undefined, 'scim.user.reactivated', 'account', userId, JSON.stringify({ organizationId: id }));
    }
    if (nextRole || reactivate) await persistRadar();
    return NextResponse.json(scimResource(id, account, membership));
  } catch (error) { return scimRefusal(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<Params> }) {
  const { id, userId } = await params;
  if (!scimAuthorized(request, id)) return scimUnauthorized();
  const engine = await getEngine();
  const member = scimMember(engine, id, userId);
  if (!member) return scimNotFound();
  try {
    removeScimMember(engine, id, member, 'scim.user.removed');
    await persistRadar();
    return new NextResponse(null, { status: 204 });
  } catch (error) { return scimRefusal(error); }
}
