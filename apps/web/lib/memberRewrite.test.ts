import assert from "node:assert/strict";
import test from "node:test";
import {
  getRewrittenUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import nextConfig from "../next.config";

const url = (path: string) => `https://www.usemissa.com${path}`;

test("signed-in visitors see the dynamic twin of a call page", async () => {
  const response = await unstable_getResponseFromNextConfig({
    url: url("/opportunities/spring-fellowship"),
    nextConfig,
    cookies: { missa_session: "token" },
  });
  assert.equal(getRewrittenUrl(response), url("/opportunities/spring-fellowship/member"));
});

test("anonymous visitors get the cached public call page", async () => {
  const response = await unstable_getResponseFromNextConfig({
    url: url("/opportunities/spring-fellowship"),
    nextConfig,
  });
  assert.equal(getRewrittenUrl(response), null);
});

test("other routes under /opportunities are never rewritten", async () => {
  for (const path of ["/opportunities", "/opportunities/for-you"]) {
    const response = await unstable_getResponseFromNextConfig({
      url: url(path),
      nextConfig,
      cookies: { missa_session: "token" },
    });
    assert.equal(getRewrittenUrl(response), null, path);
  }
});
