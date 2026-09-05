import { Resolver } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";

export function isPublicV4(address: string) {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}
const clean = (value: string) =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
export async function portfolioLinkMetadata(
  raw: string,
  depth = 0,
): Promise<{ title: string; description: string; hostname: string }> {
  const url = new URL(raw);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port)) ||
    !url.hostname.includes(".") ||
    /\.(localhost|local|internal)$/i.test(url.hostname)
  )
    throw new Error("Unsupported address");
  const resolver = new Resolver({ timeout: 1500, tries: 1 });
  const addresses = isIP(url.hostname)
    ? [url.hostname]
    : await resolver.resolve4(url.hostname);
  if (!addresses.length || addresses.some((address) => !isPublicV4(address)))
    throw new Error("Unsupported address");
  // Pin the validated DNS result. Redirects go through this validation again.
  const result = await new Promise<{ html?: string; redirect?: string }>(
    (resolve, reject) => {
      const transport = url.protocol === "https:" ? https : http;
      const request = transport.get(
        url,
        {
          family: 4,
          agent: false,
          lookup: (_host, _options, callback) =>
            callback(null, addresses[0], 4),
          headers: {
            "user-agent": "MissaPortfolioPreview/1.0",
            accept: "text/html",
            "accept-encoding": "identity",
          },
        },
        (response) => {
          if (
            [301, 302, 303, 307, 308].includes(response.statusCode ?? 0) &&
            response.headers.location
          ) {
            response.destroy();
            resolve({ redirect: response.headers.location });
            return;
          }
          if (
            response.statusCode !== 200 ||
            !response.headers["content-type"]?.includes("text/html")
          ) {
            response.destroy();
            reject(new Error("Preview unavailable"));
            return;
          }
          let bytes = 0;
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > 512000) {
              response.destroy();
              reject(new Error("Page too large"));
            } else chunks.push(chunk);
          });
          response.on("end", () =>
            resolve({ html: Buffer.concat(chunks).toString("utf8") }),
          );
          response.on("error", reject);
        },
      );
      const timer = setTimeout(
        () => request.destroy(new Error("Preview timed out")),
        4500,
      );
      request.on("close", () => clearTimeout(timer));
      request.on("error", reject);
    },
  );
  if (result.redirect) {
    if (depth >= 2) throw new Error("Too many redirects");
    return portfolioLinkMetadata(new URL(result.redirect, url).href, depth + 1);
  }
  const html = result.html ?? "";
  const metadata: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g))
      attrs[match[1].toLowerCase()] = match[3];
    const key = attrs.property || attrs.name;
    if (key && attrs.content)
      metadata[key.toLowerCase()] = clean(attrs.content);
  }
  return {
    title: (
      metadata["og:title"] ||
      clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") ||
      url.hostname
    ).slice(0, 200),
    description: (
      metadata["og:description"] ||
      metadata.description ||
      ""
    ).slice(0, 300),
    hostname: url.hostname,
  };
}
