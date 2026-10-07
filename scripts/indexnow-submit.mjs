#!/usr/bin/env node

const key = process.env.INDEXNOW_KEY?.trim();
const host = (process.env.INDEXNOW_HOST ?? 'www.usemissa.com').trim();
const endpoint = (process.env.INDEXNOW_ENDPOINT ?? 'https://api.indexnow.org/indexnow').trim();
const keyLocation = (process.env.INDEXNOW_KEY_LOCATION ?? `https://${host}/4e2152f4d432202ae74a14f15cb22e49.txt`).trim();
const args = process.argv.slice(2);
const includeSitemap = args.includes('--sitemap');
// --changed-since-hours N: from the sitemaps, submit only URLs whose <lastmod>
// falls in the last N hours. Entries without a lastmod are left to the
// explicit URL list.
const changedSinceIndex = args.indexOf('--changed-since-hours');
const changedSinceHours = changedSinceIndex >= 0 ? Number(args[changedSinceIndex + 1]) : null;
if (changedSinceHours !== null && !(changedSinceHours > 0)) {
  throw new Error('--changed-since-hours needs a positive number of hours.');
}
const optionIndexes = new Set(
  [args.indexOf('--sitemap'), changedSinceIndex, changedSinceIndex >= 0 ? changedSinceIndex + 1 : -1].filter((index) => index >= 0),
);
const explicitUrls = args.filter((_, index) => !optionIndexes.has(index));

if (!key || !/^[A-Za-z0-9-]{8,128}$/.test(key)) {
  throw new Error('INDEXNOW_KEY must be an 8-128 character alphanumeric or dash key.');
}
if (!/^[a-z0-9.-]+$/i.test(host)) throw new Error('INDEXNOW_HOST must be a hostname.');

function decodeXml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

async function fetchXml(url) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`sitemap returned ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 6) await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
  throw new Error(`Could not read ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function assertCanonical(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== host) {
    throw new Error(`Sitemap URL must use the configured canonical host: ${url}`);
  }
  return parsed;
}

/** Page URLs from a sitemap, following a sitemap index into its children. */
async function sitemapUrls() {
  const rootUrl = (process.env.INDEXNOW_SITEMAP_URL ?? `https://${host}/sitemap.xml`).trim();
  const cutoff = changedSinceHours === null ? null : Date.now() - changedSinceHours * 3_600_000;
  const pending = [assertCanonical(rootUrl)];
  const seenSitemaps = new Set();
  const pages = [];
  while (pending.length) {
    const sitemap = pending.shift();
    if (seenSitemaps.has(sitemap.href)) continue;
    seenSitemaps.add(sitemap.href);
    const xml = await fetchXml(sitemap);
    if (/<sitemapindex[\s>]/iu.test(xml)) {
      for (const match of xml.matchAll(/<sitemap>[\s\S]*?<loc>\s*([^<]+?)\s*<\/loc>[\s\S]*?<\/sitemap>/giu)) {
        pending.push(assertCanonical(decodeXml(match[1])));
      }
      continue;
    }
    for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/giu)) {
      const loc = /<loc>\s*([^<]+?)\s*<\/loc>/iu.exec(match[1]);
      if (!loc) continue;
      if (cutoff !== null) {
        const lastmod = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/iu.exec(match[1]);
        const modified = lastmod ? Date.parse(decodeXml(lastmod[1])) : Number.NaN;
        if (!(modified >= cutoff)) continue;
      }
      pages.push(decodeXml(loc[1]));
    }
  }
  if (pages.length === 0 && cutoff === null) throw new Error('The sitemaps contained no page URLs.');
  return pages;
}

const urls = [...new Set([
  ...explicitUrls,
  ...(includeSitemap ? await sitemapUrls() : []),
])];

if (urls.length === 0) throw new Error('Pass at least one canonical URL to submit.');

for (const value of urls) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== host || url.username || url.password) {
    throw new Error(`URL is outside the configured canonical host: ${value}`);
  }
}

const batchSize = 10_000;
let batchCount = 0;
for (let offset = 0; offset < urls.length; offset += batchSize) {
  const batch = urls.slice(offset, offset + batchSize);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation, urlList: batch }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`IndexNow rejected batch ${batchCount + 1} (${response.status}): ${detail}`);
  }
  batchCount += 1;
}

console.log(`IndexNow accepted ${urls.length} URL${urls.length === 1 ? '' : 's'} for ${host} in ${batchCount} batch${batchCount === 1 ? '' : 'es'} (200).`);
