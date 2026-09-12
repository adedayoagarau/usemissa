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

test("anonymous page views cover every nested public beta surface", async () => {
  for (const path of [
    "/discover/emerging-writers-artists",
    "/journal/cincinnati-review",
    "/rankings/magazines",
  ]) {
    const response = await POST(
      new Request("http://localhost/api/analytics/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventName: "page_view", path }),
      }),
    );
    assert.equal(response.status, 202, path);
  }
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

test("unregistered analytics events are rejected", async () => {
  const response = await POST(
    new Request("http://localhost/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventName: "public.unplanned_click", path: "/" }),
    }),
  );
  assert.equal(response.status, 400);
});

test("analytics properties reject private content", async () => {
  const response = await POST(
    new Request("http://localhost/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName: "public.opportunity_view",
        path: "/opportunities/opp_1",
        properties: { opportunityId: "opp_1", email: "private@example.test" },
      }),
    }),
  );
  assert.equal(response.status, 400);
});

test("registered events require their tracking-plan properties", async () => {
  const response = await POST(
    new Request("http://localhost/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName: "public.opportunity_view",
        path: "/opportunities/opp_1",
        properties: {},
      }),
    }),
  );
  assert.equal(response.status, 400);
});

test("registered events reject properties outside their tracking plan", async () => {
  const response = await POST(
    new Request("http://localhost/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName: "public.opportunity_view",
        path: "/opportunities/opp_1",
        properties: { opportunityId: "opp_1", arbitrary_label: "not planned" },
      }),
    }),
  );
  assert.equal(response.status, 400);
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
