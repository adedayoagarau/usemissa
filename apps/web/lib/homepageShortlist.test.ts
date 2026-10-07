import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SHORTLIST_LIMIT,
  addToShortlist,
  emptyShortlist,
  isShortlisted,
  parseShortlist,
  removeFromShortlist,
  serializeShortlist,
  shortlistCountLabel,
  toggleShortlist,
} from "./homepageShortlist";

const now = new Date("2026-10-06T12:00:00.000Z");

test("adding is idempotent, newest first, and survives a round trip", () => {
  let state = emptyShortlist();
  state = addToShortlist(state, { id: "a", title: "A" }, now);
  state = addToShortlist(state, { id: "b", title: "B" }, now);
  state = addToShortlist(state, { id: "a", title: "A again" }, now);
  assert.deepEqual(
    state.items.map((item) => item.id),
    ["b", "a"],
  );
  assert.equal(state.items[1]?.title, "A");
  const restored = parseShortlist(serializeShortlist(state));
  assert.deepEqual(restored, state);
  assert.equal(isShortlisted(restored, "b"), true);
});

test("removing and toggling return the same reference when nothing changes", () => {
  const state = addToShortlist(emptyShortlist(), { id: "a", title: "A" }, now);
  assert.equal(removeFromShortlist(state, "missing"), state);
  assert.equal(addToShortlist(state, { id: "a", title: "A" }, now), state);
  assert.equal(toggleShortlist(state, { id: "a", title: "A" }, now).items.length, 0);
});

test("the shortlist is capped and malformed storage reads as empty", () => {
  let state = emptyShortlist();
  for (let index = 0; index < SHORTLIST_LIMIT + 3; index += 1) {
    state = addToShortlist(state, { id: `id-${index}`, title: `Call ${index}` }, now);
  }
  assert.equal(state.items.length, SHORTLIST_LIMIT);
  assert.equal(state.items[0]?.id, `id-${SHORTLIST_LIMIT + 2}`);

  assert.deepEqual(parseShortlist(null), emptyShortlist());
  assert.deepEqual(parseShortlist("not json"), emptyShortlist());
  assert.deepEqual(parseShortlist('{"items":"no"}'), emptyShortlist());
  assert.deepEqual(
    parseShortlist(
      '{"items":[{"id":"ok","title":"Ok","addedAt":"2026-10-06"},{"id":"bad id!","title":"x","addedAt":"y"},{"id":"ok","title":"dup","addedAt":"z"}]}',
    ).items.map((item) => item.id),
    ["ok"],
  );
});

test("count labels use the word creators use", () => {
  assert.equal(shortlistCountLabel(1), "1 call");
  assert.equal(shortlistCountLabel(2), "2 calls");
});
