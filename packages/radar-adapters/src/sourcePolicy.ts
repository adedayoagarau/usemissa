export interface RobotsGroup {
  agents: string[];
  disallow: string[];
  allow: string[];
}

/** Minimal RFC 9309 robots parser shared by fetch and source promotion. */
export function parseDisallowForUserAgent(robotsTxt: string, userAgent: string): string[] {
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
    if (key === "disallow" || key === "allow" || key === "crawl-delay") sawDirectiveSinceLastAgent = true;
  }

  const normalizedUserAgent = userAgent.toLowerCase();
  const group = groups.find((candidate) => candidate.agents.some((agent) =>
    agent !== "*" && (normalizedUserAgent.includes(agent) || agent.includes(normalizedUserAgent)),
  )) ?? groups.find((candidate) => candidate.agents.includes("*"));
  return group?.disallow ?? [];
}

export function robotsAllowsPath(robotsTxt: string, path: string, userAgent: string): boolean {
  const disallow = parseDisallowForUserAgent(robotsTxt, userAgent);
  return !disallow.some((prefix) => path.startsWith(prefix));
}
