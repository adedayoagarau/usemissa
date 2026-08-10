import Link from 'next/link'
import {
  ArrowRight,
  Check,
  CircleDot,
  ExternalLink,
  LockKeyhole,
  Smartphone,
} from 'lucide-react'

import styles from './opportunity-journey-review.module.css'

const journey = [
  {
    number: '01',
    label: 'Orient',
    title: 'Public shell',
    description: 'Make the current product, destination, and account entry clear before the person starts searching.',
    selected: '02 · Product switcher',
    path: '/design-system/shell',
    check: 'Can a signed-out visitor tell where Opportunities live?',
  },
  {
    number: '02',
    label: 'Discover',
    title: 'Opportunities browse',
    description: 'Support a quick pursue-or-skip decision with image-led results, progressive filters, and useful unknowns.',
    selected: '02 desktop · 01 mobile',
    path: '/design-system/opportunities-overhaul',
    check: 'Does the first result begin before the phone fold?',
  },
  {
    number: '03',
    label: 'Decide',
    title: 'Opportunity detail',
    description: 'Put deadline, fee, reach, eligibility, preparation, and the official source in a calm reading order.',
    selected: 'Selected synthesis',
    path: '/design-system/opportunity-detail',
    check: 'Can someone distinguish a confirmed fact from an unknown one?',
  },
  {
    number: '04',
    label: 'Return',
    title: 'Login and onboarding',
    description: 'Preserve the exact opportunity and intended Save action when authentication interrupts the journey.',
    selected: 'Journey-aware synthesis',
    path: '/design-system/auth-onboarding',
    check: 'Does sign-in return the person to the same decision?',
  },
  {
    number: '05',
    label: 'Continue',
    title: 'Tracker handoff',
    description: 'Turn one Save action into a private next step without duplicating Save and Track controls.',
    selected: 'Selected synthesis',
    path: '/design-system/tracker',
    check: 'Is the next action private, reversible, and obvious?',
  },
] as const

export function OpportunityJourneyReview() {
  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href='#journey'>Skip to journey</a>

      <header className={styles.header}>
        <Link className={styles.wordmark} href='/design-system'>Missa</Link>
        <span className={styles.localBadge}><LockKeyhole aria-hidden='true' /> Local review only</span>
      </header>

      <section className={styles.hero} aria-labelledby='journey-title'>
        <div>
          <p className={styles.eyebrow}>First promotion tranche · five screens</p>
          <h1 id='journey-title'>From first glance to the next right action.</h1>
          <p className={styles.lede}>
            The public Opportunity journey should feel like one considered path—not five unrelated pages.
            Review the selected compositions in the order a creator experiences them.
          </p>
        </div>
        <aside className={styles.promise} aria-label='Journey boundary'>
          <CircleDot aria-hidden='true' />
          <div>
            <strong>Evidence before persuasion</strong>
            <p>Images are optional. Freshness, confidence, internal scores, and operational state stay out of the customer journey.</p>
          </div>
        </aside>
      </section>

      <dl className={styles.summary} aria-label='Journey summary'>
        <div><dt>Screen family</dt><dd>Public Opportunity</dd></div>
        <div><dt>Primary width</dt><dd><Smartphone aria-hidden='true' />390px mobile</dd></div>
        <div><dt>Decision</dt><dd>Save once to Tracker</dd></div>
      </dl>

      <section id='journey' className={styles.journey} aria-labelledby='journey-sequence-title'>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Selected sequence</p>
            <h2 id='journey-sequence-title'>Five screens, one promise</h2>
          </div>
          <p>Each screen owns one job, then hands the person to the next decision without losing context.</p>
        </div>

        <ol className={styles.steps}>
          {journey.map((item, index) => (
            <li className={styles.step} key={item.number}>
              <div className={styles.stepRail} aria-hidden='true'>
                <span>{item.number}</span>
                {index < journey.length - 1 ? <i /> : null}
              </div>
              <article className={styles.stepCard}>
                <div className={styles.stepBody}>
                  <p className={styles.stepLabel}>{item.label}</p>
                  <h3>{item.title}</h3>
                  <p className={styles.description}>{item.description}</p>
                  <p className={styles.check}><Check aria-hidden='true' />{item.check}</p>
                </div>
                <div className={styles.stepAction}>
                  <span>{item.selected}</span>
                  <Link href={item.path}>Open screen <ArrowRight aria-hidden='true' /></Link>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.guardrails} aria-labelledby='guardrails-title'>
        <div>
          <p className={styles.eyebrow}>Promotion guardrails</p>
          <h2 id='guardrails-title'>What stays true across all five.</h2>
        </div>
        <ul>
          <li><Check aria-hidden='true' />Source-provided imagery may appear when useful; it is never presented as a separate product field.</li>
          <li><Check aria-hidden='true' />Profile is the customer-facing identity; internal route vocabulary stays out of the customer journey.</li>
          <li><Check aria-hidden='true' />Taxonomy, eligibility, geography, fee, and preparation remain separate facts.</li>
          <li><Check aria-hidden='true' />Official-source links finish the decision; Missa does not promise eligibility or acceptance.</li>
        </ul>
      </section>

      <footer className={styles.footer}>
        <Link href='/design-system'>Back to selected system <ArrowRight aria-hidden='true' /></Link>
        <a href='https://github.com/adedayoagarau/usemissa/pull/34' target='_blank' rel='noreferrer'>View overhaul PR <ExternalLink aria-hidden='true' /></a>
      </footer>
    </main>
  )
}
