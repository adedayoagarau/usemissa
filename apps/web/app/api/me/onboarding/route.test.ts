import assert from "node:assert/strict";
import test from "node:test";
import { GET, POST } from "./route";

test("GET /api/me/onboarding returns unauthenticated default when no session exists", async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.authenticated, false);
  assert.equal(data.status, "not_started");
  assert.equal(data.step, 0);
  assert.deepEqual(data.practices, []);
  assert.deepEqual(data.interests, []);
});

test("POST /api/me/onboarding rejects unauthenticated mutations", async () => {
  const response = await POST(
    new Request("http://localhost/api/me/onboarding", {
      method: "POST",
      body: JSON.stringify({ action: "skip" }),
      headers: { "content-type": "application/json" },
    })
  );
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.ok(data.error.includes("Unauthorized"));
});
