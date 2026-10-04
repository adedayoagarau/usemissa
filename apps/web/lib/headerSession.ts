import type { SessionAccount } from "@/lib/auth";
import type { BrowserSession } from "@/lib/browserSession";

/**
 * The site header's view of a session the page already resolved on the
 * server, so the header does not ask for it again in the browser.
 */
export function headerSessionFor(
  session: SessionAccount | undefined,
): BrowserSession {
  return session
    ? {
        email: session.account.email,
        hasOrganization: session.memberships.length > 0,
      }
    : null;
}
