import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { mergeCustomization, normalizeCustomizationInput, organizationCustomizationSchema, resolveOrganizationCustomization } from '@/lib/organizationCustomization';

const headers = { 'Cache-Control': 'private, no-store' };

/** The organization's presentation and communication defaults, stored and resolved. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'settings.read' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const organization = result.access.radar.store.organizations.get(id);
  if (!organization) return NextResponse.json({ error: 'Unknown organization' }, { status: 404, headers });
  return NextResponse.json({ stored: organization.customization ?? {}, resolved: resolveOrganizationCustomization(organization) }, { headers });
}

/** Saves a validated patch; sections the patch omits are kept as they were. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const organization = result.access.radar.store.organizations.get(id);
  if (!organization) return NextResponse.json({ error: 'Unknown organization' }, { status: 404, headers });
  const parsed = organizationCustomizationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Check the appearance settings', issues: parsed.error.flatten().fieldErrors }, { status: 400, headers });
  const patch = normalizeCustomizationInput(parsed.data);
  organization.customization = mergeCustomization(organization.customization, patch);
  result.access.radar.store.organizations.set(id, organization);
  await persistOrganizationMutation(result.access, { action: 'organization.customization.updated', targetType: 'organization', targetId: id, detail: { fields: Object.keys(patch) } }, { workspace: false });
  return NextResponse.json({ stored: organization.customization, resolved: resolveOrganizationCustomization(organization) }, { headers });
}
