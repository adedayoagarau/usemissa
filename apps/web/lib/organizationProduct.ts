import type { OrgRole } from '@missa/radar-engine';

export type OrganizationDestination = 'overview' | 'opportunities' | 'submissions' | 'reviews' | 'decisions' | 'messages' | 'delivery' | 'insights' | 'people' | 'settings';

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

const allDestinations: OrganizationDestination[] = ['overview', 'opportunities', 'submissions', 'reviews', 'decisions', 'messages', 'delivery', 'insights', 'people', 'settings'];

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

const labels: Record<OrganizationDestination, string> = { overview: 'Overview', opportunities: 'Opportunities', submissions: 'Submissions', reviews: 'Reviews', decisions: 'Decisions', messages: 'Messages', delivery: 'Delivery', insights: 'Insights', people: 'People', settings: 'Settings & billing' };

export function organizationDestinationHref(destination: OrganizationDestination, organizationId: string): string {
  const id = encodeURIComponent(organizationId);
  if (destination === 'overview') return `/organization/${id}/overview`;
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
