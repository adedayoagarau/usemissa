import assert from "node:assert/strict";
import test from "node:test";
import { assessRenderUrl, tokenMatches } from "../src/policy.js";

test("public http and https URLs are renderable", () => {
  assert.equal(assessRenderUrl("https://www.casanailha.org/the-multidisciplinary-residency-program/").allowed, true);
  assert.equal(assessRenderUrl("http://example.org/call").allowed, true);
});

test("the renderer refuses to become an SSRF proxy", () => {
  for (const target of [
    "http://localhost:8080/admin",
    "http://127.0.0.1/",
    "http://0.0.0.0/",
    "http://10.0.0.5/",
    "http://172.16.4.1/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://metadata.google.internal/",
    "http://100.64.0.1/",
    "http://[::1]/",
    "http://[fd00::1]/",
    "http://api.internal/",
    "file:///etc/passwd",
    "ftp://example.org/x",
    "https://user:pass@example.org/",
  ]) {
    assert.equal(assessRenderUrl(target).allowed, false, `${target} must be refused`);
  }
});

test("malformed input is refused rather than thrown", () => {
  for (const target of ["", "not a url", undefined, null, 42]) {
    assert.equal(assessRenderUrl(target).allowed, false);
  }
});

test("token comparison rejects wrong and short tokens", () => {
  assert.equal(tokenMatches("secret-token", "secret-token"), true);
  assert.equal(tokenMatches("secret-tokeX", "secret-token"), false);
  assert.equal(tokenMatches("short", "secret-token"), false);
  assert.equal(tokenMatches(undefined, "secret-token"), false);
});
