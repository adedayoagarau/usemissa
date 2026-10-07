import assert from "node:assert/strict";
import test from "node:test";
import {
  ADDON_MODULES,
  createWork,
  emptyPortfolio,
  type PortfolioData,
  type PortfolioEvent,
} from "./creator-portfolio-schema";
import { sampleCreatorPortfolio } from "./creator-profile-sample";
import {
  eventLabel,
  eventWhen,
  excerptLines,
  findShareableEvent,
  practiceLine,
  profileAddress,
  profileLink,
  scanLine,
  shareableEvents,
  storyBody,
  storyExcerpt,
  truncateAtWord,
} from "./creator-share-kit";

const TODAY = "2026-10-07";

const event = (extra: Partial<PortfolioEvent> = {}): PortfolioEvent => ({
  id: "e_1",
  kind: "Reading",
  title: "Reading from Field notes",
  date: "2026-11-02",
  time: "19:00",
  place: "Saltmarsh Writers’ House, Fife",
  url: "",
  status: "free",
  ...extra,
});

const withEvents = (events: PortfolioEvent[]): PortfolioData => ({
  ...emptyPortfolio(),
  name: "Riley Chen",
  events,
});

/* ---------- Story text ---------- */

test("a poem keeps its own line breaks, up to three lines", () => {
  const featured = sampleCreatorPortfolio().works[0];
  const excerpt = storyExcerpt(featured);
  assert.equal(excerpt?.source, "text");
  assert.deepEqual(excerpt?.lines, [
    "The train window holds the lake",
    "the way a palm holds water —",
    "briefly, and with all of itself.",
  ]);
});

test("the excerpt stops at the end of the first stanza", () => {
  assert.deepEqual(excerptLines("One line.\nTwo lines.\n\nA second stanza."), [
    "One line.",
    "Two lines.",
  ]);
  assert.deepEqual(excerptLines("\n\n  First after blanks\nsecond"), [
    "First after blanks",
    "second",
  ]);
});

test("a long line is cut at a word and marked, never mid-word", () => {
  const long =
    "The harbour wall remembers every boat that left it and keeps a small light on for the ones that never came back to be counted again, whatever the tide says.";
  const [line, ...rest] = excerptLines(long);
  assert.equal(rest.length, 0);
  assert.ok(line.endsWith("…"));
  assert.ok(line.length <= 141);
  assert.ok(long.startsWith(line.slice(0, -1)));
  assert.equal(line.at(-2) === " ", false);
});

test("a second line that would go over the budget is left out whole", () => {
  const lines = excerptLines(`${"a".repeat(100)}\n${"b".repeat(100)}`);
  assert.deepEqual(lines, ["a".repeat(100)]);
});

test("lines are trimmed and CRLF is handled", () => {
  assert.deepEqual(excerptLines("  one \r\n two  \r\n"), ["one", "two"]);
});

test("without text the summary, then the caption, then the title is used", () => {
  assert.deepEqual(
    storyExcerpt(
      createWork({ title: "T", summary: "A summary.", caption: "C" }),
    ),
    { lines: ["A summary."], source: "summary" },
  );
  assert.deepEqual(
    storyExcerpt(createWork({ title: "T", caption: "A caption" })),
    { lines: ["A caption"], source: "caption" },
  );
  assert.deepEqual(storyExcerpt(createWork({ title: "Only a title" })), {
    lines: ["Only a title"],
    source: "title",
  });
});

test("no work, or a work with nothing to say, gives no excerpt", () => {
  assert.equal(storyExcerpt(undefined), undefined);
  assert.equal(storyExcerpt(createWork({ title: "   " })), undefined);
});

test("a cut prefers the end of a clause to the middle of a phrase", () => {
  const cut = truncateAtWord(
    "The train window holds the lake the way a palm holds water, briefly, and with all of itself, and the carriage keeps its small promises: the next stop",
    140,
  );
  assert.equal(
    cut,
    "The train window holds the lake the way a palm holds water, briefly, and with all of itself, and the carriage keeps its small promises…",
  );
  // Without a clause in the last 40%, it falls back to the last whole word.
  assert.equal(
    truncateAtWord("one two three four five six seven eight nine ten", 30),
    "one two three four five six…",
  );
  assert.equal(truncateAtWord("short", 140), "short");
  assert.equal(truncateAtWord("a".repeat(50), 20), `${"a".repeat(20)}…`);
});

test("the story takes the featured work, then the statement, then what they make", () => {
  const sample = sampleCreatorPortfolio();
  assert.equal(storyBody(sample)?.source, "text");
  const noWorks = { ...sample, works: [] };
  assert.deepEqual(storyBody(noWorks), {
    lines: [sample.statement],
    source: "statement",
  });
  assert.deepEqual(storyBody({ ...noWorks, statement: "" }), {
    lines: ["Poet, sound artist and photographer"],
    source: "line",
  });
  assert.equal(
    storyBody({ ...noWorks, statement: "", selected: [] }),
    undefined,
  );
});

test("the featured work leads the story, not the first one", () => {
  const sample = sampleCreatorPortfolio();
  const works = sample.works.map((work, index) => ({
    ...work,
    featured: index === 1,
  }));
  assert.equal(
    storyBody({ ...sample, works })?.lines[0],
    "Ebb: what the water owes the shore.",
  );
});

test("the scan line names only what the profile holds", () => {
  const work = (extra: Record<string, unknown>) =>
    createWork({ title: "T", ...extra });
  assert.equal(scanLine({ works: [] }), "Scan for the full profile.");
  assert.equal(
    scanLine({ works: [work({ text: "A poem" })] }),
    "Scan for the writing.",
  );
  assert.equal(
    scanLine({ works: [work({ text: "A poem", image: "/x" })] }),
    "Scan for the writing and images.",
  );
  assert.equal(
    scanLine({
      works: [
        work({ text: "A poem" }),
        work({ image: "/x" }),
        work({ audio: "/y" }),
      ],
    }),
    "Scan for the writing, images and recordings.",
  );
});

/* ---------- The line under the name ---------- */

test("the line under the name reads like the profile page", () => {
  assert.equal(
    practiceLine(["Poet", "Sound artist", "Photographer"]),
    "Poet, sound artist and photographer",
  );
  assert.equal(practiceLine(["Poet"]), "Poet");
  assert.equal(practiceLine(["  ", ""]), "");
  assert.equal(
    practiceLine(["Poet", "MIDI composer"]),
    "Poet and MIDI composer",
  );
});

/* ---------- Addresses ---------- */

test("addresses are built from the site, not typed in", () => {
  assert.match(profileLink("rileychen"), /^https:\/\/.+\/@rileychen$/);
  assert.match(profileAddress("rileychen"), /^[^/]+\/@rileychen$/);
  assert.ok(!profileAddress("rileychen").startsWith("www."));
  assert.ok(!profileAddress("rileychen").includes("://"));
});

/* ---------- Events ---------- */

test("only listed, upcoming events with an address get a card", () => {
  const portfolio = withEvents([
    event({ id: "e_ok" }),
    event({ id: "e_past", date: "2026-09-01" }),
    event({ id: "e_today", date: TODAY }),
    event({ id: "e_untitled", title: "   " }),
    event({ id: "e_nodate", date: "" }),
    event({ id: undefined, title: "No address" }),
  ]);
  assert.deepEqual(
    shareableEvents(portfolio, TODAY).map((item) => item.id),
    ["e_today", "e_ok"],
  );
});

test("events are in date and time order", () => {
  const portfolio = withEvents([
    event({ id: "late", date: "2026-12-01", time: "10:00" }),
    event({ id: "same-day-evening", date: "2026-11-02", time: "19:00" }),
    event({ id: "same-day-morning", date: "2026-11-02", time: "09:30" }),
  ]);
  assert.deepEqual(
    shareableEvents(portfolio, TODAY).map((item) => item.id),
    ["same-day-morning", "same-day-evening", "late"],
  );
});

test("hiding the upcoming section hides every card", () => {
  const portfolio = withEvents([event()]);
  portfolio.modules = [{ id: "upcoming", visible: false }];
  assert.deepEqual(shareableEvents(portfolio, TODAY), []);
  assert.equal(findShareableEvent(portfolio, "e_1", TODAY), undefined);
});

test("an event id that appears twice is listed once", () => {
  const portfolio = withEvents([
    event({ id: "dup", title: "First" }),
    event({ id: "dup", title: "Second", date: "2026-12-01" }),
  ]);
  const found = shareableEvents(portfolio, TODAY);
  assert.equal(found.length, 1);
  assert.equal(found[0].title, "First");
});

test("an event is found by its id, and unknown or past ids are not", () => {
  const portfolio = withEvents([
    event({ id: "e_ok" }),
    event({ id: "e_past", date: "2026-01-01" }),
  ]);
  assert.equal(
    findShareableEvent(portfolio, "e_ok", TODAY)?.title,
    "Reading from Field notes",
  );
  assert.equal(findShareableEvent(portfolio, "e_past", TODAY), undefined);
  assert.equal(findShareableEvent(portfolio, "missing", TODAY), undefined);
  assert.equal(findShareableEvent(portfolio, "", TODAY), undefined);
  assert.equal(findShareableEvent(portfolio, "E_OK", TODAY), undefined);
});

test("the sample creator's events all have cards", () => {
  const sample = sampleCreatorPortfolio();
  assert.equal(shareableEvents(sample).length, sample.events.length);
});

test("an add-on switched off in the draft does not affect event cards", () => {
  const portfolio = withEvents([event()]);
  portfolio.modules = ADDON_MODULES.map((id) => ({
    id,
    visible: true,
    added: false,
  }));
  assert.equal(shareableEvents(portfolio, TODAY).length, 1);
});

test("the event label reads date, then time, with the year only when it differs", () => {
  assert.equal(
    eventWhen(event({ date: "2026-11-02", time: "19:00" }), TODAY),
    "Mon 2 Nov · 19:00",
  );
  assert.equal(
    eventWhen(event({ date: "2027-01-18", time: "19:00" }), TODAY),
    "Mon 18 Jan 2027 · 19:00",
  );
  assert.equal(
    eventWhen(event({ date: "2026-11-02", time: "" }), TODAY),
    "Mon 2 Nov",
  );
  assert.equal(
    eventLabel(event({ kind: "Reading", date: "2026-11-02" }), TODAY),
    "Reading · Mon 2 Nov · 19:00",
  );
  assert.equal(
    eventLabel(event({ kind: "  ", date: "2026-11-02" }), TODAY),
    "Mon 2 Nov · 19:00",
  );
  assert.equal(eventWhen(event({ date: "nonsense" }), TODAY), "");
});
