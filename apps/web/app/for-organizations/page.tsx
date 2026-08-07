import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  CircleCheck,
  Clock3,
  Globe2,
  Inbox,
  Mail,
  Users,
} from "lucide-react";
import { OrgProductShowcase } from "./showcase";
import styles from "./org.module.css";
import { JsonLd, absoluteUrl, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Submission management for organizations',
  description: 'Publish open calls, receive applications, review together, and send decisions from one clear Missa workspace.',
  path: '/for-organizations',
});

const proofPoints = [
  { label: "Publish", copy: "A call your audience can understand", icon: Globe2 },
  { label: "Receive", copy: "Every application in one queue", icon: Inbox },
  { label: "Review", copy: "A shared room for your team", icon: Users },
  { label: "Decide", copy: "Clear outcomes, sent on time", icon: CircleCheck },
];

const faqs = [
  {
    question: "Where do applicants submit?",
    answer:
      "Wherever they discover your call: your site, Missa, a partner newsletter, or a direct link. Every path opens the same branded submission portal.",
  },
  {
    question: "Can our team review together?",
    answer:
      "Yes. Assign reviewers, keep notes with the application, compare scores, and move a submission from in review to shortlisted or decision ready without leaving the workspace.",
  },
  {
    question: "Do we need a technical implementation?",
    answer:
      "No implementation project is required to launch a call. Start with your opportunity, set the questions and requirements, and share the application link.",
  },
  {
    question: "Does Missa make decisions for us?",
    answer:
      "No. Missa keeps the process clear and the record complete. Your organization and reviewers make every decision.",
  },
];

function MissaLogo() {
  return (
    <span className={styles.logo} aria-label="Missa">
      M I S S A
    </span>
  );
}

export default function ForOrganizationsPage() {
  return (
    <main className={styles.page}>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Missa',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'Submission management for organizations running open calls.',
        url: absoluteUrl('/for-organizations'),
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      }} />
      <header className={styles.header}>
        <Link href="/" aria-label="Missa home" className={styles.logoLink}>
          <MissaLogo />
          <span className={styles.logoDivider}>/</span>
          <span className={styles.logoContext}>For organizations</span>
        </Link>

        <nav className={styles.nav} aria-label="Organization navigation">
          <Link href="/">For creators</Link>
          <a href="#platform">Platform</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className={styles.headerActions}>
          <Link href="/login">Log in</Link>
          <Link href="/login?mode=signup" className={styles.headerButton}>
            Start a call <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
        </div>

        <details className={styles.mobileMenu}>
          <summary>
            Menu <ChevronDown aria-hidden="true" size={15} />
          </summary>
          <div>
            <a href="#platform">Platform</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link href="/login">Log in</Link>
            <Link href="/login?mode=signup">Start a call</Link>
          </div>
        </details>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Submission infrastructure for open calls</p>
          <h1>Your opportunity deserves a better way in.</h1>
          <p className={styles.heroLead}>
            Missa puts your submission portal where applicants already are, then
            carries every application into one calm review workspace.
          </p>
          <div className={styles.heroActions}>
            <Link href="/login?mode=signup" className={styles.primaryButton}>
              Publish your first call <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <a href="#platform" className={styles.textButton}>
              See the platform <ArrowRight aria-hidden="true" size={15} />
            </a>
            <Link href="/" className={styles.textButton}>
              See the creator side <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>
          <div className={styles.heroNote}>
            <Clock3 aria-hidden="true" size={16} />
            <span>Launch a call in minutes, not a procurement cycle.</span>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <Image
            src="/media/missa-org-gallery.png"
            alt="A program manager reviewing materials in a contemporary gallery"
            fill
            priority
            sizes="(max-width: 960px) 100vw, 52vw"
          />
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.callPreview}>
            <div className={styles.previewTopline}>
              <span>Open call</span>
              <span className={styles.previewLive}>Live</span>
            </div>
            <p className={styles.previewOrg}>Northline Arts Foundation</p>
            <h2>2027 Studio Residency</h2>
            <p className={styles.previewCopy}>
              A focused place for artists to make new work, together.
            </p>
            <dl className={styles.previewMeta}>
              <div>
                <dt>Deadline</dt>
                <dd>Aug 28, 2026</dd>
              </div>
              <div>
                <dt>Fee</dt>
                <dd>$25 USD</dd>
              </div>
            </dl>
            <button type="button" className={styles.previewButton}>
              Apply on Missa <ArrowRight aria-hidden="true" size={14} />
            </button>
            <span className={styles.previewFoot}>Your call, your voice.</span>
          </div>
        </div>
      </section>

      <section className={styles.proofRail} aria-label="Missa workflow">
        {proofPoints.map(({ label, copy, icon: Icon }, index) => (
          <div className={styles.proofPoint} key={label}>
            <span className={styles.proofIndex}>0{index + 1}</span>
            <Icon aria-hidden="true" size={18} strokeWidth={1.7} />
            <div>
              <strong>{label}</strong>
              <span>{copy}</span>
            </div>
          </div>
        ))}
      </section>

      <section className={styles.platformSection} id="platform">
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>One connected system</p>
          <h2>Everything your team needs to run a call.</h2>
          <p>
            The public experience stays clear for applicants. The operational
            work stays together for your team.
          </p>
        </div>

        <OrgProductShowcase />
      </section>

      <section className={styles.flowSection} id="how-it-works">
        <div className={styles.flowIntro}>
          <div>
            <p className={styles.kicker}>The working model</p>
            <h2>From publish to decision, nothing gets lost.</h2>
          </div>
          <p>
            No scattered attachments. No reviewer spreadsheet that only one
            person understands. One application record from first click to
            final email.
          </p>
        </div>

        <div className={styles.flowGrid}>
          <article>
            <span>01</span>
            <h3>Meet applicants in context</h3>
            <p>
              Share one branded link from your site, Missa, a partner, or your
              newsletter.
            </p>
            <div className={styles.flowMiniCard}>
              <Globe2 aria-hidden="true" size={17} />
              <div>
                <strong>Northline Arts</strong>
                <span>2027 Studio Residency</span>
              </div>
              <ArrowUpRight aria-hidden="true" size={15} />
            </div>
          </article>
          <article>
            <span>02</span>
            <h3>Give every application a home</h3>
            <p>
              Requirements, files, reviewer notes, and status stay attached to
              the same submission.
            </p>
            <div className={styles.flowMiniCard}>
              <Inbox aria-hidden="true" size={17} />
              <div>
                <strong>132 submissions</strong>
                <span>52 in review · 18 shortlisted</span>
              </div>
              <CircleCheck aria-hidden="true" size={15} />
            </div>
          </article>
          <article>
            <span>03</span>
            <h3>Move decisions forward</h3>
            <p>
              Assign reviewers, compare work, and notify applicants when your
              team is ready.
            </p>
            <div className={styles.flowMiniCard}>
              <Mail aria-hidden="true" size={17} />
              <div>
                <strong>Decision ready</strong>
                <span>12 emails queued for Aug 15</span>
              </div>
              <ArrowRight aria-hidden="true" size={15} />
            </div>
          </article>
        </div>
      </section>

      <section className={styles.valueSection} id="pricing">
        <div className={styles.valueHeader}>
          <p className={styles.kicker}>Built for programs, not procurement</p>
          <h2>A better system for the work behind the work.</h2>
          <p>
            Missa keeps the first step small and the full process connected.
            Start with one call, then grow with your program.
          </p>
        </div>
        <div className={styles.valueGrid}>
          <div className={styles.valueLead}>
            <span className={styles.valueNumber}>01</span>
            <h3>Simple to start</h3>
            <p>Publish your first opportunity without a long implementation project.</p>
            <Link href="/login?mode=signup" className={styles.textButton}>
              Start a call <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>
          <div className={styles.valueLead}>
            <span className={styles.valueNumber}>02</span>
            <h3>Clear for applicants</h3>
            <p>Keep requirements and next steps readable from the first click.</p>
            <a href="#platform" className={styles.textButton}>
              See the applicant view <ArrowRight aria-hidden="true" size={15} />
            </a>
          </div>
          <div className={styles.valueLead}>
            <span className={styles.valueNumber}>03</span>
            <h3>Useful for teams</h3>
            <p>Review together in one workspace with the context still attached.</p>
            <a href="#how-it-works" className={styles.textButton}>
              See the workflow <ArrowRight aria-hidden="true" size={15} />
            </a>
          </div>
        </div>
        <div className={styles.comparison}>
          <div>
            <span>Setup</span>
            <strong>Live in minutes</strong>
            <small>No implementation project.</small>
          </div>
          <div>
            <span>Applicant experience</span>
            <strong>Apply where you find the call</strong>
            <small>One branded path.</small>
          </div>
          <div>
            <span>Review</span>
            <strong>One working room</strong>
            <small>Decisions stay connected.</small>
          </div>
          <div>
            <span>Pricing</span>
            <strong>Transparent by design</strong>
            <small>No enterprise maze.</small>
          </div>
        </div>
      </section>

      <section className={styles.faqSection} id="faq">
        <div className={styles.faqIntro}>
          <p className={styles.kicker}>Questions, answered</p>
          <h2>Make the next call easier to run.</h2>
          <p>
            If you are moving from forms, inboxes, or a portal that asks too
            much of your team, start here.
          </p>
        </div>
        <div className={styles.faqList}>
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>
                <span>{faq.question}</span>
                <ChevronDown aria-hidden="true" size={18} />
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.kicker}>Put the submission portal where the people are</p>
          <h2>Run your next call on Missa.</h2>
          <p>Reach the right applicants and give your team a clearer way to decide.</p>
        </div>
            <div className={styles.finalActions}>
          <Link href="/login?mode=signup" className={styles.primaryButton}>
            Start a call <ArrowRight aria-hidden="true" size={17} />
          </Link>
          <a href="mailto:hello@missa.com" className={styles.secondaryButton}>
            Talk to us <ArrowUpRight aria-hidden="true" size={16} />
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <MissaLogo />
          <p>The connected platform for opportunity discovery and submission.</p>
          <small>© 2026 Missa</small>
        </div>
        <div className={styles.footerColumn}>
          <strong>For organizations</strong>
          <a href="#platform">Platform</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className={styles.footerColumn}>
          <strong>For applicants</strong>
          <Link href="/opportunities-preview">Find opportunities</Link>
          <Link href="/signup">Create a profile</Link>
          <Link href="/login">Sign in</Link>
        </div>
        <div className={styles.footerColumn}>
          <strong>Company</strong>
          <a href="#faq">Help center</a>
          <a href="mailto:hello@missa.com">Contact</a>
          <a href="#">Privacy</a>
        </div>
      </footer>
    </main>
  );
}
