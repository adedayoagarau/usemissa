import assert from "node:assert/strict";
import test from "node:test";
import type { OpportunityDeadlineFacts } from "@missa/radar-engine";

import { shapeCalendarFacts } from "./calendar-facts.ts";

test("calendar facts keep stages and tiers inside the range, with provenance", () => {
  const facts = new Map<string, OpportunityDeadlineFacts>([
    [
      "opp-1",
      {
        provenance: { state: "changed", previousDate: "2099-02-20", lastCheckedAt: "2099-01-01T00:00:00.000Z" },
        stages: [
          { id: "s1", kind: "letter-of-intent", label: "Letter of intent", dueOn: "2099-02-01", confidence: "confirmed" },
          { id: "s2", kind: "decision", label: "Decision", dueOn: "2101-06-01", confidence: "probable" },
        ],
        tiers: [{ id: "t1", tier: "early", label: "Early-bird", closesOn: "2099-02-10", feeCents: 1500, confidence: "confirmed" }],
      },
    ],
  ]);
  const shaped = shapeCalendarFacts(
    [
      { opportunityId: "opp-1", title: "Film fund", deadline: "2099-03-01" },
      { opportunityId: "opp-2", title: "No facts" },
    ],
    facts,
    "2099-01-01",
    "2100-12-31",
  );
  assert.deepEqual(shaped.stages.map((item) => item.stage.id), ["s1"]);
  assert.equal(shaped.tiers[0]?.deadline, "2099-03-01");
  assert.equal(shaped.provenance["opp-1"]?.state, "changed");
  assert.equal(shaped.provenance["opp-2"], undefined);
});
