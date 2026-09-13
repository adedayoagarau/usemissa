import "server-only";

import { headers } from "next/headers";

import { safeAuthRedirect } from "./authRedirect";

/** Build the login destination from the exact path recorded by the proxy. */
export async function loginRedirectForCurrentRequest(): Promise<string> {
  const requestHeaders = await headers();
  const returnPath = safeAuthRedirect(
    requestHeaders.get("x-missa-request-path") ?? undefined,
  );
  return `/login?next=${encodeURIComponent(returnPath)}`;
}
