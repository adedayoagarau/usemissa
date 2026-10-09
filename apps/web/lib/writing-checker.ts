/** Offsets are UTF-16 indices, matching JavaScript strings and textarea selection. */
export type WritingCheck = {
  start: number;
  end: number;
  message: string;
  replacements: string[];
  rule: string;
  hash?: string;
};

export type WritingCheckPreferences = { dialect: number; words: string[]; disabledRules: string[]; ignoredHashes: string[] };

export type WritingChecker = {
  check(text: string, preferences?: WritingCheckPreferences): Promise<WritingCheck[]>;
  dispose(): void;
};

type WorkerResponse =
  { id: number; checks: WritingCheck[] } | { id: number; error: string };

/** Create only on the client, when the writer opens the checker. */
export async function createWritingChecker(): Promise<WritingChecker> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    throw new Error(
      "Writing checks require a browser with Web Worker support.",
    );
  }

  // The worker module and WASM are fetched only when the checker is opened.
  const worker = new Worker(
    new URL("/harper/2.10.0/checker-worker.js", window.location.origin),
    { type: "module", name: "missa-writing-checker" },
  );
  let disposed = false;
  let sequence = 0;
  const pending = new Map<
    number,
    {
      resolve: (checks: WritingCheck[]) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  const stop = (error: Error) => {
    if (disposed) return;
    disposed = true;
    worker.terminate();
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
  };

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    clearTimeout(request.timer);
    if ("error" in response) {
      const error = new Error(response.error);
      request.reject(error);
      stop(error);
    } else {
      request.resolve(response.checks);
    }
  };
  worker.onerror = (event) => {
    event.preventDefault();
    stop(new Error(event.message || "The writing checker could not start."));
  };
  worker.onmessageerror = () => {
    stop(new Error("The writing checker returned an unreadable result."));
  };

  const request = (kind: "setup" | "check", text = "", preferences?: WritingCheckPreferences) => {
    if (disposed)
      return Promise.reject(
        new Error("The writing checker has been disposed."),
      );
    const id = ++sequence;
    return new Promise<WritingCheck[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        stop(new Error("The writing checker timed out. Please try again."));
      }, 30_000);
      pending.set(id, { resolve, reject, timer });
      try {
        worker.postMessage({ id, kind, text, preferences });
      } catch (error) {
        stop(
          error instanceof Error
            ? error
            : new Error("The writing checker could not start."),
        );
      }
    });
  };

  await request("setup");
  return {
    check(text, preferences) {
      if (disposed)
        return Promise.reject(
          new Error("The writing checker has been disposed."),
        );
      return text ? request("check", text, preferences) : Promise.resolve([]);
    },
    dispose() {
      stop(new Error("The writing checker has been disposed."));
    },
  };
}
