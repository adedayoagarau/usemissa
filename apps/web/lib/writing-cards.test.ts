import assert from "node:assert/strict";
import { test } from "node:test";
import {
  newPlotlineId,
  parseCard,
  parseProjectPlan,
  splitNames,
  storedCard,
  storedPlan,
  targetProgress,
} from "./writing-cards.ts";
import { parsePieceChange } from "./writing-projects.ts";

test("a card keeps what the writer filled in and drops empty fields", () => {
  const plot = newPlotlineId();
  assert.deepEqual(
    parseCard({
      pov: "  Kemi ",
      characters: ["Kemi", "Tunde", "Kemi"],
      place: "",
      storyTime: "Day 3, evening",
      plotlines: [plot],
      tags: [],
      goal: "Find her sister",
      target: 2500,
    }),
    {
      pov: "Kemi",
      characters: ["Kemi", "Tunde"],
      storyTime: "Day 3, evening",
      plotlines: [plot],
      goal: "Find her sister",
      target: 2500,
    },
  );
});

test("cards that are not cards are refused", () => {
  assert.ok("error" in parseCard(null));
  assert.ok("error" in parseCard({ pov: "x".repeat(121) }));
  assert.ok("error" in parseCard({ goal: "x".repeat(501) }));
  assert.ok("error" in parseCard({ plotlines: ["not-a-plotline"] }));
  assert.ok("error" in parseCard({ target: 2.5 }));
  assert.ok("error" in parseCard({ target: -1 }));
  assert.ok("error" in parseCard({ characters: "Kemi" }));
  assert.deepEqual(storedCard("garbage"), {});
  assert.deepEqual(storedCard(null), {});
});

test("a project's plotlines need names and their own ids", () => {
  const id = newPlotlineId();
  assert.deepEqual(parseProjectPlan({ plotlines: [{ id, name: " Main " }] }), {
    plotlines: [{ id, name: "Main" }],
  });
  assert.ok(
    "error" in
      parseProjectPlan({
        plotlines: [
          { id, name: "A" },
          { id, name: "B" },
        ],
      }),
  );
  assert.ok("error" in parseProjectPlan({ plotlines: [{ id, name: "" }] }));
  assert.ok(
    "error" in parseProjectPlan({ plotlines: [{ id: "x", name: "A" }] }),
  );
  assert.deepEqual(storedPlan(undefined), { plotlines: [] });
});

test("names split on commas and lines; progress is capped at the target", () => {
  assert.deepEqual(splitNames("Kemi, Tunde\nAda Okafor,, Kemi"), [
    "Kemi",
    "Tunde",
    "Ada Okafor",
  ]);
  assert.equal(targetProgress(500, undefined), null);
  assert.equal(targetProgress(500, 1000), 0.5);
  assert.equal(targetProgress(1500, 1000), 1);
});

test("a piece change can carry a whole card", () => {
  const change = parsePieceChange({ card: { pov: "Kemi" }, status: "draft" });
  assert.deepEqual(change, { card: { pov: "Kemi" }, status: "draft" });
  assert.ok("error" in parsePieceChange({ card: { target: "lots" } }));
});
