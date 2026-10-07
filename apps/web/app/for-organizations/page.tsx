import Link from 'next/link';
import { ArrowRight, Check, ExternalLink } from 'lucide-react';
import { PublicSiteShell } from '@/components/public-site-shell';
import { JsonLd, absoluteUrl, pageMetadata } from '@/lib/seo';
import { Sp } from '@/components/missa/spelling';
import { StickyMobileCta } from '@/components/missa/sticky-mobile-cta';
import styles from './org.module.css';
import { contactMailto } from "@/lib/legalContact";

export const metadata = pageMetadata({ title: 'Missa for organizations', description: 'Run your open call without enterprise software. Post the call where artists already look, take submissions, and answer each piece.', path: '/for-organizations' });

const capabilities = [
  { title: 'Post a clear call', state: 'Available', copy: 'Type, who can apply, location, dates, fee, guidelines and the form, each kept as its own fact.' },
  { title: 'Take submissions with several pieces', state: 'Available', copy: 'One submission can hold several pieces, and each keeps its own files and answer.' },
  { title: 'Share the reading with your team', state: 'Limited', copy: 'You can assign work to readers. Tighter access controls and some recovery steps are still in progress.' },
  { title: 'Decide on each piece', state: 'Available', copy: 'Every piece gets its own decision, and the submission’s status follows from those answers.' },
  { title: 'Send each person their answer', state: 'Limited', copy: 'Decision letters go out through Missa. Broader automation and some delivery recovery are still in progress.' },
  { title: 'Handle what happens after a yes', state: 'Planned', copy: 'Contracts and delivery of accepted work are designed, not built. We won’t show you a screenshot of it.' },
  { title: 'Manage your team, settings and billing', state: 'Limited', copy: 'Team members and billing basics work. Finer permissions and some billing tasks are still coming.' },
  { title: 'See how your call is doing', state: 'Limited', copy: 'Simple summaries from your own records. Missa doesn’t invent benchmarks or conversion rates.' },
] as const;

const steps = [
  ['1', 'Post', 'Say what you want, who can apply, the dates and the fee. Artists see it the way you wrote it.'],
  ['2', 'Receive', 'Submissions arrive with every piece kept separate, so nothing gets buried in one big PDF.'],
  ['3', 'Read', 'Share the work with your readers. Each one sees what they need to see.'],
  ['4', 'Decide', 'Answer each piece. The submission’s status follows from those answers.'],
  ['5', 'Reply', 'Send each person their answer, and see that it arrived.'],
];

export default function ForOrganizationsPage() {
  return <PublicSiteShell current="For organizations"><main id="main-content" className={styles.main}>
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Missa', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: 'Post open calls, take submissions and answer each piece.', url: absoluteUrl('/for-organizations') }} />
    <header className={styles.hero}><div><p className={styles.eyebrow}><Sp>For organizations</Sp></p><h1>Run your open call without enterprise software.</h1><p>Post the call where artists already look, take submissions, and answer each piece.</p><div className={styles.actions}><a id="organizations-primary-cta" href={contactMailto("Missa for my organization")} className={styles.primary}>Tell us about your call <ExternalLink aria-hidden="true" /></a><Link href="/opportunities">See what artists see <ArrowRight aria-hidden="true" /></Link></div></div><aside><strong>What works today, and what doesn’t yet</strong><p>Everything below is marked Available, Limited or Planned. We’d rather say “not yet” than show you a screenshot of something that isn’t real.</p></aside></header>
    <section className={styles.workflow} aria-labelledby="organization-path"><header><p className={styles.eyebrow}>How it works</p><h2 id="organization-path">From the call to the answer</h2></header><ol>{steps.map(([number, title, copy]) => <li key={number}><span>{number}</span><div><strong><Sp>{title}</Sp></strong><p><Sp>{copy}</Sp></p></div></li>)}</ol></section>
    <section className={styles.capabilities} aria-labelledby="capability-map"><header><p className={styles.eyebrow}>Where things stand</p><h2 id="capability-map">What works today</h2><p>Available means it works now. Limited means it works, with gaps. Planned means it doesn’t exist yet.</p></header><div>{capabilities.map((item) => <article key={item.title}><Check aria-hidden="true" /><div><h3><Sp>{item.title}</Sp></h3><p><Sp>{item.copy}</Sp></p></div><span data-state={item.state.toLowerCase()}>{item.state}</span></article>)}</div></section>
    <section className={styles.finalCta}><p className={styles.eyebrow}>Start with one call</p><h2>Bring one call and how you read it today.</h2><p>We’ll map your call, your readers and how you send answers, then tell you plainly what Missa can and can’t do for it yet.</p><a href={contactMailto("Missa for our open call")}>Tell us about your call <ArrowRight aria-hidden="true" /></a></section>
  </main>
  <StickyMobileCta
    anchorId="organizations-primary-cta"
    href={contactMailto("Missa for my organization")}
  >
    Tell us about your call
  </StickyMobileCta>
  </PublicSiteShell>;
}
