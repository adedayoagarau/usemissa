import { PublicCreatorProfile } from "@/components/creator-profile/public-profile";
import { PublicSiteShell } from "@/components/public-site-shell";
import {
  PORTFOLIO_HEROES,
  PORTFOLIO_LENSES,
  PORTFOLIO_THEMES,
} from "@/lib/creator-portfolio-schema";
import { sampleCreatorPortfolio } from "@/lib/creator-profile-sample";

export const metadata = {
  title: "Creator portfolio review",
  robots: { index: false, follow: false },
};

const pick = <T extends string>(
  options: readonly T[],
  value: string | string[] | undefined,
) =>
  typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : undefined;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const sample = sampleCreatorPortfolio();
  const portfolio = {
    ...sample,
    lens: pick(PORTFOLIO_LENSES, query.lens) ?? sample.lens,
    theme: pick(PORTFOLIO_THEMES, query.theme) ?? sample.theme,
    hero: pick(PORTFOLIO_HEROES, query.hero) ?? sample.hero,
    ...(query.sparse === "1"
      ? {
          photo: "",
          works: sample.works
            .filter((work) => work.text)
            .map((work) => ({ ...work, image: "" })),
          shelf: [],
          press: [],
          events: [],
          openTo: sample.openTo.slice(0, 1),
        }
      : {}),
  };
  return (
    <PublicSiteShell>
      <PublicCreatorProfile portfolio={portfolio} sample />
    </PublicSiteShell>
  );
}
