import { NextResponse } from "next/server";
import {
  handleNamespaceAvailable,
  normalizeUserHandleInput,
  resolveHandle,
} from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { consumeHandleAvailabilityRateLimit } from "@/lib/handle-rate-limit";

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(request.url);
  const raw = url.searchParams.get("handle") ?? "";
  const retryAfter = consumeHandleAvailabilityRateLimit({
    sessionKey: session.account.id,
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      "unknown",
  });
  if (retryAfter)
    return NextResponse.json(
      { error: "Please wait before checking another handle." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "Cache-Control": "no-store",
        },
      },
    );
  const key = normalizeUserHandleInput(raw);
  if (
    !key ||
    !process.env.DATABASE_URL ||
    !(await handleNamespaceAvailable(process.env.DATABASE_URL).catch(
      () => false,
    ))
  )
    return NextResponse.json(
      { available: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  const resolved = await resolveHandle(process.env.DATABASE_URL, key);
  return NextResponse.json(
    { available: !resolved },
    { headers: { "Cache-Control": "no-store" } },
  );
}
