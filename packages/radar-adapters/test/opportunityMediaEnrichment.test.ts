import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  extractMediaCandidates,
  evaluateRejection,
  parseSrcset,
  normalizeMediaUrl,
  inferSourceRole,
  reviewMediaCandidate,
  runDryRun,
  buildOpportunityBrowseQuery,
} from "../src/index.js";
import {
  OFFICIAL_CALL_JSON_LD_HTML,
  OPEN_GRAPH_AND_TWITTER_HTML,
  DOM_HERO_AND_SRCSET_HTML,
  NOISY_PAGE_WITH_REJECTIONS_HTML,
  DISCOVERY_DIRECTORY_PAGE_HTML,
  ORGANIZATION_ONLY_PAGE_HTML,
} from "./fixtures/mockMediaFixtures.js";

test("1. JSON-LD discovery extracts image, primaryImageOfPage, and logo in graph hierarchy", () => {
  const result = extractMediaCandidates(OFFICIAL_CALL_JSON_LD_HTML, {
    opportunityId: "opp_json_ld",
    title: "2026 International Poetry Fellowship",
    pageUrl: "https://poetryfoundation.example/fellowship-2026",
    sourceRole: "official-opportunity-page",
    organizationId: "org_poetry_foundation",
    organizationConfirmed: true,
  });

  assert.ok(result.candidates.length >= 2);
  const cover = result.candidates.find((c) => c.resolvedUrl.includes("fellowship-call-cover.jpg"));
  assert.ok(cover, "Should find fellowship call cover from JSON-LD image");
  assert.equal(cover?.extractionMethod, "json-ld");
  assert.equal(cover?.candidateKind, "opportunity-artwork");
  assert.equal(cover?.width, 1200);
  assert.equal(cover?.height, 800);
  assert.equal(cover?.rightsStatus, "unknown");
  assert.equal(cover?.status, "reviewable");

  const primary = result.candidates.find((c) => c.resolvedUrl.includes("fellowship-hero-primary.jpg"));
  assert.ok(primary, "Should find primaryImageOfPage from JSON-LD");
  assert.equal(primary?.status, "reviewable");
});

test("2. Open Graph and Twitter Card candidate discovery extracts dimensions and alt text", () => {
  const result = extractMediaCandidates(OPEN_GRAPH_AND_TWITTER_HTML, {
    opportunityId: "opp_og_twitter",
    title: "Kalliope Arts Residency 2026",
    pageUrl: "https://kalliope.example/calls/residency",
    sourceRole: "official-opportunity-page",
  });

  const og = result.candidates.find((c) => c.extractionMethod === "open-graph");
  assert.ok(og, "Should extract Open Graph candidate");
  assert.equal(og?.resolvedUrl, "https://kalliope.example/images/residency-card.jpg");
  assert.equal(og?.width, 1200);
  assert.equal(og?.height, 630);
  assert.equal(og?.alt, "Studio workspaces in Athens");
  assert.equal(og?.mimeType, "image/jpeg");
  assert.equal(og?.status, "reviewable");

  const tw = result.candidates.find((c) => c.extractionMethod === "twitter");
  assert.ok(tw, "Should extract Twitter card candidate");
  assert.equal(tw?.resolvedUrl, "https://kalliope.example/images/residency-twitter-card.jpg");
  assert.equal(tw?.alt, "Kalliope Residency studio view");
});

test("3. DOM artwork and srcset candidates parse relative URLs and select best resolution", () => {
  const result = extractMediaCandidates(DOM_HERO_AND_SRCSET_HTML, {
    opportunityId: "opp_dom_hero",
    title: "Emerging Sculptors Biennial Prize",
    pageUrl: "https://sculptureprize.example/biennial",
    sourceRole: "official-opportunity-page",
  });

  const hero = result.candidates.find((c) => c.extractionMethod === "srcset" || c.extractionMethod === "dom-hero");
  assert.ok(hero, "Should find DOM hero artwork");
  assert.equal(hero?.resolvedUrl, "https://sculptureprize.example/assets/sculpture-prize-1600w.jpg");
  assert.equal(hero?.width, 1600);
  assert.equal(hero?.status, "reviewable");
});

test("4. Rejection heuristics eliminate tracking pixels, favicons, avatars, ads, and platform branding", () => {
  const result = extractMediaCandidates(NOISY_PAGE_WITH_REJECTIONS_HTML, {
    opportunityId: "opp_noisy",
    title: "Winter Grants",
    pageUrl: "https://grants.example.com/apply",
    sourceRole: "application-portal",
    minWidth: 200,
    minHeight: 200,
  });

  // Trackers and noisy icons should be rejected
  const tracking = result.candidates.find((c) => c.resolvedUrl.includes("pixel=1"));
  assert.ok(tracking, "Should record tracking candidate");
  assert.equal(tracking?.status, "rejected");
  assert.ok(tracking?.rejectionReasons.includes("tracking-pixel"));

  const favicon = result.candidates.find((c) => c.resolvedUrl.includes("apple-touch-icon"));
  assert.ok(favicon);
  assert.equal(favicon?.status, "rejected");
  assert.ok(favicon?.rejectionReasons.includes("favicon-or-icon"));

  const social = result.candidates.find((c) => c.resolvedUrl.includes("facebook.svg"));
  assert.ok(social);
  assert.equal(social?.status, "rejected");
  assert.ok(social?.rejectionReasons.includes("social-icon"));

  const avatar = result.candidates.find((c) => c.resolvedUrl.includes("gravatar.com"));
  assert.ok(avatar);
  assert.equal(avatar?.status, "rejected");
  assert.ok(avatar?.rejectionReasons.includes("avatar"));

  const stock = result.candidates.find((c) => c.resolvedUrl.includes("unsplash.com"));
  assert.ok(stock);
  assert.equal(stock?.status, "rejected");
  assert.ok(stock?.rejectionReasons.includes("generic-stock-photography"));

  const submittable = result.candidates.find((c) => c.resolvedUrl.includes("submittable-logo"));
  assert.ok(submittable);
  assert.equal(submittable?.status, "rejected");
  assert.ok(submittable?.rejectionReasons.includes("application-platform-branding"));

  const tiny = result.candidates.find((c) => c.resolvedUrl.includes("tiny-thumbnail"));
  assert.ok(tiny);
  assert.equal(tiny?.status, "rejected");
  assert.ok(tiny?.rejectionReasons.some((r) => r.includes("below-useful-size")));

  // Authentic artwork must pass reviewable
  const authentic = result.candidates.find((c) => c.resolvedUrl.includes("authentic-winter-grant-cover.jpg"));
  assert.ok(authentic, "Authentic artwork must be discovered");
  assert.equal(authentic?.status, "reviewable");
  assert.equal(authentic?.rejectionReasons.length, 0);
  assert.equal(authentic?.rightsStatus, "unknown");
});

test("5. Directory branding is rejected when source role is discovery-directory", () => {
  const result = extractMediaCandidates(DISCOVERY_DIRECTORY_PAGE_HTML, {
    opportunityId: "opp_dir",
    title: "Listed Call",
    pageUrl: "https://www.pw.org/classifieds/123",
    sourceRole: "discovery-directory",
  });

  assert.ok(result.candidates.length > 0);
  for (const c of result.candidates) {
    assert.equal(c.status, "rejected");
    assert.ok(c.rejectionReasons.includes("directory-branding"));
  }
});

test("6. Organization fallback media is inherited only when confirmed", () => {
  // Scenario A: Relationship is confirmed -> organization fallback is allowed and tagged
  const confirmedResult = extractMediaCandidates(ORGANIZATION_ONLY_PAGE_HTML, {
    opportunityId: "opp_whiting",
    title: "Whiting Awards Call",
    pageUrl: "https://whiting.example/about",
    sourceRole: "organization-page",
    organizationId: "org_whiting",
    organizationConfirmed: true,
  });

  const orgCandidate = confirmedResult.candidates.find((c) => c.resolvedUrl.includes("whiting-foundation-mark.png"));
  assert.ok(orgCandidate, "Should find organization logo");
  assert.equal(orgCandidate?.inheritanceLevel, "organization");
  assert.equal(orgCandidate?.candidateKind, "organization-logo");
  assert.equal(orgCandidate?.linkedOrganizationId, "org_whiting");
  assert.equal(orgCandidate?.status, "reviewable");

  // Scenario B: Relationship is unconfirmed -> inheritance is rejected
  const unconfirmedResult = extractMediaCandidates(ORGANIZATION_ONLY_PAGE_HTML, {
    opportunityId: "opp_whiting_unconfirmed",
    title: "Whiting Awards Call",
    pageUrl: "https://whiting.example/about",
    sourceRole: "organization-page",
    organizationId: "org_whiting",
    organizationConfirmed: false,
  });

  const unconfirmedCandidate = unconfirmedResult.candidates.find((c) => c.resolvedUrl.includes("whiting-foundation-mark.png"));
  assert.ok(unconfirmedCandidate);
  assert.equal(unconfirmedCandidate?.status, "rejected");
  assert.ok(unconfirmedCandidate?.rejectionReasons.includes("unconfirmed-organization-inheritance"));
});

test("7. parseSrcset accurately parses multi-density and multi-width descriptors", () => {
  const parsed = parseSrcset("image-100.jpg 100w, image-200.jpg 200w, image-300.jpg 2x");
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].url, "image-100.jpg");
  assert.equal(parsed[0].width, 100);
  assert.equal(parsed[1].url, "image-200.jpg");
  assert.equal(parsed[1].width, 200);
  assert.equal(parsed[2].url, "image-300.jpg");
  assert.equal(parsed[2].density, 2);
});

test("8. normalizeMediaUrl handles relative paths, strips tracking parameters, and discards fragments", () => {
  const base = "https://example.com/subpage/call.html";
  const normalized = normalizeMediaUrl("../images/photo.jpg?utm_source=rss&utm_medium=feed#hero", base);
  assert.equal(normalized, "https://example.com/images/photo.jpg");

  // Invalid protocols or data URIs are discarded
  assert.equal(normalizeMediaUrl("data:image/png;base64,123", base), undefined);
  assert.equal(normalizeMediaUrl("javascript:alert(1)", base), undefined);
});

test("9. inferSourceRole correctly distinguishes official pages, portals, directories, and attachments", () => {
  const job = {
    id: "j1",
    opportunityId: "opp1",
    kind: "media" as const,
    attempts: 0,
    sourceUrl: "https://submittable.com/submit/123",
    title: "Call",
    opportunityType: "contest",
    genres: [],
  };

  assert.equal(inferSourceRole("https://submittable.com/submit/123", job), "application-portal");
  assert.equal(
    inferSourceRole("https://www.pw.org/classifieds", { ...job, sourceAuthorityKind: "directory" }),
    "discovery-directory",
  );
  assert.equal(inferSourceRole("https://example.com/guidelines.pdf", job), "attachment");
  assert.equal(
    inferSourceRole("https://parisreview.org/about", { ...job, sourceKind: "organization", organizationId: "parisreview" }),
    "organization-page",
  );
  assert.equal(inferSourceRole("https://parisreview.org/submissions", job), "official-opportunity-page");
});

test("10. Public opportunity projections: unknown media NEVER appears, cleared/permitted DOES appear with reviewed alt", () => {
  const browseQuery = buildOpportunityBrowseQuery({
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

  // Query must filter rights_status to 'cleared' and 'permitted'
  assert.match(browseQuery.text, /a\.rights_status in \('cleared', 'permitted'\)/);
  // Must NOT include 'unknown'
  assert.doesNotMatch(browseQuery.text, /a\.rights_status in \([^)]*'unknown'/);
});

test("11. Review/promotion contract supports cleared, permitted, rejected, and needs-attribution", async () => {
  const mockDb: Record<string, unknown[]> = {
    opportunity_media_candidates: [
      {
        id: "cand_01",
        opportunity_id: "opp_review_test",
        resolved_url: "https://example.org/hero.jpg",
        page_url: "https://example.org/call",
        candidate_kind: "opportunity-artwork",
        alt: "Original Alt",
        width: 1200,
        height: 800,
        content_hash: "hash_01",
        inheritance_level: "opportunity",
        linked_organization_id: "org_01",
        linked_program_id: null,
        metadata: {},
      },
    ],
    opportunity_media_reviews: [],
    opportunity_identity_assets: [],
  };

  const client = {
    async query(text: string, values?: unknown[]) {
      if (text.includes("select id, opportunity_id, resolved_url")) {
        const c = mockDb.opportunity_media_candidates.find((r: any) => r.id === values?.[0]);
        return { rows: c ? [c] : [] };
      }
      if (text.includes("insert into opportunity_media_reviews")) {
        mockDb.opportunity_media_reviews.push({ id: values?.[0], decision: values?.[4] });
        return { rows: [] };
      }
      if (text.includes("update opportunity_media_candidates")) {
        const c = mockDb.opportunity_media_candidates.find((r: any) => r.id === values?.[0]) as any;
        if (c) {
          c.status = values?.[1];
          c.rights_status = values?.[1];
        }
        return { rows: [] };
      }
      if (text.includes("insert into opportunity_identity_assets")) {
        mockDb.opportunity_identity_assets.push({
          id: values?.[0],
          opportunity_id: values?.[1],
          url: values?.[2],
          alt: values?.[3],
          rights_status: values?.[5],
          reviewer: values?.[9],
        });
        return { rows: [] };
      }
      return { rows: [] };
    },
  };

  // 1. Cleared review promotes asset with reviewed alt text
  const cleared = await reviewMediaCandidate(client as any, {
    candidateId: "cand_01",
    opportunityId: "opp_review_test",
    decision: "cleared",
    reviewer: "reviewer@missa.com",
    evidencePassage: "Official press release confirms image permission",
    attributionRequirement: "Photo by Jane Doe",
    reviewedAlt: "Curated Studio Artwork for 2026",
    approvedCrop: { x: 0, y: 0, width: 1200, height: 800 },
  });

  assert.equal(cleared.decision, "cleared");
  assert.equal(cleared.rightsStatus, "cleared");
  assert.ok(cleared.promotedAssetId);

  assert.equal(mockDb.opportunity_identity_assets.length, 1);
  const asset = mockDb.opportunity_identity_assets[0] as any;
  assert.equal(asset.rights_status, "cleared");
  assert.equal(asset.alt, "Curated Studio Artwork for 2026");
  assert.equal(asset.reviewer, "reviewer@missa.com");

  // 2. Rejected review does NOT promote to identity assets
  const rejected = await reviewMediaCandidate(client as any, {
    candidateId: "cand_01",
    opportunityId: "opp_review_test",
    decision: "rejected",
    reviewer: "reviewer@missa.com",
    notes: "Does not represent the actual venue",
  });
  assert.equal(rejected.decision, "rejected");
  assert.equal(rejected.promotedAssetId, undefined);
});

test("12. Operational dry-run runs against fixture file reporting telemetry breakdown", async () => {
  const fixturePath = fileURLToPath(new URL("../../test/fixtures/mock-call-page.html", import.meta.url));
  const result = await runDryRun({
    fixture: fixturePath,
    limit: 1,
    verbose: false,
  });

  assert.equal(result.telemetry.checked, 1);
  assert.ok(result.telemetry.found > 0);
  assert.ok(result.telemetry.reviewable >= 1);
  assert.ok(result.telemetry.rejected >= 1);
});
