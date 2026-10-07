import assert from "node:assert/strict";
import test from "node:test";
import {
  activeModules,
  ADDON_MODULES,
  coercePortfolioTheme,
  createWork,
  isAddonModule,
  orderedModules,
  setAddon,
  portfolioMediaIds,
  portfolioSchema,
  PORTFOLIO_THEMES,
  publicationIssue,
  publicPortfolioProjection,
  withServerProvenance,
} from "./creator-portfolio-schema";

test("portfolio theme defaults to sage and keeps the public palette", () => {
  assert.deepEqual(
    [...PORTFOLIO_THEMES],
    ["default", "sage", "mineral", "night"],
  );
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
  // A version 1 draft has none of the add-ons, so none of them show.
  assert.equal(
    activeModules(draft.modules).some((m) => isAddonModule(m.id)),
    false,
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
    activeModules(projection.modules).map((module) => module.id),
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

test("add-ons stay off until the creator switches them on, and keep their data when switched off", () => {
  const draft = portfolioSchema.parse({
    name: "Maya",
    services: [{ title: "Book covers" }],
  });
  const ids = (modules: typeof draft.modules) =>
    activeModules(modules).map((m) => m.id);
  assert.deepEqual(ids(draft.modules), [
    "work",
    "upcoming",
    "shelf",
    "record",
    "press",
    "about",
  ]);
  assert.equal(publicPortfolioProjection(draft).services.length, 0);

  const on = setAddon(draft.modules, "services", true);
  assert.ok(ids(on).includes("services"));
  assert.equal(
    publicPortfolioProjection({ ...draft, modules: on }).services.length,
    1,
  );

  const off = setAddon(on, "services", false);
  assert.equal(ids(off).includes("services"), false);
  assert.equal(
    publicPortfolioProjection({ ...draft, modules: off }).services.length,
    0,
  );
  assert.equal(draft.services[0].title, "Book covers");
  // Every module appears exactly once however the list was stored.
  assert.equal(orderedModules(off).length, 6 + ADDON_MODULES.length);
});

test("a work made before the add-ons parses with every new field at its default", () => {
  const work = createWork({ title: "Tidal glossary", text: "Ebb" });
  assert.equal(work.slug, "");
  assert.deepEqual(work.parts, []);
  assert.deepEqual(work.chapters, []);
  assert.deepEqual(work.credits, []);
  assert.equal(work.video, "");
  assert.equal(
    portfolioSchema.parse({ works: [{ title: "Old", text: "x" }] }).works[0]
      .series,
    "",
  );
});

test("a collaborator shows only when the server says the other creator lists them back", () => {
  const draft = portfolioSchema.parse({
    name: "Riley",
    modules: [{ id: "collaborators", visible: true, added: true }],
    collaborators: [
      {
        id: "c_1",
        handle: "toni",
        name: "Toni Okafor",
        role: "Sound",
        confirmed: true,
      },
      { id: "c_2", handle: "ana", name: "Ana Reis", role: "Design" },
      { id: "c_3", handle: "", name: "A friend", role: "Thanks" },
    ],
  });
  // A client can send confirmed: true; the server replaces it on every write.
  const written = withServerProvenance(draft, new Map(), {
    confirmedHandles: new Set(["ana"]),
  });
  assert.deepEqual(
    written.collaborators.map((c) => [c.handle, c.confirmed]),
    [
      ["toni", false],
      ["ana", true],
      ["", false],
    ],
  );
  assert.deepEqual(
    publicPortfolioProjection(written).collaborators.map((c) => c.name),
    ["Ana Reis"],
  );
  // With no server facts nothing is confirmed.
  assert.equal(
    publicPortfolioProjection(withServerProvenance(draft)).collaborators.length,
    0,
  );
});

test("booking files take their type and size from the stored file", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const url = `/api/creator/portfolio-media/${id}`;
  const draft = portfolioSchema.parse({
    modules: [{ id: "booking", visible: true, added: true }],
    booking: {
      shortBio: "Riley is a poet.",
      files: [
        { id: "f_1", label: "Tech rider", file: url, type: "zip", bytes: 1 },
      ],
    },
  });
  const written = withServerProvenance(draft, new Map(), {
    files: new Map([[id, { type: "pdf" as const, bytes: 240_000 }]]),
  });
  assert.deepEqual(
    [written.booking.files[0].type, written.booking.files[0].bytes],
    ["pdf", 240_000],
  );
  // A file the server could not find loses whatever the client claimed.
  const unknown = withServerProvenance(draft);
  assert.equal(unknown.booking.files[0].type, undefined);
  assert.equal(unknown.booking.files[0].bytes, undefined);
  assert.ok(portfolioMediaIds(draft).includes(id));
});

test("teaching dates that have passed drop out, and undated sessions stay", () => {
  const draft = portfolioSchema.parse({
    modules: [{ id: "teaching", visible: true, added: true }],
    teaching: [
      { title: "Relief printing", date: "2026-11-09", places: 3 },
      { title: "Last spring", date: "2026-03-01" },
      { title: "Ask me about workshops" },
    ],
  });
  assert.deepEqual(
    publicPortfolioProjection(draft, {}, "2026-10-07").teaching.map(
      (item) => item.title,
    ),
    ["Relief printing", "Ask me about workshops"],
  );
});

test("support is shown only with a link, and every new link is checked before publishing", () => {
  const base = {
    name: "Riley",
    modules: [{ id: "support", visible: true, added: true }],
  };
  assert.equal(
    publicPortfolioProjection(portfolioSchema.parse(base)).support.url,
    "",
  );
  const linked = portfolioSchema.parse({
    ...base,
    support: { label: "Support Riley", url: "https://example.com/tip" },
  });
  assert.equal(
    publicPortfolioProjection(linked).support.label,
    "Support Riley",
  );
  assert.equal(
    publicationIssue({
      ...linked,
      support: { ...linked.support, url: "ko-fi" },
    }),
    "Complete or remove unfinished links before publishing.",
  );
  assert.equal(
    publicationIssue(
      portfolioSchema.parse({
        name: "Riley",
        works: [{ title: "Film", video: "vimeo" }],
      }),
    ),
    "Complete or remove unfinished links before publishing.",
  );
});
