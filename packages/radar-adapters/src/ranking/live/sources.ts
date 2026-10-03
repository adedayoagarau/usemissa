/**
 * Accolade sources for the Missa Literary Magazine Index: where each edition
 * lives, how to read it, and when a fetched edition is safe to accept.
 * Parsers are pure so they can be tested against saved pages.
 */

export type RankingSourceId = "garstang" | "best_microfiction" | "best_small_fictions";
export type SourceGenre = "fiction" | "poetry" | "nonfiction";

export const SOURCE_NAMES: Record<RankingSourceId, string> = {
  garstang: "Clifford Garstang, Literary Magazine Ranking",
  best_microfiction: "Best Microfiction",
  best_small_fictions: "Best Small Fictions",
};

export interface PushcartTableRow {
  rank: number;
  name: string;
  priorRank: number | null;
  score: number;
  marker: "closed" | "hiatus" | "uncertain" | null;
}

export interface AnthologyEntry {
  magazine: string;
  pieceTitle: string;
  author: string;
}

export interface SourceEdition {
  source: RankingSourceId;
  editionYear: number;
  genre: SourceGenre | null;
  url: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  nbsp: " ",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  copy: "©",
  eacute: "é",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const value =
        code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : whole;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** Visible text with list items and table cells on their own lines. */
export function htmlToLines(html: string): string[] {
  const withoutScripts = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
  const broken = withoutScripts.replace(/<br\s*\/?>|<\/(p|li|div|h\d|tr)>/gi, "\n");
  return decodeEntities(broken.replace(/<[^>]+>/g, ""))
    .replace(/ /g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// --- Clifford Garstang -------------------------------------------------------

export function garstangUrl(year: number, genre: SourceGenre): string {
  return `https://cliffordgarstang.com/${year}-literary-magazine-ranking-${genre}/`;
}

export const GARSTANG_METHODOLOGY_URL = (year: number) =>
  `https://cliffordgarstang.com/${year}-literary-magazine-rankings-overview/`;

const MARKERS: Array<[string, PushcartTableRow["marker"]]> = [
  ["©", "closed"],
  ["(H)", "hiatus"],
  ["(?)", "uncertain"],
];

/** Rows of one Garstang table: rank, magazine, prior rank, ten-year score. */
export function parseGarstangTable(html: string): PushcartTableRow[] {
  const article = html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html;
  const rows: PushcartTableRow[] = [];
  for (const tr of article.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      decodeEntities(m[1]!.replace(/<[^>]+>/g, ""))
        .replace(/ /g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    if (cells.length < 4 || !/^\d+$/.test(cells[0]!) || !/^\d+(\.\d+)?$/.test(cells[3]!)) continue;
    let name = cells[1]!;
    let marker: PushcartTableRow["marker"] = null;
    for (const [symbol, label] of MARKERS) {
      if (name.includes(symbol)) {
        marker = label;
        name = name.replace(symbol, "").replace(/\s+/g, " ").trim();
      }
    }
    if (!name) continue;
    rows.push({
      rank: Number(cells[0]),
      name,
      priorRank: /^\d+$/.test(cells[2]!) ? Number(cells[2]) : null,
      score: Number(cells[3]),
      marker,
    });
  }
  return rows;
}

// --- Best Microfiction -------------------------------------------------------

export function bestMicrofictionUrl(year: number): string {
  return `https://bestmicrofiction.com/index_${year}.html`;
}

/** "Author, “Title” (Magazine)" lines from a Best Microfiction contents page. */
export function parseBestMicrofiction(html: string): AnthologyEntry[] {
  return dedupeEntries(
    htmlToLines(html).flatMap((line) => {
      const match = line.match(/^(.+?),\s*“([^”]+)”\s*\(\s*(.+?)\s*\)\s*$/);
      return match
        ? [{ author: match[1]!.trim(), pieceTitle: match[2]!.trim(), magazine: match[3]!.trim() }]
        : [];
    }),
  );
}

// --- Best Small Fictions ------------------------------------------------------

export const BEST_SMALL_FICTIONS_INDEX_URL = "https://altcurrentpress.com/best-small-fictions/";

/** Edition pages linked from the publisher's series page, keyed by edition year. */
export function discoverBestSmallFictionsEditions(indexHtml: string): Map<number, string> {
  const editions = new Map<number, string>();
  const pattern =
    /https:\/\/altcurrentpress\.com\/\d{4}\/\d{2}\/\d{2}\/best-small-fictions-(\d{4})\/?/g;
  for (const match of indexHtml.matchAll(pattern)) {
    const year = Number(match[1]);
    const url = match[0].endsWith("/") ? match[0] : `${match[0]}/`;
    if (!editions.has(year)) editions.set(year, url);
  }
  return editions;
}

/** "“Title” by Author / Magazine" lines after the edition's "Selections" heading. */
export function parseBestSmallFictions(html: string, editionYear: number): AnthologyEntry[] {
  const lines = htmlToLines(html);
  const start = lines.findIndex((line) => line === `${editionYear} Selections`);
  if (start < 0) return [];
  return dedupeEntries(
    lines.slice(start + 1).flatMap((line) => {
      // The closing quote is sometimes missing on the publisher's page.
      const match = line.match(/^“(.+?)”?\s+by\s+([^/]+?)\s*\/\s*(.+?)\s*\*?$/);
      return match
        ? [
            {
              pieceTitle: match[1]!.replace(/”$/, "").trim(),
              author: match[2]!.trim(),
              magazine: match[3]!.replace(/\*+$/, "").trim(),
            },
          ]
        : [];
    }),
  );
}

function dedupeEntries(entries: AnthologyEntry[]): AnthologyEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    // The same piece can be listed twice with the author's name inverted.
    const key = `${entry.pieceTitle.toLowerCase()}\u0000${entry.magazine.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Acceptance --------------------------------------------------------------

export const MIN_EDITION_ROWS: Record<RankingSourceId, number> = {
  garstang: 100,
  best_microfiction: 40,
  best_small_fictions: 40,
};

/**
 * A fetched edition replaces stored data only when it looks like a whole
 * table: enough rows, and not far smaller than the edition it replaces.
 */
export function validateEdition(
  source: RankingSourceId,
  rowCount: number,
  previousRowCount: number | null,
): { accepted: true } | { accepted: false; reason: string } {
  if (rowCount < MIN_EDITION_ROWS[source]) {
    return { accepted: false, reason: `only ${rowCount} rows (minimum ${MIN_EDITION_ROWS[source]})` };
  }
  if (previousRowCount != null && rowCount < previousRowCount * 0.8) {
    return {
      accepted: false,
      reason: `${rowCount} rows is under 80% of the ${previousRowCount} already stored`,
    };
  }
  return { accepted: true };
}

/** Editions worth checking on a given date. */
export function editionsToCheck(today: Date): SourceEdition[] {
  const year = today.getUTCFullYear();
  const editions: SourceEdition[] = [];
  // Garstang posts year Y's tables around 1 January of Y; check this year and next.
  for (const editionYear of [year, year + 1]) {
    for (const genre of ["fiction", "poetry", "nonfiction"] as const) {
      editions.push({ source: "garstang", editionYear, genre, url: garstangUrl(editionYear, genre) });
    }
  }
  // Best Microfiction publishes each summer.
  for (const editionYear of [year - 1, year]) {
    editions.push({
      source: "best_microfiction",
      editionYear,
      genre: null,
      url: bestMicrofictionUrl(editionYear),
    });
  }
  return editions;
}
