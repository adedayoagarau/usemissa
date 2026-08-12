export interface RobotsGroup {
  agents: string[];
  disallow: string[];
  allow: string[];
  crawlDelaySeconds?: number;
}

function groupForUserAgent(robotsTxt: string, userAgent: string): RobotsGroup | undefined {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | undefined;
  let sawDirectiveSinceLastAgent = false;

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0]?.trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === "user-agent") {
      if (!current || sawDirectiveSinceLastAgent) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
        sawDirectiveSinceLastAgent = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (!current) continue;
    if (key === "disallow" && value) current.disallow.push(value);
    if (key === "allow" && value) current.allow.push(value);
    if (key === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) current.crawlDelaySeconds = seconds;
    }
    if (key === "disallow" || key === "allow" || key === "crawl-delay") sawDirectiveSinceLastAgent = true;
  }

  const normalizedUserAgent = userAgent.toLowerCase();
  return groups.find((candidate) => candidate.agents.some((agent) => agent !== "*" && (normalizedUserAgent.includes(agent) || agent.includes(normalizedUserAgent)))) ?? groups.find((candidate) => candidate.agents.includes("*"));
}

/** Minimal RFC 9309 robots parser shared by fetch and source promotion. */
export function parseDisallowForUserAgent(robotsTxt: string, userAgent: string): string[] {
  return groupForUserAgent(robotsTxt, userAgent)?.disallow ?? [];
}

export function parseCrawlDelayForUserAgent(robotsTxt: string, userAgent: string): number | undefined {
  return groupForUserAgent(robotsTxt, userAgent)?.crawlDelaySeconds;
}

export function robotsAllowsPath(robotsTxt: string, path: string, userAgent: string): boolean {
  const disallow = parseDisallowForUserAgent(robotsTxt, userAgent);
  return !disallow.some((prefix) => path.startsWith(prefix));
}
