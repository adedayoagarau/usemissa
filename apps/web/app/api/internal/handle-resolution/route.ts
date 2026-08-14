import { NextResponse } from "next/server";
import { resolveHandle } from "@missa/radar-adapters";

export async function GET(request: Request) {
  if (request.headers.get("x-missa-handle-probe") !== "1")
    return new Response(null, { status: 404 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { kind: "unknown" },
      { headers: { "Cache-Control": "no-store" } },
    );
  const rawHandle = new URL(request.url).searchParams.get("handle") ?? "";
  const resolved = await resolveHandle(
    process.env.DATABASE_URL,
    rawHandle,
  ).catch(() => null);
  if (!resolved)
    return NextResponse.json(
      { kind: "unknown" },
      { headers: { "Cache-Control": "no-store" } },
    );
  if (resolved.resolution === "alias")
    return NextResponse.json(
      { kind: "redirect", redirectPath: `/@${resolved.handleKey}` },
      { headers: { "Cache-Control": "no-store" } },
    );
  if (
    resolved.state === "reserved" &&
    resolved.subjectType === "directory_profile" &&
    resolved.reservedFromProfileId
  )
    return NextResponse.json(
      {
        kind: "redirect",
        redirectPath: `/journals/${encodeURIComponent(resolved.reservedFromProfileId)}`,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  return NextResponse.json(
    {
      kind:
        resolved.state === "claimed" && resolved.subjectType === "user"
          ? "claimed"
          : "unknown",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
