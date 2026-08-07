import { test } from "node:test";
import assert from "node:assert/strict";
import { verifySourceCandidate } from "../src/sourcePromotionWorker.js";

function fakeFetch(pages: Record<string, { status?: number; body: string; contentType?: string }>) {
  return async (input: string): Promise<Response> => {
    const page = pages[input];
    if (!page) return new Response("", { status: 404 });
    return new Response(page.body, {
      status: page.status ?? 200,
      headers: { "content-type": page.contentType ?? "text/html" },
    });
  };
}

test("source verifier accepts a canonical call page with robots and terms evidence", async () => {
  const result = await verifySourceCandidate(
    { url: "https://example.org/call", title: "Example Open Call" },
    {
      fetchImpl: fakeFetch({
        "https://example.org/robots.txt": { body: "User-agent: *\nAllow: /\n" },
        "https://example.org/call": { body: '<html><head><title>Example Open Call</title><link rel="canonical" href="https://example.org/call"></head><body>Apply now. Open call submissions close on 30 September.</body></html>' },
      }),
    },
  );
  assert.equal(result.decision, "accepted");
  assert.equal(result.evidence.robots, "allowed");
  assert.equal(result.evidence.terms, "allowed");
  assert.equal(result.evidence.canonicalUrl, "https://example.org/call");
});

test("source verifier rejects a robots-disallowed candidate", async () => {
  const result = await verifySourceCandidate(
    { url: "https://example.org/private/call", title: "Private Call" },
    { fetchImpl: fakeFetch({ "https://example.org/robots.txt": { body: "User-agent: *\nDisallow: /private\n" } }) },
  );
  assert.equal(result.decision, "rejected");
  assert.equal(result.evidence.robots, "blocked");
});

test("source verifier sends a promising page without canonical evidence to human review", async () => {
  const result = await verifySourceCandidate(
    { url: "https://example.org/call", title: "Example Open Call" },
    {
      fetchImpl: fakeFetch({
        "https://example.org/robots.txt": { body: "User-agent: *\nAllow: /\n" },
        "https://example.org/call": { body: "Apply now. Open call submissions close on 30 September." },
      }),
    },
  );
  assert.equal(result.decision, "needs-human");
  assert.match(result.evidence.reason, /canonical/i);
});

test("source verifier rejects explicit anti-automation terms", async () => {
  const result = await verifySourceCandidate(
    { url: "https://example.org/call", title: "Example Open Call" },
    {
      fetchImpl: fakeFetch({
        "https://example.org/robots.txt": { body: "User-agent: *\nAllow: /\n" },
        "https://example.org/call": { body: '<link rel="canonical" href="https://example.org/call">Apply now. Open call submissions. Do not scrape or use automated access.' },
      }),
    },
  );
  assert.equal(result.decision, "rejected");
  assert.equal(result.evidence.terms, "blocked");
});

test("source verifier does not treat navigation labels as opportunity evidence", async () => {
  const result = await verifySourceCandidate(
    { url: "https://example.org/news", title: "News" },
    {
      fetchImpl: fakeFetch({
        "https://example.org/robots.txt": { body: "User-agent: *\nAllow: /\n" },
        "https://example.org/news": { body: '<html><nav><a>Apply</a><a>Submissions</a></nav><main><h1>New legislation</h1><p>The organisation shared a general update.</p></main><link rel="canonical" href="https://example.org/news"></html>' },
      }),
    },
  );
  assert.equal(result.decision, "rejected");
});
