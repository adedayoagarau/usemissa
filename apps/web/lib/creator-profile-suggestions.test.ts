import assert from "node:assert/strict";
import test from "node:test";

import { portfolioSchema } from "./creator-portfolio-schema";
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
