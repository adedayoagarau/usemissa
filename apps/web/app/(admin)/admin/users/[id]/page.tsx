import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail } from 'lucide-react';
import { creatorPoolFor, readAdminUserProfile, readSmsAccountStatus } from '@missa/radar-adapters';
import { AdminPageFrame } from '@/components/platform-admin';
import { BarList, NotConnected, Panel, StatGroup, StatTile, formatCount } from '@/components/admin-observability-ui';
import { platformAnalyticsDatabaseUrl } from '@/lib/platformAnalyticsDatabase';
import { maskPhoneNumber } from '@/lib/sms-phone';

const METHOD_LABELS: Record<string, string> = { password: 'Email and password', 'neon-auth': 'Google or email link' };

function when(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function daysSince(value?: string): number | null {
  return value ? Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 86_400_000)) : null;
}

function humanEvent(name: string): string {
  const spaced = name.replace(/^(public|auth|discovery|workspace|application|outcome)\./u, '').replace(/[._-]+/gu, ' ').trim();
  return spaced ? spaced[0]!.toUpperCase() + spaced.slice(1) : name;
}

export default async function AdminUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const connectionString = platformAnalyticsDatabaseUrl();
  if (!connectionString) {
    return <AdminPageFrame><NotConnected reason="User profiles need a connected database." /></AdminPageFrame>;
  }
  const accountId = decodeURIComponent(id);
  const [profile, sms] = await Promise.all([
    readAdminUserProfile(connectionString, accountId).catch(() => undefined),
    process.env.DATABASE_URL ? readSmsAccountStatus(creatorPoolFor(process.env.DATABASE_URL), accountId).catch(() => undefined) : Promise.resolve(undefined),
  ]);
  if (!profile) notFound();
  const daysSinceSignup = daysSince(profile.createdAt);

  return (
    <AdminPageFrame>
      <div className="space-y-8">
        <Link href="/admin/growth" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" aria-hidden="true" />Sign-ups & users</Link>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div className="min-w-0">
            <h1 className="truncate font-heading text-4xl font-medium tracking-[-0.02em] text-foreground sm:text-5xl">{profile.name || profile.email}</h1>
            <p className="mt-3 text-base text-muted-foreground">{[profile.name ? profile.email : null, profile.isAdmin ? 'Platform admin' : null, profile.active ? null : 'Deactivated'].filter(Boolean).join(' · ')}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{profile.id}</p>
          </div>
          <a href={`mailto:${profile.email}`} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Mail className="size-4" aria-hidden="true" />
            Email them
          </a>
        </header>

        <StatGroup label="User summary" columns={4}>
          <StatTile label="Signed up" value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} hint={daysSinceSignup === null ? undefined : `${daysSinceSignup} days ago${profile.activity.signupMethod ? ` · ${METHOD_LABELS[profile.activity.signupMethod] ?? profile.activity.signupMethod}` : ''}`} />
          <StatTile label="Last active" value={profile.activity.lastSeenAt ? new Date(profile.activity.lastSeenAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'} hint={when(profile.activity.lastSeenAt)} />
          <StatTile label="Active days" value={formatCount(profile.activity.activeDays)} hint={`${formatCount(profile.activity.events)} ${profile.activity.events === 1 ? 'action' : 'actions'} recorded`} />
          <StatTile label="Plan" value={profile.plan ? profile.plan.plan[0]!.toUpperCase() + profile.plan.plan.slice(1) : 'Free'} hint={profile.plan ? [profile.plan.source, profile.plan.billingStatus, profile.plan.cancelAtPeriodEnd ? 'cancels at period end' : undefined].filter(Boolean).join(' · ') : 'No paid plan'} />
        </StatGroup>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Panel title="Activity timeline" description="Most recent first. Product actions only appear for people who accepted analytics.">
            {profile.timeline.length ? (
              <ol className="divide-y divide-border">
                {profile.timeline.map((event, index) => (
                  <li key={`${event.occurredAt}-${index}`} className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm">
                    <span className="w-36 shrink-0 font-mono text-xs text-muted-foreground"><time dateTime={event.occurredAt}>{when(event.occurredAt)}</time></span>
                    <span className="text-foreground">{humanEvent(event.eventName)}</span>
                    {event.path && <span className="truncate font-mono text-xs text-muted-foreground">{event.path}</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No recorded activity yet.</p>
            )}
          </Panel>
          <div className="space-y-6">
            <Panel title="What they do most">
              <BarList rows={profile.topActions.map((action) => ({ label: humanEvent(action.eventName), value: action.count }))} valueLabel="Times" />
            </Panel>
            <Panel title="Text reminders" description="Texts are a Plus feature. The number is shown masked.">
              {sms?.phone ? (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Phone</dt><dd className="mt-0.5 font-mono text-foreground">{maskPhoneNumber(sms.phone)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Verified</dt><dd className="mt-0.5 text-foreground">{sms.verifiedAt ? when(sms.verifiedAt) : 'Not verified'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Texts</dt><dd className="mt-0.5 text-foreground">{sms.optedOutAt ? 'Replied STOP' : sms.enabled ? 'On' : 'Off'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Plan includes texts</dt><dd className="mt-0.5 text-foreground">{sms.planEligible ? 'Yes' : 'No'}</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-muted-foreground">Sent in the last 30 days</dt><dd className="mt-0.5 font-mono text-foreground">{formatCount(sms.sentLast30Days)}</dd></div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">{sms ? 'No phone number added.' : 'Text reminder records are not available.'}</p>
              )}
            </Panel>
            <Panel title="Organizations">
              {profile.organizations.length ? (
                <ul className="divide-y divide-border text-sm">
                  {profile.organizations.map((organization) => (
                    <li key={organization.id} className="flex justify-between gap-3 py-2"><span className="text-foreground">{organization.name}</span><span className="text-xs capitalize text-muted-foreground">{organization.role}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Not a member of any organization.</p>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </AdminPageFrame>
  );
}
