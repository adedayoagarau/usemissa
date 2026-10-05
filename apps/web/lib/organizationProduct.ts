import type { OrgRole } from '@missa/radar-engine';

export type OrganizationDestination = 'overview' | 'portal' | 'opportunities' | 'submissions' | 'reviews' | 'decisions' | 'messages' | 'delivery' | 'insights' | 'people' | 'settings';

export interface OrganizationCapabilityProjection {
  role: OrgRole;
  label: string;
  destinations: OrganizationDestination[];
  canSeeAllSubmissions: boolean;
  canSeeAllReviews: boolean;
  canSeeDecisions: boolean;
  canSeeDelivery: boolean;
  canSeeBilling: boolean;
  canCreateOpportunity: boolean;
}

const allDestinations: OrganizationDestination[] = ['overview', 'portal', 'opportunities', 'submissions', 'reviews', 'decisions', 'messages', 'delivery', 'insights', 'people', 'settings'];

const projections: Record<OrgRole, OrganizationCapabilityProjection> = {
  owner: { role: 'owner', label: 'Owner', destinations: allDestinations, canSeeAllSubmissions: true, canSeeAllReviews: true, canSeeDecisions: true, canSeeDelivery: true, canSeeBilling: true, canCreateOpportunity: true },
  admin: { role: 'admin', label: 'Admin', destinations: allDestinations, canSeeAllSubmissions: true, canSeeAllReviews: true, canSeeDecisions: true, canSeeDelivery: true, canSeeBilling: true, canCreateOpportunity: true },
  'team-admin': { role: 'team-admin', label: 'Team admin', destinations: ['overview', 'opportunities', 'submissions', 'reviews', 'decisions', 'messages', 'delivery', 'insights', 'people'], canSeeAllSubmissions: true, canSeeAllReviews: true, canSeeDecisions: true, canSeeDelivery: true, canSeeBilling: false, canCreateOpportunity: true },
  'program-manager': { role: 'program-manager', label: 'Program manager', destinations: ['overview', 'opportunities', 'submissions', 'reviews', 'decisions', 'messages', 'delivery', 'insights'], canSeeAllSubmissions: true, canSeeAllReviews: true, canSeeDecisions: true, canSeeDelivery: true, canSeeBilling: false, canCreateOpportunity: true },
  reviewer: { role: 'reviewer', label: 'Reviewer', destinations: ['overview', 'reviews'], canSeeAllSubmissions: false, canSeeAllReviews: false, canSeeDecisions: false, canSeeDelivery: false, canSeeBilling: false, canCreateOpportunity: false },
  finance: { role: 'finance', label: 'Finance', destinations: ['overview', 'submissions', 'insights', 'settings'], canSeeAllSubmissions: false, canSeeAllReviews: false, canSeeDecisions: false, canSeeDelivery: false, canSeeBilling: true, canCreateOpportunity: false },
  legal: { role: 'legal', label: 'Legal', destinations: ['overview', 'opportunities', 'submissions', 'messages'], canSeeAllSubmissions: false, canSeeAllReviews: false, canSeeDecisions: false, canSeeDelivery: false, canSeeBilling: false, canCreateOpportunity: false },
  viewer: { role: 'viewer', label: 'Viewer', destinations: ['overview', 'opportunities', 'insights'], canSeeAllSubmissions: false, canSeeAllReviews: false, canSeeDecisions: false, canSeeDelivery: false, canSeeBilling: false, canCreateOpportunity: false },
  guest: { role: 'guest', label: 'Guest', destinations: ['overview'], canSeeAllSubmissions: false, canSeeAllReviews: false, canSeeDecisions: false, canSeeDelivery: false, canSeeBilling: false, canCreateOpportunity: false },
  member: { role: 'member', label: 'Member', destinations: ['overview', 'opportunities', 'submissions'], canSeeAllSubmissions: false, canSeeAllReviews: false, canSeeDecisions: false, canSeeDelivery: false, canSeeBilling: false, canCreateOpportunity: false },
};

export function organizationCapabilityProjection(role: OrgRole): OrganizationCapabilityProjection {
  return projections[role];
}

/**
 * Server-enforced Organization capabilities. Every `app/api/orgs/**` handler
 * and every legacy Organization page names exactly the capability it needs, and
 * `requireOrganizationAccess` checks it against this table.
 *
 * The table follows the destination projection above and the product pages'
 * own data boundary: Organization-wide ledgers (Submissions, Reviews,
 * Decisions, Delivery, Messages, People, settings) are only projected in full to
 * owners and admins. Team admins and program managers keep their navigation
 * destinations but receive the "scoped projection unavailable" state until
 * Team and Program scope is enforced by the server, so the API withholds the
 * same ledgers from them. Reviewers never read the Organization ledger; they
 * use their own assignment queue (`/api/reviewer/assignments`) and may open
 * only Submissions and Works assigned to them (see `organizationAccess.ts`).
 */
export type OrganizationCapability =
  | 'organization.read'
  | 'opportunities.read'
  | 'submissions.read'
  | 'reviews.read'
  | 'decisions.read'
  | 'delivery.read'
  | 'messages.read'
  | 'insights.read'
  | 'people.read'
  | 'settings.read'
  | 'billing.read'
  | 'organization.manage'
  | 'organization.own';

const allRoles: readonly OrgRole[] = ['owner', 'admin', 'team-admin', 'program-manager', 'reviewer', 'finance', 'legal', 'viewer', 'guest', 'member'];
const fullLedgerRoles: readonly OrgRole[] = ['owner', 'admin'];

const capabilityRoles: Record<OrganizationCapability, readonly OrgRole[]> = {
  'organization.read': allRoles,
  'opportunities.read': allRoles.filter((role) => projections[role].destinations.includes('opportunities')),
  'submissions.read': fullLedgerRoles,
  'reviews.read': fullLedgerRoles,
  'decisions.read': fullLedgerRoles,
  'delivery.read': fullLedgerRoles,
  'messages.read': fullLedgerRoles,
  // Finance reads a payment-state projection on the Insights page instead of
  // Organization-wide workflow reporting.
  'insights.read': ['owner', 'admin', 'viewer'],
  'people.read': fullLedgerRoles,
  'settings.read': fullLedgerRoles,
  'billing.read': allRoles.filter((role) => projections[role].canSeeBilling),
  'organization.manage': fullLedgerRoles,
  'organization.own': ['owner'],
};

export const ORGANIZATION_CAPABILITIES = Object.keys(capabilityRoles) as OrganizationCapability[];

/** Roles that hold a capability. */
export function organizationCapabilityRoles(capability: OrganizationCapability): readonly OrgRole[] {
  return capabilityRoles[capability];
}

/** True when the role holds the capability, or any of the listed capabilities. */
export function organizationRoleCan(role: OrgRole, required: OrganizationCapability | readonly OrganizationCapability[]): boolean {
  const capabilities: readonly OrganizationCapability[] = typeof required === 'string' ? [required] : required;
  return capabilities.some((capability) => capabilityRoles[capability]?.includes(role) ?? false);
}

/** Every capability a role holds, in table order. */
export function organizationCapabilitiesForRole(role: OrgRole): OrganizationCapability[] {
  return ORGANIZATION_CAPABILITIES.filter((capability) => capabilityRoles[capability].includes(role));
}

const labels: Record<OrganizationDestination, string> = { overview: 'Overview', portal: 'Submission portal', opportunities: 'Opportunities', submissions: 'Submissions', reviews: 'Reviews', decisions: 'Decisions', messages: 'Messages', delivery: 'Delivery', insights: 'Insights', people: 'People', settings: 'Settings & billing' };

export function organizationDestinationHref(destination: OrganizationDestination, organizationId: string): string {
  const id = encodeURIComponent(organizationId);
  if (destination === 'overview') return `/organization/${id}/overview`;
  if (destination === 'portal') return `/organization/${id}/portal`;
  if (destination === 'opportunities') return `/organization/${id}/opportunities`;
  if (destination === 'submissions') return `/organization/${id}/submissions`;
  if (destination === 'reviews') return `/organization/${id}/reviews`;
  if (destination === 'decisions') return `/organization/${id}/decisions`;
  if (destination === 'messages') return `/organization/${id}/messages`;
  if (destination === 'delivery') return `/organization/${id}/delivery`;
  if (destination === 'insights') return `/organization/${id}/insights`;
  if (destination === 'people') return `/organization/${id}/people`;
  if (destination === 'settings') return `/organization/${id}/settings`;
  return `/workspace/${destination}?organizationId=${id}`;
}

export function organizationNavigation(projection: OrganizationCapabilityProjection, organizationId: string) {
  return projection.destinations.map((destination) => ({ id: destination, label: labels[destination], href: organizationDestinationHref(destination, organizationId) }));
}
