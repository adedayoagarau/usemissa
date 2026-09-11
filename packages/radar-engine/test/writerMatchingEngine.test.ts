import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateOpportunityMatchScore,
  generatePersonalizedFeed,
  type CandidateOpportunityLike,
  type WriterMatchingProfile,
} from "../src/index.js";

const fixedNow = new Date("2026-09-01T12:00:00Z");

const baseWriter: WriterMatchingProfile = {
  userId: "writer_1",
  primaryGenres: ["Poetry"],
  subgenres: ["Eco-Poetry", "Lyric Essay"],
  preferredFormats: ["Print", "Digital"],
  feePreference: "low_fee_acceptable",
  maxFeeCents: 500,
  simultaneousSubmissionNeeded: true,
  savedOpportunityIds: [],
  submittedPublisherIds: [],
};

test("Exact genre match awards 40 points", () => {
  const opp: CandidateOpportunityLike = {
    id: "opp_1",
    title: "Poetry Review Single Window",
    publisherName: "Poetry Review",
    publisherKind: "literary_magazine",
    genres: ["Poetry"],
    formats: ["Print"],
    feeStatus: "free",
    feeCents: 0,
    status: "open",
    deadlineDate: "2026-09-20", // 19 days -> currently_open (25 pts)
  };

  const result = calculateOpportunityMatchScore(baseWriter, opp, { now: fixedNow });
  assert.equal(result.scoreBreakdown.genre, 40);
  assert.equal(result.scoreBreakdown.state, 25);
  assert.equal(result.scoreBreakdown.fee, 20);
  assert.equal(result.scoreBreakdown.format, 10);
  assert.equal(result.matchScore, 95);
  assert.ok(result.eligible);
  assert.ok(result.matchReasons.some((r) => r.includes("primary genre: Poetry")));
});

test("Partial and subgenre matches award 30 points", () => {
  const oppWithSubgenre: CandidateOpportunityLike = {
    id: "opp_sub",
    title: "Eco-Poetry Anthology",
    publisherName: "Green Press",
    publisherKind: "small_press",
    genres: ["Anthology"],
    formats: ["Print"],
    feeStatus: "free",
    feeCents: 0,
    status: "open",
    deadlineDate: "2026-09-20",
  };

  const result = calculateOpportunityMatchScore(baseWriter, oppWithSubgenre, { now: fixedNow });
  assert.equal(result.scoreBreakdown.genre, 30);
  assert.ok(result.matchReasons.some((r) => r.includes("subgenre: Eco-Poetry")));
});

test("Zero genre overlap disqualifies candidate (0 pts score)", () => {
  const oppNoOverlap: CandidateOpportunityLike = {
    id: "opp_no_match",
    title: "Sci-Fi Short Stories",
    publisherName: "SciFi Daily",
    publisherKind: "literary_magazine",
    genres: ["Fiction", "Sci-Fi"],
    formats: ["Digital"],
    feeStatus: "free",
    feeCents: 0,
    status: "open",
    deadlineDate: "2026-09-05",
  };

  const poetryWriter: WriterMatchingProfile = {
    userId: "writer_poetry_only",
    primaryGenres: ["Poetry"],
    feePreference: "free_only",
  };

  const result = calculateOpportunityMatchScore(poetryWriter, oppNoOverlap, { now: fixedNow });
  assert.equal(result.matchScore, 0);
  assert.equal(result.eligible, false);
  assert.ok(result.disqualificationReason);
});

test("Urgency score respects deadlines: closing_soon (30 pts), currently_open (25 pts), always_open (20 pts), opening_soon (15 pts)", () => {
  const closingSoonOpp: CandidateOpportunityLike = {
    id: "opp_urgent",
    title: "Urgent Call",
    genres: ["Poetry"],
    feeStatus: "free",
    deadlineDate: "2026-09-07", // 6 days away
  };

  const openOpp: CandidateOpportunityLike = {
    id: "opp_open",
    title: "Standard Call",
    genres: ["Poetry"],
    feeStatus: "free",
    deadlineDate: "2026-10-15", // > 14 days
  };

  const rollingOpp: CandidateOpportunityLike = {
    id: "opp_rolling",
    title: "Rolling Call",
    genres: ["Poetry"],
    feeStatus: "free",
    deadlineKind: "rolling",
  };

  const openingSoonOpp: CandidateOpportunityLike = {
    id: "opp_upcoming",
    title: "Upcoming Call",
    genres: ["Poetry"],
    feeStatus: "free",
    openDate: "2026-09-25", // 24 days away
    status: "opening-soon",
  };

  const resUrgent = calculateOpportunityMatchScore(baseWriter, closingSoonOpp, { now: fixedNow });
  assert.equal(resUrgent.scoreBreakdown.state, 30);
  assert.equal(resUrgent.submissionState.state, "closing_soon");
  assert.equal(resUrgent.submissionState.badgeColor, "amber");
  assert.equal(resUrgent.submissionState.recommendationTier, "urgent_priority");
  assert.ok(resUrgent.submissionState.label.includes("6 days"));

  const resOpen = calculateOpportunityMatchScore(baseWriter, openOpp, { now: fixedNow });
  assert.equal(resOpen.scoreBreakdown.state, 25);
  assert.equal(resOpen.submissionState.state, "currently_open");

  const resRolling = calculateOpportunityMatchScore(baseWriter, rollingOpp, { now: fixedNow });
  assert.equal(resRolling.scoreBreakdown.state, 20);
  assert.equal(resRolling.submissionState.state, "always_open");

  const resOpeningSoon = calculateOpportunityMatchScore(baseWriter, openingSoonOpp, { now: fixedNow });
  assert.equal(resOpeningSoon.scoreBreakdown.state, 15);
  assert.equal(resOpeningSoon.submissionState.state, "opening_soon");
});

test("Fee preference free_only allows free (20 pts) and disqualifies paid (0 pts)", () => {
  const freeWriter: WriterMatchingProfile = {
    userId: "writer_free",
    primaryGenres: ["Poetry"],
    feePreference: "free_only",
  };

  const freeOpp: CandidateOpportunityLike = {
    id: "opp_free",
    title: "Free Call",
    genres: ["Poetry"],
    feeStatus: "free",
    feeCents: 0,
    deadlineDate: "2026-09-20",
  };

  const paidOpp: CandidateOpportunityLike = {
    id: "opp_paid",
    title: "Paid Call",
    genres: ["Poetry"],
    feeStatus: "fee",
    feeCents: 300,
    deadlineDate: "2026-09-20",
  };

  const resFree = calculateOpportunityMatchScore(freeWriter, freeOpp, { now: fixedNow });
  assert.equal(resFree.scoreBreakdown.fee, 20);
  assert.ok(resFree.eligible);

  const resPaid = calculateOpportunityMatchScore(freeWriter, paidOpp, { now: fixedNow });
  assert.equal(resPaid.matchScore, 0);
  assert.equal(resPaid.eligible, false);
});

test("Fee preference low_fee_acceptable handles tiers correctly", () => {
  const lowFeeWriter: WriterMatchingProfile = {
    userId: "writer_low",
    primaryGenres: ["Poetry"],
    feePreference: "low_fee_acceptable",
    maxFeeCents: 500,
  };

  const freeOpp: CandidateOpportunityLike = {
    id: "opp_1",
    genres: ["Poetry"],
    feeCents: 0,
    feeStatus: "free",
  };

  const threeDollarOpp: CandidateOpportunityLike = {
    id: "opp_2",
    genres: ["Poetry"],
    feeCents: 300,
    feeStatus: "fee",
  };

  const twentyDollarOpp: CandidateOpportunityLike = {
    id: "opp_3",
    genres: ["Poetry"],
    feeCents: 2000,
    feeStatus: "fee",
  };

  assert.equal(calculateOpportunityMatchScore(lowFeeWriter, freeOpp, { now: fixedNow }).scoreBreakdown.fee, 20);
  assert.equal(calculateOpportunityMatchScore(lowFeeWriter, threeDollarOpp, { now: fixedNow }).scoreBreakdown.fee, 15);
  assert.equal(calculateOpportunityMatchScore(lowFeeWriter, twentyDollarOpp, { now: fixedNow }).scoreBreakdown.fee, 5);
});

test("Novelty score applies -50 penalty for submitted and +10 boost for saved bookmarks", () => {
  const profileWithHistory: WriterMatchingProfile = {
    userId: "writer_hist",
    primaryGenres: ["Poetry"],
    feePreference: "any",
    submittedPublisherIds: ["org_sub"],
    savedOpportunityIds: ["opp_saved"],
  };

  const submittedOpp: CandidateOpportunityLike = {
    id: "opp_sub",
    organizationId: "org_sub",
    genres: ["Poetry"],
    feeStatus: "free",
  };

  const savedOpp: CandidateOpportunityLike = {
    id: "opp_saved",
    organizationId: "org_other",
    genres: ["Poetry"],
    feeStatus: "free",
  };

  const normalOpp: CandidateOpportunityLike = {
    id: "opp_normal",
    organizationId: "org_normal",
    genres: ["Poetry"],
    feeStatus: "free",
  };

  const resSubmitted = calculateOpportunityMatchScore(profileWithHistory, submittedOpp, { now: fixedNow });
  const resSaved = calculateOpportunityMatchScore(profileWithHistory, savedOpp, { now: fixedNow });
  const resNormal = calculateOpportunityMatchScore(profileWithHistory, normalOpp, { now: fixedNow });

  assert.equal(resSubmitted.scoreBreakdown.novelty, -50);
  assert.equal(resSaved.scoreBreakdown.novelty, 10);
  assert.equal(resNormal.scoreBreakdown.novelty, 0);
  assert.ok(resSaved.matchScore > resNormal.matchScore);
  assert.ok(resNormal.matchScore > resSubmitted.matchScore);
});

test("generatePersonalizedFeed filters by category and paginates with cursor", async () => {
  const pool: CandidateOpportunityLike[] = [
    {
      id: "opp_urgent_1",
      title: "Urgent Poetry Call",
      genres: ["Poetry"],
      feeStatus: "free",
      deadlineDate: "2026-09-05", // 4 days -> closing_soon
    },
    {
      id: "opp_fee_1",
      title: "Paid Poetry Window",
      genres: ["Poetry"],
      feeStatus: "fee",
      feeCents: 300,
      deadlineDate: "2026-09-30",
    },
    {
      id: "opp_upcoming_1",
      title: "Upcoming Poetry Window",
      genres: ["Poetry"],
      feeStatus: "free",
      status: "opening-soon",
      openDate: "2026-09-20",
    },
    {
      id: "opp_chapbook_1",
      title: "Poetry Chapbook Prize",
      publisherKind: "small_press",
      formats: ["Chapbook"],
      genres: ["Poetry"],
      feeStatus: "free",
      deadlineDate: "2026-10-01",
    },
  ];

  // Urgent category test
  const urgentFeed = await generatePersonalizedFeed(pool, baseWriter, {
    category: "urgent",
    now: fixedNow,
  });
  assert.equal(urgentFeed.feed.length, 1);
  assert.equal(urgentFeed.feed[0]?.opportunityId, "opp_urgent_1");

  // Fee-free category test
  const freeFeed = await generatePersonalizedFeed(pool, baseWriter, {
    category: "fee_free",
    now: fixedNow,
  });
  assert.equal(freeFeed.totalMatches, 3);
  assert.ok(freeFeed.feed.every((item) => item.feeStatus === "free"));

  // Small press / manuscript category test
  const smallPressFeed = await generatePersonalizedFeed(pool, baseWriter, {
    category: "small_press_manuscripts",
    now: fixedNow,
  });
  assert.equal(smallPressFeed.feed.length, 1);
  assert.equal(smallPressFeed.feed[0]?.opportunityId, "opp_chapbook_1");

  // Pagination test
  const page1 = await generatePersonalizedFeed(pool, baseWriter, {
    limit: 2,
    now: fixedNow,
  });
  assert.equal(page1.feed.length, 2);
  assert.ok(page1.nextCursor);

  const page2 = await generatePersonalizedFeed(pool, baseWriter, {
    limit: 2,
    cursor: page1.nextCursor!,
    now: fixedNow,
  });
  assert.equal(page2.feed.length, 2);
  assert.notEqual(page1.feed[0]?.opportunityId, page2.feed[0]?.opportunityId);
});
