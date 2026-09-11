export const HOMEPAGE_CATEGORIES = [
  {
    title: "Residencies",
    types: ["residency"],
    image: "opportunity-mountains",
    description: "Time and space to make work.",
  },
  {
    title: "Grants",
    types: ["grant"],
    image: "artist-at-work",
    description: "Funding for a project you want to make.",
  },
  {
    title: "Publications",
    types: ["magazine", "pitch"],
    image: "portfolio-still-life",
    description: "Magazines and editors looking for new work.",
  },
  {
    title: "Prizes",
    types: ["award", "contest"],
    image: "opportunity-architecture",
    description: "Awards and competitions for artists.",
  },
  {
    title: "Exhibitions",
    types: ["exhibition"],
    image: "gallery-interior",
    description: "Calls to show your work.",
  },
  {
    title: "Festivals",
    types: ["festival"],
    image: "opportunity-dance",
    description: "Calls for films, performances and more.",
  },
] as const;
export function categorySearch(types: readonly string[]) {
  const query = new URLSearchParams({ openNow: "true" });
  types.forEach((type) => query.append("type", type));
  return query.toString();
}
