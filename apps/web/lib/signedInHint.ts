/**
 * A device-local hint that someone signed in here recently.
 *
 * Public pages are served from the CDN, so their HTML cannot know who is
 * looking. The site header resolves the session in the browser instead. This
 * hint holds no account data. It lets the header skip that request for
 * visitors who never signed in, and hide the "Log in" and "Create account"
 * actions before first paint for people who probably are signed in, so those
 * actions do not flash while the session loads.
 */

export const SIGNED_IN_HINT_KEY = "missa.signed-in.v1";
/** Set on <html> before first paint while the hint is present. */
export const SIGNED_IN_ATTRIBUTE = "data-signed-in";

/** Inline script for the document head. */
export function signedInHintScript(): string {
  return `(function(){try{if(localStorage.getItem(${JSON.stringify(SIGNED_IN_HINT_KEY)}))document.documentElement.setAttribute(${JSON.stringify(SIGNED_IN_ATTRIBUTE)},"")}catch(e){}})()`;
}

export function hasSignedInHint(): boolean {
  try {
    return Boolean(window.localStorage.getItem(SIGNED_IN_HINT_KEY));
  } catch {
    return false;
  }
}

/** Record what the server said, and show or hide the signed-out actions. */
export function rememberSignedIn(signedIn: boolean): void {
  try {
    if (signedIn) window.localStorage.setItem(SIGNED_IN_HINT_KEY, "1");
    else window.localStorage.removeItem(SIGNED_IN_HINT_KEY);
  } catch {
    // Storage can be unavailable; the header still renders the right state.
  }
  document.documentElement.toggleAttribute(SIGNED_IN_ATTRIBUTE, signedIn);
}
