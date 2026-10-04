import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import pg from "pg";

// Runs only in the relational suite (MISSA_E2E_RELATIONAL=1). Accounts are
// created through the real sign-up API; the database is touched directly only
// for facts sign-up can't create: an organization, its calls, a membership and
// an accepted decision behind a Confirmed credit.

const run = `${Date.now().toString(36)}${Math.random().toString(16).slice(2, 6)}`;
const handle = `e2e-riley-${run}`;
const db = () => new pg.Client({ connectionString: process.env.DATABASE_URL });

async function sql(text: string, values: unknown[] = []) {
  const client = db();
  await client.connect();
  try {
    return (await client.query(text, values)).rows;
  } finally {
    await client.end();
  }
}

async function signUp(browser: Browser, givenName: string, familyName: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = `${givenName.toLowerCase()}-${run}@example.com`;
  const response = await page.request.post("/api/auth/signup", {
    data: { email, password: "correct-horse-battery", givenName, familyName },
  });
  expect(response.status()).toBe(201);
  const token = response
    .headers()
    ["set-cookie"]?.match(/missa_session=([^;]+)/)?.[1];
  expect(token).toBeTruthy();
  await context.addCookies([
    {
      name: "missa_session",
      value: token!,
      url: new URL(response.url()).origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const [account] = await sql(
    "select id from radar_accounts where lower(email)=lower($1)",
    [email],
  );
  return { context, page, email, accountId: account!.id as string };
}

async function saveAndPublish(
  request: APIRequestContext,
  draft: Record<string, unknown>,
) {
  const state = await (
    await request.get("/api/creator/portfolio-draft")
  ).json();
  const saved = await request.put("/api/creator/portfolio-draft", {
    data: { draft, revision: state.revision ?? 0 },
  });
  expect(saved.status(), await saved.text()).toBe(200);
  const { revision } = await saved.json();
  const published = await request.post("/api/creator/portfolio-publish", {
    data: { revision },
  });
  expect(published.status(), await published.text()).toBe(200);
}

test("a published profile takes messages, follows and invitations, and re-checks Confirmed on every read", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const creator = await signUp(browser, "Riley", "Chen");
  const fan = await signUp(browser, "Sam", "Ito");
  const editor = await signUp(browser, "Ede", "Okon");

  // Organization, calls, membership and an accepted decision for the creator.
  const org = `org-${run}`;
  await sql(
    `insert into radar_organizations(id,data) values ($1, jsonb_build_object('id',$1::text,'name','The Quiet Review'))`,
    [org],
  );
  await sql(
    `insert into radar_memberships(account_id,organization_id,role,data) values ($1,$2,'owner','{"grantedAt":"2026-01-01T00:00:00Z"}')`,
    [editor.accountId, org],
  );
  const client = db();
  await client.connect();
  try {
    await client.query(
      `insert into opportunity_sources(id,organization_id,name,url,kind) values ($1,$2,'E2E source','https://example.com/calls','website')`,
      [`src-${run}`, org],
    );
    // The publication gate checks source evidence this fixture doesn't need.
    await client.query("set session_replication_role = replica");
    await client.query(
      `insert into opportunities(id,slug,title,organization_id,source_id,status,publication_state,type,deadline_date) values
       ($1,$1,'Spring reading period',$3,$4,'open','published','call',current_date + 40),
       ($2,$2,'Winter issue',$3,$4,'closed','published','call',current_date - 5)`,
      [`open-${run}`, `closed-${run}`, org, `src-${run}`],
    );
    await client.query("set session_replication_role = origin");
    await client.query(
      `insert into entities(id,organization_id,name) values ($1,$2,'Quiet Review Ltd')`,
      [`ent-${run}`, org],
    );
    await client.query(
      `insert into programs(id,entity_id,name) values ($1,$2,'Poetry')`,
      [`prog-${run}`, `ent-${run}`],
    );
    await client.query(
      `insert into open_calls(id,program_id,title) values ($1,$2,'Spring reading period')`,
      [`call-${run}`, `prog-${run}`],
    );
    await client.query(
      `insert into submission_paths(id,open_call_id,categories,fields) values ($1,$2,'[]','[]')`,
      [`path-${run}`, `call-${run}`],
    );
    await client.query(
      `insert into submissions(id,submission_path_id,submitter_account_id) values ($1,$2,$3)`,
      [`sub-${run}`, `path-${run}`, creator.accountId],
    );
    await client.query(
      `insert into works(id,submission_id,title,"order") values ($1,$2,'Tidal glossary',0)`,
      [`work-${run}`, `sub-${run}`],
    );
    await client.query(
      `insert into decisions(id,work_id,outcome,decided_by_account_id) values ($1,$2,'accepted',$3)`,
      [`dec-${run}`, `work-${run}`, editor.accountId],
    );
  } finally {
    await client.end();
  }

  // The creator claims a handle and publishes a profile with a Confirmed credit.
  const claimed = await creator.page.request.post("/api/me/handles", {
    data: { handle },
  });
  expect(claimed.ok(), await claimed.text()).toBeTruthy();
  const outcomes = await (
    await creator.page.request.get("/api/creator/portfolio-outcomes")
  ).json();
  expect(
    outcomes.outcomes.map((o: { outcomeId: string }) => o.outcomeId),
  ).toContain(`dec-${run}`);
  await saveAndPublish(creator.page.request, {
    name: "Riley Chen",
    statement: "Poems about how places carry memory.",
    works: [
      {
        id: "w1",
        title: "Tidal glossary",
        text: "Neap, spring, slack water.\nThe words for waiting.",
        featured: true,
      },
    ],
    record: [
      {
        id: "r1",
        kind: "publication",
        title: "Typed by the creator",
        venue: "Anything",
        year: "2026",
        outcomeId: `dec-${run}`,
      },
    ],
  });

  // Visitors: the live page, its CV and its share image.
  const visitor = await browser.newContext({
    extraHTTPHeaders: {
      "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200)}`,
    },
  });
  const page = await visitor.newPage();
  await page.goto(`/@${handle}`);
  await expect(page).toHaveURL(new RegExp(`/@${handle}$`));
  await expect(
    page.getByRole("heading", { name: "Riley Chen", level: 1 }),
  ).toBeVisible();
  const record = page.getByRole("region", { name: "Track record" });
  await expect(
    record.getByRole("button", { name: /^Confirmed\./ }),
  ).toHaveCount(1);
  await expect(record).toContainText("Tidal glossary");
  await expect(record).not.toContainText("Typed by the creator");
  expect(await page.content()).not.toContain(`dec-${run}`);
  expect(await page.content()).not.toContain(creator.email);
  const audit = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);

  const cv = await page.request.get(`/@${handle}/cv`);
  expect(cv.status()).toBe(200);
  expect(await cv.text()).toContain("Tidal glossary");
  const share = await page.request.get(`/@${handle}/share.png`);
  expect(share.status()).toBe(200);
  expect(share.headers()["content-type"]).toBe("image/png");

  // Anyone can write; the creator's address is never exposed.
  await page.getByRole("button", { name: "Get in touch" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Your name").fill("Ada Mensah");
  await dialog.getByLabel("Your email").fill("ada@example.com");
  await dialog
    .getByLabel("Message")
    .fill("Could we talk about commissioning a sequence?");
  await dialog.getByRole("button", { name: "Send message" }).click();
  await expect(dialog.getByRole("status")).toContainText("Sent.");
  const viewer = await page.request.get(`/api/profiles/${handle}/viewer`);
  expect(await viewer.text()).not.toContain(creator.email);
  await dialog.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Follow" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);

  // A signed-in member follows.
  await fan.page.goto(`/@${handle}`);
  await fan.page.getByRole("button", { name: "Follow", exact: true }).click();
  await expect(fan.page.getByRole("button", { name: "Following" })).toBeVisible(
    { timeout: 15_000 },
  );
  await expect(
    fan.page.getByRole("button", { name: "Invite to apply" }),
  ).toHaveCount(0);

  // An organization owner invites to an open call only.
  await editor.page.goto(`/@${handle}`);
  await editor.page.getByRole("button", { name: "Invite to apply" }).click();
  const invite = editor.page.getByRole("dialog");
  await expect(invite.getByLabel("Call").locator("option")).toHaveText([
    /Spring reading period/,
  ]);
  await invite.getByLabel(/Note to Riley/).fill("We loved Tidal glossary.");
  await invite.getByRole("button", { name: "Send invitation" }).click();
  await expect(invite.getByRole("status")).toContainText("Invitation sent");
  const closed = await editor.page.request.post(
    `/api/profiles/${handle}/invitations`,
    {
      data: {
        organizationId: org,
        opportunityId: `closed-${run}`,
        message: "",
      },
    },
  );
  expect(closed.status()).toBe(400);

  // The creator sees everything in their profile inbox.
  await creator.page.goto(`/@${handle}`);
  await expect(
    creator.page.getByRole("button", { name: "Follow", exact: true }),
  ).toHaveCount(0);
  await creator.page.goto("/profile/inbox");
  await expect(
    creator.page.getByRole("heading", { name: "Profile inbox" }),
  ).toBeVisible();
  await expect(
    creator.page.getByRole("tabpanel", { name: /Messages/ }),
  ).toContainText("Ada Mensah");
  await creator.page
    .getByRole("button", { name: "Archive", exact: true })
    .click();
  await creator.page.getByRole("tab", { name: /Invitations/ }).click();
  await expect(
    creator.page.getByRole("tabpanel", { name: /Invitations/ }),
  ).toContainText("Spring reading period");
  await creator.page.getByRole("button", { name: "Not for me" }).click();
  await creator.page.getByRole("tab", { name: /Followers/ }).click();
  await expect(
    creator.page.getByRole("tabpanel", { name: /Followers/ }),
  ).toContainText("Sam");
  await expect
    .poll(
      async () =>
        (
          await sql(
            "select status from creator_invitations where creator_account_id=$1",
            [creator.accountId],
          )
        )[0]?.status,
    )
    .toBe("declined");

  // A withdrawn decision stops showing as Confirmed without a republish.
  await sql("update decisions set outcome='declined' where id=$1", [
    `dec-${run}`,
  ]);
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Track record" })
      .getByRole("button", { name: /^Confirmed\./ }),
  ).toHaveCount(0);

  for (const context of [visitor, creator.context, fan.context, editor.context])
    await context.close();
});
