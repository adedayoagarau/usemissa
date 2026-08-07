import test from "node:test";
import assert from "node:assert/strict";
import {
  discoveryBatchSize,
  discoverySourceInsertPlaceholders,
  discoverySourceUpdatePlaceholders,
  extractDiscoveryLinks,
} from "../src/discoveryWorker.js";

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

test("external-only discovery skips directory navigation and sharing links", () => {
  const html = `
    <a href="/guide-submission-opportunities/example-call">Internal call detail</a>
    <a href="https://bsky.app/intent/compose?text=call">Share this call</a>
    <a href="https://publisher.example.org/submit">Submit to publisher</a>
  `;
  const links = extractDiscoveryLinks(html, "https://directory.example.org/list", 10, true);
  assert.deepEqual(links.map((link) => link.url), ["https://publisher.example.org/submit"]);
});

test("discovery persistence declares VALUES parameter types", () => {
  assert.deepEqual(discoverySourceUpdatePlaceholders(2), [
    "($1::text, $2::boolean, $3::jsonb)",
    "($4::text, $5::boolean, $6::jsonb)",
  ]);
  assert.deepEqual(discoverySourceInsertPlaceholders(1), [
    "($1::text, $2::text, $3::boolean, $4::jsonb)",
  ]);
});
