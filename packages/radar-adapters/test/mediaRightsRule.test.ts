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
  reportUnreviewedClearedAssets,
  restoreRevertedAssets,
  revertUnreviewedClearedAssets,
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

test("needs-attribution images are not served on public cards", () => {
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
  assert.match(text, /a\.rights_status in \('cleared', 'permitted'\)/);
  assert.doesNotMatch(text, /needs-attribution/);
});

test("the image backfill script queues candidates and never clears rights", async () => {
  const source = await readFile(new URL("../../src/scripts/backfillRealOpportunityImages.ts", import.meta.url), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(code, /rights_status/i);
  assert.doesNotMatch(code, /'cleared'|"cleared"/);
  assert.doesNotMatch(code, /opportunity_identity_assets\s*\(/i);
  assert.doesNotMatch(code, /update\s+opportunity_identity_assets/i);
  assert.match(code, /applyAutomaticRights/);
  assert.match(code, /insertMediaCandidate/);
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

async function cleanupDatabase() {
  const db = new PGlite();
  await db.exec(`
    create table opportunities(id text primary key, publication_state text not null);
    create table opportunity_identity_assets(
      id text primary key, opportunity_id text not null, url text not null, alt text,
      kind text not null, rights_status text not null, width integer, height integer,
      reviewer text, reviewed_at timestamptz, linked_organization_id text,
      metadata jsonb not null default '{}'::jsonb
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
    insert into opportunities values ('opp1','published'), ('opp2','published'), ('opp3','published'), ('opp4','draft');
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
      ('job3', 'opp3', 'winners', 'completed');
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

test("the cleanup needs a named approver and changes nothing without one", async () => {
  const { client, rights } = await cleanupDatabase();
  const before = await rights();
  await assert.rejects(revertUnreviewedClearedAssets(client as never, { approvedBy: "  " }), /approval/);
  assert.deepEqual(await rights(), before);
});

test("the cleanup reverts unreviewed cleared assets and can be restored", async () => {
  const { db, client, rights } = await cleanupDatabase();
  const result = await revertUnreviewedClearedAssets(client as never, { approvedBy: "Owner Name" });
  assert.deepEqual(result, { reverted: 4, profileVisualCopiesRemoved: 1, mediaJobsRequeued: 1 });

  assert.deepEqual(await rights(), {
    "asset:hero:opp2": "unknown",
    asset_opp1: "unknown",
    asset_opp3: "unknown",
    mark_opp4: "unknown",
    permitted_opp2: "permitted",
    reviewed_opp3: "cleared",
    unknown_opp1: "unknown",
  });
  const { rows: [reverted] } = await db.query<{ metadata: { rightsRevert: Record<string, unknown> } }>(
    "select metadata from opportunity_identity_assets where id = 'asset_opp1'",
  );
  assert.equal(reverted.metadata.rightsRevert.approvedBy, "Owner Name");
  assert.equal(reverted.metadata.rightsRevert.from, "cleared");

  const visuals = await db.query<{ id: string }>("select id from gary_profile_visuals order by id");
  assert.deepEqual(visuals.rows.map((row) => row.id), ["org-media:other"]);
  const jobs = await db.query<{ id: string; status: string }>("select id, status from radar_enrichment_jobs order by id");
  assert.deepEqual(jobs.rows.map((row) => [row.id, row.status]), [["job1", "queued"], ["job2", "blocked"], ["job3", "completed"]]);

  // Nothing is left to revert, and the public card query would now skip them.
  assert.equal((await reportUnreviewedClearedAssets(client as never)).total, 0);

  // A person reviews one asset before the restore; the restore leaves it alone.
  await db.query("update opportunity_identity_assets set rights_status = 'rejected', reviewer = 'editor@missa', reviewed_at = now() where id = 'asset_opp3'");
  const restored = await restoreRevertedAssets(client as never);
  assert.deepEqual(restored, { restored: 3, profileVisualCopiesRestored: 1 });
  const after = await rights();
  assert.equal(after.asset_opp1, "cleared");
  assert.equal(after.asset_opp3, "rejected");
  const visualsAfter = await db.query<{ id: string }>("select id from gary_profile_visuals order by id");
  assert.deepEqual(visualsAfter.rows.map((row) => row.id), ["org-media:copy", "org-media:other"]);
});
