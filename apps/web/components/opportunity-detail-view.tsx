import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  CalendarDays,
  Check,
  ExternalLink,
  FileText,
  Flag,
  Globe2,
  MapPin,
  Tag,
} from 'lucide-react';
import type { OpportunityDetailProjection } from '@missa/radar-engine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SaveToTrackerButton } from '@/components/save-to-tracker-button';
import { OpportunityIssueReport } from '@/components/opportunity-issue-report';
import { PrepareChecklist } from '@/components/prepare-checklist';
import styles from './opportunity-detail.module.css';

function initials(opportunity: OpportunityDetailProjection): string {
  return (opportunity.organizationName ?? opportunity.title)
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'M';
}

function typeLabel(type: OpportunityDetailProjection['type']): string {
  if (type === 'open-call') return 'Open call';
  return type.replace(/-/gu, ' ').replace(/^./u, (character) => character.toUpperCase());
}

function deadlineLabel(deadline: OpportunityDetailProjection['deadline']): string {
  if (deadline.date) {
    return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(`${deadline.date}T12:00:00`));
  }
  if (deadline.kind === 'rolling') return 'Rolling deadline';
  if (deadline.kind === 'until-filled') return 'Until filled';
  if (deadline.kind === 'conflicting') return 'Deadline needs confirmation';
  return 'Deadline not listed';
}

function feeLabel(opportunity: OpportunityDetailProjection): string {
  if (opportunity.fee.status === 'no-fee') return 'No fee';
  if (opportunity.fee.status === 'unknown') return 'Fee not listed';
  if (opportunity.fee.amountCents !== undefined && opportunity.fee.currency) {
    const currency = /^[A-Z]{3}$/u.test(opportunity.fee.currency) ? opportunity.fee.currency : undefined;
    if (currency) return new Intl.NumberFormat('en', { style: 'currency', currency }).format(opportunity.fee.amountCents / 100);
    return `${opportunity.fee.currency}${(opportunity.fee.amountCents / 100).toFixed(2)}`;
  }
  return 'Application fee';
}

function statusLabel(status: OpportunityDetailProjection['status']): string {
  if (status === 'closing-soon') return 'Closing soon';
  if (status === 'deadline-extended') return 'Deadline extended';
  if (status === 'opening-soon') return 'Opening soon';
  return status.replace(/-/gu, ' ').replace(/^./u, (character) => character.toUpperCase());
}

function DetailNotice({ opportunity }: { opportunity: OpportunityDetailProjection }) {
  if (opportunity.status === 'closed' || opportunity.status === 'archived') {
    return (
      <div className={styles.productNotice} data-tone="neutral">
        <AlertTriangle aria-hidden="true" />
        <div><strong>This opportunity is closed</strong><p>The record remains available for reference. Check the Organization’s official page for a future edition.</p></div>
      </div>
    );
  }
  if (opportunity.deadline.kind === 'conflicting') {
    return (
      <div className={styles.productNotice} data-tone="warning">
        <AlertTriangle aria-hidden="true" />
        <div><strong>The deadline needs confirmation</strong><p>The available source information does not agree. Confirm the deadline on the official page before preparing work.</p></div>
      </div>
    );
  }
  if (opportunity.fee.status === 'unknown' || opportunity.requiredMaterials.length === 0) {
    return (
      <div className={styles.productNotice} data-tone="neutral">
        <AlertTriangle aria-hidden="true" />
        <div><strong>Some application details are not listed</strong><p>Use the official source to confirm the fee and complete file requirements before preparing work.</p></div>
      </div>
    );
  }
  return null;
}

export function OpportunityDetailView({
  opportunity,
  signedIn,
  summary,
  practiceLabels,
}: {
  opportunity: OpportunityDetailProjection;
  signedIn: boolean;
  summary: string;
  practiceLabels: string[];
}) {
  const tracked = Boolean(opportunity.personal?.tracked);
  const canonicalPath = `/opportunities/${opportunity.slug}`;
  const loginIntent = `/login?next=${encodeURIComponent(canonicalPath)}&intent=${encodeURIComponent(`save:${opportunity.id}`)}`;
  const sourceHref = opportunity.guidelinesUrl ?? opportunity.source.url;

  return (
    <main id="main-content" className={styles.main}>
      <Link className={styles.backLink} href="/opportunities">
        <ArrowLeft aria-hidden="true" />Back to opportunities
      </Link>

      <article aria-labelledby="opportunity-title">
        <header className={styles.hero}>
          <div className={styles.identityMedia} data-fallback={!opportunity.identityAssetUrl || undefined}>
            {opportunity.identityAssetUrl ? (
              // Repository policy permits only rights-cleared/permitted media.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={opportunity.identityAssetUrl} alt={opportunity.identityAssetAlt ?? ''} className={styles.identityImage} />
            ) : (
              <span aria-hidden="true">{initials(opportunity)}</span>
            )}
          </div>
          <div className={styles.heroCopy}>
            <Badge variant="outline">{typeLabel(opportunity.type)}</Badge>
            <h1 id="opportunity-title">{opportunity.title}</h1>
            <p className={styles.organization}>{opportunity.organizationName ?? 'Organization not listed'}</p>
            <p className={styles.heroSummary}>{summary}</p>
            <div className={styles.heroActions}>
              {signedIn ? (
                tracked ? (
                  <Button nativeButton={false} render={<Link href="/tracker" />} variant="secondary" className={styles.primaryAction}>
                    <Check aria-hidden="true" />In Tracker
                  </Button>
                ) : (
                  <SaveToTrackerButton opportunityId={opportunity.id} />
                )
              ) : (
                <Button nativeButton={false} render={<Link href={loginIntent} />} className={styles.primaryAction}>
                  <Bookmark aria-hidden="true" />Sign in to save
                </Button>
              )}
              <a className={styles.sourceButton} href={sourceHref} target="_blank" rel="noreferrer">
                Official source <ExternalLink aria-hidden="true" />
              </a>
            </div>
          </div>
        </header>

        <DetailNotice opportunity={opportunity} />

        <div className={styles.contentGrid}>
          <aside className={styles.decisionRail} aria-labelledby="decision-facts-title">
            <p className={styles.kicker}>Decide with</p>
            <h2 id="decision-facts-title">Key facts</h2>
            <dl className={styles.factList}>
              <div data-warning={opportunity.deadline.kind === 'conflicting' || undefined}>
                <dt><CalendarDays aria-hidden="true" />Deadline</dt>
                <dd>{deadlineLabel(opportunity.deadline)}</dd>
              </div>
              <div><dt><Tag aria-hidden="true" />Fee</dt><dd>{feeLabel(opportunity)}</dd></div>
              <div><dt><Globe2 aria-hidden="true" />Reach</dt><dd>{opportunity.location ?? 'Location not listed'}</dd></div>
              <div><dt><MapPin aria-hidden="true" />Status</dt><dd>{statusLabel(opportunity.status)}</dd></div>
            </dl>
            <div className={styles.railActions}>
              <a className={styles.sourceButton} href={sourceHref} target="_blank" rel="noreferrer">
                Official source <ExternalLink aria-hidden="true" />
              </a>
            </div>
          </aside>

          <div className={styles.readingColumn}>
            <section aria-labelledby="about-title">
              <p className={styles.kicker}>The opportunity</p>
              <h2 id="about-title">What this opportunity is asking for</h2>
              <p className={styles.lede}>{summary}</p>
              <p>Use this overview to orient yourself, then rely on the official source for the final rules and submission destination.</p>
            </section>

            <section aria-labelledby="eligibility-title">
              <p className={styles.sectionNumber}>01 · Decide</p>
              <h2 id="eligibility-title">Eligibility</h2>
              {opportunity.eligibility.length ? (
                <ul className={styles.eligibilityList}>
                  {opportunity.eligibility.map((rule) => (
                    <li key={rule.key}><Check aria-hidden="true" /><span>{rule.description}{rule.value ? ` — ${rule.value}` : ''}</span></li>
                  ))}
                </ul>
              ) : (
                <p>Eligibility is not fully listed in the current record. Confirm it on the official source before applying.</p>
              )}
              <p className={styles.boundaryNote}>Eligibility describes the call’s stated rules. It is not a promise that an applicant qualifies.</p>
            </section>

            <section aria-labelledby="prepare-title">
              <p className={styles.sectionNumber}>02 · Prepare</p>
              <h2 id="prepare-title">What to prepare</h2>
              {opportunity.requiredMaterials.length ? (
                <dl className={styles.requirementList}>
                  {opportunity.requiredMaterials.map((material) => (
                    <div key={material.label}>
                      <dt><FileText aria-hidden="true" />{material.label}</dt>
                      <dd>{material.description ?? material.limit ?? (material.required ? 'Required' : 'Optional')}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p>Required materials are not fully listed. Review the official source before preparing files.</p>
              )}
              <PrepareChecklist opportunityId={opportunity.id} enabled={signedIn && tracked} />
            </section>

            <section aria-labelledby="practices-title">
              <p className={styles.sectionNumber}>03 · Understand the call</p>
              <h2 id="practices-title">Practices named in this call</h2>
              {practiceLabels.length ? (
                <div className={styles.practiceList}>{practiceLabels.map((practice) => <Badge key={practice} variant="secondary">{practice}</Badge>)}</div>
              ) : (
                <p>Practice labels are not yet available for this record.</p>
              )}
              <p className={styles.boundaryNote}>Practice labels describe the work. They remain separate from eligibility and geography.</p>
            </section>

            <section className={styles.sourceSection} aria-labelledby="source-title">
              <p className={styles.sectionNumber}>04 · Apply</p>
              <h2 id="source-title">Finish on the official source</h2>
              <p>Missa helps you understand and track the opportunity. The Organization’s page carries the final rules and application destination.</p>
              <div className={styles.sourceSectionActions}>
                <a className={styles.sourceButton} href={sourceHref} target="_blank" rel="noreferrer">
                  Official source <ExternalLink aria-hidden="true" />
                </a>
                {signedIn ? (
                  <div className={styles.productReport}><OpportunityIssueReport opportunityId={opportunity.id} /></div>
                ) : (
                  <Link className={styles.reportTrigger} href={`/login?next=${encodeURIComponent(canonicalPath)}`}>
                    <Flag aria-hidden="true" />Sign in to report an issue
                  </Link>
                )}
              </div>
            </section>
          </div>
        </div>
      </article>
    </main>
  );
}
