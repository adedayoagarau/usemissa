import type { OrgRole, Organization, OrganizationBillingStatus, OrganizationBillingTier } from '@missa/radar-engine';

export type OrganizationSettingsSection =
  | 'general'
  | 'structure'
  | 'brand'
  | 'communications'
  | 'security'
  | 'integrations'
  | 'data'
  | 'billing';

export const ORGANIZATION_SETTINGS_SECTIONS: Array<{
  id: OrganizationSettingsSection;
  label: string;
  description: string;
  implementation: 'current' | 'partial' | 'unavailable';
}> = [
  { id: 'general', label: 'General', description: 'Current Organization identity', implementation: 'current' },
  { id: 'structure', label: 'Structure', description: 'Teams, Programs, and Opportunities', implementation: 'current' },
  { id: 'brand', label: 'Brand', description: 'Logo and public identity', implementation: 'unavailable' },
  { id: 'communications', label: 'Communications', description: 'Sender and reply-to identity', implementation: 'unavailable' },
  { id: 'security', label: 'Security', description: 'Sign-in, provisioning, and recovery', implementation: 'unavailable' },
  { id: 'integrations', label: 'Integrations', description: 'Connections, keys, and webhooks', implementation: 'unavailable' },
  { id: 'data', label: 'Data governance', description: 'Retention, export, and legal hold', implementation: 'unavailable' },
  { id: 'billing', label: 'Billing & payouts', description: 'Plan, seats, subscription, and payouts', implementation: 'partial' },
];

export function settingsSectionsForRole(role: OrgRole) {
  return role === 'finance' ? ORGANIZATION_SETTINGS_SECTIONS.filter((section) => section.id === 'billing') : ORGANIZATION_SETTINGS_SECTIONS;
}

export function selectedSettingsSection(role: OrgRole, requested?: string): OrganizationSettingsSection {
  const allowed = settingsSectionsForRole(role);
  return allowed.some((section) => section.id === requested) ? requested as OrganizationSettingsSection : role === 'finance' ? 'billing' : 'general';
}

const tierLabels: Record<OrganizationBillingTier, string> = {
  free: 'Free',
  indie: 'Indie',
  pro: 'Pro',
  program: 'Program',
  enterprise: 'Enterprise',
};

const statusLabels: Record<OrganizationBillingStatus, string> = {
  inactive: 'Inactive',
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
};

export function organizationCommercialFacts(organization: Organization) {
  const tier = organization.billingTier ?? 'free';
  const status = organization.billingStatus ?? 'inactive';
  const connect = organization.stripeConnectStatus ?? 'not-connected';
  return {
    tier,
    tierLabel: tierLabels[tier],
    status,
    statusLabel: organization.billingCancelAtPeriodEnd ? 'Cancellation scheduled' : statusLabels[status],
    cancellationScheduled: organization.billingCancelAtPeriodEnd === true,
    hasSubscriptionReference: Boolean(organization.billingSubscriptionId),
    payoutLabel: connect === 'connected' ? 'Connected' : connect === 'pending' ? 'Setup incomplete' : 'Not connected',
  };
}

export function settingsAuthority(role: OrgRole, section: OrganizationSettingsSection): string {
  if (role === 'finance') return section === 'billing' ? 'Finance view of current commercial facts' : 'Unavailable to Finance';
  if (section === 'security' || section === 'data') return role === 'owner' ? 'Owner view; future high-risk changes require a server recheck' : 'Organization Admin view; high-risk controls remain Owner-only targets';
  if (section === 'billing') return role === 'owner' ? 'Owner view of billing and payout state' : 'Organization Admin compatibility view';
  return role === 'owner' ? 'Owner view' : 'Organization Admin view';
}
