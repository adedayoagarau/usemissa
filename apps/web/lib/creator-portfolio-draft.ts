/** Device-local drafts only. Keys are scoped by the authenticated account. */
export async function portfolioDraft<T>(
  key: string,
  value?: T,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
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
