import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowDownRight, ArrowRight, Check } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { HeroVideo } from '@/components/hero-video';
import styles from './home.module.css';

const VIDEO_URL = '/media/missa-bosphorus.mp4';
const VIDEO_POSTER = '/media/missa-bosphorus-poster.jpg';
const VIDEO_CREDIT_URL =
  'https://www.pexels.com/video/seagulls-soaring-over-bosphorus-strait-at-sunset-34942550/';

const features = [
  {
    number: '01',
    eyebrow: 'Find it',
    title: 'Open calls, without the scavenger hunt.',
    copy: 'Magazines, grants, residencies, festivals, and more — gathered in one place and checked against the source.',
    art: (
      <div className={styles.radarArt} aria-hidden="true">
        <span />
        <span />
        <span />
        <i />
      </div>
    ),
  },
  {
    number: '02',
    eyebrow: 'Send it',
    title: 'Your work stays ready to go.',
    copy: 'Keep works, files, bios, and the answers you use often close at hand. Start a submission without starting from zero.',
    art: (
      <div className={styles.fileArt} aria-hidden="true">
        <span className={styles.fileBack} />
        <span className={styles.fileFront}>
          <i />
          <i />
          <i />
        </span>
      </div>
    ),
  },
  {
    number: '03',
    eyebrow: 'Follow it',
    title: 'Know where every piece stands.',
    copy: 'Deadlines, submissions, replies, and next steps live in one calm tracker — even when the opportunity lives somewhere else.',
    art: (
      <div className={styles.routeArt} aria-hidden="true">
        <span />
        <span />
        <span />
        <i />
      </div>
    ),
  },
];

function MissaMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`${styles.mark} ${inverse ? styles.markInverse : ''}`} aria-hidden="true">
      <span>M</span>
      <i />
    </span>
  );
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const primaryHref = session ? '/opportunities' : '/login?mode=signup';
  const primaryLabel = session ? 'Open Missa' : 'Start for free';

  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <HeroVideo videoUrl={VIDEO_URL} poster={VIDEO_POSTER} />

        <header className={styles.header}>
          <Link className={styles.brand} href="/" aria-label="Missa home">
            <MissaMark />
            <span>missa</span>
          </Link>

          <nav className={styles.nav} aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#for-organizations">For organizations</a>
            <a href="#why-missa">Why Missa</a>
          </nav>

          <div className={styles.headerActions}>
            {!session && (
              <Link className={styles.loginLink} href="/login">
                Log in
              </Link>
            )}
            <Link className={styles.navCta} href={primaryHref}>
              {primaryLabel}
              <ArrowDownRight aria-hidden="true" size={16} strokeWidth={1.8} />
            </Link>
          </div>
        </header>

        <div className={styles.heroPanel} />
        <div className={styles.heroContent}>
          <p className={styles.kicker}>
            <span /> The home for your submissions
          </p>
          <h1>
            Send your work
            <br />
            <em>where it belongs.</em>
          </h1>
          <p className={styles.heroCopy}>
            Find opportunities that fit. Keep every deadline in view. Track what you sent and what
            comes next — all in one place.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href={primaryHref}>
              {primaryLabel}
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <a className={styles.textButton} href="#how-it-works">
              See how it works
            </a>
          </div>
          {!session && <p className={styles.freeNote}>Free for creatives. No card required.</p>}
        </div>

        <div className={styles.heroNote}>
          <span>Keep looking forward.</span>
          <p>Missa keeps watch over the details behind you.</p>
        </div>

        <a className={styles.videoCredit} href={VIDEO_CREDIT_URL} target="_blank" rel="noreferrer">
          Film by Sururi Ballıdağ Director · Pexels
        </a>
      </section>

      <section className={styles.promiseBar} aria-label="Missa promises">
        <div>
          <span>01</span>
          <p>Checked against the source</p>
        </div>
        <div>
          <span>02</span>
          <p>Your tracker stays private</p>
        </div>
        <div>
          <span>03</span>
          <p>Free for creatives, always</p>
        </div>
      </section>

      <section className={styles.featureSection} id="how-it-works">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionLabel}>The whole way through</p>
          <h2>
            Less admin.
            <br />
            <em>More momentum.</em>
          </h2>
          <p>
            Missa brings discovery and tracking together, so a promising open call never turns into
            twelve tabs and a spreadsheet you are afraid to touch.
          </p>
        </div>

        <div className={styles.featureProof} aria-label="Sample Missa workflow">
          <div className={styles.featureProofLead}>
            <span className={styles.sectionLabel}>See it move</span>
            <p>A single thread from the first find to the reply that comes next.</p>
          </div>
          <div className={styles.featureProofRail}>
            <div className={styles.featureProofItem}>
              <span>01</span>
              <p>Saved</p>
              <small>Northbank Residency</small>
            </div>
            <div className={styles.featureProofItem}>
              <span>02</span>
              <p>Submitted</p>
              <small>The Quiet Between</small>
            </div>
            <div className={`${styles.featureProofItem} ${styles.featureProofItemFinal}`}>
              <span>03</span>
              <p>Accepted</p>
              <small>Open City Prize</small>
            </div>
          </div>
        </div>

        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article className={styles.featureCard} key={feature.number}>
              <div className={styles.featureTopline}>
                <span>{feature.number}</span>
                <p>{feature.eyebrow}</p>
                <span className={styles.featureSignal} aria-hidden="true" />
              </div>
              <div className={styles.featureArt}>{feature.art}</div>
              <h3>{feature.title}</h3>
              <p className={styles.featureCopy}>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.trackerSection} id="why-missa">
        <div className={styles.trackerStatement}>
          <p className={styles.sectionLabel}>A clearer view</p>
          <h2>
            Your work moves in
            <br />
            more than one direction.
            <br />
            <em>Your tracker should too.</em>
          </h2>
          <p>
            See each work across every place you sent it. When one answer changes what can happen
            next, Missa helps you keep the thread.
          </p>
          <Link href={primaryHref}>
            Build your tracker <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>

        <div className={styles.trackerDemo} aria-label="Example submission tracker">
          <div className={styles.demoHeader}>
            <div>
              <MissaMark />
              <span>Tracker</span>
            </div>
            <p>All submissions</p>
          </div>
          <div className={styles.demoTabs}>
            <span className={styles.activeTab}>Pipeline</span>
            <span>Calendar</span>
            <span>Works</span>
          </div>
          <div className={styles.demoSummary}>
            <p>In progress</p>
            <strong>08</strong>
            <span>across 5 opportunities</span>
          </div>
          <div className={styles.demoRows}>
            <div>
              <span className={styles.workIcon}>T</span>
              <p><strong>The Quiet Between</strong><small>River Teeth Journal</small></p>
              <em>In review</em>
            </div>
            <div>
              <span className={styles.workIcon}>F</span>
              <p><strong>Field Notes</strong><small>Northbank Residency</small></p>
              <em>Submitted</em>
            </div>
            <div>
              <span className={styles.workIcon}>A</span>
              <p><strong>After the Rain</strong><small>Open City Prize</small></p>
              <em className={styles.accepted}>Accepted</em>
            </div>
          </div>
          <div className={styles.demoFooter}>
            <Check aria-hidden="true" size={15} /> Last checked moments ago
          </div>
        </div>
      </section>

      <section className={styles.organizationSection} id="for-organizations">
        <div className={styles.orgHalftone} aria-hidden="true" />
        <div className={styles.organizationCopy}>
          <p className={styles.sectionLabel}>For organizations</p>
          <h2>
            Run the open call.
            <br />
            <em>Not the obstacle course.</em>
          </h2>
          <p>
            Create opportunities, receive work, coordinate reviews, send decisions, and manage what
            happens after yes — from one thoughtful workspace.
          </p>
          <Link href="/login">
            Bring your next call to Missa <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
        <div className={styles.orgList}>
          {['Publish your opportunity', 'Receive submissions', 'Review together', 'Send decisions', 'Deliver what comes next'].map(
            (item, index) => (
              <div key={item}>
                <span>0{index + 1}</span>
                <p>{item}</p>
                <ArrowDownRight aria-hidden="true" size={19} />
              </div>
            ),
          )}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.finalMedia} aria-hidden="true">
          <video autoPlay muted loop playsInline preload="none" poster={VIDEO_POSTER}>
            <source src={VIDEO_URL} type="video/mp4" />
          </video>
          <div className={styles.halftone} />
        </div>
        <div className={styles.finalContent}>
          <p>There is good work waiting to be sent.</p>
          <h2>
            Find what is open.
            <br />
            <em>Keep going.</em>
          </h2>
          <Link href={primaryHref}>
            {primaryLabel} <ArrowRight aria-hidden="true" size={19} />
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLead}>
          <Link className={styles.brand} href="/">
            <MissaMark inverse />
            <span>missa</span>
          </Link>
          <p>A home for the work you are ready to share.</p>
        </div>
        <div className={styles.footerLinks}>
          <div>
            <span>Explore</span>
            <a href="#how-it-works">How it works</a>
            <a href="#for-organizations">For organizations</a>
            <Link href="/opportunities">Opportunities</Link>
          </div>
          <div>
            <span>Account</span>
            <Link href={session ? '/opportunities' : '/login'}>{session ? 'Open Missa' : 'Log in'}</Link>
            <Link href={primaryHref}>{primaryLabel}</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Missa</span>
          <span>Made for the people who keep sending.</span>
          <a href={VIDEO_CREDIT_URL} target="_blank" rel="noreferrer">Film credit</a>
        </div>
      </footer>
    </main>
  );
}
