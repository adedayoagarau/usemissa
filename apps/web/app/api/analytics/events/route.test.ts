import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "./route";

test("anonymous page views are accepted without exposing private event writes", async () => {
  const response = await POST(
    new Request("http://localhost/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventName: "page_view", path: "/" }),
    }),
  );
  assert.equal(response.status, 202);
});

test("anonymous visitors cannot write private analytics event names", async () => {
  const response = await POST(
    new Request("http://localhost/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventName: "admin.secret_event", path: "/admin" }),
    }),
  );
  assert.equal(response.status, 401);
});

test("anonymous page views cannot claim private paths", async () => {
  const response = await POST(
    new Request("http://localhost/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventName: "page_view", path: "/admin" }),
    }),
  );
  assert.equal(response.status, 403);
});
