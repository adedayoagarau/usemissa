import assert from "node:assert/strict";
import test from "node:test";
import type { Opportunity } from "../src/domain/types.js";
import {
  OpportunitySearchEngine,
  parseFinancialsAndFacilities,
  paymentAmountsInText,
  searchOpportunities,
  searchOpportunitiesWithConfirmedFacts,
} from "../src/search/opportunitySearchEngine.js";
import type {
  ConfirmedFactsProvider,
  ConfirmedOpportunityFacts,
} from "../src/search/confirmedFacts.js";

type OppOverrides = Partial<Omit<Opportunity, "fields">> & {
  fields?: Partial<Opportunity["fields"]>;
};

function makeOpp(id: string, overrides: OppOverrides = {}): Opportunity {
  const { fields, ...rest } = overrides;
  return {
    id,
    createdAt: "2026-08-01T00:00:00.000Z",
    status: "open",
    fields: {
      title: "Open Call",
      type: "open-call",
      genres: [],
      deadline: { kind: "exact", date: "2026-11-01" },
      fee: { disclosed: false },
      eligibility: [],
      requiredMaterials: [],
      contactEmailPresent: false,
      ...fields,
    },
    sourceId: "src_1",
    sourceUrl: "https://example.org/call",
    alternateSourceIds: [],
    scores: { freshness: 95, confidence: 90, trust: 80 },
    trustSignals: [],
    lastCheckedAt: "2026-08-01T00:00:00.000Z",
    lastChangedAt: "2026-08-01T00:00:00.000Z",
    lastExtractionConfidence: 90,
    lastOpenSignal: true,
    lastClosedSignal: false,
    lastSuspiciousSignals: [],
    pastCycles: [],
    conflicts: [],
    ...rest,
  };
}

test("a reading fee is never a stipend", () => {
  for (const prize of [
    "$25 reading fee",
    "Reading fee: $25",
    "$15 entry fee",
    "Submission fee $3.50",
    "Application fee of $40 (processing)",
  ]) {
    const result = parseFinancialsAndFacilities(
      makeOpp("fee", { fields: { prize } }),
    );
    assert.equal(result.hasStipend, false, prize);
    assert.equal(result.stipendAmountCents, undefined, prize);
  }
});

test("stipend, award and prize wording counts with the right amount", () => {
  const cases: Array<[string, number]> = [
    ["$5,000 stipend", 500000],
    ["Fellows receive a $5,000 stipend + private studio", 500000],
    ["Entry fee $15. Prize $1,000", 100000],
    ["$15 entry fee, $1,000 prize", 100000],
    ["Winner receives a $500 honorarium; $20 submission fee", 50000],
    ["$3,000 Best in Show Award", 300000],
    ["$2.5k grant", 250000],
    ["Artist fee of $750 paid on installation", 75000],
  ];
  for (const [prize, cents] of cases) {
    const result = parseFinancialsAndFacilities(
      makeOpp("pay", { fields: { prize } }),
    );
    assert.equal(result.hasStipend, true, prize);
    assert.equal(result.stipendAmountCents, cents, prize);
  }
});

test("no fee and no amount means no stipend", () => {
  for (const prize of [
    "No fee",
    "No entry fee. Publication in the spring issue",
    "",
  ]) {
    assert.equal(
      parseFinancialsAndFacilities(makeOpp("none", { fields: { prize } }))
        .hasStipend,
      false,
      prize,
    );
  }
});

test("outside the prize field an amount needs payment wording", () => {
  assert.deepEqual(paymentAmountsInText("Submissions cost $10"), []);
  assert.deepEqual(paymentAmountsInText("$10"), []);
  assert.deepEqual(paymentAmountsInText("$10", true), [1000]);
  const titled = parseFinancialsAndFacilities(
    makeOpp("title", {
      fields: { title: "The $10,000 Fiction Prize", prize: undefined },
    }),
  );
  assert.equal(titled.stipendAmountCents, 1000000);
  const eligibility = parseFinancialsAndFacilities(
    makeOpp("eligibility", {
      fields: {
        eligibility: [
          {
            key: "fee",
            description: "A $25 reading fee applies to each entry",
            value: "",
          },
        ],
      },
    }),
  );
  assert.equal(eligibility.hasStipend, false);
});

test("a negated studio or housing mention is not provision", () => {
  const none = parseFinancialsAndFacilities(
    makeOpp("none", {
      fields: { prize: "No housing provided. No private studio." },
    }),
  );
  assert.equal(none.housingProvided, false);
  assert.equal(none.studioProvided, false);
  const both = parseFinancialsAndFacilities(
    makeOpp("both", {
      fields: { prize: "Private studio and housing provided" },
    }),
  );
  assert.equal(both.housingProvided, true);
  assert.equal(both.studioProvided, true);
});

test("a reading fee no longer sorts to the top by stipend amount", () => {
  const opps = [
    makeOpp("reading-fee", { fields: { prize: "$25 reading fee" } }),
    makeOpp("stipend", { fields: { prize: "$5,000 stipend" } }),
  ];
  const result = searchOpportunities(opps, { sort: "stipend-amount" });
  assert.deepEqual(
    result.items.map((hit) => hit.opportunity.id),
    ["stipend", "reading-fee"],
  );
  assert.equal(result.items[1]!.hasStipend, false);
  assert.equal(result.items[1]!.score + 15, result.items[0]!.score);
});

function provider(
  facts: Record<string, ConfirmedOpportunityFacts>,
): ConfirmedFactsProvider & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    async factsFor(ids) {
      calls.push([...ids]);
      return new Map(
        ids.filter((id) => facts[id]).map((id) => [id, facts[id]!]),
      );
    },
  };
}

test("confirmed facts override the keyword reading one fact at a time", async () => {
  const opps = [
    makeOpp("keyword-stipend", {
      fields: {
        prize: "$1,000 prize",
        fee: { disclosed: true, amountCents: 0 },
      },
    }),
    makeOpp("confirmed-housing", { fields: { prize: "Residency" } }),
    makeOpp("untouched", { fields: { prize: "$5,000 stipend" } }),
  ];
  const facts = provider({
    "keyword-stipend": { hasStipend: false, feeStatus: "paid" },
    "confirmed-housing": {
      housingProvided: true,
      studioProvided: true,
      hasStipend: true,
      emergingOnly: true,
    },
  });
  const result = await searchOpportunitiesWithConfirmedFacts(opps, {}, facts);
  const hit = (id: string) =>
    result.items.find((item) => item.opportunity.id === id)!;

  assert.deepEqual(facts.calls, [
    ["keyword-stipend", "confirmed-housing", "untouched"],
  ]);
  assert.equal(hit("keyword-stipend").hasStipend, false);
  assert.equal(hit("keyword-stipend").stipendAmountCents, undefined);
  assert.deepEqual(hit("keyword-stipend").confirmed, {
    hasStipend: false,
    feeStatus: "paid",
  });
  assert.equal(hit("confirmed-housing").housingProvided, true);
  assert.equal(hit("confirmed-housing").studioProvided, true);
  assert.equal(hit("confirmed-housing").hasStipend, true);
  assert.equal(hit("untouched").hasStipend, true);
  assert.equal(hit("untouched").confirmed, undefined);

  const engine = await OpportunitySearchEngine.withConfirmedFacts(opps, facts);
  // The stored fields say no fee; the confirmed fact says paid.
  assert.deepEqual(
    engine
      .search({ feeStatus: "no-fee" })
      .items.map((item) => item.opportunity.id),
    [],
  );
  assert.deepEqual(
    engine
      .search({ feeStatus: "paid" })
      .items.map((item) => item.opportunity.id),
    ["keyword-stipend"],
  );
  assert.deepEqual(
    engine
      .search({ housingRequired: true })
      .items.map((item) => item.opportunity.id),
    ["confirmed-housing"],
  );
});

test("no provider or a failing provider keeps the keyword reading", async () => {
  const opps = [
    makeOpp("a", { fields: { prize: "$5,000 stipend" } }),
    makeOpp("b", { fields: { prize: "$25 reading fee" } }),
  ];
  const plain = searchOpportunities(opps, { sort: "stipend-amount" });
  assert.deepEqual(
    await searchOpportunitiesWithConfirmedFacts(opps, {
      sort: "stipend-amount",
    }),
    plain,
  );
  const errors: unknown[] = [];
  const failing: ConfirmedFactsProvider = {
    async factsFor() {
      throw new Error("ledger unavailable");
    },
  };
  assert.deepEqual(
    await searchOpportunitiesWithConfirmedFacts(
      opps,
      { sort: "stipend-amount" },
      failing,
      (error) => errors.push(error),
    ),
    plain,
  );
  assert.equal(errors.length, 1);
});
