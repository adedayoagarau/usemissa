import assert from "node:assert/strict";
import test from "node:test";
import {
  coercePortfolioTheme,
  portfolioMediaIds,
  portfolioSchema,
  PORTFOLIO_THEMES,
  publicationIssue,
  publicPortfolioProjection,
  withServerProvenance,
} from "./creator-portfolio-schema";

test("portfolio theme defaults to sage and keeps the public palette", () => {
  assert.deepEqual([...PORTFOLIO_THEMES], ["sage", "mineral", "night"]);
  assert.equal(portfolioSchema.parse({}).theme, "sage");
});

test("coerces legacy and unknown theme values to the canonical default", () => {
  assert.equal(coercePortfolioTheme("white"), "sage");
  assert.equal(coercePortfolioTheme("paper"), "sage");
  assert.equal(coercePortfolioTheme("sage"), "sage");
  assert.equal(coercePortfolioTheme("night"), "night");
  assert.equal(coercePortfolioTheme(undefined), "sage");
  assert.equal(coercePortfolioTheme(null), "sage");
  assert.equal(coercePortfolioTheme(42), "sage");
});

test("schema coerces the removed white and paper themes so stored drafts keep loading", () => {
  assert.equal(portfolioSchema.parse({ theme: "white" }).theme, "sage");
  assert.equal(portfolioSchema.parse({ theme: "paper" }).theme, "sage");
});

const mediaUrl = (n: string) =>
  `/api/creator/portfolio-media/${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;

test("version 1 drafts move their book, credit and sections into v2 fields", () => {
  const draft = portfolioSchema.parse({
    name: "Maya",
    book: { title: "Field notes", cover: mediaUrl("a"), year: "2025", url: "" },
    credit: {
      title: "Tidal glossary",
      venue: "The Quiet Review",
      year: "2026",
      url: "",
    },
    sections: ["Books"],
  });
  assert.equal(draft.shelf.length, 1);
  assert.equal(draft.shelf[0].title, "Field notes");
  assert.equal(draft.shelf[0].cover, mediaUrl("a"));
  assert.equal(draft.record[0].venue, "The Quiet Review");
  assert.equal(draft.record[0].provenance, "added");
  assert.deepEqual(
    draft.modules.find((module) => module.id === "record"),
    { id: "record", visible: false },
  );
  assert.ok(draft.shelf[0].id && draft.record[0].id);
  assert.equal("book" in draft, false);
  assert.equal("sections" in draft, false);
});

test("empty legacy book and credit do not create shelf or record entries", () => {
  const draft = portfolioSchema.parse({
    book: { title: "", cover: "", year: "", url: "" },
    credit: { title: "", venue: "", year: "", url: "" },
  });
  assert.deepEqual(draft.shelf, []);
  assert.deepEqual(draft.record, []);
  assert.equal(draft.lens, "mixed");
  assert.equal(draft.hero, "portrait");
});

test("provenance is derived on the server and never trusted from the client", () => {
  const draft = portfolioSchema.parse({
    record: [
      { title: "Forged", provenance: "confirmed" },
      { title: "Forged outcome", outcomeId: "decision_someone_else" },
      {
        title: "Linked credit",
        provenance: "added",
        organization: {
          id: "org_1",
          name: "The Quiet Review",
          kind: "Journal",
          href: "/journal/the-quiet-review",
        },
      },
      { title: "Real acceptance", outcomeId: "decision_1" },
    ],
  });
  const derived = withServerProvenance(
    {
      ...draft,
      record: draft.record.map((entry, index) =>
        index === 3 ? { ...entry, title: "Reworded as a prize" } : entry,
      ),
    },
    new Map([
      ["decision_1", { title: "Real acceptance", venue: "Small Review" }],
    ]),
  );
  assert.deepEqual(
    derived.record.map((entry) => entry.provenance),
    ["added", "added", "linked", "confirmed"],
  );
  assert.equal(derived.record[1].outcomeId, undefined);
  assert.equal(derived.record[3].outcomeId, "decision_1");
  assert.equal(
    derived.record[3].title,
    "Real acceptance",
    "confirmed wording comes from the decision",
  );
  assert.equal(derived.record[3].venue, "Small Review");
  assert.equal(
    withServerProvenance(derived).record[3].provenance,
    "added",
    "a withdrawn decision stops confirming the entry",
  );
});

test("projection drops hidden modules, untitled items and their media", () => {
  const draft = portfolioSchema.parse({
    name: "Maya",
    modules: [{ id: "shelf", visible: false }],
    shelf: [{ title: "Hidden book", cover: mediaUrl("b") }],
    works: [{ title: "", image: mediaUrl("c") }, { title: "Shown" }],
    events: [{ title: "No date yet" }],
    press: [{ quote: "", source: "Review" }],
  });
  const projection = publicPortfolioProjection(draft);
  assert.deepEqual(projection.shelf, []);
  assert.deepEqual(
    projection.works.map((work) => work.title),
    ["Shown"],
  );
  assert.deepEqual(projection.events, []);
  assert.deepEqual(projection.press, []);
  assert.deepEqual(portfolioMediaIds(projection), []);
  assert.deepEqual(
    projection.modules.map((module) => module.id),
    ["shelf", "work", "upcoming", "record", "press", "about"],
  );
});

test("press quotes need a source link before publishing", () => {
  const draft = portfolioSchema.parse({
    name: "Maya",
    press: [{ quote: "Patient and exact.", source: "Coastline Quarterly" }],
  });
  assert.match(publicationIssue(draft) ?? "", /source link/);
  draft.press[0].url = "https://example.com/review";
  assert.equal(publicationIssue(draft), undefined);
});

test("published snapshots keep decision ids privately so each read can re-verify them", () => {
  const draft = portfolioSchema.parse({
    name: "Riley",
    record: [
      { title: "Anything", outcomeId: "decision_1", venue: "Typed venue" },
    ],
  });
  const accepted = new Map([
    ["decision_1", { title: "Tidal glossary", venue: "The Quiet Review" }],
  ]);
  const stored = publicPortfolioProjection(
    withServerProvenance(draft, accepted),
    { keepOutcomeIds: true },
  );
  assert.equal(stored.record[0].outcomeId, "decision_1");
  assert.equal(stored.record[0].provenance, "confirmed");

  // Still accepted: visitors see Confirmed, never the decision id.
  const live = publicPortfolioProjection(
    withServerProvenance(stored, accepted),
  );
  assert.equal(live.record[0].provenance, "confirmed");
  assert.equal(live.record[0].title, "Tidal glossary");
  assert.equal(live.record[0].outcomeId, undefined);

  // Withdrawn after publishing: the next read no longer says Confirmed.
  const withdrawn = publicPortfolioProjection(
    withServerProvenance(portfolioSchema.parse(stored), new Map()),
  );
  assert.equal(withdrawn.record[0].provenance, "added");
  assert.equal(withdrawn.record[0].outcomeId, undefined);
});
