import { NextResponse, type NextRequest } from "next/server";

const REQUEST_PATH_HEADER = "x-missa-request-path";

/**
 * Give server layouts the current in-app destination so authentication can
 * return people to the exact page and view they originally requested.
 */
export async function proxy(request: NextRequest) {
  const handleRedirect = await resolveHandleRedirect(request);
  if (handleRedirect) return handleRedirect;

  if (
    process.env.VERCEL_ENV === "production" &&
    shouldRedirectToWaitlist(request)
  ) {
    return NextResponse.redirect(new URL("/waitlist", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    REQUEST_PATH_HEADER,
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

async function resolveHandleRedirect(
  request: NextRequest,
): Promise<NextResponse | undefined> {
  const { pathname, search } = request.nextUrl;
  const handle = pathname.startsWith("/@") ? pathname.slice(2) : null;
  const userId = pathname.match(/^\/profile\/([^/]+)$/u)?.[1] ?? null;

  if (!handle && !userId) return undefined;

  const endpoint = handle
    ? new URL(
        `/api/internal/handle-resolution?handle=${encodeURIComponent(handle)}`,
        request.url,
      )
    : new URL(
        `/api/profile-redirect?userId=${encodeURIComponent(userId ?? "")}`,
        request.url,
      );

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: { "x-missa-handle-probe": "1" },
    });
    if (!response.ok) return undefined;
    const result = (await response.json()) as {
      redirectPath?: string;
    };
    if (!result.redirectPath) return undefined;

    const redirectUrl = new URL(result.redirectPath, request.url);
    if (search && !redirectUrl.search) redirectUrl.search = search;
    return NextResponse.redirect(redirectUrl, 301);
  } catch {
    return undefined;
  }
}

function shouldRedirectToWaitlist(request: NextRequest): boolean {
  const { pathname, searchParams } = request.nextUrl;
  if (
    pathname === "/waitlist" ||
    pathname === "/waitlist/opengraph-image" ||
    pathname === "/privacy"
  )
    return false;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return false;
  if (
    pathname === "/login" ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/")
  )
    return false;
  if (
    pathname === "/publication-claim" ||
    pathname.startsWith("/publication-claim/")
  )
    return false;
  if (pathname === "/journals" || pathname.startsWith("/journals/"))
    return false;
  if (pathname.startsWith("/@")) return false;
  if (
    pathname === "/signup" &&
    /^[A-Za-z0-9_-]{32,128}$/u.test(searchParams.get("invite") ?? "")
  )
    return false;
  return true;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
