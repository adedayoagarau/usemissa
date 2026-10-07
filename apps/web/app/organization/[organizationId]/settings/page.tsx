import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Building2, CircleDollarSign, Database, EyeOff, Landmark, LockKeyhole, Mail, Network, Palette, ShieldCheck } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { ORGANIZATION_SETTINGS_SECTIONS, organizationCommercialFacts, selectedSettingsSection, settingsSectionsForRole, type OrganizationSettingsSection } from '@/lib/organizationSettings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { DetailFields } from '@/components/missa/detail-fields';
import { HueTile } from '@/components/missa/hue-tile';
import { SettingsStateBadge } from '@/components/missa/operations-badges';
import { SettingsRow } from '@/components/missa/settings-row';
import { SettingsSectionPicker } from '@/components/settings-section-picker';
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

/** Section descriptions are lists ("Accent, logo, stage words"); the panel shows them as a sentence. */
function sentence(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}${value.endsWith('.') ? '' : '.'}`;
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

  const editable = new Set<OrganizationSettingsSection>(['structure', 'brand', 'communications', 'review']);
  const state = editable.has(activeId) ? undefined : active.implementation === 'unavailable' ? 'not-available' as const : 'read-only' as const;
  const unavailable = !['general', 'structure', 'billing', 'review', 'brand', 'communications'].includes(activeId) ? unavailableCopy[activeId as keyof typeof unavailableCopy] : undefined;

  return (
    <main id="organization-main" className={styles.main}>
      <header className="grid gap-1 border-b border-border pb-5">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground">Settings & billing</h1>
        <p className="text-sm text-muted-foreground">Your organization’s details, teams, brand, letters, review privacy and billing. Anything not built yet says so.</p>
      </header>
      <div className="grid gap-8 pt-6 md:grid-cols-[13.5rem_minmax(0,1fr)]">
        <div className="md:hidden"><SettingsSectionPicker base={base} active={activeId} sections={sections.map((section) => ({ id: section.id, label: section.label }))} /></div>
        <nav aria-label="Settings sections" className="hidden content-start gap-0.5 md:grid">
          {sections.map((section) => { const Icon = sectionIcons[section.id]; return <Button key={section.id} variant="nav" size="sm" render={<Link href={`${base}?section=${section.id}`} aria-current={section.id === activeId ? 'page' : undefined} />}><Icon aria-hidden="true" />{section.label}</Button>; })}
        </nav>
        <section aria-labelledby="settings-panel-title" className="grid min-w-0 content-start gap-6">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div className="grid gap-1">
              <h2 id="settings-panel-title" className="text-xl font-semibold tracking-tight text-foreground">{active.label}</h2>
              <p className="text-sm text-muted-foreground">{sentence(active.description)}</p>
            </div>
            {state ? <SettingsStateBadge state={state} /> : null}
          </header>

          {activeId === 'general' ? (
            <div className="grid">
              <SettingsRow id="general-name" title="Public name" description="The name used across your organization workspace.">
                <DetailFields fields={[['Name', organization.name], ['Domain', organization.verified ? 'Verified' : 'Not verified'], ['Recorded domains', organization.domains.length ? organization.domains.join(', ') : 'None recorded']]} />
              </SettingsRow>
              <SettingsRow id="general-editing" title="Editing" description="Name and domains can’t be edited here yet.">
                <p className="text-sm text-muted-foreground">Editing waits on validation, an audit trail, versioning, and keeping the legal name apart from the public one. Legal name, locale, time zone, currency and address aren’t stored yet.</p>
              </SettingsRow>
            </div>
          ) : null}

          {activeId === 'structure' ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground tabular-nums">{teams.length}</span> {teams.length === 1 ? 'team' : 'teams'} · <span className="font-medium text-foreground tabular-nums">{programs.length}</span> {programs.length === 1 ? 'program' : 'programs'} · <span className="font-medium text-foreground tabular-nums">{opportunities.length}</span> {opportunities.length === 1 ? 'opportunity' : 'opportunities'}</p>
                {canManage ? <CreateTeamDialog organizationId={organizationId} variant={teams.length ? 'outline' : 'default'} /> : null}
              </div>
              {teams.length ? (
                <ul className="grid divide-y divide-border rounded-lg border border-border">
                  {teams.map((team) => {
                    const teamPrograms = programs.filter((program) => program.entityId === team.id);
                    const teamOpportunityCount = teamPrograms.reduce((count, program) => count + workspace.openCallsForProgram(program.id).length, 0);
                    return (
                      <li key={team.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <HueTile identity={team.id}><Network /></HueTile>
                        <div className="grid min-w-0 flex-1">
                          <span className="truncate text-sm font-medium text-foreground">{team.name}</span>
                          <span className="truncate text-xs text-muted-foreground">{teamPrograms.length ? teamPrograms.map((program) => program.name).join(', ') : 'No programs yet'} · {teamOpportunityCount} {teamOpportunityCount === 1 ? 'opportunity' : 'opportunities'}</span>
                        </div>
                        {canManage ? <CreateProgramDialog organizationId={organizationId} team={{ id: team.id, name: team.name }} /> : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Empty variant="bordered"><EmptyHeader><EmptyTitle>No teams yet</EmptyTitle><EmptyDescription>{canManage ? 'Every opportunity belongs to a program inside a team. Create a team, add a program to it, then create opportunities.' : 'An owner or admin creates the first team and program before opportunities can be drafted.'}</EmptyDescription></EmptyHeader></Empty>
              )}
              <p className="text-sm text-muted-foreground">Teams and programs can be created here. Renaming, moving or archiving one waits on scope, dependency and audit rules.</p>
            </div>
          ) : null}

          {activeId === 'billing' ? (
            <div className="grid">
              <SettingsRow id="billing-plan" title="Missa plan" description="Your subscription and how many people can work in the organization.">
                <DetailFields fields={[['Plan', commercial.tierLabel], ['Status', commercial.statusLabel], ['Seats', <span key="seats" className="tabular-nums">{seats.used} of {seats.limit} used · {seats.available} free</span>], ['Subscription', commercial.hasSubscriptionReference ? 'Recorded privately' : 'Not recorded']]} />
              </SettingsRow>
              <SettingsRow id="billing-payouts" title="Submission-fee payouts" description="Plan and payouts remain separate: fees submitters pay never go towards the Missa subscription.">
                <DetailFields fields={[['Connection', commercial.payoutLabel], ['Payout account', organization.stripeConnectAccountId ? 'Recorded privately' : 'Not recorded'], ['Balance', 'Not available'], ['Schedule', 'Not available']]} />
              </SettingsRow>
              {commercial.cancellationScheduled ? (
                <Alert><Landmark aria-hidden="true" /><AlertTitle>Subscription cancellation is scheduled</AlertTitle><AlertDescription>The record doesn’t include when the period ends. Missa won’t guess a date, or suggest your records or payouts are deleted.</AlertDescription></Alert>
              ) : null}
              <SettingsRow id="billing-actions" title="Commercial actions stay withheld" description="Nothing here can be bought, cancelled or connected yet.">
                <p className="text-sm text-muted-foreground">Checkout, cancellation, payout onboarding, payment methods, invoices, taxes, renewal dates and proration each need an exact preview and a way back before they are offered.</p>
              </SettingsRow>
            </div>
          ) : null}

          {activeId === 'review' ? <OrganizationReviewSettings organizationId={organizationId} canManage={canManage} {...(workspaceRelationalAuthorityEnabled() ? {} : { unavailableReason: 'Review privacy can’t be changed for this organization yet. It’s saved as a versioned setting, which this organization’s workspace doesn’t support.' })} /> : null}

          {activeId === 'brand' || activeId === 'communications' ? <OrganizationCustomizationForm organizationId={organizationId} section={activeId} stored={organization.customization ?? {}} resolved={resolveOrganizationCustomization(organization)} canManage={canManage} /> : null}

          {unavailable ? (
            <div className="grid gap-4">
              <div className="grid gap-1">
                <h3 className="text-base font-semibold text-foreground">{unavailable.title}</h3>
                <p className="text-sm text-muted-foreground">{unavailable.description}</p>
              </div>
              <div className="grid gap-2 rounded-lg border border-border bg-card p-4">
                <h4 className="text-sm font-semibold text-foreground">Needed before this can be turned on</h4>
                <ul className="grid gap-1.5">{unavailable.required.map((item) => <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole aria-hidden="true" className="size-4 shrink-0" />{item}</li>)}</ul>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
