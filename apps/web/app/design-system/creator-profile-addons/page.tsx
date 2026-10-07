import { PublicCreatorProfile } from "@/components/creator-profile/public-profile";
import { PublicSiteShell } from "@/components/public-site-shell";
import {
  PORTFOLIO_LENSES,
  PORTFOLIO_THEMES,
} from "@/lib/creator-portfolio-schema";
import {
  ADDON_REVIEW_CASES,
  addonReviewPortfolio,
} from "@/lib/creator-profile-sample-addons";

export const metadata = {
  title: "Creator add-on sections review",
  robots: { index: false, follow: false },
};

const pick = <T extends string>(
  options: readonly T[],
  value: string | string[] | undefined,
) =>
  typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : undefined;

/**
 * Review page for the visitor add-on sections. `case` picks the data (full,
 * long, bare, empty); `contact=off` removes every way to write, so no
 * Enquire action shows; `theme` and `lens` as on the profile review page.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const portfolio = addonReviewPortfolio(pick(ADDON_REVIEW_CASES, query.case));
  return (
    <PublicSiteShell>
      <PublicCreatorProfile
        sample
        portfolio={{
          ...portfolio,
          lens: pick(PORTFOLIO_LENSES, query.lens) ?? portfolio.lens,
          theme: pick(PORTFOLIO_THEMES, query.theme) ?? portfolio.theme,
          inquiries: query.contact !== "off",
        }}
      />
    </PublicSiteShell>
  );
}
