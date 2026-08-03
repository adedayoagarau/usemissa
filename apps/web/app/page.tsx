import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  CalendarDays,
  Menu,
  MoveRight,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { OpportunityBrowseProjection } from '@missa/radar-engine';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { MissaWordmark } from '@/components/missa-wordmark';
import styles from './home.module.css';

const opportunityImages = [
  '/media/home/opportunity-architecture.webp',
  '/media/home/opportunity-mountains.webp',
  '/media/home/opportunity-dance.webp',
];

function browseHref(isSignedIn: boolean, selectedId?: string) {
  const path = isSignedIn ? '/opportunities' : '/opportunities-preview';
  return selectedId ? path + '?selected=' + encodeURIComponent(selectedId) : path;
}

function profileHref(isSignedIn: boolean) {
  return isSignedIn ? '/profile' : '/signup?next=%2Fprofile';
}

function workspaceHref(isSignedIn: boolean) {
  return isSignedIn ? '/workspace' : '/signup?next=%2Fworkspace';
}

function typeLabel(type: string) {
  return type.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function deadlineLabel(opportunity: OpportunityBrowseProjection) {
  const date = opportunity.deadline.date ? new Date(opportunity.deadline.date) : null;
  if (date && !Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  if (opportunity.deadline.kind === 'rolling') return 'Rolling deadline';
  if (opportunity.deadline.kind === 'until-filled') return 'Until filled';
  return opportunity.deadline.raw || 'Deadline to be confirmed';
}

function feeLabel(opportunity: OpportunityBrowseProjection) {
  if (opportunity.fee.status === 'no-fee') return 'Free';
  if (opportunity.fee.amountCents !== undefined) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: opportunity.fee.currency || 'USD',
        maximumFractionDigits: 0,
      }).format(opportunity.fee.amountCents / 100);
    } catch {
      return String(opportunity.fee.amountCents / 100);
    }
  }

  return opportunity.fee.raw || 'Fee details';
}

function sourceLabel(opportunity: OpportunityBrowseProjection) {
  if (opportunity.organizationName) return opportunity.organizationName;
  if (opportunity.source.organizationConfirmed) return 'Verified organization';
  return 'Source details available';
}

function fitReasons(opportunity: OpportunityBrowseProjection | undefined, signedIn: boolean) {
  const tailored = opportunity?.personal?.tailoringReasons.map((reason) => reason.label).slice(0, 3) ?? [];
  if (tailored.length > 0) return tailored;
  if (signedIn) {
    return [
      'Add the practice and materials you want Missa to consider.',
      'Missa will show the details that connect your work to each call.',
      'Keep the official source and every deadline together.',
    ];
  }

  return [
    'Add your practice, interests, and where you can apply.',
    'See the details that make an opportunity relevant to your work.',
    'Keep the official source and every deadline together.',
  ];
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const isSignedIn = Boolean(session);

  let opportunities: OpportunityBrowseProjection[] = [];
  let opportunityLoadFailed = false;

  try {
    const result = await getOpportunityRepository().browse(
      {
        openNow: true,
        sort: 'soonest-deadline',
        limit: 3,
      },
      session?.account.id ? { accountId: session.account.id } : undefined,
    );
    opportunities = result.items;
  } catch {
    opportunityLoadFailed = true;
  }

  const featuredOpportunity = opportunities[0];
  const primaryHref = browseHref(isSignedIn);
  const reasons = fitReasons(featuredOpportunity, isSignedIn);
  const featuredIsVerified = Boolean(featuredOpportunity?.organizationVerified);

  return (
    <main className={styles.home} id="main-content">
      <a className={styles.skipLink} href="#open-opportunities">
        Skip to open opportunities
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <MissaWordmark href="/" size="marketing" className={styles.wordmark} />

          <nav className={styles.desktopNav} aria-label="Main navigation">
            <a href="#for-creators">For creators <ChevronDown aria-hidden="true" size={13} strokeWidth={1.8} /></a>
            <Link href="/for-organizations">For organizations <ChevronDown aria-hidden="true" size={13} strokeWidth={1.8} /></Link>
            <a href="#how-it-works">How it works</a>
          </nav>

          <div className={styles.headerActions}>
            {!isSignedIn && (
              <Link className={styles.loginLink} href="/login">
                Log in
              </Link>
            )}
            <Link className={styles.signupButton} href={isSignedIn ? '/opportunities' : '/signup'}>
              {isSignedIn ? 'Open Missa' : 'Sign up'}
            </Link>
          </div>

          <details className={styles.mobileMenu}>
            <summary aria-label="Open site navigation">
              <Menu aria-hidden="true" size={21} strokeWidth={1.8} />
            </summary>
            <nav aria-label="Mobile navigation">
              <a href="#for-creators">For creators</a>
              <Link href="/for-organizations">For organizations</Link>
              <a href="#how-it-works">How it works</a>
              {!isSignedIn && <Link href="/login">Log in</Link>}
              <Link href={isSignedIn ? '/opportunities' : '/signup'}>{isSignedIn ? 'Open Missa' : 'Sign up'}</Link>
            </nav>
          </details>
        </div>
      </header>

      <section className={styles.hero} id="for-creators" aria-labelledby="hero-heading">
        <div className={styles.heroCopy}>
          <h1 id="hero-heading">Submission opportunities tailored for you</h1>
          <p>
            Your work is specific. Your opportunities should be too. Missa helps you find the calls
            that fit, prepare with context, and keep every submission moving.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href={primaryHref}>
              Explore opportunities
              <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
            </Link>
            <Link className={styles.secondaryButton} href={profileHref(isSignedIn)}>
              Build your profile
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Missa helps creators connect their work with open calls">
          <div className={styles.heroPortrait}>
            <Image
              src="/media/home/artist-at-work.webp"
              alt="Creator working on a drawing in their studio"
              fill
              sizes="(max-width: 767px) 82vw, (max-width: 1023px) 54vw, 34vw"
              priority
              unoptimized
            />
          </div>
          <div className={styles.heroTileArchitecture}>
            <Image src="/media/home/opportunity-architecture.webp" alt="" fill sizes="(max-width: 767px) 28vw, 16vw" priority unoptimized />
          </div>
          <div className={styles.heroTileGallery}>
            <Image src="/media/home/gallery-interior.webp" alt="" fill sizes="(max-width: 767px) 28vw, 16vw" priority unoptimized />
          </div>
          <div className={styles.heroTileMountains}>
            <Image src="/media/home/opportunity-mountains.webp" alt="" fill sizes="(max-width: 767px) 28vw, 16vw" priority unoptimized />
          </div>

          <div className={styles.heroOpportunityCard}>
            <div className={styles.recommendedLine}>
              <span className={featuredIsVerified ? styles.statusLabelVerified : styles.statusLabel}>
                {featuredIsVerified ? <ShieldCheck aria-hidden="true" size={12} /> : <CalendarDays aria-hidden="true" size={12} />}
                {featuredIsVerified ? 'Verified' : 'Open now'}
              </span>
            </div>
            {featuredOpportunity ? (
              <>
                <p className={styles.heroOpportunityTitle}>{featuredOpportunity.title}</p>
                <p className={styles.heroOpportunityOrganization}>{sourceLabel(featuredOpportunity)}</p>
                <p className={styles.heroOpportunityType}>{typeLabel(featuredOpportunity.type)}</p>
                <dl className={styles.heroOpportunityFacts}>
                  <div>
                    <dt>Deadline</dt>
                    <dd>{deadlineLabel(featuredOpportunity)}</dd>
                  </div>
                  <div>
                    <dt>Fee</dt>
                    <dd>{feeLabel(featuredOpportunity)}</dd>
                  </div>
                </dl>
                <Link href={browseHref(isSignedIn, featuredOpportunity.id)}>
                  View opportunity <ArrowRight aria-hidden="true" size={14} />
                </Link>
              </>
            ) : (
              <>
                <p className={styles.heroOpportunityTitle}>Your next opportunity</p>
                <p className={styles.heroOpportunityOrganization}>Build a profile to begin tailoring.</p>
                <p className={styles.heroOpportunityType}>Missa</p>
                <Link href={profileHref(isSignedIn)}>
                  Build your profile <ArrowRight aria-hidden="true" size={14} />
                </Link>
              </>
            )}
          </div>
          <span className={styles.heroConnector} aria-hidden="true">
            <ArrowUpRight size={18} strokeWidth={1.8} />
          </span>
        </div>
      </section>

      <section className={styles.openNow} id="open-opportunities" aria-labelledby="open-now-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>Opportunities</p>
            <h2 id="open-now-heading">Open now</h2>
          </div>
          <Link className={styles.inlineLink} href={primaryHref}>
            View all opportunities <ArrowRight aria-hidden="true" size={15} strokeWidth={1.8} />
          </Link>
        </div>

        {opportunities.length > 0 ? (
          <div className={styles.opportunityGrid}>
            {opportunities.map((opportunity, index) => (
              <article className={styles.opportunityCard} key={opportunity.id}>
                <div className={styles.opportunityImage}>
                  <Image
                    src={opportunityImages[index % opportunityImages.length]}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 100vw, 33vw"
                  />
                </div>
                <div className={styles.opportunityCardContent}>
                  <p className={styles.opportunityOrganization}>{sourceLabel(opportunity)}</p>
                  <h3>{opportunity.title}</h3>
                  <p className={styles.opportunityType}>{typeLabel(opportunity.type)}</p>
                  <dl className={styles.opportunityFacts}>
                    <div>
                      <dt>Deadline</dt>
                      <dd>{deadlineLabel(opportunity)}</dd>
                    </div>
                    <div>
                      <dt>Fee</dt>
                      <dd>{feeLabel(opportunity)}</dd>
                    </div>
                  </dl>
                  <Link href={browseHref(isSignedIn, opportunity.id)}>
                    View opportunity <ArrowRight aria-hidden="true" size={14} strokeWidth={1.8} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyOpportunities}>
            <p>{opportunityLoadFailed ? 'Open opportunities are temporarily unavailable.' : 'No open opportunities are available yet.'}</p>
            <Link className={styles.secondaryButton} href={primaryHref}>Browse the opportunity library</Link>
          </div>
        )}
      </section>

      <section className={styles.profileStory} id="how-it-works" aria-labelledby="profile-story-heading">
        <div className={styles.storyHeading}>
          <p className={styles.sectionEyebrow}>Your profile</p>
          <h2 id="profile-story-heading">Your work,<br />in the right places.</h2>
          <p>
            A profile gives Missa the context to surface better opportunities and explain what connects
            each one to your work.
          </p>
          <Link className={styles.inlineLink} href={profileHref(isSignedIn)}>
            {isSignedIn ? 'Open your profile' : 'Build your profile'} <ArrowRight aria-hidden="true" size={15} strokeWidth={1.8} />
          </Link>
        </div>

        <div className={styles.profileStoryVisual}>
          <div className={styles.workspacePreview} aria-label="Example profile workspace">
            <div className={styles.workspaceSidebar}>
              <MissaWordmark href={null} size="compact" />
              <span className={styles.workspaceSidebarLabel}>My workspace</span>
              <span>Overview</span>
              <span className={styles.workspaceActive}>My works</span>
              <span>CV / Bio</span>
              <span>Exhibitions</span>
              <span>Press</span>
              <span>Statements</span>
              <span className={styles.workspaceSettings}>Profile settings</span>
            </div>
            <div className={styles.workspaceContent}>
              <div className={styles.workspaceTitleRow}>
                <div>
                  <p>My works</p>
                  <span>4 works in your library</span>
                </div>
                <span className={styles.addWork}><Plus aria-hidden="true" size={13} /> Add work</span>
              </div>
              <div className={styles.workGrid}>
                <figure>
                  <Image src="/media/home/portfolio-still-life.webp" alt="" fill sizes="140px" />
                  <figcaption>Tide Marks <span>2024</span></figcaption>
                </figure>
                <figure>
                  <Image src="/media/home/gallery-interior.webp" alt="" fill sizes="140px" />
                  <figcaption>Holding Pattern <span>2023</span></figcaption>
                </figure>
                <figure>
                  <Image src="/media/home/opportunity-mountains.webp" alt="" fill sizes="140px" />
                  <figcaption>Field Notes <span>2023</span></figcaption>
                </figure>
                <figure>
                  <Image src="/media/home/opportunity-dance.webp" alt="" fill sizes="140px" />
                  <figcaption>After the Storm <span>2022</span></figcaption>
                </figure>
              </div>
              <div className={styles.profileStrength}>
                <span>Profile strength</span>
                <strong>Building</strong>
                <i aria-hidden="true"><b /></i>
              </div>
            </div>
          </div>

          <div className={styles.storyConnector} aria-hidden="true">
            <span />
            <MoveRight size={18} strokeWidth={1.8} />
          </div>

          <div className={styles.fitPreview} aria-label="Example opportunity fit explanation">
            <div className={styles.fitHeader}>
              <span><Sparkles aria-hidden="true" size={12} /> {featuredOpportunity?.personal?.tailoringReasons.length ? 'Fit details' : 'Opportunity details'}</span>
              <Bookmark aria-hidden="true" size={16} strokeWidth={1.7} />
            </div>
            <div className={styles.fitIdentity}>
              <div>
                <p>{featuredOpportunity?.title || 'Find your next opportunity'}</p>
                <span>{featuredOpportunity ? sourceLabel(featuredOpportunity) : 'Complete your profile to tailor the search.'}</span>
                {featuredOpportunity && <small>{typeLabel(featuredOpportunity.type)}</small>}
              </div>
              <Image src="/media/home/opportunity-architecture.webp" alt="" width={72} height={72} />
            </div>
            {featuredOpportunity && (
              <dl className={styles.fitFacts}>
                <div><dt>Deadline</dt><dd>{deadlineLabel(featuredOpportunity)}</dd></div>
                <div><dt>Fee</dt><dd>{feeLabel(featuredOpportunity)}</dd></div>
              </dl>
            )}
            <div className={styles.fitTabs} aria-hidden="true">
              <span className={styles.fitTabActive}>Overview</span>
              <span>Requirements</span>
              <span>Timeline</span>
              <span>Resources</span>
            </div>
            <div className={styles.fitWhy}>
              <p>Why this {featuredOpportunity?.personal?.tailoringReasons.length ? 'fits' : 'could fit'}</p>
              <span>
                {featuredOpportunity?.personal?.tailoringReasons.length
                  ? 'Missa has matched this opportunity to details you added to your profile.'
                  : 'Your profile makes the recommendation legible, before you decide to apply.'}
              </span>
              <ul>
                {reasons.map((reason) => (
                  <li key={reason}><CheckCircle2 aria-hidden="true" size={14} />{reason}</li>
                ))}
              </ul>
            </div>
            <div className={styles.fitActions}>
              <Link className={styles.primaryButton} href={featuredOpportunity ? browseHref(isSignedIn, featuredOpportunity.id) : profileHref(isSignedIn)}>
                {featuredOpportunity ? 'View opportunity' : 'Build your profile'}
              </Link>
              {featuredOpportunity && <Link href={primaryHref}>See all details <ArrowRight aria-hidden="true" size={14} /></Link>}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.organizationSection} id="for-organizations" aria-labelledby="organization-heading">
        <div className={styles.organizationImage}>
          <Image
            src="/media/home/gallery-interior.webp"
            alt="Contemporary gallery interior"
            fill
            sizes="(max-width: 767px) 100vw, 42vw"
          />
        </div>
        <div className={styles.organizationCopy}>
          <p className={styles.sectionEyebrow}>For organizations</p>
          <h2 id="organization-heading">A better place to run your open call.</h2>
          <p>
            Post opportunities, manage submissions, and keep every decision in one clear workspace.
          </p>
          <Link className={styles.secondaryButton} href="/for-organizations">
            See the organization platform <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </Link>
        </div>
        <div className={styles.organizationPreview} aria-label="Example organization workspace">
          <div className={styles.organizationPreviewHeader}>
            <strong>Overview</strong>
            <span>Open call workspace</span>
          </div>
          <div className={styles.organizationMetrics}>
            <div><span>Active opportunities</span><strong>—</strong></div>
            <div><span>Applications</span><strong>—</strong></div>
            <div><span>In review</span><strong>—</strong></div>
          </div>
          <div className={styles.organizationList}>
            <p>Recent activity</p>
            <span><Check aria-hidden="true" size={13} /> Open call details reviewed</span>
            <span><Check aria-hidden="true" size={13} /> Requirements ready to publish</span>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerIntro}>
          <MissaWordmark href="/" size="marketing" className={styles.footerWordmark} />
          <p>Helping creators find the calls that fit, prepare with context, and keep every submission moving.</p>
          <a href="mailto:hello@usemissa.com">hello@usemissa.com</a>
        </div>
        <div className={styles.footerLinks}>
          <div>
            <p>For creators</p>
            <Link href={primaryHref}>Find opportunities</Link>
            <a href="#how-it-works">How it works</a>
            <Link href={profileHref(isSignedIn)}>Profile</Link>
            <Link href="/login">Help center</Link>
          </div>
          <div>
            <p>For organizations</p>
            <Link href="/for-organizations">See the organization platform</Link>
            <Link href="/for-organizations#how-it-works">How it works</Link>
            <Link href={workspaceHref(isSignedIn)}>Open workspace</Link>
          </div>
          <div>
            <p>Company</p>
            <a href="#for-creators">About</a>
            <Link href="/login">Careers</Link>
            <Link href="/login">Privacy</Link>
            <Link href="/login">Terms</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 Missa</span>
          <a href="#main-content">Back to top <ArrowUpRight aria-hidden="true" size={13} /></a>
        </div>
      </footer>
    </main>
  );
}
