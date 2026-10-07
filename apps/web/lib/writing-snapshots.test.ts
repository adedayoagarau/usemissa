import assert from "node:assert/strict";
import { test } from "node:test";
import {
  diffLines,
  newWritingSnapshotId,
  parseSnapshotRequest,
} from "./writing-snapshots.ts";

test("a comparison marks the lines taken out and the lines put in", () => {
  assert.deepEqual(
    diffLines(
      "the light\nwent thin\nand gold",
      "the light\nwent gold\nand gold\nat last",
    ),
    [
      { kind: "same", text: "the light" },
      { kind: "removed", text: "went thin" },
      { kind: "added", text: "went gold" },
      { kind: "same", text: "and gold" },
      { kind: "added", text: "at last" },
    ],
  );
  assert.deepEqual(diffLines("same", "same"), [{ kind: "same", text: "same" }]);
  // Spaces count: a line indented differently is a different line.
  assert.deepEqual(
    diffLines("\tindented", "  indented")?.map((line) => line.kind),
    ["removed", "added"],
  );
  const long = Array.from({ length: 3000 }, (_, index) => `line ${index}`);
  assert.equal(
    diffLines(long.join("\n"), [...long].reverse().join("\n")),
    null,
    "texts too long to compare are shown whole",
  );
});

test("snapshot requests are checked", () => {
  const id = newWritingSnapshotId();
  assert.deepEqual(
    parseSnapshotRequest({ id, name: " Before ", body: "words" }),
    { id, name: "Before", title: "", body: "words", document: null },
  );
  assert.ok("error" in parseSnapshotRequest({ id: "x", body: "" }));
  assert.ok("error" in parseSnapshotRequest({ id, body: 5 }));
  assert.ok(
    "error" in parseSnapshotRequest({ id, body: "", name: "n".repeat(121) }),
  );
  assert.ok(
    "error" in parseSnapshotRequest({ id, body: "", document: "{bad" }),
  );
});
