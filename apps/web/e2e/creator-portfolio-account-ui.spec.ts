import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { resolve } from "node:path";
// Mount the real client component with mocked transport; no authentication bypass or product test route.
// Route authentication and SQL publication semantics have separate coverage.
test("account editor confirms saving, publishes reviewed snapshot, renames and unpublishes", async ({
  page,
}) => {
  page.on("pageerror", (error) => {
    throw error;
  });
  let draft: unknown = null;
  let revision = 0;
  let publishedAt: string | null = null;
  let handle = "";
  let conflict = false;
  const bundle = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {CreatorPortfolioStudio} from './components/creator-portfolio-studio';createRoot(document.getElementById('root')).render(<CreatorPortfolioStudio ownerId="portfolio-ui-fixture" />);`,
      resolveDir: resolve("."),
      loader: "tsx",
    },
    jsx: "automatic",
    bundle: true,
    write: false,
    outfile: "/tmp/missa-account-client.js",
    platform: "browser",
    format: "iife",
    loader: { ".css": "css" },
    define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' },
  });
  const shell=await (await page.request.get('/design-system/creator-profile-settings')).text();
  const styles=(shell.match(/<link[^>]+rel="stylesheet"[^>]*>/g)??[]).join('');
  await page.route("**/portfolio-client-test", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><head>${styles}</head><body><div id="root"></div></body></html>`,
    }),
  );
  await page.route("**/api/creator/portfolio-draft", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      if (conflict) {
        await route.fulfill({
          status: 409,
          json: {
            error:
              "This profile changed on another device. Reload before editing further.",
          },
        });
        return;
      }
      expect(body.revision).toBe(revision);
      draft = body.draft;
      revision++;
      await route.fulfill({ json: { revision } });
    } else await route.fulfill({ json: { draft, revision, publishedAt } });
  });
  await page.route("**/api/me/handles/availability?**", (route) =>
    route.fulfill({ json: { available: true } }),
  );
  await page.route("**/api/me/handles", async (route) => {
    if (route.request().method() !== "GET")
      handle = route.request().postDataJSON().handle;
    await route.fulfill({
      json: {
        handle: handle ? { handleKey: handle, displayHandle: handle } : null,
      },
    });
  });
  await page.route("**/api/creator/portfolio-publish", async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON().revision).toBe(revision);
      publishedAt = new Date().toISOString();
    } else publishedAt = null;
    await route.fulfill({ json: { publishedAt, href: `/@${handle}` } });
  });
  await page.goto("/portfolio-client-test");
  await page.addStyleTag({content:bundle.outputFiles.find(file=>file.path.endsWith(".css"))!.text});
  await page.addScriptTag({
    content: bundle.outputFiles.find((file) => file.path.endsWith(".js"))!.text,
  });
  await page.getByLabel("Name", { exact: true }).fill("Maya Bennett");
  await page.getByRole("button", { name: "Use @mayabennett" }).click();
  await expect(
    page.getByText("Available · reserved when you publish."),
  ).toBeVisible();
  await expect(page.getByRole("status").first()).toContainText(
    "private draft in your account",
  );
  await page
    .getByRole("button", { name: "Publish profile", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "usemissa.com/@mayabennett",
  );
  await page.getByRole("button", { name: "Confirm and publish" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Publish changes" }),
  ).toBeVisible();
  expect(publishedAt).toBeTruthy();
  await page.getByRole("button", { name: "Change profile address" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Handle", { exact: true })
    .fill("maya-b");
  await page.getByRole("button", { name: "Save new address" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(handle).toBe("maya-b");
  await page
    .getByRole("button", { name: "Unpublish profile", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Your private draft and handle stay yours.",
  );
  await page.getByRole("button", { name: "Unpublish", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(publishedAt).toBeNull();
  expect(draft).toBeTruthy();
  conflict = true;
  await page
    .getByLabel("Introduction", { exact: true })
    .fill("An edit from a stale tab.");
  await expect(
    page.getByText("This profile changed on another device.", { exact: false }),
  ).toBeVisible();
});
