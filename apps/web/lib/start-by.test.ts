import assert from "node:assert/strict";
import test from "node:test";

import { estimateStartBy, startByLabel } from "./start-by.ts";

const now = new Date(2026, 9, 3, 9, 0, 0);

test("works back from the deadline using remaining materials and a buffer", () => {
  const result = estimateStartBy({
    deadline: "2026-11-03",
    deadlineKind: "fixed",
    now,
    items: [
      { label: "Artist statement", state: "missing", linked: false },
      { label: "Work sample", state: "missing", linked: true },
      { label: "Bio", state: "complete", linked: false },
    ],
  });
  assert.ok(result);
  // Statement 3 + linked sample review 1 + buffer 1.
  assert.equal(result.daysNeeded, 5);
  assert.equal(result.date, "2026-10-29");
  assert.equal(result.basis, "checklist");
  assert.equal(result.status, "ahead");
  assert.equal(startByLabel(result), "Start by Oct 29");
  assert.equal(result.reasons.length, 3);
  assert.match(result.reasons[1].detail, /Linked from Library/);
});

test("waiting on referees sets the floor even when the work is small", () => {
  const result = estimateStartBy({
    deadline: "2026-11-03",
    deadlineKind: "exact",
    now,
    items: [{ label: "Two letters of recommendation", state: "missing", linked: false }],
  });
  assert.equal(result?.daysNeeded, 22);
  assert.equal(result?.date, "2026-10-12");
});

test("uses a labelled default without a checklist, and nothing for rolling or finished prep", () => {
  const fallback = estimateStartBy({ deadline: "2026-10-06", deadlineKind: "fixed", now, items: [] });
  assert.equal(fallback?.basis, "default");
  assert.equal(fallback?.status, "passed");
  assert.equal(startByLabel(fallback!), "Start-by passed 5 days ago");
  assert.equal(estimateStartBy({ deadline: "2026-12-01", deadlineKind: "rolling", now, items: [] }), null);
  assert.equal(estimateStartBy({ deadline: null, deadlineKind: "unknown", now, items: [] }), null);
  assert.equal(estimateStartBy({ deadline: "2026-12-01", deadlineKind: "fixed", now, items: [{ label: "Bio", state: "complete", linked: false }] }), null);
});
