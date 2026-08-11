#!/usr/bin/env node

const key = process.env.INDEXNOW_KEY?.trim();
const host = (process.env.INDEXNOW_HOST ?? 'www.usemissa.com').trim();
const endpoint = (process.env.INDEXNOW_ENDPOINT ?? 'https://api.indexnow.org/indexnow').trim();
const keyLocation = (process.env.INDEXNOW_KEY_LOCATION ?? `https://${host}/4e2152f4d432202ae74a14f15cb22e49.txt`).trim();
const args = process.argv.slice(2);
const includeSitemap = args.includes('--sitemap');
const explicitUrls = args.filter((value) => value !== '--sitemap');

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

async function sitemapUrls() {
  const sitemapUrl = (process.env.INDEXNOW_SITEMAP_URL ?? `https://${host}/sitemap.xml`).trim();
  const parsed = new URL(sitemapUrl);
  if (parsed.protocol !== 'https:' || parsed.hostname !== host) {
    throw new Error(`INDEXNOW_SITEMAP_URL must use the configured canonical host: ${sitemapUrl}`);
  }

  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await fetch(parsed);
      if (!response.ok) throw new Error(`sitemap returned ${response.status}`);
      const xml = await response.text();
      const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeXml(match[1]));
      if (urls.length === 0) throw new Error('sitemap contained no <loc> entries');
      return urls;
    } catch (error) {
      lastError = error;
      if (attempt < 6) await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }

  throw new Error(`Could not read ${parsed}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
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
