import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { discoveryCollection, discoveryGuides } from "./discoveryGuides";
import { GUIDE_SECTIONS, guideArticle, guideArticles } from "./guideArticles";
import { headingId, parseGuide, plainText } from "./guideMarkdown";
import { brandedTitle } from "./seo";

const contentDir = path.join(process.cwd(), "content/guides");
const words = (text: string) => text.split(/\s+/u).filter(Boolean).length;

const INTERNAL_ROUTES = [
  /^\/$/u,
  /^\/(?:opportunities|directory|countries|methodology|import|signup|journals|residencies|grants|presses|rankings\/magazines|rankings\/residencies|rankings\/methodology|guides|about)$/u,
  /^\/countries\/[a-z]{2}$/u,
  /^\/discover\/[a-z0-9-]+$/u,
  /^\/guides\/[a-z0-9-]+$/u,
];

test("the bundle matches the Markdown and metadata beside it", () => {
  const bundle = JSON.parse(readFileSync(path.join(contentDir, "articles.generated.json"), "utf8")) as {
    articles: Record<string, { meta: unknown; body: string }>;
  };
  const slugs = readdirSync(contentDir).filter((file) => file.endsWith(".md")).map((file) => file.replace(/\.md$/u, ""));
  assert.deepEqual(Object.keys(bundle.articles).sort(), slugs.sort());
  for (const slug of slugs) {
    assert.equal(bundle.articles[slug]!.body, readFileSync(path.join(contentDir, `${slug}.md`), "utf8"), `${slug}.md changed; run npm run guides:build`);
    assert.deepEqual(bundle.articles[slug]!.meta, JSON.parse(readFileSync(path.join(contentDir, `${slug}.meta.json`), "utf8")), `${slug}.meta.json changed; run npm run guides:build`);
  }
});

test("every guide is published with complete, well-sized metadata", () => {
  assert.equal(guideArticles.length, 10);
  const shortGuideSlugs = new Set(discoveryGuides.map((guide) => guide.slug));
  for (const article of guideArticles) {
    assert.ok(!shortGuideSlugs.has(article.slug), `${article.slug} collides with a short guide`);
    assert.ok(GUIDE_SECTIONS.includes(article.section), article.slug);
    const title = brandedTitle(article.seoTitle);
    assert.ok(title.length <= 70, `${article.slug}: title "${title}" is ${title.length} characters`);
    assert.ok(article.description.length >= 120 && article.description.length <= 165, `${article.slug}: description is ${article.description.length} characters`);
    assert.ok(words(article.answer) >= 35 && words(article.answer) <= 65, `${article.slug}: answer is ${words(article.answer)} words`);
    assert.ok(article.keyPoints.length >= 2 && article.keyPoints.length <= 4, `${article.slug}: key points`);
    assert.ok(article.summary.length > 0 && words(article.summary) <= 32, `${article.slug}: summary`);
    for (const related of article.related) assert.ok(guideArticles.some((candidate) => candidate.slug === related), `${article.slug}: unknown related guide ${related}`);
    if (article.liveCalls && !article.liveCalls.startsWith("country:")) assert.ok(discoveryCollection(article.liveCalls), `${article.slug}: unknown collection ${article.liveCalls}`);
    assert.ok(INTERNAL_ROUTES.some((route) => route.test(article.cta.href)), `${article.slug}: CTA ${article.cta.href}`);
  }
});

test("article bodies use the guide format", () => {
  for (const { slug } of guideArticles) {
    const article = guideArticle(slug)!;
    const { blocks, headings, faq, sources } = article.parsed;
    assert.ok(headings.length >= 4, `${slug}: ${headings.length} sections`);
    assert.ok(faq.length >= 3 && faq.length <= 6, `${slug}: ${faq.length} questions`);
    for (const item of faq) assert.ok(item.answer.length > 20, `${slug}: empty answer to "${item.question}"`);
    assert.ok(sources.length >= 2, `${slug}: cites ${sources.length} sources`);
    assert.ok(!blocks.some((block) => block.type === "heading" && (block as { depth: number }).depth === 1), `${slug}: has an H1 in the body`);
    assert.ok(!blocks.some((block) => block.type === "html"), `${slug}: contains raw HTML`);
    assert.ok(article.readingMinutes >= 4, `${slug}: ${article.readingMinutes} min`);

    const body = readFileSync(path.join(contentDir, `${slug}.md`), "utf8");
    assert.ok(!/https?:\/\/(?:www\.)?usemissa\.com/iu.test(body), `${slug}: links Missa pages absolutely`);
    for (const [, href] of body.matchAll(/\]\((\/[^)\s]*)\)/gu)) {
      const route = href!.split("#")[0]!;
      assert.ok(INTERNAL_ROUTES.some((pattern) => pattern.test(route)), `${slug}: unknown internal link ${href}`);
      const guideSlug = /^\/guides\/(.+)$/u.exec(route)?.[1];
      if (guideSlug) assert.ok(guideArticles.some((candidate) => candidate.slug === guideSlug) || discoveryGuides.some((guide) => guide.slug === guideSlug), `${slug}: links missing guide ${guideSlug}`);
      const collection = /^\/discover\/(.+)$/u.exec(route)?.[1];
      if (collection) assert.ok(discoveryCollection(collection), `${slug}: links missing collection ${collection}`);
    }
  }
});

test("the parser builds contents, callouts, checklists and FAQ", () => {
  const parsed = parseGuide(`Intro with a [source](https://example.org/a).

## What’s the first step?

> [!TIP]
> Start with **one** call.

- [ ] Check who can apply
- [ ] Find every fee

| Site | Fee |
| --- | --- |
| A | [None](https://example.org/b) |

## Frequently asked questions

### Is it free?

Yes, mostly.
`);
  assert.deepEqual(parsed.headings, [{ id: "whats-the-first-step", text: "What’s the first step?" }]);
  assert.ok(parsed.blocks.some((block) => block.type === "callout" && block.kind === "tip"));
  assert.deepEqual(parsed.faq.map((item) => [item.question, item.answer]), [["Is it free?", "Yes, mostly."]]);
  assert.deepEqual(parsed.sources.map((source) => source.host), ["example.org", "example.org"]);
  assert.equal(headingId("Fees & “free” calls"), "fees-free-calls");
  assert.equal(plainText(parseGuide("**Bold** and [link](/x)").blocks as Parameters<typeof plainText>[0]), "Bold and link");
});
