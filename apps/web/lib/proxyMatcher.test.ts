import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "../proxy";

const appDirectory = fileURLToPath(new URL("../app", import.meta.url));

/** Signed-in sections whose layouts build /login?next= from the proxy header. */
const signedInSections = [
  "(passport)",
  "(workspace)",
  "organization",
  "reviews",
];

/** Every page URL under a directory, with dynamic segments filled in. */
function pageUrls(directory: string, urlPrefix: string): string[] {
  const urls: string[] = [];
  for (const entry of readdirSync(directory)) {
    const entryPath = path.join(directory, entry);
    if (statSync(entryPath).isDirectory()) {
      const segment = entry.startsWith("(")
        ? ""
        : `/${entry.replace(/^\[\.*(.+?)\]$/u, "sample-$1")}`;
      urls.push(...pageUrls(entryPath, `${urlPrefix}${segment}`));
    } else if (entry === "page.tsx") {
      urls.push(urlPrefix || "/");
    }
  }
  return urls;
}

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

test("every signed-in page runs the proxy so login can return to it", () => {
  const urls = signedInSections.flatMap((section) =>
    pageUrls(
      path.join(appDirectory, section),
      section.startsWith("(") ? "" : `/${section}`,
    ),
  );
  assert.ok(urls.length > 20, `found only ${urls.length} signed-in pages`);
  const unmatched = urls.filter((url) => !matches(url));
  assert.deepEqual(unmatched, []);
});

test("handle and legacy profile links still redirect through the proxy", () => {
  assert.equal(matches("/@ada"), true);
  assert.equal(matches("/profile/user_123"), true);
});

test("public pages skip the proxy so the CDN can serve them", () => {
  for (const url of [
    "/",
    "/about",
    "/privacy",
    "/opportunities",
    "/opportunities/opp_123",
    "/directory",
    "/rankings/magazines",
    "/residencies",
    "/login",
    "/api/session",
    "/_next/static/chunks/app.js",
  ]) {
    assert.equal(matches(url), false, url);
  }
});
