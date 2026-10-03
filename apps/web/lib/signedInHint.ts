/**
 * A readable hint that this browser holds a Missa session.
 *
 * Public pages are served from the CDN, so their HTML cannot know who is
 * looking, and the session cookie itself is HttpOnly. The site header
 * resolves the session in the browser instead. This hint holds no account
 * data. It lets the header skip that request for visitors who are not signed
 * in, and hide the "Log in" and "Create account" actions before first paint
 * for people who are, so those actions do not flash while the session loads.
 *
 * The server sets and clears it with the session cookie (see
 * setSessionCookie in lib/auth.ts); the browser corrects it whenever a
 * session check disagrees.
 */

export const SIGNED_IN_HINT_COOKIE = "missa_signed_in";
/** Set on <html> before first paint while the hint is present. */
export const SIGNED_IN_ATTRIBUTE = "data-signed-in";

const HINT_PATTERN = `(?:^|; )${SIGNED_IN_HINT_COOKIE}=1(?:;|$)`;

/** Inline script for the document head. */
export function signedInHintScript(): string {
  return `(function(){if(/${HINT_PATTERN}/.test(document.cookie))document.documentElement.setAttribute(${JSON.stringify(SIGNED_IN_ATTRIBUTE)},"")})()`;
}

export function hasSignedInHint(): boolean {
  return new RegExp(HINT_PATTERN).test(document.cookie);
}

/** Record what a session check said, and show or hide the signed-out actions. */
export function rememberSignedIn(signedIn: boolean): void {
  if (signedIn !== hasSignedInHint()) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    // Matches the session cookie's lifetime (SESSION_MAX_AGE_SECONDS).
    const maxAge = signedIn ? 30 * 24 * 3_600 : 0;
    document.cookie = `${SIGNED_IN_HINT_COOKIE}=${signedIn ? "1" : ""}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  }
  document.documentElement.toggleAttribute(SIGNED_IN_ATTRIBUTE, signedIn);
}
