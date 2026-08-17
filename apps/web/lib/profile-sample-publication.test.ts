import assert from "node:assert/strict";
import { test } from "node:test";
import { createStore, FixtureFetcher, RadarEngine } from "@missa/radar-engine";

import { materializeProfileSamples } from "./profile-sample-publication";

function engineWithImageWork() {
  const engine = new RadarEngine({
    store: createStore(),
    fetcher: new FixtureFetcher(),
  });
  engine.addUser({
    id: "user_profile",
    displayName: "Ada",
    attributes: {},
    genres: [],
  });
  const file = engine.createLibraryFile("user_profile", {
    filename: "room.jpg",
    contentType: "image/jpeg",
    byteLength: 100,
    storageKey: "missa/user_profile/private-room.jpg",
  });
  const work = engine.createLibraryWork("user_profile", {
    title: "Room with the Generator Off",
    fileId: file.id,
  });
  return { engine, file, work };
}

test("media publication copies an owned Library file and strips private references", async () => {
  const { engine, file, work } = engineWithImageWork();
  let copiedFrom = "";
  let copiedTo = "";
  const result = await materializeProfileSamples({
    body: {
      displayName: "Ada",
      socialLinks: [],
      selectedWorks: [
        {
          id: "featured-work",
          workId: work.id,
          title: work.title,
          sampleSourceFileId: file.id,
          sample: {
            kind: "image",
            accessibilityText: "A dim room with a still ceiling fan.",
            rightsConfirmed: true,
          },
        },
      ],
    },
    userId: "user_profile",
    engine,
    now: new Date("2026-08-16T12:00:00.000Z"),
    copyBlob: async (from, to, options) => {
      copiedFrom = from;
      copiedTo = to;
      assert.equal(options.access, "public");
      return {
        url: "https://store.public.blob.vercel-storage.com/missa/profiles/user_profile/samples/room.jpg",
        downloadUrl: "https://example.com/download",
        pathname: to,
        contentType: options.contentType,
        contentDisposition: "inline",
        etag: "etag",
      };
    },
  });

  assert.equal(copiedFrom, file.storageKey);
  assert.match(copiedTo, /^missa\/profiles\/user_profile\/samples\/.+\.jpg$/u);
  assert.equal(result.createdAssetUrls.length, 1);
  const serialized = JSON.stringify(result.input);
  assert.doesNotMatch(serialized, /sampleSourceFileId|private-room/u);
  assert.match(serialized, /public\.blob\.vercel-storage\.com/u);
  assert.match(serialized, /2026-08-16T12:00:00\.000Z/u);
});

test("media publication rejects an injected public URL and a foreign file reference", async () => {
  const { engine, work } = engineWithImageWork();
  engine.addUser({
    id: "user_other",
    displayName: "Other",
    attributes: {},
    genres: [],
  });
  const foreignFile = engine.createLibraryFile("user_other", {
    filename: "foreign.jpg",
    contentType: "image/jpeg",
    byteLength: 100,
    storageKey: "missa/user_other/foreign.jpg",
  });
  const copyBlob = async () => {
    throw new Error("copy must not run");
  };

  await assert.rejects(
    materializeProfileSamples({
      body: {
        displayName: "Ada",
        socialLinks: [],
        selectedWorks: [
          {
            id: "featured-work",
            workId: work.id,
            title: work.title,
            sample: {
              kind: "image",
              publicAssetUrl: "https://attacker.example/room.jpg",
              accessibilityText: "A room.",
              rightsConfirmed: true,
            },
          },
        ],
      },
      userId: "user_profile",
      engine,
      now: new Date(),
      copyBlob,
    }),
    /Choose the Library file again/u,
  );

  await assert.rejects(
    materializeProfileSamples({
      body: {
        displayName: "Ada",
        socialLinks: [],
        selectedWorks: [
          {
            id: "featured-work",
            workId: work.id,
            title: work.title,
            sampleSourceFileId: foreignFile.id,
            sample: {
              kind: "image",
              accessibilityText: "A room.",
              rightsConfirmed: true,
            },
          },
        ],
      },
      userId: "user_profile",
      engine,
      now: new Date(),
      copyBlob,
    }),
    /not attached to this Library Work/u,
  );
});
