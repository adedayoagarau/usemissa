import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countWords,
  newWritingEntryId,
  writingPreview,
  type WritingContent,
} from "./writing.ts";
import {
  browserWritingDeviceStore,
  WritingSync,
  type WritingDeviceStore,
  type WritingDraft,
  type WritingFork,
  type WritingSaveOutcome,
  type WritingTransport,
} from "./writing-sync.ts";

const text = (body: string, title = ""): WritingContent => ({
  title,
  body,
  document: null,
});

/** An account that follows the same revision rules as WritingRepository. */
function fakeAccount() {
  const entries = new Map<string, { body: string; revision: number }>();
  const calls: Array<{
    id: string;
    body: string;
    baseRevision: number;
    projectId?: string | null;
  }> = [];
  let mode: "ok" | "down" | "unavailable" | "signed-out" = "ok";
  const transport: WritingTransport = async (
    id,
    content,
    baseRevision,
    options,
  ) => {
    const body = content.body;
    calls.push({ id, body, baseRevision, projectId: options.projectId });
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (mode === "down") return { kind: "failed" };
    if (mode === "unavailable") return { kind: "unavailable" };
    if (mode === "signed-out") return { kind: "signed-out" };
    const stored = entries.get(id);
    const summary = (revision: number): WritingSaveOutcome => ({
      kind: "saved",
      entry: {
        id,
        title: content.title,
        projectId: null,
        position: 0,
        synopsis: "",
        status: "",
        preview: writingPreview(body),
        wordCount: countWords(body),
        revision,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    if (stored && stored.body === body) return summary(stored.revision);
    if (baseRevision === 0) {
      if (stored) return conflict(id, stored);
      entries.set(id, { body, revision: 1 });
      return summary(1);
    }
    if (!stored) return { kind: "not-found" };
    if (stored.revision !== baseRevision) return conflict(id, stored);
    entries.set(id, { body, revision: stored.revision + 1 });
    return summary(stored.revision + 1);
  };
  function conflict(
    id: string,
    stored: { body: string; revision: number },
  ): WritingSaveOutcome {
    return {
      kind: "conflict",
      current: {
        id,
        title: "",
        body: stored.body,
        document: null,
        projectId: null,
        position: 0,
        synopsis: "",
        status: "",
        preview: writingPreview(stored.body),
        wordCount: countWords(stored.body),
        revision: stored.revision,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
    };
  }
  return {
    entries,
    calls,
    transport,
    setMode(next: typeof mode) {
      mode = next;
    },
  };
}

function fakeDevice(initial: WritingDraft[] = []) {
  let stored = initial;
  let broken = false;
  const device: WritingDeviceStore = {
    read: () => stored,
    write(drafts) {
      if (broken) return false;
      stored = drafts.map((draft) => ({ ...draft }));
      return true;
    },
  };
  return {
    device,
    stored: () => stored,
    breakStorage() {
      broken = true;
    },
  };
}

function setup(
  options: { drafts?: WritingDraft[]; online?: () => boolean } = {},
) {
  const account = fakeAccount();
  const device = fakeDevice(options.drafts);
  const forks: WritingFork[] = [];
  const sync = new WritingSync({
    transport: account.transport,
    device: device.device,
    onForked: (fork) => forks.push(fork),
    online: options.online ?? (() => true),
    saveDelayMs: 5,
    maxWaitMs: 20,
    deviceDelayMs: 1,
    retryBaseMs: 5,
    retryMaxMs: 20,
  });
  return { account, device, sync, forks };
}

test("text is kept on the device first and removed once the account confirms it", async () => {
  const { account, device, sync } = setup();
  const id = newWritingEntryId();
  sync.edit(id, text("The first line"));
  assert.deepEqual(sync.snapshot().pending, [id]);
  await sync.whenIdle();
  assert.equal(account.entries.get(id)?.body, "The first line");
  assert.deepEqual(device.stored(), []);
  assert.deepEqual(sync.snapshot().pending, []);

  sync.edit(id, text("The first line, and a second"));
  await sync.whenIdle();
  assert.deepEqual(account.entries.get(id), {
    body: "The first line, and a second",
    revision: 2,
  });
  assert.deepEqual(
    account.calls.map((call) => call.baseRevision),
    [0, 1],
  );
});

test("an empty new entry is never saved", async () => {
  const { account, sync } = setup();
  const id = newWritingEntryId();
  sync.edit(id, text("   \n"));
  await sync.whenIdle();
  sync.edit(id, text("x"));
  sync.edit(id, text(""));
  await sync.whenIdle();
  assert.equal(account.calls.length, 0);
  assert.deepEqual(sync.snapshot().pending, []);
});

test("typing while a save is on its way saves the newest text on the right revision", async () => {
  const { account, sync, forks } = setup();
  const id = newWritingEntryId();
  sync.edit(id, text("One"));
  await new Promise((resolve) => setTimeout(resolve, 6));
  sync.edit(id, text("One two"));
  sync.edit(id, text("One two three"));
  await sync.whenIdle();
  assert.equal(account.entries.get(id)?.body, "One two three");
  assert.deepEqual(forks, []);
});

test("while the account cannot be reached the text stays on the device and is retried", async () => {
  const { account, device, sync } = setup();
  account.setMode("down");
  const id = newWritingEntryId();
  sync.edit(id, text("Written on a train"));
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(sync.snapshot().account, "retrying");
  assert.equal(device.stored()[0]?.content.body, "Written on a train");
  account.setMode("ok");
  await sync.whenIdle();
  assert.equal(account.entries.get(id)?.body, "Written on a train");
  assert.equal(sync.snapshot().account, "ok");
  assert.deepEqual(device.stored(), []);
});

test("offline, nothing is sent until the device is back online", async () => {
  let online = false;
  const { account, sync } = setup({ online: () => online });
  const id = newWritingEntryId();
  sync.edit(id, text("No signal"));
  await sync.whenIdle();
  assert.equal(account.calls.length, 0);
  assert.equal(sync.snapshot().account, "offline");
  online = true;
  sync.retryAll();
  await sync.whenIdle();
  assert.equal(account.entries.get(id)?.body, "No signal");
});

test("drafts kept from an earlier visit are saved when the room opens", async () => {
  const id = newWritingEntryId();
  const { account, sync } = setup({
    drafts: [
      {
        id,
        content: text("Left from yesterday"),
        baseRevision: 0,
        updatedAt: new Date().toISOString(),
      },
    ],
  });
  assert.deepEqual(
    sync.load().map((draft) => draft.id),
    [id],
  );
  sync.flush();
  await sync.whenIdle();
  assert.equal(account.entries.get(id)?.body, "Left from yesterday");
});

test("when another device changed the entry, this device's text becomes a new entry", async () => {
  const { account, sync, forks } = setup();
  const id = newWritingEntryId();
  sync.edit(id, text("Shared start"));
  await sync.whenIdle();
  account.entries.set(id, { body: "Shared start, laptop", revision: 2 });

  sync.edit(id, text("Shared start, phone"));
  await sync.whenIdle();
  assert.equal(account.entries.get(id)?.body, "Shared start, laptop");
  assert.equal(forks.length, 1);
  assert.equal(forks[0]?.reason, "conflict");
  assert.equal(forks[0]?.current?.body, "Shared start, laptop");
  assert.equal(account.entries.get(forks[0]!.to)?.body, "Shared start, phone");
});

test("a piece started in a project is created there, and a fork stays there", async () => {
  const { account, sync, forks } = setup();
  const project = "project_0f8fad5b-d9cb-469f-a165-70867728950e";
  const id = newWritingEntryId();
  sync.edit(id, text("Chapter one"), project);
  await sync.whenIdle();
  assert.equal(account.calls.at(-1)?.projectId, project);

  account.entries.set(id, { body: "Chapter one, laptop", revision: 2 });
  sync.edit(id, text("Chapter one, phone"));
  await sync.whenIdle();
  assert.equal(forks.length, 1);
  const created = account.calls.find((call) => call.id === forks[0]!.to);
  assert.equal(created?.projectId, project);
});

test("when another device deleted the entry, this device's text becomes a new entry", async () => {
  const { account, sync, forks } = setup();
  const id = newWritingEntryId();
  sync.edit(id, text("Keep me"));
  await sync.whenIdle();
  account.entries.delete(id);
  sync.edit(id, text("Keep me, please"));
  await sync.whenIdle();
  assert.equal(forks[0]?.reason, "not-found");
  assert.equal(account.entries.get(forks[0]!.to)?.body, "Keep me, please");
});

test("without account saving, text stays on the device and nothing more is sent", async () => {
  const { account, device, sync } = setup();
  account.setMode("unavailable");
  const id = newWritingEntryId();
  sync.edit(id, text("Only here"));
  await sync.whenIdle();
  sync.edit(id, text("Only here, still"));
  await sync.whenIdle();
  assert.equal(sync.snapshot().account, "unavailable");
  assert.equal(account.calls.length, 1);
  assert.equal(device.stored()[0]?.content.body, "Only here, still");
});

test("signed out, text stays on the device until the next visit", async () => {
  const { account, device, sync } = setup();
  account.setMode("signed-out");
  const id = newWritingEntryId();
  sync.edit(id, text("Session ended"));
  await sync.whenIdle();
  assert.equal(sync.snapshot().account, "signed-out");
  assert.equal(device.stored()[0]?.content.body, "Session ended");
});

test("a broken device store is reported so the page can warn before closing", async () => {
  const { account, device, sync } = setup();
  account.setMode("down");
  device.breakStorage();
  const id = newWritingEntryId();
  sync.edit(id, text("Nowhere safe yet"));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(sync.snapshot().device, false);
  assert.equal(sync.unprotected(), true);
  account.setMode("ok");
  await sync.whenIdle();
  assert.equal(sync.unprotected(), false);
});

test("deleting waits for a save on its way, so the delete is never overtaken", async () => {
  const { account, sync } = setup();
  const id = newWritingEntryId();
  sync.edit(id, text("About to go"));
  await new Promise((resolve) => setTimeout(resolve, 6));
  const { existsOnServer } = await sync.discard(id);
  assert.equal(existsOnServer, true);
  assert.ok(account.entries.has(id));
  sync.edit(id, text("Typed after delete"));
  await sync.whenIdle();
  assert.equal(account.entries.get(id)?.body, "About to go");
});

test("a never-saved entry is discarded without asking the account", async () => {
  const { account, sync } = setup();
  const id = newWritingEntryId();
  sync.edit(id, text("Draft only"));
  const { existsOnServer } = await sync.discard(id);
  assert.equal(existsOnServer, false);
  await sync.whenIdle();
  assert.equal(account.calls.length, 0);
});

test("two tabs offline in one browser never erase each other's drafts", async () => {
  const device = fakeDevice();
  const account = fakeAccount();
  const options = {
    transport: account.transport,
    device: device.device,
    online: () => false,
    saveDelayMs: 5,
    deviceDelayMs: 1,
  };
  const first = new WritingSync(options);
  const second = new WritingSync(options);
  first.load();
  second.load();
  const a = newWritingEntryId();
  const b = newWritingEntryId();
  first.edit(a, text("Written in the first tab"));
  await first.whenIdle();
  second.edit(b, text("Written in the second tab"));
  await second.whenIdle();
  first.edit(a, text("Written in the first tab, then more"));
  await first.whenIdle();
  assert.deepEqual(
    device
      .stored()
      .map((draft) => draft.content.body)
      .sort(),
    ["Written in the first tab, then more", "Written in the second tab"],
  );
});

test("a title or page change saves like any other change", async () => {
  const calls: WritingContent[] = [];
  const device = fakeDevice();
  const sync = new WritingSync({
    transport: async (id, content, baseRevision) => {
      calls.push(content);
      return {
        kind: "saved",
        entry: {
          id,
          title: content.title,
          projectId: null,
          position: 0,
          synopsis: "",
          status: "",
          preview: "",
          wordCount: 0,
          revision: baseRevision + 1,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        },
      };
    },
    device: device.device,
    online: () => true,
    saveDelayMs: 1,
    deviceDelayMs: 1,
  });
  const id = newWritingEntryId();
  sync.edit(id, { title: "Harmattan", body: "", document: null });
  await sync.whenIdle();
  sync.edit(id, { title: "Harmattan", body: "", document: '{"pages":2}' });
  await sync.whenIdle();
  assert.deepEqual(
    calls.map((call) => [call.title, call.document]),
    [
      ["Harmattan", null],
      ["Harmattan", '{"pages":2}'],
    ],
  );
});

test("drafts kept before pages existed still open", () => {
  const id = newWritingEntryId();
  const stored = [
    {
      id,
      body: "Old draft",
      baseRevision: 0,
      updatedAt: new Date().toISOString(),
    },
  ];
  const original = globalThis.window;
  const storage = new Map([
    ["key", JSON.stringify({ version: 1, drafts: stored })],
  ]);
  Object.assign(globalThis, {
    window: {
      localStorage: { getItem: (key: string) => storage.get(key) ?? null },
    },
  });
  try {
    const drafts = browserWritingDeviceStore("key").read();
    assert.deepEqual(drafts[0]?.content, {
      title: "",
      body: "Old draft",
      document: null,
    });
  } finally {
    Object.assign(globalThis, { window: original });
  }
});
