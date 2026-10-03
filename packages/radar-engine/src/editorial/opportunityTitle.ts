/**
 * Deterministic editorial pass for opportunity titles.
 *
 * The pass is intentionally rule-based (no model calls) so every change is
 * reproducible, testable, and explainable in review evidence. It only adjusts
 * the case of words written entirely in ASCII letters; words in any other
 * script, or words containing combining marks, are left exactly as written.
 */

export interface OpportunityTitleOptions {
  /** Confirmed organization name, when one is known. */
  organizationName?: string | null;
}

export type OpportunityTitleChange =
  | 'decoded-entities'
  | 'removed-decorations'
  | 'collapsed-whitespace'
  | 'fixed-punctuation-spacing'
  | 'normalized-separators'
  | 'trimmed-separators'
  | 'removed-truncation'
  | 'moved-edition-code'
  | 'recased'
  | 'added-organization';

export interface OpportunityTitleResult {
  /** The title exactly as it was received. */
  rawTitle: string;
  /** The editorial title, including the organization prefix when one was added. */
  title: string;
  /** The cleaned title before any organization prefix. */
  label: string;
  changed: boolean;
  changes: OpportunityTitleChange[];
  /** The label is a bare section, genre, status, or year/season label. */
  genericLabel: boolean;
  /**
   * The label cannot identify the opportunity on its own: it is generic, or it
   * is a short label scraped in all-lowercase with no other identity signal.
   */
  weakIdentity: boolean;
  organizationName: string | null;
  organizationInTitle: boolean;
  /** A weak label with no known organization. It must not publish automatically. */
  needsOrganization: boolean;
}

export interface OpportunityRelevanceResult {
  /** False means the record is probably not an opportunity and should not publish. */
  relevant: boolean;
  signals: string[];
}

const ORGANIZATION_SEPARATOR = ' — ';

// Emoji (including ZWJ sequences, skin tones and presentation selectors),
// keycaps, regional-indicator flags, and other pictographic symbols.
const EMOJI_SEQUENCE = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:[︎️\u{1F3FB}-\u{1F3FF}]|‍(?:\p{Extended_Pictographic}|\p{Regional_Indicator}))*[︎️]?/gu;
const KEYCAP = /[0-9#*][︎️]?⃣/gu;
// "Symbol, other" covers dingbats, stars, snowflakes, boxes and similar marks
// that are decorative in titles. Arrows are math symbols, listed separately.
const DECORATIVE_SYMBOL = /[\p{So}←-⇿⟰-⟿⤀-⥿⬀-⯿]/gu;
const STRAY_PRESENTATION = /[︎️⃣]/gu;
const DECORATIVE_RUN = /[*~]+|_{2,}|={2,}|\^{2,}/g;

const SPACE = /[\s   -​  ⁠　﻿]+/gu;
const EDGE_SEPARATORS = /^[\s\-–—|:;,·•/\\]+|[\s\-–—|:;,·•/\\]+$/gu;
const SPACED_SEPARATOR = /\s+(?:-{1,2}|–|—|\||·|•)\s+/gu;

const SMALL_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'en', 'for', 'from', 'if', 'in', 'into', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'v', 'vs', 'via', 'with',
]);

// Upper-case forms that should survive recasing. Ambiguous two-letter words
// (US, IT, IN, OR, ME, MA, LA, OK, HI, AS, AT, ID) are deliberately excluded.
const ACRONYMS = new Set([
  'AAPI', 'AI', 'ASL', 'AWP', 'BA', 'BAME', 'BBC', 'BC', 'BFA', 'BIPOC', 'CBC', 'CFP', 'CNF', 'DC', 'DEI', 'DIY', 'DJ', 'EP', 'EU', 'FAQ', 'HBCU', 'HIV',
  'ISBN', 'ISSN', 'LGBT', 'LGBTQ', 'LGBTQI', 'LGBTQIA', 'LP', 'MFA', 'MG', 'NEA', 'NEH', 'NFT', 'NGO', 'NPR', 'NY', 'NYC', 'NYSCA', 'PDF',
  'PEN', 'POC', 'QTBIPOC', 'SF', 'SFF', 'SFWA', 'TV', 'UK', 'UN', 'USA', 'VR', 'AR', 'XR', 'YA',
]);
const SPECIAL_CASES = new Map([
  ['phd', 'PhD'],
  ['2slgbtq', '2SLGBTQ'],
  ['2slgbtqia', '2SLGBTQIA'],
]);
const ROMAN_NUMERAL = /^(?=[ivxl])(?:xl|l?x{0,3})(?:ix|iv|v?i{0,3})$/i;

const GENERIC_WORDS = new Set([
  // forms and genres
  'fiction', 'poetry', 'poem', 'poems', 'nonfiction', 'non', 'creative', 'cnf', 'essay', 'essays', 'flash', 'short', 'story', 'stories', 'prose',
  'hybrid', 'translation', 'translations', 'review', 'reviews', 'art', 'arts', 'visual', 'artwork', 'artworks', 'photography', 'photo', 'photos',
  'comics', 'comic', 'graphic', 'illustration', 'drama', 'play', 'plays', 'playwriting', 'script', 'scripts', 'screenplay', 'screenplays',
  'screenwriting', 'music', 'film', 'films', 'video', 'audio', 'dance', 'performance', 'interview', 'interviews', 'criticism', 'book', 'books',
  'chapbook', 'chapbooks', 'manuscript', 'manuscripts', 'novel', 'novels', 'memoir', 'writing', 'work', 'works', 'pitch', 'pitches', 'pitching',
  // call and status words
  'general', 'submission', 'submissions', 'submit', 'submitting', 'call', 'calls', 'open', 'opening', 'always', 'rolling', 'now', 'closed',
  'guidelines', 'reading', 'period', 'periods', 'contest', 'contests', 'prize', 'prizes', 'competition', 'competitions', 'award', 'awards',
  'fellowship', 'fellowships', 'grant', 'grants', 'residency', 'residencies', 'anthology', 'issue', 'issues', 'volume', 'edition', 'theme',
  'themed', 'special', 'writers', 'writer', 'artists', 'artist', 'poets', 'poet', 'new', 'upcoming', 'current', 'all', 'genres', 'genre',
  'other', 'misc', 'miscellaneous', 'emerging', 'opportunity', 'opportunities', 'info', 'information', 'details', 'apply', 'application',
  'applications', 'entry', 'entries', 'deadline', 'deadlines', 'page', 'contributors', 'contribute', 'content',
  // function words
  'for', 'and', 'the', 'of', 'our', 'to', 'in', 'a', 'an', 'on', 'or', 'by', 'with',
]);
const SEASONS = new Set(['spring', 'summer', 'fall', 'autumn', 'winter', 'season', 'quarter']);
const YEAR_TOKEN = /^(?:\d{1,4}(?:[/-]\d{1,4})?[a-z]?|q[1-4]|h[12])$/i;

const ORGANIZATION_SUFFIX = /\s+(?:literary\s+magazine|lit\s+mag|magazine|journal|quarterly|review|press|books|inc|llc|ltd|foundation|organization|organisation)$/i;

function collapse(value: string): string {
  return value.replace(SPACE, ' ').trim();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '\u2013', mdash: '\u2014', hellip: '\u2026',
  lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d',
};

/** Decodes HTML entities left over from scraped titles, e.g. "&amp;" or "&#8217;". Runs twice to undo double-encoding. */
export function decodeHtmlEntities(value: string): string {
  const decodeOnce = (input: string) => input.replace(/&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|[a-z]{2,8});/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1]?.toLowerCase() === 'x' ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
  return decodeOnce(decodeOnce(value));
}

function stripDecorations(value: string): string {
  return value
    .replace(KEYCAP, ' ')
    .replace(EMOJI_SEQUENCE, ' ')
    .replace(DECORATIVE_SYMBOL, ' ')
    .replace(STRAY_PRESENTATION, '')
    .replace(DECORATIVE_RUN, ' ');
}

function trimEdges(value: string): string {
  return value.replace(EDGE_SEPARATORS, '').trim();
}

const DANGLING_WORD = /\s+(?:a|an|and|as|at|but|by|for|from|in|into|is|are|its|of|on|or|our|per|the|their|to|via|with)$/iu;

/**
 * Removes the "..." a search snippet leaves on a cut-off title. When the cut
 * fell inside a word ("Architectur..."), that partial word goes too, then any
 * dangling small word or separator. A title that would shrink to one word is
 * left alone.
 */
function removeTruncation(value: string): string {
  const match = /^(.*?)(\s*)(?:\.{3}|\u2026)\s*$/u.exec(value);
  if (!match) return value;
  let body = match[1] ?? '';
  if ((match[2] ?? '').length === 0) body = body.replace(/\s*\S+$/u, '');
  let previous: string;
  do {
    previous = body;
    body = trimEdges(body).replace(DANGLING_WORD, '');
  } while (body !== previous);
  return body.split(/\s+/).filter(Boolean).length >= 2 ? body : value;
}

function isAsciiWord(core: string): boolean {
  return /^[A-Za-z]+(?:['’][A-Za-z]+)*$/.test(core);
}

function capitalize(core: string): string {
  return core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
}

function casePart(part: string, options: { first: boolean; last: boolean }): string {
  const lower = part.toLowerCase();
  const special = SPECIAL_CASES.get(lower);
  if (special) return special;
  if (!isAsciiWord(part)) return part;
  if (ACRONYMS.has(part.toUpperCase())) return part.toUpperCase();
  if (ROMAN_NUMERAL.test(part) && lower !== 'i') return part.toUpperCase();
  if (lower === 'i') return 'I';
  if (!options.first && !options.last && SMALL_WORDS.has(lower)) return lower;
  return capitalize(part);
}

function caseToken(token: string, options: { first: boolean; last: boolean }): string {
  const match = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u.exec(token);
  if (!match) return token;
  const [, lead = '', core = '', trail = ''] = match;
  if (!core) return token;
  // Words that carry digits (years, edition codes) or any non-ASCII letter or
  // mark are left untouched so names in other scripts are never mangled.
  if (/\d/.test(core) && !SPECIAL_CASES.has(core.toLowerCase())) return token;
  const parts = core.split(/([-/])/);
  if (parts.some((part, index) => index % 2 === 0 && part.length > 0 && !isAsciiWord(part) && !SPECIAL_CASES.has(part.toLowerCase()))) return token;
  const cased = parts
    .map((part, index) => {
      if (index % 2 === 1 || part.length === 0) return part;
      const isFirstPart = index === 0;
      return casePart(part, {
        first: options.first && isFirstPart,
        last: options.last && index === parts.length - 1,
      });
    })
    .join('');
  return `${lead}${cased}${trail}`;
}

/** Recases a run of words to title case, restarting the small-word rule after ":" and "—". */
function toTitleCase(value: string): string {
  const tokens = value.split(' ');
  let segmentStart = true;
  return tokens
    .map((token, index) => {
      if (token === '—' || token === '–') {
        segmentStart = true;
        return token;
      }
      const next = tokens[index + 1];
      const last = index === tokens.length - 1 || next === '—' || next === '–';
      const cased = caseToken(token, { first: segmentStart, last });
      segmentStart = /[:—]$/.test(token);
      return cased;
    })
    .join(' ');
}

function hasLowercase(value: string): boolean {
  return /\p{Ll}/u.test(value);
}

function hasUppercase(value: string): boolean {
  return /\p{Lu}/u.test(value);
}

function isAllCaps(value: string): boolean {
  return !hasLowercase(value) && (value.match(/[A-Z]/g)?.length ?? 0) >= 3;
}

function isAllLowercase(value: string): boolean {
  return !hasUppercase(value) && /[a-z]/.test(value);
}

/**
 * A short all-caps title that is more than a section label is usually an
 * acronym or a stylized name ("SXSW 2027", "SCBWI", "CHEAP POP"), so recasing
 * it would damage it. The tell is a short word that is neither a known acronym
 * nor a label word. "POETRY" and "NEA LITERATURE FELLOWSHIPS" still recase.
 */
function isStylizedCapsName(value: string): boolean {
  const words = value.split(' ').map((word) => word.replace(/[^\p{L}]/gu, '')).filter((word) => word.length > 0);
  if (words.length === 0 || words.length > 3 || isGenericOpportunityLabel(value)) return false;
  return words.some((word) => isAsciiWord(word) && word.length <= 5 && !ACRONYMS.has(word) && !GENERIC_WORDS.has(word.toLowerCase()) && !SMALL_WORDS.has(word.toLowerCase()) && !ROMAN_NUMERAL.test(word));
}

/** Recases shouting segments inside an otherwise mixed-case title ("— ALWAYS OPEN"). */
function recaseShoutingSegments(value: string): string {
  return value
    .split(/(\s—\s|:\s)/)
    .map((segment, index) => {
      if (index % 2 === 1) return segment;
      const words = segment.split(' ').filter((word) => /[A-Za-z]/.test(word));
      if (words.length < 2 || !isAllCaps(segment)) return segment;
      // The first segment is usually the organization, where short all-caps
      // brand names ("TOMA HOUSE AIR", "ONLY POEMS") are deliberate.
      if (index === 0 && isStylizedCapsName(segment)) return segment;
      const allAcronyms = words.every((word) => ACRONYMS.has(word.replace(/[^A-Za-z]/g, '').toUpperCase()));
      return allAcronyms ? segment : toTitleCase(segment);
    })
    .join('');
}

function wordTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[\s\-–—/:,&()+|.!?'"’“”[\]]+/u)
    .filter((token) => token.length > 0);
}

/** True when the label is only a section, genre, call, status, or year/season label. */
export function isGenericOpportunityLabel(label: string): boolean {
  const tokens = wordTokens(label);
  if (tokens.length === 0) return true;
  let substantive = 0;
  for (const token of tokens) {
    if (YEAR_TOKEN.test(token) || SEASONS.has(token) || ROMAN_NUMERAL.test(token)) {
      substantive += 1;
      continue;
    }
    if (!GENERIC_WORDS.has(token)) return false;
    if (!['for', 'and', 'the', 'of', 'our', 'to', 'in', 'a', 'an', 'on', 'or', 'by', 'with'].includes(token)) substantive += 1;
  }
  return substantive > 0;
}

function fold(value: string): string {
  return ` ${value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()} `;
}

// Listing sites, opportunity newsletters, and submission platforms. Their name
// is where a record was found, not who runs the opportunity, so it never
// belongs in a title. Several were found in production attached to dozens of
// other organizations' calls (Chateau Orquevaux, Studio Ofo, ART COMP).
const LISTING_PLATFORMS = new Set([
  'art comp', 'artcall', 'artconnect', 'artinfoland', 'artis', 'cafe', 'callforentry', 'chateau orquevaux', 'chill subs', 'cmf fmc',
  'community of literary magazines and presses', 'creative organization', 'curatorspace', 'curatorspace partner', 'duotrope', 'dutchculture',
  'archdaily', 'entrythingy', 'eri', 'filmfreeway', 'grants gov', 'music in africa', 'newpages', 'newpages com', 'on the move', 'playbill',
  'poets and writers', 'res artis', 'sessionize', 'studio ofo', 'submittable', 'transartists', 'tur', 'vis', 'zapplication',
]);
// "Submittable for Horror Writers Assoc." names the platform and then the organization.
const PLATFORM_PREFIX = /^(?:submittable|filmfreeway|curatorspace)\s+for\s+/i;
const PLACEHOLDER_NAME = /^(?:please\s+wait|loading|just\s+a\s+moment|redirecting|access\s+denied|attention\s+required|untitled|home|error|(?:page\s+)?not\s+found|forms?|professionals?|faqs?|open\s+call\s+faqs?|contest\s+information)\b/i;
const DOMAIN_NAME = /\b[\w-]+\.(?:com|org|net|co|io|gov|edu|info|uk|ca|eu)\b/i;
// A name made only of label words is a section heading, not an organization,
// when it is one word ("FICTION") or uses call words ("Calls & Opportunities").
// Real names built from label words ("32 Poems", "Creative Screenwriting") pass.
const CALL_WORD = /\b(?:calls?|submissions?|submit|opportunit(?:y|ies)|open|contests?|information|info|details|guidelines|apply|applications?|deadlines?|entry|entries|page|general)\b/i;
// One long word that is several words run together, e.g. a site slug.
const RUN_TOGETHER_PART = /(?:press|mag|review|media|films?|arts|council|foundation|society|project|quarterly|literary|awards?|guild|retreat|forum|online|center|centre|publishing|unit|humanities|teachers|world|story|books?|fiction|poetry|engineering)/i;

/**
 * True when a name can stand for the organization in a published title.
 * Rejects scraper placeholders ("Please Wait"), section labels ("Calls &
 * Opportunities"), listing platforms, bare domains, truncated text, and words
 * run together from a URL ("Blackpublicmedia"). A rejected name is treated as
 * unknown, so a weak title stays unpublished instead of being mislabelled.
 */
export function isUsableOrganizationName(name: string): boolean {
  const value = collapse(name);
  if (value.length < 2 || value.length > 80) return false;
  if (PLACEHOLDER_NAME.test(value)) return false;
  if (/(?:\.\.\.|…)$/.test(value) || /[@<>]|\bcall\s+for\b/i.test(value)) return false;
  if (DOMAIN_NAME.test(value)) return false;
  if (/^(?:\S\s){3,}/.test(value)) return false;
  if (isGenericOpportunityLabel(value) && (wordTokens(value).length === 1 || CALL_WORD.test(value))) return false;
  const folded = fold(value).trim();
  if (LISTING_PLATFORMS.has(folded)) return false;
  if (/^\p{Lu}?[a-z]{12,}$/u.test(value)) {
    const rest = value.slice(1);
    if (/^the[a-z]{7,}$/i.test(value) || RUN_TOGETHER_PART.test(rest.slice(2))) return false;
  }
  return true;
}

function cleanOrganizationName(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = trimEdges(collapse(stripDecorations(value))).replace(PLATFORM_PREFIX, '');
  return cleaned.length > 0 && isUsableOrganizationName(cleaned) ? cleaned : null;
}

/** True when the title already names the organization (ignoring case, accents, "The", and common suffixes). */
export function titleContainsOrganization(title: string, organizationName: string): boolean {
  const haystack = fold(title);
  const full = fold(organizationName);
  if (full.trim().length === 0) return false;
  if (haystack.includes(full)) return true;
  const withoutArticle = fold(organizationName.replace(/^the\s+/i, ''));
  if (withoutArticle.trim().length >= 4 && haystack.includes(withoutArticle)) return true;
  const core = fold(organizationName.replace(/^the\s+/i, '').replace(ORGANIZATION_SUFFIX, ''));
  return core.trim().length >= 4 && haystack.includes(core);
}

export function normalizeOpportunityTitle(title: string, options: OpportunityTitleOptions = {}): OpportunityTitleResult {
  const rawTitle = title ?? '';
  const changes = new Set<OpportunityTitleChange>();
  let value = rawTitle.normalize('NFC');

  const decoded = decodeHtmlEntities(value).normalize('NFC');
  if (decoded !== value) changes.add('decoded-entities');
  value = decoded;

  const decorated = stripDecorations(value);
  if (decorated !== value) changes.add('removed-decorations');
  value = decorated;

  const collapsed = collapse(value);
  if (collapsed !== value.trim() || /\s{2,}|[^\S ]/.test(value.trim())) changes.add('collapsed-whitespace');
  value = collapsed;

  const punctuated = value.replace(/\s+([:;,])(?=\s|$)/g, '$1');
  if (punctuated !== value) changes.add('fixed-punctuation-spacing');
  value = punctuated;

  const separated = value.replace(SPACED_SEPARATOR, ORGANIZATION_SEPARATOR);
  if (separated !== value) changes.add('normalized-separators');
  value = separated;

  const untruncated = removeTruncation(value);
  if (untruncated !== value) changes.add('removed-truncation');
  value = untruncated;

  const trimmed = trimEdges(value);
  if (trimmed !== value) changes.add('trimmed-separators');
  value = trimmed;

  const editionCode = /^[([]([^)\]]{1,24})[)\]]\s+(.+)$/u.exec(value);
  if (editionCode && /\d{2,4}|spring|summer|fall|autumn|winter/i.test(editionCode[1] ?? '')) {
    value = `${editionCode[2]} (${editionCode[1]})`;
    changes.add('moved-edition-code');
  }

  const originalAllLowercase = isAllLowercase(value);
  let recased = value;
  if (originalAllLowercase) recased = toTitleCase(value);
  else if (isAllCaps(value)) recased = isStylizedCapsName(value) ? value : toTitleCase(value);
  else recased = recaseShoutingSegments(value);
  if (recased !== value) changes.add('recased');
  value = recased;

  const label = value;
  const genericLabel = isGenericOpportunityLabel(label);
  const letterWords = label.split(' ').filter((word) => /\p{L}/u.test(word));
  const weakIdentity = genericLabel || (originalAllLowercase && letterWords.length <= 4);

  const organizationName = cleanOrganizationName(options.organizationName);
  const organizationInTitle = organizationName ? titleContainsOrganization(label, organizationName) : false;
  let finalTitle = label;
  if (organizationName && !organizationInTitle) {
    finalTitle = label.length > 0 ? `${organizationName}${ORGANIZATION_SEPARATOR}${label}` : organizationName;
    changes.add('added-organization');
  }
  if (finalTitle.length === 0) finalTitle = collapse(rawTitle);

  return {
    rawTitle,
    title: finalTitle,
    label,
    changed: finalTitle !== rawTitle,
    changes: [...changes],
    genericLabel,
    weakIdentity,
    organizationName,
    organizationInTitle,
    needsOrganization: weakIdentity && !organizationName,
  };
}

const CREATIVE_SIGNAL = /\b(?:arts?|artists?|artwork|creative|creators?|writers?|writing|poe(?:t|ts|try|ms?)|fiction|nonfiction|essays?|literary|literature|books?|chapbooks?|manuscripts?|novel|stories|story|music|musicians?|composers?|film|filmmakers?|cinema|video|photograph\w*|dance|dancers?|theat(?:er|re)|playwrights?|perform\w*|craft|crafts|design|designers?|culture|cultural|heritage|humanities|journalism|journalists?|translat\w*|comics?|illustrat\w*|sculpt\w*|paint\w*|residency|residencies|fellowships?|exhibitions?|galler(?:y|ies)|museum|magazine|journal|press|anthology|submissions?)\b/i;

// A title that announces a call is an opportunity even when it mentions a
// blog or a subscription ("Call for Blog Submissions").
const CALL_SIGNAL = /\b(?:call|calls|submissions?|submit|contest|prize|award|open\s+call)\b/i;

// Words that tie a title to the arts, used to spare arts calls from the
// procurement and institutional denylists ("Public Art Request for Proposals").
const STRONG_CREATIVE_SIGNAL = /\b(?:arts?|artists?|artwork|creative|writ\w*|poe\w*|fiction|literary|literature|music\w*|film\w*|danc\w*|theat\w*|paint\w*|sculpt\w*|photograph\w*|humanities|illustrat\w*|comics?|novel\w*|journal|magazine)\b/i;

const NON_OPPORTUNITY_PATTERNS: Array<{ signal: string; pattern: RegExp; requiresNoCreativeSignal?: boolean; requiresNoStrongCreativeSignal?: boolean; unlessCall?: boolean }> = [
  { signal: 'blog-post', pattern: /\bblog\b/i, unlessCall: true },
  { signal: 'how-to-article', pattern: /^\s*how\s+to\s+(?:write|become|get|make|find|start|build|choose|study|use|pitch|poet)\b/i },
  { signal: 'how-to-article', pattern: /^\s*how\s+to\s+apply\b/i, requiresNoCreativeSignal: true },
  { signal: 'newsletter-signup', pattern: /\b(?:newsletter|mailing\s+list)\b.*\b(?:sign\s*-?\s*up|subscribe|join)\b|\b(?:sign\s*-?\s*up|subscribe|join)\b.*\b(?:newsletter|mailing\s+list)\b/i },
  { signal: 'subscription', pattern: /\bsubscri(?:be|ption)s?\b/i, unlessCall: true },
  { signal: 'site-page', pattern: /^\s*(?:about(?:\s+us)?|contact(?:\s+us)?|masthead|staff|privacy\s+policy|terms(?:\s+of\s+(?:service|use))?|log\s*-?\s*in|sign\s*-?\s*in|shop|store|cart|donate|archive|past\s+issues)\s*$/i },
  { signal: 'site-page', pattern: /^\s*(?:terms\s*(?:&|and)\s*conditions|hours,?\s+tickets)\b|^\s*(?:(?:read|see)\s+)?more\W*$/i },
  { signal: 'procurement', pattern: /\b(?:tenders?|procurement|rfps?|request\s+for\s+(?:proposals?|quotations?)|bids?)\b/i, requiresNoStrongCreativeSignal: true },
  { signal: 'non-creative-institution', pattern: /\b(?:admissions?|asylum|immigration|nurse|nursing|p(?:a)?ediatric\w*|medical|clinical|surg(?:ery|ical)|(?:school|college|faculty|department)\s+of\s+medicine|(?:family|community|internal|molecular|emergency)\s+medicine)\b/i, requiresNoStrongCreativeSignal: true },
  { signal: 'non-creative-assistance', pattern: /\b(?:housing|rent(?:al)?\s+assistance|mortgage|homebuyers?|home\s+repair|tenants?|utility|utilities|childcare|food\s+(?:assistance|shelf|bank)|small\s+business(?:es)?|workforce)\b/i, requiresNoCreativeSignal: true },
];

/**
 * Conservative denylist for records that are probably not creative
 * opportunities (blog posts, newsletter sign-ups, site pages, or assistance
 * programs with no creative purpose). The review agent suppresses a match and
 * records the signals; nothing is deleted.
 */
export function assessOpportunityRelevance(title: string): OpportunityRelevanceResult {
  const value = collapse(stripDecorations(title ?? ''));
  const creative = CREATIVE_SIGNAL.test(value);
  const strongCreative = STRONG_CREATIVE_SIGNAL.test(value);
  const call = CALL_SIGNAL.test(value);
  const signals = NON_OPPORTUNITY_PATTERNS
    .filter((entry) => entry.pattern.test(value)
      && (!entry.requiresNoCreativeSignal || !creative)
      && (!entry.requiresNoStrongCreativeSignal || !strongCreative)
      && (!entry.unlessCall || !call))
    .map((entry) => entry.signal);
  return { relevant: signals.length === 0, signals: [...new Set(signals)] };
}
