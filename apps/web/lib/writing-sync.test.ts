import assert from "node:assert/strict";
import { test } from "node:test";
import { countWords, newWritingEntryId, writingPreview } from "./writing.ts";
import {
  WritingSync,
  type WritingDeviceStore,
  type WritingDraft,
  type WritingFork,
  type WritingSaveOutcome,
  type WritingTransport,
} from "./writing-sync.ts";

/** An account that follows the same revision rules as WritingRepository. */
function fakeAccount() {
  const entries = new Map<string, { body: string; revision: number }>();
  const calls: Array<{ id: string; body: string; baseRevision: number }> = [];
  let mode: "ok" | "down" | "unavailable" | "signed-out" = "ok";
  const transport: WritingTransport = async (id, body, baseRevision) => {
    calls.push({ id, body, baseRevision });
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (mode === "down") return { kind: "failed" };
    if (mode === "unavailable") return { kind: "unavailable" };
    if (mode === "signed-out") return { kind: "signed-out" };
    const stored = entries.get(id);
    const summary = (revision: number): WritingSaveOutcome => ({
      kind: "saved",
      entry: {
        id,
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
        body: stored.body,
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
  sync.edit(id, "The first line");
  assert.deepEqual(sync.snapshot().pending, [id]);
  await sync.whenIdle();
  assert.equal(account.entries.get(id)?.body, "The first line");
  assert.deepEqual(device.stored(), []);
  assert.deepEqual(sync.snapshot().pending, []);

  sync.edit(id, "The first line, and a second");
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
  sync.edit(id, "   \n");
  await sync.whenIdle();
  sync.edit(id, "x");
  sync.edit(id, "");
  await sync.whenIdle();
  assert.equal(account.calls.length, 0);
  assert.deepEqual(sync.snapshot().pending, []);
});

test("typing while a save is on its way saves the newest text on the right revision", async () => {
  const { account, sync, forks } = setup();
  const id = newWritingEntryId();
  sync.edit(id, "One");
  await new Promise((resolve) => setTimeout(resolve, 6));
  sync.edit(id, "One two");
  sync.edit(id, "One two three");
  await sync.whenIdle();
  assert.equal(account.entries.get(id)?.body, "One two three");
  assert.deepEqual(forks, []);
});

test("while the account cannot be reached the text stays on the device and is retried", async () => {
  const { account, device, sync } = setup();
  account.setMode("down");
  const id = newWritingEntryId();
  sync.edit(id, "Written on a train");
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(sync.snapshot().account, "retrying");
  assert.equal(device.stored()[0]?.body, "Written on a train");
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
  sync.edit(id, "No signal");
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
        body: "Left from yesterday",
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
  sync.edit(id, "Shared start");
  await sync.whenIdle();
  account.entries.set(id, { body: "Shared start, laptop", revision: 2 });

  sync.edit(id, "Shared start, phone");
  await sync.whenIdle();
  assert.equal(account.entries.get(id)?.body, "Shared start, laptop");
  assert.equal(forks.length, 1);
  assert.equal(forks[0]?.reason, "conflict");
  assert.equal(forks[0]?.current?.body, "Shared start, laptop");
  assert.equal(account.entries.get(forks[0]!.to)?.body, "Shared start, phone");
});

test("when another device deleted the entry, this device's text becomes a new entry", async () => {
  const { account, sync, forks } = setup();
  const id = newWritingEntryId();
  sync.edit(id, "Keep me");
  await sync.whenIdle();
  account.entries.delete(id);
  sync.edit(id, "Keep me, please");
  await sync.whenIdle();
  assert.equal(forks[0]?.reason, "not-found");
  assert.equal(account.entries.get(forks[0]!.to)?.body, "Keep me, please");
});

test("without account saving, text stays on the device and nothing more is sent", async () => {
  const { account, device, sync } = setup();
  account.setMode("unavailable");
  const id = newWritingEntryId();
  sync.edit(id, "Only here");
  await sync.whenIdle();
  sync.edit(id, "Only here, still");
  await sync.whenIdle();
  assert.equal(sync.snapshot().account, "unavailable");
  assert.equal(account.calls.length, 1);
  assert.equal(device.stored()[0]?.body, "Only here, still");
});

test("signed out, text stays on the device until the next visit", async () => {
  const { account, device, sync } = setup();
  account.setMode("signed-out");
  const id = newWritingEntryId();
  sync.edit(id, "Session ended");
  await sync.whenIdle();
  assert.equal(sync.snapshot().account, "signed-out");
  assert.equal(device.stored()[0]?.body, "Session ended");
});

test("a broken device store is reported so the page can warn before closing", async () => {
  const { account, device, sync } = setup();
  account.setMode("down");
  device.breakStorage();
  const id = newWritingEntryId();
  sync.edit(id, "Nowhere safe yet");
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
  sync.edit(id, "About to go");
  await new Promise((resolve) => setTimeout(resolve, 6));
  const { existsOnServer } = await sync.discard(id);
  assert.equal(existsOnServer, true);
  assert.ok(account.entries.has(id));
  sync.edit(id, "Typed after delete");
  await sync.whenIdle();
  assert.equal(account.entries.get(id)?.body, "About to go");
});

test("a never-saved entry is discarded without asking the account", async () => {
  const { account, sync } = setup();
  const id = newWritingEntryId();
  sync.edit(id, "Draft only");
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
  first.edit(a, "Written in the first tab");
  await first.whenIdle();
  second.edit(b, "Written in the second tab");
  await second.whenIdle();
  first.edit(a, "Written in the first tab, then more");
  await first.whenIdle();
  assert.deepEqual(
    device
      .stored()
      .map((draft) => draft.body)
      .sort(),
    ["Written in the first tab, then more", "Written in the second tab"],
  );
});
