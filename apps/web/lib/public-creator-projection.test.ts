import assert from "node:assert/strict";
import test from "node:test";

import {
  portfolioSchema,
  publicPortfolioProjection,
} from "./creator-portfolio-schema.ts";
import { publicCreatorProjection } from "./public-creator-projection.ts";

test("public creator projection bounds published portfolio content", () => {
  const portfolio = portfolioSchema.parse({
    handle: "poet",
    name: "Public Poet",
    bio: "Public portfolio",
    selected: ["Writing"],
    works: Array.from({ length: 20 }, (_, index) => ({
      title: `Published work ${index + 1}`,
      text: "x".repeat(10_000),
      formats: ["Writing"],
    })),
  });
  const withoutText = publicCreatorProjection({
    canonicalPath: "/@poet",
    handle: "poet",
    profile: { displayName: "Public Poet", bio: "Public profile" },
    portfolio,
    workLimit: 8,
    includeWorkText: false,
  });
  assert.equal(withoutText.portfolio?.works.length, 8);
  assert.equal(withoutText.portfolio?.workCount, 20);
  assert.ok(withoutText.portfolio?.works.every((work) => !work.text));

  const withText = publicCreatorProjection({
    canonicalPath: "/@poet",
    handle: "poet",
    portfolio,
    workLimit: 2,
    includeWorkText: true,
  });
  assert.equal(withText.portfolio?.works.length, 2);
  assert.ok(
    withText.portfolio?.works.every((work) => work.text?.length === 3_000),
  );
  assert.ok(JSON.stringify(withText).length < 8_000);
});

test("public creator projection has no draft or workspace fields", () => {
  const projection = publicCreatorProjection({
    canonicalPath: "/profile/user_1",
    profile: { displayName: "Public Poet" },
    workLimit: 8,
    includeWorkText: false,
  });
  const serialized = JSON.stringify(projection);
  assert.doesNotMatch(
    serialized,
    /draft|tracker|application|library|settings/iu,
  );
});

test("public creator projection carries the add-ons visitors can see and nothing private", () => {
  const portfolio = publicPortfolioProjection(
    portfolioSchema.parse({
      handle: "poet",
      name: "Public Poet",
      modules: [
        { id: "services", visible: true, added: true },
        { id: "collaborators", visible: true, added: true },
        { id: "booking", visible: true, added: true },
        { id: "support", visible: true, added: true },
      ],
      services: [
        { id: "sv_1", title: "Commissioned poems", timing: "3 weeks" },
      ],
      collaborators: [
        {
          id: "c_1",
          handle: "toni",
          name: "Toni",
          role: "Score",
          confirmed: true,
        },
        { id: "c_2", handle: "ana", name: "Ana", role: "Design" },
      ],
      booking: { shortBio: "A poet.", longBio: "A longer bio." },
      support: { label: "Tip jar", url: "https://example.com/tip" },
    }),
  );
  const projection = publicCreatorProjection({
    canonicalPath: "/@poet",
    handle: "poet",
    portfolio,
    workLimit: 8,
    includeWorkText: false,
  }).portfolio!;
  assert.deepEqual(projection.services, [
    { title: "Commissioned poems", timing: "3 weeks", price: "", note: "" },
  ]);
  assert.deepEqual(projection.collaborators, [
    { name: "Toni", handle: "toni", role: "Score" },
  ]);
  assert.deepEqual(projection.booking, {
    shortBio: "A poet.",
    longBio: "A longer bio.",
  });
  assert.equal(projection.support.url, "https://example.com/tip");
  assert.doesNotMatch(JSON.stringify(projection), /"confirmed"|"id":/u);
});
