import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowRight, BookOpen, Building2, ExternalLink, ListChecks } from 'lucide-react';
import type { OpportunityBrowseProjection } from '@missa/radar-engine';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { OpportunityCatalogueCard } from '@/components/opportunity-catalogue-card';
import { PublicSiteShell } from '@/components/public-site-shell';
import { JsonLd, absoluteUrl, pageMetadata } from '@/lib/seo';
import styles from './home.module.css';

export const metadata = pageMetadata({
  title: 'Missa — Find grants, residencies, fellowships, and open calls',
  description: 'Discover credible creative Opportunities with their sources, deadlines, and limits kept visible—then keep your decision and next step together.',
  path: '/',
});

const OPPORTUNITY_TYPES = ['Grants', 'Residencies', 'Fellowships', 'Commissions', 'Open calls', 'Prizes', 'Publications', 'Labs', 'Mentorships'];

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const signedIn = Boolean(session);
  let opportunities: OpportunityBrowseProjection[] = [];
  let unavailable = false;

  try {
    opportunities = (await getOpportunityRepository().browse(
      { openNow: true, sort: 'soonest-deadline', limit: 3 },
      session?.account.id ? { accountId: session.account.id } : undefined,
    )).items;
  } catch {
    unavailable = true;
  }

  return (
    <PublicSiteShell current="Home">
      <main id="main-content" className={styles.main}>
        <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Missa', url: absoluteUrl('/'), description: 'Creative Opportunities with their source and limits kept visible.', potentialAction: { '@type': 'SearchAction', target: `${absoluteUrl('/opportunities')}?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }} />

        {/* Section 1 — hero: staggered type, breathing constellation of the facts Missa keeps */}
        <section className={styles.hero} aria-labelledby="home-heading">
          <div className={styles.heroCopy}>
            <p className={`${styles.eyebrow} ${styles.rise}`}>The opportunity index for artists</p>
            <h1 id="home-heading" className={styles.heroTitle}>
              <span className={styles.w1}>Find</span> <span className={styles.w2}>your</span> <span className={styles.w3}>next</span>{' '}
              <span className={styles.w4}><em>opportunity.</em></span>
            </h1>
            <p className={`${styles.heroSub} ${styles.rise} ${styles.d3}`}>Grants, residencies, fellowships, commissions, and open calls—gathered with their facts, sources, and deadlines kept visible.</p>
            <div className={`${styles.heroActions} ${styles.rise} ${styles.d4}`}>
              <Link href={signedIn ? '/home' : '/opportunities'} className={styles.primaryAction}>{signedIn ? 'Open Missa' : 'Browse Opportunities'}<ArrowRight aria-hidden="true" /></Link>
              <Link href="/methodology" className={styles.secondaryAction}>How Missa works</Link>
            </div>
            <p className={`${styles.heroNote} ${styles.rise} ${styles.d5}`}>The official call always stays one click away.</p>
          </div>

          <div className={styles.stage} aria-hidden="true">
            <svg className={styles.stageLines} viewBox="0 0 620 620" fill="none" preserveAspectRatio="none">
              <path className={styles.flow} d="M150 60 C 200 130, 180 190, 210 250" stroke="var(--border)" strokeWidth="1.2" />
              <path className={`${styles.flow} ${styles.flowB}`} d="M500 100 C 460 160, 470 210, 430 260" stroke="var(--border)" strokeWidth="1.2" />
              <path className={`${styles.flow} ${styles.flowC}`} d="M80 210 C 130 250, 160 260, 200 296" stroke="var(--border)" strokeWidth="1.2" />
            </svg>
            <div className={styles.orbit}>
              <div className={`${styles.frag} ${styles.fragA}`}><span className={styles.chip}><strong>Deadline</strong> kept with its timezone</span></div>
              <div className={`${styles.frag} ${styles.fragB}`}><span className={styles.chip}><strong>Fee</strong> always stated up front</span></div>
              <div className={`${styles.frag} ${styles.fragC}`}><span className={`${styles.chip} ${styles.chipTint}`}>Eligibility before promotion</span></div>
              <div className={`${styles.frag} ${styles.fragD}`}><span className={styles.chip}><strong>Official source</strong> linked</span></div>
              <div className={`${styles.frag} ${styles.fragCard}`}>
                <div className={styles.stageCard}>
                  <p className={styles.stageCardEyebrow}>One listing, kept understandable</p>
                  <dl className={styles.stageCardRows}>
                    <div><dt>Eligibility</dt><dd>Stated plainly, or marked unknown</dd></div>
                    <div><dt>Deadline</dt><dd>Date, time, and timezone together</dd></div>
                    <div><dt>Entry fee</dt><dd>Visible before you commit time</dd></div>
                    <div><dt>Source</dt><dd>The official call, one click away</dd></div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 — the index line */}
        <section className={styles.typesBand} aria-label="Kinds of Opportunities Missa gathers">
          <div className={styles.typesTrack}>
            <span className={styles.typesRun}>{OPPORTUNITY_TYPES.join(' · ')} · </span>
            <span className={styles.typesRun} aria-hidden="true">{OPPORTUNITY_TYPES.join(' · ')} · </span>
          </div>
        </section>

        {/* Section 3 — the problem, and what structure looks like */}
        <section className={styles.structure} aria-labelledby="structure-heading">
          <div>
            <h2 id="structure-heading">Good opportunities are hard enough to win. They should not be hard to find.</h2>
            <p>Calls are scattered across newsletters, PDFs, institutional sites, portals, and word of mouth. Missa gathers the details into one place and keeps the facts—not the promotion—in front of you.</p>
          </div>
          <div className={styles.structureVisual} aria-hidden="true">
            <div className={styles.scraps}>
              <span className={styles.scrapA}>newsletter, para 4</span>
              <span className={styles.scrapB}>guidelines.pdf, p.3</span>
              <span className={styles.scrapC}>a post from March</span>
              <span className={styles.scrapD}>portal FAQ</span>
            </div>
            <svg className={styles.structureArrow} width="80" height="44" viewBox="0 0 80 44" fill="none"><path className={styles.flow} d="M40 2 V34 M30 26 L40 38 L50 26" stroke="var(--primary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div className={styles.structureCard}>
              <div><span>Eligibility</span>Stated plainly</div>
              <div><span>Deadline</span>With its timezone</div>
              <div><span>Entry fee</span>Never buried</div>
              <div><span>Source</span>The official call</div>
            </div>
          </div>
        </section>

        {/* Section 4 — live Opportunities (real records, never samples) */}
        <section className={styles.opportunities} aria-labelledby="open-opportunities-heading">
          <header className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>Published Opportunities</p><h2 id="open-opportunities-heading">Open something useful now</h2><span>A small current set—not fabricated demo records and not a popularity ranking.</span></div>
            <Link href="/opportunities">Browse all <ArrowRight aria-hidden="true" /></Link>
          </header>
          {opportunities.length ? (
            <div className={styles.opportunityGrid}>{opportunities.map((item) => <OpportunityCatalogueCard key={item.id} item={item} signedIn={signedIn} />)}</div>
          ) : (
            <div className={styles.emptyState} role={unavailable ? 'alert' : 'status'}>
              <BookOpen aria-hidden="true" />
              <h3>{unavailable ? 'Opportunities are temporarily unavailable' : 'No published Opportunities to show here'}</h3>
              <p>{unavailable ? 'You can still read Guides or learn how Missa works. Try the Opportunity library again later.' : 'Missa is not substituting sample records. Read a Guide or return when published records are available.'}</p>
              <div><Link href="/guides">Read Guides</Link><Link href="/opportunities">Open the library</Link></div>
            </div>
          )}
        </section>

        {/* Section 5 — one connected path */}
        <section className={styles.path} aria-labelledby="missa-path-heading">
          <header><p className={styles.eyebrow}>One connected path</p><h2 id="missa-path-heading">Decide, prepare, and remember</h2></header>
          <div className={styles.pathTrack}>
            <svg className={styles.pathSpine} viewBox="0 0 1000 2" preserveAspectRatio="none" fill="none" aria-hidden="true"><path className={styles.spine} d="M0 1 H1000" stroke="var(--primary)" strokeWidth="1.4" /></svg>
            <ol>
              <li><span>01</span><strong>Read the independent facts</strong><p>Eligibility, geography, fee, deadline, and Opportunity type remain separate.</p></li>
              <li><span>02</span><strong>Save your decision</strong><p>Keep the Opportunity and your private next action in Tracker.</p></li>
              <li><span>03</span><strong>Prepare from the requirements</strong><p>Use the official call to decide which Work and materials belong.</p></li>
              <li><span>04</span><strong>Keep the record</strong><p>Submission receipts, decisions, and obligations stay attached to the right Work.</p></li>
            </ol>
          </div>
        </section>

        {/* Section 6 — source and trust */}
        <section className={styles.source} aria-labelledby="source-heading">
          <div>
            <h2 id="source-heading">Every listing should keep its source.</h2>
            <p>Missa does not ask you to trust a summary without evidence. Unknown or conflicting facts stay visible—missing information is never turned into reassurance.</p>
            <Link href="/methodology" className={styles.sourceLink}>Read the methodology <ArrowRight aria-hidden="true" /></Link>
          </div>
          <aside className={styles.sourcePanel} aria-label="What each listing keeps">
            <ExternalLink aria-hidden="true" />
            <p className={styles.eyebrow}>Start with the source</p>
            <h3>The official call remains authoritative.</h3>
            <dl>
              <div><dt>Official call</dt><dd>Linked, never paraphrased away</dd></div>
              <div><dt>Deadline timezone</dt><dd>Kept with the date</dd></div>
              <div><dt>Unknown facts</dt><dd>Shown as unknown</dd></div>
              <div><dt>Conflicts</dt><dd>Surfaced, not smoothed over</dd></div>
            </dl>
          </aside>
        </section>

        {/* Section 7 — both sides of the table */}
        <section className={styles.audiences}>
          <article><ListChecks aria-hidden="true" /><p className={styles.eyebrow}>For creators</p><h2>Keep your Opportunities and Works together.</h2><p>Your Profile, Tracker, and Library are private working tools—not public scores.</p><Link href={signedIn ? '/profile' : '/signup?next=%2Fprofile'}>{signedIn ? 'Open Profile' : 'Create an account'} <ArrowRight aria-hidden="true" /></Link></article>
          <article><Building2 aria-hidden="true" /><p className={styles.eyebrow}>For Organizations</p><h2>Run the path from call to per-Work outcome.</h2><p>Publish clearly, receive Submissions, review each Work, communicate decisions, and coordinate delivery.</p><Link href="/for-organizations">See the Organization workflow <ArrowRight aria-hidden="true" /></Link></article>
        </section>

        {/* Section 8 — the one color moment */}
        <section className={styles.ctaBand} aria-labelledby="cta-heading">
          <h2 id="cta-heading">Make less time for searching. Keep more time for the work.</h2>
          <div className={styles.ctaActions}>
            <Link href={signedIn ? '/home' : '/opportunities'} className={styles.ctaPrimary}>{signedIn ? 'Open Missa' : 'Browse Opportunities'}<ArrowRight aria-hidden="true" /></Link>
            {!signedIn ? <Link href="/signup" className={styles.ctaSecondary}>Create an account</Link> : null}
          </div>
        </section>
      </main>
    </PublicSiteShell>
  );
}
