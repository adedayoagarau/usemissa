import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Building2, CircleDollarSign, Database, EyeOff, Info, Landmark, LockKeyhole, Mail, Network, Palette, ShieldCheck, WalletCards } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { ORGANIZATION_SETTINGS_SECTIONS, organizationCommercialFacts, selectedSettingsSection, settingsAuthority, settingsSectionsForRole, type OrganizationSettingsSection } from '@/lib/organizationSettings';
import { getWorkspaceEngine, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';
import styles from './settings.module.css';
import { OrganizationReviewSettings } from '@/components/organization-review-settings';
import { CreateProgramDialog, CreateTeamDialog } from '@/components/organization-structure-actions';
import { OrganizationCustomizationForm } from '@/components/organization-customization-form';
import { resolveOrganizationCustomization } from '@/lib/organizationCustomization';

type Query = { section?: string };

const sectionIcons: Record<OrganizationSettingsSection, typeof Building2> = {
  general: Building2,
  structure: Network,
  brand: Palette,
  communications: Mail,
  security: ShieldCheck,
  integrations: LockKeyhole,
  data: Database,
  billing: CircleDollarSign,
  review: EyeOff,
};

const unavailableCopy: Record<Exclude<OrganizationSettingsSection, 'general' | 'structure' | 'billing' | 'review' | 'brand' | 'communications'>, { title: string; description: string; required: string[] }> = {
  security: { title: 'Organization security policy is not represented yet', description: 'Account authentication exists, but Organization-level SSO, SCIM, MFA enforcement, sessions, recovery contacts, and approved domains do not.', required: ['Recent-authentication checks', 'Test sign-in and recovery access', 'Scoped, audited policy changes'] },
  integrations: { title: 'Organization integrations are not represented yet', description: 'No durable Organization integration, scope, secret, webhook, connection owner, rotation, or revocation record is available.', required: ['Explicit scopes and owner', 'Masked secrets and one-time reveal', 'Reconnect, rotate, revoke, and recovery'] },
  data: { title: 'Data-governance policy is not represented yet', description: 'Retention, legal hold, exports, archive, restore, and deletion are not durable Organization settings. Destructive controls stay withheld.', required: ['Data-class retention rules', 'Legal hold and export state', 'Transactional archive and delayed deletion'] },
};

function implementationLabel(value: 'current' | 'partial' | 'unavailable') {
  if (value === 'current') return 'Current read model';
  if (value === 'partial') return 'Partial read model';
  return 'Not represented';
}

export default async function OrganizationSettingsPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<Query> }) {
  const { organizationId } = await params;
  const query = await searchParams;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/settings`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const projection = organizationCapabilityProjection(membership.role);
  if (!projection.destinations.includes('settings')) notFound();

  const radar = await getEngine();
  const organization = radar.store.organizations.get(organizationId);
  if (!organization) notFound();
  const workspace = await getWorkspaceEngine();
  const sections = settingsSectionsForRole(membership.role);
  const activeId = selectedSettingsSection(membership.role, query.section);
  const active = ORGANIZATION_SETTINGS_SECTIONS.find((section) => section.id === activeId)!;
  const commercial = organizationCommercialFacts(organization);
  const seats = radar.organizationSeatUsage(organizationId);
  const teams = workspace.entitiesForOrganization(organizationId);
  const programs = teams.flatMap((team) => workspace.programsForEntity(team.id));
  const opportunities = programs.flatMap((program) => workspace.openCallsForProgram(program.id));
  const base = `/organization/${encodeURIComponent(organizationId)}/settings`;
  const canManage = membership.role === 'owner' || membership.role === 'admin';

  return <main id="organization-main" className={styles.main}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Your organization</p><h1>Settings & billing</h1><p>Your organization’s details, teams, brand, messages, review privacy and billing, each in its own section. Anything that isn’t built yet says so.</p></div><span className={styles.role}>{projection.label}</span></header>
    <aside className={styles.boundary}><ShieldCheck aria-hidden="true" /><div><strong>What you can change here</strong><p>Owners and Admins create Teams and Programs under Structure. Brand & appearance, Communications and Review privacy save from this page with validation and an audit entry. Billing, security, integrations and data governance remain read-only until their preview and recovery contracts exist.</p></div></aside>
    <form className={styles.mobilePicker}><label><span>Settings section</span><select name="section" defaultValue={activeId}>{sections.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}</select></label><button type="submit">Open</button></form>
    <div className={styles.control}>
      <nav className={styles.sectionNav} aria-label="Settings sections"><p>Settings</p>{sections.map((section) => { const Icon = sectionIcons[section.id]; return <Link key={section.id} href={`${base}?section=${section.id}`} aria-current={section.id === activeId ? 'page' : undefined}><Icon aria-hidden="true" /><span><strong>{section.label}</strong><small>{section.description}</small></span><i data-state={section.implementation} aria-label={implementationLabel(section.implementation)} /></Link>; })}</nav>
      <section className={styles.panel} aria-labelledby="settings-panel-title">
        <header className={styles.panelHeader}><div><p className={styles.eyebrow}>{active.description}</p><h2 id="settings-panel-title">{active.label}</h2></div><span>{implementationLabel(active.implementation)}</span></header>
        {activeId === 'general' ? <section className={styles.panelBody}><dl className={styles.factList}><div><dt>Public organization name</dt><dd>{organization.name}</dd><p>The name used across your organization workspace.</p></div><div><dt>Verified domain state</dt><dd>{organization.verified ? 'Verified' : 'Not verified'}</dd><p>Verification is distinct from a public custom domain.</p></div><div><dt>Recorded domains</dt><dd>{organization.domains.length ? organization.domains.join(', ') : 'No domains recorded'}</dd><p>No legal name, locale, timezone, currency, address, or slug exists in the current Organization model.</p></div></dl><div className={styles.withheld}><Info aria-hidden="true" /><div><strong>No General save action</strong><p>Public name and verified domains are observable facts today. Editing stays unavailable until validation, audit, versioning, and legal/public-name separation are durable.</p></div></div></section> : null}
        {activeId === 'structure' ? <section className={styles.panelBody}><dl className={styles.structureFacts}><div><dt>Teams</dt><dd>{teams.length}</dd></div><div><dt>Programs</dt><dd>{programs.length}</dd></div><div><dt>Opportunities</dt><dd>{opportunities.length}</dd></div></dl>{canManage ? <div className={styles.structureActions}><CreateTeamDialog organizationId={organizationId} variant={teams.length ? 'outline' : 'default'} /></div> : null}{teams.length ? <ol className={styles.structureList}>{teams.map((team) => { const teamPrograms = programs.filter((program) => program.entityId === team.id); const teamOpportunityCount = teamPrograms.reduce((count, program) => count + workspace.openCallsForProgram(program.id).length, 0); return <li key={team.id}><div><strong>{team.name}</strong><span>{teamPrograms.length ? teamPrograms.map((program) => program.name).join(', ') : 'No Programs yet'} · {teamOpportunityCount} {teamOpportunityCount === 1 ? 'Opportunity' : 'Opportunities'}</span></div>{canManage ? <CreateProgramDialog organizationId={organizationId} team={{ id: team.id, name: team.name }} /> : <span>Current record</span>}</li>; })}</ol> : <div className={styles.empty}><strong>No Teams yet</strong><p>{canManage ? 'Every Opportunity belongs to a Program inside a Team. Create a Team, add a Program to it, then create Opportunities from the Opportunities page.' : 'An Owner or Admin creates the first Team and Program before Opportunities can be drafted.'}</p></div>}<div className={styles.withheld}><Network aria-hidden="true" /><div><strong>Rename, move, and archive stay withheld</strong><p>Teams and Programs can be created here. Renaming, moving, or archiving one needs scope, dependency, reassignment, and audit rules first.</p></div></div></section> : null}
        {activeId === 'billing' ? <section className={styles.panelBody}><div className={styles.commercialGrid}><article><header><CircleDollarSign aria-hidden="true" /><div><h3>Missa plan</h3><p>Subscription and Organization seat entitlement</p></div></header><dl><div><dt>Plan</dt><dd>{commercial.tierLabel}</dd></div><div><dt>Status</dt><dd>{commercial.statusLabel}</dd></div><div><dt>Seats</dt><dd>{seats.used} of {seats.limit}</dd></div><div><dt>Available</dt><dd>{seats.available}</dd></div><div><dt>Subscription reference</dt><dd>{commercial.hasSubscriptionReference ? 'Recorded privately' : 'Not recorded'}</dd></div></dl></article><article><header><WalletCards aria-hidden="true" /><div><h3>Submission-fee payouts</h3><p>Separate from the Missa subscription</p></div></header><dl><div><dt>Connection</dt><dd>{commercial.payoutLabel}</dd></div><div><dt>Payout reference</dt><dd>{organization.stripeConnectAccountId ? 'Recorded privately' : 'Not recorded'}</dd></div><div><dt>Balance</dt><dd>Unavailable</dd></div><div><dt>Schedule</dt><dd>Unavailable</dd></div><div><dt>Requirements</dt><dd>Unavailable</dd></div></dl></article></div>{commercial.cancellationScheduled ? <div className={styles.attention}><Landmark aria-hidden="true" /><div><strong>Subscription cancellation is scheduled</strong><p>The current record doesn’t include the date the period ends. Missa won’t guess one, or suggest that your organization’s records or payouts are deleted.</p></div></div> : null}<div className={styles.withheld}><CircleDollarSign aria-hidden="true" /><div><strong>Commercial actions stay withheld</strong><p>Checkout, cancellation, payout onboarding, payment methods, invoices, taxes, renewal dates, differentiated seats, and proration need authoritative previews and dedicated recovery flows.</p></div></div></section> : null}
        {activeId === 'review' ? <section className={styles.panelBody}><OrganizationReviewSettings organizationId={organizationId} canManage={canManage} {...(workspaceRelationalAuthorityEnabled() ? {} : { unavailableReason: 'Review privacy can’t be changed for this Organization yet. It is saved as a versioned setting, which this Organization’s workspace does not support.' })} /></section> : null}
        {activeId === 'brand' || activeId === 'communications' ? <section className={styles.panelBody}><OrganizationCustomizationForm organizationId={organizationId} section={activeId} stored={organization.customization ?? {}} resolved={resolveOrganizationCustomization(organization)} canManage={canManage} /></section> : null}
        {!['general', 'structure', 'billing', 'review', 'brand', 'communications'].includes(activeId) ? (() => { const copy = unavailableCopy[activeId as keyof typeof unavailableCopy]; return <section className={styles.panelBody}><div className={styles.unavailable}><LockKeyhole aria-hidden="true" /><h3>{copy.title}</h3><p>{copy.description}</p></div><section className={styles.requirements}><h3>Required before this domain can be enabled</h3><ul>{copy.required.map((item) => <li key={item}>{item}</li>)}</ul></section></section>; })() : null}
      </section>
      <aside className={styles.rail} aria-label="Section status and safeguards"><section><p className={styles.eyebrow}>Your authority</p><h2>{projection.label}</h2><p>{settingsAuthority(membership.role, activeId)}</p><span>Server recheck required for every future action</span></section><section><p className={styles.eyebrow}>Section state</p><h2>{implementationLabel(active.implementation)}</h2><p>{active.implementation === 'current' ? 'Current records can be read without claiming an edit contract.' : active.implementation === 'partial' ? 'Some commercial fields exist; key customer facts and safe actions do not.' : 'This domain remains a product contract, not a working feature.'}</p></section><section><p className={styles.eyebrow}>Safeguards</p><ul><li>One settings domain per transaction</li><li>Plan and payouts remain separate</li><li>Commercial seats never grant access</li><li>Destructive controls remain absent</li></ul></section></aside>
    </div>
  </main>;
}
