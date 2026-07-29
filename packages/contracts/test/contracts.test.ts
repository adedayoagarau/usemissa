import assert from "node:assert/strict";
import test from "node:test";
import {
  organizationMemberMutationSchema,
  resourceIdSchema,
} from "../src/index.js";

test("resource IDs accept legacy and UUID-backed prefixed identities", () => {
  assert.equal(resourceIdSchema.parse("org_0001"), "org_0001");
  assert.equal(
    resourceIdSchema.parse("org_550e8400-e29b-41d4-a716-446655440000"),
    "org_550e8400-e29b-41d4-a716-446655440000",
  );
});

test("organization member mutations normalize email and restrict roles", () => {
  assert.deepEqual(
    organizationMemberMutationSchema.parse({ email: " EDITOR@EXAMPLE.COM " }),
    {
      email: "editor@example.com",
      role: "member",
    },
  );
  assert.throws(() =>
    organizationMemberMutationSchema.parse({
      email: "editor@example.com",
      role: "owner",
    }),
  );
});
