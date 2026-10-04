"use client";

import { useEffect, useState } from "react";
import {
  hasSignedInHint,
  rememberSignedIn,
  SIGNED_IN_ATTRIBUTE,
} from "@/lib/signedInHint";

/** What public pages need to know about the visitor. */
export type BrowserSession = {
  email: string;
  hasOrganization: boolean;
} | null;

let pendingSession: Promise<BrowserSession> | undefined;

/**
 * The visitor's session for pages served from the CDN, shared by every
 * component on the page. Devices that never signed in skip the request
 * (see lib/signedInHint.ts).
 */
export function loadBrowserSession(): Promise<BrowserSession> {
  if (!hasSignedInHint()) return Promise.resolve(null);
  pendingSession ??= fetch("/api/auth/me", { cache: "no-store" })
    .then(async (response): Promise<BrowserSession> => {
      if (response.status === 401) return null;
      if (!response.ok) {
        throw new Error(`Session check failed: ${response.status}`);
      }
      const body = (await response.json()) as {
        account: { email: string };
        memberships: unknown[];
      };
      return {
        email: body.account.email,
        hasOrganization: body.memberships.length > 0,
      };
    })
    .then((session) => {
      rememberSignedIn(session !== null);
      return session;
    })
    .catch((problem: unknown) => {
      pendingSession = undefined;
      throw problem;
    });
  return pendingSession;
}

/** The session loaded in the browser; null until it loads, or when disabled. */
function useLoadedBrowserSession(enabled: boolean): BrowserSession {
  const [session, setSession] = useState<BrowserSession>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadBrowserSession().then(
      (loaded) => {
        if (active) setSession(loaded);
      },
      () => {
        // Unknown: offer the signed-out actions rather than an empty space.
        document.documentElement.removeAttribute(SIGNED_IN_ATTRIBUTE);
      },
    );
    return () => {
      active = false;
    };
  }, [enabled]);

  return session;
}

/**
 * `serverSession` is the server's answer when the page already knows it, and
 * keeps this device's sign-in hint current. Pages served from the CDN pass
 * nothing and the session loads in the browser; until then the visitor is
 * treated as signed out.
 */
export function useBrowserSession(
  serverSession?: BrowserSession,
): BrowserSession {
  const loaded = useLoadedBrowserSession(serverSession === undefined);

  useEffect(() => {
    if (serverSession !== undefined) rememberSignedIn(serverSession !== null);
  }, [serverSession]);

  return serverSession === undefined ? loaded : serverSession;
}

/** Whether the visitor is signed in, loading it in the browser when omitted. */
export function useSignedIn(serverSignedIn?: boolean): boolean {
  const loaded = useLoadedBrowserSession(serverSignedIn === undefined);
  return serverSignedIn ?? loaded !== null;
}
