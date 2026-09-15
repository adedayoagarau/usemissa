/**
 * Analytics consent for Missa.
 *
 * Nothing optional — neither the third-party product-analytics client nor the
 * first-party event ledger — runs until a visitor makes an explicit choice.
 * The consent record itself is the only thing written before that choice is
 * made, and it is strictly necessary to remember the answer.
 *
 * This module is safe to import from client components only.
 */

export type ConsentChoice = "accepted" | "declined";

/**
 * "none" — the visitor has not answered yet.
 * "unknown" — the server cannot know, so nothing consent-dependent renders
 * during server rendering or hydration.
 */
export type ConsentState = ConsentChoice | "none" | "unknown";

/** localStorage key. Versioned so a future policy change can re-ask. */
export const CONSENT_STORAGE_KEY = "missa.analytics.consent.v1";
/** Cookie mirror, so the choice survives storage eviction. */
export const CONSENT_COOKIE = "missa_consent";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

type Listener = (choice: ConsentChoice) => void;
type StoreListener = () => void;

const listeners = new Set<Listener>();
const storeListeners = new Set<StoreListener>();

let cachedChoice: ConsentChoice | null | undefined;

function isChoice(value: unknown): value is ConsentChoice {
  return value === "accepted" || value === "declined";
}

function readCookie(): ConsentChoice | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.slice(CONSENT_COOKIE.length + 1));
  return isChoice(value) ? value : null;
}

function readStorage(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return isChoice(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * The stored choice, or null when the visitor has not answered yet.
 * Memoised for the page lifetime unless {@link writeConsent} changes it.
 */
export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  if (cachedChoice !== undefined) return cachedChoice;
  cachedChoice = readStorage() ?? readCookie();
  return cachedChoice;
}

export function writeConsent(choice: ConsentChoice): void {
  if (typeof window === "undefined") return;
  cachedChoice = choice;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Storage can be unavailable in private modes; the cookie still records it.
  }
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  for (const listener of listeners) listener(choice);
  for (const listener of storeListeners) listener();
}

export function hasAnalyticsConsent(): boolean {
  return readConsent() === "accepted";
}

/** Subscribe to consent changes. Returns an unsubscribe function. */
export function subscribeConsent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Snapshot for {@link https://react.dev/reference/react/useSyncExternalStore}.
 * "unknown" until the browser can read the stored answer, so the server and the
 * hydration render agree and nothing consent-dependent flashes.
 */
export function getConsentSnapshot(): ConsentState {
  if (typeof window === "undefined") return "unknown";
  const stored = readStorage() ?? readCookie();
  cachedChoice = stored;
  return stored ?? "none";
}

export function getConsentServerSnapshot(): ConsentState {
  return "unknown";
}

export function subscribeConsentStore(listener: StoreListener): () => void {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

/** Test seam: forget the memoised answer. */
export function resetConsentCache(): void {
  cachedChoice = undefined;
}
