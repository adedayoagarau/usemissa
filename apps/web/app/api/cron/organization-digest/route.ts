import { NextResponse } from 'next/server';
import { cronAuthorization } from '@/lib/cron-auth';
import { getEngine } from '@/lib/engine';
import { deliverOrganizationDigest } from '@/emails/organization-digest';
import { digestHasNews, organizationDigestFacts } from '@/lib/organizationDigest';
import { resolveOrganizationCustomization } from '@/lib/organizationCustomization';
import { getWorkspaceEngine, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Morning summary to each owner and admin of organizations that had activity
 * or have work waiting. Quiet organizations, and those that turned the
 * summary off, get nothing. One email per admin per organization per day.
 */
export async function GET(request: Request) {
  const auth = cronAuthorization(request);
  if (auth === 'unconfigured') return NextResponse.json({ error: 'The organization digest is not configured.' }, { status: 503 });
  if (auth === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ skipped: 'relational-authority' }, { headers: { 'Cache-Control': 'no-store' } });
  const [radar, workspace] = await Promise.all([getEngine(), getWorkspaceEngine()]);
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const organizationIds = [...new Set([...workspace.store.entities.values()].map((entity) => entity.organizationId))];
  let sent = 0;
  let quiet = 0;
  let optedOut = 0;
  for (const organizationId of organizationIds) {
    const organization = radar.store.organizations.get(organizationId);
    if (!organization) continue;
    const customization = resolveOrganizationCustomization(organization);
    if (!customization.communications.adminDigest) { optedOut += 1; continue; }
    const facts = organizationDigestFacts({ radar, workspace, organizationId, now });
    if (!digestHasNews(facts)) { quiet += 1; continue; }
    const admins = radar.store.memberships.filter((membership) => membership.organizationId === organizationId && (membership.role === 'owner' || membership.role === 'admin'));
    for (const membership of admins) {
      const account = radar.store.accounts.get(membership.accountId);
      if (!account?.email || account.active === false) continue;
      const report = await deliverOrganizationDigest({ organizationName: customization.displayName, recipientName: account.givenName || account.displayName, recipientEmail: account.email, recipientAccountId: account.id, facts, day }, process.env.DATABASE_URL);
      if (report.status === 'sent') sent += 1;
    }
  }
  return NextResponse.json({ organizations: organizationIds.length, sent, quiet, optedOut }, { headers: { 'Cache-Control': 'no-store' } });
}
