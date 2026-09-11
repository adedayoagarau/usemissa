import { NextResponse } from "next/server";
import { portfolioLinkMetadata } from "@/lib/portfolio-link-metadata";
export const runtime = "nodejs";
const cache = new Map<
  string,
  { data: Awaited<ReturnType<typeof portfolioLinkMetadata>>; until: number }
>();
let active = 0;
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url || url.length > 2048)
    return NextResponse.json({ error: "Enter a valid link." }, { status: 400 });
  const cached = cache.get(url);
  if (cached && cached.until > Date.now())
    return NextResponse.json(cached.data);
  if (active >= 4)
    return NextResponse.json(
      { error: "Preview is busy. Try again shortly." },
      { status: 429 },
    );
  active++;
  try {
    const data = await portfolioLinkMetadata(url);
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(url, { data, until: Date.now() + 300000 });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "This site does not provide a preview. Your link still works." },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    active--;
  }
}
