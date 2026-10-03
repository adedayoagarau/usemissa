import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "./route";

test("residency review API returns 401 without a session", async () => {
  const response = await POST(
    new Request("http://localhost/api/rankings/residencies/res_1/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ratingScore: 5, reviewBody: "A long enough review body." }),
    }),
    { params: Promise.resolve({ id: "res_1" }) },
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Sign in to post a review." });
});
