import type { Metadata } from "next";
import Link from "next/link";
import { Globe, ArrowRight } from "lucide-react";
import { PublicSiteShell } from "@/components/public-site-shell";
import { pageMetadata, JsonLd, absoluteUrl } from "@/lib/seo";
import {
  CANONICAL_COUNTRIES,
} from "@missa/contracts";
import { getPublicProfileCountryCounts } from "@/lib/publicProfileReads";
import styles from "./countries.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Literary publishers & opportunities by country",
  description:
    "Browse literary magazines, small presses, residencies, and creative opportunities organized by country. Explore the global publishing landscape.",
  path: "/countries",
});

const COUNTRY_EMOJI: Record<string, string> = {
  US: "🇺🇸",
  GB: "🇬🇧",
  CA: "🇨🇦",
  AU: "🇦🇺",
  NG: "🇳🇬",
  IE: "🇮🇪",
  ZA: "🇿🇦",
  KE: "🇰🇪",
  GH: "🇬🇭",
  NZ: "🇳🇿",
  IN: "🇮🇳",
  DE: "🇩🇪",
  FR: "🇫🇷",
  ES: "🇪🇸",
  IT: "🇮🇹",
  NL: "🇳🇱",
  JP: "🇯🇵",
  BR: "🇧🇷",
  MX: "🇲🇽",
  AR: "🇦🇷",
  CL: "🇨🇱",
  CO: "🇨🇴",
  PT: "🇵🇹",
  SE: "🇸🇪",
  NO: "🇳🇴",
  DK: "🇩🇰",
  FI: "🇫🇮",
  IS: "🇮🇸",
  CH: "🇨🇭",
  AT: "🇦🇹",
  BE: "🇧🇪",
  PL: "🇵🇱",
  GR: "🇬🇷",
  TR: "🇹🇷",
  EG: "🇪🇬",
  MA: "🇲🇦",
  UG: "🇺🇬",
  TZ: "🇹🇿",
  RW: "🇷🇼",
  SN: "🇸🇳",
  ZW: "🇿🇼",
  JM: "🇯🇲",
  TT: "🇹🇹",
  SG: "🇸🇬",
  MY: "🇲🇾",
  PH: "🇵🇭",
  KR: "🇰🇷",
  CN: "🇨🇳",
  TW: "🇹🇼",
  HK: "🇭🇰",
  IL: "🇮🇱",
  PS: "🇵🇸",
  LB: "🇱🇧",
  JO: "🇯🇴",
  AE: "🇦🇪",
};

const REGIONS: Array<{ label: string; codes: string[] }> = [
  {
    label: "English-speaking",
    codes: ["US", "GB", "CA", "AU", "NZ", "IE", "ZA"],
  },
  {
    label: "Africa",
    codes: ["NG", "KE", "GH", "ZA", "UG", "TZ", "RW", "SN", "ZW", "EG", "MA"],
  },
  {
    label: "Europe",
    codes: [
      "DE", "FR", "ES", "IT", "NL", "PT", "SE", "NO", "DK", "FI", "IS",
      "CH", "AT", "BE", "PL", "GR",
    ],
  },
  {
    label: "Latin America & Caribbean",
    codes: ["BR", "MX", "AR", "CL", "CO", "JM", "TT"],
  },
  {
    label: "Asia & Middle East",
    codes: ["IN", "JP", "SG", "MY", "PH", "KR", "CN", "TW", "HK", "IL", "PS", "LB", "JO", "AE", "TR"],
  },
];

interface CountryCount {
  code: string;
  name: string;
  publisherCount: number;
}

export default async function CountriesPage() {
  const countryCounts: CountryCount[] = (
    await getPublicProfileCountryCounts()
  ).map(({ countryCode, count }) => ({
    code: countryCode,
    name: CANONICAL_COUNTRIES[countryCode] ?? countryCode,
    publisherCount: count,
  }));
  const countByCode = new Map(countryCounts.map((c) => [c.code, c]));

  // Build region sections, filtering to only countries that have data
  const regionSections = REGIONS.map((region) => ({
    label: region.label,
    countries: region.codes
      .map((code) => countByCode.get(code))
      .filter((c): c is CountryCount => !!c),
  })).filter((r) => r.countries.length > 0);

  // Countries not in any region
  const coveredCodes = new Set(REGIONS.flatMap((r) => r.codes));
  const otherCountries = countryCounts.filter((c) => !coveredCodes.has(c.code));

  const totalPublishers = countryCounts.reduce((s, c) => s + c.publisherCount, 0);

  return (
    <PublicSiteShell current="Directory">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Literary publishers & opportunities by country",
          url: absoluteUrl("/countries"),
          description:
            "Browse literary magazines, small presses, residencies, and creative opportunities organized by country.",
        }}
      />
      <div className={styles.page}>
        <div className={styles.hero}>
          <p className={styles.eyebrow}>Global directory</p>
          <h1 className={styles.headline}>
            Publishers &amp; opportunities by country
          </h1>
          <p className={styles.subheadline}>
            {totalPublishers.toLocaleString()} publishers across{" "}
            {countryCounts.length} countries — magazines, presses,
            residencies, and open calls.
          </p>
        </div>

        {/* Worldwide / global */}
        <Link href="/countries/global" className={styles.globalBanner}>
          <Globe size={28} aria-hidden="true" />
          <div className={styles.globalBannerText}>
            <div className={styles.globalBannerTitle}>Worldwide opportunities</div>
            <div className={styles.globalBannerDesc}>
              Open calls and opportunities accepting submissions from anywhere
            </div>
          </div>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>

        {regionSections.map((region) => (
          <section key={region.label} className={styles.region}>
            <h2 className={styles.regionHeading}>{region.label}</h2>
            <div className={styles.grid}>
              {region.countries.map((country) => (
                <Link
                  key={country.code}
                  href={`/countries/${country.code.toLowerCase()}`}
                  className={styles.card}
                  aria-label={`${country.name}: ${country.publisherCount} publishers`}
                >
                  <span className={styles.cardFlag} aria-hidden="true">
                    {COUNTRY_EMOJI[country.code] ?? "🌐"}
                  </span>
                  <span className={styles.cardName}>{country.name}</span>
                  <span className={styles.cardMeta}>
                    {country.publisherCount.toLocaleString()} publisher
                    {country.publisherCount !== 1 ? "s" : ""}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {otherCountries.length > 0 && (
          <section className={styles.region}>
            <h2 className={styles.regionHeading}>Other regions</h2>
            <div className={styles.grid}>
              {otherCountries.map((country) => (
                <Link
                  key={country.code}
                  href={`/countries/${country.code.toLowerCase()}`}
                  className={styles.card}
                  aria-label={`${country.name}: ${country.publisherCount} publishers`}
                >
                  <span className={styles.cardFlag} aria-hidden="true">
                    {COUNTRY_EMOJI[country.code] ?? "🌐"}
                  </span>
                  <span className={styles.cardName}>{country.name}</span>
                  <span className={styles.cardMeta}>
                    {country.publisherCount.toLocaleString()} publisher
                    {country.publisherCount !== 1 ? "s" : ""}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </PublicSiteShell>
  );
}
