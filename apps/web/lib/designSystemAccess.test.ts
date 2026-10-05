import assert from "node:assert/strict";
import test from "node:test";
import { designSystemRoutesPublic } from "./designSystemAccess";

test("design-system routes are hidden in production by default", () => {
  assert.equal(designSystemRoutesPublic({ VERCEL_ENV: "production" }), false);
});

test("design-system routes can be enabled in production explicitly", () => {
  assert.equal(
    designSystemRoutesPublic({ VERCEL_ENV: "production", MISSA_DESIGN_SYSTEM_PUBLIC: "1" }),
    true,
  );
});

test("design-system routes stay available in preview and local environments", () => {
  assert.equal(designSystemRoutesPublic({ VERCEL_ENV: "preview" }), true);
  assert.equal(designSystemRoutesPublic({}), true);
});
