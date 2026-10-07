import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

delete process.env.DATABASE_URL;

test("only a signed-in creator can look up credits, and the answer is never cached", async () => {
  const response = await GET(
    new Request(
      "http://localhost/api/creator/portfolio-collaborators?handles=tonioliver",
    ),
  );
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(await response.json(), {
    error: "Sign in to check your credits.",
  });
});
