import type { PortfolioData } from "./creator-portfolio-schema";

type PublicProfile = {
  id?: string;
  displayName?: string;
  bio?: string;
  isPrivate?: true;
};

type PublicCreatorProjectionInput = {
  canonicalPath: string;
  handle?: string;
  profile?: PublicProfile;
  portfolio?: PortfolioData;
  workLimit: number;
  includeWorkText: boolean;
};

function boundedText(value: string | undefined, maximum: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maximum) : undefined;
}

export function publicCreatorProjection(input: PublicCreatorProjectionInput) {
  const portfolio = input.portfolio;
  return {
    canonicalPath: input.canonicalPath,
    handle: input.handle,
    profile: input.profile
      ? {
          displayName: boundedText(input.profile.displayName, 100),
          bio: boundedText(input.profile.bio, 2_000),
        }
      : undefined,
    portfolio: portfolio
      ? {
          handle: input.handle ?? portfolio.handle,
          name: portfolio.name,
          bio: portfolio.bio,
          photo: portfolio.photo,
          selected: portfolio.selected.slice(0, 12),
          works: portfolio.works.slice(0, input.workLimit).map((work) => ({
            title: work.title,
            text: input.includeWorkText
              ? boundedText(work.text, 3_000)
              : undefined,
            url: work.url,
            image: work.image,
            audio: work.audio,
            formats: work.formats.slice(0, 6),
          })),
          workCount: portfolio.works.length,
          book: portfolio.book,
          credit: portfolio.credit,
          contact: portfolio.contact,
          sections: portfolio.sections,
          theme: portfolio.theme,
        }
      : undefined,
  };
}
