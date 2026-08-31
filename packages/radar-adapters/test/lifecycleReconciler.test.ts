import assert from "node:assert/strict";
import test from "node:test";
import { classifyLifecycleEvidence, LIFECYCLE_APPLY_SQL } from "../src/lifecycleReconciler.js";

const NOW = new Date("2026-08-30T12:00:00.000Z");

test("high-confidence lifecycle application requeues only reviewable opportunities", () => {
  assert.match(
    LIFECYCLE_APPLY_SQL,
    /last_changed_at=case when publication_state='reviewable' then now\(\) else last_changed_at end/,
  );
});

test("lifecycle classifier resolves explicit open-ended intake modes", () => {
  assert.deepEqual(
    classifyLifecycleEvidence("We are now accepting submissions year-round.", NOW),
    {
      decision: "apply",
      confidence: "high",
      reason: "Source explicitly accepts submissions year-round.",
      evidencePassage: "We are now accepting submissions year-round.",
      status: "open",
      deadlineKind: "year-round",
    },
  );
  assert.equal(classifyLifecycleEvidence("Applications are accepted on a rolling basis.", NOW).deadlineKind, "rolling");
  assert.equal(classifyLifecycleEvidence("Applications accepted until funds are exhausted.", NOW).deadlineKind, "until-filled");
});

test("lifecycle classifier requires explicit source dates for opening soon", () => {
  const verified = classifyLifecycleEvidence("Applications will open on October 15, 2026.", NOW);
  assert.equal(verified.decision, "apply");
  assert.equal(verified.status, "opening-soon");
  assert.equal(verified.openDate, "2026-10-15");

  const inferred = classifyLifecycleEvidence("Applications will open in October.", NOW);
  assert.equal(inferred.decision, "review");
});

test("lifecycle classifier closes and pauses only on explicit statements", () => {
  const closed = classifyLifecycleEvidence("Applications are now closed for the Autumn 2026 cycle.", NOW);
  assert.equal(closed.status, "closed");
  assert.equal(closed.seasonLabel, "Autumn 2026");
  assert.equal(classifyLifecycleEvidence("The program is temporarily paused.", NOW).status, "paused");
  assert.equal(classifyLifecycleEvidence("This grant is no longer offered.", NOW).status, "archived");
});

test("lifecycle classifier routes conflicting and vague pages to review", () => {
  const conflict = classifyLifecycleEvidence("Applications are closed. Applications are now open.", NOW);
  assert.equal(conflict.decision, "review");
  assert.match(conflict.reason, /conflicting/i);

  const vague = classifyLifecycleEvidence("Applications are now open. Read our website for dates.", NOW);
  assert.equal(vague.decision, "review");
  assert.equal(vague.confidence, "medium");
});

test("lifecycle classifier accepts a current explicit deadline only with an open statement", () => {
  const current = classifyLifecycleEvidence("Applications are now open. Deadline: November 30, 2026.", NOW);
  assert.equal(current.decision, "apply");
  assert.equal(current.status, "open");
  assert.equal(current.deadlineDate, "2026-11-30");
  assert.equal(current.deadlineKind, "exact");

  const expired = classifyLifecycleEvidence("Applications are now open. Deadline: July 1, 2026.", NOW);
  assert.equal(expired.decision, "review");
});

test("lifecycle classifier recognizes current ArtConnect detail pages with an application action", () => {
  const detail = classifyLifecycleEvidence(
    "The Meridian Award. Deadline: October 15, 2026. Apply now.",
    NOW,
    { title: "The Meridian Award", sourceUrl: "https://www.artconnect.com/opportunity/1CgJVeCc6q56ZQeA0iyXj" },
  );
  assert.equal(detail.decision, "apply");
  assert.equal(detail.status, "open");
  assert.equal(detail.deadlineDate, "2026-10-15");

  const category = classifyLifecycleEvidence(
    "The Meridian Award. Deadline: October 15, 2026. Apply now.",
    NOW,
    { title: "The Meridian Award", sourceUrl: "https://www.artconnect.com/opportunities/without-fees" },
  );
  assert.equal(category.decision, "review");

  const unrelated = classifyLifecycleEvidence(
    "Another Prize. Deadline: October 15, 2026. Apply now.",
    NOW,
    { title: "The Meridian Award", sourceUrl: "https://www.artconnect.com/opportunity/1CgJVeCc6q56ZQeA0iyXj" },
  );
  assert.equal(unrelated.decision, "review");
});

test("lifecycle classifier uses the canonical deadline field on Poets & Writers contest pages", () => {
  const past = classifyLifecycleEvidence(
    "Oregon Literary Fellowships deadline alerts and navigation copy ".repeat(5) + "Deadline: August 7, 2026 - Check back for Upcoming Deadline",
    NOW,
    { title: "Oregon Literary Fellowships", sourceUrl: "https://www.pw.org/writing_contests/oregon_literary_fellowships" },
  );
  assert.equal(past.decision, "apply");
  assert.equal(past.status, "closed");
  assert.equal(past.deadlineDate, "2026-08-07");

  const future = classifyLifecycleEvidence(
    "First Book Award navigation and membership copy ".repeat(5) + "Deadline: September 1, 2026",
    NOW,
    { title: "First Book Award", sourceUrl: "https://www.pw.org/writing_contests/first_book_award" },
  );
  assert.equal(future.status, "open");
  assert.equal(future.deadlineDate, "2026-09-01");

  assert.equal(classifyLifecycleEvidence(
    "Oregon Literary Fellowships Deadline: September 1, 2026",
    NOW,
    { title: "Oregon Literary Fellowships", sourceUrl: "https://www.pw.org/content/prize_calendar" },
  ).decision, "review");
});

test("lifecycle classifier closes a past explicit deadline only without active intake signals", () => {
  const expired = classifyLifecycleEvidence("Competition deadline: August 24, 2026.", NOW);
  assert.equal(expired.decision, "apply");
  assert.equal(expired.status, "closed");
  assert.equal(expired.deadlineDate, "2026-08-24");

  const contradictory = classifyLifecycleEvidence("Applications are now open. Deadline: August 24, 2026.", NOW);
  assert.equal(contradictory.decision, "review");

  const unrelated = classifyLifecycleEvidence(
    "Latino Business Week proposals are due by July 22, 2026.",
    NOW,
    { title: "Community Planning & Development RFPs" },
  );
  assert.equal(unrelated.decision, "review");

  const registration = classifyLifecycleEvidence(
    "July 31, 2026: Deadline for programs. August 3, 2026: Applicant registration begins.",
    NOW,
    { title: "For Fellowship Applicants" },
  );
  assert.equal(registration.decision, "review");
});

test("lifecycle classifier never promotes aggregate directory or navigation records", () => {
  const furniture = "Type Artistic field Reward Free to apply No fees Rolling deadline 402 opportunities Sort: Deadline soonest";
  for (const [title, sourceUrl] of [
    ["Opportunities without fees", "https://www.artconnect.com/opportunities/without-fees"],
    ["Art Contests", "https://www.artconnect.com/opportunities/art-contests"],
    ["ArtConnect page 19", "https://www.artconnect.com/opportunities?sortBy=-deadline&page=19"],
    ["Next -&gt;", "https://www.artconnect.com/opportunities?sortBy=-deadline&page=25"],
    ["Opportunities for Artists in Norway", "https://www.artconnect.com/opportunities/norway"],
    ["Vashon, WA, United States", "https://www.artconnect.com/opportunities?country=US&state=WA&city=Vashon"],
  ] as const) {
    const result = classifyLifecycleEvidence(furniture, NOW, { title, sourceUrl });
    assert.equal(result.decision, "review", title);
    assert.match(result.reason, /aggregate directory/i, title);
  }
});

test("lifecycle classifier retains opportunity-specific open-until-filled evidence", () => {
  const result = classifyLifecycleEvidence(
    "Exhibition Proposals. Deadline: Open Until Filled. The gallery is now accepting exhibition proposals.",
    NOW,
    { title: "Exhibition - Group", sourceUrl: "https://artdeadline.com/benefits/ops-group-exhibit/" },
  );
  assert.equal(result.decision, "apply");
  assert.equal(result.status, "open");
  assert.equal(result.deadlineKind, "until-filled");
});

test("lifecycle classifier rejects marketplace filters and category pages", () => {
  const marketplaceChrome = "Open Calls Popular filters Editor's Picks No Application Fee Fully Funded Rolling Deadline International Emerging Artists";
  assert.equal(classifyLifecycleEvidence(marketplaceChrome, NOW, {
    title: "International Artist Residency 2027–2028",
    sourceUrl: "https://opencallradar.com/open-calls/international-artist-residency-2027-2028-example",
  }).decision, "review");

  for (const [title, sourceUrl] of [
    ["Below $25 Entry/Application Fee", "https://artdeadline.com/ops-tag/tag-nofee/"],
    ["+ Curatorial", "https://artdeadline.com/ops-category/cat-curatorial/"],
    ["ArtDeadline", "https://artdeadline.com/"],
    ["January 2027", "https://opencallradar.com/open-calls/monthly/january-2027"],
    ["flash fiction 2", "https://openartsforum.com/opportunities/?tag=flash%20fiction"],
    ["On the Move Open Calls", "https://on-the-move.org/news/deadlines"],
    ["Mobility Funding Guide to Moldova", "https://on-the-move.org/resources/funding/mobility-funding-guide-moldova"],
    ["&raquo;", "https://www.curatorspace.com/opportunities/index/page/9?orderBy=deadline"],
    ["Sapporo Artist in Residence", "https://www.transartists.org/en/air/sapporo-artist-residence"],
    ["Upcoming Deadlines", "https://www.transartists.org/en/deadlines"],
  ] as const) {
    assert.equal(classifyLifecycleEvidence("Deadline: Open Until Filled", NOW, { title, sourceUrl }).decision, "review", title);
  }
});
