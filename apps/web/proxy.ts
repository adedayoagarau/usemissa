import { NextResponse, type NextRequest } from 'next/server';

const REQUEST_PATH_HEADER = 'x-missa-request-path';

/**
 * Give server layouts the current in-app destination so authentication can
 * return people to the exact page and view they originally requested.
 */
export function proxy(request: NextRequest) {
  if (process.env.VERCEL_ENV === 'production' && shouldRedirectToWaitlist(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/waitlist', request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

function shouldRedirectToWaitlist(pathname: string): boolean {
  if (pathname === '/waitlist' || pathname === '/waitlist/opengraph-image' || pathname === '/privacy') return false;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return false;
  return true;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
