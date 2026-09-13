import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, Globe, MapPin } from "lucide-react";
import { PublicSiteShell } from "@/components/public-site-shell";
import { pageMetadata, JsonLd, breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import { normalizeCountry } from "@missa/contracts";
import { getSemanticUrlForProfile } from "@missa/radar-adapters";
import { getProfileRepository } from "@/lib/profileRepository";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
import styles from "./country-hub.module.css";

export const dynamic = "force-dynamic";

const COUNTRY_EMOJI: Record<string, string> = {
  US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺", NG: "🇳🇬", IE: "🇮🇪",
  ZA: "🇿🇦", KE: "🇰🇪", GH: "🇬🇭", NZ: "🇳🇿", IN: "🇮🇳", DE: "🇩🇪",
  FR: "🇫🇷", ES: "🇪🇸", IT: "🇮🇹", NL: "🇳🇱", JP: "🇯🇵", BR: "🇧🇷",
  MX: "🇲🇽", AR: "🇦🇷", CL: "🇨🇱", CO: "🇨🇴", PT: "🇵🇹", SE: "🇸🇪",
  NO: "🇳🇴", DK: "🇩🇰", FI: "🇫🇮", IS: "🇮🇸", CH: "🇨🇭", AT: "🇦🇹",
  BE: "🇧🇪", PL: "🇵🇱", GR: "🇬🇷", TR: "🇹🇷", EG: "🇪🇬", MA: "🇲🇦",
  UG: "🇺🇬", TZ: "🇹🇿", RW: "🇷🇼", SN: "🇸🇳", ZW: "🇿🇼", JM: "🇯🇲",
  TT: "🇹🇹", SG: "🇸🇬", MY: "🇲🇾", PH: "🇵🇭", KR: "🇰🇷", CN: "🇨🇳",
  TW: "🇹🇼", HK: "🇭🇰", IL: "🇮🇱", PS: "🇵🇸", LB: "🇱🇧", JO: "🇯🇴",
  AE: "🇦🇪",
};

const KIND_LABEL: Record<string, string> = {
  literary_magazine: "Literary magazine",
  small_press: "Small press",
  residency_center: "Residency",
  grant_foundation: "Foundation",
  visual_arts_organization: "Arts organization",
  gallery: "Gallery",
  organization: "Organization",
};

const OPP_TYPE_LABEL: Record<string, string> = {
  magazine: "Magazine",
  grant: "Grant",
  award: "Award",
  residency: "Residency",
  fellowship: "Fellowship",
  contest: "Contest",
  "open-call": "Open call",
  commission: "Commission",
  scholarship: "Scholarship",
  job: "Job",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country } = await params;
  const normalized = normalizeCountry(country);
  if (!normalized) return { title: "Country Not Found" };

  const isGlobal = normalized.countryCode === "GLOBAL";
  const displayName = isGlobal ? "Worldwide" : normalized.country;

  return pageMetadata({
    title: `${displayName} — literary publishers & creative opportunities`,
    description: isGlobal
      ? `Browse literary magazines, presses, residencies, and open calls accepting submissions from writers worldwide.`
      : `Browse literary magazines, small presses, residencies, and creative opportunities based in or open to writers in ${displayName}.`,
    path: `/countries/${country.toLowerCase()}`,
  });
}

export default async function CountryHubPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;

  // Resolve the slug/code to a canonical country
  const normalized = normalizeCountry(country);
  if (!normalized) notFound();

  const { countryCode, country: countryName } = normalized;
  const isGlobal = countryCode === "GLOBAL";
  const displayName = isGlobal ? "Worldwide" : countryName;
  const emoji = isGlobal ? "🌐" : (COUNTRY_EMOJI[countryCode] ?? "🌐");

  const profileRepo = getProfileRepository();
  const opportunityRepo = getOpportunityRepository();

  // Fetch both in parallel
  const [profileResult, opportunityResult] = await Promise.all([
    profileRepo
      ? profileRepo.browse({
          countryCode: isGlobal ? "GLOBAL" : countryCode,
          limit: 24,
          offset: 0,
        })
      : Promise.resolve({ items: [], total: 0 }),
    opportunityRepo
      .browse({
        // Pass countryCode in the query — repository picks up geographicScope
        ...(countryCode
          ? { countryCode, geographicScope: isGlobal ? "global" : undefined }
          : {}),
        openNow: true,
        sort: "soonest-deadline",
        limit: 24,
      } as Parameters<typeof opportunityRepo.browse>[0])
      .catch(() => ({ items: [], total: 0, nextCursor: null })),
  ]);

  const publishers = profileResult.items;
  const opportunities = opportunityResult.items;

  const publisherCount = profileResult.total;
  const opportunityCount = opportunityResult.total;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Countries", path: "/countries" },
    { name: displayName },
  ]);

  const directoryHref = isGlobal
    ? "/opportunities?location=GLOBAL"
    : `/directory?country=${countryCode}`;
  const opportunitiesHref = isGlobal
    ? "/opportunities"
    : `/opportunities?countryCode=${countryCode}`;

  return (
    <PublicSiteShell current="Directory">
      <JsonLd data={breadcrumb} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${displayName} — literary publishers & creative opportunities`,
          url: absoluteUrl(`/countries/${country.toLowerCase()}`),
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Countries", item: absoluteUrl("/countries") },
              { "@type": "ListItem", position: 2, name: displayName },
            ],
          },
        }}
      />
      <div className={styles.page}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/countries">Countries</Link>
          <span className={styles.breadcrumbSep} aria-hidden="true">/</span>
          <span>{displayName}</span>
        </nav>

        {/* Hero */}
        <header className={styles.hero}>
          <div className={styles.flag} aria-hidden="true">{emoji}</div>
          <h1 className={styles.headline}>{displayName}</h1>
          <div className={styles.heroMeta}>
            {publisherCount > 0 && (
              <span className={styles.heroStat}>
                <Building2 size={14} aria-hidden="true" />
                <span className={styles.heroStatValue}>
                  {publisherCount.toLocaleString()}
                </span>{" "}
                publisher{publisherCount !== 1 ? "s" : ""}
              </span>
            )}
            {opportunityCount > 0 && (
              <span className={styles.heroStat}>
                <Globe size={14} aria-hidden="true" />
                <span className={styles.heroStatValue}>
                  {opportunityCount.toLocaleString()}
                </span>{" "}
                open opportunit{opportunityCount !== 1 ? "ies" : "y"}
              </span>
            )}
          </div>
        </header>

        <div className={styles.sections}>
          {/* Publishers section */}
          <section aria-labelledby="publishers-heading">
            <div className={styles.sectionHeader}>
              <h2 id="publishers-heading" className={styles.sectionTitle}>
                {isGlobal
                  ? "Publishers accepting global submissions"
                  : `Publishers based in ${displayName}`}
              </h2>
              <span className={styles.sectionCount}>
                {publisherCount.toLocaleString()} total
              </span>
            </div>
            {publishers.length > 0 ? (
              <>
                <div className={styles.profileGrid}>
                  {publishers.map((profile) => {
                    const href = getSemanticUrlForProfile(profile.kind, profile.slug);
                    return (
                      <Link
                        key={profile.id}
                        href={href}
                        className={styles.profileCard}
                        aria-label={profile.name}
                      >
                        <span className={styles.profileCardKind}>
                          {KIND_LABEL[profile.kind] ?? profile.kind.replace(/_/g, " ")}
                        </span>
                        <span className={styles.profileCardName}>{profile.name}</span>
                        {profile.city && (
                          <span className={styles.profileCardLocation}>
                            <MapPin size={12} aria-hidden="true" />
                            {profile.city}
                            {profile.country && `, ${profile.country}`}
                          </span>
                        )}
                        {profile.summary && (
                          <span className={styles.profileCardMeta}>
                            {profile.summary.slice(0, 90)}
                            {profile.summary.length > 90 ? "…" : ""}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
                {publisherCount > publishers.length && (
                  <Link href={directoryHref} className={styles.viewAll}>
                    View all {publisherCount.toLocaleString()} publishers
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                )}
              </>
            ) : (
              <div className={styles.empty}>
                No publishers indexed yet for this location.
              </div>
            )}
          </section>

          {/* Opportunities section */}
          <section aria-labelledby="opportunities-heading">
            <div className={styles.sectionHeader}>
              <h2 id="opportunities-heading" className={styles.sectionTitle}>
                {isGlobal
                  ? "Open calls — worldwide"
                  : `Opportunities open to writers in ${displayName}`}
              </h2>
              <span className={styles.sectionCount}>
                {opportunityCount.toLocaleString()} total
              </span>
            </div>
            {!isGlobal && (
              <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", marginBottom: "var(--s3)" }}>
                Includes opportunities based in {displayName} and worldwide open calls.
              </p>
            )}
            {opportunities.length > 0 ? (
              <>
                <div className={styles.opportunityGrid}>
                  {opportunities.map((opp) => {
                    const isGlobalOpp =
                      !opp.location ||
                      opp.location.toLowerCase().includes("worldwide") ||
                      opp.location.toLowerCase().includes("global");
                    const isFree = opp.fee.status === "no-fee";
                    const isOpen = opp.status === "open" || opp.status === "closing-soon";
                    return (
                      <Link
                        key={opp.id}
                        href={`/opportunities/${opp.slug}`}
                        className={styles.opportunityCard}
                        aria-label={opp.title}
                      >
                        <div className={styles.opportunityCardBody}>
                          <div className={styles.opportunityCardTitle}>{opp.title}</div>
                          {opp.organizationName && (
                            <div className={styles.opportunityCardOrg}>
                              {opp.organizationName}
                            </div>
                          )}
                          <div className={styles.opportunityCardMeta}>
                            {OPP_TYPE_LABEL[opp.type] ?? opp.type}
                            {opp.deadline.date && (
                              <span>
                                Deadline{" "}
                                {new Intl.DateTimeFormat("en", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }).format(new Date(`${opp.deadline.date}T12:00:00`))}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-end" }}>
                          {isOpen && (
                            <span className={`${styles.badge} ${styles.badgeOpen}`}>
                              Open
                            </span>
                          )}
                          {isGlobalOpp && (
                            <span className={`${styles.badge} ${styles.badgeGlobal}`}>
                              Worldwide
                            </span>
                          )}
                          {isFree && (
                            <span className={`${styles.badge} ${styles.badgeFree}`}>
                              No fee
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {opportunityCount > opportunities.length && (
                  <Link href={opportunitiesHref} className={styles.viewAll}>
                    View all {opportunityCount.toLocaleString()} opportunities
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                )}
              </>
            ) : (
              <div className={styles.empty}>
                No open opportunities found for this location right now.
              </div>
            )}
          </section>
        </div>
      </div>
    </PublicSiteShell>
  );
}
