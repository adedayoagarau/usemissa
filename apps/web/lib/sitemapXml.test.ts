import assert from "node:assert/strict";
import { test } from "node:test";

import { sitemapResponse } from "./sitemapXml";

test("a sitemap read returns a cacheable urlset", async () => {
  const response = await sitemapResponse(async () => [
    { path: "/countries/us" },
  ]);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /s-maxage/u);
  assert.match(await response.text(), /<loc>[^<]*\/countries\/us<\/loc>/u);
});

test("a failed sitemap read returns an empty, uncached urlset", async () => {
  const response = await sitemapResponse(async () => {
    throw new Error("database unavailable");
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.text();
  assert.match(body, /<urlset [^>]+>\s*<\/urlset>/u);
});
