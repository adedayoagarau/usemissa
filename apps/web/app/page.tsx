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
    eyebrow: 'Find it',
    title: 'Find opportunities that fit.',
    copy: 'Search grants, residencies, journals, festivals, and more. Follow the original source for the details.',
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
    title: 'Keep your materials ready.',
    copy: 'Save your work, bio, images, and common answers so the next application starts with what you already have.',
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
    title: 'See what happens next.',
    copy: 'Track deadlines, submissions, and replies in one place, even when the opportunity lives somewhere else.',
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
            <a href="#why-missa">Your tracker</a>
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
            Find it. Send it.
            <br />
            <em>Keep track.</em>
          </h1>
          <p className={styles.heroCopy}>
            Find open calls, prepare your submission, and see what happens next. Missa keeps it all
            together.
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
          {!session && <p className={styles.freeNote}>Free to start. No card required.</p>}
        </div>

        <div className={styles.heroNote}>
          <span>Find it. Send it. Follow up.</span>
          <p>One place for the work you send.</p>
        </div>

        <a className={styles.videoCredit} href={VIDEO_CREDIT_URL} target="_blank" rel="noreferrer">
          Film by Sururi Ballıdağ Director · Pexels
        </a>
      </section>

      <section className={styles.promiseBar} aria-label="Missa promises">
        <div>
          <span>01</span>
          <p>Open calls from the source</p>
        </div>
        <div>
          <span>02</span>
          <p>Your work stays in your account</p>
        </div>
        <div>
          <span>03</span>
          <p>Free to start</p>
        </div>
      </section>

      <section className={styles.featureSection} id="how-it-works">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionLabel}>What Missa helps you do</p>
          <h2>
            Find the right call.
            <br />
            <em>Send a stronger submission.</em>
          </h2>
          <p>
            Keep opportunities, materials, and deadlines together so you can spend less time
            searching and more time making.
          </p>
        </div>

        <div className={styles.featureProof} aria-label="Sample Missa workflow">
          <div className={styles.featureProofLead}>
            <span className={styles.sectionLabel}>From call to outcome</span>
            <p>A clear path for every submission.</p>
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
          <p className={styles.sectionLabel}>Your submission tracker</p>
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
              <em className={styles.accepted}>Accepted</em>
            </div>
          </div>
          <div className={styles.demoFooter}>
            <Check aria-hidden="true" size={15} /> Last checked moments ago
          </div>
          <div className={styles.demoDisclosure}>
            <p>
              <strong>Example view.</strong> These rows are illustrative. Your tracker shows the
              opportunities you save.
            </p>
            <div className={styles.demoTrust} aria-label="Tracker details">
              <div>
                <span>Source</span>
                <p>Each opportunity keeps its original source link.</p>
              </div>
              <div>
                <span>Account</span>
                <p>Your tracker is tied to your account.</p>
              </div>
              <div>
                <span>Start</span>
                <p>No payment details are needed to get started.</p>
              </div>
            </div>
            <Link href={primaryHref}>
              Open the tracker <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.organizationSection} id="for-organizations">
        <div className={styles.orgHalftone} aria-hidden="true" />
        <div className={styles.organizationCopy}>
          <p className={styles.sectionLabel}>For organizations</p>
          <h2>
            Run your open call.
            <br />
            <em>In one place.</em>
          </h2>
          <p>
            Publish opportunities, collect submissions, review work, and send decisions without
            piecing together different tools.
          </p>
          <Link href="/workspace">
            Open the workspace <ArrowRight aria-hidden="true" size={17} />
          </Link>
          <div className={styles.organizationNextStep}>
            <p className={styles.organizationNextStepLabel}>Starting a new organization</p>
            <p>
              Create an account to publish your first call.
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
          <p>Good work is waiting to be found.</p>
          <h2>
            Find your next opportunity.
            <br />
            <em>Keep moving.</em>
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
            <Link href={session ? '/opportunities' : '/login'}>{session ? 'Open Missa' : 'Log in'}</Link>
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
