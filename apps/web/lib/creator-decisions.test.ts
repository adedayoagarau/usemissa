import assert from "node:assert/strict";
import test from "node:test";
import {
  createJevClient,
  createMemoryDecisionLedger,
  type DecisionMode,
  type JevAnswer,
  type JevQuestion,
} from "@missa/decisions";
import type { SubmitResidencyReviewInput } from "@missa/radar-adapters";
import {
  createJevEmailDecider,
  creatorDecisionContext,
  decideSmsReply,
  moderateResidencyReview,
  orderTrackerCandidates,
  type CreatorDecisionContext,
} from "./creator-decisions";
import { recordDeadlineRisk } from "./creator-deadline-risk";
import { submitResidencyReview } from "./residencyReviewSubmission";
import { handleInboundReply, parseInboundReply } from "./sms-webhook";

type Answerer = (
  question: JevQuestion,
  state: Record<string, unknown>,
) => JevAnswer;

/** A Jev client that answers each question from its instructions, plus the ledger it records to. */
function context(mode: DecisionMode, answer: Answerer) {
  const calls: Array<{
    state: unknown;
    questions: Record<string, JevQuestion>;
  }> = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as {
      state: Record<string, unknown>;
      questions: Record<string, JevQuestion>;
    };
    calls.push(body);
    const answers = Object.fromEntries(
      Object.entries(body.questions).map(([id, question]) => [
        id,
        answer(question, body.state),
      ]),
    );
    return new Response(JSON.stringify({ model: "jev-test", answers }), {
      status: 200,
    });
  }) as typeof fetch;
  const ledger = createMemoryDecisionLedger();
  const ctx: CreatorDecisionContext = {
    client: createJevClient({
      apiKey: "k",
      fetch: fetchImpl,
      allowCreatorPrivateData: true,
    }),
    ledger,
    mode,
  };
  return { ctx, calls, ledger };
}

const choice = (option: string, probability = 0.95): JevAnswer => ({
  type: "choice",
  choice: option,
  probabilities: { [option]: probability },
  confidence: probability,
});
const noul = (value: number): JevAnswer => ({ type: "noul", noul: value });

const emailRequest = {
  candidateId: "creator_test_email_1",
  userId: "creator_test_user",
  subject: "North River newsletter",
  bodyExcerpt: "Congratulations to this year's winners!",
  senderDomain: "north.example",
  ruleStatus: "accepted" as const,
  calls: [
    { opportunityId: "opp_a", title: "North River Prize" },
    { opportunityId: "opp_b", title: "North River Review" },
  ],
};

test("creator decisions are skipped entirely unless Jev may see creator data", () => {
  assert.equal(creatorDecisionContext("email_status", {}), null);
  assert.equal(
    creatorDecisionContext("email_status", { JEV_API_KEY: "k" }),
    null,
  );
  const allowed = creatorDecisionContext("email_status", {
    JEV_API_KEY: "k",
    JEV_ALLOW_CREATOR_PRIVATE_DATA: "1",
  });
  assert.equal(allowed?.mode, "shadow");
  assert.equal(allowed?.ledger, undefined, "no ledger without a database");
  assert.equal(
    creatorDecisionContext("email_status", {
      JEV_API_KEY: "k",
      JEV_ALLOW_CREATOR_PRIVATE_DATA: "1",
      DECISIONS_MODE_EMAIL_STATUS: "live",
    })?.mode,
    "live",
  );
  assert.equal(createJevEmailDecider({ status: null, match: null }), null);
});

function emailAnswerer(statusOption: string): Answerer {
  return (question, state) => {
    if (question.type === "choice") return choice(statusOption);
    if (question.instructions.includes("personal note")) return noul(0.02);
    const call = state.call as { title: string };
    return noul(call.title === "North River Review" ? 0.96 : 0.04);
  };
}

test("shadow email decisions are recorded but never reach the verdict", async () => {
  const status = context("shadow", emailAnswerer("newsletter-or-solicitation"));
  const match = context("shadow", emailAnswerer("newsletter-or-solicitation"));
  const decider = createJevEmailDecider({
    status: status.ctx,
    match: match.ctx,
  })!;
  assert.equal(decider.live, false);
  assert.deepEqual(await decider.decide(emailRequest), {});
  assert.equal(status.ledger.records.length, 2);
  assert.equal(match.ledger.records.length, 2, "one record per tracked call");
  assert.deepEqual(
    match.ledger.records.map((record) => record.subjectId).sort(),
    ["creator_test_email_1:opp_a", "creator_test_email_1:opp_b"],
  );
  const sent = JSON.stringify(status.calls[0]!.state);
  assert.ok(!sent.includes("creator_test_user"), "account ids are not sent");
});

test("live email decisions may only withdraw a status and narrow calls", async () => {
  const live = (option: string) => {
    const status = context("live", emailAnswerer(option));
    const match = context("live", emailAnswerer(option));
    return createJevEmailDecider({ status: status.ctx, match: match.ctx })!;
  };
  assert.deepEqual(
    await live("newsletter-or-solicitation").decide(emailRequest),
    {
      notAStatusUpdate: true,
      confirmedCalls: ["opp_b"],
      rejectedCalls: ["opp_a"],
    },
  );
  const accepted = await live("accepted").decide(emailRequest);
  assert.equal(
    accepted?.notAStatusUpdate,
    undefined,
    "a sensitive status from Jev is never acted on",
  );
});

test("a slow email decision is dropped so the rules stand", async () => {
  const slow = context("live", emailAnswerer("unrelated"));
  const client = slow.ctx.client;
  const decider = createJevEmailDecider(
    {
      status: {
        ...slow.ctx,
        client: {
          ...client,
          evaluate: (state, questions) =>
            new Promise((resolve) =>
              setTimeout(() => resolve(client.evaluate(state, questions)), 50),
            ),
        },
      },
      match: null,
    },
    5,
  )!;
  assert.equal(await decider.decide(emailRequest), null);
});

test("text replies: keywords stay with the rules; Jev can only add an opt-out check", async () => {
  const received = (text: string) => ({
    data: {
      event_type: "message.received",
      payload: { id: "msg_1", text, from: { phone_number: "+15555550123" } },
    },
  });
  assert.equal(parseInboundReply(received("STOP")), null);
  assert.equal(parseInboundReply(received("unsubscribe!")), null);
  assert.deepEqual(parseInboundReply(received("please stop texting me")), {
    phone: "+15555550123",
    text: "please stop texting me",
    messageId: "msg_1",
  });

  const live = context("live", () => choice("stop", 0.92));
  const reply = parseInboundReply(received("please stop texting me"))!;
  assert.deepEqual(await decideSmsReply(live.ctx, reply), {
    askToConfirmOptOut: true,
  });
  const shadow = context("shadow", () => choice("stop", 0.92));
  assert.deepEqual(await decideSmsReply(shadow.ctx, reply), {
    askToConfirmOptOut: false,
  });
  const unsure = context("live", () => choice("stop", 0.6));
  assert.deepEqual(await decideSmsReply(unsure.ctx, reply), {
    askToConfirmOptOut: false,
  });

  const asked: string[] = [];
  assert.equal(
    await handleInboundReply(reply, {
      decide: (item) => decideSmsReply(live.ctx, item),
      askToConfirmOptOut: async (item) => asked.push(item.phone),
    }),
    true,
  );
  assert.deepEqual(asked, ["+15555550123"]);
});

test("tracker candidates are only reordered, never added or removed", () => {
  const candidates = [
    { opportunityId: "a" },
    { opportunityId: "b" },
    { opportunityId: "c" },
  ];
  assert.deepEqual(orderTrackerCandidates(candidates, undefined), candidates);
  assert.deepEqual(
    orderTrackerCandidates(candidates, {
      confirmed: new Set(["c"]),
      rejected: new Set(["a", "zzz"]),
    }).map((item) => item.opportunityId),
    ["c", "b", "a"],
  );
});

test("moderation can only hold, and only through a hold store", async () => {
  const review = {
    reviewId: "creator_test_review",
    title: null,
    body: "Call this number for cheap flights",
    ratingScore: 5,
  };
  assert.equal(
    await moderateResidencyReview(
      context("live", () => choice("spam-or-promotion")).ctx,
      review,
    ),
    "hold",
  );
  assert.equal(
    await moderateResidencyReview(
      context("live", () => choice("ok")).ctx,
      review,
    ),
    "publish",
  );
  assert.equal(
    await moderateResidencyReview(
      context("shadow", () => choice("spam-or-promotion")).ctx,
      review,
    ),
    "publish",
  );

  const published: SubmitResidencyReviewInput[] = [];
  const held: SubmitResidencyReviewInput[] = [];
  const base = {
    residencyId: "res_1",
    body: { ratingScore: 4, reviewBody: "Quiet studios and a fair stipend." },
    account: { id: "creator_test_acct" },
    ip: "127.0.0.1",
    consumeRateLimit: () => undefined,
    recordReview: async (item: SubmitResidencyReviewInput) => {
      published.push(item);
      return {
        success: true,
        reviewId: item.reviewId ?? "",
        newRating: 4,
        newTotalScore: 0,
      };
    },
  };
  const holdReview = async (item: SubmitResidencyReviewInput) => {
    held.push(item);
    return {
      success: true,
      reviewId: item.reviewId ?? "",
      newRating: 0,
      newTotalScore: 0,
    };
  };

  const heldResult = await submitResidencyReview({
    ...base,
    moderate: async () => "hold",
    holdReview,
  });
  assert.equal(heldResult.status, 200);
  assert.equal(held.length, 1);
  assert.equal(published.length, 0);

  await submitResidencyReview({ ...base, moderate: async () => "hold" });
  assert.equal(
    published.length,
    1,
    "without a hold store the review publishes as today",
  );
  await submitResidencyReview({
    ...base,
    moderate: async () => {
      throw new Error("down");
    },
    holdReview,
  });
  assert.equal(
    published.length,
    2,
    "a failing moderator never blocks a review",
  );
});

test("deadline risk records one shadow decision per due application", async () => {
  const queries: string[] = [];
  const db = {
    async query(text: string) {
      queries.push(text);
      if (text.includes("to_regclass")) return { rows: [{ present: true }] };
      return {
        rows: [
          {
            id: "creator_test_tracked_1",
            status: "preparing",
            days_until: 3,
            days_since_update: 20,
            has_reminder: false,
            has_work: false,
          },
        ],
      };
    },
  };
  const { ctx, ledger, calls } = context("shadow", () => noul(0.93));
  assert.deepEqual(await recordDeadlineRisk(db, ctx), { checked: 1 });
  assert.equal(calls.length, 1);
  assert.equal(ledger.records[0]?.subjectId, "creator_test_tracked_1");
  assert.equal(ledger.records[0]?.questionKey, "creator.deadline_at_risk");

  const missing = { query: async () => ({ rows: [{ present: false }] }) };
  assert.equal(await recordDeadlineRisk(missing, ctx), undefined);
  const broken = {
    query: async () => {
      throw new Error("db down");
    },
  };
  assert.equal(await recordDeadlineRisk(broken, ctx), undefined);
});
