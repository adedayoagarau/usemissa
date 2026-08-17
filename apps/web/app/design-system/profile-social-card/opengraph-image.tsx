import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { ProfileSocialCardImage } from "@/components/profile-social-card-image";

export const runtime = "nodejs";
export const alt = "Amaka Obi, @amaka on Missa.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Keep the review route on the same render-only fonts as the public card.
const ysabeauFont = readFile(join(process.cwd(), "fonts/ysabeau-medium.otf"));
const fragmentMonoFont = readFile(
  join(process.cwd(), "fonts/fragment-mono-regular.ttf"),
);
const portraitFile = readFile(
  join(process.cwd(), "public/media/home/artist-at-work-social.png"),
);

function fontData(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

export default async function ProfileSocialCardReviewImage() {
  const [ysabeau, fragmentMono, portrait] = await Promise.all([
    ysabeauFont,
    fragmentMonoFont,
    portraitFile,
  ]);

  return new ImageResponse(
    <ProfileSocialCardImage
      card={{
        displayName: "Amaka Obi",
        handle: "amaka",
        initials: "AO",
        headline: "Essayist · Screenwriter · Lagos",
        oneLine: "Writing essays and scripts about ordinary life.",
        profileImageUrl: `data:image/png;base64,${portrait.toString("base64")}`,
        selectedWork: {
          title: "The Harmattan Year",
          publication: "Granta",
          year: 2026,
        },
      }}
    />,
    {
      ...size,
      fonts: [
        {
          name: "Ysabeau",
          data: fontData(ysabeau),
          style: "normal",
          weight: 500,
        },
        {
          name: "Fragment Mono",
          data: fontData(fragmentMono),
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
