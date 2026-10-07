import assert from "node:assert/strict";
import test from "node:test";
import {
  portfolioSchema,
  withServerProvenance,
} from "./creator-portfolio-schema";
import {
  SELF_CREDIT_MESSAGE,
  collaboratorHandleKey,
  collaboratorIssue,
  duplicateCreditMessage,
  studioServerFacts,
  withCollaboratorKeys,
  type CollaboratorLookup,
} from "./portfolio-collaborators";

const media = (n: string) =>
  `/api/creator/portfolio-media/${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;

test("handles are compared by the same key /@handle uses", () => {
  assert.equal(collaboratorHandleKey("@Toni-Oliver"), "toni-oliver");
  assert.equal(collaboratorHandleKey("  tonioliver  "), "tonioliver");
  assert.equal(collaboratorHandleKey("Toni Oliver"), "toni-oliver");
  assert.equal(collaboratorHandleKey("Zoë O’Brien"), "zoe-obrien");
  assert.equal(collaboratorHandleKey("Writer's Room"), "writers-room");
  assert.equal(collaboratorHandleKey("A & B Studio"), "a-and-b-studio");
});

test("text that cannot be a handle has no key", () => {
  for (const bad of ["", "@", "ab", "9lives", "a--b", "x".repeat(31), "日本語"])
    assert.equal(collaboratorHandleKey(bad), null, bad);
});

test("crediting yourself or the same person twice is an issue; half-typed rows are not", () => {
  const rows = (...handles: string[]) => handles.map((handle) => ({ handle }));
  assert.equal(
    collaboratorIssue(rows("tonioliver", "anareis"), ["rileychen"]),
    undefined,
  );
  assert.equal(
    collaboratorIssue(rows("rileychen"), ["rileychen"]),
    SELF_CREDIT_MESSAGE,
  );
  assert.equal(
    collaboratorIssue(rows("@RileyChen"), ["rileychen"]),
    SELF_CREDIT_MESSAGE,
  );
  assert.equal(
    collaboratorIssue(rows("anareis", "riley-old"), ["rileychen", "riley-old"]),
    SELF_CREDIT_MESSAGE,
  );
  assert.equal(
    collaboratorIssue(rows("tonioliver", "@TonioLiver"), []),
    duplicateCreditMessage("tonioliver"),
  );
  assert.equal(
    collaboratorIssue(rows("", "to", "tonioliver", "to"), []),
    undefined,
  );
});

test("stored handles are normalized so what is saved is what is compared", () => {
  const draft = portfolioSchema.parse({
    collaborators: [
      { handle: "@Toni-Oliver", name: "Toni" },
      { handle: " AnaReis ", name: "Ana" },
      { handle: "??", name: "Unfinished" },
    ],
  });
  assert.deepEqual(
    withCollaboratorKeys(draft).collaborators.map((entry) => entry.handle),
    ["toni-oliver", "anareis", "??"],
  );
});

function previewDraft() {
  return portfolioSchema.parse({
    modules: [{ id: "collaborators", visible: true, added: true }],
    collaborators: [
      { handle: "tonioliver", name: "Toni Oliver", confirmed: true },
      { handle: "anareis", name: "Ana Reis", confirmed: true },
    ],
    booking: {
      files: [
        { label: "Tech rider", file: media("a"), type: "pdf", bytes: 245_760 },
        { label: "Not described", file: media("b") },
      ],
    },
  });
}

test("in an account the studio preview confirms only who the server said", () => {
  const statuses = new Map<string, CollaboratorLookup>([
    [
      "tonioliver",
      { handle: "tonioliver", status: "confirmed", name: "Toni Oliver" },
    ],
    ["anareis", { handle: "anareis", status: "waiting" }],
  ]);
  const draft = previewDraft();
  const shown = withServerProvenance(
    draft,
    new Map(),
    studioServerFacts(draft, statuses),
  );
  assert.deepEqual(
    shown.collaborators.map((entry) => [entry.handle, entry.confirmed]),
    [
      ["tonioliver", true],
      ["anareis", false],
    ],
  );
  // Nothing known yet means nothing is shown as confirmed.
  const unknown = withServerProvenance(
    draft,
    new Map(),
    studioServerFacts(draft, new Map()),
  );
  assert.equal(
    unknown.collaborators.some((entry) => entry.confirmed),
    false,
  );
});

test("a device-only preview keeps the flags its sample came with", () => {
  const draft = previewDraft();
  const shown = withServerProvenance(
    draft,
    new Map(),
    studioServerFacts(draft, undefined),
  );
  assert.deepEqual(
    shown.collaborators.map((entry) => entry.confirmed),
    [true, true],
  );
});

test("the preview describes a file only when its type and size are known", () => {
  const draft = previewDraft();
  const shown = withServerProvenance(
    draft,
    new Map(),
    studioServerFacts(draft, undefined),
  );
  assert.deepEqual(
    shown.booking.files.map(({ type, bytes }) => ({ type, bytes })),
    [
      { type: "pdf", bytes: 245_760 },
      { type: undefined, bytes: undefined },
    ],
  );
});
