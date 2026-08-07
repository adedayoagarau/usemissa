#!/usr/bin/env node

const key = process.env.INDEXNOW_KEY?.trim();
const host = (process.env.INDEXNOW_HOST ?? 'www.usemissa.com').trim();
const endpoint = (process.env.INDEXNOW_ENDPOINT ?? 'https://api.indexnow.org/indexnow').trim();
const keyLocation = (process.env.INDEXNOW_KEY_LOCATION ?? `https://${host}/4e2152f4d432202ae74a14f15cb22e49.txt`).trim();
const urls = [...new Set(process.argv.slice(2))];

if (!key || !/^[A-Za-z0-9-]{8,128}$/.test(key)) {
  throw new Error('INDEXNOW_KEY must be an 8-128 character alphanumeric or dash key.');
}
if (!/^[a-z0-9.-]+$/i.test(host)) throw new Error('INDEXNOW_HOST must be a hostname.');
if (urls.length === 0) throw new Error('Pass at least one canonical URL to submit.');
if (urls.length > 10_000) throw new Error('IndexNow accepts at most 10,000 URLs per request.');

for (const value of urls) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== host || url.username || url.password) {
    throw new Error(`URL is outside the configured canonical host: ${value}`);
  }
}

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation, urlList: urls }),
});

if (!response.ok) {
  const detail = (await response.text()).slice(0, 500);
  throw new Error(`IndexNow rejected the submission (${response.status}): ${detail}`);
}

console.log(`IndexNow accepted ${urls.length} URL${urls.length === 1 ? '' : 's'} for ${host} (${response.status}).`);
