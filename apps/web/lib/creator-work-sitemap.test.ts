import assert from "node:assert/strict";
import test from "node:test";
import {
  createWork,
  emptyPortfolio,
  type PortfolioData,
} from "./creator-portfolio-schema";
import { workPageSitemapEntries } from "./creator-work-sitemap";

const portfolio = (
  works: Array<Parameters<typeof createWork>[0]>,
  extra: Partial<PortfolioData> = {},
): PortfolioData => ({
  ...emptyPortfolio(),
  name: "Riley Chen",
  works: works.map((work) => createWork(work)),
  ...extra,
});

test("each readable work gets its page address", () => {
  const entries = workPageSitemapEntries(
    "rileychen",
    portfolio([
      { title: "An atlas of small departures", slug: "atlas", text: "Words." },
      { title: "Tidal glossary", text: "More words." },
    ]),
    "2026-10-07T09:00:00.000Z",
  );
  assert.deepEqual(entries, [
    { path: "/@rileychen/atlas", lastModified: "2026-10-07T09:00:00.000Z" },
    {
      path: "/@rileychen/tidal-glossary",
      lastModified: "2026-10-07T09:00:00.000Z",
    },
  ]);
});

test("untitled, thin and hidden works have no address in the sitemap", () => {
  const works = [
    { title: "", text: "Private, untitled." },
    { title: "Only a title", url: "https://example.org/x" },
    { title: "Readable", text: "Words." },
  ];
  assert.deepEqual(
    workPageSitemapEntries("rileychen", portfolio(works)).map(
      (entry) => entry.path,
    ),
    ["/@rileychen/readable"],
  );
  const hidden = portfolio(works, {
    modules: [{ id: "work", visible: false }],
  });
  assert.deepEqual(workPageSitemapEntries("rileychen", hidden), []);
});

test("addresses match the page route when titles repeat", () => {
  const entries = workPageSitemapEntries(
    "rileychen",
    portfolio([
      { title: "Window", text: "One." },
      { title: "Window", text: "Two." },
      { title: "CV", text: "Reserved word." },
    ]),
  );
  assert.deepEqual(
    entries.map((entry) => entry.path),
    ["/@rileychen/window", "/@rileychen/window-2", "/@rileychen/cv-2"],
  );
});
