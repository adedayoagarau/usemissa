import "server-only";
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { getSessionAccount } from "@/lib/auth";
import { readAloudPlan } from "@/lib/writing-plan-access";
import { parseReadAloudInput, READ_ALOUD_MONTHLY_CHARACTERS, type ReadAloudPlan } from "@/lib/writing-read-aloud";

const PRIVATE = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const MAX_BODY_BYTES = 24_000;
const MAX_AUDIO_BYTES = 8_000_000;
// Reserve all budgets atomically before inference. Failed attempts stay charged
// conservatively: a disconnected client can still incur provider charges.
export const READ_ALOUD_QUOTA_SCRIPT = `
for i = 1, #KEYS do
  local count = tonumber(redis.call('GET', KEYS[i]) or '0')
  local limit = tonumber(ARGV[(i-1)*3+2])
  if limit >= 0 and count + tonumber(ARGV[(i-1)*3+1]) > limit then return i end
end
for i = 1, #KEYS do
  local count = redis.call('INCRBY', KEYS[i], ARGV[(i-1)*3+1])
  if count == tonumber(ARGV[(i-1)*3+1]) then redis.call('EXPIRE', KEYS[i], ARGV[(i-1)*3+3]) end
end
return 0`;

export type ReadAloudDependencies = {
  account: (request: Request) => Promise<string | null>;
  plan: (accountId: string) => Promise<ReadAloudPlan | null>;
  key: () => string | undefined;
  /** 0 reserved; positive personal retry; negative global retry; null unavailable. */
  reserve: (accountId: string, characters: number, plan: ReadAloudPlan) => Promise<number | null>;
  fetch: typeof fetch;
};

export function readAloudGlobalCharacterLimit(value: string | undefined): number {
  if (!value) return 6_000_000;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 1_000_000_000 ? parsed : 6_000_000;
}

function json(error: string, status: number, extra: Record<string, unknown> = {}, retryAfter?: number) {
  return Response.json({ error, ...extra }, { status, headers: { ...PRIVATE, ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) } });
}

async function boundedBytes(response: Response | Request, limit: number): Promise<Uint8Array> {
  if (Number(response.headers.get("content-length") ?? 0) > limit || !response.body) throw new Error("Body unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) throw new Error("Body too large");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

/** No process-local fallback: billable inference needs a shared, durable budget. */
async function reserve(accountId: string, characters: number, plan: ReadAloudPlan): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  const now = Date.now();
  const date = new Date(now);
  const month = date.toISOString().slice(0, 7);
  const nextMonth = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  const monthSeconds = Math.ceil((nextMonth - now) / 1_000);
  const window = Math.floor(now / 900_000);
  const windowSeconds = Math.ceil(((window + 1) * 900_000 - now) / 1_000);
  const account = createHash("sha256").update(accountId).digest("hex");
  const result = Number(await redis.eval(READ_ALOUD_QUOTA_SCRIPT,
    [`missa:read-aloud:account:${account}:${month}`, `missa:read-aloud:global:${month}`, `missa:read-aloud:requests:${account}:${window}`],
    [characters, READ_ALOUD_MONTHLY_CHARACTERS[plan] ?? -1, monthSeconds + 1, characters, readAloudGlobalCharacterLimit(process.env.MISSA_READ_ALOUD_GLOBAL_MONTHLY_CHARACTERS), monthSeconds + 1, 1, 20, windowSeconds + 1]));
  if (!Number.isInteger(result) || result < 0 || result > 3) return null;
  return result === 0 ? 0 : result === 3 ? windowSeconds : result === 2 ? -monthSeconds : monthSeconds;
}

const dependencies: ReadAloudDependencies = {
  account: async (request) => (await getSessionAccount(request.headers.get("cookie")))?.account.id ?? null,
  plan: readAloudPlan,
  key: () => process.env.DEEPINFRA_API_KEY?.trim(),
  reserve,
  fetch: (...args) => fetch(...args),
};

export async function handleReadAloud(request: Request, deps: ReadAloudDependencies = dependencies): Promise<Response> {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return json("This request must come from Missa.", 403);
    const accountId = await deps.account(request);
    if (!accountId) return json("Not authenticated", 401);
    const plan = await deps.plan(accountId);
    if (!plan) return json("Read aloud is temporarily unavailable. Try again later.", 503, { unavailable: true });
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json("Send a text passage as JSON.", 400);
    let input;
    try { input = parseReadAloudInput(JSON.parse(new TextDecoder().decode(await boundedBytes(request, MAX_BODY_BYTES)))); }
    catch { return json("Choose a passage of up to 4,000 characters.", 400); }
    if (!input) return json("Choose a passage of up to 4,000 characters and a listed voice.", 400);
    const key = deps.key();
    if (!key) return json("Read aloud is not available yet. Try again later.", 503, { unavailable: true });
    let budget;
    try { budget = await deps.reserve(accountId, input.text.length, plan); }
    catch { budget = null; }
    if (budget === null) return json("Read aloud is temporarily unavailable. Try again later.", 503, { unavailable: true });
    if (budget < 0) return json("Read aloud is temporarily unavailable. Try again later.", 503, { unavailable: true }, -budget);
    if (budget > 0) return json(plan === "pro" ? "Please wait before requesting more audio." : "You have reached a read-aloud limit. Try again later.", 429, {}, budget);
    const response = await deps.fetch("https://api.deepinfra.com/v1/openai/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "hexgrad/Kokoro-82M", input: input.text, voice: input.voice, speed: input.speed, response_format: "mp3" }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) { await response.body?.cancel(); return json("We could not prepare the audio. Try again.", 502); }
    const type = response.headers.get("content-type")?.split(";")[0];
    if (type !== "audio/mpeg" && type !== "audio/mp3") { await response.body?.cancel(); return json("We could not prepare the audio. Try again.", 502); }
    const audio = await boundedBytes(response, MAX_AUDIO_BYTES);
    if (!audio.length) return json("We could not prepare the audio. Try again.", 502);
    return new Response(audio as BodyInit, { headers: { ...PRIVATE, "Content-Type": "audio/mpeg", "Content-Length": String(audio.length) } });
  } catch {
    // Never return provider errors or log the writer's text or credentials.
    return json("We could not prepare the audio. Try again.", 502);
  }
}
