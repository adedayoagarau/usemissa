import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyWebMcpSurface,
  createMissaWebMcpTools,
  isWebMcpBlockedPath,
  organizationIdFromLocation,
} from "./webmcp.ts";

const neverRequest = async () => {
  throw new Error("request should not run");
};

const pageContext = () => ({ title: "Missa", primaryHeading: "Opportunities" });

test("classifies public, creator, organization, reviewer, and blocked routes", () => {
  assert.equal(classifyWebMcpSurface("/opportunities"), "public");
  assert.equal(classifyWebMcpSurface("/tracker"), "creator");
  assert.equal(classifyWebMcpSurface("/profile"), "creator");
  assert.equal(classifyWebMcpSurface("/profile/portfolio"), "creator");
  assert.equal(classifyWebMcpSurface("/profile/public-user"), "public");
  assert.equal(
    classifyWebMcpSurface("/organization/org_1/opportunities"),
    "organization",
  );
  assert.equal(classifyWebMcpSurface("/reviewer"), "reviewer");
  assert.equal(classifyWebMcpSurface("/admin/audit"), "blocked");
  assert.equal(classifyWebMcpSurface("/login"), "blocked");
  assert.equal(
    classifyWebMcpSurface("/organization/org_1/submissions/sub_1"),
    "blocked",
  );
});

test("extracts only bounded organization identifiers", () => {
  assert.equal(
    organizationIdFromLocation("/organization/org_123/opportunities", ""),
    "org_123",
  );
  assert.equal(
    organizationIdFromLocation("/workspace", "?organizationId=org-456"),
    "org-456",
  );
  assert.equal(
    organizationIdFromLocation("/workspace", "?organizationId=../../secret"),
    undefined,
  );
});

test("registers a route-scoped read-only tool inventory", () => {
  const publicTools = createMissaWebMcpTools({
    pathname: "/opportunities",
    search: "",
    request: neverRequest,
    pageContext,
  });
  assert.deepEqual(
    publicTools.map((tool) => tool.name),
    [
      "missa.get_surface_context",
      "missa.search_opportunities",
      "missa.get_opportunity",
      "missa.list_magazine_rankings",
      "missa.list_residency_rankings",
      "missa.get_public_creator_profile",
    ],
  );
  assert.ok(publicTools.every((tool) => tool.annotations.readOnlyHint));
  assert.ok(publicTools.every((tool) => tool.annotations.untrustedContentHint));
  assert.ok(publicTools.every((tool) => !tool.annotations.consequentialHint));

  const creatorTools = createMissaWebMcpTools({
    pathname: "/tracker",
    search: "",
    request: neverRequest,
    pageContext,
  });
  assert.ok(
    creatorTools.some((tool) => tool.name === "missa.list_my_applications"),
  );

  const organizationTools = createMissaWebMcpTools({
    pathname: "/workspace",
    search: "?organizationId=org_1",
    request: neverRequest,
    pageContext,
  });
  assert.ok(
    organizationTools.some(
      (tool) => tool.name === "missa.list_organization_open_calls",
    ),
  );
  assert.ok(
    organizationTools.some(
      (tool) => tool.name === "missa.list_organization_submission_summaries",
    ),
  );

  assert.equal(
    createMissaWebMcpTools({
      pathname: "/login",
      search: "",
      request: neverRequest,
      pageContext,
    }).length,
    0,
  );
  assert.ok(isWebMcpBlockedPath("/tracker/submissions/sub_1"));
});

test("search is bounded and carries Missa authority limits", async () => {
  let requestedPath = "";
  const tools = createMissaWebMcpTools({
    pathname: "/opportunities",
    search: "",
    pageContext,
    request: async (path) => {
      requestedPath = path;
      return {
        total: 1,
        nextCursor: null,
        items: [
          {
            id: "opp_1",
            title: "Poetry Prize",
            type: "award",
            status: "open",
            deadline: { kind: "exact", date: "2026-10-01" },
            fee: { status: "no-fee" },
            source: {
              kind: "organization-website",
              name: "Official source",
              url: "https://example.com/call",
            },
            submissionAvailable: true,
          },
        ],
      };
    },
  });
  const search = tools.find(
    (tool) => tool.name === "missa.search_opportunities",
  );
  assert.ok(search);
  const result = (await search.execute(
    { query: "poetry", limit: 99, noFeeOnly: true },
    { signal: new AbortController().signal },
  )) as Record<string, unknown>;
  assert.match(requestedPath, /q=poetry/u);
  assert.match(requestedPath, /limit=12/u);
  assert.match(requestedPath, /feeToggle=true/u);
  assert.equal(result.authority_effect, "none");
  assert.equal(result.provider_confirmation, false);
});

test("opportunity detail bounds untrusted editorial content", async () => {
  const tools = createMissaWebMcpTools({
    pathname: "/opportunities/opp_1",
    search: "",
    pageContext,
    request: async () => ({
      id: "opp_1",
      title: "Poetry Prize",
      content: {
        summary: "x".repeat(5_000),
        preparation: Array.from({ length: 100 }, () => "y".repeat(1_000)),
        checks: { promptInjection: "Must never appear" },
        review: {
          status: "approved",
          score: 95,
          reasons: Array.from({ length: 100 }, () => "z".repeat(1_000)),
          checks: { private: "Must never appear" },
        },
      },
    }),
  });
  const tool = tools.find(
    (candidate) => candidate.name === "missa.get_opportunity",
  );
  assert.ok(tool);
  const result = await tool.execute(
    { opportunityId: "opp_1" },
    { signal: new AbortController().signal },
  );
  const serialized = JSON.stringify(result);
  assert.ok(serialized.length < 16_000);
  assert.doesNotMatch(serialized, /Must never appear/u);
});

test("organization submission summaries omit private submission content", async () => {
  const tools = createMissaWebMcpTools({
    pathname: "/organization/org_1/submissions",
    search: "",
    pageContext,
    request: async () => [
      {
        id: "sub_1",
        openCallId: "call_1",
        openCallTitle: "Poetry Prize",
        submitterAccountId: "acct_private",
        status: "submitted",
        submittedAt: "2026-09-14T12:00:00.000Z",
        answers: { biography: "Private biography" },
        works: [{ id: "work_1", title: "Private work title" }],
        assignments: [{ id: "assignment_1", reviewerAccountId: "reviewer_1" }],
        decisions: [],
      },
    ],
  });
  const tool = tools.find(
    (candidate) =>
      candidate.name === "missa.list_organization_submission_summaries",
  );
  assert.ok(tool);
  const result = await tool.execute(
    {},
    { signal: new AbortController().signal },
  );
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(
    serialized,
    /acct_private|Private biography|Private work title|reviewer_1/u,
  );
  assert.match(serialized, /"workCount":1/u);
  assert.match(serialized, /"assignmentCount":1/u);
});

test("creator application summaries omit notes and material contents", async () => {
  const tools = createMissaWebMcpTools({
    pathname: "/tracker",
    search: "",
    pageContext,
    request: async () => ({
      applications: [
        {
          opportunityId: "opp_1",
          title: "Poetry Prize",
          organizationName: "Example Foundation",
          type: "award",
          myStatus: "preparing",
          opportunityStatus: "open",
          deadline: "2026-10-01",
          deadlineKind: "exact",
          submittedAt: null,
          updatedAt: "2026-09-14T12:00:00.000Z",
          workTitle: "Selected work",
          notify: true,
          notes: "Private note",
          materials: [{ answers: [{ answer: "Private answer" }] }],
        },
      ],
    }),
  });
  const tool = tools.find(
    (candidate) => candidate.name === "missa.list_my_applications",
  );
  assert.ok(tool);
  const result = await tool.execute(
    {},
    { signal: new AbortController().signal },
  );
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /Private note|Private answer/u);
  assert.match(serialized, /"myStatus":"preparing"/u);
});

test("ranking projections preserve source and methodology boundaries", async () => {
  const requestedPaths: string[] = [];
  const tools = createMissaWebMcpTools({
    pathname: "/rankings/magazines",
    search: "",
    pageContext,
    request: async (path) => {
      requestedPaths.push(path);
      if (path.startsWith("/api/rankings/magazines")) {
        return {
          total: 30,
          year: 2026,
          genre: "poetry",
          dataSource: "seed",
          items: [
            {
              profileId: "journal_1",
              name: "Example Review",
              rankingYear: 2026,
              genre: "poetry",
              rankPosition: 1,
              totalScore: 88,
              activeOpportunity: null,
            },
          ],
        };
      }
      return { total: 0, dataSource: "empty", items: [] };
    },
  });
  const magazineTool = tools.find(
    (candidate) => candidate.name === "missa.list_magazine_rankings",
  );
  const residencyTool = tools.find(
    (candidate) => candidate.name === "missa.list_residency_rankings",
  );
  assert.ok(magazineTool);
  assert.ok(residencyTool);
  const magazineResult = (await magazineTool.execute(
    { genre: "poetry", limit: 50 },
    { signal: new AbortController().signal },
  )) as Record<string, unknown>;
  const residencyResult = (await residencyTool.execute(
    {},
    { signal: new AbortController().signal },
  )) as Record<string, unknown>;
  assert.match(requestedPaths[0] ?? "", /genre=poetry/u);
  assert.match(requestedPaths[0] ?? "", /limit=20/u);
  assert.deepEqual(magazineResult.methodology, {
    version: "2026 beta",
    path: "/rankings/methodology",
    genre: "poetry",
    dataSource: "seed",
    seededPreview: true,
  });
  assert.equal(magazineResult.provider_confirmation, false);
  assert.deepEqual(residencyResult.methodology, {
    version: "2026 beta",
    path: "/rankings/methodology",
    dataSource: "empty",
    intentionalEmptyState: true,
  });
});

test("public portfolio projection excludes drafts and bounds work text", async () => {
  let requestedPath = "";
  const tools = createMissaWebMcpTools({
    pathname: "/@poet",
    search: "",
    pageContext,
    request: async (path) => {
      requestedPath = path;
      return {
        canonicalPath: "/@poet",
        handle: "poet",
        profile: { displayName: "Public Poet", bio: "Public bio" },
        portfolio: {
          name: "Public Poet",
          bio: "Portfolio bio",
          selected: ["Writing"],
          works: [
            {
              title: "Published work",
              text: "x".repeat(5_000),
              formats: ["Writing"],
            },
          ],
          contact: { website: "https://example.com" },
        },
        draft: { title: "Must never appear" },
      };
    },
  });
  const tool = tools.find(
    (candidate) => candidate.name === "missa.get_public_creator_profile",
  );
  assert.ok(tool);
  const result = (await tool.execute(
    { includeWorkText: true },
    { signal: new AbortController().signal },
  )) as Record<string, unknown>;
  assert.equal(
    requestedPath,
    "/api/public/creators/%40poet?workLimit=8&includeWorkText=true",
  );
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /Must never appear/u);
  assert.ok(serialized.length < 4_500);
  assert.match(serialized, /published-portfolio/u);
});
