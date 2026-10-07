import assert from "node:assert/strict";
import test from "node:test";
import { portfolioSchema } from "./creator-portfolio-schema";
import {
  SUPPORT_LEAVES_MISSA,
  editionAvailability,
  editionDetails,
  editionEnquiry,
  editionSizeLabel,
  groupShowsByYear,
  longDateLabel,
  serviceEnquiry,
  serviceFacts,
  supportNote,
  teachingEnquiry,
  teachingPlaces,
  upcomingTeaching,
  visibleEditions,
  visibleServices,
  visibleShows,
} from "./creator-profile-addons";

const parse = (input: Record<string, unknown>) => portfolioSchema.parse(input);

test("edition availability needs both numbers and says them plainly", () => {
  assert.deepEqual(editionAvailability({ total: 12, available: 4 }), {
    state: "available",
    label: "4 of 12 available",
  });
  assert.deepEqual(editionAvailability({ total: 12, available: 12 }), {
    state: "available",
    label: "12 of 12 available",
  });
  assert.deepEqual(editionAvailability({ total: 12, available: 0 }), {
    state: "sold-out",
    label: "Sold out",
  });
});

test("the last print of an edition reads as the last one, a unique work does not", () => {
  assert.equal(editionAvailability({ total: 12, available: 1 })?.state, "last");
  assert.equal(
    editionAvailability({ total: 12, available: 1 })?.label,
    "1 of 12 available",
  );
  assert.equal(
    editionAvailability({ total: 1, available: 1 })?.state,
    "available",
  );
});

test("edition availability says nothing when a number is missing or cannot be right", () => {
  assert.equal(editionAvailability({}), undefined);
  assert.equal(editionAvailability({ total: 12 }), undefined);
  assert.equal(editionAvailability({ available: 4 }), undefined);
  // More available than the edition, an edition of none, a fraction.
  assert.equal(editionAvailability({ total: 4, available: 9 }), undefined);
  assert.equal(editionAvailability({ total: 0, available: 0 }), undefined);
  assert.equal(editionAvailability({ total: 12, available: 2.5 }), undefined);
  assert.equal(editionAvailability({ total: 12, available: -1 }), undefined);
});

test("an edition with only its size reads Edition of N", () => {
  assert.equal(editionSizeLabel({ total: 12 }), "Edition of 12");
  assert.equal(editionSizeLabel({ total: 12, available: 4 }), undefined);
  assert.equal(editionSizeLabel({}), undefined);
  assert.equal(editionSizeLabel({ total: 0 }), undefined);
});

test("edition details run medium, size, year and skip what is blank", () => {
  assert.equal(
    editionDetails({
      medium: "Relief print",
      size: "56 × 76 cm",
      year: "2026",
    }),
    "Relief print · 56 × 76 cm · 2026",
  );
  assert.equal(
    editionDetails({ medium: "", size: "56 × 76 cm", year: " " }),
    "56 × 76 cm",
  );
  assert.equal(editionDetails({ medium: "", size: "", year: "" }), "");
});

test("an edition enquiry names the edition, and a sold-out one asks about another", () => {
  assert.deepEqual(
    editionEnquiry({ title: "Indigo Hours III", total: 12, available: 4 }),
    {
      label: "Enquire",
      hiddenSuffix: " about Indigo Hours III",
      topic: "commission",
      message: "About Indigo Hours III: ",
    },
  );
  assert.deepEqual(
    editionEnquiry({ title: "Salt ledger", total: 12, available: 0 }),
    {
      label: "Ask about another print",
      hiddenSuffix: " (Salt ledger)",
      topic: "commission",
      message: "About another print like Salt ledger: ",
    },
  );
  // Without numbers it is an ordinary enquiry.
  assert.equal(editionEnquiry({ title: "Tide table" }).label, "Enquire");
});

test("untitled editions, shows and services never reach a visitor", () => {
  const draft = parse({
    editions: [{ title: "Indigo Hours III" }, { title: "  " }],
    shows: [{ title: "Indigo Hours", year: "2026" }, { title: "" }],
    services: [{ title: "Commissioned poems" }, { title: "" }],
  });
  assert.equal(visibleEditions(draft).length, 1);
  assert.equal(visibleShows(draft).length, 1);
  assert.equal(visibleServices(draft).length, 1);
});

test("shows group by year, newest first, keeping the creator's order inside a year", () => {
  const shows = parse({
    shows: [
      { title: "A", year: "2024" },
      { title: "B", year: "2026" },
      { title: "C", year: "2024" },
      { title: "D", year: "2025" },
      { title: "E", year: "2026" },
    ],
  }).shows;
  const groups = groupShowsByYear(shows);
  assert.deepEqual(
    groups.map((group) => [group.label, group.shows.map((s) => s.title)]),
    [
      ["2026", ["B", "E"]],
      ["2025", ["D"]],
      ["2024", ["A", "C"]],
    ],
  );
});

test("shows without a usable year gather last as Undated", () => {
  const shows = parse({
    shows: [
      { title: "A", year: "" },
      { title: "B", year: "2023" },
      { title: "C", year: "ca98" },
      { title: "D", year: "2025" },
    ],
  }).shows;
  const groups = groupShowsByYear(shows);
  assert.deepEqual(
    groups.map((group) => group.label),
    ["2025", "2023", "Undated"],
  );
  assert.deepEqual(
    groups.at(-1)?.shows.map((show) => show.title),
    ["A", "C"],
  );
  assert.deepEqual(groupShowsByYear([]), []);
});

test("service facts leave out rates that were not given", () => {
  assert.deepEqual(serviceFacts({ timing: "3–4 weeks", price: "On request" }), [
    { label: "Typical timing", value: "3–4 weeks" },
    { label: "Rates", value: "On request" },
  ]);
  assert.deepEqual(
    serviceFacts({ timing: "Booked a season ahead", price: "" }),
    [{ label: "Typical timing", value: "Booked a season ahead" }],
  );
  assert.deepEqual(serviceFacts({ timing: " ", price: " " }), []);
  assert.deepEqual(serviceEnquiry({ title: "Commissioned poems" }), {
    label: "Get in touch",
    hiddenSuffix: " about Commissioned poems",
    topic: "commission",
    message: "About Commissioned poems: ",
  });
});

test("teaching shows places only when stated, a nudge when few, Full at none", () => {
  assert.equal(teachingPlaces(undefined), undefined);
  assert.deepEqual(teachingPlaces(0), { label: "Full", tone: "full" });
  assert.deepEqual(teachingPlaces(1), { label: "1 place left", tone: "few" });
  assert.deepEqual(teachingPlaces(3), { label: "3 places left", tone: "few" });
  assert.deepEqual(teachingPlaces(8), { label: "8 places left", tone: "some" });
  assert.equal(teachingPlaces(-2), undefined);
  assert.equal(teachingPlaces(2.5), undefined);
});

test("a teaching request uses the booking topic and names the session", () => {
  assert.deepEqual(
    teachingEnquiry({ title: "Writing from sound, two days", places: 3 }),
    {
      label: "Request a place",
      hiddenSuffix: " on Writing from sound, two days",
      topic: "booking",
      message: "About Writing from sound, two days: ",
    },
  );
  assert.equal(
    teachingEnquiry({ title: "Relief printing" }).label,
    "Request a place",
  );
  assert.deepEqual(teachingEnquiry({ title: "Relief printing", places: 0 }), {
    label: "Ask about the next one",
    hiddenSuffix: " (Relief printing)",
    topic: "booking",
    message: "About the next Relief printing: ",
  });
});

test("teaching lists sessions to come, soonest first, undated last", () => {
  const items = parse({
    teaching: [
      { title: "Later", date: "2027-05-01" },
      { title: "Passed", date: "2026-01-10" },
      { title: "Undated" },
      { title: "Soon", date: "2026-11-02" },
      { title: "Today", date: "2026-10-07" },
      { title: "" },
    ],
  }).teaching;
  assert.deepEqual(
    upcomingTeaching(items, "2026-10-07").map((item) => item.title),
    ["Today", "Soon", "Later", "Undated"],
  );
  assert.deepEqual(upcomingTeaching([], "2026-10-07"), []);
});

test("support never repeats Missa's own line as the creator's note", () => {
  assert.equal(supportNote(SUPPORT_LEAVES_MISSA), undefined);
  assert.equal(supportNote("payments happen outside missa"), undefined);
  assert.equal(supportNote("  "), undefined);
  assert.equal(
    supportNote("Every pound buys paper for the next edition."),
    "Every pound buys paper for the next edition.",
  );
});

test("a long date is written out the same on the server and in the browser", () => {
  assert.equal(longDateLabel("2027-03-09"), "Tuesday 9 March 2027");
  assert.equal(longDateLabel("2026-11-22"), "Sunday 22 November 2026");
  assert.equal(longDateLabel("2026-02-30"), "2026-02-30");
  assert.equal(longDateLabel(""), "");
  assert.equal(longDateLabel("soon"), "soon");
});
