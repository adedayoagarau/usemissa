/** Persists portfolio drafts to the server database with indexedDB local fallback. */
export async function portfolioDraft<T>(
  key: string,
  value?: T,
): Promise<T | undefined> {
  // Try server persistence first if in browser
  if (typeof window !== "undefined") {
    try {
      if (value === undefined) {
        const res = await fetch("/api/creator/portfolio-draft", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.draft) {
            // Also cache locally in indexedDB
            try { await localDraft(key, data.draft); } catch {}
            return data.draft as T;
          }
        }
      } else {
        fetch("/api/creator/portfolio-draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft: value }),
        }).catch(() => undefined);
      }
    } catch {
      // Server offline/unreachable: fall back to indexedDB
    }
  }

  return localDraft(key, value);
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
