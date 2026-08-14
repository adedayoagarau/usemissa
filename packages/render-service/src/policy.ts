/**
 * A render service that will fetch any URL on request is an SSRF proxy. These
 * checks run before a browser is ever opened.
 */

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain", "metadata.google.internal", "metadata"]);

/** Reserved, loopback, link-local, and private ranges, in the forms a URL can carry them. */
function isPrivateAddress(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return true;

  // IPv6 loopback, unique-local (fc00::/7), and link-local (fe80::/10).
  if (host === "::1" || host === "::") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(host)) return true;
  if (host.startsWith("::ffff:")) return isPrivateAddress(host.slice(7));

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!ipv4) return false;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  if ([a, b, Number(ipv4[3]), Number(ipv4[4])].some((part) => part > 255)) return true;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return a >= 224;
}

export type RenderUrlDecision = { allowed: true; url: URL } | { allowed: false; reason: string };

export function assessRenderUrl(value: unknown): RenderUrlDecision {
  if (typeof value !== "string" || !value.trim()) return { allowed: false, reason: "A url string is required" };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { allowed: false, reason: "The url is not parseable" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { allowed: false, reason: "Only http and https URLs can be rendered" };
  if (url.username || url.password) return { allowed: false, reason: "Credentials in the url are not accepted" };
  if (isPrivateAddress(url.hostname)) return { allowed: false, reason: "Private and loopback addresses cannot be rendered" };
  return { allowed: true, url };
}

/** Constant-time-ish comparison so a shared secret cannot be probed byte by byte. */
export function tokenMatches(provided: string | undefined, expected: string): boolean {
  if (!provided || provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}
