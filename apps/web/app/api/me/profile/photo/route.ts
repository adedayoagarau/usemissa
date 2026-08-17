import { del, put } from "@vercel/blob";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";

const headers = { "Cache-Control": "private, no-store" };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function storageReady(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
    (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID),
  );
}

function blobOptions() {
  return process.env.BLOB_READ_WRITE_TOKEN
    ? { token: process.env.BLOB_READ_WRITE_TOKEN }
    : {};
}

function ownedPhotoUrl(value: unknown, userId: string): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return undefined;
    if (!url.hostname.endsWith(".public.blob.vercel-storage.com"))
      return undefined;
    if (!url.pathname.startsWith(`/missa/profiles/${userId}/`))
      return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

async function sessionUserId() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  return session?.account.userId;
}

export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId)
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers },
    );
  if (!storageReady())
    return NextResponse.json(
      { error: "Photo storage is not configured yet." },
      { status: 503, headers },
    );

  try {
    const form = await request.formData();
    const value = form.get("file");
    if (!value || typeof value !== "object" || !("arrayBuffer" in value))
      return NextResponse.json(
        { error: "Choose a photo to upload." },
        { status: 400, headers },
      );

    const file = value as File;
    if (!PHOTO_TYPES.has(file.type))
      return NextResponse.json(
        { error: "Use a JPEG, PNG, WebP, or AVIF image." },
        { status: 400, headers },
      );
    if (!file.size || file.size > MAX_PHOTO_BYTES)
      return NextResponse.json(
        { error: "Profile photos must be smaller than 5 MB." },
        { status: 400, headers },
      );

    const blob = await put(
      `missa/profiles/${userId}/${crypto.randomUUID()}`,
      Buffer.from(await file.arrayBuffer()),
      {
        access: "public",
        addRandomSuffix: false,
        contentType: file.type,
        ...blobOptions(),
      },
    );
    return NextResponse.json(
      { url: blob.url, size: file.size, contentType: file.type },
      { status: 201, headers },
    );
  } catch (cause) {
    console.error("Profile photo upload failed", cause);
    return NextResponse.json(
      { error: "We could not upload that photo." },
      { status: 500, headers },
    );
  }
}

export async function DELETE(request: Request) {
  const userId = await sessionUserId();
  if (!userId)
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers },
    );
  if (!storageReady())
    return NextResponse.json(
      { error: "Photo storage is not configured yet." },
      { status: 503, headers },
    );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400, headers },
    );
  }
  const url = ownedPhotoUrl(
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { url?: unknown }).url
      : undefined,
    userId,
  );
  if (!url)
    return NextResponse.json(
      { error: "That photo cannot be removed here." },
      { status: 400, headers },
    );

  try {
    await del(url, blobOptions());
    return new NextResponse(null, { status: 204, headers });
  } catch (cause) {
    console.error("Profile photo removal failed", cause);
    return NextResponse.json(
      { error: "We could not remove that photo." },
      { status: 500, headers },
    );
  }
}
