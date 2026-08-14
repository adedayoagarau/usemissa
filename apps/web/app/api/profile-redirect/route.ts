import { NextResponse } from "next/server";
import { readUserHandle } from "@missa/radar-adapters";

export async function GET(request: Request) {
  if (request.headers.get("x-missa-handle-probe") !== "1")
    return new Response(null, { status: 404 });

  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  if (!/^[a-zA-Z0-9_-]{1,200}$/u.test(userId) || !process.env.DATABASE_URL)
    return NextResponse.json(
      { handleKey: null },
      { headers: { "Cache-Control": "no-store" } },
    );

  const handle = await readUserHandle(process.env.DATABASE_URL, userId).catch(
    () => null,
  );
  return NextResponse.json(
    { handleKey: handle?.handleKey ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
