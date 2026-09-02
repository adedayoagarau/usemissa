import assert from "node:assert/strict";
import test from "node:test";
import {
  extractLogo,
  extractSocialLinks,
  extractGalleryCovers,
  extractPrizeWinners,
  extractProfileEnrichment,
} from "../src/profileEnrichmentWorker.js";

test("extractSocialLinks discovers cleaned social media profiles and discards share dialogs", () => {
  const html = `
    <html>
      <body>
        <a href="https://twitter.com/theparisreview?ref=src">Follow us on Twitter</a>
        <a href="https://twitter.com/intent/tweet?url=https://example.com">Tweet this article</a>
        <a href="https://instagram.com/parisreview/">Instagram</a>
        <a href="https://bsky.app/profile/parisreview.bsky.social">Bluesky</a>
        <a href="https://parisreview.substack.com/?utm_source=nav">Substack</a>
        <a href="https://www.threads.net/@parisreview">Threads</a>
        <a href="https://facebook.com/sharer/sharer.php?u=foo">Share on Facebook</a>
        <a href="https://facebook.com/theparisreview">Facebook Page</a>
      </body>
    </html>
  `;

  const socials = extractSocialLinks(html, "https://theparisreview.org");
  assert.equal(socials.twitter, "https://twitter.com/theparisreview");
  assert.equal(socials.instagram, "https://instagram.com/parisreview/");
  assert.equal(socials.bluesky, "https://bsky.app/profile/parisreview.bsky.social");
  assert.equal(socials.substack, "https://parisreview.substack.com/");
  assert.equal(socials.threads, "https://www.threads.net/@parisreview");
  assert.equal(socials.facebook, "https://facebook.com/theparisreview");
  assert.equal(socials.youtube, null);
});

test("extractLogo discovers OpenGraph or Apple Touch high-res brand marks", () => {
  const htmlWithOg = `
    <html>
      <head>
        <meta property="og:image" content="/assets/brand/logo-full.png" />
      </head>
    </html>
  `;
  const logo = extractLogo(htmlWithOg, "https://example.com");
  assert.equal(logo, "https://example.com/assets/brand/logo-full.png");

  const htmlWithTouch = `
    <html>
      <head>
        <link rel="apple-touch-icon" href="/icon-180.png" />
      </head>
    </html>
  `;
  const touchLogo = extractLogo(htmlWithTouch, "https://example.com");
  assert.equal(touchLogo, "https://example.com/icon-180.png");
});

test("extractGalleryCovers extracts past issue covers with year and season", () => {
  const html = `
    <div class="archive">
      <img src="/covers/issue-42.jpg" alt="Issue 42 - Spring 2025" />
      <img src="/covers/issue-41.jpg" alt="Issue 41 - Fall 2024" />
      <img src="/icons/favicon.ico" alt="Icon" />
    </div>
  `;

  const covers = extractGalleryCovers(html, "https://example.com");
  assert.equal(covers.length, 2);
  assert.equal(covers[0].imageUrl, "https://example.com/covers/issue-42.jpg");
  assert.equal(covers[0].issueYear, 2025);
  assert.equal(covers[0].season, "Spring");
  assert.equal(covers[1].issueYear, 2024);
  assert.equal(covers[1].season, "Fall");
});

test("extractPrizeWinners extracts winner name, year, and winning title", () => {
  const html = `
    <div class="past-winners">
      <p>2025 Winner: Elena Vance for "The Salt Garden", selected by George Saunders</p>
      <p>2024 Winner: Marcus Vance for "Winter River"</p>
    </div>
  `;

  const winners = extractPrizeWinners(html, "https://example.com", "Annual Fiction Prize");
  assert.ok(winners.length >= 1);
  assert.equal(winners[0].winnerName, "Elena Vance");
  assert.equal(winners[0].awardYear, 2025);
  assert.equal(winners[0].winningTitle, "The Salt Garden");
  assert.equal(winners[0].judgeName, "George Saunders");
});

test("extractProfileEnrichment orchestrates complete extraction in one pass", () => {
  const html = `
    <html>
      <head>
        <meta property="og:image" content="/logo.png" />
      </head>
      <body>
        <a href="https://instagram.com/myjournal">Instagram</a>
        <img src="/cover-2025.jpg" alt="Issue 1 - Spring 2025" />
      </body>
    </html>
  `;

  const enrichment = extractProfileEnrichment(html, "https://myjournal.org");
  assert.equal(enrichment.logoUrl, "https://myjournal.org/logo.png");
  assert.equal(enrichment.socialLinks.instagram, "https://instagram.com/myjournal");
  assert.equal(enrichment.gallery.length, 1);
  assert.equal(enrichment.gallery[0].issueYear, 2025);
});
