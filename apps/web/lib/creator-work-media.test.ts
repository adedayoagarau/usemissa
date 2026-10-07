import assert from "node:assert/strict";
import test from "node:test";
import { createWork } from "./creator-portfolio-schema";
import { buildContentSecurityPolicy } from "./content-security-policy";
import {
  VIDEO_EMBED_ORIGINS,
  accessNotes,
  activeChapterIndex,
  caseStudyFacts,
  chapterMarks,
  chapterTimeIssue,
  detectVideo,
  filterAnnouncement,
  filterWorks,
  formatClock,
  groupWorksBySeries,
  hasCaseStudy,
  hasWallLabel,
  parseChapterTime,
  partsLabel,
  seriesKeys,
  seriesSummary,
  videoEmbedSrc,
  wallLabelDetails,
  wallLabelText,
  workFilters,
} from "./creator-work-media";
import { workFormats } from "./creator-profile";

const w = (title: string, extra: Record<string, unknown> = {}) =>
  createWork({ title, ...extra });

/* ---------- Time ---------- */

test("chapter times parse as mm:ss and h:mm:ss, and nothing else", () => {
  assert.equal(parseChapterTime("00:00"), 0);
  assert.equal(parseChapterTime("09:40"), 580);
  assert.equal(parseChapterTime("9:40"), 580);
  assert.equal(parseChapterTime("1:02:30"), 3750);
  assert.equal(parseChapterTime(" 03:12 "), 192);
  for (const bad of ["", "9", "9.40", "09:60", "1:75:00", "ab:cd", "1:2:3:4"])
    assert.equal(parseChapterTime(bad), null, bad);
});

test("clock text pads minutes and seconds and adds hours only when needed", () => {
  assert.equal(formatClock(0), "00:00");
  assert.equal(formatClock(134.9), "02:14");
  assert.equal(formatClock(402), "06:42");
  assert.equal(formatClock(3750), "1:02:30");
  assert.equal(formatClock(Number.NaN), "00:00");
  assert.equal(formatClock(-5), "00:00");
  assert.equal(formatClock(Number.POSITIVE_INFINITY), "00:00");
});

test("a chapter time that is not minutes and seconds gets a warning", () => {
  assert.equal(chapterTimeIssue(""), undefined);
  assert.equal(chapterTimeIssue("09:40"), undefined);
  assert.equal(chapterTimeIssue("1:02:30"), undefined);
  assert.match(chapterTimeIssue("9.40") ?? "", /09:40/);
  assert.match(chapterTimeIssue("09:75") ?? "", /minutes and seconds/);
});

test("visitors see chapters with a time and a title, in time order", () => {
  const marks = chapterMarks([
    { id: "c", at: "09:40", title: "Undertow" },
    { id: "a", at: "00:00", title: "Prologue" },
    { id: "x", at: "bad", title: "Dropped: no time" },
    { id: "y", at: "05:00", title: "   " },
    { id: "b", at: "03:12", title: " The rope " },
  ]);
  assert.deepEqual(
    marks.map((mark) => [mark.at, mark.seconds, mark.title]),
    [
      ["00:00", 0, "Prologue"],
      ["03:12", 192, "The rope"],
      ["09:40", 580, "Undertow"],
    ],
  );
});

test("the active chapter is the last one that has started", () => {
  const marks = chapterMarks([
    { at: "00:10", title: "A" },
    { at: "01:00", title: "B" },
  ]);
  assert.equal(activeChapterIndex(marks, 0), -1);
  assert.equal(activeChapterIndex(marks, 10), 0);
  assert.equal(activeChapterIndex(marks, 59.9), 0);
  assert.equal(activeChapterIndex(marks, 60), 1);
  assert.equal(activeChapterIndex([], 100), -1);
});

/* ---------- Film links ---------- */

test("YouTube links in every common shape are read", () => {
  for (const link of [
    "https://www.youtube.com/watch?v=M7lc1UVf-VE",
    "https://youtube.com/watch?v=M7lc1UVf-VE&feature=share",
    "https://m.youtube.com/watch?v=M7lc1UVf-VE",
    "https://youtu.be/M7lc1UVf-VE",
    "https://www.youtube.com/embed/M7lc1UVf-VE",
    "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
    "https://www.youtube.com/shorts/M7lc1UVf-VE",
    "https://www.youtube.com/live/M7lc1UVf-VE",
    "http://www.youtube.com/watch?v=M7lc1UVf-VE",
  ]) {
    const source = detectVideo(link);
    assert.equal(source?.provider, "youtube", link);
    assert.equal(source?.id, "M7lc1UVf-VE", link);
    assert.equal(
      source?.watchUrl,
      "https://www.youtube.com/watch?v=M7lc1UVf-VE",
    );
  }
});

test("a start time in a YouTube link is kept", () => {
  assert.equal(detectVideo("https://youtu.be/M7lc1UVf-VE?t=90")?.startAt, 90);
  assert.equal(
    detectVideo("https://youtu.be/M7lc1UVf-VE?t=1m30s")?.startAt,
    90,
  );
  assert.equal(
    detectVideo("https://www.youtube.com/watch?v=M7lc1UVf-VE&start=12")
      ?.startAt,
    12,
  );
  assert.equal(detectVideo("https://youtu.be/M7lc1UVf-VE?t=soon")?.startAt, 0);
});

test("Vimeo links, including a private screener link with its key, are read", () => {
  const plain = detectVideo("https://vimeo.com/123456789");
  assert.equal(plain?.provider, "vimeo");
  assert.equal(plain?.id, "123456789");
  assert.equal(plain?.hash, undefined);
  const unlisted = detectVideo("https://vimeo.com/123456789/a1b2c3d4e5");
  assert.equal(unlisted?.hash, "a1b2c3d4e5");
  assert.equal(unlisted?.watchUrl, "https://vimeo.com/123456789/a1b2c3d4e5");
  const player = detectVideo(
    "https://player.vimeo.com/video/123456789?h=a1b2c3d4e5",
  );
  assert.equal(player?.id, "123456789");
  assert.equal(player?.hash, "a1b2c3d4e5");
  assert.equal(
    detectVideo("https://vimeo.com/channels/staffpicks/123456789")?.id,
    "123456789",
  );
  assert.equal(
    detectVideo("https://vimeo.com/showcase/1234567/video/9876543")?.id,
    "9876543",
  );
});

test("any other link, lookalike host or malformed address is not framed", () => {
  for (const link of [
    "",
    "not a link",
    "javascript:alert(1)",
    "ftp://youtube.com/watch?v=M7lc1UVf-VE",
    "https://example.com/film.mp4",
    "https://notyoutube.com/watch?v=M7lc1UVf-VE",
    "https://youtube.com.evil.example/watch?v=M7lc1UVf-VE",
    "https://evil.example/youtube.com/watch?v=M7lc1UVf-VE",
    "https://user:pass@www.youtube.com/watch?v=M7lc1UVf-VE",
    "https://www.youtube.com:8443/watch?v=M7lc1UVf-VE",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/channel/UC1234567890",
    "https://vimeo.com/about",
    "https://vimeo.com.evil.example/123456789",
    "https://tiktok.com/@creator/video/123456789",
  ])
    assert.equal(detectVideo(link), null, link);
});

test("an embed address is built from the film id on a privacy-friendly host", () => {
  const youtube = detectVideo("https://youtu.be/M7lc1UVf-VE?t=90")!;
  assert.equal(
    videoEmbedSrc(youtube),
    "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0&playsinline=1&autoplay=1&start=90",
  );
  assert.equal(
    videoEmbedSrc(youtube, { startAt: 192 }),
    "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0&playsinline=1&autoplay=1&start=192",
  );
  assert.equal(
    videoEmbedSrc(youtube, { startAt: 0, autoplay: false }),
    "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0&playsinline=1",
  );
  const vimeo = detectVideo("https://vimeo.com/123456789/a1b2c3d4e5")!;
  assert.equal(
    videoEmbedSrc(vimeo, { startAt: 580 }),
    "https://player.vimeo.com/video/123456789?dnt=1&playsinline=1&autoplay=1&h=a1b2c3d4e5#t=580s",
  );
});

test("every embed address sits on an origin the content-security-policy frames", () => {
  const sources = [
    detectVideo("https://youtu.be/M7lc1UVf-VE")!,
    detectVideo("https://vimeo.com/123456789")!,
  ];
  const policy = buildContentSecurityPolicy({ NODE_ENV: "production" });
  const frames = policy
    .split(";")
    .map((part) => part.trim().split(/\s+/))
    .find(([name]) => name === "frame-src")!
    .slice(1);
  assert.deepEqual(frames, ["'self'", ...VIDEO_EMBED_ORIGINS]);
  for (const source of sources)
    assert.ok(
      VIDEO_EMBED_ORIGINS.some((origin) =>
        videoEmbedSrc(source).startsWith(`${origin}/`),
      ),
    );
});

/* ---------- Series ---------- */

test("works that share a series sit together where the series starts", () => {
  const a1 = w("A1", { series: "Indigo Hours" });
  const loose1 = w("Loose 1");
  const b1 = w("B1", { series: "Salt and Iron" });
  const a2 = w("A2", { series: " indigo hours " });
  const loose2 = w("Loose 2");
  const b2 = w("B2", { series: "Salt and Iron" });
  const segments = groupWorksBySeries([a1, loose1, b1, a2, loose2, b2]);
  assert.deepEqual(
    segments.map((segment) => [
      segment.series,
      segment.works.map((work) => work.title),
    ]),
    [
      ["Indigo Hours", ["A1", "A2"]],
      [null, ["Loose 1"]],
      ["Salt and Iron", ["B1", "B2"]],
      [null, ["Loose 2"]],
    ],
  );
});

test("a series name on one work alone is a label, not a group", () => {
  const only = w("Only", { series: "Solo run" });
  const other = w("Other");
  assert.equal(seriesKeys([only, other]).size, 0);
  const segments = groupWorksBySeries([only, other]);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].series, null);
  assert.equal(segments[0].works.length, 2);
});

test("a filtered view keeps its series heading even when one work is left", () => {
  const works = [
    w("A1", { series: "Indigo Hours", image: "/a.webp" }),
    w("A2", { series: "Indigo Hours", text: "words" }),
    w("Loose", { image: "/b.webp" }),
  ];
  const keys = seriesKeys(works);
  const shown = filterWorks(works, "Writing");
  const segments = groupWorksBySeries(shown, keys);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].series, "Indigo Hours");
  assert.equal(segments[0].works.length, 1);
});

test("a series reads as plates when every work is an image, with its years", () => {
  const plates = [
    w("A", { image: "/a.webp", year: "2024" }),
    w("B", { image: "/b.webp", year: "2025" }),
    w("C", { image: "/c.webp", year: "2025" }),
    w("D", { image: "/d.webp", year: "2025" }),
  ];
  assert.equal(seriesSummary(plates), "4 plates · 2024–25");
  assert.equal(seriesSummary(plates.slice(1)), "3 plates · 2025");
  assert.equal(
    seriesSummary([w("A", { image: "/a" }), w("B", { year: "2025" })]),
    "2 works · 2025",
  );
  assert.equal(seriesSummary([w("A", { image: "/a" })]), "1 plate");
  assert.equal(
    seriesSummary([
      w("A", { image: "/a", year: "1999" }),
      w("B", { image: "/b", year: "2003" }),
    ]),
    "2 plates · 1999–2003",
  );
});

/* ---------- Format filter ---------- */

test("a film is a format of its own", () => {
  assert.deepEqual(
    workFormats(w("F", { video: "https://youtu.be/M7lc1UVf-VE" })),
    ["Film"],
  );
  // Its picture is the poster, so a film is not also a work of images.
  assert.deepEqual(
    workFormats(w("F", { video: "https://youtu.be/M7lc1UVf-VE", image: "/p" })),
    ["Film"],
  );
  assert.deepEqual(workFormats(w("S", { image: "/p", audio: "/a" })), [
    "Images",
    "Sound",
  ]);
  assert.deepEqual(workFormats(w("L", { url: "https://example.com" })), [
    "Link",
  ]);
});

test("the filter is built from formats present and gains Series only with a series", () => {
  const oneFormat = [w("A", { image: "/a" }), w("B", { image: "/b" })];
  assert.deepEqual(workFilters(oneFormat), []);
  const mixed = [w("A", { image: "/a" }), w("B", { text: "words" })];
  assert.deepEqual(workFilters(mixed), ["Images", "Writing"]);
  const withSeries = [
    w("A", { image: "/a", series: "S" }),
    w("B", { image: "/b", series: "S" }),
    w("C", { image: "/c" }),
  ];
  assert.deepEqual(workFilters(withSeries), ["Series"]);
  const mixedSeries = [...withSeries, w("D", { text: "words" })];
  assert.deepEqual(workFilters(mixedSeries), ["Images", "Writing", "Series"]);
});

test("Series is left out when every work is in one, and when none is", () => {
  const all = [
    w("A", { image: "/a", series: "S" }),
    w("B", { image: "/b", series: "S" }),
  ];
  assert.deepEqual(workFilters(all), []);
  const labelled = [
    w("A", { image: "/a", series: "Lonely" }),
    w("B", { image: "/b" }),
  ];
  assert.deepEqual(workFilters(labelled), []);
});

test("filtering by Series keeps only grouped work", () => {
  const works = [
    w("A", { image: "/a", series: "S" }),
    w("B", { image: "/b" }),
    w("C", { image: "/c", series: "S" }),
    w("D", { image: "/d", series: "Lonely" }),
  ];
  assert.deepEqual(
    filterWorks(works, "Series").map((work) => work.title),
    ["A", "C"],
  );
  assert.equal(filterWorks(works, "All").length, 4);
});

test("a filter change is announced in plain words", () => {
  assert.equal(filterAnnouncement("All", 8), "");
  assert.equal(filterAnnouncement("Writing", 4), "Showing 4 writing works.");
  assert.equal(filterAnnouncement("Sound", 1), "Showing 1 sound work.");
  assert.equal(filterAnnouncement("Series", 6), "Showing 6 works in a series.");
});

/* ---------- Wall label ---------- */

test("a wall label prints title and year, then medium, size and edition", () => {
  const work = w("Indigo Hours III", {
    year: "2025",
    medium: "Relief print on Kozo paper",
    size: "56 × 76 cm",
    edition: "Edition of 12",
  });
  assert.deepEqual(wallLabelDetails(work), [
    "Relief print on Kozo paper",
    "56 × 76 cm",
    "Edition of 12",
  ]);
  assert.equal(
    wallLabelText(work),
    "Indigo Hours III, 2025 · Relief print on Kozo paper · 56 × 76 cm · Edition of 12",
  );
  assert.equal(hasWallLabel(work), true);
});

test("a wall label skips what is blank", () => {
  assert.equal(
    wallLabelText(w("Untitled", { year: "2024" })),
    "Untitled, 2024",
  );
  assert.equal(
    wallLabelText(w("Untitled", { size: " 30 × 40 cm " })),
    "Untitled · 30 × 40 cm",
  );
  assert.equal(hasWallLabel(w("Untitled", { year: "2024" })), false);
  assert.equal(wallLabelText(w("")), "");
});

/* ---------- Case study ---------- */

test("a case study lists brief, role, client and outcome, skipping blanks", () => {
  const work = w("Harbour identity", {
    brief: "A new identity for a coastal arts festival.",
    role: "Lead designer, with two illustrators",
    client: "Harbour Arts Council",
    clientOrganization: {
      id: "org_1",
      name: "Harbour Arts Council",
      kind: "Arts council",
      href: "/org/harbour-arts-council",
    },
    outcome: "Launched April 2026",
  });
  assert.deepEqual(caseStudyFacts(work), [
    { label: "Brief", value: "A new identity for a coastal arts festival." },
    { label: "Role", value: "Lead designer, with two illustrators" },
    {
      label: "Client",
      value: "Harbour Arts Council",
      href: "/org/harbour-arts-council",
    },
    { label: "Outcome", value: "Launched April 2026" },
  ]);
  assert.equal(hasCaseStudy(work), true);
});

test("a client without a directory profile is plain text, and a linked one needs no name", () => {
  const plain = caseStudyFacts(w("A", { client: "A small bakery" }));
  assert.deepEqual(plain, [
    { label: "Client", value: "A small bakery", href: undefined },
  ]);
  const linked = caseStudyFacts(
    w("B", {
      clientOrganization: {
        id: "o",
        name: "The Quiet Review",
        kind: "Journal",
        href: "/journal/the-quiet-review",
      },
    }),
  );
  assert.equal(linked[0].value, "The Quiet Review");
  assert.equal(linked[0].href, "/journal/the-quiet-review");
  assert.equal(hasCaseStudy(w("C")), false);
});

/* ---------- Parts and access ---------- */

test("a work made of parts says what it holds", () => {
  const parts = (kinds: ("text" | "image" | "audio")[]) =>
    w("W", {
      parts: kinds.map((kind) => ({
        kind,
        title: "",
        text: "",
        image: "",
        audio: "",
        caption: "",
      })),
    });
  assert.equal(
    partsLabel(parts(["image", "image", "text"])),
    "2 plates · 1 text",
  );
  assert.equal(partsLabel(parts(["audio"])), "1 recording");
  assert.equal(partsLabel(parts([])), "");
});

test("a card states the access that comes with a film or recording", () => {
  assert.deepEqual(accessNotes(w("A")), []);
  assert.deepEqual(accessNotes(w("A", { transcript: " words " })), [
    "Transcript",
  ]);
  assert.deepEqual(
    accessNotes(
      w("A", { chapters: [{ at: "00:00", title: "Start" }], transcript: "x" }),
    ),
    ["Chapters", "Transcript"],
  );
  assert.deepEqual(
    accessNotes(w("A", { chapters: [{ at: "", title: "Start" }] })),
    [],
  );
});
