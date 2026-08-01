import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowDownRight, ArrowRight, Check } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { FinalVideo } from '@/components/final-video';
import { HeroVideo } from '@/components/hero-video';
import styles from './home.module.css';

const VIDEO_URL = '/media/missa-bosphorus.mp4';
const VIDEO_POSTER = '/media/missa-bosphorus-poster.jpg';
const VIDEO_CREDIT_URL =
  'https://www.pexels.com/video/seagulls-soaring-over-bosphorus-strait-at-sunset-34942550/';

const features = [
  {
    number: '01',
    eyebrow: 'Find opportunities',
    title: 'Start with the source.',
    copy: 'Browse grants, residencies, journals, festivals, and awards with the deadline, fee, and requirements in view.',
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
    eyebrow: 'Track submissions',
    title: 'Keep every deadline in view.',
    copy: 'Save opportunities and move them from interested to submitted, in review, and outcome.',
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
    eyebrow: 'Stay informed',
    title: 'Know when something changes.',
    copy: 'Get updates when a deadline moves, a call closes, or a response takes longer than expected.',
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
  const primaryLabel = session ? 'Open opportunities' : 'Get started';

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
            <a href="#how-it-works">For people sending work</a>
            <a href="#for-organizations">For organizations</a>
            <a href="#why-missa">Tracker</a>
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
            <span /> For people who send work
          </p>
          <h1>
            Find opportunities.
            <br />
            <em>Track what happens next.</em>
          </h1>
          <p className={styles.heroCopy}>
            Missa helps people find where to send their work and keep track of every submission.
            Organizations get a clearer pipeline from open call to decision.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href={primaryHref}>
              {primaryLabel}
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <a className={styles.textButton} href="#for-organizations">
              For organizations
            </a>
          </div>
          {!session && <p className={styles.freeNote}>Free to start. No card required.</p>}
        </div>

        <a className={styles.videoCredit} href={VIDEO_CREDIT_URL} target="_blank" rel="noreferrer">
          Film by Sururi Ballıdağ Director · Pexels
        </a>
      </section>

      <section className={styles.featureSection} id="how-it-works">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionLabel}>For people sending work</p>
          <h2>
            Find the right opportunity.
            <br />
            <em>Keep your next step clear.</em>
          </h2>
          <p>
            One place for the opportunities you are considering and the submissions you have sent.
          </p>
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
          <p className={styles.sectionLabel}>Tracker</p>
          <h2>
            Know what you sent.
            <br />
            <em>Know what to do next.</em>
          </h2>
          <p>
            Give every submission a place, a deadline, and a next step.
          </p>
          <Link href={primaryHref}>
            Open the tracker <ArrowRight aria-hidden="true" size={17} />
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
            <span>across 5 open calls</span>
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
              <em className={styles.accepted}>In review</em>
            </div>
          </div>
          <div className={styles.demoFooter}>
            <Check aria-hidden="true" size={15} /> Last checked moments ago
          </div>
          <div className={styles.demoDisclosure}>
            <p><strong>Example view.</strong> Your tracker shows the opportunities you save.</p>
            <Link href={primaryHref}>Open the tracker <ArrowRight aria-hidden="true" size={15} /></Link>
          </div>
        </div>
      </section>

      <section className={styles.organizationSection} id="for-organizations">
        <div className={styles.orgHalftone} aria-hidden="true" />
        <div className={styles.organizationCopy}>
          <p className={styles.sectionLabel}>For organizations</p>
          <h2>
            A clearer pipeline.
            <br />
            <em>From call to decision.</em>
          </h2>
          <p>
            Missa gives organizations one place to publish opportunities, collect submissions,
            review work, and send decisions.
          </p>
          <Link href="/workspace">
            Open the workspace <ArrowRight aria-hidden="true" size={17} />
          </Link>
          <div className={styles.organizationNextStep}>
            <p className={styles.organizationNextStepLabel}>Workspace</p>
            <p>
              A more supportive way to move work from submission to decision.
            </p>
            <div className={styles.organizationActions}>
              <Link href="/login?mode=signup">Create an account</Link>
              <Link href="/opportunities">See opportunities</Link>
            </div>
          </div>
        </div>
        <div className={styles.orgList}>
          {['Publish a call', 'Collect submissions', 'Review together', 'Send decisions', 'Keep the record'].map(
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
        <FinalVideo videoUrl={VIDEO_URL} poster={VIDEO_POSTER} />
        <div className={styles.finalContent}>
          <p>Start with the next opportunity.</p>
          <h2>
            Find it.
            <br />
            <em>Keep track.</em>
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
          <p>A simple place to find, send, and track creative work.</p>
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
            <Link href={session ? '/opportunities' : '/login'}>{session ? 'Open opportunities' : 'Log in'}</Link>
            <Link href={primaryHref}>{primaryLabel}</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Missa</span>
          <span>Built for people who keep sending.</span>
          <a href={VIDEO_CREDIT_URL} target="_blank" rel="noreferrer">Film credit</a>
        </div>
      </footer>
    </main>
  );
}
