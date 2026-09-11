import { test, expect } from "@playwright/test";
import {
  portfolioSchema,
  publicationIssue,
  publicPortfolioProjection,
  portfolioMediaIds,
} from "../lib/creator-portfolio-schema";
test("draft schema preserves partial input but publication validates links and strips private fields", () => {
  const draft = portfolioSchema.parse({
    name: "Maya",
    contact: { email: "not finished", website: "https:", instagram: "" },
    privateNotes: "never public",
    tracker: ["private"],
  });
  expect(draft).not.toHaveProperty("privateNotes");
  expect(draft).not.toHaveProperty("tracker");
  expect(publicationIssue(draft)).toMatch(/links/);
  draft.contact.website = "https://example.com";
  expect(publicationIssue(draft)).toMatch(/email/);
  draft.contact.email = "";
  expect(publicationIssue(draft)).toBeUndefined();
  expect(
    portfolioSchema.safeParse({ photo: "https://unowned.example/photo.png" })
      .success,
  ).toBe(false);
  expect(
    portfolioSchema.safeParse({ photo: "data:image/png;base64,abc" }).success,
  ).toBe(false);
});

test("unselected books and untitled work are excluded from public data and media access", () => {
  const draft = portfolioSchema.parse({
    name: "Maya",
    sections: [],
    book: {
      title: "Private book",
      cover:
        "/api/creator/portfolio-media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    },
    works: [
      {
        title: "",
        text: "Private unfinished text",
        image:
          "/api/creator/portfolio-media/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      },
    ],
  });
  const projection = publicPortfolioProjection(draft);
  expect(projection.book.title).toBe("");
  expect(projection.works).toEqual([]);
  expect(portfolioMediaIds(projection)).toEqual([]);
});
