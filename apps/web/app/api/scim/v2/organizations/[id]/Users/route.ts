import { NextResponse } from 'next/server';
import { getEngine, persistRadar } from '@/lib/engine';
import { scimAuthorized, SCIM_SCHEMA, scimResource, scimRole } from '@/lib/scim';

function unauthorized() { return NextResponse.json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '401', detail: 'Invalid SCIM credentials' }, { status: 401 }); }

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!scimAuthorized(request, id)) return unauthorized();
  const engine = await getEngine();
  const resources = engine.store.memberships.filter((membership) => membership.organizationId === id).map((membership) => scimResource(engine, id, membership.accountId)).filter(Boolean);
  return NextResponse.json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], totalResults: resources.length, Resources: resources });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!scimAuthorized(request, id)) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const email = typeof body.userName === 'string' ? body.userName : '';
  const displayName = typeof body.name?.formatted === 'string' ? body.name.formatted : [body.name?.givenName, body.name?.familyName].filter(Boolean).join(' ');
  if (!email) return NextResponse.json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '400', detail: 'userName is required' }, { status: 400 });
  const engine = await getEngine();
  try {
    const provisioned = engine.provisionOrgAccount(id, { email, externalId: typeof body.externalId === 'string' ? body.externalId : undefined, displayName, active: body.active !== false, role: scimRole(body.roles?.[0]?.value) });
    await persistRadar();
    const resource = scimResource(engine, id, provisioned.account.id);
    engine.recordAudit(undefined, 'scim.user.provisioned', 'account', provisioned.account.id, JSON.stringify({ organizationId: id }));
    await persistRadar();
    return NextResponse.json(resource, { status: 201, headers: { location: `/api/scim/v2/organizations/${id}/Users/${provisioned.account.id}` } });
  } catch (error) { return NextResponse.json({ schemas: [SCIM_SCHEMA], status: '409', detail: error instanceof Error ? error.message : 'Unable to provision user' }, { status: 409 }); }
}
