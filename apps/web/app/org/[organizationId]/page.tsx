import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight, Building2, CalendarDays, CircleDollarSign, ImageIcon, Info } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { getProfileRepository } from '@/lib/profileRepository';
import { PublicSiteShell } from '@/components/public-site-shell';
import { InstitutionProfileView } from '@/components/institution-profile-view';
import { organizationMonogram, publicDeadlineLabel, publicFeeLabel, publicPracticeLabels, safePublicMedia } from '@/lib/publicOrganizationProfile';
import { JsonLd, absoluteUrl, pageMetadata } from '@/lib/seo';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { MissaSiteHeader } from '@/components/missa-site-header';
import styles from './public-organization.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ organizationId: string }> }): Promise<Metadata> {
  const { organizationId } = await params;
  try {
    const organization = (await getEngine()).store.organizations.get(organizationId);
    if (organization) {
      return pageMetadata({ title: `${organization.name} opportunities`, description: `Published Opportunities from ${organization.name} on Missa.`, path: `/org/${organizationId}` });
    }
    const profile = await getProfileRepository()?.getById(organizationId);
    if (profile) {
      return pageMetadata({ title: `${profile.name} — Arts Organization`, description: profile.summary || `Explore opportunities and exhibitions at ${profile.name}.`, path: `/org/${organizationId}` });
    }
    return pageMetadata({ title: 'Organization not found', description: 'This public Missa Organization page is not available.', path: `/org/${organizationId}`, noIndex: true });
  } catch {
    return pageMetadata({ title: 'Organization opportunities', description: 'Published Opportunities on Missa.', path: `/org/${organizationId}`, noIndex: true });
  }
}

export default async function PublicOrganizationPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const radar = await getEngine();
  const organization = radar.store.organizations.get(organizationId);

  if (!organization) {
    const profileRepo = getProfileRepository();
    const profile = profileRepo ? await profileRepo.getById(organizationId) : null;
    if (profile) {
      if (profile.kind === "residency_center") redirect(`/residency/${profile.slug}`);
      if (profile.kind === "grant_foundation") redirect(`/grant/${profile.slug}`);
      if (profile.kind === "literary_magazine") redirect(`/journal/${profile.slug}`);
      if (profile.kind === "small_press") redirect(`/press/${profile.slug}`);

      return (
        <PublicSiteShell current="Directory">
          <InstitutionProfileView profile={profile} />
        </PublicSiteShell>
      );
    }
    notFound();
  }
  const workspace = await getWorkspaceEngine();
  const openCalls = workspace.publishedOpenCallsForOrganization(organizationId);
  const opportunityRepository = await getOpportunityRepository();
  const linked = await Promise.all(openCalls.map((call) => call.radarOpportunityId ? opportunityRepository.getById(call.radarOpportunityId).catch(() => null) : null));
  const rows = openCalls.map((call, index) => {
    const opportunity = linked[index];
    const hasHostedForm = workspace.submissionPathsForOpenCall(call.id).length > 0;
    return { call, opportunity, hasHostedForm, image: safePublicMedia(opportunity?.identityAssetUrl) };
  });
  const practiceLabels = publicPracticeLabels(linked);
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  const headerSession = session ? { email: session.account.email, hasOrganization: session.memberships.length > 0 } : null;
  const monogram = organizationMonogram(organization.name);

  return <>
    <MissaSiteHeader session={headerSession} current="Organization" />
    <main id="main-content" className={styles.main}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Organization', name: organization.name, url: absoluteUrl(`/org/${organizationId}`), subjectOf: { '@type': 'ItemList', itemListElement: openCalls.map((call, index) => ({ '@type': 'ListItem', position: index + 1, name: call.title, url: absoluteUrl(`/org/${organizationId}/${call.id}`) })) } }} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: `${organization.name} published Opportunities`, numberOfItems: openCalls.length, itemListElement: openCalls.map((call, index) => ({ '@type': 'ListItem', position: index + 1, name: call.title, url: absoluteUrl(`/org/${organizationId}/${call.id}`) })) }} />
      <header className={styles.identity}>
        <span className={styles.logo} aria-hidden="true">{monogram || <Building2 />}</span>
        <div><p className={styles.eyebrow}>Public Organization profile</p><h1>{organization.name}</h1><p>Published Opportunities from this Organization. Public profile details are currently limited, so confirm each Opportunity through its linked guidelines or source.</p></div>
      </header>
      <aside className={styles.identityBoundary}><Info aria-hidden="true" /><div><strong>Limited public profile</strong><p>Missa currently has the Organization name and published hosted Opportunities. A verified internal domain flag is not shown as a public endorsement, and no private or operational records appear here.</p></div></aside>
      <section className={styles.opportunities} aria-labelledby="published-opportunities-title">
        <header className={styles.sectionHeader}><div><p className={styles.eyebrow}>Current choices</p><h2 id="published-opportunities-title">Published Opportunities</h2><p>{rows.length} currently published {rows.length === 1 ? 'Opportunity' : 'Opportunities'}</p></div></header>
        {rows.length ? <div className={styles.grid}>{rows.map(({ call, opportunity, hasHostedForm, image }) => <article className={styles.card} key={call.id}>
          <div className={styles.media}>{image ? <>
            {/* eslint-disable-next-line @next/next/no-img-element -- approved remote source media cannot use a fixed Next host allowlist */}
            <img src={image} alt={opportunity?.identityAssetAlt ?? ''} />
          </> : <span aria-hidden="true"><ImageIcon /><small>Media not provided</small></span>}</div>
          <div className={styles.cardBody}><div className={styles.cardMeta}><span>{hasHostedForm ? 'Hosted application' : 'Published details'}</span>{opportunity?.type ? <span>{opportunity.type.replaceAll('-', ' ')}</span> : null}</div><h3>{call.title}</h3>{opportunity?.content?.summary ? <p className={styles.summary}>{opportunity.content.summary}</p> : <p className={styles.summary}>Read the published details, guidelines, deadline, and application route before preparing your Work.</p>}<dl className={styles.facts}><div><dt><CalendarDays aria-hidden="true" />Deadline</dt><dd>{publicDeadlineLabel(opportunity)}</dd></div><div><dt><CircleDollarSign aria-hidden="true" />Fee</dt><dd>{publicFeeLabel(opportunity)}</dd></div></dl><Link href={`/org/${encodeURIComponent(organizationId)}/${encodeURIComponent(call.id)}`}>Open Opportunity <ArrowRight aria-hidden="true" /></Link></div>
        </article>)}</div> : <div className={styles.empty}><Building2 aria-hidden="true" /><h3>No published Opportunities</h3><p>This Organization does not currently have a published hosted Opportunity on Missa. No historical activity or future opening is inferred.</p><Link href="/opportunities">Browse all Opportunities</Link></div>}
      </section>
      <div className={styles.supporting}>
        <section><p className={styles.eyebrow}>About</p><h2>Organization information</h2><p>This Organization has not added an allowlisted public biography, official website, location, language, contact policy, logo, or public Program description yet.</p><small>Private domains are not converted into a public website link.</small></section>
        <section><p className={styles.eyebrow}>Derived from Opportunities shown</p><h2>Opportunities have included</h2>{practiceLabels.length ? <ul className={styles.labels}>{practiceLabels.map((label) => <li key={label}>{label}</li>)}</ul> : <p>No canonical field labels are available for the published Opportunities shown.</p>}<small>These labels describe the Opportunities above. They do not define, rate, or endorse the Organization.</small></section>
      </div>
      <footer className={styles.footer}><p>Public Organization profile · Confirm application details before submitting.</p><Link href="/opportunities">Browse Opportunities</Link></footer>
    </main>
  </>;
}
