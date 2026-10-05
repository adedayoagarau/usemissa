import test from "node:test";
import assert from "node:assert/strict";
import {
  callNameWords,
  extractOfficialLinks,
  isListingSiteHost,
  isPublicHttpUrl,
  listingSiteUrlPattern,
  pageCorroboratesCall,
  resolveOfficialSite,
  type PageFetchResult,
} from "../src/officialSiteResolver.js";

const LISTING = "https://www.artconnect.com/opportunities/abc123";
const context = { title: "Chokechaka Artist Residency 2027", organizationName: null };

const listingHtml = `
  <a href="/opportunities">All opportunities</a>
  <a href="https://www.facebook.com/sharer?u=x">Share</a>
  <a href="https://www.resartis.org/listing/1">Res Artis</a>
  <a href="mailto:hello@chokechaka.org">Email</a>
  <a href="https://cdn.example.com/poster.pdf">Poster</a>
  <a href="https://chokechaka.org/residency">Visit website</a>
  <a href="https://unrelated-blog.net/post">a post</a>`;

test("listing-site hosts include subdomains", () => {
  assert.equal(isListingSiteHost("artconnect.com"), true);
  assert.equal(isListingSiteHost("app.submittable.com"), true);
  assert.equal(isListingSiteHost("chokechaka.org"), false);
  assert.equal(isListingSiteHost(null), false);
});

test("the listing-site URL pattern matches listing hosts only", () => {
  const pattern = new RegExp(listingSiteUrlPattern(["artconnect.com", "pw.org"]), "i");
  assert.match("https://www.artconnect.com/opportunities/1", pattern);
  assert.match("https://pw.org", pattern);
  assert.doesNotMatch("https://notpw.org/x", pattern);
  assert.doesNotMatch("https://pw.org.evil.com/x", pattern);
});

test("outbound links skip the listing site, social, other listing sites, mail and files", () => {
  const links = extractOfficialLinks(listingHtml, LISTING, context);
  assert.deepEqual(links.map((link) => link.host), ["chokechaka.org", "unrelated-blog.net"]);
  assert.equal(links[0]?.url, "https://chokechaka.org/residency");
  assert.ok((links[0]?.score ?? 0) > (links[1]?.score ?? 0));
  assert.equal(links[1]?.score, 0);
});

test("the organization's page corroborates only when it names the call", () => {
  assert.equal(pageCorroboratesCall("Welcome. The Chokechaka Artist Residency opens for 2027 applicants.", context.title), true);
  assert.equal(pageCorroboratesCall("Welcome to our gallery. Artist talks every Friday.", context.title), false);
  assert.equal(pageCorroboratesCall("Residency", "Residency"), false);
});

test("internal and credentialed URLs are never fetched", async () => {
  assert.equal(await isPublicHttpUrl("http://localhost:3000/"), false);
  assert.equal(await isPublicHttpUrl("http://169.254.169.254/latest/meta-data"), false);
  assert.equal(await isPublicHttpUrl("http://10.0.0.5/"), false);
  assert.equal(await isPublicHttpUrl("https://user:pass@example.com/"), false);
  assert.equal(await isPublicHttpUrl("ftp://example.com/"), false);
  assert.equal(await isPublicHttpUrl("http://[::1]/"), false);
});

function fakeFetcher(pages: Record<string, string>) {
  const requested: string[] = [];
  const fetchPage = async (url: string): Promise<PageFetchResult> => {
    requested.push(url);
    const html = pages[url];
    return html === undefined ? { status: "error", error: "http-404" } : { status: "ok", html, finalUrl: url };
  };
  return { fetchPage, requested };
}

const candidate = { opportunityId: "opp_1", sourceId: "src_1", listingUrl: LISTING, ...context };

test("a call is confirmed when the linked organization page names it", async () => {
  const { fetchPage } = fakeFetcher({
    [LISTING]: listingHtml,
    "https://chokechaka.org/residency": "<h1>Chokechaka Artist Residency 2027</h1><p>Apply by May.</p>",
  });
  const result = await resolveOfficialSite(candidate, fetchPage);
  assert.deepEqual(result, {
    status: "confirmed",
    officialUrl: "https://chokechaka.org/residency",
    listingUrl: LISTING,
    anchorText: "Visit website",
  });
});

test("a call stays unconfirmed when the linked page does not name it", async () => {
  const { fetchPage, requested } = fakeFetcher({
    [LISTING]: listingHtml,
    "https://chokechaka.org/residency": "<h1>Our gallery</h1>",
  });
  const result = await resolveOfficialSite(candidate, fetchPage);
  assert.deepEqual(result, { status: "not-found", reason: "official-site-does-not-name-the-call" });
  // Zero-score links (no official wording, no shared name) are never followed.
  assert.ok(!requested.includes("https://unrelated-blog.net/post"));
});

test("an unreachable listing page is recorded, not thrown", async () => {
  const { fetchPage } = fakeFetcher({});
  const result = await resolveOfficialSite(candidate, fetchPage);
  assert.deepEqual(result, { status: "not-found", reason: "listing-page-http-404" });
});

test("the call name drops prize amounts, numbers and bracketed asides", () => {
  assert.deepEqual(callNameWords("PHIL LIT Poetry Prize — $450 in Cash Prizes"), ["phil", "lit", "poetry"]);
  assert.deepEqual(callNameWords("Matsu Biennial 2026 Call for International Artists (Taiwan)"), ["matsu", "biennial", "international", "artists"]);
  assert.equal(pageCorroboratesCall("Phil Lit — submit to our poetry contest", "PHIL LIT Poetry Prize — $450 in Cash Prizes"), true);
});

test("tracking parameters are stripped from outbound links", () => {
  const [link] = extractOfficialLinks('<a href="https://phillitjournal.com/submissions?utm_source=newpages&amp;page=2">Apply</a>', LISTING, context);
  assert.equal(link?.url, "https://phillitjournal.com/submissions?page=2");
});
