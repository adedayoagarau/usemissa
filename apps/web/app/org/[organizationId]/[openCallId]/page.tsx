import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, CalendarDays, Check, CircleDollarSign, ExternalLink, FileText, ImageIcon, Info, LockKeyhole } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { publicDeadlineLabel, publicFeeLabel, safePublicMedia } from '@/lib/publicOrganizationProfile';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { MissaSiteHeader } from '@/components/missa-site-header';
import { SubmitForm } from '@/components/submit-form';
import styles from './hosted-application.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ organizationId: string; openCallId: string }> }): Promise<Metadata> {
  const { organizationId, openCallId } = await params;
  try {
    const call = (await getWorkspaceEngine()).store.openCalls.get(openCallId);
    if (!call || call.status !== 'published') return pageMetadata({ title: 'Opportunity not found', description: 'This public Missa Opportunity is not available.', path: `/org/${organizationId}/${openCallId}`, noIndex: true });
    return pageMetadata({ title: call.title, description: `Read the published details and application path for ${call.title}.`, path: `/org/${organizationId}/${openCallId}` });
  } catch {
    return pageMetadata({ title: 'Opportunity', description: 'Published Opportunity on Missa.', path: `/org/${organizationId}/${openCallId}`, noIndex: true });
  }
}

export default async function HostedOpportunityPage({ params }: { params: Promise<{ organizationId: string; openCallId: string }> }) {
  const { organizationId, openCallId } = await params;
  const radar = await getEngine();
  const organization = radar.store.organizations.get(organizationId);
  if (!organization) notFound();
  const workspace = await getWorkspaceEngine();
  const call = workspace.store.openCalls.get(openCallId);
  if (!call || call.status !== 'published') notFound();
  const program = workspace.store.programs.get(call.programId);
  const team = program ? workspace.store.entities.get(program.entityId) : undefined;
  if (!team || team.organizationId !== organizationId) notFound();
  const path = workspace.submissionPathsForOpenCall(openCallId)[0];
  const opportunity = call.radarOpportunityId ? await getOpportunityRepository().getById(call.radarOpportunityId).catch(() => null) : null;
  const media = safePublicMedia(opportunity?.identityAssetUrl);
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  const headerSession = session ? { email: session.account.email, hasOrganization: session.memberships.length > 0 } : null;
  const returnPath = `/org/${organizationId}/${openCallId}#application`;
  const requiredQuestions = path?.fields.filter((field) => field.required).length ?? 0;

  return <>
    <MissaSiteHeader session={headerSession} current="Opportunities" />
    <main id="main-content" className={styles.main}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: call.title, description: opportunity?.content?.summary ?? `Published Opportunity from ${organization.name}.`, url: absoluteUrl(`/org/${organizationId}/${openCallId}`), isPartOf: { '@type': 'WebSite', name: 'Missa', url: absoluteUrl('/') } }} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: organization.name, path: `/org/${organizationId}` }, { name: call.title }])} />
      <Link href={`/org/${encodeURIComponent(organizationId)}`} className={styles.back}><ArrowLeft aria-hidden="true" />{organization.name}</Link>
      <section className={styles.hero}>
        <div className={styles.heroCopy}><p className={styles.eyebrow}>Hosted Opportunity</p><h1>{call.title}</h1><p>{opportunity?.content?.summary ?? `A published Opportunity from ${organization.name}. Read the requirements and confirm the deadline before beginning a private application.`}</p><dl className={styles.heroFacts}><div><dt><CalendarDays aria-hidden="true" />Deadline</dt><dd>{publicDeadlineLabel(opportunity)}</dd></div><div><dt><CircleDollarSign aria-hidden="true" />Fee</dt><dd>{path?.feeCents ? `$${(path.feeCents / 100).toFixed(2)} USD application fee` : publicFeeLabel(opportunity)}</dd></div><div><dt><FileText aria-hidden="true" />Application route</dt><dd>{path ? 'Hosted privately on Missa' : 'Application form not published'}</dd></div></dl>{opportunity?.source.url ? <a className={styles.source} href={opportunity.source.url} target="_blank" rel="noreferrer">Read official source <ExternalLink aria-hidden="true" /></a> : null}</div>
        <div className={styles.media}>{media ? <>
          {/* eslint-disable-next-line @next/next/no-img-element -- approved remote source media cannot use a fixed Next host allowlist */}
          <img src={media} alt={opportunity?.identityAssetAlt ?? ''} />
        </> : <span aria-hidden="true"><ImageIcon /><small>Media not provided</small></span>}</div>
      </section>
      {call.guidelineText ? <section className={styles.guidelines} aria-labelledby="guidelines-title"><header><p className={styles.eyebrow}>Published by the Organization</p><h2 id="guidelines-title">Guidelines</h2></header><p>{call.guidelineText}</p></section> : <aside className={styles.publicLimit}><Info aria-hidden="true" /><div><strong>Guideline text is not available here</strong><p>Review any official source above and confirm requirements before submitting. Missa does not infer missing rules.</p></div></aside>}
      <section id="application" className={styles.application} aria-labelledby="application-title">
        <header className={styles.applicationHeader}><div><p className={styles.eyebrow}>Private application</p><h2 id="application-title">Application desk</h2><p>Build the current packet in one focused column while the Opportunity and known requirements stay visible.</p></div>{session ? <span>Signed in as {session.account.email}</span> : <span>Sign in required</span>}</header>
        {!path ? <div className={styles.unavailable}><LockKeyhole aria-hidden="true" /><h3>Application form not published</h3><p>This Opportunity has no hosted submission path. No draft can be started here.</p></div> : !session ? <div className={styles.authGate}><LockKeyhole aria-hidden="true" /><p className={styles.eyebrow}>Your application is private</p><h3>Sign in before starting a draft</h3><p>Reading remains public. Missa creates or restores private answers and files only after you authenticate and deliberately use the form.</p><div><Link href={`/login?next=${encodeURIComponent(returnPath)}`}>Log in and return</Link><Link href={`/signup?next=${encodeURIComponent(returnPath)}`}>Create Profile</Link></div></div> : <div className={styles.desk}>
          <aside className={styles.ledger} aria-label="Current application sections"><p>Application</p><ol><li data-state="available"><span><Check aria-hidden="true" /></span><div><strong>Readiness</strong><small>Known requirements below</small></div></li><li data-state="current"><span>2</span><div><strong>Works</strong><small>At least one titled Work</small></div></li><li><span>3</span><div><strong>Questions</strong><small>{path.fields.length} fields · {requiredQuestions} required</small></div></li><li data-state="blocked"><span>4</span><div><strong>Review</strong><small>Not implemented in the current form</small></div></li></ol></aside>
          <section className={styles.editor} aria-label="Current hosted application form"><div className={styles.compatibility}><Info aria-hidden="true" /><div><strong>Current form, not the complete target experience</strong><p>Draft recovery, uploads, fee handoff, and idempotent submission exist. Form-version comparison, a recipient-visible Review step, upload progress and retry, deadline-race handling, and a complete immutable receipt remain promotion blockers.</p></div></div><SubmitForm pathId={path.id} categories={path.categories} fields={path.fields} feeCents={path.feeCents} /></section>
          <aside className={styles.requirements} aria-label="Opportunity and draft context"><section><p className={styles.eyebrow}>Opportunity</p><h3>{call.title}</h3><dl><div><dt>Deadline</dt><dd>{publicDeadlineLabel(opportunity)}</dd></div><div><dt>Fee</dt><dd>{path.feeCents ? `$${(path.feeCents / 100).toFixed(2)} USD` : publicFeeLabel(opportunity)}</dd></div><div><dt>Categories</dt><dd>{path.categories.length || 'Not limited'}</dd></div></dl></section><section><p className={styles.eyebrow}>Current requirements</p><ul><li>At least one titled Work</li><li>{path.fields.length} Organization {path.fields.length === 1 ? 'field' : 'fields'}</li><li>Files up to 25 MB each</li><li>Private until final submission</li></ul></section><section><p className={styles.eyebrow}>Draft boundary</p><p>A local copy and current server draft may be restored. The current interface cannot compare simultaneous edits or a changed form version.</p></section></aside>
        </div>}
      </section>
    </main>
  </>;
}
