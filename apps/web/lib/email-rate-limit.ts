const WINDOW_MS = 60 * 60_000;
const LIMIT = 3;
const history = new Map<string, number[]>();
export function consumeEmailLifecycleLimit(accountId: string): number | undefined {
  const now = Date.now(); const recent = (history.get(accountId) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= LIMIT) return Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0]!)) / 1000));
  recent.push(now); history.set(accountId, recent);
  if (history.size > 1_000) for (const [key, values] of history) if (!values.length || now - values[values.length - 1]! >= WINDOW_MS) history.delete(key);
  return undefined;
}
