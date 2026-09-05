import { z } from "zod";
const text = (max: number) => z.string().max(max).default("");
const link = text(2048); // Incomplete links are allowed in private drafts.
const media = z
  .string()
  .regex(
    /^$|^\/api\/creator\/portfolio-media\/[0-9a-f-]{36}$/,
    "Upload this media before saving.",
  )
  .default("");
export const portfolioSchema = z.object({
  handle: text(30),
  name: text(100),
  bio: text(600),
  photo: media,
  selected: z.array(z.string().max(80)).max(12).default([]),
  works: z
    .array(
      z.object({
        title: text(200),
        text: text(20000),
        url: link,
        image: media,
        audio: media,
        formats: z.array(z.string().max(30)).max(6).default([]),
      }),
    )
    .max(50)
    .default([]),
  book: z
    .object({ title: text(200), cover: media, year: text(4), url: link })
    .default({ title: "", cover: "", year: "", url: "" }),
  credit: z
    .object({
      title: text(200),
      venue: text(200),
      year: text(4),
      url: link,
      organization: z
        .object({
          id: text(200),
          name: text(200),
          kind: text(100),
          href: z
            .string()
            .regex(/^\/(journal|press|residency|grant|org)\/[a-zA-Z0-9_-]+$/),
        })
        .optional(),
    })
    .default({ title: "", venue: "", year: "", url: "" }),
  contact: z
    .object({ email: text(254), website: link, instagram: link })
    .default({ email: "", website: "", instagram: "" }),
  sections: z
    .array(z.enum(["Books", "Selected publications"]))
    .max(2)
    .default(["Books", "Selected publications"]),
  theme: z.enum(["sage", "paper", "mineral", "night"]).default("sage"),
});
export type PortfolioData = z.infer<typeof portfolioSchema>;
export function portfolioMediaIds(draft: PortfolioData) {
  return [
    ...new Set(
      [
        draft.photo,
        draft.book.cover,
        ...draft.works.flatMap((w) => [w.image, w.audio]),
      ]
        .filter(Boolean)
        .map((url) => url.split("/").pop()!),
    ),
  ];
}

export function publicationIssue(draft: PortfolioData): string | undefined {
  if (!draft.name.trim()) return "Add your display name before publishing.";
  for (const value of [
    draft.book.url,
    draft.credit.url,
    draft.contact.website,
    draft.contact.instagram,
    ...draft.works.map((work) => work.url),
  ]) {
    if (!value) continue;
    try {
      const u = new URL(value);
      if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
        throw new Error();
    } catch {
      return "Complete or remove unfinished links before publishing.";
    }
  }
  if (
    draft.contact.email &&
    !z.string().email().safeParse(draft.contact.email).success
  )
    return "Check your public contact email before publishing.";
}
