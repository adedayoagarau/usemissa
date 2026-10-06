import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { MAX_MIRRORED_IMAGE_BYTES, mirrorServedImages, sniffImageType } from "../src/index.js";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const SVG = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`);

test("sniffImageType trusts the file's bytes, not its name, and refuses SVG", () => {
  assert.deepEqual(sniffImageType(JPEG), { contentType: "image/jpeg", extension: "jpg" });
  assert.deepEqual(sniffImageType(PNG), { contentType: "image/png", extension: "png" });
  assert.deepEqual(sniffImageType(Buffer.from("GIF89a....")), { contentType: "image/gif", extension: "gif" });
  assert.deepEqual(sniffImageType(Buffer.from("RIFF\0\0\0\0WEBPVP8 ")), { contentType: "image/webp", extension: "webp" });
  assert.deepEqual(sniffImageType(Buffer.from("\0\0\0\x1cftypavif")), { contentType: "image/avif", extension: "avif" });
  assert.equal(sniffImageType(SVG), null);
  assert.equal(sniffImageType(Buffer.from("<html>not an image</html>")), null);
});

async function database() {
  const db = new PGlite();
  await db.exec(`
    create table opportunity_identity_assets(
      id text primary key, opportunity_id text not null, url text not null, kind text not null,
      rights_status text not null, attribution_requirement text,
      metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
    );
    insert into opportunity_identity_assets (id, opportunity_id, url, kind, rights_status, attribution_requirement, metadata) values
      ('og1', 'opp1', 'https://org.example/a.jpg', 'opportunity-artwork', 'needs-attribution', 'Image: Org', '{}'),
      ('mark1', 'opp2', 'https://org.example/logo.png', 'organization-mark', 'cleared', null, '{}'),
      ('svg1', 'opp3', 'https://org.example/evil.svg', 'opportunity-artwork', 'permitted', null, '{}'),
      ('done1', 'opp4', 'https://org.example/done.jpg', 'opportunity-artwork', 'cleared', null, '{"storedUrl":"https://blob.example/x.jpg"}'),
      ('unknown1', 'opp5', 'https://org.example/u.jpg', 'opportunity-artwork', 'unknown', null, '{}'),
      ('uncredited', 'opp6', 'https://org.example/n.jpg', 'opportunity-artwork', 'needs-attribution', null, '{}'),
      ('down1', 'opp7', 'https://down.example/x.jpg', 'opportunity-artwork', 'cleared', null, '{}');
  `);
  const client = { query: (text: string, values?: unknown[]) => db.query(text, values) };
  return { db, client };
}

test("only images Missa may show are copied, once, under a content hash", async () => {
  const { db, client } = await database();
  const bodies: Record<string, Buffer> = {
    "https://org.example/a.jpg": JPEG,
    "https://org.example/logo.png": PNG,
    "https://org.example/evil.svg": SVG,
  };
  const fetched: string[] = [];
  const stored: Array<{ pathname: string; contentType: string }> = [];
  const result = await mirrorServedImages(client as never, {
    download: async (url) => (fetched.push(url), bodies[url] ? { bytes: bodies[url], finalUrl: url } : null),
    store: async (pathname, _bytes, contentType) => (stored.push({ pathname, contentType }), { url: `https://blob.example/${pathname}` }),
  });

  assert.deepEqual(result, { checked: 4, stored: 2, failed: 2 });
  assert.deepEqual(fetched.sort(), [
    "https://down.example/x.jpg", "https://org.example/a.jpg", "https://org.example/evil.svg", "https://org.example/logo.png",
  ]);
  for (const { pathname } of stored) assert.match(pathname, /^missa\/opportunity-media\/[0-9a-f]{64}\.(jpg|png)$/);
  assert.deepEqual(stored.map((s) => s.contentType).sort(), ["image/jpeg", "image/png"]);

  const { rows } = await db.query<{ id: string; metadata: Record<string, string> }>(
    "select id, metadata from opportunity_identity_assets order by id",
  );
  const byId = Object.fromEntries(rows.map((row) => [row.id, row.metadata]));
  assert.match(byId.og1.storedUrl, /^https:\/\/blob\.example\/missa\/opportunity-media\//);
  assert.equal(byId.og1.storedFrom, "https://org.example/a.jpg");
  assert.ok(byId.mark1.storedUrl);
  assert.equal(byId.svg1.storedUrl, undefined);
  assert.ok(byId.svg1.storeFailedAt);
  assert.ok(byId.down1.storeFailedAt);
  assert.equal(byId.unknown1.storedUrl, undefined);
  assert.equal(byId.uncredited.storedUrl, undefined);
  assert.equal(byId.done1.storedUrl, "https://blob.example/x.jpg");

  // A second run skips copied images and waits a week before retrying failures.
  const again = await mirrorServedImages(client as never, {
    download: async () => { throw new Error("should not download"); },
    store: async () => { throw new Error("should not store"); },
  });
  assert.deepEqual(again, { checked: 0, stored: 0, failed: 0 });
});

test("oversized images are not copied", async () => {
  const { db, client } = await database();
  const huge = Buffer.concat([JPEG, Buffer.alloc(MAX_MIRRORED_IMAGE_BYTES)]);
  const result = await mirrorServedImages(client as never, {
    assetIds: ["og1"],
    download: async (url) => ({ bytes: huge, finalUrl: url }),
    store: async () => { throw new Error("should not store"); },
  });
  assert.deepEqual(result, { checked: 1, stored: 0, failed: 1 });
  const { rows: [row] } = await db.query<{ metadata: Record<string, string> }>("select metadata from opportunity_identity_assets where id = 'og1'");
  assert.equal(row.metadata.storedUrl, undefined);
});
