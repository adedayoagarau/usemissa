import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  applyAutomaticRights,
  buildOpportunityBrowseQuery,
  decideAutomaticRights,
  extractMediaCandidates,
  insertMediaCandidate,
  isLogoLikeImage,
  MEDIA_RIGHTS_RULE_VERSION,
  promoteAttributedCandidate,
  recheckUnreviewedClearedAssets,
  reportUnreviewedClearedAssets,
  restoreRevertedAssets,
  SERVABLE_ASSET_RIGHTS,
  type DiscoveredMediaCandidate,
  type ExtractionMethod,
  type SourceRole,
} from "../src/index.js";
import { OPEN_GRAPH_AND_TWITTER_HTML } from "./fixtures/mockMediaFixtures.js";

const organizer = { organizerName: "Kalliope Arts", organizerWebsiteUrl: "https://www.kalliope.example/" };

function shareImage(overrides: Partial<DiscoveredMediaCandidate> = {}) {
  return {
    status: "reviewable" as const,
    extractionMethod: "open-graph" as ExtractionMethod,
    sourceRole: "official-opportunity-page" as SourceRole,
    pageUrl: "https://kalliope.example/calls/residency",
    resolvedUrl: "https://kalliope.example/images/residency-card.jpg",
    ...overrides,
  };
}

function shareImagePage(image: string, extra = ""): string {
  return `<html><head><meta property="og:image" content="${image}" />${extra}</head><body></body></html>`;
}

test("an og:image on the organizer's own site needs attribution to the organizer", () => {
  const decision = decideAutomaticRights(shareImage(), organizer);
  assert.equal(decision.rightsStatus, "needs-attribution");
  assert.equal(decision.reason, "official-share-image");
  assert.equal(decision.attributionRequirement, "Image: Kalliope Arts");
  assert.equal(decision.ruleVersion, MEDIA_RIGHTS_RULE_VERSION);

  const subdomain = decideAutomaticRights(shareImage({ pageUrl: "https://apply.kalliope.example/2026" }), organizer);
  assert.equal(subdomain.rightsStatus, "needs-attribution");

  const organizationPage = decideAutomaticRights(shareImage({ sourceRole: "organization-page" }), organizer);
  assert.equal(organizationPage.rightsStatus, "needs-attribution");
});

test("the rule never clears or permits an image", () => {
  const methods: ExtractionMethod[] = ["json-ld", "open-graph", "twitter", "dom-hero", "srcset", "organization-fallback"];
  const roles: SourceRole[] = [
    "official-opportunity-page", "organization-page", "program-page",
    "application-portal", "discovery-directory", "attachment",
  ];
  for (const extractionMethod of methods) {
    for (const sourceRole of roles) {
      const { rightsStatus } = decideAutomaticRights(shareImage({ extractionMethod, sourceRole }), organizer);
      assert.ok(["unknown", "needs-attribution"].includes(rightsStatus), `${extractionMethod}/${sourceRole} -> ${rightsStatus}`);
    }
  }
});

test("anything other than an og:image stays unknown for review", () => {
  for (const extractionMethod of ["twitter", "json-ld", "dom-hero", "srcset", "organization-fallback"] as const) {
    const decision = decideAutomaticRights(shareImage({ extractionMethod }), organizer);
    assert.equal(decision.rightsStatus, "unknown");
    assert.equal(decision.reason, "not-open-graph");
    assert.equal(decision.attributionRequirement, undefined);
  }
});

test("an og:image from a portal, directory, attachment or program page stays unknown", () => {
  for (const sourceRole of ["application-portal", "discovery-directory", "attachment", "program-page"] as const) {
    const decision = decideAutomaticRights(shareImage({ sourceRole }), organizer);
    assert.deepEqual([decision.rightsStatus, decision.reason], ["unknown", "not-official-page"]);
  }
});

test("an og:image is not the organizer's unless the page is on the organizer's recorded website", () => {
  const offSite = (pageUrl: string) => decideAutomaticRights(shareImage({ pageUrl }), organizer).reason;
  assert.equal(offSite("https://another-festival.example/call"), "page-off-organizer-site");
  assert.equal(offSite("https://notkalliope.example/call"), "page-off-organizer-site");
  assert.equal(offSite("https://kalliope.example.attacker.test/call"), "page-off-organizer-site");
  assert.equal(offSite("https://www.artconnect.com/opportunities/123"), "listing-site-page");

  assert.equal(
    decideAutomaticRights(shareImage({ resolvedUrl: "https://submittable.com/media/cover.jpg" }), organizer).reason,
    "listing-site-image",
  );
  assert.equal(decideAutomaticRights(shareImage(), { organizerName: "Kalliope Arts" }).reason, "no-organizer-website");
  assert.equal(
    decideAutomaticRights(shareImage({ pageUrl: "https://www.artconnect.com/org/kalliope" }), {
      organizerName: "Kalliope Arts",
      organizerWebsiteUrl: "https://www.artconnect.com/org/kalliope",
    }).reason,
    "listing-site-page",
  );
  assert.equal(
    decideAutomaticRights(shareImage(), { organizerName: "Kalliope Arts", organizerWebsiteUrl: "https://artconnect.com/kalliope" }).reason,
    "no-organizer-website",
  );
});

test("without an organizer name to credit, an og:image stays unknown", () => {
  for (const organizerName of [undefined, null, "", "   "]) {
    const decision = decideAutomaticRights(shareImage(), { ...organizer, organizerName });
    assert.deepEqual([decision.rightsStatus, decision.reason], ["unknown", "no-organizer-name"]);
  }
});

test("a rejected og:image stays rejected with unknown rights", () => {
  const decision = decideAutomaticRights(shareImage({ status: "rejected" }), organizer);
  assert.deepEqual([decision.rightsStatus, decision.reason], ["unknown", "candidate-rejected"]);
});

test("applying the rule to extracted candidates marks only the official og:image", () => {
  const { candidates } = extractMediaCandidates(OPEN_GRAPH_AND_TWITTER_HTML, {
    opportunityId: "opp_kalliope",
    title: "Kalliope Arts Residency 2026",
    pageUrl: "https://kalliope.example/calls/residency",
    sourceRole: "official-opportunity-page",
  });
  const ruled = candidates.map((candidate) => applyAutomaticRights(candidate, organizer));

  const og = ruled.find((c) => c.extractionMethod === "open-graph");
  assert.ok(og);
  assert.equal(og.status, "needs-attribution");
  assert.equal(og.rightsStatus, "needs-attribution");
  assert.equal(og.attributionText, "Image: Kalliope Arts");
  assert.equal(og.candidateKind, "opportunity-artwork");
  assert.deepEqual(og.metadata?.rightsRule, { version: MEDIA_RIGHTS_RULE_VERSION, reason: "official-share-image" });

  // The fixture's twitter:image is named "...twitter-card.jpg", which the
  // social-icon heuristic rejects; the rule leaves that status alone.
  const twitter = ruled.find((c) => c.extractionMethod === "twitter");
  assert.ok(twitter);
  assert.equal(twitter.status, "rejected");
  assert.equal(twitter.rightsStatus, "unknown");
  assert.deepEqual(twitter.metadata?.rightsRule, { version: MEDIA_RIGHTS_RULE_VERSION, reason: "candidate-rejected" });

  const [twitterCard] = extractMediaCandidates(
    `<html><head><meta name="twitter:image" content="https://kalliope.example/images/studio.jpg" /></head></html>`,
    { opportunityId: "opp_kalliope", title: "Kalliope", pageUrl: "https://kalliope.example/calls/residency", sourceRole: "official-opportunity-page" },
  ).candidates.map((candidate) => applyAutomaticRights(candidate, organizer));
  assert.equal(twitterCard.status, "reviewable");
  assert.equal(twitterCard.rightsStatus, "unknown");
  assert.deepEqual(twitterCard.metadata?.rightsRule, { version: MEDIA_RIGHTS_RULE_VERSION, reason: "not-open-graph" });

  for (const candidate of ruled) assert.ok(!["cleared", "permitted"].includes(candidate.rightsStatus));
});

test("a logo og:image is stored as organization-logo, never as card artwork", () => {
  const extract = (html: string) =>
    extractMediaCandidates(html, {
      opportunityId: "opp_logo",
      title: "Kalliope Arts Residency 2026",
      pageUrl: "https://kalliope.example/calls/residency",
      sourceRole: "official-opportunity-page",
    }).candidates.find((c) => c.extractionMethod === "open-graph");

  const logo = extract(shareImagePage("https://kalliope.example/brand/Kalliope-Logo-White.png"));
  assert.equal(logo?.candidateKind, "organization-logo");
  // The organizer's own logo may still carry the organizer's credit, but its
  // kind keeps it off card covers (it is promoted as organization-mark).
  assert.equal(applyAutomaticRights(logo!, organizer).rightsStatus, "needs-attribution");

  const altLogo = extract(shareImagePage("https://kalliope.example/share.png", `<meta property="og:image:alt" content="Kalliope Arts logo" />`));
  assert.equal(altLogo?.candidateKind, "organization-logo");

  const squareIcon = extract(
    shareImagePage(
      "https://kalliope.example/share-512.png",
      `<meta property="og:image:width" content="512" /><meta property="og:image:height" content="512" />`,
    ),
  );
  assert.equal(squareIcon?.candidateKind, "organization-logo");

  const photo = extract(
    shareImagePage(
      "https://kalliope.example/images/studio-athens.jpg",
      `<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />`,
    ),
  );
  assert.equal(photo?.candidateKind, "opportunity-artwork");
});

test("isLogoLikeImage separates logos, wordmarks and icons from photographs", () => {
  for (const url of [
    "https://example.org/wp-content/uploads/lambda-literary-logo.png",
    "https://example.org/assets/wordmark.png",
    "https://example.org/img/site-icon.png",
    "https://example.org/img/youngarts_logotype.jpg",
  ]) {
    assert.equal(isLogoLikeImage({ resolvedUrl: url }), true, url);
  }
  for (const url of [
    "https://example.org/images/pool-scene.jpg",
    "https://example.org/catalogo-2026/cover.jpg",
    "https://example.org/images/northern-stage-building.jpg",
  ]) {
    assert.equal(isLogoLikeImage({ resolvedUrl: url, width: 1200, height: 800 }), false, url);
  }
  assert.equal(isLogoLikeImage({ resolvedUrl: "https://example.org/a.jpg", width: 1080, height: 1080 }), false);
  assert.equal(isLogoLikeImage({ resolvedUrl: "https://example.org/a.png", width: 192, height: 192 }), true);
});

test("cards show the organizer's credited og:image, and logos only as a mark", () => {
  const { text } = buildOpportunityBrowseQuery({
    category: "all",
    types: [],
    disciplines: [],
    genres: [],
    locations: [],
    openNow: true,
    verifiedOnly: false,
    sort: "soonest-deadline",
    limit: 10,
  });
  const servable = "(a.rights_status in ('cleared', 'permitted') or (a.rights_status = 'needs-attribution' and a.attribution_requirement is not null))";
  assert.equal(SERVABLE_ASSET_RIGHTS, servable);
  assert.ok(text.includes(servable));
  assert.doesNotMatch(text, /rights_status = 'unknown'|'unknown'\)/);
  // The cover never uses a logo; the logo is selected separately as the mark.
  const cover = text.slice(text.indexOf("select asset_candidate.url"), text.indexOf(") asset on true"));
  assert.doesNotMatch(cover, /organization-mark|'logo'/);
  const logo = text.slice(text.indexOf("select logo_candidate.url"), text.indexOf(") logo on true"));
  assert.match(logo, /a\.kind = 'organization-mark'/);
  // A mark cleared in bulk with no reviewer is never shown.
  assert.ok(logo.includes("(a.reviewer is not null or a.reviewed_at is not null or a.rights_status = 'needs-attribution')"));
  assert.ok(logo.includes(servable));
  assert.match(text, /asset\.credit as identity_asset_credit/);
  assert.match(text, /logo\.url as identity_logo_url/);
  // Missa's stored copy is preferred over the organizer's original URL.
  assert.match(cover, /coalesce\(nullif\(a\.metadata->>'storedUrl', ''\), a\.url\)/);
});

test("the image backfill script never clears or permits rights", async () => {
  const source = await readFile(new URL("../../src/scripts/backfillRealOpportunityImages.ts", import.meta.url), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(code, /rights_status\s*=/i);
  assert.doesNotMatch(code, /insert\s+into\s+opportunity_identity_assets/i);
  assert.doesNotMatch(code, /update\s+opportunity_identity_assets/i);
  assert.match(code, /applyAutomaticRights/);
  assert.match(code, /insertMediaCandidate/);
  assert.match(code, /promoteAttributedCandidate/);
});

test("insertMediaCandidate stores the rule's rights and never overwrites a review", async () => {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const client = { query: async (text: string, values: unknown[]) => (calls.push({ text, values }), { rows: [] }) };
  const [extracted] = extractMediaCandidates(shareImagePage("https://kalliope.example/images/studio.jpg"), {
    opportunityId: "opp_kalliope",
    title: "Kalliope Arts Residency 2026",
    pageUrl: "https://kalliope.example/calls/residency",
    sourceRole: "official-opportunity-page",
  }).candidates;
  await insertMediaCandidate(client as never, applyAutomaticRights(extracted, organizer), { opportunityId: "opp_kalliope" });

  const [{ text, values }] = calls;
  assert.equal(values[18], "Image: Kalliope Arts"); // attribution_text
  assert.equal(values[26], "needs-attribution"); // status
  assert.equal(values[27], "needs-attribution"); // rights_status
  const onConflict = text.slice(text.indexOf("on conflict"));
  assert.doesNotMatch(onConflict, /[\s,](?:status|rights_status)\s*=/);
});

const CLEANUP_SCHEMA = `
  create table opportunity_sources(id text primary key, kind text, authority_kind text);
  create table radar_organizations(id text primary key, data jsonb not null);
  create table gary_profiles(id text primary key, name text, website_url text);
  create table opportunity_source_evidence(opportunity_id text, organization_confirmed boolean, checked_at timestamptz default now());
  create table opportunities(
    id text primary key, title text not null, publication_state text not null, organization_id text,
    source_id text, guidelines_url text, submission_url text
  );
  create table opportunity_identity_assets(
    id text primary key, opportunity_id text not null, url text not null, alt text,
    kind text not null, rights_status text not null, source_url text, width integer, height integer,
    reviewer text, reviewed_at timestamptz, evidence_passage text, attribution_requirement text,
    permitted_scope text, content_hash text, inheritance_level text not null default 'opportunity',
    linked_organization_id text, metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create table opportunity_media_candidates(
    id text primary key, opportunity_id text not null, job_id text, original_url text not null,
    resolved_url text not null, page_url text not null, source_role text not null, candidate_kind text not null,
    alt text, caption text, title text, width integer, height integer, mime_type text, file_size integer,
    retrieved_at timestamptz not null default now(), http_status integer, redirect_chain jsonb not null default '[]',
    content_hash text, attribution_text text, inheritance_level text not null, linked_organization_id text,
    linked_program_id text, extraction_method text not null, parser_version text not null, confidence text not null,
    rejection_reasons text[] not null default '{}', status text not null, rights_status text not null,
    metadata jsonb not null default '{}', created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (opportunity_id, resolved_url)
  );
  create table gary_profile_visuals(
    id text primary key, profile_id text not null, asset_type text not null, image_url text not null,
    label text, issue_year integer, season text, metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create table radar_enrichment_jobs(
    id text primary key, opportunity_id text not null, kind text not null, status text not null,
    next_attempt_at timestamptz not null default now(), lease_until timestamptz,
    updated_at timestamptz not null default now()
  );
`;

async function cleanupDatabase() {
  const db = new PGlite();
  await db.exec(CLEANUP_SCHEMA);
  await db.exec(`
    insert into opportunity_sources values ('src', 'official', null);
    insert into radar_organizations values
      ('org1', '{"name":"Cave Canem","website":"https://cavecanem.example"}'),
      ('org2', '{"name":"Northern Festival"}'),
      ('org3', '{"name":"Northern Stage"}');
    insert into gary_profiles values ('org2', 'Northern Festival', 'https://www.festival.example/');
    insert into opportunities values
      ('opp1', 'Cave Canem Fellowship', 'published', 'org1', 'src', 'https://cavecanem.example/fellowship', null),
      ('opp2', 'Festival Open Call', 'published', 'org2', 'src', 'https://festival.example/call', null),
      ('opp3', 'Stage Residency', 'published', 'org3', 'src', 'https://www.artconnect.com/opportunities/stage', null),
      ('opp4', 'Draft Call', 'draft', null, 'src', null, 'https://org.example/apply');
    insert into opportunity_identity_assets (id, opportunity_id, url, alt, kind, rights_status, width, height, reviewer, reviewed_at) values
      ('asset_opp1', 'opp1', 'https://cavecanem.example/favicon-logo.png', 'opp1 visual', 'opportunity-artwork', 'cleared', null, null, null, null),
      ('asset:hero:opp2', 'opp2', 'https://festival.example/pool-scene.jpg', 'Hero', 'opportunity-artwork', 'cleared', 1200, 800, null, null),
      ('asset_opp3', 'opp3', 'https://stage.example/building.jpg', 'opp3 visual', 'opportunity-artwork', 'cleared', null, null, null, null),
      ('reviewed_opp3', 'opp3', 'https://stage.example/reviewed.jpg', 'Reviewed', 'opportunity-artwork', 'cleared', 1200, 800, 'editor@missa', now()),
      ('mark_opp4', 'opp4', 'https://org.example/mark.png', 'Org mark', 'organization-mark', 'cleared', 400, 400, null, null),
      ('permitted_opp2', 'opp2', 'https://festival.example/permitted.jpg', 'Permitted', 'organization-mark', 'permitted', null, null, 'editor@missa', now()),
      ('unknown_opp1', 'opp1', 'https://cavecanem.example/other.jpg', 'Unknown', 'opportunity-artwork', 'unknown', null, null, null, null);
    insert into gary_profile_visuals (id, profile_id, asset_type, image_url, metadata) values
      ('org-media:copy', 'org4', 'logo', 'https://org.example/mark.png', '{"source":"opportunity_identity_assets","sourceId":"mark_opp4"}'),
      ('org-media:other', 'org4', 'logo', 'https://org.example/other.png', '{"source":"gary_organization_media","sourceId":"x"}');
    insert into radar_enrichment_jobs (id, opportunity_id, kind, status) values
      ('job1', 'opp1', 'media', 'completed'),
      ('job2', 'opp2', 'media', 'blocked'),
      ('job3', 'opp3', 'winners', 'completed'),
      ('job4', 'opp3', 'media', 'completed');
  `);
  const client = {
    async query(text: string, values?: unknown[]) {
      const result = await db.query(text, values);
      return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
    },
  };
  const rights = async () =>
    Object.fromEntries(
      (await db.query<{ id: string; rights_status: string }>("select id, rights_status from opportunity_identity_assets order by id")).rows.map(
        (row) => [row.id, row.rights_status],
      ),
    );
  return { db, client, rights };
}

// The organizers' pages as the re-check would fetch them.
const PAGES: Record<string, string> = {
  "https://cavecanem.example/fellowship": shareImagePage(
    "https://cavecanem.example/media/fellows-reading.jpg",
    `<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />`,
  ),
  "https://festival.example/call": shareImagePage("https://festival.example/brand/festival-logo.png"),
  "https://www.artconnect.com/opportunities/stage": shareImagePage("https://www.artconnect.com/uploads/stage.jpg"),
};
const fetchPage = async (url: string) => (PAGES[url] ? { html: PAGES[url], finalUrl: url } : null);

test("the cleanup report counts only cleared assets with no reviewer", async () => {
  const { client } = await cleanupDatabase();
  const report = await reportUnreviewedClearedAssets(client as never);
  assert.equal(report.total, 4);
  assert.deepEqual(report.byOrigin, { backfillRealOpportunityImages: 2, ingestAllCanonicalData: 1, other: 1 });
  assert.deepEqual(report.byKind, { "opportunity-artwork": 3, "organization-mark": 1 });
  assert.equal(report.logoLike, 2); // favicon-logo.png and the 400x400 mark
  assert.equal(report.onCards, 3);
  assert.equal(report.opportunitiesLosingCardImage, 2); // opp3 keeps its reviewed image
  assert.equal(report.profileVisualCopies, 1);
});

test("the re-check needs a named approver, and a dry run changes nothing", async () => {
  const { client, rights } = await cleanupDatabase();
  const before = await rights();
  await assert.rejects(recheckUnreviewedClearedAssets(client as never, { approvedBy: "  ", fetchPage }), /approval/);
  const preview = await recheckUnreviewedClearedAssets(client as never, { approvedBy: "", dryRun: true, fetchPage });
  assert.deepEqual(preview, {
    opportunities: 4,
    attributedImages: 2,
    attributedLogos: 1,
    pagesUnavailable: 1,
    needsReview: 1,
    reverted: 4,
    profileVisualCopiesRemoved: 0,
    mediaJobsRequeued: 0,
  });
  assert.deepEqual(await rights(), before);
});

test("the re-check keeps the organizer's own og:image, credited, and hides the rest", async () => {
  const { db, client, rights } = await cleanupDatabase();
  // The transaction runs on a fresh connection, released afterwards.
  let released = 0;
  const result = await recheckUnreviewedClearedAssets(client as never, {
    approvedBy: "Owner Name",
    fetchPage,
    connect: async () => ({ query: client.query, release: () => { released++; } }) as never,
  });
  assert.equal(released, 1);
  assert.deepEqual(result, {
    opportunities: 4,
    attributedImages: 2,
    attributedLogos: 1,
    pagesUnavailable: 1, // opp4's page is unreachable
    needsReview: 1, // opp3's page is a listing site
    reverted: 4,
    profileVisualCopiesRemoved: 1,
    mediaJobsRequeued: 1, // opp3; opp1 has an image again and opp2's job is blocked by robots.txt
  });

  assert.deepEqual(await rights(), {
    "asset:hero:opp2": "unknown",
    "asset:og:opp1": "needs-attribution",
    "asset:og:opp2": "needs-attribution",
    asset_opp1: "unknown",
    asset_opp3: "unknown",
    mark_opp4: "unknown",
    permitted_opp2: "permitted",
    reviewed_opp3: "cleared",
    unknown_opp1: "unknown",
  });

  const { rows: published } = await db.query<{
    id: string; url: string; kind: string; attribution_requirement: string; source_url: string;
    linked_organization_id: string | null; reviewer: string | null;
  }>(
    `select id, url, kind, attribution_requirement, source_url, linked_organization_id, reviewer
     from opportunity_identity_assets where id like 'asset:og:%' order by id`,
  );
  assert.deepEqual(published, [
    {
      id: "asset:og:opp1",
      url: "https://cavecanem.example/media/fellows-reading.jpg",
      kind: "opportunity-artwork",
      attribution_requirement: "Image: Cave Canem",
      source_url: "https://cavecanem.example/fellowship",
      linked_organization_id: null, // a call's own image is not shared with the organizer's other calls
      reviewer: null,
    },
    {
      id: "asset:og:opp2",
      url: "https://festival.example/brand/festival-logo.png",
      kind: "organization-mark", // a logo is the organization's mark, never a cover
      attribution_requirement: "Image: Northern Festival",
      source_url: "https://festival.example/call",
      linked_organization_id: "org2", // the mark stands for the organization on all its calls
      reviewer: null,
    },
  ]);

  const { rows: [reverted] } = await db.query<{ metadata: { rightsRevert: Record<string, unknown> } }>(
    "select metadata from opportunity_identity_assets where id = 'asset_opp1'",
  );
  assert.equal(reverted.metadata.rightsRevert.approvedBy, "Owner Name");
  assert.equal(reverted.metadata.rightsRevert.from, "cleared");

  const candidates = await db.query<{ opportunity_id: string; status: string }>(
    "select opportunity_id, status from opportunity_media_candidates order by opportunity_id",
  );
  assert.deepEqual(candidates.rows.map((row) => [row.opportunity_id, row.status]), [
    ["opp1", "needs-attribution"],
    ["opp2", "needs-attribution"],
    ["opp3", "reviewable"], // a listing site's image waits for a person
  ]);

  const visuals = await db.query<{ id: string }>("select id from gary_profile_visuals order by id");
  assert.deepEqual(visuals.rows.map((row) => row.id), ["org-media:other"]);
  const jobs = await db.query<{ id: string; status: string }>("select id, status from radar_enrichment_jobs order by id");
  assert.deepEqual(jobs.rows.map((row) => [row.id, row.status]), [
    ["job1", "completed"], ["job2", "blocked"], ["job3", "completed"], ["job4", "queued"],
  ]);

  // Nothing is left to re-check.
  assert.equal((await reportUnreviewedClearedAssets(client as never)).total, 0);

  // A person reviews one asset before the restore; the restore leaves it alone.
  await db.query("update opportunity_identity_assets set rights_status = 'rejected', reviewer = 'editor@missa', reviewed_at = now() where id = 'asset_opp3'");
  const restored = await restoreRevertedAssets(client as never);
  assert.deepEqual(restored, { restored: 3, profileVisualCopiesRestored: 1 });
  const after = await rights();
  assert.equal(after.asset_opp1, "cleared");
  assert.equal(after.asset_opp3, "rejected");
  assert.equal(after["asset:og:opp1"], "needs-attribution");
  const visualsAfter = await db.query<{ id: string }>("select id from gary_profile_visuals order by id");
  assert.deepEqual(visualsAfter.rows.map((row) => row.id), ["org-media:copy", "org-media:other"]);
});

test("publishing an organizer og:image never overwrites a person's review", async () => {
  const { db, client } = await cleanupDatabase();
  await db.query(
    `insert into opportunity_identity_assets (id, opportunity_id, url, kind, rights_status, reviewer, reviewed_at)
     values ('asset:og:opp1', 'opp1', 'https://cavecanem.example/media/fellows-reading.jpg', 'opportunity-artwork', 'rejected', 'editor@missa', now())`,
  );
  const [candidate] = extractMediaCandidates(PAGES["https://cavecanem.example/fellowship"], {
    opportunityId: "opp1",
    title: "Cave Canem Fellowship",
    pageUrl: "https://cavecanem.example/fellowship",
    sourceRole: "official-opportunity-page",
  }).candidates.map((c) => applyAutomaticRights(c, { organizerName: "Cave Canem", organizerWebsiteUrl: "https://cavecanem.example" }));
  assert.equal(candidate.rightsStatus, "needs-attribution");
  await promoteAttributedCandidate(client as never, candidate, { opportunityId: "opp1" });
  const { rows: [row] } = await db.query<{ rights_status: string }>("select rights_status from opportunity_identity_assets where id = 'asset:og:opp1'");
  assert.equal(row.rights_status, "rejected");

  // A candidate the rule did not accept is never published.
  assert.equal(
    await promoteAttributedCandidate(client as never, { ...candidate, rightsStatus: "unknown" }, { opportunityId: "opp2" }),
    undefined,
  );
});
