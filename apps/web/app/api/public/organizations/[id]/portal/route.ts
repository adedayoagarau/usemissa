import { NextResponse } from 'next/server';
import { getRelationalWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Portal projection is unavailable' }, { status: 503 });
  const portal = await (await getRelationalWorkspace()).publishedPortalConfiguration(id);
  if (!portal) return NextResponse.json({ error: 'Published portal not found' }, { status: 404 });
  return NextResponse.json({
    organizationId: id,
    version: portal.version,
    name: portal.configuration.name,
    introduction: portal.configuration.introduction,
    supportEmail: portal.configuration.supportEmail,
    locale: portal.configuration.locale,
    timeZone: portal.configuration.timeZone,
    privacyPolicyUrl: portal.configuration.privacyPolicyUrl,
    termsUrl: portal.configuration.termsUrl,
    accessibilityContactUrl: portal.configuration.accessibilityContactUrl,
    brand: portal.configuration.brand,
  });
}

