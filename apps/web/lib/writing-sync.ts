import {
  isWritingEntryId,
  newWritingEntryId,
  type WritingEntry,
  type WritingEntrySummary,
} from "./writing.ts";

/**
 * Keeps the writing room's text safe between the keyboard and the account.
 *
 * Every change is first kept as a draft on the device, then saved to the
 * account. A draft is removed only once the account has confirmed that exact
 * text. When the account refuses text because the entry changed or was deleted
 * elsewhere, the text moves to a new entry instead of being dropped, so no
 * device ever overwrites another and no words are lost.
 */

export type WritingDraft = {
  id: string;
  body: string;
  /** The account revision this text was written on; 0 for an entry not yet saved. */
  baseRevision: number;
  updatedAt: string;
};

export type WritingSaveOutcome =
  | { kind: "saved"; entry: WritingEntrySummary }
  | { kind: "conflict"; current: WritingEntry }
  | { kind: "not-found" }
  | { kind: "unavailable" }
  | { kind: "signed-out" }
  /** The account will refuse this text however often it is sent. */
  | { kind: "rejected"; message: string }
  /** A network or server failure that may pass. */
  | { kind: "failed" };

export type WritingTransport = (
  id: string,
  body: string,
  baseRevision: number,
  options: { keepalive: boolean },
) => Promise<WritingSaveOutcome>;

export type WritingDeviceStore = {
  read(): WritingDraft[];
  /** False when the device could not keep the drafts (storage full or blocked). */
  write(drafts: WritingDraft[]): boolean;
};

export type WritingAccountState =
  "ok" | "offline" | "retrying" | "unavailable" | "signed-out";

export type WritingSyncSnapshot = Readonly<{
  account: WritingAccountState;
  /** Entries with text the account has not confirmed yet. */
  pending: readonly string[];
  saving: readonly string[];
  rejected: Readonly<Record<string, string>>;
  /** False when the last attempt to keep drafts on this device failed. */
  device: boolean;
}>;

export type WritingFork = {
  from: string;
  to: string;
  reason: "conflict" | "not-found";
  current?: WritingEntry;
};

export type WritingSyncOptions = {
  transport: WritingTransport;
  device: WritingDeviceStore;
  onSaved?: (entry: WritingEntrySummary) => void;
  onForked?: (fork: WritingFork) => void;
  online?: () => boolean;
  now?: () => number;
  /** Quiet time after the last keystroke before saving. */
  saveDelayMs?: number;
  /** Longest wait while someone keeps typing. */
  maxWaitMs?: number;
  deviceDelayMs?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
};

type Timer = ReturnType<typeof setTimeout>;

export class WritingSync {
  private readonly drafts = new Map<string, WritingDraft>();
  private readonly confirmed = new Map<
    string,
    { body: string; revision: number }
  >();
  private readonly inflight = new Map<string, Promise<void>>();
  private readonly timers = new Map<string, Timer>();
  private readonly firstPending = new Map<string, number>();
  private readonly retryDelay = new Map<string, number>();
  private readonly rejected = new Map<string, string>();
  private readonly discarded = new Set<string>();
  /** Entries this room has loaded or changed; other drafts on the device belong to other tabs. */
  private readonly touched = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private deviceTimer: Timer | undefined;
  private deviceOk = true;
  private halted: "unavailable" | "signed-out" | null = null;
  private snap: WritingSyncSnapshot;
  private handlers: Pick<WritingSyncOptions, "onSaved" | "onForked">;
  private readonly options: Required<
    Omit<WritingSyncOptions, "onSaved" | "onForked">
  > &
    Pick<WritingSyncOptions, "onSaved" | "onForked">;

  constructor(options: WritingSyncOptions) {
    this.options = {
      online: () =>
        typeof navigator === "undefined" ? true : navigator.onLine,
      now: () => Date.now(),
      saveDelayMs: 1_000,
      maxWaitMs: 4_000,
      deviceDelayMs: 300,
      retryBaseMs: 2_000,
      retryMaxMs: 30_000,
      ...options,
    };
    this.handlers = { onSaved: options.onSaved, onForked: options.onForked };
    this.snap = this.computeSnapshot();
  }

  /** Replaces the save and fork handlers; returns a function that removes them. */
  listen(handlers: Pick<WritingSyncOptions, "onSaved" | "onForked">) {
    this.handlers = handlers;
    return () => {
      if (this.handlers === handlers) this.handlers = {};
    };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  snapshot = () => this.snap;

  /** Reads drafts this device kept, newest first. Call once, before editing. */
  load(): WritingDraft[] {
    for (const draft of this.options.device.read()) {
      if (isWritingEntryId(draft.id) && !this.drafts.has(draft.id)) {
        this.drafts.set(draft.id, draft);
        this.touched.add(draft.id);
      }
    }
    this.emit();
    return [...this.drafts.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  /** Records text the account already holds, such as an entry just opened. */
  adopt(entry: { id: string; body: string; revision: number }) {
    this.confirmed.set(entry.id, {
      body: entry.body,
      revision: entry.revision,
    });
    const draft = this.drafts.get(entry.id);
    if (draft && draft.body === entry.body) {
      this.drafts.delete(entry.id);
      this.persistSoon();
    }
    this.emit();
  }

  draft(id: string): WritingDraft | undefined {
    return this.drafts.get(id);
  }

  /** Whether the account holds this entry, as far as this device knows. */
  saved(id: string): boolean {
    return this.confirmed.has(id);
  }

  /** Text that is neither confirmed by the account nor kept on this device. */
  unprotected(): boolean {
    return !this.deviceOk && this.drafts.size > 0;
  }

  edit(id: string, body: string) {
    if (this.discarded.has(id)) return;
    this.touched.add(id);
    const confirmed = this.confirmed.get(id);
    const existing = this.drafts.get(id);
    const baseRevision = existing?.baseRevision ?? confirmed?.revision ?? 0;
    const unchanged = confirmed
      ? confirmed.body === body
      : baseRevision === 0 && body.trim() === "";
    if (unchanged) {
      if (existing) {
        this.drafts.delete(id);
        this.clearTimer(id);
        this.firstPending.delete(id);
        this.persistSoon();
        this.emit();
      }
      return;
    }
    // Text over the limit is kept whole; the account refuses it with a reason.
    this.drafts.set(id, {
      id,
      body,
      baseRevision,
      updatedAt: new Date(this.options.now()).toISOString(),
    });
    this.persistSoon();
    this.schedulePush(id);
    this.emit();
  }

  /** Saves everything now, for example when the page is being hidden. */
  flush({ keepalive = false }: { keepalive?: boolean } = {}) {
    this.persistNow();
    for (const id of this.drafts.keys()) {
      this.clearTimer(id);
      void this.push(id, keepalive);
    }
  }

  /** Tries every waiting draft again, for example when the device is back online. */
  retryAll() {
    for (const id of this.drafts.keys()) {
      this.retryDelay.delete(id);
      this.clearTimer(id);
      void this.push(id);
    }
    this.emit();
  }

  /**
   * Stops saving an entry the writer is deleting. Waits for a save already on
   * its way, so a delete can never be overtaken by that save.
   */
  async discard(id: string): Promise<{ existsOnServer: boolean }> {
    this.discarded.add(id);
    this.touched.add(id);
    this.clearTimer(id);
    this.firstPending.delete(id);
    this.retryDelay.delete(id);
    this.rejected.delete(id);
    this.drafts.delete(id);
    this.persistNow();
    this.emit();
    await this.inflight.get(id);
    return { existsOnServer: this.confirmed.has(id) };
  }

  /** Re-reads the connection state, for example after the device goes offline. */
  refresh() {
    this.emit();
  }

  /** Undoes discard() when the delete did not go through. */
  restore(id: string) {
    this.discarded.delete(id);
  }

  /** Forgets an entry the account has deleted. */
  forget(id: string) {
    this.confirmed.delete(id);
  }

  /** Resolves once nothing is scheduled or on its way. */
  async whenIdle() {
    while (this.inflight.size || this.timers.size || this.deviceTimer) {
      await Promise.all(this.inflight.values());
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }

  dispose() {
    for (const id of [...this.timers.keys()]) this.clearTimer(id);
    if (this.deviceTimer) clearTimeout(this.deviceTimer);
    this.deviceTimer = undefined;
    this.listeners.clear();
  }

  private schedulePush(id: string) {
    if (this.halted) return;
    // A failed save keeps its back-off; typing does not hurry the retry.
    if (this.retryDelay.has(id) && this.timers.has(id)) return;
    this.clearTimer(id);
    const now = this.options.now();
    const first = this.firstPending.get(id) ?? now;
    this.firstPending.set(id, first);
    const delay = Math.max(
      0,
      Math.min(this.options.saveDelayMs, first + this.options.maxWaitMs - now),
    );
    this.timers.set(
      id,
      setTimeout(() => {
        this.timers.delete(id);
        void this.push(id);
      }, delay),
    );
  }

  private push(id: string, keepalive = false): Promise<void> {
    if (this.halted) return Promise.resolve();
    const running = this.inflight.get(id);
    if (running) return running;
    const draft = this.drafts.get(id);
    if (!draft) return Promise.resolve();
    if (!this.options.online()) {
      this.emit();
      return Promise.resolve();
    }
    this.firstPending.delete(id);
    const sent = { body: draft.body, baseRevision: draft.baseRevision };
    const run = (async () => {
      let outcome: WritingSaveOutcome;
      try {
        outcome = await this.options.transport(
          id,
          sent.body,
          sent.baseRevision,
          {
            keepalive,
          },
        );
      } catch {
        outcome = { kind: "failed" };
      }
      this.inflight.delete(id);
      this.handle(id, sent, outcome);
    })();
    this.inflight.set(id, run);
    this.emit();
    return run;
  }

  private handle(
    id: string,
    sent: { body: string; baseRevision: number },
    outcome: WritingSaveOutcome,
  ) {
    if (outcome.kind !== "failed") this.retryDelay.delete(id);
    switch (outcome.kind) {
      case "saved": {
        this.rejected.delete(id);
        this.confirmed.set(id, {
          body: sent.body,
          revision: outcome.entry.revision,
        });
        if (this.discarded.has(id)) break;
        const draft = this.drafts.get(id);
        if (draft && draft.body === sent.body) {
          this.drafts.delete(id);
        } else if (draft) {
          this.drafts.set(id, {
            ...draft,
            baseRevision: outcome.entry.revision,
          });
          this.schedulePush(id);
        }
        this.persistSoon();
        this.handlers.onSaved?.(outcome.entry);
        break;
      }
      case "conflict":
      case "not-found": {
        if (outcome.kind === "conflict") {
          this.confirmed.set(id, {
            body: outcome.current.body,
            revision: outcome.current.revision,
          });
        } else {
          this.confirmed.delete(id);
        }
        const draft = this.drafts.get(id);
        if (this.discarded.has(id) || !draft) break;
        const to = newWritingEntryId();
        this.touched.add(to);
        this.drafts.delete(id);
        this.clearTimer(id);
        this.drafts.set(to, {
          id: to,
          body: draft.body,
          baseRevision: 0,
          updatedAt: new Date(this.options.now()).toISOString(),
        });
        this.persistNow();
        this.handlers.onForked?.({
          from: id,
          to,
          reason: outcome.kind,
          current: outcome.kind === "conflict" ? outcome.current : undefined,
        });
        void this.push(to);
        break;
      }
      case "unavailable":
      case "signed-out":
        this.halted = outcome.kind;
        for (const timer of [...this.timers.keys()]) this.clearTimer(timer);
        break;
      case "rejected":
        this.rejected.set(id, outcome.message);
        break;
      case "failed": {
        if (this.discarded.has(id) || !this.drafts.has(id)) break;
        const previous = this.retryDelay.get(id);
        const delay = previous
          ? Math.min(previous * 2, this.options.retryMaxMs)
          : this.options.retryBaseMs;
        this.retryDelay.set(id, delay);
        this.clearTimer(id);
        this.timers.set(
          id,
          setTimeout(() => {
            this.timers.delete(id);
            void this.push(id);
          }, delay),
        );
        break;
      }
    }
    this.emit();
  }

  private clearTimer(id: string) {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
  }

  private persistSoon() {
    if (this.deviceTimer) clearTimeout(this.deviceTimer);
    this.deviceTimer = setTimeout(() => {
      this.deviceTimer = undefined;
      this.persistNow();
    }, this.options.deviceDelayMs);
  }

  private persistNow() {
    if (this.deviceTimer) clearTimeout(this.deviceTimer);
    this.deviceTimer = undefined;
    // Keep drafts another tab wrote since this room loaded; replace only our own.
    const others = this.options.device
      .read()
      .filter((draft) => !this.touched.has(draft.id));
    const ok = this.options.device.write([...others, ...this.drafts.values()]);
    if (ok !== this.deviceOk) {
      this.deviceOk = ok;
      this.emit();
    }
  }

  private computeSnapshot(): WritingSyncSnapshot {
    const account: WritingAccountState = this.halted
      ? this.halted
      : !this.options.online()
        ? "offline"
        : this.retryDelay.size
          ? "retrying"
          : "ok";
    return {
      account,
      pending: [...this.drafts.keys()],
      saving: [...this.inflight.keys()],
      rejected: Object.fromEntries(this.rejected),
      device: this.deviceOk,
    };
  }

  private emit() {
    const next = this.computeSnapshot();
    const previous = this.snap;
    const same =
      previous.account === next.account &&
      previous.device === next.device &&
      previous.pending.join() === next.pending.join() &&
      previous.saving.join() === next.saving.join() &&
      JSON.stringify(previous.rejected) === JSON.stringify(next.rejected);
    if (same) return;
    this.snap = next;
    for (const listener of this.listeners) listener();
  }
}

/** Drafts kept in this browser, separately for each account. */
export function browserWritingDeviceStore(key: string): WritingDeviceStore {
  return {
    read() {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        const drafts =
          parsed && typeof parsed === "object"
            ? Reflect.get(parsed, "drafts")
            : [];
        if (!Array.isArray(drafts)) return [];
        return drafts.filter(
          (draft): draft is WritingDraft =>
            draft &&
            isWritingEntryId(draft.id) &&
            typeof draft.body === "string" &&
            Number.isSafeInteger(draft.baseRevision) &&
            draft.baseRevision >= 0 &&
            typeof draft.updatedAt === "string",
        );
      } catch {
        return [];
      }
    },
    write(drafts) {
      try {
        if (drafts.length) {
          window.localStorage.setItem(
            key,
            JSON.stringify({ version: 1, drafts }),
          );
        } else {
          window.localStorage.removeItem(key);
        }
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** keepalive requests are limited in size, so only short text uses them. */
const KEEPALIVE_LIMIT = 60_000;

export const httpWritingTransport: WritingTransport = async (
  id,
  body,
  baseRevision,
  { keepalive },
) => {
  let response: Response;
  try {
    response = await fetch(`/api/me/writing/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, baseRevision }),
      cache: "no-store",
      keepalive: keepalive && body.length < KEEPALIVE_LIMIT,
    });
  } catch {
    return { kind: "failed" };
  }
  const result: unknown = await response.json().catch(() => ({}));
  const field = (name: string) =>
    result && typeof result === "object"
      ? Reflect.get(result, name)
      : undefined;
  if (response.ok && field("entry")) {
    return { kind: "saved", entry: field("entry") as WritingEntrySummary };
  }
  if (response.status === 409 && field("current")) {
    return { kind: "conflict", current: field("current") as WritingEntry };
  }
  if (response.status === 404) return { kind: "not-found" };
  if (response.status === 401) return { kind: "signed-out" };
  if (response.status === 503 && field("unavailable"))
    return { kind: "unavailable" };
  if (response.status === 400 || response.status === 413) {
    const message = field("error");
    return {
      kind: "rejected",
      message:
        typeof message === "string"
          ? message
          : "This entry could not be saved.",
    };
  }
  return { kind: "failed" };
};
