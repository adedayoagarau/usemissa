import assert from "node:assert/strict";
import test from "node:test";
import {
  signatureFields,
  signatureHtml,
  signatureText,
  type SignatureFields,
} from "./creator-signature";
import { sampleCreatorPortfolio } from "../lib/creator-profile-sample";

const fields: SignatureFields = {
  name: "Riley Chen",
  line: "Poet, sound artist and photographer",
  address: "usemissa.com/@rileychen",
  url: "https://www.usemissa.com/@rileychen",
};

/** Markup the builder is allowed to write; attribute values can't hold <, > or ". */
const KNOWN_TAG =
  /<\/?(?:table|tbody|tr|td|a|span)(?:\s+[a-z-]+="[^"<>]*")*\s*\/?>/g;

const hostile =
  "<script>alert(1)</script> \"><img src=x onerror=alert(2)> & ' ` ${x}";

test("the signature is nested tables with every style inline", () => {
  const html = signatureHtml(fields);
  assert.match(html, /^<table\b/);
  assert.match(html, /<td style="/);
  assert.ok(html.includes("Riley Chen"));
  assert.ok(html.includes("Poet, sound artist and photographer"));
  assert.ok(html.includes('href="https://www.usemissa.com/@rileychen"'));
  assert.ok(html.includes(">usemissa.com/@rileychen</a>"));
});

test("it needs nothing from outside the message", () => {
  const html = signatureHtml(fields);
  assert.doesNotMatch(
    html,
    /<(?:style|link|script|img|iframe|svg|video|audio|object|embed|form|meta|base)\b/i,
  );
  assert.doesNotMatch(html, /\bclass=/i);
  assert.doesNotMatch(html, /@import|url\(|src=/i);
  // The only address in the markup is the profile link itself.
  assert.deepEqual(
    [...html.matchAll(/https?:\/\/[^"'\s<)]+/g)].map((m) => m[0]),
    ["https://www.usemissa.com/@rileychen"],
  );
  assert.doesNotMatch(html, /[?&](?:utm_|ref=|track|pixel)/i);
});

test("every field is escaped, in text and in the link", () => {
  for (const field of ["name", "line", "address", "url"] as const) {
    const html = signatureHtml({ ...fields, [field]: hostile });
    const leftover = html.replace(KNOWN_TAG, "");
    assert.ok(!/[<>]/.test(leftover), `${field}: stray markup in ${leftover}`);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /<img/i);
    // Quotes in a field can't close an attribute and start a new one.
    assert.equal(
      [...html.matchAll(/<[^>]+>/g)].every((tag) =>
        /^<\/?(?:table|tbody|tr|td|a|span)\b/.test(tag[0]),
      ),
      true,
    );
  }
  const html = signatureHtml({ ...fields, name: hostile });
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(html.includes("&quot;&gt;&lt;img src=x onerror=alert(2)&gt;"));
  assert.ok(html.includes("&amp; &#39;"));
});

test("a hostile link never becomes a link", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,<b>x</b>",
    "http://www.usemissa.com/@rileychen",
    "https://user:pass@www.usemissa.com/",
    "not a url",
    "",
    '" onclick="alert(1)',
  ]) {
    const html = signatureHtml({ ...fields, url });
    assert.doesNotMatch(html, /<a\b/, url);
    assert.ok(html.includes("usemissa.com/@rileychen"));
    assert.ok(!/ onclick=/.test(html), url);
  }
});

test("a link with characters that need escaping stays inside its attribute", () => {
  const html = signatureHtml({
    ...fields,
    url: "https://www.usemissa.com/@rileychen?a=1&b=2",
  });
  assert.ok(
    html.includes('href="https://www.usemissa.com/@rileychen?a=1&amp;b=2"'),
  );
});

test("the studio preview looks the same but has no link to click", () => {
  const copy = signatureHtml(fields);
  const preview = signatureHtml(fields, { preview: true });
  assert.doesNotMatch(preview, /<a\b|href=/);
  const text = (html: string) =>
    html.replace(/<[^>]+>/g, "|").replace(/\|+/g, "|");
  assert.equal(text(preview), text(copy));
  const leftover = signatureHtml(
    { ...fields, address: hostile },
    { preview: true },
  ).replace(KNOWN_TAG, "");
  assert.ok(!/[<>]/.test(leftover));
});

test("empty fields leave their row out instead of printing a gap", () => {
  const html = signatureHtml({ ...fields, line: "  " });
  assert.equal(
    (html.match(/<tr><td style="padding:(?:0|2px 0 0|8px 0 0);/g) ?? []).length,
    2,
  );
  assert.ok(!html.includes("Poet"));
  const empty = signatureHtml({ name: "", line: "", address: "", url: "" });
  assert.doesNotMatch(empty, /undefined|null/);
});

test("line breaks in a field are flattened to one line", () => {
  const html = signatureHtml({ ...fields, name: "Riley\n  Chen" });
  assert.ok(html.includes(">Riley Chen<"));
  assert.equal(
    signatureText({ ...fields, name: "Riley\nChen" }).split("\n")[0],
    "Riley Chen",
  );
});

test("the plain text copy has the same three lines", () => {
  assert.equal(
    signatureText(fields),
    "Riley Chen\nPoet, sound artist and photographer\nhttps://www.usemissa.com/@rileychen",
  );
  assert.equal(
    signatureText({ ...fields, line: "" }),
    "Riley Chen\nhttps://www.usemissa.com/@rileychen",
  );
  assert.equal(
    signatureText({ ...fields, url: "javascript:alert(1)" }),
    "Riley Chen\nPoet, sound artist and photographer\nusemissa.com/@rileychen",
  );
});

test("the plain text copy is not HTML-escaped and has no markup", () => {
  const text = signatureText({ ...fields, name: "Zoë & Co <3" });
  assert.ok(text.startsWith("Zoë & Co <3\n"));
});

test("fields come from the profile's name, what they make and their handle", () => {
  const sample = sampleCreatorPortfolio();
  const built = signatureFields(sample, "rileychen");
  assert.equal(built.name, "Riley Chen");
  assert.equal(built.line, "Poet, sound artist and photographer");
  assert.match(built.address, /\/@rileychen$/);
  assert.match(built.url, /^https:\/\/.+\/@rileychen$/);
  const unnamed = signatureFields({ name: "  ", selected: [] }, "rileychen");
  assert.equal(unnamed.name, "@rileychen");
  assert.equal(unnamed.line, "");
});
