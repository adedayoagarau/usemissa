import assert from "node:assert/strict";
import test from "node:test";

import {
  portfolioSchema,
  publicationIssue,
  publicPortfolioProjection,
  setAddon,
  type PortfolioAddon,
  type PortfolioData,
} from "./creator-portfolio-schema";
import { profileSuggestions } from "./creator-profile-suggestions";
import {
  applyLensAddons,
  applyLensOrder,
  availabilityLabel,
  availabilityState,
  eventCalendarFile,
  workFormats,
} from "./creator-profile";

const image =
  "/api/creator/portfolio-media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("an empty draft asks for a name first and blocks publication", () => {
  const suggestions = profileSuggestions(portfolioSchema.parse({}));
  assert.equal(suggestions[0].id, "name");
  assert.equal(suggestions[0].blocking, true);
  assert.ok(suggestions.some((item) => item.id === "first-work"));
});

test("suggestions point at the section that fixes them", () => {
  const draft = portfolioSchema.parse({
    name: "Maya",
    bio: "Poet.",
    hero: "plate",
    works: [{ title: "Untitled sea", image }],
    record: [{ title: "Issue 3", venue: "Small Review" }],
    now: { text: "Writing", until: "2020-01-01" },
    events: [{ title: "Old reading", date: "2020-01-01" }],
  });
  const ids = profileSuggestions(draft, "2026-10-04").map((item) => item.id);
  assert.deepEqual(ids, [
    "alt-text",
    "link-record",
    "now-ended",
    "past-events",
  ]);
  const withCaption = portfolioSchema.parse({
    ...draft,
    works: [{ title: "Untitled sea", image, caption: "Grey sea at dusk" }],
  });
  assert.ok(
    !profileSuggestions(withCaption, "2026-10-04").some(
      (item) => item.id === "plate",
    ),
  );
});

test("lens order keeps each section's visibility", () => {
  const order = applyLensOrder(
    [
      { id: "work", visible: true },
      { id: "press", visible: false },
    ],
    "stage",
  );
  assert.deepEqual(
    order.slice(0, 6).map((module) => module.id),
    ["upcoming", "work", "press", "record", "shelf", "about"],
  );
  assert.equal(order.find((module) => module.id === "press")?.visible, false);
  // Every add-on follows, still switched off.
  assert.equal(order.length, 13);
  assert.equal(
    order.slice(6).every((module) => module.added === false),
    true,
  );
});

test("a craft lens switches on its usual add-ons and keeps the rest as they were", () => {
  const modules = applyLensAddons(
    applyLensOrder([{ id: "services", visible: true, added: true }], "visual"),
    "visual",
  );
  const on = (id: string) => modules.find((m) => m.id === id)?.added;
  assert.equal(on("editions"), true);
  assert.equal(on("shows"), true);
  assert.equal(on("services"), true, "an add-on already on stays on");
  assert.equal(on("booking"), false);
});

test("work formats come from content, not declared disciplines", () => {
  const [work] = portfolioSchema.parse({
    works: [
      { title: "Link only", url: "https://example.com", formats: ["Sound"] },
    ],
  }).works;
  assert.deepEqual(workFormats(work), ["Link"]);
});

test("availability from a passed date reads as open", () => {
  const item = {
    label: "Residencies",
    state: "from" as const,
    date: "2026-03-01",
  };
  assert.equal(availabilityState(item, "2026-02-01"), "from");
  assert.equal(availabilityState(item, "2026-03-01"), "open");
  assert.equal(
    availabilityLabel(item, "2026-02-01"),
    "Residencies from 1 March",
  );
});

test("calendar files escape text and use the event date", () => {
  const file = decodeURIComponent(
    eventCalendarFile(
      {
        id: "e_1",
        kind: "Reading",
        title: "Reading; with friends",
        date: "2026-11-02",
        time: "19:30",
        place: "Hall, Leith",
        url: "",
        status: "open",
      },
      "Maya",
    ),
  );
  assert.match(file, /DTSTART:20261102T193000/);
  assert.match(file, /SUMMARY:Reading\\; with friends — Maya/);
  assert.match(file, /LOCATION:Hall\\, Leith/);
});

/* ---------- Add-ons: Editions, Shows, Services, Teaching, Support ---------- */

const settled = {
  name: "Maya",
  bio: "Poet.",
  works: [{ title: "Untitled sea" }],
};

/** A settled profile with these add-ons switched on, plus anything else. */
function withAddons(
  addons: PortfolioAddon[],
  extra: Record<string, unknown> = {},
  { visible = true }: { visible?: boolean } = {},
) {
  return portfolioSchema.parse({
    ...settled,
    ...extra,
    modules: addons.reduce(
      (modules, id) =>
        setAddon(modules, id, true).map((entry) =>
          entry.id === id ? { ...entry, visible } : entry,
        ),
      [] as PortfolioData["modules"],
    ),
  });
}
const idsOf = (draft: PortfolioData, today = "2026-10-07") =>
  profileSuggestions(draft, today).map((item) => item.id);

test("an add-on that is on but empty asks for its first entry", () => {
  const draft = withAddons([
    "editions",
    "shows",
    "services",
    "teaching",
    "support",
  ]);
  const suggestions = profileSuggestions(draft, "2026-10-07");
  assert.deepEqual(
    suggestions.map((item) => [item.id, item.panel, item.action]),
    [
      ["empty-editions", "editions", "Add edition"],
      ["empty-shows", "shows", "Add show"],
      ["empty-services", "services", "Add service"],
      ["empty-teaching", "teaching", "Add session"],
      ["empty-support", "support", "Add link"],
    ],
  );
  assert.equal(
    suggestions.every((item) => !item.blocking),
    true,
    "an empty add-on never blocks publishing",
  );
  assert.match(suggestions[0].text, /^Add your first edition\./);
  assert.match(suggestions[0].text, /left out of your profile/);
});

test("an empty add-on is not asked about while it is off, hidden or filled", () => {
  assert.deepEqual(idsOf(withAddons([])), []);
  assert.deepEqual(
    idsOf(withAddons(["editions", "support"], {}, { visible: false })),
    [],
    "a section the creator has hidden is a choice, not a gap",
  );
  const filled = withAddons(
    ["editions", "shows", "services", "teaching", "support"],
    {
      editions: [{ title: "Indigo Hours III" }],
      shows: [{ title: "Indigo Hours" }],
      services: [{ title: "Commissioned poems" }],
      teaching: [{ title: "Relief printing", date: "2099-01-01" }],
      support: { label: "", url: "https://example.com/support", note: "" },
    },
  );
  assert.deepEqual(idsOf(filled), []);
  // A row with no title is not on the profile, so it does not count.
  assert.deepEqual(
    idsOf(withAddons(["editions"], { editions: [{ title: "  " }] })),
    ["empty-editions"],
  );
  // Support needs its link; a label alone shows nothing.
  assert.deepEqual(
    idsOf(
      withAddons(["support"], {
        support: { label: "Support me", url: "", note: "" },
      }),
    ),
    ["empty-support"],
  );
});

test("a teaching session whose date has passed is flagged, not an undated one", () => {
  const draft = withAddons(["teaching"], {
    teaching: [
      { title: "Last spring", date: "2026-03-01" },
      { title: "Today", date: "2026-10-07" },
      { title: "Next spring", date: "2027-03-09" },
      { title: "Ongoing", date: "" },
    ],
  });
  const [past] = profileSuggestions(draft, "2026-10-07");
  assert.equal(past.id, "past-teaching");
  assert.equal(past.panel, "teaching");
  assert.equal(past.blocking, false);
  assert.match(past.text, /^1 past teaching session is hidden\./);
  const two = withAddons(["teaching"], {
    teaching: [
      { title: "A", date: "2026-01-01" },
      { title: "B", date: "2026-02-01" },
    ],
  });
  assert.match(
    profileSuggestions(two, "2026-10-07")[0].text,
    /^2 past teaching sessions are hidden\. Update the date or remove them\./,
  );
  assert.deepEqual(
    idsOf({ ...draft, modules: withAddons([]).modules }),
    [],
    "with Teaching off there is nothing to tidy",
  );
});

test("a support link that is not a full web address blocks publishing", () => {
  for (const url of [
    "ko-fi",
    "example.com/support",
    "https://",
    "javascript:alert(1)",
  ]) {
    const draft = withAddons(["support"], {
      support: { label: "Support Maya", url, note: "" },
    });
    const [blocker, ...rest] = profileSuggestions(draft, "2026-10-07");
    assert.equal(blocker.id, "support-link", url);
    assert.equal(blocker.blocking, true, url);
    assert.equal(blocker.panel, "support", url);
    assert.match(blocker.text, /full web address/);
    assert.deepEqual(
      rest.map((item) => item.id),
      [],
      "the general unfinished-links notice does not repeat it",
    );
    // This is exactly what the server refuses to publish.
    assert.equal(
      publicationIssue(publicPortfolioProjection(draft)),
      "Complete or remove unfinished links before publishing.",
    );
  }
  const fine = withAddons(["support"], {
    support: { label: "", url: "https://example.com/support", note: "" },
  });
  assert.deepEqual(idsOf(fine), []);
  assert.equal(publicationIssue(publicPortfolioProjection(fine)), undefined);
});

test("a broken add-on link only blocks while that add-on is on the profile", () => {
  const broken = { support: { label: "", url: "ko-fi", note: "" } };
  for (const draft of [
    withAddons([], broken),
    withAddons(["support"], broken, { visible: false }),
  ]) {
    assert.deepEqual(idsOf(draft), []);
    // The server publishes the projection, which has no Support at all.
    assert.equal(publicationIssue(publicPortfolioProjection(draft)), undefined);
  }
});

test("unfinished show links are counted and sent to Shows and performances", () => {
  const draft = withAddons(["shows"], {
    shows: [
      { title: "A", url: "nope" },
      { title: "B", url: "https://example.com/b" },
      { title: "C", url: "also nope" },
    ],
  });
  const [blocker] = profileSuggestions(draft, "2026-10-07");
  assert.equal(blocker.id, "shows-link");
  assert.equal(blocker.blocking, true);
  assert.equal(blocker.panel, "shows");
  assert.match(blocker.text, /^2 show links aren’t a full web address\./);
  const one = withAddons(["shows"], { shows: [{ title: "A", url: "nope" }] });
  assert.match(
    profileSuggestions(one, "2026-10-07")[0].text,
    /^1 show link isn’t a full web address\. Start it with/,
  );
});

test("another unfinished link still raises the general notice beside the add-on ones", () => {
  const draft = withAddons(["support"], {
    support: { label: "", url: "ko-fi", note: "" },
    contact: { email: "", website: "nope", instagram: "", newsletter: "" },
  });
  assert.deepEqual(idsOf(draft), ["publication", "support-link"]);
});
