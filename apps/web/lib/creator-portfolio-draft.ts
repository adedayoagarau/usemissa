import { portfolioSchema } from "./creator-portfolio-schema";
/** Account writes are confirmed before reporting success. Samples stay device-local. */
const revisions = new Map<string, number>();
const queues = new Map<string, Promise<unknown>>();
export function portfolioRevision(key: string) {
  return revisions.get(key) ?? 0;
}
export async function portfolioDraft<T>(
  key: string,
  value?: T,
): Promise<T | undefined> {
  if (key === "design-preview-only") return localDraft(key, value);
  if (value === undefined) {
    const res = await fetch("/api/creator/portfolio-draft", {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Could not load your account draft.");
    revisions.set(key, data.revision);
    const existing = data.draft ?? (await localDraft(key));
    if (!existing) return undefined;
    const upgraded = await upgradePortfolio(existing);
    if (JSON.stringify(upgraded) !== JSON.stringify(existing))
      await portfolioDraft(key, upgraded);
    try {
      await localDraft(key, upgraded);
    } catch {}
    return upgraded as T;
  }
  const previous = queues.get(key) ?? Promise.resolve();
  const task = previous
    .catch(() => undefined)
    .then(async () => {
      // Keep a recovery copy even when the network write fails.
      try {
        await localDraft(key, value);
      } catch {}
      const res = await fetch("/api/creator/portfolio-draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: value,
          revision: portfolioRevision(key),
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Could not save your account draft.");
      revisions.set(key, data.revision);
      return value;
    });
  queues.set(key, task);
  return task;
}

function localDraft<T>(key: string, value?: T): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(undefined);
      return;
    }
    const request = indexedDB.open("missa-portfolio-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(
        "drafts",
        value === undefined ? "readonly" : "readwrite",
      );
      const store = transaction.objectStore("drafts");
      const operation =
        value === undefined ? store.get(key) : store.put(value, key);
      transaction.oncomplete = () => {
        db.close();
        resolve(value === undefined ? operation.result : value);
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}

export function publicWebUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

async function upgradePortfolio(value: unknown) {
  const draft = structuredClone(value) as Record<string, unknown>;
  if (!draft.works && draft.work) draft.works = [draft.work];
  const upload = async (value: unknown) => {
    if (typeof value !== "string" || !value.startsWith("data:")) return value;
    const response = await fetch(value);
    const blob = await response.blob();
    const form = new FormData();
    form.set("file", blob, "portfolio-media");
    const res = await fetch("/api/creator/portfolio-media", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(
        data.error ||
          "Could not transfer your saved media. Your local draft is still intact.",
      );
    return data.url;
  };
  draft.photo = await upload(draft.photo);
  if (draft.book && typeof draft.book === "object") {
    const book = draft.book as Record<string, unknown>;
    book.cover = await upload(book.cover);
  }
  if (Array.isArray(draft.works))
    for (const work of draft.works) {
      work.image = await upload(work.image);
      work.audio = await upload(work.audio);
    }
  return portfolioSchema.parse(draft);
}
export async function importLocalPortfolio(key: string) {
  const local = await localDraft("design-preview-only");
  if (!local)
    throw new Error(
      "No preview draft was found on this device. Open this account in the browser where you built your preview.",
    );
  await portfolioDraft(key, await upgradePortfolio(local));
}
