import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowRight, BookOpen } from 'lucide-react';
import type { OpportunityBrowseProjection } from '@missa/radar-engine';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { PublicSiteShell } from '@/components/public-site-shell';
import { JsonLd, absoluteUrl, pageMetadata } from '@/lib/seo';
import styles from './home.module.css';

export const metadata = pageMetadata({
  title: 'Missa — The opportunity index for artists',
  description: 'Grants, residencies, fellowships, commissions, and open calls—filed with their deadlines, fees, eligibility, and sources kept visible.',
  path: '/',
});

const OPPORTUNITY_TYPES = ['Grants', 'Residencies', 'Fellowships', 'Commissions', 'Open calls', 'Prizes', 'Publications', 'Labs', 'Mentorships'];

function typeLabel(type: OpportunityBrowseProjection['type']): string {
  if (type === 'open-call') return 'Open call';
  return type.replace(/-/gu, ' ').replace(/^./u, (character) => character.toUpperCase());
}

function deadlineLabel(deadline: OpportunityBrowseProjection['deadline']): string {
  if (!deadline.date) {
    if (deadline.kind === 'rolling') return 'Rolling';
    if (deadline.kind === 'until-filled') return 'Until filled';
    return 'Not listed';
  }
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${deadline.date}T12:00:00`));
}

function feeLabel(item: OpportunityBrowseProjection): string {
  if (item.fee.status === 'no-fee') return 'None';
  if (item.fee.status === 'unknown') return 'Not listed';
  if (item.fee.amountCents !== undefined && item.fee.currency) {
    const currency = /^[A-Z]{3}$/u.test(item.fee.currency) ? item.fee.currency : undefined;
    if (currency) {
      return new Intl.NumberFormat('en', { style: 'currency', currency }).format(item.fee.amountCents / 100);
    }
    return `${item.fee.currency}${(item.fee.amountCents / 100).toFixed(2)}`;
  }
  return 'Listed on the call';
}

function RailRows({ items }: { items: OpportunityBrowseProjection[] }) {
  return (
    <div>
      {items.map((item, index) => (
        <div key={item.id} className={`${styles.railRow} ${index === 0 ? styles.railRowActive : ''}`}>
          <p className={styles.railKicker}>{typeLabel(item.type)} — entry fee: {feeLabel(item)}</p>
          <p className={styles.railTitle}>{item.title}</p>
          <p className={styles.railMeta}>Due {deadlineLabel(item.deadline)}{item.organizationName ? ` · ${item.organizationName}` : ''}</p>
        </div>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const signedIn = Boolean(session);
  let opportunities: OpportunityBrowseProjection[] = [];
  let unavailable = false;

  try {
    opportunities = (await getOpportunityRepository().browse(
      { openNow: true, sort: 'soonest-deadline', limit: 5 },
      session?.account.id ? { accountId: session.account.id } : undefined,
    )).items;
  } catch {
    unavailable = true;
  }

  const browseHref = signedIn ? '/home' : '/opportunities';

  return (
    <PublicSiteShell current="Home">
      <main id="main-content" className={styles.main}>
        <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Missa', url: absoluteUrl('/'), description: 'Creative Opportunities with their source and limits kept visible.', potentialAction: { '@type': 'SearchAction', target: `${absoluteUrl('/opportunities')}?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }} />

        {/* classification ticker */}
        <div className={styles.tickerBand} aria-label="Kinds of Opportunities in the index">
          <div className={styles.tickerWindow}>
            <div className={styles.tickerTrack}>
              <span className={styles.tickerRun}>{OPPORTUNITY_TYPES.join(' · ')} · </span>
              <span className={styles.tickerRun} aria-hidden="true">{OPPORTUNITY_TYPES.join(' · ')} · </span>
            </div>
          </div>
          <span className={styles.tickerCell}>An index, not a feed</span>
        </div>

        {/* the ledger */}
        <section className={styles.ledger} aria-labelledby="home-heading">
          <div className={styles.ledgerLeft}>
            <p className={`${styles.indexNo} ${styles.rise}`}>№ 001 — The opportunity index for artists</p>
            <h1 id="home-heading" className={`${styles.display} ${styles.rise} ${styles.d1}`}>
              Find your next<br />
              <em>opportunity</em><span className={styles.tick} aria-hidden="true" />
            </h1>
            <div className={`${styles.rule} ${styles.ruleDraw}`} aria-hidden="true" />
            <div className={`${styles.ledgerFoot} ${styles.rise} ${styles.d3}`}>
              <p className={styles.sub}>Grants, residencies, fellowships, commissions, and open calls—filed with their deadlines, fees, eligibility, and sources kept visible.</p>
              <div className={styles.actions}>
                <Link href={browseHref} className={styles.primary}>{signedIn ? 'Open Missa' : 'Browse the index'}</Link>
                <Link href="/methodology" className={styles.quiet}>How Missa works</Link>
              </div>
            </div>
            <p className={`${styles.microNote} ${styles.rise} ${styles.d4}`}>The official call stays one click away</p>
          </div>

          <aside className={styles.rail} aria-label="Currently in the index">
            <div className={styles.railHead}>
              <span>Today in the index</span>
              <span className={styles.pulse} aria-hidden="true" />
            </div>
            {opportunities.length ? (
              <div className={styles.railWindow}>
                <div className={styles.railLoop}>
                  <RailRows items={opportunities} />
                  <div aria-hidden="true"><RailRows items={opportunities} /></div>
                </div>
              </div>
            ) : (
              <div className={styles.railStatic}>
                <div className={styles.railRow}><p className={styles.railKicker}>Deadline</p><p className={styles.railTitle}>Kept with its timezone</p></div>
                <div className={styles.railRow}><p className={styles.railKicker}>Entry fee</p><p className={styles.railTitle}>Stated before you commit time</p></div>
                <div className={styles.railRow}><p className={styles.railKicker}>Eligibility</p><p className={styles.railTitle}>Plain, or marked unknown</p></div>
                <div className={styles.railRow}><p className={styles.railKicker}>Source</p><p className={styles.railTitle}>The official call, linked</p></div>
              </div>
            )}
            <div className={styles.railFoot}>
              <span>{opportunities.length ? 'Live entries' : 'What every row keeps'}</span>
              <span>Every row keeps its source</span>
            </div>
          </aside>
        </section>

        {/* statement with margin notes */}
        <section className={styles.statement} aria-labelledby="statement-heading">
          <div className={styles.statementBody}>
            <h2 id="statement-heading">Good opportunities are hard enough to win. They should not be <em>hard to find.</em></h2>
            <p>Calls are scattered across newsletters, PDFs, institutional sites, portals, and word of mouth. Missa files each one with its facts—not its promotion—in front of you.</p>
          </div>
          <div className={styles.marginNotes} aria-hidden="true">
            <p className={styles.file1}>[ Newsletters <em>→ filed</em> ]</p>
            <p className={styles.file2}>[ Guideline PDFs <em>→ filed</em> ]</p>
            <p className={styles.file3}>[ Word of mouth <em>→ filed</em> ]</p>
          </div>
        </section>

        {/* the ledger table — live records */}
        <section className={styles.tableSection} aria-labelledby="index-heading">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.indexNo}>№ 002 — Published Opportunities</p>
              <h2 id="index-heading">See what is worth your time.</h2>
            </div>
            <p className={styles.sectionAside}>A small current set—not fabricated records, not a ranking.</p>
          </div>
          {opportunities.length ? (
            <table className={styles.ledgerTable}>
              <thead>
                <tr><th scope="col">№</th><th scope="col">Opportunity</th><th scope="col">Type</th><th scope="col">Deadline</th><th scope="col">Entry fee</th><th scope="col" className={styles.thEnd}>Record</th></tr>
              </thead>
              <tbody>
                {opportunities.map((item, index) => (
                  <tr key={item.id}>
                    <td className={styles.cellMono}>{String(index + 1).padStart(3, '0')}</td>
                    <td className={styles.cellTitle}><Link href={`/opportunities/${item.slug}`}>{item.title}</Link>{item.organizationName ? <span className={styles.cellOrg}>{item.organizationName}</span> : null}</td>
                    <td className={styles.cellMono}>{typeLabel(item.type)}</td>
                    <td className={styles.cellMono}>{deadlineLabel(item.deadline)}</td>
                    <td className={`${styles.cellMono} ${item.fee.status === 'no-fee' ? styles.cellGood : ''}`}>{feeLabel(item)}</td>
                    <td className={`${styles.cellMono} ${styles.cellEnd}`}><Link href={`/opportunities/${item.slug}`}>View listing</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState} role={unavailable ? 'alert' : 'status'}>
              <BookOpen aria-hidden="true" />
              <h3>{unavailable ? 'Opportunities are temporarily unavailable' : 'No published Opportunities to show here'}</h3>
              <p>{unavailable ? 'You can still read Guides or learn how Missa works. Try the Opportunity library again later.' : 'Missa is not substituting sample records. Read a Guide or return when published records are available.'}</p>
              <div><Link href="/guides">Read Guides</Link><Link href="/opportunities">Open the library</Link></div>
            </div>
          )}
          <Link href="/opportunities" className={styles.tableMore}><span>Browse the full index</span><ArrowRight aria-hidden="true" /></Link>
        </section>

        {/* method A–D */}
        <section className={styles.method} aria-labelledby="method-heading">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.indexNo}>№ 003 — Method</p>
              <h2 id="method-heading">Decide, prepare, and remember.</h2>
            </div>
          </div>
          <ol className={styles.methodGrid}>
            <li><span className={styles.methodLetter} aria-hidden="true">A</span><h3>Read the facts</h3><p>Eligibility, geography, fee, deadline, and Opportunity type stay separate—never blended into a pitch.</p></li>
            <li><span className={styles.methodLetter} aria-hidden="true">B</span><h3>Save your decision</h3><p>Keep the Opportunity and your private next action together in Tracker.</p></li>
            <li><span className={styles.methodLetter} aria-hidden="true">C</span><h3>Prepare from the call</h3><p>Use the official requirements to decide which Work and materials belong.</p></li>
            <li><span className={styles.methodLetter} aria-hidden="true">D</span><h3>Keep the record</h3><p>Submission receipts, decisions, and obligations stay attached to the right Work.</p></li>
          </ol>
        </section>

        {/* the record card */}
        <section className={styles.evidence} aria-labelledby="evidence-heading">
          <div className={styles.evidenceBody}>
            <p className={styles.indexNo}>№ 004 — Evidence</p>
            <h2 id="evidence-heading">Every listing keeps its source.</h2>
            <p>Missa does not ask you to trust a summary without evidence. Unknowns stay visible—missing information is never turned into reassurance.</p>
            <Link href="/methodology" className={styles.evidenceLink}>Read the methodology <ArrowRight aria-hidden="true" /></Link>
          </div>
          <div className={styles.recordWrap}>
            <div className={styles.record} aria-label="What each record keeps">
              <div className={styles.recordHead}>Record — source &amp; verification</div>
              <dl>
                <div><dt>Official call</dt><dd>Linked, never paraphrased away</dd></div>
                <div><dt>Timezone</dt><dd>Kept with the deadline</dd></div>
                <div><dt>Unknowns</dt><dd>Shown as unknown</dd></div>
                <div><dt>Conflicts</dt><dd>Surfaced, not smoothed over</dd></div>
              </dl>
              <span className={styles.stamp} aria-hidden="true">Official call linked</span>
            </div>
          </div>
        </section>

        {/* the slab */}
        <section className={styles.slab} aria-labelledby="cta-heading">
          <h2 id="cta-heading">Make less time for searching.<br /><em>Keep more time for the work.</em></h2>
          <div className={styles.slabActions}>
            <Link href={browseHref} className={styles.slabPrimary}>{signedIn ? 'Open Missa' : 'Browse the index'}</Link>
            {!signedIn ? <Link href="/signup" className={styles.slabQuiet}>Create an account</Link> : null}
            <p className={styles.slabNote}>No noise · no scores · an index</p>
          </div>
        </section>
      </main>
    </PublicSiteShell>
  );
}
