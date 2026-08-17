import assert from "node:assert/strict";
import test from "node:test";

import { profileSocialCardData } from "./profile-social-card";
import { pageMetadata } from "./seo";

test("Profile social cards use only the public Profile projection", () => {
  const card = profileSocialCardData(
    {
      id: "user-public-id",
      displayName: "Amaka Obi",
      headline: "Essayist · Screenwriter · Lagos",
      oneLine: "At work on a first collection.",
      profileImageUrl:
        "https://store.public.blob.vercel-storage.com/missa/profiles/user-public-id/amaka.jpg",
      selectedWorks: [
        {
          id: "work-publication-id",
          workId: "private-library-work-id",
          title: "The Harmattan Year",
          publication: "Granta",
          year: 2026,
        },
      ],
    },
    "amaka",
  );

  assert.deepEqual(card, {
    displayName: "Amaka Obi",
    handle: "amaka",
    initials: "AO",
    headline: "Essayist · Screenwriter · Lagos",
    oneLine: "At work on a first collection.",
    profileImageUrl:
      "https://store.public.blob.vercel-storage.com/missa/profiles/user-public-id/amaka.jpg",
    selectedWork: {
      title: "The Harmattan Year",
      publication: "Granta",
      year: 2026,
    },
  });
  assert.equal(JSON.stringify(card).includes("private-library-work-id"), false);
});

test("Profile social cards do not fetch a creator-supplied external image", () => {
  const card = profileSocialCardData(
    {
      id: "user_one",
      displayName: "Amaka Obi",
      profileImageUrl: "https://images.example/profile.jpg",
    },
    "amaka",
  );

  assert.equal(card.profileImageUrl, undefined);
});

test("Profile social cards bound long identity and Work text to the image", () => {
  const card = profileSocialCardData(
    {
      displayName: "A".repeat(90),
      selectedWorks: [{ id: "work_one", title: "W".repeat(100) }],
    },
    "amaka",
  );

  assert.equal(card.displayName.length, 60);
  assert.equal(card.displayName.endsWith("…"), true);
  assert.equal(card.selectedWork?.title.length, 70);
  assert.equal(card.selectedWork?.title.endsWith("…"), true);
});

test("Profile metadata points social platforms at the Profile card", () => {
  const metadata = pageMetadata({
    title: "Amaka Obi",
    description: "At work on a first collection.",
    path: "/@amaka",
    socialImagePath: "/@amaka/opengraph-image",
    socialImageAlt: "Amaka Obi, @amaka on Missa.",
  });

  assert.deepEqual(metadata.openGraph?.images, [
    {
      url: "https://www.usemissa.com/@amaka/opengraph-image",
      width: 1200,
      height: 630,
      type: "image/png",
      alt: "Amaka Obi, @amaka on Missa.",
    },
  ]);
  assert.deepEqual(metadata.twitter?.images, [
    "https://www.usemissa.com/@amaka/opengraph-image",
  ]);
});
