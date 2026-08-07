import assert from "node:assert/strict";
import test from "node:test";
import { GET, POST } from "./route";

test("chat history does not disclose data without a session", async () => {
  const response = await GET(new Request("http://localhost/api/me/chat"));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Not authenticated" });
});

test("chat turns require a session before reading the request body or database", async () => {
  const response = await POST(
    new Request("http://localhost/api/me/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Find grants" }),
      headers: { "content-type": "application/json" },
    }),
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Not authenticated" });
});
