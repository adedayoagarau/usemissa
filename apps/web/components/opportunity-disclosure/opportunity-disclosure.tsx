import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  CircleHelp,
  FileText,
  Globe2,
  MapPin,
  Tag,
} from "lucide-react";
import type {
  OpportunityBrowseProjection,
  OpportunityDetailProjection,
} from "@missa/radar-engine";
import {
  deadlineDisclosure,
  feeDisclosure,
  locationDisclosure,
  opportunityInitials,
  opportunityTypeLabel,
  primaryPracticeLabels,
  sourceHref,
  statusDisclosure,
  type DisclosureTone,
  type DisclosureValue,
} from "./model";
import styles from "./opportunity-disclosure.module.css";

type Icon = ComponentType<{ "aria-hidden"?: boolean }>;

export function DisclosureState({
  tone,
  children,
}: {
  tone: DisclosureTone;
  children: ReactNode;
}) {
  return (
    <span className={styles.state} data-tone={tone}>
      {children}
    </span>
  );
}

export function OpportunityFact({
  fact,
  icon: Icon,
}: {
  fact: DisclosureValue;
  icon: Icon;
}) {
  return (
    <div className={styles.fact} data-tone={fact.tone}>
      <dt>
        <Icon aria-hidden />
        {fact.label}
      </dt>
      <dd>{fact.value}</dd>
      {fact.description ? <p>{fact.description}</p> : null}
    </div>
  );
}

export function OpportunityFactGroup({
  opportunity,
  includeStatus = false,
}: {
  opportunity: OpportunityBrowseProjection;
  includeStatus?: boolean;
}) {
  const facts: Array<{ fact: DisclosureValue; icon: Icon }> = [
    { fact: deadlineDisclosure(opportunity.deadline), icon: CalendarDays },
    { fact: feeDisclosure(opportunity.fee), icon: Tag },
    { fact: locationDisclosure(opportunity.location), icon: MapPin },
  ];
  if (includeStatus) facts.push({ fact: statusDisclosure(opportunity), icon: Globe2 });
  return (
    <dl className={styles.factGroup}>
      {facts.map(({ fact, icon }) => (
        <OpportunityFact key={fact.label} fact={fact} icon={icon} />
      ))}
    </dl>
  );
}

export function OpportunityIdentity({
  opportunity,
  priority = false,
}: {
  opportunity: OpportunityBrowseProjection;
  priority?: boolean;
}) {
  return (
    <div
      className={styles.identity}
      data-has-image={Boolean(opportunity.identityAssetUrl)}
    >
      {opportunity.identityAssetUrl ? (
        // Phase 1 fixtures and repository projections contain only permitted assets.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={opportunity.identityAssetUrl}
          alt={opportunity.identityAssetAlt ?? ""}
          loading={priority ? "eager" : "lazy"}
        />
      ) : (
        <span aria-hidden="true">{opportunityInitials(opportunity)}</span>
      )}
    </div>
  );
}

export function OpportunityCard({
  opportunity,
  href,
}: {
  opportunity: OpportunityBrowseProjection;
  href: string;
}) {
  const deadline = deadlineDisclosure(opportunity.deadline);
  const practices = primaryPracticeLabels(opportunity);
  const status = statusDisclosure(opportunity);
  return (
    <article
      className={styles.card}
      data-state={status.tone}
      data-testid={`opportunity-card-${opportunity.slug}`}
    >
      <OpportunityIdentity opportunity={opportunity} />
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <DisclosureState tone={status.tone}>
            {opportunityTypeLabel(opportunity.type)}
          </DisclosureState>
          {opportunity.prize ? <span className={styles.prize}>{opportunity.prize}</span> : null}
        </div>
        <h3>
          <Link href={href}>{opportunity.title}</Link>
        </h3>
        <p className={styles.organization}>
          {opportunity.organizationName ?? "Organization not confirmed"}
        </p>
        {practices.length ? <p className={styles.practices}>{practices.join(" · ")}</p> : null}
        <div className={styles.scanFacts}>
          <span data-tone={deadline.tone}>
            <CalendarDays aria-hidden="true" />
            {deadline.value}
          </span>
          <span>
            <Tag aria-hidden="true" />
            {feeDisclosure(opportunity.fee).value}
          </span>
          <span>
            <MapPin aria-hidden="true" />
            {locationDisclosure(opportunity.location).value}
          </span>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.sourceName}>Source: {opportunity.source.name}</span>
          <span className={styles.cardAction}>
            Review details <ArrowUpRight aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
}
export function OpportunityNotice({
  opportunity,
}: {
  opportunity: OpportunityDetailProjection;
}) {
  const status = statusDisclosure(opportunity);
  const deadline = deadlineDisclosure(opportunity.deadline);
  const unknownCount = [
    deadline.tone === "unknown",
    opportunity.fee.status === "unknown",
    !opportunity.location,
    opportunity.eligibility.length === 0,
    opportunity.requiredMaterials.length === 0,
  ].filter(Boolean).length;
  if (status.tone === "unavailable") {
    return (
      <div className={styles.notice} data-tone="unavailable" role="status">
        <AlertTriangle aria-hidden="true" />
        <div><strong>This opportunity is closed</strong><p>{status.description}</p></div>
      </div>
    );
  }
  if (deadline.tone === "warning") {
    return (
      <div className={styles.notice} data-tone="warning" role="status">
        <AlertTriangle aria-hidden="true" />
        <div><strong>{deadline.value}</strong><p>{deadline.description}</p></div>
      </div>
    );
  }
  if (unknownCount > 0) {
    return (
      <div className={styles.notice} data-tone="unknown" role="status">
        <CircleHelp aria-hidden="true" />
        <div><strong>Some details are not listed</strong><p>Confirm the missing requirements on the official page before applying.</p></div>
      </div>
    );
  }
  if (status.tone === "changed") {
    return (
      <div className={styles.notice} data-tone="changed" role="status">
        <AlertTriangle aria-hidden="true" />
        <div><strong>Changed since this was saved</strong><p>Review the new deadline before continuing your preparation.</p></div>
      </div>
    );
  }
  return null;
}

export function OpportunityDetailSection({
  index,
  eyebrow,
  title,
  children,
}: {
  index: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const id = `phase-one-section-${index}`;
  return (
    <section className={styles.detailSection} aria-labelledby={id}>
      <p className={styles.sectionEyebrow}>{index} · {eyebrow}</p>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

export function OpportunityDetail({
  opportunity,
  backHref,
}: {
  opportunity: OpportunityDetailProjection;
  backHref: string;
}) {
  const profile = opportunity.callProfile;
  const content = opportunity.content;
  const officialHref = sourceHref(opportunity);
  const canApply = opportunity.submissionAvailable && !["closed", "archived"].includes(opportunity.status);
  return (
    <article className={styles.detail} aria-labelledby="phase-one-opportunity-title">
      <Link className={styles.back} href={backHref}><ArrowLeft aria-hidden="true" />Back to all fixtures</Link>
      <header className={styles.detailHero}>
        <OpportunityIdentity opportunity={opportunity} priority />
        <div>
          <DisclosureState tone={statusDisclosure(opportunity).tone}>{opportunityTypeLabel(opportunity.type)}</DisclosureState>
          <h1 id="phase-one-opportunity-title">{opportunity.title}</h1>
          <p className={styles.detailOrganization}>{opportunity.organizationName ?? "Organization not confirmed"}</p>
          <p className={styles.summary}>{content?.summary ?? opportunity.organizationSummary ?? "A source-backed summary is not available for this opportunity."}</p>
          <div className={styles.actions} aria-label="Opportunity actions">
            <button type="button" disabled={!canApply}><Bookmark aria-hidden="true" />{opportunity.personal?.tracked ? "In Tracker" : "Save privately"}</button>
            <a href={officialHref} target="_blank" rel="noreferrer">Official source <ArrowUpRight aria-hidden="true" /><span className={styles.visuallyHidden}>(opens in a new tab)</span></a>
          </div>
        </div>
      </header>
      <OpportunityNotice opportunity={opportunity} />
      <div className={styles.detailGrid}>
        <aside className={styles.decisionRail} aria-labelledby="phase-one-key-facts">
          <p className={styles.sectionEyebrow}>Decision scan</p>
          <h2 id="phase-one-key-facts">Key facts</h2>
          <OpportunityFactGroup opportunity={opportunity} includeStatus />
          <p className={styles.sourceBoundary}>Source: <a href={officialHref} target="_blank" rel="noreferrer">{opportunity.source.name}<span className={styles.visuallyHidden}> (opens in a new tab)</span></a></p>
        </aside>
        <div className={styles.readingColumn}>
          <OpportunityDetailSection index="01" eyebrow="Decide" title="Eligibility">
            {opportunity.eligibility.length ? <ul className={styles.checkList}>{opportunity.eligibility.map((item) => <li key={item.key}><Check aria-hidden="true" /><span>{item.description}{item.value ? ` — ${item.value}` : ""}<small>{item.certainty === "inferred" ? "Inferred — confirm at source" : item.certainty === "unknown" ? "Not confirmed" : "Confirmed"}</small></span></li>)}</ul> : <p className={styles.unknownCopy}>Eligibility is not listed in the current record.</p>}
            <p className={styles.boundary}>These are the call’s stated rules, not a prediction that an applicant qualifies.</p>
          </OpportunityDetailSection>
          <OpportunityDetailSection index="02" eyebrow="Prepare" title="Required materials">
            {opportunity.requiredMaterials.length ? <dl className={styles.requirements}>{opportunity.requiredMaterials.map((item) => <div key={item.label}><dt><FileText aria-hidden="true" />{item.label}</dt><dd>{item.description ?? item.limit ?? (item.required ? "Required" : "Optional")}</dd></div>)}</dl> : <p className={styles.unknownCopy}>Required materials are not listed. Read the official guidelines before preparing files.</p>}
          </OpportunityDetailSection>
          <OpportunityDetailSection index="03" eyebrow="Understand" title="Terms and submission rules">
            {profile ? <dl className={styles.terms}>
              <div><dt>Reading period</dt><dd>{profile.readingPeriodLabel ?? "Not listed"}</dd></div>
              <div><dt>Accepted formats</dt><dd>{profile.acceptedFormats.length ? profile.acceptedFormats.join(", ") : "Not listed"}</dd></div>
              <div><dt>Length</dt><dd>{profile.wordLimitMax ? `Up to ${profile.wordLimitMax.toLocaleString("en")} words` : "Not listed"}</dd></div>
              <div><dt>Payment</dt><dd>{profile.paymentAmountCents && profile.paymentCurrency ? new Intl.NumberFormat("en", { style: "currency", currency: profile.paymentCurrency, maximumFractionDigits: 0 }).format(profile.paymentAmountCents / 100) : profile.paymentType === "none" ? "No payment" : "Not listed"}</dd></div>
              <div><dt>Previously unpublished</dt><dd>{profile.previouslyUnpublishedRequired === undefined ? "Not listed" : profile.previouslyUnpublishedRequired ? "Required" : "Not required"}</dd></div>
              <div><dt>Reprints</dt><dd>{profile.reprintsAllowed === undefined ? "Not listed" : profile.reprintsAllowed ? "Accepted" : "Not accepted"}</dd></div>
              <div><dt>Simultaneous submissions</dt><dd>{profile.multipleSubmissionsAllowed === undefined ? "Not listed" : profile.multipleSubmissionsAllowed ? "Allowed" : "Not allowed"}</dd></div>
              <div><dt>Rights</dt><dd>{profile.rightsSummary ?? "Not listed"}</dd></div>
              <div><dt>AI-assisted work</dt><dd>Not listed</dd></div>
            </dl> : <p className={styles.unknownCopy}>Detailed call terms are not present in the current record.</p>}
          </OpportunityDetailSection>
          <OpportunityDetailSection index="04" eyebrow="Verify" title="Official handoff">
            <p>Missa provides an orientation to the available record. The organization’s official destination carries the final rules and application action.</p>
            <a className={styles.finalSource} href={officialHref} target="_blank" rel="noreferrer">Read official guidelines <ArrowUpRight aria-hidden="true" /><span className={styles.visuallyHidden}>(opens in a new tab)</span></a>
          </OpportunityDetailSection>
        </div>
      </div>
    </article>
  );
}
