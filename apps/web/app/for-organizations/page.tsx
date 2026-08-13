import Link from 'next/link';
import { ArrowRight, Check, ExternalLink } from 'lucide-react';
import { PublicSiteShell } from '@/components/public-site-shell';
import { JsonLd, absoluteUrl, pageMetadata } from '@/lib/seo';
import styles from './org.module.css';

export const metadata = pageMetadata({ title: 'Run creative Opportunities with Missa', description: 'Publish clear calls, receive multi-Work Submissions, assign review, record per-Work decisions, and keep communication attached to the right record.', path: '/for-organizations' });

const capabilities = [
  { title: 'Publish a clear Opportunity', state: 'Available', copy: 'Keep Opportunity type, field, eligibility, geography, dates, fee, guidelines, and form as separate facts.' },
  { title: 'Receive multi-Work Submissions', state: 'Available', copy: 'One Submission can contain several Works without flattening their evidence or outcomes into one record.' },
  { title: 'Assign focused reviews', state: 'Limited', copy: 'Review assignments and evidence exist, while complete assignment-only access and every recovery path remain under active product review.' },
  { title: 'Record per-Work decisions', state: 'Available', copy: 'Each Work keeps its own decision. A Submission summary is derived from those outcomes.' },
  { title: 'Communicate recipient-level outcomes', state: 'Limited', copy: 'Messages and delivery state are represented, but broad automation and every provider recovery path are not claimed as complete.' },
  { title: 'Coordinate accepted-Work delivery', state: 'Planned', copy: 'The local design contract exists. It is not presented as a generally available production capability.' },
  { title: 'Manage people, settings, and billing', state: 'Limited', copy: 'Organization membership and billing foundations exist; fine-grained permissions and all billing operations remain bounded.' },
  { title: 'Read operational insight', state: 'Limited', copy: 'Current records can support scoped summaries. Missa does not invent benchmarks, conversion rates, or outcome claims.' },
] as const;

const steps = [
  ['01', 'Publish', 'State the call, requirements, dates, fee, and submission path clearly.'],
  ['02', 'Receive', 'Keep every Submission and its Works in one bounded Organization record.'],
  ['03', 'Review', 'Assign the right evidence to the right reviewer without broad access.'],
  ['04', 'Decide', 'Record the outcome for each Work before deriving a packet summary.'],
  ['05', 'Communicate', 'Send recipient-level truth and keep delivery evidence separate from intent.'],
];

export default function ForOrganizationsPage() {
  return <PublicSiteShell current="For organizations"><main id="main-content" className={styles.main}>
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Missa', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: 'Creative Opportunity and submission operations for Organizations.', url: absoluteUrl('/for-organizations') }} />
    <header className={styles.hero}><div><p className={styles.eyebrow}>For Organizations</p><h1>Run the whole Opportunity without losing the individual Work.</h1><p>Publish clearly, receive coherent packets, assign focused reviews, decide each Work, communicate accurately, and coordinate what happens after acceptance.</p><div className={styles.actions}><a href="mailto:hello@usemissa.com?subject=Missa%20for%20my%20Organization" className={styles.primary}>Discuss your program <ExternalLink aria-hidden="true" /></a><Link href="/opportunities">See the creator side <ArrowRight aria-hidden="true" /></Link></div></div><aside><strong>No capability theatre</strong><p>Available, limited, and planned work stay visibly different. Planned work is not shown as a live customer screenshot or promised delivery date.</p></aside></header>
    <section className={styles.workflow} aria-labelledby="organization-path"><header><p className={styles.eyebrow}>One connected record</p><h2 id="organization-path">From published call to per-Work outcome</h2></header><ol>{steps.map(([number, title, copy]) => <li key={number}><span>{number}</span><div><strong>{title}</strong><p>{copy}</p></div></li>)}</ol></section>
    <section className={styles.capabilities} aria-labelledby="capability-map"><header><p className={styles.eyebrow}>Capability map</p><h2 id="capability-map">What Missa can claim now</h2><p>These labels describe the current product boundary, not a sales roadmap.</p></header><div>{capabilities.map((item) => <article key={item.title}><Check aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.copy}</p></div><span data-state={item.state.toLowerCase()}>{item.state}</span></article>)}</div></section>
    <section className={styles.finalCta}><p className={styles.eyebrow}>Start with the real program</p><h2>Bring one Opportunity and its actual review path.</h2><p>We will map the call, Works, reviewers, decisions, communication, and delivery obligations without pretending every Organization works the same way.</p><a href="mailto:hello@usemissa.com?subject=Missa%20Organization%20workflow">Discuss your program <ArrowRight aria-hidden="true" /></a></section>
  </main></PublicSiteShell>;
}
