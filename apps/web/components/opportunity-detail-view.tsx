import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpenText,
  Building2,
  CalendarDays,
  Check,
  CircleHelp,
  Clock3,
  Coins,
  ExternalLink,
  FileText,
  Files,
  Flag,
  Globe2,
  MapPin,
  Scale,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import type { OpportunityDetailProjection } from "@missa/radar-engine";
import type { ProfileCard } from "@missa/radar-adapters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SaveToTrackerButton } from "@/components/save-to-tracker-button";
import { OpportunityIssueReport } from "@/components/opportunity-issue-report";
import { PrepareChecklist } from "@/components/prepare-checklist";
import { FollowButton } from "@/components/follow-button";
import { MobileActionDock } from "@/components/mobile-action-dock";
import styles from "./opportunity-detail.module.css";

function initials(opportunity: OpportunityDetailProjection): string {
  return (
    (opportunity.organizationName ?? opportunity.title)
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "M"
  );
}

function typeLabel(type: OpportunityDetailProjection["type"]): string {
  if (type === "open-call") return "Open call";
  return type
    .replace(/-/gu, " ")
    .replace(/^./u, (character) => character.toUpperCase());
}

function deadlineLabel(
  deadline: OpportunityDetailProjection["deadline"],
): string {
  if (deadline.date) {
    return new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(
      new Date(`${deadline.date}T12:00:00`),
    );
  }
  if (deadline.kind === "rolling") return "Rolling deadline";
  if (deadline.kind === "until-filled") return "Until filled";
  if (deadline.kind === "conflicting") return "Deadline needs confirmation";
  return "Deadline not listed";
}

function feeLabel(opportunity: OpportunityDetailProjection): string {
  if (opportunity.fee.status === "no-fee") return "No fee";
  if (opportunity.fee.status === "unknown") return "Fee not listed";
  if (opportunity.fee.amountCents !== undefined && opportunity.fee.currency) {
    const currency = /^[A-Z]{3}$/u.test(opportunity.fee.currency)
      ? opportunity.fee.currency
      : undefined;
    if (currency)
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).format(opportunity.fee.amountCents / 100);
    return `${opportunity.fee.currency}${(opportunity.fee.amountCents / 100).toFixed(2)}`;
  }
  return "Application fee";
}

function statusLabel(status: OpportunityDetailProjection["status"]): string {
  if (status === "closing-soon") return "Closing soon";
  if (status === "deadline-extended") return "Deadline extended";
  if (status === "opening-soon") return "Opening soon";
  return status
    .replace(/-/gu, " ")
    .replace(/^./u, (character) => character.toUpperCase());
}

function policyLabel(value: boolean | undefined, unknown = "Not listed"): string {
  if (value === true) return "Allowed";
  if (value === false) return "Not allowed";
  return unknown;
}

function compactMoney(amountCents?: number, currency?: string): string | undefined {
  if (amountCents === undefined || !currency) return undefined;
  if (!/^[A-Z]{3}$/u.test(currency)) return `${currency}${(amountCents / 100).toFixed(2)}`;
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amountCents / 100);
}

function readingPeriodLabel(kind: NonNullable<OpportunityDetailProjection["callProfile"]>["readingPeriodKind"]): string {
  if (kind === "year-round") return "Open year-round";
  if (kind === "rolling") return "Rolling reading period";
  if (kind === "seasonal") return "Seasonal reading period";
  if (kind === "exact") return "Fixed reading window";
  return "Reading period not listed";
}

function DetailNotice({
  opportunity,
}: {
  opportunity: OpportunityDetailProjection;
}) {
  if (opportunity.status === "closed" || opportunity.status === "archived") {
    return (
      <div className={styles.productNotice} data-tone="neutral">
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>This opportunity is closed</strong>
          <p>
            The record remains available for reference. Check the Organization’s
            official page for a future edition.
          </p>
        </div>
      </div>
    );
  }
  if (opportunity.deadline.kind === "conflicting") {
    return (
      <div className={styles.productNotice} data-tone="warning">
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>The deadline needs confirmation</strong>
          <p>
            The available source information does not agree. Confirm the
            deadline on the official page before preparing work.
          </p>
        </div>
      </div>
    );
  }
  if (
    opportunity.fee.status === "unknown" ||
    opportunity.requiredMaterials.length === 0
  ) {
    const missing = [
      opportunity.fee.status === "unknown" ? "the application fee" : null,
      opportunity.requiredMaterials.length === 0 ? "the complete file requirements" : null,
    ].filter((item): item is string => Boolean(item));
    return (
      <div className={styles.productNotice} data-tone="neutral">
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>Some application details are not listed</strong>
          <p>
            Use the official destination to confirm {missing.join(" and ")} before
            preparing work.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function OpportunityDetailView({
  opportunity,
  signedIn,
  userId,
  summary,
  practiceLabels,
  relatedProfile,
}: {
  opportunity: OpportunityDetailProjection;
  signedIn: boolean;
  userId?: string;
  summary: string;
  practiceLabels: string[];
  relatedProfile?: ProfileCard;
}) {
  const tracked = Boolean(opportunity.personal?.tracked);
  const canonicalPath = `/opportunities/${opportunity.slug}`;
  const officialHref = opportunity.guidelinesUrl ?? opportunity.submissionUrl;
  const destinationHref = officialHref ?? opportunity.source.url;
  const destinationLabel = officialHref ? "Official source" : "View original listing";
  const identityAssetUrl = opportunity.identityAssetUrl ?? relatedProfile?.mediaUrl;
  const identityAssetAlt = opportunity.identityAssetUrl
    ? opportunity.identityAssetAlt
    : relatedProfile?.mediaAlt;
  const call = opportunity.callProfile;
  const acceptedWork = Array.from(new Set([
    ...(call?.acceptedFormats ?? []),
    ...(call?.publicationFormats ?? []),
    ...(call?.subgenres ?? []),
    ...opportunity.genres,
  ].filter(Boolean)));
  const hasLimits = Boolean(call?.wordLimitMin !== undefined || call?.wordLimitMax !== undefined || call?.pageLimitMin !== undefined || call?.pageLimitMax !== undefined);
  const hasPolicies = Boolean(call || opportunity.simultaneousAllowed !== undefined);
  const payment = compactMoney(call?.paymentAmountCents, call?.paymentCurrency);
  const unknowns = [
    opportunity.fee.status === "unknown" ? "Application fee" : null,
    opportunity.deadline.kind === "unknown" || opportunity.deadline.kind === "conflicting" ? "Confirmed deadline" : null,
    opportunity.eligibility.length === 0 && !call?.eligibilitySummary ? "Eligibility" : null,
    opportunity.requiredMaterials.length === 0 ? "Required materials" : null,
    !call?.rightsSummary ? "Rights and licensing terms" : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <main id="main-content" className={styles.main} data-density="comfortable">
      <Link className={styles.backLink} href="/opportunities">
        <ArrowLeft aria-hidden="true" />
        Back to opportunities
      </Link>

      <article aria-labelledby="opportunity-title">
        <header className={styles.hero}>
          <div
            className={styles.identityMedia}
            data-fallback={!identityAssetUrl || undefined}
          >
            {identityAssetUrl ? (
              // Repository policy permits only rights-cleared/permitted media.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={identityAssetUrl}
                alt={identityAssetAlt ?? ""}
                className={styles.identityImage}
              />
            ) : (
              <span aria-hidden="true">{initials(opportunity)}</span>
            )}
          </div>
          <div className={styles.heroCopy}>
            <div className={styles.heroBadges}>
              <Badge variant="outline">{typeLabel(opportunity.type)}</Badge>
              <Badge variant={opportunity.status === "closing-soon" ? "destructive" : "secondary"}>
                {statusLabel(opportunity.status)}
              </Badge>
            </div>
            <h1 id="opportunity-title">{opportunity.title}</h1>
            <p className={styles.organization}>
              {opportunity.organizationName ?? "Organization not confirmed"}
            </p>
            {userId && opportunity.organizationId && !opportunity.personal?.followingOrganization ? (
              <FollowButton
                userId={userId}
                organizationId={opportunity.organizationId}
                organizationName={opportunity.organizationName}
              />
            ) : opportunity.personal?.followingOrganization ? (
              <span className="text-xs text-muted-foreground">Following</span>
            ) : null}
            <p className={styles.heroSummary}>{summary}</p>
            {relatedProfile ? (
              <p className={styles.organization}>
                Journal / press profile:{" "}
                <Link
                  href={`/journals/${encodeURIComponent(relatedProfile.id)}`}
                >
                  {relatedProfile.name}
                </Link>
              </p>
            ) : null}
            <div className={styles.heroActions}>
              {tracked ? (
                <Button
                  nativeButton={false}
                  render={<Link href="/tracker" />}
                  variant="secondary"
                  className={styles.primaryAction}
                >
                  <Check aria-hidden="true" />
                  In Tracker
                </Button>
              ) : (
                <SaveToTrackerButton
                  opportunityId={opportunity.id}
                  signedIn={signedIn}
                  returnTo={canonicalPath}
                  opportunityTitle={opportunity.title}
                />
              )}
              <a
                className={styles.sourceButton}
                href={destinationHref}
                target="_blank"
                rel="noreferrer"
              >
                {destinationLabel} <ExternalLink aria-hidden="true" />
              </a>
            </div>
          </div>
        </header>

        <DetailNotice opportunity={opportunity} />

        <MobileActionDock className={styles.mobileActions}>
          {tracked ? (
            <Button nativeButton={false} render={<Link href="/tracker" />} variant="secondary">
              <Check aria-hidden="true" /> In Tracker
            </Button>
          ) : (
            <SaveToTrackerButton
              opportunityId={opportunity.id}
              signedIn={signedIn}
              returnTo={canonicalPath}
              opportunityTitle={opportunity.title}
            />
          )}
          <a href={destinationHref} target="_blank" rel="noreferrer">
            {destinationLabel} <ExternalLink aria-hidden="true" />
          </a>
        </MobileActionDock>

        <div className={styles.contentGrid}>
          <aside
            className={styles.decisionRail}
            aria-labelledby="decision-facts-title"
          >
            <h2 id="decision-facts-title">Key facts</h2>
            <dl className={styles.factList}>
              <div
                data-warning={
                  opportunity.deadline.kind === "conflicting" || undefined
                }
              >
                <dt>
                  <CalendarDays aria-hidden="true" />
                  Deadline
                </dt>
                <dd>{deadlineLabel(opportunity.deadline)}</dd>
              </div>
              <div>
                <dt>
                  <Tag aria-hidden="true" />
                  Fee
                </dt>
                <dd>{feeLabel(opportunity)}</dd>
              </div>
              <div>
                <dt>
                  <Award aria-hidden="true" />
                  Award or payment
                </dt>
                <dd>{opportunity.prize ?? call?.prizeSummary ?? payment ?? "Not listed"}</dd>
              </div>
              <div>
                <dt>
                  <ShieldCheck aria-hidden="true" />
                  Eligibility
                </dt>
                <dd>{call?.eligibilitySummary ?? (opportunity.eligibility.length ? `${opportunity.eligibility.length} stated ${opportunity.eligibility.length === 1 ? "requirement" : "requirements"}` : "Not fully listed")}</dd>
              </div>
              <div>
                <dt>
                  <Globe2 aria-hidden="true" />
                  Reach
                </dt>
                <dd>{opportunity.location ?? "Location not listed"}</dd>
              </div>
              <div>
                <dt>
                  <MapPin aria-hidden="true" />
                  Status
                </dt>
                <dd>{statusLabel(opportunity.status)}</dd>
              </div>
              <div>
                <dt>
                  <BookOpenText aria-hidden="true" />
                  Opportunity type
                </dt>
                <dd>{typeLabel(opportunity.type)}</dd>
              </div>
            </dl>
            <div className={styles.railActions}>
              <a
                className={styles.sourceButton}
                href={destinationHref}
                target="_blank"
                rel="noreferrer"
              >
                {destinationLabel} <ExternalLink aria-hidden="true" />
              </a>
            </div>
          </aside>

          <div className={styles.readingColumn}>
            <section aria-labelledby="about-title">
              <h2 id="about-title">What this opportunity is asking for</h2>
              <p className={styles.lede}>{summary}</p>
              {call?.issueTheme ? <p><strong>Theme:</strong> {call.issueTheme}</p> : null}
            </section>

            <section aria-labelledby="accepted-work-title">
              <h2 id="accepted-work-title">Accepted work</h2>
              {acceptedWork.length ? (
                <div className={styles.practiceList}>
                  {acceptedWork.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
                </div>
              ) : <p>Accepted forms and genres are not yet listed.</p>}
              {hasLimits ? (
                <dl className={styles.requirementList}>
                  {call?.wordLimitMin !== undefined || call?.wordLimitMax !== undefined ? (
                    <div><dt><FileText aria-hidden="true" />Word limit</dt><dd>{call.wordLimitMin !== undefined ? `${call.wordLimitMin.toLocaleString()}–` : "Up to "}{call.wordLimitMax?.toLocaleString() ?? "not listed"} words</dd></div>
                  ) : null}
                  {call?.pageLimitMin !== undefined || call?.pageLimitMax !== undefined ? (
                    <div><dt><Files aria-hidden="true" />Page limit</dt><dd>{call.pageLimitMin !== undefined ? `${call.pageLimitMin}–` : "Up to "}{call.pageLimitMax ?? "not listed"} pages</dd></div>
                  ) : null}
                </dl>
              ) : <p className={styles.boundaryNote}>Size and quantity limits are not listed in the current record.</p>}
            </section>

            <section aria-labelledby="eligibility-title">
              <h2 id="eligibility-title">Eligibility</h2>
              {opportunity.eligibility.length ? (
                <ul className={styles.eligibilityList}>
                  {opportunity.eligibility.map((rule) => (
                    <li key={rule.key}>
                      <Check aria-hidden="true" />
                      <span>
                        {rule.description}
                        {rule.value ? ` — ${rule.value}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  Eligibility is not fully listed in the current record. Confirm
                  it on the official source before applying.
                </p>
              )}
              <p className={styles.boundaryNote}>
                Eligibility describes the call’s stated rules. It is not a
                promise that an applicant qualifies.
              </p>
            </section>

            <section aria-labelledby="prepare-title">
              <h2 id="prepare-title">What to prepare</h2>
              {opportunity.requiredMaterials.length ? (
                <dl className={styles.requirementList}>
                  {opportunity.requiredMaterials.map((material) => (
                    <div key={material.label}>
                      <dt>
                        <FileText aria-hidden="true" />
                        {material.label}
                      </dt>
                      <dd>
                        {material.description ??
                          material.limit ??
                          (material.required ? "Required" : "Optional")}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p>
                  Required materials are not fully listed. Review the official
                  source before preparing files.
                </p>
              )}
              <PrepareChecklist
                opportunityId={opportunity.id}
                enabled={signedIn && tracked}
              />
            </section>

            {hasPolicies ? (
              <section aria-labelledby="policies-title">
                <h2 id="policies-title">Submission policies</h2>
                <dl className={styles.requirementList}>
                  <div><dt><Files aria-hidden="true" />Simultaneous submissions</dt><dd>{policyLabel(opportunity.simultaneousAllowed)}</dd></div>
                  <div><dt><Files aria-hidden="true" />Multiple submissions</dt><dd>{policyLabel(call?.multipleSubmissionsAllowed)}</dd></div>
                  <div><dt><BookOpenText aria-hidden="true" />Previously published work</dt><dd>{call?.previouslyUnpublishedRequired === true ? "Must be unpublished" : call?.previouslyUnpublishedRequired === false ? "Previously published work may be accepted" : "Not listed"}</dd></div>
                  <div><dt><Scale aria-hidden="true" />Reprints</dt><dd>{policyLabel(call?.reprintsAllowed)}</dd></div>
                  <div><dt><ShieldCheck aria-hidden="true" />Rights</dt><dd>{call?.rightsSummary ?? "Not listed"}</dd></div>
                </dl>
              </section>
            ) : null}

            {call ? (
              <section aria-labelledby="terms-title">
                <h2 id="terms-title">Reading window, payment, and judging</h2>
                <dl className={styles.requirementList}>
                  <div><dt><Clock3 aria-hidden="true" />Reading period</dt><dd>{call.readingPeriodLabel ?? readingPeriodLabel(call.readingPeriodKind)}</dd></div>
                  <div><dt><Coins aria-hidden="true" />Payment</dt><dd>{call.paymentType === "none" ? "No payment" : call.paymentType === "unknown" ? "Not listed" : payment ?? call.paymentType?.replaceAll("-", " ") ?? "Not listed"}</dd></div>
                  <div><dt><Users aria-hidden="true" />Judge</dt><dd>{call.judgeName ?? call.prizes.find((prize) => prize.judgeName)?.judgeName ?? "Not listed"}</dd></div>
                  <div><dt><Clock3 aria-hidden="true" />Response time</dt><dd>{call.responseTimeDays !== undefined ? `About ${call.responseTimeDays} days` : "Not listed"}</dd></div>
                </dl>
                {call.prizes.length ? (
                  <div className={styles.prizeList}>
                    {call.prizes.map((prize, index) => (
                      <div key={`${prize.sourceUrl}-${index}`}>
                        <Award aria-hidden="true" />
                        <div><strong>{prize.title ?? `Prize ${prize.rank ?? index + 1}`}</strong><span>{compactMoney(prize.amountCents, prize.currency) ?? prize.description ?? "Amount not listed"}</span></div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            <section aria-labelledby="organization-title">
              <h2 id="organization-title">Who is behind this opportunity</h2>
              <div className={styles.authorityCard}>
                {relatedProfile?.mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={relatedProfile.mediaUrl} alt="" />
                ) : <Building2 aria-hidden="true" />}
                <div>
                  <strong>{opportunity.organizationName ?? "Organization not confirmed"}</strong>
                  {relatedProfile ? <Link href={`/journals/${encodeURIComponent(relatedProfile.id)}`}>View publisher profile</Link> : opportunity.organizationId ? <Link href={`/org/${encodeURIComponent(opportunity.organizationId)}`}>View Organization profile</Link> : <span>Public Organization profile not yet linked</span>}
                  {opportunity.relatedOpportunityIds.length ? <span>{opportunity.relatedOpportunityIds.length} other open {opportunity.relatedOpportunityIds.length === 1 ? "opportunity" : "opportunities"}</span> : <span>No other open opportunities are currently linked.</span>}
                </div>
              </div>
            </section>

            {unknowns.length || opportunity.changes.length ? (
              <section aria-labelledby="record-state-title">
                <h2 id="record-state-title">What still needs confirmation</h2>
                {unknowns.length ? <ul className={styles.unknownList}>{unknowns.map((item) => <li key={item}><CircleHelp aria-hidden="true" />{item}</li>)}</ul> : <p>No major decision fields are currently marked unknown.</p>}
                {opportunity.changes.length ? <p className={styles.boundaryNote}>{opportunity.changes.length} recent {opportunity.changes.length === 1 ? "change is" : "changes are"} recorded. Confirm time-sensitive details on the official page.</p> : null}
              </section>
            ) : null}

            <section aria-labelledby="categories-title">
              <h2 id="categories-title">Categories named in this call</h2>
              {practiceLabels.length ? (
                <div className={styles.practiceList}>
                  {practiceLabels.map((practice) => (
                    <Badge key={practice} variant="secondary">
                      {practice}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p>Categories are not yet listed for this record.</p>
              )}
              <p className={styles.boundaryNote}>
                Categories describe the work. They remain separate from
                eligibility and geography.
              </p>
            </section>

            <section
              className={styles.sourceSection}
              aria-labelledby="source-title"
            >
              <h2 id="source-title">
                {officialHref ? "Finish on the official source" : "Continue from the original listing"}
              </h2>
              <p>
                {officialHref
                  ? "Missa helps you understand and track the opportunity. The Organization’s page carries the final rules and application destination."
                  : "Missa helps you understand and track the opportunity. An official application destination is not linked yet; use the original listing to confirm the final rules and where to apply."}
              </p>
              <div className={styles.sourceSectionActions}>
                <a
                  className={styles.sourceButton}
                  href={destinationHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  {destinationLabel} <ExternalLink aria-hidden="true" />
                </a>
                {signedIn ? (
                  <div className={styles.productReport}>
                    <OpportunityIssueReport opportunityId={opportunity.id} />
                  </div>
                ) : (
                  <Link
                    className={styles.reportTrigger}
                    href={`/login?next=${encodeURIComponent(canonicalPath)}`}
                  >
                    <Flag aria-hidden="true" />
                    Sign in to report an issue
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
