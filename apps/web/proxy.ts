import { NextResponse, type NextRequest } from "next/server";

import { DISCOVERY_BETA, isDiscoveryBetaPath } from "./lib/discoveryBeta";

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
  const { pathname } = request.nextUrl;
  if (DISCOVERY_BETA && isDiscoveryBetaPath(pathname)) return false;
  // Only routes that exist but are deliberately not public yet are sent to the
  // waitlist. Anything else falls through so the app renders its own 404 page
  // instead of turning a mistyped URL into an invitation capture.
  return isGatedPreviewPath(pathname);
}

const gatedPreviewPaths = ["/rankings/claim", "/rankings/plan"];

function isGatedPreviewPath(pathname: string): boolean {
  return gatedPreviewPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
