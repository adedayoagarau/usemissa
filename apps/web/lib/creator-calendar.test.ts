import test from "node:test";
import assert from "node:assert/strict";
import type { CalendarFeedData } from "@missa/radar-adapters";
import { calendarFeed, feedEvent, parseCalendarFeedOptions, relationalCalendarFeed } from "./creator-calendar";

const now = new Date("2026-10-04T09:00:00Z");

const data: CalendarFeedData = {
  accountId: "acc_1",
  alarmOffsets: [7, 1],
  tracked: [
    {
      trackedId: "trk_1",
      opportunityId: "opp_timed",
      title: "Poetry Fellowship",
      organizationName: "Poets House",
      myStatus: "preparing",
      oppStatus: "open",
      openDate: null,
      deadline: "2026-10-07",
      deadlineKind: "exact",
      deadlineTime: "2026-10-08T03:59:00.000Z",
      deadlineTimezone: "America/New_York",
      personalTargetOn: "2026-10-05",
      expectedResponseBy: null,
    },
    {
      trackedId: "trk_2",
      opportunityId: "opp_date",
      title: "Small Grant",
      organizationName: null,
      myStatus: "saved",
      oppStatus: "open",
      openDate: null,
      deadline: "2026-10-20",
      deadlineKind: "fixed",
      deadlineTime: null,
      deadlineTimezone: null,
      personalTargetOn: null,
      expectedResponseBy: null,
    },
    {
      trackedId: "trk_3",
      opportunityId: "opp_sent",
      title: "Sent Residency",
      organizationName: "Hall",
      myStatus: "submitted",
      oppStatus: "open",
      openDate: null,
      deadline: null,
      deadlineKind: "exact",
      deadlineTime: null,
      deadlineTimezone: null,
      personalTargetOn: null,
      expectedResponseBy: "2026-12-01",
    },
  ],
  stages: [
    {
      id: "stg_1",
      opportunityId: "opp_timed",
      opportunityTitle: "Poetry Fellowship",
      kind: "notification",
      label: "Decisions announced",
      dueOn: "2027-01-15",
      dueAt: null,
      timezone: null,
      confidence: "probable",
    },
  ],
  tiers: [
    {
      id: "tier_1",
      opportunityId: "opp_date",
      opportunityTitle: "Small Grant",
      tier: "early",
      label: "Early-bird",
      closesOn: "2026-10-10",
      closesAt: "2026-10-10T23:59:00.000Z",
      timezone: null,
      feeCents: 1500,
      feeCurrency: "USD",
    },
  ],
  obligations: [
    {
      id: "obl_1",
      opportunityId: "opp_timed",
      opportunityTitle: "Poetry Fellowship",
      kind: "sub-deadline",
      label: "Ask for references",
      dueOn: "2026-10-06",
      dueAt: null,
      timezone: null,
    },
  ],
  forecasts: [
    {
      opportunityId: "opp_next",
      opportunityTitle: "Annual Prize",
      expectedOpenStart: "2027-02-01",
      expectedOpenEnd: "2027-02-14",
      expectedClose: null,
      confidence: "medium",
      basedOnCycles: 3,
    },
  ],
};

const unfold = (ics: string) => ics.replace(/\r\n /g, "");
const events = (ics: string) => unfold(ics).split("BEGIN:VEVENT").slice(1);
const eventFor = (ics: string, uid: string) => events(ics).find((block) => block.includes(`UID:${uid}@usemissa.com`));

test("an exact deadline is written in UTC, names the organisation's time zone and alarms from the reminder offsets", () => {
  const ics = calendarFeed(data, parseCalendarFeedOptions(new URLSearchParams()), now, "https://usemissa.com");
  const deadline = eventFor(ics, "opp_timed-deadline");
  assert.ok(deadline);
  // 23:59 in New York on 7 October is 03:59 UTC on 8 October.
  assert.match(deadline, /DTSTART:20261008T035900Z/);
  assert.doesNotMatch(ics, /TZID/, "no event relies on a time zone definition block");
  assert.doesNotMatch(ics, /BEGIN:VTIMEZONE/);
  assert.match(deadline, /America\/New York time/);
  assert.match(deadline, /SUMMARY:Closes: Poetry Fellowship/);
  assert.match(deadline, /TRIGGER:-P7D/);
  assert.match(deadline, /TRIGGER:-P1D/);
  assert.equal((deadline.match(/BEGIN:VALARM/g) ?? []).length, 2);
  assert.match(deadline, /URL:https:\/\/usemissa.com\/tracker\?view=saved&application=opp_timed/);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});

test("a date-only deadline stays all-day with morning alarms", () => {
  const ics = calendarFeed(data, parseCalendarFeedOptions(new URLSearchParams()), now);
  const deadline = eventFor(ics, "opp_date-deadline")!;
  assert.match(deadline, /DTSTART;VALUE=DATE:20261020/);
  assert.match(deadline, /DTEND;VALUE=DATE:20261021/);
  assert.doesNotMatch(deadline, /TZID/);
  assert.match(deadline, /TRIGGER:-P6DT15H/);
  assert.match(deadline, /TRIGGER:-PT15H/);
});

test("a timed tier close is written in UTC", () => {
  const ics = calendarFeed(data, parseCalendarFeedOptions(new URLSearchParams()), now);
  const tier = eventFor(ics, "tier-tier_1")!;
  assert.match(tier, /DTSTART:20261010T235900Z/);
  assert.match(tier, /SUMMARY:Early-bird ends: Small Grant/);
  assert.match(tier, /\$15/);
});

test("stages, obligations, targets, forecasts and response dates each become events", () => {
  const ics = calendarFeed(data, parseCalendarFeedOptions(new URLSearchParams()), now);
  const stage = eventFor(ics, "stage-stg_1")!;
  assert.match(stage, /SUMMARY:Predicted: Decisions announced: Poetry Fellowship/);
  assert.doesNotMatch(stage, /VALARM/, "announcement dates have no alarm");
  assert.match(eventFor(ics, "obligation-obl_1")!, /SUMMARY:Ask for references: Poetry Fellowship/);
  assert.match(eventFor(ics, "trk_1-target")!, /SUMMARY:Your target: Poetry Fellowship/);
  const forecast = eventFor(ics, "opp_next-forecast-open")!;
  assert.match(forecast, /SUMMARY:Predicted: Annual Prize opens/);
  assert.match(forecast, /DTSTART;VALUE=DATE:20270201/);
  assert.match(forecast, /DTEND;VALUE=DATE:20270215/, "the range ends the day after its last day");
  assert.match(eventFor(ics, "opp_sent-response")!, /estimate\\, not a promised response date/);
  assert.equal(eventFor(ics, "opp_sent-deadline"), undefined, "submitted work has no deadline event");
});

test("type filters and alarms=0 narrow the feed", () => {
  const options = parseCalendarFeedOptions(new URLSearchParams("types=deadline,forecast,unknown&alarms=0"));
  assert.deepEqual([...options.types].sort(), ["deadline", "forecast"]);
  assert.equal(options.alarms, false);
  const ics = calendarFeed(data, options, now);
  const uids = events(ics).map((block) => /UID:([^\r\n]+)@usemissa.com/.exec(block)?.[1]);
  assert.deepEqual(uids.sort(), ["opp_date-deadline", "opp_next-forecast-open", "opp_timed-deadline"]);
  assert.doesNotMatch(ics, /VALARM/);
  assert.equal(parseCalendarFeedOptions(new URLSearchParams("types=nonsense")).types.size, 8, "nothing valid means every type");
});

test("long lines are folded and text is escaped", () => {
  const event = feedEvent(
    { uid: "x", date: "2026-10-04", summary: "A, very; long\ntitle ".repeat(8), description: "Plain" },
    now,
  );
  for (const line of event.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75, line);
  assert.match(unfold(event), /SUMMARY:A\\, very\\; long\\ntitle/);
});

test("the original tracked-items feed still renders without alarms", () => {
  const ics = relationalCalendarFeed(
    [{ opportunityId: "opp_a", title: "A call", myStatus: "saved", deadline: "2026-10-20", deadlineKind: "exact" }],
    now,
  );
  assert.match(ics, /SUMMARY:Closes: A call/);
  assert.doesNotMatch(ics, /VALARM/);
});
