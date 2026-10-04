import assert from "node:assert/strict";
import test from "node:test";
import { GET, PUT } from "./route";

const params = { params: Promise.resolve({ id: "opp_example" }) };

test("deadline facts admin API returns 401 without a platform-admin session", async () => {
  const getResponse = await GET(new Request("http://localhost/api/admin/opportunities/opp_example/deadline-facts"), params);
  assert.equal(getResponse.status, 401);

  const putResponse = await PUT(
    new Request("http://localhost/api/admin/opportunities/opp_example/deadline-facts", {
      method: "PUT",
      headers: { "content-type": "application/json", "Idempotency-Key": "00000000-0000-4000-8000-000000000001" },
      body: JSON.stringify({ tiers: [], stages: [] }),
    }),
    params,
  );
  assert.equal(putResponse.status, 401);
});
