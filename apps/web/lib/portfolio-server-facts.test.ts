import assert from "node:assert/strict";
import test from "node:test";
import type { PublishedCreditList } from "@missa/radar-adapters";
import {
  portfolioSchema,
  publicPortfolioProjection,
  withServerProvenance,
  type PortfolioData,
} from "./creator-portfolio-schema";
import {
  collaboratorStatuses,
  creditedHandles,
  documentIssue,
  normalizedCollaborators,
  portfolioServerFacts,
  reviewPortfolioDraft,
  type FactsStore,
} from "./portfolio-server-facts";
import {
  SELF_CREDIT_MESSAGE,
  duplicateCreditMessage,
} from "./portfolio-collaborators";

const media = (n: string) =>
  `/api/creator/portfolio-media/${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;
const idOf = (url: string) => url.split("/").pop()!;

const ADDED = [{ id: "collaborators", visible: true, added: true }];

/** A credit list as the repository returns it for a published snapshot. */
function published(
  name: string,
  credits: string[],
  modules: unknown = ADDED,
): PublishedCreditList {
  return {
    name,
    collaborators: credits.map((handle) => ({
      handle,
      name: handle,
      role: "Made it",
      confirmed: false,
    })),
    modules,
  };
}

type World = {
  /** handle key (current or alias) → user id */
  handles: Record<string, string>;
  /** user id → every handle key that user answers to */
  keys: Record<string, string[]>;
  lists: Record<string, PublishedCreditList>;
  /** account id → stored files */
  files: Record<string, { id: string; contentType: string; bytes: number }[]>;
};

function fakeStore(world: World) {
  const calls = {
    handles: [] as string[][],
    lists: [] as string[][],
    media: 0,
  };
  const store: FactsStore = {
    async userIdsForHandles(keys) {
      calls.handles.push([...keys]);
      return new Map(
        [...new Set(keys)]
          .slice(0, 12)
          .flatMap((key) =>
            world.handles[key] ? [[key, world.handles[key]!] as const] : [],
          ),
      );
    },
    async userHandleKeys(userId) {
      return world.keys[userId] ?? [];
    },
    async publishedCreditLists(userIds) {
      calls.lists.push([...userIds]);
      return new Map(
        userIds.flatMap((id) =>
          world.lists[id] ? [[id, world.lists[id]!] as const] : [],
        ),
      );
    },
    async portfolioMediaFacts(accountId, ids) {
      calls.media += 1;
      return (world.files[accountId] ?? []).filter((file) =>
        ids.includes(file.id),
      );
    },
  };
  return { store, calls };
}

const owner = { accountId: "acct-riley", userId: "user-riley" };

/** Riley, Toni and Ana on a small Missa. */
function world(overrides: Partial<World> = {}): World {
  return {
    handles: {
      rileychen: "user-riley",
      "riley-old": "user-riley",
      tonioliver: "user-toni",
      "toni-old": "user-toni",
      anareis: "user-ana",
      quietone: "user-quiet",
    },
    keys: {
      "user-riley": ["rileychen", "riley-old"],
      "user-toni": ["tonioliver", "toni-old"],
      "user-ana": ["anareis"],
    },
    lists: {},
    files: {},
    ...overrides,
  };
}

function draft(
  collaborators: { handle: string; name?: string }[],
  extra: Record<string, unknown> = {},
): PortfolioData {
  return portfolioSchema.parse({
    name: "Riley Chen",
    modules: ADDED,
    collaborators: collaborators.map((entry) => ({
      name: entry.name ?? entry.handle,
      role: "Composed the score",
      confirmed: true, // a client claim, which must never count
      ...entry,
    })),
    ...extra,
  });
}

test("a credit is confirmed only when the other creator’s snapshot lists this one back", async () => {
  const { store } = fakeStore(
    world({
      lists: {
        "user-toni": published("Toni Oliver", ["rileychen"]),
        "user-ana": published("Ana Reis", ["tonioliver"]),
      },
    }),
  );
  const facts = await portfolioServerFacts(
    draft([{ handle: "tonioliver" }, { handle: "anareis" }]),
    owner,
    store,
  );
  assert.deepEqual([...(facts.confirmedHandles ?? [])], ["tonioliver"]);

  const provenanced = withServerProvenance(
    draft([{ handle: "tonioliver" }, { handle: "anareis" }]),
    new Map(),
    facts,
  );
  assert.deepEqual(
    provenanced.collaborators.map((entry) => entry.confirmed),
    [true, false],
  );
  const visitors = publicPortfolioProjection(provenanced);
  assert.deepEqual(
    visitors.collaborators.map((entry) => entry.handle),
    ["tonioliver"],
    "visitors never see a credit the other side has not confirmed",
  );
});

test("without facts a client-sent confirmed flag is discarded", async () => {
  const claimed = draft([{ handle: "tonioliver" }]);
  assert.equal(claimed.collaborators[0]!.confirmed, true);
  assert.equal(
    withServerProvenance(claimed, new Map(), {}).collaborators[0]!.confirmed,
    false,
  );
  const failing: FactsStore = {
    ...fakeStore(world()).store,
    userIdsForHandles: async () => {
      throw new Error("database offline");
    },
  };
  assert.deepEqual(await portfolioServerFacts(claimed, owner, failing), {});
  await assert.rejects(
    reviewPortfolioDraft(claimed, owner, failing),
    /offline/,
  );
});

test("confirmation follows the person, so old handles and aliases still count", async () => {
  const { store } = fakeStore(
    world({
      lists: {
        // Toni credited Riley by Riley’s old handle.
        "user-toni": published("Toni Oliver", ["riley-old"]),
      },
    }),
  );
  const facts = await portfolioServerFacts(
    draft([{ handle: "toni-old" }]),
    owner,
    store,
  );
  assert.deepEqual([...(facts.confirmedHandles ?? [])], ["toni-old"]);
});

test("a hidden, switched-off or nameless credit on the other side does not confirm", () => {
  const credited = (list: PublishedCreditList) => [...creditedHandles(list)];
  assert.deepEqual(credited(published("Toni", ["rileychen"])), ["rileychen"]);
  assert.deepEqual(
    credited(
      published(
        "Toni",
        ["rileychen"],
        [{ id: "collaborators", visible: false, added: true }],
      ),
    ),
    [],
  );
  assert.deepEqual(
    credited(
      published(
        "Toni",
        ["rileychen"],
        [{ id: "collaborators", visible: true, added: false }],
      ),
    ),
    [],
  );
  assert.deepEqual(credited(published("Toni", ["rileychen"], [])), []);
  assert.deepEqual(
    credited({ name: "Toni", collaborators: "bad", modules: ADDED }),
    [],
  );
  assert.deepEqual(
    credited({
      name: "Toni",
      modules: ADDED,
      collaborators: [
        { handle: "rileychen", name: "  " },
        { handle: 4, name: "x" },
        null,
        { handle: "@Riley-Chen", name: "Riley" },
      ],
    }),
    ["riley-chen"],
  );
});

test("crediting yourself is never confirmed and is rejected on save", async () => {
  const { store } = fakeStore(
    world({ lists: { "user-riley": published("Riley Chen", ["rileychen"]) } }),
  );
  for (const handle of ["rileychen", "riley-old", "@RileyChen"]) {
    const own = normalizedCollaborators(draft([{ handle }]));
    const reviewed = await reviewPortfolioDraft(own, owner, store);
    assert.equal(reviewed.issue, SELF_CREDIT_MESSAGE, handle);
    assert.equal(reviewed.facts.confirmedHandles?.size, 0, handle);
  }
});

test("the same person twice is rejected, even by an old and a current handle", async () => {
  const { store } = fakeStore(world());
  const sameKey = await reviewPortfolioDraft(
    normalizedCollaborators(
      draft([{ handle: "tonioliver" }, { handle: "@TonioLiver" }]),
    ),
    owner,
    store,
  );
  assert.equal(sameKey.issue, duplicateCreditMessage("tonioliver"));
  const aliasAndCurrent = await reviewPortfolioDraft(
    normalizedCollaborators(
      draft([{ handle: "tonioliver" }, { handle: "toni-old" }]),
    ),
    owner,
    store,
  );
  assert.equal(aliasAndCurrent.issue, duplicateCreditMessage("toni-old"));
  const fine = await reviewPortfolioDraft(
    normalizedCollaborators(
      draft([{ handle: "tonioliver" }, { handle: "anareis" }]),
    ),
    owner,
    store,
  );
  assert.equal(fine.issue, undefined);
});

test("a handle that nobody has published cannot be told apart from one that does not exist", async () => {
  const { store } = fakeStore(
    world({
      // quietone is a real, claimed handle whose owner never published.
      lists: { "user-ana": published("Ana Reis", []) },
    }),
  );
  const lookups = await collaboratorStatuses(
    owner,
    ["quietone", "nobody-by-this-name", "x", "anareis"],
    store,
  );
  assert.deepEqual(lookups, [
    { handle: "quietone", status: "not-published" },
    { handle: "nobody-by-this-name", status: "not-published" },
    { handle: "x", status: "not-published" },
    { handle: "anareis", status: "waiting", name: "Ana Reis" },
  ]);
});

test("the status endpoint repeats nothing twice and never looks up more than twelve people", async () => {
  const handles = Object.fromEntries(
    Array.from({ length: 20 }, (_, i) => [`person-${i}`, `user-${i}`]),
  );
  const { store, calls } = fakeStore(world({ handles }));
  const asked = [
    "person-1",
    "@Person-1",
    ...Array.from({ length: 20 }, (_, i) => `person-${i}`),
  ];
  const lookups = await collaboratorStatuses(owner, asked, store);
  assert.ok(calls.handles.every((keys) => keys.length <= 12));
  assert.equal(
    calls.handles.length,
    1,
    "one batched lookup, not one per person",
  );
  assert.equal(
    lookups.filter((lookup) => lookup.handle === "person-1").length,
    1,
  );
  assert.ok(lookups.length <= 12);
});

test("an unclaimed creator can be credited but nothing can confirm without a handle", async () => {
  const { store } = fakeStore(
    world({
      keys: {},
      lists: { "user-toni": published("Toni", ["rileychen"]) },
    }),
  );
  const facts = await portfolioServerFacts(
    draft([{ handle: "tonioliver" }]),
    owner,
    store,
  );
  assert.equal(facts.confirmedHandles?.size, 0);
});

test("Booking kit files take their type and size from the stored file, never the client", async () => {
  const pdf = media("a");
  const zip = media("b");
  const photo = media("c");
  const theirs = media("d");
  const { store, calls } = fakeStore(
    world({
      files: {
        "acct-riley": [
          { id: idOf(pdf), contentType: "application/pdf", bytes: 245_760 },
          {
            id: idOf(zip),
            contentType: "application/zip",
            bytes: 18 * 1024 * 1024,
          },
          { id: idOf(photo), contentType: "image/png", bytes: 2048 },
        ],
        "acct-other": [
          { id: idOf(theirs), contentType: "application/pdf", bytes: 9 },
        ],
      },
    }),
  );
  const claimed = draft([], {
    booking: {
      shortBio: "",
      longBio: "",
      files: [
        // The client lies about both the type and the size of every file.
        { label: "Tech rider", file: pdf, type: "zip", bytes: 1 },
        { label: "Press kit", file: zip, type: "pdf", bytes: 5 },
      ],
    },
  });
  const facts = await portfolioServerFacts(claimed, owner, store);
  const stored = withServerProvenance(claimed, new Map(), facts);
  assert.deepEqual(
    stored.booking.files.map(({ type, bytes }) => ({ type, bytes })),
    [
      { type: "pdf", bytes: 245_760 },
      { type: "zip", bytes: 18 * 1024 * 1024 },
    ],
  );
  assert.equal(calls.media, 1, "one query for all of the files");
  assert.equal(documentIssue(claimed, facts), undefined);

  // The schema accepts the largest file the media route stores.
  assert.doesNotThrow(() => portfolioSchema.parse(stored));

  for (const [bad, label] of [
    [photo, "an image"],
    [theirs, "another account’s file"],
  ] as const) {
    const wrong = draft([], {
      booking: {
        shortBio: "",
        longBio: "",
        files: [{ label: "Tech rider", file: bad }],
      },
    });
    const reviewed = await reviewPortfolioDraft(wrong, owner, store);
    assert.match(
      reviewed.issue ?? "",
      /Tech rider.*isn’t a PDF or ZIP you uploaded/,
      label,
    );
    const dropped = withServerProvenance(wrong, new Map(), reviewed.facts);
    assert.equal(dropped.booking.files[0]!.type, undefined, label);
    assert.equal(dropped.booking.files[0]!.bytes, undefined, label);
  }
});

test("a label with no file yet is not an error and costs no query", async () => {
  const { store, calls } = fakeStore(world());
  const empty = draft([], {
    booking: {
      shortBio: "",
      longBio: "",
      files: [{ label: "Tech rider", file: "" }],
    },
  });
  const reviewed = await reviewPortfolioDraft(empty, owner, store);
  assert.equal(reviewed.issue, undefined);
  assert.equal(calls.media, 0);
});

test("publishing keeps credits that are still waiting so the other side can confirm them", async () => {
  const { store } = fakeStore(world());
  const waiting = draft([{ handle: "tonioliver" }]);
  const facts = await portfolioServerFacts(waiting, owner, store);
  const stored = withServerProvenance(waiting, new Map(), facts);
  assert.equal(stored.collaborators[0]!.confirmed, false);
  assert.deepEqual(publicPortfolioProjection(stored).collaborators, []);
  assert.deepEqual(
    publicPortfolioProjection(stored, {
      keepPendingCollaborators: true,
    }).collaborators.map((entry) => entry.handle),
    ["tonioliver"],
  );
});

test("the two creators can confirm each other whichever publishes first", async () => {
  // Riley publishes first. Toni has not published, so nothing is confirmed.
  const rileySnapshot = publicPortfolioProjection(
    withServerProvenance(draft([{ handle: "tonioliver" }]), new Map(), {}),
    { keepPendingCollaborators: true },
  );
  const lists: Record<string, PublishedCreditList> = {
    "user-riley": {
      name: rileySnapshot.name,
      collaborators: rileySnapshot.collaborators,
      modules: rileySnapshot.modules,
    },
  };
  const first = await portfolioServerFacts(
    draft([{ handle: "tonioliver" }]),
    owner,
    fakeStore(world({ lists })).store,
  );
  assert.equal(first.confirmedHandles?.size, 0);

  // Toni then publishes a snapshot that credits Riley. Both now confirm.
  const toni = { accountId: "acct-toni", userId: "user-toni" };
  const toniDraft = portfolioSchema.parse({
    name: "Toni Oliver",
    modules: ADDED,
    collaborators: [
      { handle: "rileychen", name: "Riley Chen", role: "Wrote the text" },
    ],
  });
  const toniSnapshot = publicPortfolioProjection(
    withServerProvenance(toniDraft, new Map(), {}),
    { keepPendingCollaborators: true },
  );
  lists["user-toni"] = {
    name: toniSnapshot.name,
    collaborators: toniSnapshot.collaborators,
    modules: toniSnapshot.modules,
  };
  const { store } = fakeStore(world({ lists }));
  const rileyReads = await portfolioServerFacts(
    draft([{ handle: "tonioliver" }]),
    owner,
    store,
  );
  const toniReads = await portfolioServerFacts(toniDraft, toni, store);
  assert.deepEqual([...(rileyReads.confirmedHandles ?? [])], ["tonioliver"]);
  assert.deepEqual([...(toniReads.confirmedHandles ?? [])], ["rileychen"]);
});
