#!/usr/bin/env node
/**
 * Reads residency program pages and their open calls from the Artist
 * Communities Alliance directory (allowed by artistcommunities.org/robots.txt)
 * and writes the facts the residency index uses, each with its page URL and
 * the date it was read.
 *
 *   node scripts/crawl-aca-residencies.mjs                 # fetch politely (1.5 s apart)
 *   node scripts/crawl-aca-residencies.mjs --cache=/tmp/aca  # reuse/keep raw pages in a folder
 *
 * Output: packages/radar-adapters/src/ranking/data/residencies/aca-programs.json
 *         packages/radar-adapters/src/ranking/data/residencies/aca-open-calls.json
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseAcaOpenCall,
  parseAcaProgram,
} from "../packages/radar-adapters/dist/src/index.js";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);
const cache = args.get("cache");
const outDir = new URL("../packages/radar-adapters/src/ranking/data/residencies/", import.meta.url);
const USER_AGENT = "MissaResidencyIndex/1.0 (+https://usemissa.com/rankings/methodology)";
const GAP_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A page from the cache when present, else from the site; with the date it was read. */
async function page(url) {
  // "…/directory/residencies/acre" → "residencies-acre.html"
  const file = cache ? join(cache, `${url.split("/").filter(Boolean).slice(-2).join("-")}.html`) : null;
  if (file && existsSync(file) && statSync(file).size > 0) {
    return { html: readFileSync(file, "utf8"), readOn: statSync(file).mtime.toISOString().slice(0, 10) };
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (response.ok) {
      const html = await response.text();
      if (file) writeFileSync(file, html);
      await sleep(GAP_MS);
      return { html, readOn: new Date().toISOString().slice(0, 10) };
    }
    if (response.status === 404) return null;
    await sleep(attempt * 4000);
  }
  return null;
}

if (cache) mkdirSync(cache, { recursive: true });
const sitemap = await (await fetch("https://artistcommunities.org/sitemap.xml", { headers: { "User-Agent": USER_AGENT } })).text();
const programUrls = [
  ...new Set(
    [...sitemap.matchAll(/<loc>(https:\/\/artistcommunities\.org\/directory\/residencies\/[^<]+)<\/loc>/g)].map(
      (match) => match[1],
    ),
  ),
].sort();

const programs = [];
for (const url of programUrls) {
  const fetched = await page(url);
  if (!fetched) continue;
  const program = parseAcaProgram(fetched.html, url, fetched.readOn);
  if (program.name) programs.push(program);
}

const callUrls = [...new Set(programs.flatMap((program) => program.openCallUrls))].sort();
const calls = [];
for (const url of callUrls) {
  const fetched = await page(url);
  if (fetched) calls.push(parseAcaOpenCall(fetched.html, url));
}

writeFileSync(new URL("aca-programs.json", outDir), `${JSON.stringify(programs, null, 1)}\n`);
writeFileSync(new URL("aca-open-calls.json", outDir), `${JSON.stringify(calls, null, 1)}\n`);
console.log(`${programs.length} programs and ${calls.length} open calls written.`);
