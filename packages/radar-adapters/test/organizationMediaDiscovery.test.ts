import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractIdentityMedia,
  extractPressBooks,
  extractResidencyPhotos,
  extractGalleryExhibitions,
  extractFoundationProjects,
  findNavigationTargetUrls,
  orgMediaDeterministicId,
} from "../src/organizationMediaDiscovery.js";

describe("organizationMediaDiscovery", () => {
  describe("extractIdentityMedia", () => {
    it("extracts logo and representative hero photo while keeping them strictly separate", () => {
      const html = `
        <head>
          <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
          <meta property="og:image" content="https://cdn.example.org/hero-building.jpg" />
        </head>
        <body>
          <header>
            <img class="site-logo" src="/logo.svg" alt="Graywolf Press Primary Logo" />
          </header>
        </body>
      `;

      const items = extractIdentityMedia(html, "https://graywolfpress.org", "Graywolf Press");
      assert.ok(items.length >= 2);

      const logos = items.filter(i => i.mediaType === "logo" || i.mediaType === "alternate_logo");
      const photos = items.filter(i => i.mediaType === "representative_image");

      assert.ok(logos.length >= 1);
      assert.ok(photos.length >= 1);

      assert.equal(photos[0].imageUrl, "https://cdn.example.org/hero-building.jpg");
      assert.equal(photos[0].isLead, true);
      assert.equal(photos[0].title, "Graywolf Press Overview");
    });
  });

  describe("extractPressBooks", () => {
    it("extracts books with title, author, publication date, ISBN, reading link, and purchase link", () => {
      const html = `
        <div class="catalogue-grid">
          <article class="book-card">
            <a href="/books/the-trees" class="book-link">
              <img src="/covers/the-trees.jpg" alt="The Trees Book Cover" />
              <h3>The Trees</h3>
            </a>
            <span class="author">by Percival Everett</span>
            <p>Published September 2021 | ISBN: 978-1-55597-898-3</p>
            <a href="/store/buy-the-trees" class="buy-btn">Order ($16.00)</a>
            <a href="/samples/the-trees-excerpt.pdf">Read Excerpt</a>
          </article>
        </div>
      `;

      const books = extractPressBooks(html, "https://graywolfpress.org/books");
      assert.equal(books.length, 1);

      const book = books[0];
      assert.equal(book.mediaGroup, "books");
      assert.equal(book.mediaType, "book_cover");
      assert.equal(book.title, "The Trees");
      assert.equal(book.subtitle, "by Percival Everett");
      assert.equal(book.creatorCredit, "Percival Everett");
      assert.equal(book.publicationDateRaw, "September 2021");
      assert.equal(book.publicationYear, 2021);
      assert.equal(book.purchaseUrl, "https://graywolfpress.org/store/buy-the-trees");
      assert.equal(book.readingUrl, "https://graywolfpress.org/samples/the-trees-excerpt.pdf");
      assert.deepEqual(book.relatedIdentifiers, { isbn: "9781555978983" });
    });

    it("separates concise display title from descriptive alt text (never uses alt as card title)", () => {
      const html = `
        <div class="book">
          <img src="/covers/salvage.jpg" alt="A detailed photograph of the front cover of Salvage the Bones with gold award foil stamp and ocean waves" />
          <h4 class="title">Salvage the Bones</h4>
          <span class="author">Jesmyn Ward</span>
        </div>
      `;

      const books = extractPressBooks(html, "https://bloomsbury.com/books");
      assert.equal(books.length, 1);
      assert.equal(books[0].title, "Salvage the Bones");
      assert.ok(books[0].altText?.includes("front cover of Salvage the Bones"));
    });
  });

  describe("extractResidencyPhotos", () => {
    it("discovers studios, workspaces, exterior, accommodations, and factual photographer credits", () => {
      const html = `
        <div class="campus-gallery">
          <figure>
            <img src="/photos/colony-hall.jpg" alt="Colony Hall exterior and pine grove" />
            <figcaption>Colony Hall in Autumn. Photo: Jack Edwards</figcaption>
          </figure>
          <figure>
            <img src="/photos/firth-studio.jpg" alt="Firth Studio interior showing writer desk and stone fireplace" />
            <figcaption>Firth Studio workspace. Credit: Sarah Jenkins</figcaption>
          </figure>
        </div>
      `;

      const photos = extractResidencyPhotos(html, "https://macdowell.org/about", "MacDowell");
      assert.equal(photos.length, 2);

      const first = photos[0];
      assert.equal(first.mediaType, "exterior");
      assert.equal(first.creatorCredit, "Jack Edwards");
      assert.equal(first.subtitle, "Photo: Jack Edwards");

      const second = photos[1];
      assert.equal(second.mediaType, "workspace");
      assert.equal(second.creatorCredit, "Sarah Jenkins");
    });
  });

  describe("extractGalleryExhibitions", () => {
    it("discovers exhibition views with artist names, dates, and credits", () => {
      const html = `
        <div class="exhibitions">
          <article class="exhibition-card">
            <a href="/exhibitions/soundings">
              <img src="/exhibits/soundings-install.jpg" alt="Soundings exhibition installation view at gallery space" />
              <h3>Soundings: A Contemporary Score</h3>
            </a>
            <span class="artist">Featuring Christine Sun Kim</span>
            <p class="dates">July 10 – November 3, 2023</p>
            <span class="credit">Photo: Laura Martinez</span>
          </article>
        </div>
      `;

      const exhibits = extractGalleryExhibitions(html, "https://gallery.org/exhibitions", "Apexart");
      assert.equal(exhibits.length, 1);

      const ex = exhibits[0];
      assert.equal(ex.mediaGroup, "exhibitions");
      assert.equal(ex.title, "Soundings: A Contemporary Score");
      assert.equal(ex.subtitle, "Artist: Christine Sun Kim");
      assert.equal(ex.creatorCredit, "Laura Martinez");
      assert.equal(ex.publicationDateRaw, "July 10 – November 3, 2023");
      assert.equal(ex.publicationYear, 2023);
      assert.deepEqual(ex.relatedIdentifiers, {
        artistName: "Christine Sun Kim",
        exhibitionDates: "July 10 – November 3, 2023",
      });
    });
  });

  describe("extractFoundationProjects", () => {
    it("discovers grantee projects without falsely claiming ownership of artist work", () => {
      const html = `
        <div class="grantees">
          <div class="grantee-item">
            <a href="/fellows/2024/miriam-alvarez">
              <img src="/fellows/sculpture-work.jpg" alt="Large scale bronze sculpture installation" />
              <h3>Echoes of Dust</h3>
            </a>
            <p>Grantee: Miriam Alvarez (2024 Fellow)</p>
          </div>
        </div>
      `;

      const projects = extractFoundationProjects(html, "https://pollockkrasner.org/grantees", "Pollock-Krasner Foundation");
      assert.equal(projects.length, 1);

      const pr = projects[0];
      assert.equal(pr.mediaGroup, "projects");
      assert.equal(pr.title, "Echoes of Dust");
      assert.equal(pr.subtitle, "Supported Artist: Miriam Alvarez");
      assert.equal(pr.creatorCredit, "Miriam Alvarez");
      assert.equal(pr.publicationYear, 2024);
      assert.deepEqual(pr.relatedIdentifiers, { recipient: "Miriam Alvarez" });
    });
  });

  describe("findNavigationTargetUrls", () => {
    it("finds relevant catalogue and archive links based on organization kind", () => {
      const html = `
        <nav>
          <a href="/catalogue">Books & Titles</a>
          <a href="/authors">Our Authors</a>
          <a href="/contact">Contact</a>
        </nav>
      `;

      const targets = findNavigationTargetUrls(html, "https://press.org", "small_press");
      assert.ok(targets.includes("https://press.org/catalogue"));
      assert.ok(!targets.includes("https://press.org/contact"));
    });
  });

  describe("orgMediaDeterministicId", () => {
    it("generates stable 32-char hex hashes for idempotent database writes", () => {
      const item = {
        mediaGroup: "books" as const,
        mediaType: "book_cover",
        imageUrl: "https://press.org/covers/book1.jpg",
        title: "Selected Poems",
        sourcePageUrl: "https://press.org/catalogue",
      };

      const id1 = orgMediaDeterministicId("profile-1", item);
      const id2 = orgMediaDeterministicId("profile-1", item);
      const idDiff = orgMediaDeterministicId("profile-2", item);

      assert.equal(id1, id2);
      assert.notEqual(id1, idDiff);
      assert.equal(id1.length, 32);
    });
  });
});
