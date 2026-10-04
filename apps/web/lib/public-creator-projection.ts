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
          lens: portfolio.lens,
          statement: portfolio.statement,
          location: portfolio.location,
          openTo: portfolio.openTo.map(({ label, state, date }) => ({
            label,
            state,
            date,
          })),
          shelf: portfolio.shelf.map(({ id: _id, ...item }) => item),
          record: portfolio.record.map(({ id: _id, ...item }) => item),
          events: portfolio.events.map(({ id: _id, ...item }) => item),
          // Version 1 fields, kept so existing API readers keep working.
          book: portfolio.shelf[0]
            ? {
                title: portfolio.shelf[0].title,
                cover: portfolio.shelf[0].cover,
                year: portfolio.shelf[0].year,
                url: portfolio.shelf[0].url,
              }
            : { title: "", cover: "", year: "", url: "" },
          credit: portfolio.record[0]
            ? {
                title: portfolio.record[0].title,
                venue: portfolio.record[0].venue,
                year: portfolio.record[0].year,
                url: portfolio.record[0].url,
                organization: portfolio.record[0].organization,
              }
            : { title: "", venue: "", year: "", url: "" },
          contact: portfolio.contact,
          theme: portfolio.theme,
        }
      : undefined,
  };
}
