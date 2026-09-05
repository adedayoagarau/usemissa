import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractVolumeAndNumber,
  extractPublicationDate,
  findIssueArchiveUrls,
  extractIssuesFromHtml,
  issueDeterministicId,
} from "../src/profileIssueDiscovery.js";

describe("profileIssueDiscovery", () => {
  describe("extractVolumeAndNumber", () => {
    it("extracts Volume and Issue numbers accurately", () => {
      const res = extractVolumeAndNumber("Volume 45, Issue 2 - Spring 2024");
      assert.equal(res.volume, "45");
      assert.equal(res.issueNumber, "2");
    });

    it("extracts Vol. and No. shorthand", () => {
      const res = extractVolumeAndNumber("Vol. 12, No. 3 (Autumn 2023)");
      assert.equal(res.volume, "12");
      assert.equal(res.issueNumber, "3");
    });

    it("extracts Roman numerals for volume and issue", () => {
      const res = extractVolumeAndNumber("Vol. XIV, Issue iv");
      assert.equal(res.volume?.toUpperCase(), "XIV");
      assert.equal(res.issueNumber?.toLowerCase(), "iv");
    });

    it("extracts standalone # issue number", () => {
      const res = extractVolumeAndNumber("Tin House #78");
      assert.equal(res.volume, null);
      assert.equal(res.issueNumber, "78");
    });

    it("returns null when no volume or issue number is present", () => {
      const res = extractVolumeAndNumber("Special Fiction Anthology");
      assert.equal(res.volume, null);
      assert.equal(res.issueNumber, null);
    });
  });

  describe("extractPublicationDate", () => {
    it("extracts seasonal date and numeric year", () => {
      const res = extractPublicationDate("Willow Springs Issue 92 | Spring 2024");
      assert.equal(res.publicationDateRaw, "Spring 2024");
      assert.equal(res.publicationYear, 2024);
    });

    it("extracts multi-season dates", () => {
      const res = extractPublicationDate("Summer/Fall 2022 Archive");
      assert.equal(res.publicationDateRaw, "Summer/Fall 2022");
      assert.equal(res.publicationYear, 2022);
    });

    it("extracts month and year", () => {
      const res = extractPublicationDate("Published October 2021");
      assert.equal(res.publicationDateRaw, "October 2021");
      assert.equal(res.publicationYear, 2021);
    });

    it("extracts exact date with day", () => {
      const res = extractPublicationDate("Released March 15, 2023");
      assert.equal(res.publicationDateRaw, "March 15, 2023");
      assert.equal(res.publicationYear, 2023);
    });

    it("extracts standalone year", () => {
      const res = extractPublicationDate("Annual Anthology 2019");
      assert.equal(res.publicationDateRaw, "2019");
      assert.equal(res.publicationYear, 2019);
    });

    it("leaves date and year null when undated (never infers or guesses)", () => {
      const res = extractPublicationDate("Issue 42: The Midnight Crossing");
      assert.equal(res.publicationDateRaw, null);
      assert.equal(res.publicationYear, null);
    });
  });

  describe("findIssueArchiveUrls", () => {
    it("discovers archive and past issue links from publication navigation", () => {
      const html = `
        <header>
          <nav>
            <a href="/about">About Us</a>
            <a href="/submissions">Submit</a>
            <a href="/archive">Past Issues</a>
            <a href="/back-issues">Order Back Issues</a>
            <a href="/store/issues">Store</a>
          </nav>
        </header>
      `;
      const urls = findIssueArchiveUrls(html, "https://willowspringsmagazine.org/");
      assert.ok(urls.includes("https://willowspringsmagazine.org/archive"));
      assert.ok(urls.includes("https://willowspringsmagazine.org/back-issues"));
      assert.ok(urls.includes("https://willowspringsmagazine.org/store/issues"));
      assert.ok(!urls.includes("https://willowspringsmagazine.org/about"));
    });
  });

  describe("extractIssuesFromHtml", () => {
    it("extracts card grid format with cover image, volume, number, and season", () => {
      const html = `
        <div class="issue-archive-grid">
          <article class="issue-card">
            <a href="/issues/92" class="issue-link">
              <img src="/images/covers/ws-92.jpg" alt="Willow Springs 92 Cover Art" />
              <h3>Issue 92 - Spring 2024</h3>
            </a>
            <p>Featuring poetry and prose by award-winning contributors.</p>
            <a href="/store/buy-issue-92" class="buy-button">Purchase Copy ($12)</a>
            <a href="/read/ws-92.pdf" class="read-link">Read Online</a>
          </article>
          <article class="issue-card">
            <a href="/issues/91" class="issue-link">
              <img src="/images/covers/ws-91.jpg" alt="Willow Springs 91 Cover Art" />
              <h3>Issue 91 - Fall 2023</h3>
            </a>
            <a href="/store/buy-issue-91">Buy ($12)</a>
          </article>
        </div>
      `;

      const issues = extractIssuesFromHtml(html, "https://willowsprings.org/archive");
      assert.equal(issues.length, 2);

      const first = issues[0];
      assert.equal(first.title, "Issue 92 - Spring 2024");
      assert.equal(first.issueNumber, "92");
      assert.equal(first.publicationDateRaw, "Spring 2024");
      assert.equal(first.publicationYear, 2024);
      assert.equal(first.coverImageUrl, "https://willowsprings.org/images/covers/ws-92.jpg");
      assert.equal(first.coverImageAlt, "Willow Springs 92 Cover Art");
      assert.equal(first.officialUrl, "https://willowsprings.org/issues/92");
      assert.equal(first.purchaseUrl, "https://willowsprings.org/store/buy-issue-92");
      assert.equal(first.readingUrl, "https://willowsprings.org/read/ws-92.pdf");
      assert.equal(first.sourcePageUrl, "https://willowsprings.org/archive");

      const second = issues[1];
      assert.equal(second.title, "Issue 91 - Fall 2023");
      assert.equal(second.issueNumber, "91");
      assert.equal(second.publicationDateRaw, "Fall 2023");
      assert.equal(second.publicationYear, 2023);
      assert.equal(second.coverImageUrl, "https://willowsprings.org/images/covers/ws-91.jpg");
      assert.equal(second.officialUrl, "https://willowsprings.org/issues/91");
      assert.equal(second.purchaseUrl, "https://willowsprings.org/store/buy-issue-91");
    });

    it("extracts text-only archive lists with no images (never substitutes generic placeholders)", () => {
      const html = `
        <div class="archive-list">
          <ul>
            <li><a href="/archive/vol-30-no-1">Volume 30, Number 1 (Spring 2021)</a></li>
            <li><a href="/archive/vol-29-no-2">Volume 29, Number 2 (Fall 2020)</a></li>
            <li><a href="/archive/vol-29-no-1">Volume 29, Number 1 (Spring 2020)</a></li>
          </ul>
        </div>
      `;

      const issues = extractIssuesFromHtml(html, "https://literaryquarterly.edu/archive");
      assert.equal(issues.length, 3);

      assert.equal(issues[0].volume, "30");
      assert.equal(issues[0].issueNumber, "1");
      assert.equal(issues[0].publicationDateRaw, "Spring 2021");
      assert.equal(issues[0].publicationYear, 2021);
      assert.equal(issues[0].coverImageUrl, null); // Strictly null, no placeholder
      assert.equal(issues[0].coverImageAlt, null);
      assert.equal(issues[0].officialUrl, "https://literaryquarterly.edu/archive/vol-30-no-1");
    });

    it("extracts undated issues cleanly preserving null dates", () => {
      const html = `
        <div class="issues">
          <div class="issue-item">
            <a href="/issues/solstice">Issue 10: Solstice Special Edition</a>
          </div>
        </div>
      `;

      const issues = extractIssuesFromHtml(html, "https://smallpress.org/back-issues");
      assert.equal(issues.length, 1);
      assert.equal(issues[0].title, "Issue 10: Solstice Special Edition");
      assert.equal(issues[0].issueNumber, "10");
      assert.equal(issues[0].publicationDateRaw, null);
      assert.equal(issues[0].publicationYear, null);
    });

    it("reuses existing visual asset covers when matching by year or season", () => {
      const html = `
        <div class="text-archive">
          <a href="/issues/fall-2023">Issue 55 - Fall 2023</a>
        </div>
      `;

      const knownCovers = new Map<string, string>([
        ["2023", "https://cdn.missa.io/covers/issue-55.jpg"],
      ]);

      const issues = extractIssuesFromHtml(html, "https://journal.org/archive", knownCovers);
      assert.equal(issues.length, 1);
      assert.equal(issues[0].coverImageUrl, "https://cdn.missa.io/covers/issue-55.jpg");
    });
  });

  describe("issueDeterministicId", () => {
    it("generates stable deterministic IDs based on profileId and officialUrl", () => {
      const sample1 = {
        title: "Issue 45",
        officialUrl: "https://journal.org/issues/45",
        sourcePageUrl: "https://journal.org/archive",
      };
      const sample2 = {
        title: "Issue 45",
        officialUrl: "https://journal.org/issues/45",
        sourcePageUrl: "https://journal.org/archive",
      };
      const sampleDiffUrl = {
        title: "Issue 46",
        officialUrl: "https://journal.org/issues/46",
        sourcePageUrl: "https://journal.org/archive",
      };

      const id1 = issueDeterministicId("profile-123", sample1);
      const id2 = issueDeterministicId("profile-123", sample2);
      const idDiffUrl = issueDeterministicId("profile-123", sampleDiffUrl);
      const idDiffProfile = issueDeterministicId("profile-999", sample1);

      assert.equal(id1, id2);
      assert.notEqual(id1, idDiffUrl);
      assert.notEqual(id1, idDiffProfile);
      assert.equal(typeof id1, "string");
      assert.equal(id1.length, 32);
    });
  });
});
