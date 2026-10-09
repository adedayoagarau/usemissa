import assert from "node:assert/strict";
import { test } from "node:test";
import { handleReadAloud, readAloudGlobalCharacterLimit, type ReadAloudDependencies } from "./writing-read-aloud-server";
import { parseReadAloudInput, READ_ALOUD_MONTHLY_CHARACTERS, type ReadAloudPlan } from "./writing-read-aloud";

function request(body: unknown = { text: "A draft to listen to." }, headers: Record<string, string> = {}) {
  return new Request("https://missa.test/api/me/writing/read-aloud", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
}
function fixture(overrides: Partial<ReadAloudDependencies> = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const reservations: number[] = [];
  const deps: ReadAloudDependencies = {
    account: async () => "writer-1", plan: async () => "plus", key: () => "test-key-not-real",
    reserve: async (_, characters) => { reservations.push(characters); return 0; },
    fetch: async (url, init) => { calls.push({ url: String(url), init }); return new Response(new Uint8Array([73, 68, 51]), { headers: { "Content-Type": "audio/mpeg" } }); },
    ...overrides,
  };
  return { deps, calls, reservations };
}

test("session and authoritative plan gate reject unavailable access without generation", async () => {
  for (const [overrides, status] of [[{ account: async () => null }, 401], [{ plan: async () => null }, 503]] as const) {
    const f = fixture(overrides);
    assert.equal((await handleReadAloud(request(), f.deps)).status, status);
    assert.equal(f.calls.length, 0); assert.equal(f.reservations.length, 0);
  }
});
test("Free, Plus and Pro generation uses the server plan and their distinct allowances", async () => {
  assert.deepEqual(READ_ALOUD_MONTHLY_CHARACTERS, { free: 5_000, plus: 100_000, pro: null });
  for (const plan of ["free", "plus", "pro"] as const) {
    let reservedPlan: ReadAloudPlan | undefined;
    const f = fixture({ plan: async () => plan, reserve: async (_, __, currentPlan) => { reservedPlan = currentPlan; return 0; } });
    // Client-supplied plan has no authority.
    assert.equal((await handleReadAloud(request({ text: "Draft", plan: "pro" }), f.deps)).status, 200);
    assert.equal(reservedPlan, plan);
    assert.equal(f.calls.length, 1);
  }
});
test("input validates text, voice, speed and real bytes, including absent content-length", async () => {
  for (const body of [{ text: "" }, { text: "x".repeat(4_001) }, { text: "draft", voice: "file://secret" }, { text: "draft", speed: 0 }, { text: "draft", speed: "1" }, { text: "x".repeat(25_000) }]) {
    const f = fixture();
    assert.equal((await handleReadAloud(request(body), f.deps)).status, 400);
    assert.equal(f.calls.length, 0); assert.equal(f.reservations.length, 0);
  }
  assert.equal(parseReadAloudInput({ text: "draft", speed: NaN }), null);
  const f = fixture();
  assert.equal((await handleReadAloud(request({ text: "draft" }, { Origin: "https://elsewhere.test" }), f.deps)).status, 403);
});
test("missing configuration and failed shared limits fail closed", async () => {
  for (const overrides of [{ key: () => undefined }, { reserve: async () => null }, { reserve: async () => { throw Error("redis down"); } }]) {
    const f = fixture(overrides);
    assert.equal((await handleReadAloud(request(), f.deps)).status, 503);
    assert.equal(f.calls.length, 0);
  }
  const f = fixture({ reserve: async () => 125 });
  const response = await handleReadAloud(request(), f.deps);
  assert.equal(response.status, 429); assert.equal(response.headers.get("Retry-After"), "125"); assert.equal(f.calls.length, 0);
  const global = fixture({ reserve: async () => -125 });
  const unavailable = await handleReadAloud(request(), global.deps);
  assert.equal(unavailable.status, 503);
  assert.ok(!(await unavailable.text()).includes("You have reached"));
  assert.equal(global.calls.length, 0);
});
test("global launch budget accepts bounded positive configuration", () => {
  assert.equal(readAloudGlobalCharacterLimit("100000"), 100_000);
  for (const value of [undefined, "0", "-1", "NaN", "1.5", "1000000001"]) assert.equal(readAloudGlobalCharacterLimit(value), 6_000_000);
});
test("successful explicit generation returns private audio, fixes provider and model", async () => {
  const f = fixture();
  const response = await handleReadAloud(request({ text: "My draft", voice: "bf_emma", speed: 1.25 }), f.deps);
  assert.equal(response.status, 200); assert.equal(response.headers.get("Content-Type"), "audio/mpeg");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [73, 68, 51]);
  assert.deepEqual(f.reservations, [8]);
  assert.equal(f.calls[0].url, "https://api.deepinfra.com/v1/openai/audio/speech");
  assert.deepEqual(JSON.parse(String(f.calls[0].init?.body)), { model: "hexgrad/Kokoro-82M", input: "My draft", voice: "bf_emma", speed: 1.25, response_format: "mp3" });
  assert.equal(f.calls[0].init?.redirect, "error");
  assert.ok(f.calls[0].init?.signal);
});
test("provider failures never leak messages or credentials; invalid and oversized audio is rejected", async () => {
  for (const fetcher of [
    async () => new Response("secret provider diagnostics", { status: 500 }),
    async () => { throw new Error("test-key-not-real"); },
    async () => new Response("bad audio", { headers: { "Content-Type": "text/html" } }),
    async () => new Response("huge", { headers: { "Content-Type": "audio/mpeg", "Content-Length": "8000001" } }),
    async () => new Response(new Uint8Array(), { headers: { "Content-Type": "audio/mpeg" } }),
  ]) {
    const f = fixture({ fetch: fetcher });
    const response = await handleReadAloud(request(), f.deps);
    assert.equal(response.status, 502);
    const body = await response.text();
    assert.ok(!body.includes("secret")); assert.ok(!body.includes("test-key"));
  }
});
