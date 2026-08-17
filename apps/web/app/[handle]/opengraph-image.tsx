import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { ProfileSocialCardImage } from "@/components/profile-social-card-image";
import { profileSocialCardData } from "@/lib/profile-social-card";
import { publicProfileForHandle } from "@/lib/public-profile-for-handle";

export const runtime = "nodejs";
export const alt = "Public Profile on Missa.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse needs static OTF/TTF files; the page UI keeps the variable and
// WOFF2 files loaded by layout.tsx.
const ysabeauFont = readFile(join(process.cwd(), "fonts/ysabeau-medium.otf"));
const fragmentMonoFont = readFile(
  join(process.cwd(), "fonts/fragment-mono-regular.ttf"),
);

function fontData(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

export default async function ProfileOpenGraphImage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const result = await publicProfileForHandle((await params).handle);
  if (!result) notFound();
  const card = profileSocialCardData(result.profile, result.handle);
  const [ysabeau, fragmentMono] = await Promise.all([
    ysabeauFont,
    fragmentMonoFont,
  ]);

  return new ImageResponse(
    <ProfileSocialCardImage card={card} />,
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
