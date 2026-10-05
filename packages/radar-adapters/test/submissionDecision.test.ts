import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ManuscriptMatchEngine } from "../src/ranking/manuscriptMatchEngine.js";
import {
  DECISION_MODEL_VERSION,
  PLAN_SHAPE,
  buildSubmissionPlan,
  readingWindow,
  type DecisionCandidate,
  type MagazineDecision,
} from "../src/ranking/submissionDecision.js";
import type { ManuscriptMatchInput } from "../src/ranking/manuscriptMatchEngine.js";
import { writerKinship } from "../src/literary/kinship.js";

const engine = new ManuscriptMatchEngine(null);
const ASOF = "2026-10-04";

const brief: ManuscriptMatchInput = {
  genre: "fiction",
  wordCount: 4500,
  compAuthors: [],
  isDebutAuthor: false,
  allowSimultaneous: true,
  asOf: ASOF,
};

function card(
  row: Record<string, unknown>,
  input: ManuscriptMatchInput = brief,
) {
  const [result] = engine.scoreRows(
    [{ profile_id: "p", name: "Review", ...row }],
    input,
  );
  return result;
}

describe("decision model: rules", () => {
  it("excludes a magazine only on a recorded rule, with the reason", () => {
    const over = card({ max_word_count: 3000 });
    assert.deepEqual(over.decision.exclusions, [
      { kind: "length", reason: "Over its 3,000-word limit" },
    ]);

    const poetryOnly = card({ obs_genres: ["Poetry", "Translation"] });
    assert.equal(poetryOnly.decision.exclusions[0].kind, "form");
    assert.match(
      poetryOnly.decision.exclusions[0].reason,
      /Doesn't read fiction/,
    );

    const paid = card(
      { rk_charges_fee: true, rk_fee_cents: 300 },
      { ...brief, feeTolerance: "free_only" },
    );
    assert.deepEqual(paid.decision.exclusions, [
      { kind: "fee", reason: "Charges a $3 reading fee" },
    ]);

    const unpaid = card(
      { rk_pay_kind: "copies_only" },
      { ...brief, minPayRate: "any_paying" },
    );
    assert.deepEqual(unpaid.decision.exclusions, [
      { kind: "pay", reason: "Pays in copies only" },
    ]);
  });

  it("never excludes on a fact Missa has not recorded", () => {
    const bare = card(
      {},
      { ...brief, feeTolerance: "free_only", minPayRate: "pro_rates_only" },
    );
    assert.deepEqual(bare.decision.exclusions, []);
  });

  it("holds back a magazine that is closed today and says when it opens", () => {
    const closed = card({ obs_reading_period: "Feb 1 to Mar 31" });
    assert.deepEqual(closed.decision.exclusions, [
      { kind: "closed", reason: "Closed until Feb 1 (reads Feb 1 to Mar 31)" },
    ]);
    assert.equal(closed.decision.readingWindow?.opensOn, "2027-02-01");

    const open = card({ obs_reading_period: "Sep 1 to Nov 30" });
    assert.deepEqual(open.decision.exclusions, []);
    assert.equal(open.decision.readingWindow?.closesOn, "2026-11-30");
  });
});

describe("decision model: reading windows", () => {
  it("reads year-round, ordinary and New Year windows", () => {
    assert.deepEqual(readingWindow("Jan 1 to Dec 31", ASOF), {
      label: "Jan 1 to Dec 31",
      allYear: true,
      openNow: true,
      opensOn: null,
      closesOn: null,
    });
    const winter = readingWindow("Nov 1 to Jan 31", "2026-12-15");
    assert.equal(winter?.openNow, true);
    assert.equal(winter?.closesOn, "2027-01-31");
    const january = readingWindow("Nov 1 to Jan 31", "2027-01-10");
    assert.equal(january?.closesOn, "2027-01-31");
    const summer = readingWindow("Nov 1 to Jan 31", "2026-06-01");
    assert.equal(summer?.openNow, false);
    assert.equal(summer?.opensOn, "2026-11-01");
  });

  it("gives no window for a label it cannot read", () => {
    assert.equal(readingWindow("Rolling", ASOF), null);
    assert.equal(readingWindow(null, ASOF), null);
    assert.equal(
      card({ obs_reading_period: "Rolling" }).decision.exclusions.length,
      0,
    );
  });
});

describe("decision model: odds", () => {
  const prestigious = {
    prestige_tier: "Tier 1 (Flagship Luminary)",
    pushcart_rank: 3,
    pushcart_edition: 2025,
    pushcart_genre: "fiction",
  };

  it("never lets prestige raise the odds", () => {
    const neutral = card({});
    const famous = card(prestigious);
    const famousDebut = card(prestigious, { ...brief, isDebutAuthor: true });
    assert.equal(neutral.decision.scores.odds.score, 50);
    assert.ok(famous.decision.scores.odds.score < 50);
    assert.ok(
      famousDebut.decision.scores.odds.score <
        famous.decision.scores.odds.score,
    );
    for (const reason of famousDebut.decision.scores.odds.reasons) {
      assert.ok(reason.points < 0, reason.text);
    }
    // The prize record still counts, as payoff.
    assert.ok(famous.decision.scores.payoff.score > 50);
  });

  it("puts a long shot, a good fit and a likely acceptance in their tiers", () => {
    assert.equal(card(prestigious).decision.tier, "long_shot");
    assert.equal(card({}).decision.tier, "good_fit");
    assert.equal(
      card(
        { rk_debut_friendly: true, rk_blind_reading: true },
        { ...brief, isDebutAuthor: true },
      ).decision.tier,
      "likely",
    );
  });
});

describe("decision model: prize routes and writers like yours", () => {
  it("opens the Caine Prize route only to an eligible piece", () => {
    const nigerian = card(
      { name: "Boston Review" },
      { ...brief, writerCountry: "Nigeria" },
    );
    const route = nigerian.decision.prizeRoutes.find(
      (entry) => entry.id === "caine",
    );
    assert.ok(route);
    assert.equal(route.eligible, true);
    assert.ok(
      route.examples.some((example) => example.writer === "NoViolet Bulawayo"),
    );
    assert.ok(
      nigerian.decision.scores.payoff.reasons.some((reason) =>
        reason.text.startsWith("Route to"),
      ),
    );

    const american = card(
      { name: "Boston Review" },
      { ...brief, writerCountry: "United States" },
    );
    assert.equal(
      american.decision.prizeRoutes.some((entry) => entry.id === "caine"),
      false,
    );

    const tooLong = card(
      { name: "Boston Review" },
      { ...brief, wordCount: 12000, writerCountry: "Nigeria" },
    );
    assert.equal(
      tooLong.decision.prizeRoutes.some((entry) => entry.id === "caine"),
      false,
    );

    const poems = card(
      { name: "Boston Review" },
      { ...brief, genre: "poetry", writerCountry: "Nigeria" },
    );
    assert.deepEqual(poems.decision.prizeRoutes, []);
  });

  it("links writers by country and form, never by a shared prize alone", () => {
    assert.deepEqual(
      writerKinship("Chimamanda Ngozi Adichie", "Lesley Nneka Arimah"),
      {
        country: "Nigeria",
        form: "fiction",
        prize: null,
      },
    );
    // Both won the NBCC fiction award, and write nothing alike.
    assert.equal(
      writerKinship("Chimamanda Ngozi Adichie", "Lorrie Moore"),
      null,
    );
  });

  it("credits a magazine for publishing writers like the ones the brief names", () => {
    const result = card(
      { name: "McSweeney's Quarterly Concern" },
      { ...brief, compAuthors: ["Chimamanda Ngozi Adichie"] },
    );
    const kin = result.decision.kinWriters.find(
      (entry) => entry.writer === "Lesley Nneka Arimah",
    );
    assert.ok(kin);
    assert.equal(kin.likeComp, "Chimamanda Ngozi Adichie");
    assert.ok(result.decision.scores.fit.score > 50);
  });
});

describe("decision model: determinism", () => {
  const rows = [
    { profile_id: "b", name: "Beta Review", rk_charges_fee: false },
    { profile_id: "a", name: "Alpha Review", rk_charges_fee: false },
    { profile_id: "c", name: "Alpha Review", rk_charges_fee: false },
    {
      profile_id: "d",
      name: "Delta Review",
      rk_pay_kind: "cash",
      obs_reading_period: "Jan 1 to Dec 31",
    },
    {
      profile_id: "e",
      name: "Epsilon",
      prestige_tier: "Tier 1 (Flagship Luminary)",
      rk_simultaneous: "allowed",
    },
  ];

  it("returns the same response for the same brief, whatever order rows arrive in", () => {
    const first = engine.scoreAndGroupRows(rows, brief, 50);
    const second = engine.scoreAndGroupRows([...rows].reverse(), brief, 50);
    assert.deepEqual(second, first);
    assert.equal(first.model?.version, DECISION_MODEL_VERSION);
    assert.equal(first.model?.asOf, ASOF);
  });

  it("breaks score ties by name, then by id", () => {
    const order = engine
      .scoreRows(rows.slice(0, 3), brief)
      .map((result) => result.profileId);
    assert.deepEqual(order, ["a", "c", "b"]);
  });
});

describe("decision model: plan", () => {
  function candidate(
    id: string,
    tier: MagazineDecision["tier"],
    composite: number,
    allowsSimultaneous: boolean | null,
    medianResponseDays: number | null = null,
    extra: Partial<MagazineDecision> = {},
  ): DecisionCandidate {
    const known = {
      score: 60,
      known: true,
      reasons: [{ text: "Recorded", points: 10 }],
    };
    return {
      profileId: id,
      name: `Magazine ${id}`,
      slug: id,
      allowsSimultaneous,
      medianResponseDays,
      responseBand: null,
      decision: {
        scores: { fit: known, odds: known, payoff: known, cost: known },
        composite,
        tier,
        exclusions: [],
        readingWindow: null,
        prizeRoutes: [],
        publishedComps: [],
        kinWriters: [],
        ...extra,
      },
    };
  }

  it("takes two long shots, four good fits and four likely acceptances", () => {
    const pool = [
      ...["l1", "l2", "l3"].map((id, i) =>
        candidate(id, "long_shot", 70 - i, true),
      ),
      ...["g1", "g2", "g3", "g4", "g5"].map((id, i) =>
        candidate(id, "good_fit", 65 - i, true),
      ),
      ...["k1", "k2", "k3", "k4", "k5"].map((id, i) =>
        candidate(id, "likely", 60 - i, true),
      ),
    ];
    const plan = buildSubmissionPlan(pool);
    assert.deepEqual(plan.counts, PLAN_SHAPE);
    assert.deepEqual(plan.shortTiers, []);
    assert.equal(plan.rounds.length, 1);
    assert.equal(plan.rounds[0].picks.length, 10);
    assert.equal(plan.rounds[0].send, "together");
  });

  it("sends exclusive magazines one round at a time, fastest reply first", () => {
    const plan = buildSubmissionPlan([
      candidate("together", "good_fit", 60, true),
      candidate("unknown", "good_fit", 59, null),
      candidate("slow", "good_fit", 70, false, 200),
      candidate("fast", "likely", 55, false, 30),
    ]);
    assert.deepEqual(
      plan.rounds.map((round) => round.picks.map((pick) => pick.profileId)),
      [["together", "unknown"], ["fast"], ["slow"]],
    );
    assert.equal(plan.rounds[0].picks[1].checkPolicy, true);
    assert.deepEqual(
      plan.rounds.map((round) => round.send),
      ["together", "alone", "alone"],
    );
  });

  it("leaves out ruled-out magazines, poor fits and magazines with nothing recorded", () => {
    const blank = candidate("blank", "good_fit", 50, true);
    blank.decision.scores = {
      fit: { score: 50, known: false, reasons: [] },
      odds: { score: 50, known: false, reasons: [] },
      payoff: { score: 50, known: false, reasons: [] },
      cost: { score: 50, known: false, reasons: [] },
    };
    const poorFit = candidate("poor", "good_fit", 55, true);
    poorFit.decision.scores = {
      ...poorFit.decision.scores,
      fit: {
        score: 40,
        known: true,
        reasons: [{ text: "Conflict", points: -10 }],
      },
    };
    const plan = buildSubmissionPlan([
      candidate("ok", "good_fit", 60, true),
      candidate("ruled-out", "good_fit", 80, true, null, {
        exclusions: [{ kind: "fee", reason: "Charges a reading fee" }],
      }),
      candidate("closed", "good_fit", 75, true, null, {
        exclusions: [{ kind: "closed", reason: "Closed until Feb 1" }],
        readingWindow: {
          label: "Feb 1 to Mar 31",
          allYear: false,
          openNow: false,
          opensOn: "2027-02-01",
          closesOn: null,
        },
      }),
      blank,
      poorFit,
    ]);
    assert.deepEqual(
      plan.rounds.flatMap((round) => round.picks.map((pick) => pick.profileId)),
      ["ok"],
    );
    assert.deepEqual(
      plan.opensLater.map((pick) => [pick.profileId, pick.opensOn]),
      [["closed", "2027-02-01"]],
    );
    assert.ok(plan.shortTiers.includes("long_shot"));
  });
});
