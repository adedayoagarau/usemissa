import type { ProfileDetail } from "@missa/radar-adapters";
import Link from "next/link";
import { InstitutionSocialLinks } from "./institution-social-links";
import editorialMedia from "@/lib/profile-editorial-media.json";
import { Fragment, type ReactNode } from "react";
import {
  PROFILE_LAYOUTS,
  type ProfileSection,
} from "./institution-profile-layout";
import { ArrowLeft, ArrowUpRight, ArrowRight, MapPin } from "lucide-react";
import { KIND_METADATA } from "./institution-directory-view";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Empty, EmptyDescription } from "./ui/empty";
import { MagazineScheduleBadge } from "./ui/magazine-schedule-badge";
import {
  InstitutionMediaGallery,
  type InstitutionGalleryImage,
} from "./institution-media-gallery";
import {
  cleanCrawledNarrative,
  cleanTitleOrLabel,
  decodeHtmlEntities,
} from "@/lib/textUtils";
import styles from "./institution-profile.module.css";

function safeHref(value?: string | null): string | undefined {
  if (!value) return;
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    if (["https:", "http:"].includes(url.protocol)) return url.href;
  } catch {
    return;
  }
}
function humanize(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
export function InstitutionProfileView({
  profile, rankingSummary, journalDetails, opportunityActions,
}: {
  profile: ProfileDetail;
  rankingSummary?: ReactNode;
  journalDetails?: ReactNode;
  opportunityActions?: Record<string, ReactNode>;
}) {
  const meta = KIND_METADATA[profile.kind] || KIND_METADATA.all;
  const Icon = meta.icon;
  const layout = PROFILE_LAYOUTS[profile.kind] || PROFILE_LAYOUTS.organization;
  const publication = ["literary_magazine", "small_press"].includes(
    profile.kind,
  );
  const journal = profile.kind === "literary_magazine";
  const website = safeHref(profile.websiteUrl);
  const guidelines = safeHref(profile.submissionGuidelinesUrl);
  const about = cleanCrawledNarrative(
    profile.editorialProfile?.overview ||
      profile.editorialFocus ||
      profile.summary ||
      "",
  );
  const images: InstitutionGalleryImage[] = [];
  const addImage = (
    url: string | null,
    label: string,
    cover: boolean,
    opts?: {
      group?: "issues" | "books" | "photos" | "exhibitions" | "projects" | "identity";
      subtitle?: string | null;
      credit?: string | null;
      dateLabel?: string | null;
      officialUrl?: string | null;
      readingUrl?: string | null;
      purchaseUrl?: string | null;
    }
  ) => {
    if (
      url &&
      url !== profile.logoUrl &&
      !images.some((image) => image.url === url)
    ) {
      images.push({
        url,
        label: decodeHtmlEntities(label),
        cover,
        group: opts?.group,
        subtitle: opts?.subtitle ? decodeHtmlEntities(opts.subtitle) : undefined,
        credit: opts?.credit ? decodeHtmlEntities(opts.credit) : undefined,
        dateLabel: opts?.dateLabel ? decodeHtmlEntities(opts.dateLabel) : undefined,
        officialUrl: opts?.officialUrl || undefined,
        readingUrl: opts?.readingUrl || undefined,
        purchaseUrl: opts?.purchaseUrl || undefined,
      });
    }
  };

  // 1. If we have authentic discovered media in mediaBundle, load from all available groups
  const mb = profile.mediaBundle;
  if (mb) {
    if (mb.books.items.length > 0) {
      for (const b of mb.books.items) {
        addImage(b.imageUrl, b.title, true, {
          group: "books",
          subtitle: b.subtitle,
          credit: b.creatorCredit,
          dateLabel: b.publicationDateRaw || (b.publicationYear ? String(b.publicationYear) : null),
          officialUrl: b.officialUrl,
          readingUrl: b.readingUrl,
          purchaseUrl: b.purchaseUrl,
        });
      }
    }
    if (mb.issues.items.length > 0) {
      for (const iss of mb.issues.items) {
        addImage(iss.imageUrl, iss.title, true, {
          group: "issues",
          subtitle: iss.subtitle,
          dateLabel: iss.publicationDateRaw,
          officialUrl: iss.officialUrl,
          readingUrl: iss.readingUrl,
          purchaseUrl: iss.purchaseUrl,
        });
      }
    }
    if (mb.photos.items.length > 0) {
      for (const p of mb.photos.items) {
        addImage(p.imageUrl, p.title, false, {
          group: "photos",
          subtitle: p.subtitle,
          credit: p.creatorCredit,
          officialUrl: p.officialUrl,
        });
      }
    }
    if (mb.exhibitions.items.length > 0) {
      for (const ex of mb.exhibitions.items) {
        addImage(ex.imageUrl, ex.title, false, {
          group: "exhibitions",
          subtitle: ex.subtitle,
          credit: ex.creatorCredit,
          dateLabel: ex.publicationDateRaw,
          officialUrl: ex.officialUrl,
        });
      }
    }
    if (mb.projects.items.length > 0) {
      for (const pr of mb.projects.items) {
        addImage(pr.imageUrl, pr.title, false, {
          group: "projects",
          subtitle: pr.subtitle,
          credit: pr.creatorCredit,
          dateLabel: pr.publicationDateRaw,
          officialUrl: pr.officialUrl,
        });
      }
    }
  }

  const curated = (
    editorialMedia as Record<
      string,
      { source: string; images: InstitutionGalleryImage[] }
    >
  )[profile.slug];

  // 2. Fallback to existing visuals or banner if mediaBundle had no group items
  if (images.length === 0) {
    addImage(
      profile.bannerUrl,
      profile.bannerAlt || `${profile.name} — overview`,
      false,
    );
    if (publication) images.length = 0;
    for (const visual of profile.visuals ?? []) {
      if (
        visual.assetType !== "logo" &&
        (!publication || visual.assetType === "issue_cover")
      ) {
        addImage(
          visual.imageUrl,
          [
            visual.label ||
              (visual.assetType === "issue_cover" ? "Issue cover" : profile.name),
            visual.season,
            visual.issueYear,
          ]
            .filter(Boolean)
            .join(" · "),
          visual.assetType === "issue_cover",
        );
      }
    }
    if (!publication && !images.length && curated) images.push(...curated.images);
  }
  // Preserve issue art present in the legacy profile even when grouped media exists.
  if (journal) for (const visual of profile.visuals ?? []) {
    if (visual.assetType === "issue_cover") addImage(visual.imageUrl,
      [visual.label || "Issue cover", visual.season, visual.issueYear].filter(Boolean).join(" · "), true, {group:"issues"});
  }
  const submissionFactLabels = new Set(["Reading period", "Reading fee", "Payment", "Response time", "Unsolicited submissions", "Simultaneous submissions"]);
  const facts = [
    ["Founded", profile.intelligence?.foundingYear],
    ["Formats", profile.formats.join(", ")],
    ["Circulation", profile.circulation],
    [
      publication ? "Reading period" : "Application window",
      publication && profile.schedule?.badgeLabel && profile.readingPeriod && !profile.readingPeriod.toLowerCase().includes(profile.schedule.badgeLabel.toLowerCase())
        ? `${profile.readingPeriod} · ${profile.schedule.badgeLabel}`
        : profile.readingPeriod || profile.schedule?.badgeLabel,
    ],
    [publication ? "Reading fee" : "Application fee", profile.readingFee],
    ...(publication
      ? [
          ["Payment", profile.payment],
          ["Response time", profile.responseTime],
          ["Unsolicited submissions", profile.unsolicitedSubmissions],
          ["Simultaneous submissions", profile.simultaneousSubmissions],
        ]
      : []),
    ...(profile.kind === "literary_magazine"
      ? [
          ["Issues per year", profile.issuesPerYear],
          ["Issue price", profile.issuePrice],
          ["Subscription", profile.subscriptionPrice],
        ]
      : []),
    ...(profile.kind === "small_press"
      ? [
          ["Titles per year", profile.titlesPerYear],
          ["Contest-only publishing", profile.publishesThroughContestsOnly],
        ]
      : []),
  ].filter(
    ([label, value]) => value !== null && value !== undefined && value !== "" && !(journal && submissionFactLabels.has(String(label))),
  );
  const focusText = cleanCrawledNarrative(profile.editorialFocus || "");
  const focusTerms = [
    ...new Set([
      ...profile.genres,
      ...(publication ? profile.subgenres : []),
      ...(profile.kind === "small_press" ? profile.bookTypes : []),
    ]),
  ];
  const visible: Record<ProfileSection, boolean> = {
    gallery: true,
    about: Boolean(about),
    focus: Boolean(
      focusTerms.length ||
      (focusText && focusText !== about) ||
      (profile.kind === "small_press" && profile.representativeAuthors),
    ),
    opportunities: true,
    guidance: Boolean(
      profile.editorialProfile?.submissionGuidance ||
        profile.editorialTips ||
        guidelines ||
        profile.readingPeriod ||
        profile.schedule?.badgeLabel ||
        profile.readingFee ||
        profile.payment ||
        profile.responseTime ||
        profile.simultaneousSubmissions ||
        profile.unsolicitedSubmissions,
    ),
  };
  const labels = {
    gallery: layout.media,
    about: "About",
    focus: layout.focus,
    opportunities: layout.calls,
    guidance: layout.guidance,
  };
  const openCount = profile.opportunities.filter(
    (opp) => opp.status === "open",
  ).length;
  return (
    <main id="main-content" className={styles.main} data-kind={profile.kind}>
      <Link href={meta.path} className={styles.back}>
        <ArrowLeft size={16} aria-hidden="true" />
        Back to {meta.plural.toLowerCase()}
      </Link>
      <header className={styles.hero}>
        <div className={styles.identity}>
          <Avatar className={styles.logo}>
            {profile.logoUrl && (
              <AvatarImage
                src={profile.logoUrl}
                alt=""
                className={styles.logoImage}
              />
            )}
            <AvatarFallback className={styles.logoFallback}>
              <Icon size={32} aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className={styles.eyebrow}>{meta.label}</p>
            {website && !journal && (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className={styles.domain}
              >
                {new URL(website).hostname.replace(/^www\./, "")}
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
            {!journal && <InstitutionSocialLinks links={profile.socialLinks || {}} name={profile.name} />}
          </div>
        </div>
        <div className={styles.titleRow}>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className={publication ? "font-heading" : "font-sans"}>
              {cleanTitleOrLabel(profile.name)}
            </h1>
            {profile.schedule ? (
              <MagazineScheduleBadge schedule={profile.schedule} />
            ) : null}
          </div>
          <div className={styles.heroActions}>
            {website && (
              <Button
                nativeButton={false}
                render={<a href={website} target="_blank" rel="noreferrer" />}
              >
                Visit website <ArrowUpRight size={16} aria-hidden="true" />
              </Button>
            )}
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href="#profile-opportunities" />}
            >
              {layout.calls}
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
        {rankingSummary}
        <div className={styles.signature}>
          <span>{layout.signature}</span>
          <span>
            {openCount}{" "}
            {openCount === 1 ? "open opportunity" : "open opportunities"} listed
          </span>
          {(profile.city || profile.country) && (
            <span className={styles.locationBadge}>
              <MapPin size={13} aria-hidden="true" />
              {[profile.city, profile.country].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
      </header>
      <nav className={styles.sectionNav} aria-label="Profile sections">
        {layout.order
          .filter((key) => visible[key])
          .map((key) => (
            <a key={key} href={`#profile-${key}`}>
              {labels[key]}
            </a>
          ))}
        {!layout.order.includes("gallery") && (
          <a href="#profile-gallery">{layout.media}</a>
        )}
        {journalDetails && <a href="#profile-rankings">Rankings & reports</a>}
      </nav>
      <div className={styles.contentGrid}>
        <div className={styles.reading}>
          {layout.order
            .filter((key) => visible[key])
            .map((key) => (
              <Fragment key={key}>
                {
                  {
                    gallery: (
                      <InstitutionMediaGallery
                        images={images}
                        title={layout.media}
                        issues={journal}
                        books={profile.kind === "small_press"}
                        website={website}
                        photos={!publication}
                        source={curated?.source}
                      />
                    ),
                    about: (
                      <section id="profile-about" className={styles.about}>
                        <h2 className="font-sans">{layout.about}</h2>
                        <div className={styles.prose}>{about}</div>
                      </section>
                    ),
                    focus: (
                      <section id="profile-focus" className={styles.practices}>
                        <h2 className="font-sans">{layout.focus}</h2>
                        {focusText && focusText !== about && (
                          <p className={styles.prose}>{focusText}</p>
                        )}
                        {focusTerms.length > 0 && (
                          <div>
                            {focusTerms.map((term) => (
                              <span key={term}>{humanize(term)}</span>
                            ))}
                          </div>
                        )}
                        {profile.kind === "small_press" &&
                          profile.representativeAuthors && (
                            <p className={styles.prose}>
                              <strong>Selected authors</strong>
                              <br />
                              {cleanCrawledNarrative(
                                profile.representativeAuthors,
                              )}
                            </p>
                          )}
                      </section>
                    ),
                    opportunities: (
                      <section id="profile-opportunities">
                        <span id="journal-opportunities-heading" />
                        <div className={styles.sectionHeading}>
                          <h2 className="font-sans">{layout.calls}</h2>
                          <span>{profile.opportunities.length} listed</span>
                        </div>
                        {profile.opportunities.length ? (
                          <div className={styles.opportunities}>
                            {profile.opportunities.map((opp, index) => {
                              const detail = opportunityActions ? (opp.id in opportunityActions ? `/opportunities/${encodeURIComponent(opp.id)}` : undefined) :
                                opp.detailUrl?.startsWith("/") &&
                                !opp.detailUrl.startsWith("//")
                                  ? opp.detailUrl
                                  : safeHref(opp.detailUrl);
                              const official = safeHref(opp.officialWebsite);
                              return (
                                <Card
                                  key={`${opp.id}-${index}`}
                                  className={styles.opportunity}
                                >
                                  <div className={styles.callMeta}>
                                    <span
                                      data-open={
                                        opp.status === "open" || undefined
                                      }
                                    >
                                      {opp.status === "open"
                                        ? "Open"
                                        : opp.status === "closed"
                                          ? "Closed"
                                          : "Check availability"}
                                    </span>
                                    {opp.deadline && (
                                      <span>Deadline · {opp.deadline}</span>
                                    )}
                                  </div>
                                  <h3 className="font-sans">
                                    {detail ? (
                                      <Link href={detail}>{opp.title}</Link>
                                    ) : (
                                      opp.title
                                    )}
                                  </h3>
                                  <div className={styles.callActions}>
                                    {opportunityActions?.[opp.id]}
                                    {detail && (
                                      <Link href={detail}>
                                        View opportunity{" "}
                                        <ArrowRight
                                          size={16}
                                          aria-hidden="true"
                                        />
                                      </Link>
                                    )}
                                    {!opportunityActions && official && (
                                      <a
                                        href={official}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Official listing
                                        <ArrowUpRight
                                          size={16}
                                          aria-hidden="true"
                                        />
                                      </a>
                                    )}
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        ) : (
                          <Empty className={styles.empty}>
                            <h3 className="font-sans">
                              No opportunities listed yet
                            </h3>
                            <EmptyDescription>
                              Check the organization’s website for its latest
                              calls and programs.
                            </EmptyDescription>
                          </Empty>
                        )}
                      </section>
                    ),
                    guidance: (() => {
                      // Build structured guideline cards from available profile fields
                      interface GuidelineCard {
                        label: string;
                        value: string;
                        note?: string;
                      }
                      const cards: GuidelineCard[] = [];

                      // Reading period
                      const readingPeriodValue =
                        profile.readingPeriod ||
                        profile.schedule?.badgeLabel;
                      if (readingPeriodValue) {
                        cards.push({
                          label: publication ? "Reading period" : "Application window",
                          value: readingPeriodValue,
                        });
                      }

                      // Fees
                      if (profile.readingFee) {
                        cards.push({
                          label: publication ? "Reading fee" : "Application fee",
                          value: profile.readingFee,
                        });
                      }

                      // Payment/compensation
                      if (profile.payment) {
                        cards.push({
                          label: "Payment",
                          value: profile.payment,
                        });
                      }

                      // Response time
                      if (profile.responseTime) {
                        cards.push({
                          label: "Response time",
                          value: profile.responseTime,
                        });
                      }

                      // Simultaneous submissions
                      if (profile.simultaneousSubmissions) {
                        cards.push({
                          label: "Simultaneous submissions",
                          value: profile.simultaneousSubmissions,
                        });
                      }

                      // Unsolicited submissions
                      if (profile.unsolicitedSubmissions) {
                        cards.push({
                          label: "Unsolicited submissions",
                          value: profile.unsolicitedSubmissions,
                        });
                      }

                      return (
                        <section
                          id="profile-guidance"
                          className={styles.guidance}
                        >
                          <h2 className="font-sans">{layout.guidance}</h2>
                          {cards.length > 0 && (
                            <div className={styles.guidelinesCards}>
                              {cards.map((card) => (
                                <div
                                  key={card.label}
                                  className={styles.guidelineCard}
                                >
                                  <span className={styles.guidelineCardLabel}>
                                    {card.label}
                                  </span>
                                  <span className={styles.guidelineCardValue}>
                                    {card.value}
                                  </span>
                                  {card.note && (
                                    <span className={styles.guidelineCardNote}>
                                      {card.note}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {profile.editorialProfile?.submissionGuidance && (
                            <p className={styles.prose}>
                              {cleanCrawledNarrative(
                                profile.editorialProfile.submissionGuidance,
                              )}
                            </p>
                          )}
                          {profile.editorialTips && profile.editorialTips !== profile.editorialProfile?.submissionGuidance && (
                            <p className={styles.prose}>
                              {cleanCrawledNarrative(profile.editorialTips)}
                            </p>
                          )}
                          {guidelines && (
                            <a href={guidelines} target="_blank" rel="noreferrer">
                              Read official guidelines
                              <ArrowUpRight size={16} aria-hidden="true" />
                            </a>
                          )}
                        </section>
                      );
                    })(),
                  }[key]
                }
              </Fragment>
            ))}
          {journalDetails}
        </div>
        <aside className={styles.aside} aria-label="Organization details">
          {profile.contactName && <p>{profile.contactName}</p>}
          {profile.contactDetails && <p className={styles.prose}>{profile.contactDetails}</p>}
          {facts.length > 0 && (
            <div className={styles.facts}>
              <h2 className="font-sans">At a glance</h2>
              <dl>
                {facts.map(([label, value]) => (
                  <div key={String(label)}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {profile.contactEmail &&
            /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(profile.contactEmail) && (
              <div className={styles.contact}>
                <h2 className="font-sans">Get in touch</h2>
                <a href={`mailto:${profile.contactEmail}`}>
                  {profile.contactEmail}
                </a>
              </div>
            )}
        </aside>
      </div>
      {!layout.order.includes("gallery") && (
        <InstitutionMediaGallery
          images={images}
          title={layout.media}
          issues={journal}
          books={profile.kind === "small_press"}
          website={website}
          photos={!publication}
          source={curated?.source}
        />
      )}
    </main>
  );
}
