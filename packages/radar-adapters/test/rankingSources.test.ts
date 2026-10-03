import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  discoverBestSmallFictionsEditions,
  editionsToCheck,
  parseBestMicrofiction,
  parseBestSmallFictions,
  parseGarstangTable,
  validateEdition,
} from "../src/ranking/live/sources.js";

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../../test/fixtures/ranking/${name}`, import.meta.url)), "utf8");

test("parseGarstangTable reads rank, name, prior rank, score and status markers", () => {
  const rows = parseGarstangTable(fixture("garstang-2026-fiction.html"));
  assert.equal(rows.length, 8, "header row and tables outside the article are ignored");
  assert.deepEqual(rows[0], { rank: 1, name: "Ploughshares", priorRank: 1, score: 67, marker: null });
  assert.deepEqual(rows[2], { rank: 2, name: "Zoetrope: All Story", priorRank: 2, score: 50, marker: null });
  assert.deepEqual(rows[6], { rank: 30, name: "Gettysburg Review", priorRank: 20, score: 14.5, marker: "closed" });
  assert.deepEqual(rows[7], { rank: 99, name: "Salamander", priorRank: 92, score: 2, marker: "hiatus" });
});

test("parseBestMicrofiction reads author, title and magazine, once per piece", () => {
  const entries = parseBestMicrofiction(fixture("best-microfiction-2024.html"));
  assert.equal(entries.length, 8, "the inverted-name duplicate of “Bones, Only Bones” counts once");
  assert.deepEqual(entries.at(-1), { author: "Sara Henry Paolozzi", pieceTitle: "Exorcism", magazine: "Wigleaf" });
  assert.ok(entries.some((e) => e.magazine === "Moon City Review" && e.pieceTitle === "Lucky"));
});

test("parseBestSmallFictions reads selections after the edition heading", () => {
  const entries = parseBestSmallFictions(fixture("best-small-fictions-2024.html"), 2024);
  assert.equal(entries.length, 7);
  assert.deepEqual(entries[0], { pieceTitle: "And the Crowd Goes", author: "Phoenix Alexander", magazine: "Arcturus" });
  assert.deepEqual(entries[5], { pieceTitle: "Love 1992: A Catechism", author: "Deesha Philyaw", magazine: "Fractured Lit" });
  // The publisher's page drops the closing quote on this entry.
  assert.deepEqual(entries[6], {
    pieceTitle: "Once upon a Time in West Auckland",
    author: "Hayden Pyke",
    magazine: "Flash Frontier",
  });
  assert.equal(parseBestSmallFictions(fixture("best-small-fictions-2024.html"), 2023).length, 0);
});

test("discoverBestSmallFictionsEditions finds edition pages with or without a trailing slash", () => {
  const html = `
    <a href="https://altcurrentpress.com/2023/12/08/best-small-fictions-2023/">2023</a>
    <a href="https://altcurrentpress.com/2025/01/22/best-small-fictions-2024">2024</a>
    <a href="https://altcurrentpress.com/2025/11/10/best-small-fictions-2025">2025</a>
    <a href="https://altcurrentpress.com/best-small-fictions/">Series</a>`;
  const editions = discoverBestSmallFictionsEditions(html);
  assert.deepEqual([...editions.keys()].sort(), [2023, 2024, 2025]);
  assert.equal(editions.get(2024), "https://altcurrentpress.com/2025/01/22/best-small-fictions-2024/");
});

test("validateEdition rejects thin or shrunken editions", () => {
  assert.deepEqual(validateEdition("garstang", 214, 208), { accepted: true });
  assert.equal(validateEdition("garstang", 12, null).accepted, false, "a page that lost its table");
  assert.equal(validateEdition("best_microfiction", 50, 85).accepted, false, "far smaller than stored");
  assert.deepEqual(validateEdition("best_small_fictions", 101, null), { accepted: true });
});

test("editionsToCheck covers this year's and next year's Garstang tables", () => {
  const editions = editionsToCheck(new Date("2026-12-31T00:00:00Z"));
  const garstangYears = new Set(editions.filter((e) => e.source === "garstang").map((e) => e.editionYear));
  assert.deepEqual([...garstangYears], [2026, 2027]);
  assert.ok(editions.some((e) => e.source === "best_microfiction" && e.editionYear === 2026));
});
