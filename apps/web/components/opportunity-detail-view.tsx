import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpenText,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Coins,
  ExternalLink,
  EyeOff,
  FileText,
  Files,
  Flag,
  Globe2,
  Scale,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCheck,
  Users,
} from "lucide-react";
import type { OpportunityDetailProjection } from "@missa/radar-engine";
import {
  type ProfileCard,
  type ProfileDetail,
  getSemanticUrlForProfile,
} from "@missa/radar-adapters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SaveToTrackerButton } from "@/components/save-to-tracker-button";
import { OpportunityIssueReport } from "@/components/opportunity-issue-report";
import { PrepareChecklist } from "@/components/prepare-checklist";
import { FollowButton } from "@/components/follow-button";
import { MobileActionDock } from "@/components/mobile-action-dock";
import { decodeHtmlEntities } from "@/lib/textUtils";
import { cn } from "@/lib/utils";
import styles from "./opportunity-detail.module.css";

function initials(name: string): string {
  return (
    name
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

function getDeadlineUrgency(deadline: OpportunityDetailProjection["deadline"]): {
  label: string;
  urgent: boolean;
} {
  if (!deadline.date) {
    if (deadline.kind === "rolling") return { label: "Rolling deadline", urgent: false };
    if (deadline.kind === "until-filled") return { label: "Until filled", urgent: false };
    return { label: "Deadline open", urgent: false };
  }

  const target = new Date(`${deadline.date}T23:59:59`);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formattedDate = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(target);

  if (diffDays < 0) {
    return { label: `Closed ${formattedDate}`, urgent: false };
  }
  if (diffDays === 0) {
    return { label: "Closes today", urgent: true };
  }
  if (diffDays === 1) {
    return { label: "Closes tomorrow", urgent: true };
  }
  if (diffDays <= 7) {
    return { label: `Closes ${formattedDate} · ${diffDays} days left`, urgent: true };
  }
  if (diffDays <= 30) {
    return { label: `Closes ${formattedDate} · ${diffDays} days left`, urgent: false };
  }
  return { label: `Closes ${formattedDate}`, urgent: false };
}

function getFeeBadge(opportunity: OpportunityDetailProjection): {
  label: string;
  isFree: boolean;
} {
  if (opportunity.fee.status === "no-fee" || opportunity.fee.amountCents === 0) {
    return { label: "Free to enter", isFree: true };
  }
  if (opportunity.fee.amountCents !== undefined && opportunity.fee.currency) {
    const currency = /^[A-Z]{3}$/u.test(opportunity.fee.currency)
      ? opportunity.fee.currency
      : undefined;
    const formatted = currency
      ? new Intl.NumberFormat("en", { style: "currency", currency }).format(
          opportunity.fee.amountCents / 100,
        )
      : `${opportunity.fee.currency}${(opportunity.fee.amountCents / 100).toFixed(2)}`;
    return { label: `${formatted} fee`, isFree: false };
  }
  if (opportunity.fee.status === "paid") {
    return { label: "Entry fee required", isFree: false };
  }
  return { label: "Free to enter", isFree: true };
}

function compactMoney(amountCents?: number, currency?: string): string | undefined {
  if (amountCents === undefined || !currency) return undefined;
  if (!/^[A-Z]{3}$/u.test(currency)) return `${currency}${(amountCents / 100).toFixed(2)}`;
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amountCents / 100);
}

function getPrizeBadge(opportunity: OpportunityDetailProjection): string | null {
  const call = opportunity.callProfile;
  if (opportunity.prize && opportunity.prize.trim()) {
    return decodeHtmlEntities(opportunity.prize);
  }
  if (call?.prizeSummary && call.prizeSummary.trim()) {
    return decodeHtmlEntities(call.prizeSummary);
  }
  if (call?.paymentAmountCents && call.paymentCurrency) {
    const pay = compactMoney(call.paymentAmountCents, call.paymentCurrency);
    if (pay) return `${pay} payment`;
  }
  return null;
}

function getLimitsBadge(call: OpportunityDetailProjection["callProfile"]): string | null {
  if (!call) return null;
  if (call.wordLimitMax) {
    if (call.wordLimitMin) return `${call.wordLimitMin.toLocaleString()}–${call.wordLimitMax.toLocaleString()} words`;
    return `Up to ${call.wordLimitMax.toLocaleString()} words`;
  }
  if (call.pageLimitMax) {
    if (call.pageLimitMin) return `${call.pageLimitMin}–${call.pageLimitMax} pages`;
    return `Up to ${call.pageLimitMax} pages`;
  }
  return null;
}

function getScopeBadge(location: string | undefined): string {
  if (!location) return "Open worldwide";
  const lower = location.toLowerCase();
  if (lower.includes("international") || lower.includes("global") || lower.includes("worldwide")) {
    return "Open worldwide";
  }
  if (lower.includes("remote") || lower.includes("online")) {
    return "Remote / Online";
  }
  return location;
}

function getOrganizerProfileUrl(
  profile: ProfileCard | ProfileDetail | undefined,
  organizationId: string | undefined,
): string | null {
  if (profile?.slug) {
    return getSemanticUrlForProfile(profile.kind, profile.slug);
  }
  if (organizationId) {
    return `/org/${encodeURIComponent(organizationId)}`;
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
  relatedProfile?: ProfileCard | ProfileDetail;
}) {
  const tracked = Boolean(opportunity.personal?.tracked);
  const canonicalPath = `/opportunities/${opportunity.slug}`;
  const officialHref = opportunity.guidelinesUrl ?? opportunity.submissionUrl;
  const destinationHref = officialHref ?? opportunity.source.url;
  const destinationLabel = officialHref ? "Open Official Application" : "Open Original Listing";

  const call = opportunity.callProfile;
  const profileIntelligence = (relatedProfile as ProfileDetail | undefined)?.intelligence;

  // Photographic identity asset (if cleared/permitted)
  const identityAssetUrl = opportunity.identityAssetUrl;
  const identityAssetAlt = opportunity.identityAssetAlt ?? opportunity.title;

  // Decoded title and organization
  const cleanTitle = decodeHtmlEntities(opportunity.title);
  const organizerName = decodeHtmlEntities(
    opportunity.organizationName ?? relatedProfile?.name ?? "Host Organization",
  );
  const organizerUrl = getOrganizerProfileUrl(relatedProfile, opportunity.organizationId);

  // Type identification
  const isGrant =
    opportunity.type === "grant" ||
    opportunity.type === "fellowship" ||
    opportunity.type === "award" ||
    opportunity.type === "scholarship";
  const isResidency = opportunity.type === "residency";
  const isExhibition = opportunity.type === "exhibition" || opportunity.type === "open-call";
  const isLiterary =
    opportunity.type === "magazine" ||
    (opportunity.discipline && /literature|writing|poetry|fiction|nonfiction/i.test(opportunity.discipline));

  // Context-aware section titles
  const readingHeading = isGrant
    ? "About this Grant & Funding"
    : isResidency
      ? "About the Residency & Program"
      : isExhibition
        ? "About the Exhibition & Call"
        : "The Call for Submissions";

  const readingBadge = isGrant
    ? "Funding & Scope"
    : isResidency
      ? "Residency Overview"
      : isExhibition
        ? "Curatorial Vision"
        : "Editorial Vision";

  const dossierHeading = isGrant
    ? "Application Checklist & Materials"
    : isResidency
      ? "What to Prepare (Portfolio & Proposal)"
      : isExhibition
        ? "What to Prepare (Exhibition Materials)"
        : "What to Prepare (Submission Dossier)";

  const dossierBadge = isGrant
    ? "Application Checklist"
    : isResidency
      ? "Proposal Dossier"
      : "Submission Dossier";

  // Signal Badges
  const deadlineUrgency = getDeadlineUrgency(opportunity.deadline);
  const feeBadge = getFeeBadge(opportunity);
  const prizeBadge = getPrizeBadge(opportunity);
  const limitsBadge = getLimitsBadge(call);
  const scopeBadge = getScopeBadge(opportunity.location);

  // Editorial Call / Grant Narrative Text
  const rawCallText =
    opportunity.content?.description ||
    opportunity.content?.summary ||
    summary ||
    "";
  const cleanCallText = decodeHtmlEntities(rawCallText);
  const callParagraphs = cleanCallText
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Discipline chip text
  const disciplineChip =
    opportunity.discipline && opportunity.discipline !== "all-disciplines"
      ? opportunity.discipline
      : opportunity.genres[0]
        ? `${typeLabel(opportunity.type)} · ${opportunity.genres[0]}`
        : typeLabel(opportunity.type);

  // Blind / Anonymity detection
  const isBlind = Boolean(
    call?.eligibilitySummary?.toLowerCase().includes("blind") ||
      call?.rightsSummary?.toLowerCase().includes("blind") ||
      opportunity.requiredMaterials.some((m) =>
        (m.label + (m.description ?? "")).toLowerCase().includes("blind") ||
        (m.label + (m.description ?? "")).toLowerCase().includes("anonymous"),
      ),
  );

  const hasEligibility =
    opportunity.eligibility.length > 0 || Boolean(call?.eligibilitySummary);

  return (
    <main id="main-content" className={styles.main}>
      <Link className={styles.backLink} href="/opportunities">
        <ArrowLeft aria-hidden="true" />
        Back to opportunities
      </Link>

      <article aria-labelledby="opportunity-title">
        {/* ==================================================================
            1. THE FAST-SCAN LAYER (Labels, Badges & Chips)
            ================================================================== */}
        <header className={styles.heroCard}>
          <div
            className={cn(
              styles.heroHeader,
              identityAssetUrl && styles.heroHeaderWithMedia,
            )}
          >
            <div>
              {/* Byline & Organizer */}
              <div className={styles.heroByline}>
                <span>by</span>
                {organizerUrl ? (
                  <Link href={organizerUrl} className={styles.organizerLink}>
                    {organizerName}
                  </Link>
                ) : (
                  <span className="font-semibold text-foreground">{organizerName}</span>
                )}
                {opportunity.organizationVerified ? (
                  <span className={styles.verifiedBadge}>
                    <ShieldCheck aria-hidden="true" />
                    Verified Host
                  </span>
                ) : null}
                {userId && opportunity.organizationId && !opportunity.personal?.followingOrganization ? (
                  <FollowButton
                    userId={userId}
                    organizationId={opportunity.organizationId}
                    organizationName={opportunity.organizationName}
                  />
                ) : opportunity.personal?.followingOrganization ? (
                  <span className="text-xs text-muted-foreground">· Following</span>
                ) : null}
              </div>

              {/* Title */}
              <h1 id="opportunity-title" className={cn(styles.heroTitle, "font-serif")}>
                {cleanTitle}
              </h1>

              {/* Scannable Signal Badges (Chips) */}
              <div className={styles.badgeCluster} aria-label="Key signals at a glance">
                {/* 1. Fee */}
                <span
                  className={styles.signalChip}
                  data-tone={feeBadge.isFree ? "free" : undefined}
                >
                  <Tag aria-hidden="true" />
                  {feeBadge.label}
                </span>

                {/* 2. Prize / Award / Funding */}
                {prizeBadge ? (
                  <span className={styles.signalChip} data-tone="prize">
                    <Award aria-hidden="true" />
                    {prizeBadge}
                  </span>
                ) : null}

                {/* 3. Deadline Countdown */}
                <span
                  className={styles.signalChip}
                  data-tone={deadlineUrgency.urgent ? "urgent" : undefined}
                >
                  <Clock3 aria-hidden="true" />
                  {deadlineUrgency.label}
                </span>

                {/* 4. Discipline / Type */}
                <span className={styles.signalChip}>
                  <BookOpenText aria-hidden="true" />
                  {disciplineChip}
                </span>

                {/* 5. Limits (if literary / specified) */}
                {limitsBadge ? (
                  <span className={styles.signalChip}>
                    <FileText aria-hidden="true" />
                    {limitsBadge}
                  </span>
                ) : null}

                {/* 6. Simultaneous Submissions (only if relevant) */}
                {isLiterary && opportunity.simultaneousAllowed !== undefined ? (
                  <span className={styles.signalChip}>
                    <Files aria-hidden="true" />
                    {opportunity.simultaneousAllowed ? "Simultaneous OK" : "No simultaneous"}
                  </span>
                ) : null}

                {/* 7. Blind Reading */}
                {isBlind ? (
                  <span className={styles.signalChip} data-tone="primary">
                    <EyeOff aria-hidden="true" />
                    Blind review
                  </span>
                ) : null}

                {/* 8. Scope / Reach */}
                <span className={styles.signalChip}>
                  <Globe2 aria-hidden="true" />
                  {scopeBadge}
                </span>
              </div>
            </div>

            {/* Optional Authentic Photography Banner */}
            {identityAssetUrl ? (
              <div className={styles.heroVisual}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={identityAssetUrl}
                  alt={identityAssetAlt}
                  className={styles.heroImage}
                />
              </div>
            ) : null}
          </div>

          {/* Hero Two-Way Action Bar */}
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
                opportunityTitle={cleanTitle}
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
        </header>

        {/* ==================================================================
            Content Grid (Reading Column + Aside Rail)
            ================================================================== */}
        <div className={styles.contentGrid}>
          {/* Main Reading Column */}
          <div className={styles.readingColumn}>
            {/* 2. THE READING LAYER (Call / Overview) */}
            <section className={styles.callSection} aria-labelledby="call-title">
              <div className={styles.sectionHeader}>
                <h2 id="call-title" className="font-serif">
                  {readingHeading}
                </h2>
                <span className={styles.sectionHeaderLabel}>
                  <Sparkles aria-hidden="true" />
                  {readingBadge}
                </span>
              </div>

              {/* Theme Callout */}
              {call?.issueTheme ? (
                <div className={styles.themeCallout}>
                  <span className={styles.themeLabel}>Theme & Prompt</span>
                  <p className={cn(styles.themeText, "font-serif")}>
                    {decodeHtmlEntities(call.issueTheme)}
                  </p>
                </div>
              ) : null}

              {/* Narrative Text */}
              <div className={styles.callBody}>
                {callParagraphs.length ? (
                  callParagraphs.map((para, index) => (
                    <p key={index} className={cn(styles.callParagraph, "font-serif")}>
                      {para}
                    </p>
                  ))
                ) : (
                  <p className={cn(styles.callParagraph, "font-serif")}>
                    Review the official listing for complete details and guidelines.
                  </p>
                )}
              </div>
            </section>

            {/* 3. ELIGIBILITY & CRITERIA (Who Can Apply) */}
            {hasEligibility ? (
              <section className={styles.eligibilitySection} aria-labelledby="eligibility-title">
                <div className={styles.sectionHeader}>
                  <h2 id="eligibility-title" className="font-serif">
                    Who Is Eligible
                  </h2>
                  <span className={styles.sectionHeaderLabel}>
                    <UserCheck aria-hidden="true" />
                    Eligibility Criteria
                  </span>
                </div>

                {call?.eligibilitySummary ? (
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    {decodeHtmlEntities(call.eligibilitySummary)}
                  </p>
                ) : null}

                {opportunity.eligibility.length ? (
                  <div className={styles.eligibilityGrid}>
                    {opportunity.eligibility.map((rule) => (
                      <div key={rule.key} className={styles.eligibilityItem}>
                        <span className={styles.eligibilityCheck}>
                          <Check aria-hidden="true" />
                        </span>
                        <div className={styles.eligibilityContent}>
                          <span className={styles.eligibilityLabel}>
                            {decodeHtmlEntities(rule.description)}
                          </span>
                          {rule.value ? (
                            <span className={styles.eligibilityDetail}>
                              Rule: {decodeHtmlEntities(rule.value)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* 4. THE SUBMISSION DOSSIER (What to Prepare) */}
            <section className={styles.dossierSection} aria-labelledby="dossier-title">
              <div className={styles.sectionHeader}>
                <h2 id="dossier-title" className="font-serif">
                  {dossierHeading}
                </h2>
                <span className={styles.sectionHeaderLabel}>
                  <ShieldCheck aria-hidden="true" />
                  {dossierBadge}
                </span>
              </div>

              <div className={styles.dossierGrid}>
                {/* 1. Stated Required Materials from DB */}
                {opportunity.requiredMaterials.map((material) => (
                  <div key={material.label} className={styles.dossierItem}>
                    <span className={styles.dossierCheck}>
                      <Check aria-hidden="true" />
                    </span>
                    <div className={styles.dossierContent}>
                      <span className={styles.dossierLabel}>
                        {decodeHtmlEntities(material.label)}
                      </span>
                      <span className={styles.dossierDetail}>
                        {material.description
                          ? decodeHtmlEntities(material.description)
                          : material.limit
                            ? `Limit: ${material.limit}`
                            : material.required
                              ? "Required submission document"
                              : "Optional supporting material"}
                      </span>
                    </div>
                  </div>
                ))}

                {/* 2. Literary Manuscript & Limits (only if literary or explicitly limited) */}
                {isLiterary ? (
                  <div className={styles.dossierItem}>
                    <span className={styles.dossierCheck}>
                      <Check aria-hidden="true" />
                    </span>
                    <div className={styles.dossierContent}>
                      <span className={styles.dossierLabel}>Manuscript & Work</span>
                      <span className={styles.dossierDetail}>
                        {limitsBadge ? `${limitsBadge} · ` : ""}
                        {call?.acceptedFormats?.length
                          ? `Accepted: ${call.acceptedFormats.join(", ")}`
                          : "Standard file formats (.pdf / .docx)"}
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* 3. Anonymity / Blind Reading (only if explicitly blind) */}
                {isBlind ? (
                  <div className={styles.dossierItem}>
                    <span className={styles.dossierCheck}>
                      <Check aria-hidden="true" />
                    </span>
                    <div className={styles.dossierContent}>
                      <span className={styles.dossierLabel}>Anonymity Guidelines</span>
                      <span className={styles.dossierDetail}>
                        Blind review: do not include your name or identifying contact info on the submitted work.
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* 4. Rights & Licensing (only if stated or literary) */}
                {call?.rightsSummary ? (
                  <div className={styles.dossierItem}>
                    <span className={styles.dossierCheck}>
                      <Check aria-hidden="true" />
                    </span>
                    <div className={styles.dossierContent}>
                      <span className={styles.dossierLabel}>Rights & Policies</span>
                      <span className={styles.dossierDetail}>
                        {decodeHtmlEntities(call.rightsSummary)}
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* If nothing is in requiredMaterials and not literary, provide clear notice */}
                {!opportunity.requiredMaterials.length && !isLiterary ? (
                  <div className={styles.dossierItem}>
                    <span className={styles.dossierCheck}>
                      <Check aria-hidden="true" />
                    </span>
                    <div className={styles.dossierContent}>
                      <span className={styles.dossierLabel}>Standard Application Portal</span>
                      <span className={styles.dossierDetail}>
                        Complete the application form directly on the official host website. Check the portal for any specific file uploads.
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Interactive tracker checklist if tracked & signed in */}
              <div className="mt-6">
                <PrepareChecklist
                  opportunityId={opportunity.id}
                  enabled={signedIn && tracked}
                />
              </div>
            </section>

            {/* Categories and Practice Tags */}
            {practiceLabels.length ? (
              <section className={styles.categoriesSection} aria-labelledby="tags-title">
                <h3 id="tags-title">Tags & Focus Areas</h3>
                <div className={styles.tagCluster}>
                  {practiceLabels.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </section>
            ) : null}

            {/* 5. Bottom Two-Way Action Dock & Community Integrity */}
            <section className={styles.bottomActionDock} aria-labelledby="bottom-action-title">
              <div className={styles.bottomActionDockLeft}>
                <strong id="bottom-action-title">Ready to apply or track?</strong>
                <span>
                  Save this call to receive deadline reminders, or proceed to the official portal.
                </span>
                {signedIn ? (
                  <div className="mt-2">
                    <OpportunityIssueReport opportunityId={opportunity.id} />
                  </div>
                ) : (
                  <Link
                    className={styles.reportQuietLink}
                    href={`/login?next=${encodeURIComponent(canonicalPath)}`}
                  >
                    <Flag aria-hidden="true" />
                    Flag an inaccuracy
                  </Link>
                )}
              </div>

              <div className={styles.bottomActionDockButtons}>
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
                    opportunityTitle={cleanTitle}
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
            </section>
          </div>

          {/* ==================================================================
              Aside Decision Rail (Host Intelligence & Key Facts)
              ================================================================== */}
          <aside className={styles.decisionRail} aria-label="Host intelligence and facts">
            {/* 4. THE ORGANIZER & HONEST ODDS */}
            <div className={styles.organizerCard}>
              <div className={styles.organizerCardHeader}>
                {relatedProfile?.mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={relatedProfile.mediaUrl}
                    alt=""
                    className={styles.organizerMedia}
                  />
                ) : (
                  <div className={styles.organizerAvatarFallback} aria-hidden="true">
                    {initials(organizerName)}
                  </div>
                )}
                <div>
                  <h3 className={styles.organizerName}>{organizerName}</h3>
                  <span className={styles.organizerKind}>
                    {relatedProfile?.kind ? typeLabel(relatedProfile.kind as any) : typeLabel(opportunity.type)}
                  </span>
                </div>
              </div>

              <div className={styles.organizerSignals}>
                {/* Prestige / Demeanor */}
                {profileIntelligence?.editorialArchetype || profileIntelligence?.prestigeTier ? (
                  <div className={styles.signalRow}>
                    <span className={styles.signalLabel}>
                      <Award aria-hidden="true" />
                      Reputation
                    </span>
                    <span className={styles.signalValue}>
                      {profileIntelligence.prestigeTier || profileIntelligence.editorialArchetype}
                    </span>
                  </div>
                ) : null}

                {/* Average Response Time */}
                <div className={styles.signalRow}>
                  <span className={styles.signalLabel}>
                    <Clock3 aria-hidden="true" />
                    Turnaround
                  </span>
                  <span className={styles.signalValue}>
                    {call?.responseTimeDays
                      ? `~${call.responseTimeDays} days`
                      : profileIntelligence?.responseLabel ?? "Standard cycle"}
                  </span>
                </div>

                {/* Reading Period */}
                {call?.readingPeriodLabel ? (
                  <div className={styles.signalRow}>
                    <span className={styles.signalLabel}>
                      <CalendarDays aria-hidden="true" />
                      Application Window
                    </span>
                    <span className={styles.signalValue}>{call.readingPeriodLabel}</span>
                  </div>
                ) : null}

                {/* Other Opportunities */}
                {opportunity.relatedOpportunityIds.length ? (
                  <div className={styles.signalRow}>
                    <span className={styles.signalLabel}>
                      <Building2 aria-hidden="true" />
                      Active Calls
                    </span>
                    <span className={styles.signalValue}>
                      {opportunity.relatedOpportunityIds.length} other{" "}
                      {opportunity.relatedOpportunityIds.length === 1 ? "call" : "calls"}
                    </span>
                  </div>
                ) : null}
              </div>

              {organizerUrl ? (
                <div className={styles.organizerCardActions}>
                  <Link href={organizerUrl} className={styles.profileButton}>
                    View Institution Profile →
                  </Link>
                </div>
              ) : null}
            </div>

            {/* Quick Fact Snapshot */}
            <div className={styles.factCard}>
              <h3>Decision Snapshot</h3>
              <dl className={styles.factList}>
                <div className={styles.factRow}>
                  <dt className={styles.factTerm}>
                    <CalendarDays aria-hidden="true" />
                    Deadline
                  </dt>
                  <dd className={styles.factDefinition}>
                    {opportunity.deadline.date ?? "Rolling"}
                  </dd>
                </div>
                <div className={styles.factRow}>
                  <dt className={styles.factTerm}>
                    <Tag aria-hidden="true" />
                    Fee
                  </dt>
                  <dd className={styles.factDefinition}>{feeBadge.label}</dd>
                </div>
                {prizeBadge ? (
                  <div className={styles.factRow}>
                    <dt className={styles.factTerm}>
                      <Coins aria-hidden="true" />
                      Award / Pay
                    </dt>
                    <dd className={styles.factDefinition}>{prizeBadge}</dd>
                  </div>
                ) : null}
                <div className={styles.factRow}>
                  <dt className={styles.factTerm}>
                    <Globe2 aria-hidden="true" />
                    Reach
                  </dt>
                  <dd className={styles.factDefinition}>{scopeBadge}</dd>
                </div>
                <div className={styles.factRow}>
                  <dt className={styles.factTerm}>
                    <Users aria-hidden="true" />
                    Type
                  </dt>
                  <dd className={styles.factDefinition}>{typeLabel(opportunity.type)}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>

        {/* Mobile Sticky Action Bar */}
        <MobileActionDock className={styles.mobileActions}>
          {tracked ? (
            <Button
              nativeButton={false}
              render={<Link href="/tracker" />}
              variant="secondary"
            >
              <Check aria-hidden="true" /> In Tracker
            </Button>
          ) : (
            <SaveToTrackerButton
              opportunityId={opportunity.id}
              signedIn={signedIn}
              returnTo={canonicalPath}
              opportunityTitle={cleanTitle}
            />
          )}
          <a href={destinationHref} target="_blank" rel="noreferrer">
            Apply ↗
          </a>
        </MobileActionDock>
      </article>
    </main>
  );
}
