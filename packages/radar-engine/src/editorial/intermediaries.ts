/**
 * Platforms that list, repost, or collect other organizations' calls. Missa may
 * read them to discover a call, but a call belongs to the organization that
 * runs it: an intermediary is never named as a host, linked to, or credited on
 * a public page, and its link never stands in for the organization's own
 * (docs/opportunity-provenance-and-destination-policy.md).
 *
 * Migration 0094 keeps the same hosts in missa_intermediary_url_pattern();
 * test/intermediaries.test.ts fails when the two lists drift apart.
 */
export interface IntermediaryPlatform {
  name: string;
  /** Registrable domains; every subdomain belongs to the platform too. */
  hosts: string[];
  /** Other spellings of the name, compared after folding case and punctuation. */
  aliases: string[];
  /** How the platform is written in running text. */
  mention: RegExp;
}

export const INTERMEDIARY_PLATFORMS: readonly IntermediaryPlatform[] = [
  { name: 'ArtConnect', hosts: ['artconnect.com'], aliases: ['art connect', 'artconnect opportunities'], mention: /\bart\s?connect\b/i },
  { name: 'Submittable', hosts: ['submittable.com'], aliases: ['submittable discover', 'submittable manager'], mention: /\bsubmittable\b/i },
  { name: 'Chill Subs', hosts: ['chillsubs.com'], aliases: ['chillsubs'], mention: /\bchill\s?subs\b/i },
  { name: 'Poets & Writers', hosts: ['pw.org'], aliases: ['poets and writers', 'poets and writers magazine', 'p and w'], mention: /\bPoets (?:&|and) Writers\b/ },
  { name: 'CLMP', hosts: ['clmp.org'], aliases: ['community of literary magazines and presses'], mention: /\bCLMP\b|\bCommunity of Literary Magazines and Presses\b/ },
  { name: 'Res Artis', hosts: ['resartis.org'], aliases: ['resartis'], mention: /\bres\s?artis\b/i },
  { name: 'CuratorSpace', hosts: ['curatorspace.com'], aliases: ['curator space', 'curatorspace partner'], mention: /\bcurator\s?space\b/i },
  { name: 'TransArtists', hosts: ['transartists.org'], aliases: ['trans artists'], mention: /\btrans\s?artists\b/i },
  { name: 'On the Move', hosts: ['on-the-move.org'], aliases: ['on the move'], mention: /\bOn the Move\b/ },
  { name: 'Artist Communities Alliance', hosts: ['artistcommunities.org'], aliases: ['alliance of artists communities'], mention: /\b(?:Artist Communities Alliance|Alliance of Artists Communities)\b/i },
  { name: 'Rivet', hosts: ['rivet.es'], aliases: [], mention: /\bRivet\b/ },
  { name: 'Open Call Radar', hosts: ['opencallradar.com'], aliases: ['opencallradar'], mention: /\bopen\s?call\s?radar\b/i },
  { name: 'ArtDeadline', hosts: ['artdeadline.com'], aliases: ['art deadline'], mention: /\bart\s?deadline\.com\b|\bArtDeadline\b/ },
  { name: 'FundsforNGOs', hosts: ['fundsforngos.org'], aliases: ['funds for ngos'], mention: /\bfunds\s?for\s?ngos\b/i },
  { name: 'ArtInfoLand', hosts: ['artinfoland.com'], aliases: ['art info land'], mention: /\bart\s?info\s?land\b/i },
  { name: 'Playbill', hosts: ['playbill.com'], aliases: [], mention: /\bPlaybill\b/ },
];

function hostOf(url: string): string | null {
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`);
    return parsed.hostname.toLowerCase().replace(/\.$/, '') || null;
  } catch {
    return null;
  }
}

function fold(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const NAMES = new Map<string, IntermediaryPlatform>();
for (const platform of INTERMEDIARY_PLATFORMS) {
  // Short domain brands ("pw") are other organizations' initials too.
  const brands = platform.hosts.map((host) => host.split('.')[0]!).filter((brand) => brand.length >= 4);
  for (const name of [platform.name, ...platform.aliases, ...brands]) {
    NAMES.set(fold(name), platform);
    NAMES.set(fold(name).replace(/ /g, ''), platform);
  }
}

/** The platform a URL belongs to, or null when it is anyone else's page. */
export function intermediaryForUrl(url: string | null | undefined): IntermediaryPlatform | null {
  const host = url ? hostOf(url.trim()) : null;
  if (!host) return null;
  return INTERMEDIARY_PLATFORMS.find((platform) =>
    platform.hosts.some((domain) => host === domain || host.endsWith(`.${domain}`)),
  ) ?? null;
}

export function isIntermediaryUrl(url: string | null | undefined): boolean {
  return intermediaryForUrl(url) !== null;
}

/** True when an organization name is one of the platforms ("ArtConnect", "Submittable Discover", "Poets & Writers"). */
export function isIntermediaryName(name: string | null | undefined): boolean {
  if (!name) return false;
  const folded = fold(name);
  return NAMES.has(folded) || NAMES.has(folded.replace(/ /g, ''));
}

/** True when text names a platform or carries one of its addresses. */
export function mentionsIntermediary(text: string | null | undefined): boolean {
  if (!text) return false;
  return INTERMEDIARY_PLATFORMS.some((platform) =>
    platform.mention.test(text) || platform.hosts.some((host) => text.toLowerCase().includes(host)),
  );
}

/** The first URL that is not an intermediary's, or undefined. */
export function firstOwnUrl(...urls: Array<string | null | undefined>): string | undefined {
  return urls.find((url): url is string => Boolean(url && url.trim()) && !isIntermediaryUrl(url)) ?? undefined;
}

/**
 * A PostgreSQL regular expression (for `~*`) matching a URL on any intermediary
 * host, including its subdomains. Generated from INTERMEDIARY_PLATFORMS so SQL
 * filters never keep their own copy of the list.
 */
export function intermediaryUrlSqlPattern(): string {
  const hosts = INTERMEDIARY_PLATFORMS.flatMap((platform) => platform.hosts)
    .map((host) => host.replace(/[.\-]/g, (character) => `\\${character}`));
  return `^https?://([^/?#:@]*\\.)?(${hosts.join('|')})(:[0-9]+)?([/?#,[:space:]]|$)`;
}

