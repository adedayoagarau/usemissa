import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { build } from "esbuild";
import { resolve } from "node:path";

/**
 * Collaborators (both sides confirm) and the Booking kit, on the visitor page
 * and in the studio. The studio is the real `ProfileStudio` with mocked
 * transport, as in creator-portfolio-account-ui.spec.ts, because there is no
 * database here. Confirmation and file facts are computed by the server and
 * covered by unit and PGlite tests; these specs cover what a person sees.
 */

const SHELL = "/design-system/creator-profile-settings";
const PDF = "/api/creator/portfolio-media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ZIP = "/api/creator/portfolio-media/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

async function bundle(contents: string) {
  const result = await build({
    stdin: { contents, resolveDir: resolve("."), loader: "tsx" },
    jsx: "automatic",
    bundle: true,
    write: false,
    outfile: "/tmp/missa-collaborators-client.js",
    platform: "browser",
    format: "iife",
    loader: { ".css": "css" },
    define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' },
  });
  return {
    js: result.outputFiles.find((file) => file.path.endsWith(".js"))!.text,
    css: result.outputFiles.find((file) => file.path.endsWith(".css"))!.text,
  };
}

const studioEntry = `import React from 'react';import {createRoot} from 'react-dom/client';import {ProfileStudio} from './components/creator-profile/studio/profile-studio';createRoot(document.getElementById('root')).render(<ProfileStudio ownerId="portfolio-ui-fixture" {...(window.__studioProps ?? {})} />);`;
const profileEntry = `import React from 'react';import {createRoot} from 'react-dom/client';import {PublicCreatorProfile} from './components/creator-profile/public-profile';import {portfolioSchema} from './lib/creator-portfolio-schema';createRoot(document.getElementById('root')).render(<PublicCreatorProfile portfolio={portfolioSchema.parse(window.__portfolio)} handle="rileychen" mode="page" today="2026-10-07" />);`;

let studioBundle: Awaited<ReturnType<typeof bundle>>;
let profileBundle: Awaited<ReturnType<typeof bundle>>;
test.beforeAll(async () => {
  studioBundle = await bundle(studioEntry);
  profileBundle = await bundle(profileEntry);
});

async function mount(
  page: Page,
  code: Awaited<ReturnType<typeof bundle>>,
  globals: Record<string, unknown> = {},
) {
  const shell = await (await page.request.get(SHELL)).text();
  const styles = (shell.match(/<link[^>]+rel="stylesheet"[^>]*>/g) ?? []).join(
    "",
  );
  await page.route("**/portfolio-client-test", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html lang="en"><head>${styles}</head><body><div id="root"></div></body></html>`,
    }),
  );
  await page.goto("/portfolio-client-test");
  await page.addStyleTag({ content: code.css });
  await page.evaluate((values) => Object.assign(window, values), globals);
  await page.addScriptTag({ content: code.js });
}

type SavedDraft = {
  name?: string;
  collaborators: {
    id?: string;
    handle: string;
    name: string;
    role?: string;
    confirmed: boolean;
  }[];
  modules: { id: string; visible: boolean; added?: boolean }[];
  booking: { files: { file: string; type?: string; bytes?: number }[] };
};
type Credit = { status: string; name?: string };
type Server = {
  draft: SavedDraft | null;
  revision: number;
  yourHandle: string | null;
  credits: Record<string, Credit>;
  lookups: string[];
  lookupStatus: number;
  uploads: { url: string; kind: string; type: string; bytes: number }[];
  uploadFailure?: { status: number; error: string };
};

/** The account side of the studio: draft, handle, outcomes, credits and uploads. */
async function mockAccount(page: Page, overrides: Partial<Server> = {}) {
  const server: Server = {
    draft: null,
    revision: 0,
    yourHandle: "rileychen",
    credits: {},
    lookups: [],
    lookupStatus: 200,
    uploads: [],
    ...overrides,
  };
  await page.route("**/api/creator/portfolio-draft", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      server.draft = body.draft;
      server.revision += 1;
      await route.fulfill({ json: { revision: server.revision } });
    } else
      await route.fulfill({
        json: {
          draft: server.draft,
          revision: server.revision,
          publishedAt: null,
        },
      });
  });
  await page.route("**/api/me/handles", (route) =>
    route.fulfill({
      json: {
        handle: server.yourHandle
          ? { handleKey: server.yourHandle, displayHandle: server.yourHandle }
          : null,
      },
    }),
  );
  await page.route("**/api/creator/portfolio-outcomes", (route) =>
    route.fulfill({ json: { outcomes: [] } }),
  );
  await page.route(
    "**/api/creator/portfolio-collaborators?**",
    async (route) => {
      const asked =
        new URL(route.request().url()).searchParams.get("handles") ?? "";
      server.lookups.push(asked);
      if (server.lookupStatus !== 200) {
        await route.fulfill({
          status: server.lookupStatus,
          json: { error: "Could not check your credits. Please retry." },
        });
        return;
      }
      await route.fulfill({
        json: {
          yourHandle: server.yourHandle,
          collaborators: asked
            .split(",")
            .filter(Boolean)
            .map((handle) => ({
              handle,
              ...(server.credits[handle] ?? { status: "not-published" }),
            })),
        },
      });
    },
  );
  await page.route("**/api/creator/portfolio-media", async (route) => {
    if (server.uploadFailure) {
      await route.fulfill({
        status: server.uploadFailure.status,
        json: { error: server.uploadFailure.error },
      });
      return;
    }
    const next = server.uploads.shift();
    await route.fulfill({ status: 201, json: next ?? { url: PDF } });
  });
  return server;
}

function regions(page: Page) {
  return {
    rail: page.getByRole("navigation", { name: "Profile editor" }),
    editor: page.getByRole("region", { name: "Edit section" }),
    preview: page.getByRole("region", { name: "Live preview" }),
    status: page.getByRole("status").first(),
  };
}

async function addAddon(page: Page, name: string) {
  const { rail, editor } = regions(page);
  await rail.getByRole("button", { name: "Add an add-on" }).click();
  await page.getByRole("menuitem", { name: new RegExp(`^${name}`) }).click();
  await expect(editor.getByRole("heading", { name, level: 2 })).toBeVisible();
}

test.describe("studio: collaborators", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("a credit waits for the other side, then shows once they confirm", async ({
    page,
  }) => {
    page.on("pageerror", (error) => {
      throw error;
    });
    const server = await mockAccount(page);
    await mount(page, studioBundle);
    const { rail, editor, preview, status } = regions(page);
    await expect(status).toContainText("private draft in your account");
    await editor.getByLabel("Name", { exact: true }).fill("Riley Chen");

    await addAddon(page, "Collaborators");
    await expect(
      editor.getByText(
        "Nobody credited yet. Add the people you made work with.",
      ),
    ).toBeVisible();
    await expect(
      editor.getByText(/Both of you add each other, then publish/),
    ).toBeVisible();

    server.credits = { tonioliver: { status: "waiting", name: "Toni Oliver" } };
    await editor.getByRole("button", { name: "Add a collaborator" }).click();
    await editor.getByLabel("Name", { exact: true }).fill("Toni Oliver");
    await editor.getByLabel("Missa handle").fill("@Tonioliver");
    await editor.getByLabel("Missa handle").blur();
    // The handle is stored the way /@handle reads it.
    await expect(editor.getByLabel("Missa handle")).toHaveValue("tonioliver");
    await editor
      .getByLabel(/^What they did/)
      .fill("Composed the score for Cloth Choir");

    // The owner sees where it stands; visitors see nothing yet.
    await expect(
      editor.getByText(
        "Waiting for @tonioliver to credit you back. It shows on your profile once they do.",
      ),
    ).toBeVisible();
    await expect(
      editor.getByRole("button", {
        name: /^Awaiting confirmation\. What this means/,
      }),
    ).toBeVisible();
    await expect(
      editor.getByRole("button", { name: /@tonioliver · Waiting/ }),
    ).toBeVisible();
    await expect(
      preview.getByRole("region", { name: "Collaborators" }),
    ).toHaveCount(0);
    expect(server.lookups.at(-1)).toBe("tonioliver");

    // They credit you back; the next check says so.
    server.credits.tonioliver = { status: "confirmed", name: "Toni Oliver" };
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(
      editor.getByText(
        "Toni Oliver credits you back, so this shows on your profile.",
      ),
    ).toBeVisible();
    await expect(
      editor.getByRole("button", { name: /^Confirmed\. What this means/ }),
    ).toBeVisible();
    const shown = preview.getByRole("region", { name: "Collaborators" });
    await expect(shown.getByText("Toni Oliver")).toBeVisible();
    await expect(
      shown.getByText("Composed the score for Cloth Choir"),
    ).toBeVisible();
    await shown
      .getByRole("button", { name: /^Confirmed\. What this means/ })
      .click();
    await expect(
      page.getByText(
        /Riley credits Toni Oliver, and Toni Oliver credits Riley back on Missa/,
      ),
    ).toBeVisible();

    // The client never claims Confirmed; the server decides on every save.
    await expect(status).toContainText("private draft in your account");
    expect(server.draft!.collaborators).toHaveLength(1);
    expect(server.draft!.collaborators[0]).toMatchObject({
      handle: "tonioliver",
      name: "Toni Oliver",
      confirmed: false,
    });
    await rail.getByRole("button", { name: /^Collaborators/ }).click();
    await expect(
      rail.getByRole("button", { name: /^Collaborators/ }),
    ).toContainText("1");
  });

  test("you cannot credit yourself or the same person twice", async ({
    page,
  }) => {
    const server = await mockAccount(page, {
      credits: { tonioliver: { status: "waiting", name: "Toni Oliver" } },
    });
    await mount(page, studioBundle);
    const { editor, status } = regions(page);
    await expect(status).toContainText("private draft in your account");
    await addAddon(page, "Collaborators");

    await editor.getByRole("button", { name: "Add a collaborator" }).click();
    await editor.getByLabel("Name", { exact: true }).fill("Toni Oliver");
    await editor.getByLabel("Missa handle").fill("tonioliver");
    await expect(editor.getByText("Waiting for @tonioliver")).toBeVisible();

    // A second row for the same person.
    await editor.getByRole("button", { name: "Done" }).click();
    await editor.getByRole("button", { name: "Add a collaborator" }).click();
    await editor.getByLabel("Name", { exact: true }).fill("Toni again");
    await editor.getByLabel("Missa handle").fill("@TonioLiver");
    await expect(
      editor
        .getByRole("alert")
        .filter({ hasText: "You’ve already credited @tonioliver." }),
    ).toBeVisible();

    // Your own handle, once the server has said what it is.
    await editor.getByLabel("Missa handle").fill("rileychen");
    await expect(
      editor.getByRole("alert").filter({
        hasText:
          "That’s your own profile. Credit the people you made the work with.",
      }),
    ).toBeVisible();
    await expect(editor.getByLabel("Missa handle")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    // Neither bad handle reached the draft, so nothing unsaveable is queued.
    await expect(status).toContainText("private draft in your account");
    expect(server.draft!.collaborators.map((entry) => entry.handle)).toEqual([
      "tonioliver",
      "",
    ]);
    // A fixed handle clears the error and is kept.
    await editor.getByLabel("Missa handle").fill("anareis");
    await expect(editor.getByRole("alert")).toHaveCount(0);
    await expect(status).toContainText("private draft in your account");
    expect(server.draft!.collaborators[1].handle).toBe("anareis");
  });

  test("a failed check says nothing was lost and can be tried again", async ({
    page,
  }) => {
    const server = await mockAccount(page, { lookupStatus: 503 });
    await mount(page, studioBundle);
    const { editor, status } = regions(page);
    await expect(status).toContainText("private draft in your account");
    await addAddon(page, "Collaborators");
    await editor.getByRole("button", { name: "Add a collaborator" }).click();
    await editor.getByLabel("Name", { exact: true }).fill("Toni Oliver");
    await editor.getByLabel("Missa handle").fill("tonioliver");
    await expect(
      editor.getByText(
        "Could not check your credits. Please retry. Nothing was lost.",
      ),
    ).toBeVisible();
    server.lookupStatus = 200;
    server.credits = { tonioliver: { status: "not-published" } };
    await editor.getByRole("button", { name: "Try again" }).click();
    await expect(
      editor.getByText(
        "@tonioliver has no published profile yet. It shows once they publish and credit you back.",
      ),
    ).toBeVisible();
  });

  test("someone without an address is told to choose one first", async ({
    page,
  }) => {
    await mockAccount(page, {
      yourHandle: null,
      credits: { tonioliver: { status: "waiting" } },
    });
    await mount(page, studioBundle);
    const { editor, status } = regions(page);
    await expect(status).toContainText("private draft in your account");
    await addAddon(page, "Collaborators");
    await editor.getByRole("button", { name: "Add a collaborator" }).click();
    await editor.getByLabel("Name", { exact: true }).fill("Toni Oliver");
    await editor.getByLabel("Missa handle").fill("tonioliver");
    await expect(
      editor
        .getByRole("note")
        .filter({ hasText: "Choose your profile address first" }),
    ).toBeVisible();
  });

  test("Credit as collaborator opens the studio with the add-on on and a row ready", async ({
    page,
  }) => {
    const server = await mockAccount(page, {
      credits: { tonioliver: { status: "waiting", name: "Toni Oliver" } },
    });
    await mount(page, studioBundle, {
      __studioProps: {
        creditPrefill: { handle: "tonioliver", name: "Toni Oliver" },
      },
    });
    const { rail, editor, status } = regions(page);
    await expect(status).toContainText("private draft in your account");
    await expect(
      editor.getByRole("heading", { name: "Collaborators", level: 2 }),
    ).toBeVisible();
    await expect(
      rail.getByRole("button", { name: /^Collaborators/ }),
    ).toBeVisible();
    // The row is open, with their name and handle in place.
    await expect(editor.getByLabel("Name", { exact: true })).toHaveValue(
      "Toni Oliver",
    );
    await expect(editor.getByLabel("Missa handle")).toHaveValue("tonioliver");
    await expect(editor.getByText("Waiting for @tonioliver")).toBeVisible();
    await expect(status).toContainText("private draft in your account");
    expect(server.draft!.collaborators).toHaveLength(1);
    expect(server.draft!.collaborators[0]).toMatchObject({
      handle: "tonioliver",
      name: "Toni Oliver",
    });
    expect(
      server.draft!.modules.find((entry) => entry.id === "collaborators"),
    ).toMatchObject({ added: true, visible: true });
  });

  test("arriving again for someone already credited adds nothing twice", async ({
    page,
  }) => {
    const existing = {
      id: "c_existing",
      handle: "tonioliver",
      name: "Toni Oliver",
      role: "Wrote the text",
      confirmed: false,
    };
    const server = await mockAccount(page, {
      draft: {
        name: "Riley Chen",
        collaborators: [existing],
        modules: [],
        booking: { files: [] },
      },
      revision: 3,
      credits: { tonioliver: { status: "confirmed", name: "Toni Oliver" } },
    });
    await mount(page, studioBundle, {
      __studioProps: {
        creditPrefill: { handle: "@TonioLiver", name: "Toni O." },
      },
    });
    const { editor, status } = regions(page);
    await expect(editor.getByLabel("Name", { exact: true })).toHaveValue(
      "Toni Oliver",
    );
    await expect(status).toContainText("private draft in your account");
    expect(server.draft!.collaborators).toHaveLength(1);
    expect(server.draft!.collaborators[0].name).toBe("Toni Oliver");
  });

  test("the editor is reachable by keyboard and has no accessibility violations", async ({
    page,
  }) => {
    await mockAccount(page, { credits: { tonioliver: { status: "waiting" } } });
    await mount(page, studioBundle);
    const { editor, status } = regions(page);
    await expect(status).toContainText("private draft in your account");
    await addAddon(page, "Collaborators");
    await editor.getByRole("button", { name: "Add a collaborator" }).focus();
    await page.keyboard.press("Enter");
    await editor.getByLabel("Name", { exact: true }).fill("Toni Oliver");
    await page.keyboard.press("Tab");
    await expect(editor.getByLabel("Missa handle")).toBeFocused();
    await page.keyboard.type("tonioliver");
    await expect(editor.getByText("Waiting for @tonioliver")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(editor.getByLabel(/^What they did/)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      editor.getByRole("button", {
        name: /^Awaiting confirmation\. What this means/,
      }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("Waiting for @tonioliver", { exact: false }).last(),
    ).toBeVisible();
    await expect(page.getByText(/only you can see it/)).toBeVisible();
    await page.keyboard.press("Escape");
    const audit = await new AxeBuilder({ page })
      .include('[aria-label="Edit section"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });
});

test.describe("studio: booking kit", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("bios and files reach the preview with the type and size the server found", async ({
    page,
  }) => {
    page.on("pageerror", (error) => {
      throw error;
    });
    const server = await mockAccount(page);
    server.uploads.push(
      { url: PDF, kind: "document", type: "pdf", bytes: 245_760 },
      { url: ZIP, kind: "document", type: "zip", bytes: 18 * 1024 * 1024 },
    );
    await mount(page, studioBundle);
    const { rail, editor, preview, status } = regions(page);
    await expect(status).toContainText("private draft in your account");
    await editor.getByLabel("Name", { exact: true }).fill("Riley Chen");
    await addAddon(page, "Booking kit");

    // Said before anything is added: the files are public once published.
    await expect(
      editor.getByText("Files become public when you publish"),
    ).toBeVisible();
    await expect(
      editor.getByText(/Anyone with your profile link can download them/),
    ).toBeVisible();

    await editor
      .getByLabel(/^Short bio/)
      .fill("Riley Chen is a poet and sound artist.");
    await editor
      .getByLabel(/^Long bio/)
      .fill(
        "Riley Chen writes poems.\n\nTheir first collection appeared in 2025.",
      );
    const kit = preview.getByRole("region", { name: "Booking kit" });
    await expect(
      kit.getByText("Riley Chen is a poet and sound artist."),
    ).toBeVisible();
    await expect(
      kit.getByRole("button", { name: "Copy short bio" }),
    ).toBeVisible();
    await expect(
      kit.getByRole("button", { name: "Copy long bio" }),
    ).toBeVisible();

    await editor.getByRole("button", { name: "Add a file" }).click();
    await editor.getByLabel("Label").fill("Tech rider");
    await editor.locator('input[type="file"]').setInputFiles({
      name: "rider.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n"),
    });
    await expect(editor.getByText("PDF · 240 KB")).toHaveCount(2); // the row and its detail
    await expect(
      editor.getByRole("button", { name: "Replace file" }),
    ).toBeVisible();
    await expect(kit.getByText("Tech rider", { exact: true })).toBeVisible();
    await expect(kit.getByText("PDF · 240 KB", { exact: true })).toBeVisible();
    const download = kit.getByRole("link", {
      name: /^Download Tech rider, PDF · 240 KB/,
    });
    await expect(download).toHaveAttribute("href", `${PDF}?name=Tech%20rider`);

    await editor.getByRole("button", { name: "Done" }).click();
    await editor.getByRole("button", { name: "Add a file" }).click();
    await editor.getByLabel("Label").fill("Press kit");
    await editor.locator('input[type="file"]').setInputFiles({
      name: "kit.zip",
      mimeType: "application/zip",
      buffer: Buffer.from("PK\x03\x04"),
    });
    await expect(kit.getByText("ZIP · 18 MB", { exact: true })).toBeVisible();

    // The saved draft holds what was uploaded; the server restates it on save.
    await expect(status).toContainText("private draft in your account");
    expect(server.draft!.booking.files.map((file) => file.file)).toEqual([
      PDF,
      ZIP,
    ]);
    await expect(
      rail.getByRole("button", { name: /^Booking kit/ }),
    ).toContainText("2");
  });

  test("a file that is not a PDF or ZIP is turned away with a way forward", async ({
    page,
  }) => {
    const server = await mockAccount(page);
    await mount(page, studioBundle);
    const { editor, status } = regions(page);
    await expect(status).toContainText("private draft in your account");
    await addAddon(page, "Booking kit");
    await editor.getByRole("button", { name: "Add a file" }).click();
    await editor.getByLabel("Label").fill("Rider");

    await editor.locator('input[type="file"]').setInputFiles({
      name: "rider.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from("x"),
    });
    await expect(
      page.getByRole("alert").filter({ hasText: "Choose a PDF or ZIP file." }),
    ).toBeVisible();

    // Named like a PDF but refused by the server, which reads the bytes.
    server.uploadFailure = {
      status: 415,
      error:
        "Choose a JPG, PNG, WebP, GIF, MP3, WAV, Ogg, FLAC, M4A, PDF or ZIP file.",
    };
    await editor.locator('input[type="file"]').setInputFiles({
      name: "rider.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("MZ"),
    });
    await expect(
      page.getByRole("alert").filter({ hasText: "PDF or ZIP file." }),
    ).toBeVisible();
    await expect(
      editor.getByRole("button", { name: "Add file" }),
    ).toBeVisible();

    // Too big.
    await editor.locator('input[type="file"]').setInputFiles({
      name: "huge.zip",
      mimeType: "application/zip",
      buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
    });
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Choose a file smaller than 20 MB." }),
    ).toBeVisible();
  });

  test("files can be removed with Undo, and six is the limit", async ({
    page,
  }) => {
    await mockAccount(page);
    await mount(page, studioBundle);
    const { editor, status } = regions(page);
    await expect(status).toContainText("private draft in your account");
    await addAddon(page, "Booking kit");
    for (let index = 1; index <= 6; index += 1) {
      await editor
        .getByRole("button", { name: /Add a file|Limit of 6 reached/ })
        .click();
      await editor.getByLabel("Label").fill(`File ${index}`);
      await editor.getByRole("button", { name: "Done" }).click();
    }
    await expect(
      editor.getByRole("button", { name: "Limit of 6 reached" }),
    ).toBeDisabled();
    await editor.getByRole("button", { name: "Remove File 2" }).click();
    await expect(editor.getByText("Removed “File 2”.")).toBeVisible();
    await expect(
      editor.getByRole("button", { name: "Add a file" }),
    ).toBeEnabled();
    await editor.getByRole("button", { name: "Undo" }).click();
    await expect(editor.getByRole("button", { name: /^File 2/ })).toBeVisible();
    await expect(
      editor.getByRole("button", { name: "Limit of 6 reached" }),
    ).toBeDisabled();
  });

  test("the editor has no accessibility violations", async ({ page }) => {
    await mockAccount(page);
    await mount(page, studioBundle);
    const { editor, status } = regions(page);
    await expect(status).toContainText("private draft in your account");
    await addAddon(page, "Booking kit");
    await editor.getByRole("button", { name: "Add a file" }).click();
    const audit = await new AxeBuilder({ page })
      .include('[aria-label="Edit section"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });
});

test.describe("studio: device-only preview", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("keeps the example credits and refuses file uploads that have nowhere to live", async ({
    page,
  }) => {
    await page.goto(`${SHELL}?sample=1`);
    const { rail, editor, preview } = regions(page);
    await rail.getByRole("button", { name: /^Collaborators/ }).click();
    await expect(
      preview
        .getByRole("region", { name: "Collaborators" })
        .getByText("Toni Oliver"),
    ).toBeVisible();
    await editor.getByRole("button", { name: /^Toni Oliver/ }).click();
    await expect(
      editor.getByText("Shown on this example profile."),
    ).toBeVisible();
    await editor.getByRole("button", { name: "Done" }).click();
    await editor.getByRole("button", { name: "Add a collaborator" }).click();
    await editor.getByLabel("Name", { exact: true }).fill("Someone new");
    await editor.getByLabel("Missa handle").fill("someonenew");
    await expect(
      editor.getByText(
        "Confirmation needs an account. Once you publish, ask them to credit you back.",
      ),
    ).toBeVisible();
    // A credit that nobody has confirmed is not shown to visitors.
    await expect(
      preview
        .getByRole("region", { name: "Collaborators" })
        .getByText("Someone new"),
    ).toHaveCount(0);

    await rail.getByRole("button", { name: /^Booking kit/ }).click();
    await editor.getByRole("button", { name: /^Tech rider/ }).click();
    await editor.locator('input[type="file"]').setInputFiles({
      name: "rider.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-"),
    });
    await expect(
      page.getByRole("alert").filter({
        hasText: "Sign in to add files. They are stored with your account.",
      }),
    ).toBeVisible();
    await expect(
      preview
        .getByRole("region", { name: "Booking kit" })
        .getByText("PDF · 240 KB", { exact: true }),
    ).toBeVisible();
  });
});

const longPortfolio = {
  name: "Riley Chen",
  theme: "default",
  lens: "mixed",
  hero: "type",
  inquiries: true,
  modules: [
    { id: "collaborators", visible: true, added: true },
    { id: "booking", visible: true, added: true },
  ],
  collaborators: [
    {
      id: "c1",
      handle: "a-long-handle-that-keeps-going",
      name: "Wolfeschlegelsteinhausenbergerdorff-Pneumonoultramicroscopicsilicovolcanoconiosis",
      role: "Composed, arranged, recorded and mixed the score for a very long-titled work in three movements and a coda",
      confirmed: true,
    },
    {
      id: "c2",
      handle: "anareis",
      name: "Ana Reis",
      role: "",
      confirmed: true,
    },
  ],
  booking: {
    shortBio: "Riley Chen is a poet. ".repeat(12).trim(),
    longBio: `${"Riley Chen writes poems and records fields. ".repeat(20)}\n\n${"Second paragraph. ".repeat(20)}`,
    files: [
      {
        id: "f1",
        label:
          "Technical rider and stage plot for touring productions with a very long name",
        file: PDF,
        type: "pdf",
        bytes: 245_760,
      },
      {
        id: "f2",
        label: "Press kit",
        file: ZIP,
        type: "zip",
        bytes: 18 * 1024 * 1024,
      },
      { id: "f3", label: "Not yet described", file: ZIP },
    ],
  },
};

async function mountProfile(
  page: Page,
  viewer: Record<string, unknown> = {},
  portfolio: unknown = longPortfolio,
) {
  await page.route("**/api/profiles/rileychen/viewer", (route) =>
    route.fulfill({
      json: {
        signedIn: true,
        isOwner: false,
        following: false,
        inquiries: true,
        canCredit: false,
        senderName: "",
        senderEmail: "",
        organizations: [],
        ...viewer,
      },
    }),
  );
  await mount(page, profileBundle, { __portfolio: portfolio });
}

test.describe("visitor page", () => {
  for (const [label, width] of [
    ["desktop", 1280],
    ["phone", 390],
    ["200% zoom", 640],
  ] as const) {
    test(`long names and labels stay inside the page at ${label}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await mountProfile(page);
      const collaborators = page.getByRole("region", { name: "Collaborators" });
      const booking = page.getByRole("region", { name: "Booking kit" });
      await expect(collaborators).toBeVisible();
      await expect(booking).toBeVisible();
      for (const section of [collaborators, booking]) {
        const box = await section.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        const overflow = await section.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      // Each row's controls stay on screen, with the type and size beside the name.
      await expect(
        booking.getByText(
          "Technical rider and stage plot for touring productions with a very long name",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        booking.getByText("ZIP · 18 MB", { exact: true }),
      ).toBeVisible();
    });
  }

  test("every control on the phone is at least 44px tall", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mountProfile(page);
    for (const name of ["Collaborators", "Booking kit"]) {
      const section = page.getByRole("region", { name });
      for (const control of await section
        .locator("a:visible, button:visible")
        .filter({ hasNot: page.getByText("Confirmed", { exact: true }) })
        .all()) {
        const box = await control.boundingBox();
        expect(box!.height, await control.innerText()).toBeGreaterThanOrEqual(
          44,
        );
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      }
    }
    // The confirmed mark is a 28px chip with a 44px tap area.
    const mark = page
      .getByRole("region", { name: "Collaborators" })
      .getByRole("button", { name: /^Confirmed\./ })
      .first();
    const tapArea = await mark.evaluate((element) => {
      const after = getComputedStyle(element, "::after");
      return (
        element.getBoundingClientRect().height +
        Math.abs(parseFloat(after.top)) +
        Math.abs(parseFloat(after.bottom))
      );
    });
    expect(tapArea).toBeGreaterThanOrEqual(44);
  });

  test("a credit leads to the other profile and explains Confirmed in plain words", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mountProfile(page);
    const section = page.getByRole("region", { name: "Collaborators" });
    await expect(
      section.getByRole("link", { name: "Ana Reis" }),
    ).toHaveAttribute("href", "/@anareis");
    await expect(section.getByText("02")).toBeVisible();
    const mark = section
      .getByRole("button", { name: /^Confirmed\. What this means/ })
      .nth(1);
    await mark.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Ana Reis confirmed this")).toBeVisible();
    await expect(
      page.getByText(
        "Riley credits Ana Reis, and Ana Reis credits Riley back on Missa. A credit shows only when both do, and it stops showing if either removes the other.",
      ),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Ana Reis confirmed this")).toHaveCount(0);
    await expect(mark).toBeFocused();
  });

  test("a credit that is not confirmed never reaches a visitor, even if it is passed in", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mountProfile(
      page,
      {},
      {
        ...longPortfolio,
        collaborators: [
          {
            id: "c1",
            handle: "waiting",
            name: "Not Yet Confirmed",
            role: "Waiting",
            confirmed: false,
          },
        ],
      },
    );
    await expect(
      page.getByRole("region", { name: "Collaborators" }),
    ).toHaveCount(0);
    await expect(page.getByText("Not Yet Confirmed")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /Collaborators$/ }),
    ).toHaveCount(0);
  });

  test("Copy puts each bio on the clipboard, says so, and falls back to selecting it", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 1280, height: 900 });
    await mountProfile(
      page,
      {},
      {
        ...longPortfolio,
        booking: {
          ...longPortfolio.booking,
          shortBio: "Riley Chen is a poet and sound artist.",
          longBio:
            "Riley Chen writes poems.\n\nTheir first collection appeared in 2025.",
        },
      },
    );
    const kit = page.getByRole("region", { name: "Booking kit" });
    const copyShort = kit.getByRole("button", { name: "Copy short bio" });
    await copyShort.click();
    await expect(
      kit.getByRole("button", { name: "Copied short bio" }),
    ).toBeVisible();
    await expect(
      kit.getByRole("status").filter({ hasText: "Short bio copied." }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "Riley Chen is a poet and sound artist.",
    );
    await expect(
      kit.getByRole("button", { name: "Copy short bio" }),
    ).toBeVisible({ timeout: 5000 });

    await kit.getByRole("button", { name: "Copy long bio" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "Riley Chen writes poems.\n\nTheir first collection appeared in 2025.",
    );

    // A browser that refuses the clipboard: say so, and select the text.
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, "writeText", {
        configurable: true,
        value: () => Promise.reject(new Error("denied")),
      });
    });
    await kit.getByRole("button", { name: "Copy long bio" }).click();
    await expect(
      kit
        .getByRole("status")
        .filter({ hasText: "Couldn’t copy. The long bio is selected" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => window.getSelection()?.toString()),
    ).toContain("Riley Chen writes poems.");
  });

  test("a file shows its type and size and downloads under its label", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mountProfile(page);
    const kit = page.getByRole("region", { name: "Booking kit" });
    const rider = kit.getByRole("link", {
      name: /^Download Technical rider and stage plot.*PDF · 240 KB/,
    });
    await expect(rider).toHaveAttribute(
      "href",
      /\/aaaaaaaa-[a-f0-9-]+\?name=Technical%20rider/,
    );
    await expect(rider).toHaveAttribute("download", "");
    await expect(
      kit.getByRole("link", { name: /^Download Press kit, ZIP · 18 MB$/ }),
    ).toBeVisible();
    // A file with no facts is still offered, without a made-up type.
    const bare = kit.getByRole("link", {
      name: /^Download Not yet described$/,
    });
    await expect(bare).toBeVisible();
  });

  test("Credit as collaborator appears only for a signed-in visitor who is not the owner", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mountProfile(page, { canCredit: true });
    const credit = page.getByRole("link", { name: "Credit as collaborator" });
    await expect(credit).toBeVisible();
    await expect(credit).toHaveAttribute(
      "href",
      "/profile/portfolio?credit=rileychen",
    );
    await page.unroute("**/api/profiles/rileychen/viewer");
    await page.route("**/api/profiles/rileychen/viewer", (route) =>
      route.fulfill({
        json: {
          signedIn: false,
          isOwner: false,
          following: false,
          inquiries: true,
          canCredit: false,
          senderName: "",
          senderEmail: "",
          organizations: [],
        },
      }),
    );
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Credit as collaborator" }),
    ).toHaveCount(0);
  });

  for (const theme of ["default", "sage", "mineral", "night"] as const) {
    test(`both sections read in the ${theme} theme`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await mountProfile(page, {}, { ...longPortfolio, theme });
      await expect(
        page.locator(`[data-creator-theme="${theme}"]`).first(),
      ).toBeVisible();
      const audit = await new AxeBuilder({ page })
        .include('section[aria-label="Collaborators"]')
        .include('section[aria-label="Booking kit"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(audit.violations).toEqual([]);
    });
  }
});

test.describe("sample profile", () => {
  test("shows the example credits and booking kit from the design sample", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/design-system/creator-profile-v2");
    const people = page.getByRole("region", { name: "Collaborators" });
    await expect(people.getByText("Toni Oliver")).toBeVisible();
    await expect(people.getByText("Ana Reis")).toBeVisible();
    const kit = page.getByRole("region", { name: "Booking kit" });
    await expect(kit.getByText("PDF · 240 KB", { exact: true })).toBeVisible();
    await expect(kit.getByText("ZIP · 18 MB", { exact: true })).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Profile sections" })
        .getByRole("link", { name: /People/ }),
    ).toBeVisible();
  });
});
