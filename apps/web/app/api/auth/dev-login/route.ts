import { NextResponse } from "next/server";
import { getCreatorAccountRepository } from "@/lib/creatorRepositories";
import { getEngine } from "@/lib/engine";
import {
  issueSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";

const DEV_ADMIN_EMAIL = "admin@missa.dev";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const repository = getCreatorAccountRepository();
    const account = repository
      ? await repository.accountByEmail(DEV_ADMIN_EMAIL)
      : [...(await getEngine()).store.accounts.values()].find(
          (candidate) => candidate.email.toLowerCase() === DEV_ADMIN_EMAIL,
        );

    if (!account || account.active === false || !account.isAdmin) {
      return NextResponse.json(
        { error: "The development admin account is unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (repository) await repository.ensureProductData(account);

    const requestUrl = new URL(request.url);
    const host = request.headers.get("host") ?? requestUrl.host;
    const response = NextResponse.redirect(
      new URL("/admin/analytics", `${requestUrl.protocol}//${host}`),
      303,
    );
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(
      SESSION_COOKIE,
      issueSessionToken(account.id),
      sessionCookieOptions(),
    );
    return response;
  } catch {
    return NextResponse.json(
      { error: "Development sign-in is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
