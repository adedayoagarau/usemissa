import test from "node:test";
import assert from "node:assert/strict";
import { discoveryBatchSize, extractDiscoveryLinks } from "../src/discoveryWorker.js";

test("discovery extracts bounded call links and drops assets", () => {
  const html = `
    <a href="/calls/summer-open-call">Summer open call</a>
    <a href="https://example.org/apply/grant">Apply for grant</a>
    <a href="/images/apply.png">Apply image</a>
    <a href="/calls/summer-open-call#details">Duplicate</a>
    <a href="mailto:hello@example.org">Email</a>
  `;
  const links = extractDiscoveryLinks(html, "https://directory.example.org/list", 10);
  assert.deepEqual(links.map((link) => link.url), [
    "https://directory.example.org/calls/summer-open-call",
    "https://example.org/apply/grant",
  ]);
});

test("discovery batch is bounded for hosted workers", () => {
  assert.equal(discoveryBatchSize("1000"), 250);
  assert.equal(discoveryBatchSize("not-a-number"), 100);
});
