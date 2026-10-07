import { CreatorWorkPage } from "@/components/creator-profile/work-page/work-page";
import { PublicSiteShell } from "@/components/public-site-shell";
import {
  PORTFOLIO_THEMES,
  type PortfolioTheme,
} from "@/lib/creator-portfolio-schema";
import {
  WORK_PAGE_VARIANTS,
  sampleWorkPage,
  type WorkPageVariant,
} from "@/lib/creator-work-page-sample";
import { workBySlug } from "@/lib/creator-work-page";

export const metadata = {
  title: "Creator work page review",
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
 * The work page drawn from sample data, with no database. `variant` picks the
 * work (atlas, full, plain, noimage, long, sixty, bare), `theme` the palette,
 * and `work` another work of the sample profile by its address.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const variant: WorkPageVariant =
    pick(WORK_PAGE_VARIANTS, query.variant) ?? "atlas";
  const sample = sampleWorkPage(variant);
  const theme: PortfolioTheme =
    pick(PORTFOLIO_THEMES, query.theme) ?? sample.portfolio.theme;
  const portfolio = { ...sample.portfolio, theme };
  const other =
    typeof query.work === "string"
      ? workBySlug(portfolio.works, query.work)?.work
      : undefined;
  return (
    <PublicSiteShell>
      <CreatorWorkPage
        portfolio={portfolio}
        work={other ?? sample.work}
        handle={portfolio.handle}
        sample
      />
    </PublicSiteShell>
  );
}
