import { marked, type Token, type Tokens } from 'marked';

/**
 * Turns a guide article's Markdown into the structure the page renders: the
 * body tokens, a table of contents, the FAQ (shown on the page and described in
 * FAQPage schema) and the outside sources it links to. Pure, so it runs at
 * build time and in tests.
 */

export type CalloutKind = 'tip' | 'note' | 'warning';

export interface CalloutToken {
  type: 'callout';
  kind: CalloutKind;
  tokens: Token[];
}

export type GuideBlock = Token | CalloutToken;

export interface GuideHeading {
  id: string;
  text: string;
}

export interface GuideFaqItem {
  id: string;
  question: string;
  /** Plain text of the answer, for FAQPage schema. */
  answer: string;
  tokens: GuideBlock[];
}

export interface GuideSource {
  url: string;
  host: string;
  label: string;
}

export interface ParsedGuide {
  blocks: GuideBlock[];
  headings: GuideHeading[];
  faq: GuideFaqItem[];
  sources: GuideSource[];
  wordCount: number;
}

const FAQ_HEADING = /^frequently asked questions$/iu;
const CALLOUT_MARKER = /^\s*\[!(TIP|NOTE|WARNING)\]\s*/u;

/** Typographer's quotes and apostrophes for prose typed with straight ones. */
export function smartQuotes(text: string): string {
  return text
    .replace(/(^|[\s(\[{\u2014\u2013/-])"/gu, '$1\u201c')
    .replace(/"/gu, '\u201d')
    .replace(/(^|[\s(\[{\u2014\u2013/-])'/gu, '$1\u2018')
    .replace(/'/gu, '\u2019');
}

export function headingId(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/gu, '')
      .replace(/[’']/gu, '')
      .replace(/[^a-z0-9]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .slice(0, 80) || 'section'
  );
}

/** Plain text of inline or block tokens, without Markdown syntax. */
export function plainText(tokens: readonly Token[] | undefined): string {
  if (!tokens) return '';
  return tokens
    .map((token) => {
      if ('tokens' in token && Array.isArray(token.tokens) && token.tokens.length) return plainText(token.tokens);
      if (token.type === 'list') return (token as Tokens.List).items.map((item) => plainText(item.tokens)).join(' ');
      if (token.type === 'table') {
        const table = token as Tokens.Table;
        return [...table.header, ...table.rows.flat()].map((cell) => plainText(cell.tokens)).join(' ');
      }
      if (token.type === 'space' || token.type === 'html') return ' ';
      return 'text' in token && typeof token.text === 'string' ? token.text : '';
    })
    .join('')
    .replace(/\s+/gu, ' ')
    .trim();
}

function toCallout(token: Tokens.Blockquote): CalloutToken | null {
  const match = CALLOUT_MARKER.exec(token.text);
  if (!match) return null;
  const kind = match[1]!.toLowerCase() as CalloutKind;
  return { type: 'callout', kind, tokens: marked.lexer(token.text.slice(match[0].length)) };
}

function withCallouts(tokens: Token[]): GuideBlock[] {
  return tokens
    .filter((token) => token.type !== 'space')
    .map((token) => (token.type === 'blockquote' ? toCallout(token as Tokens.Blockquote) ?? token : token));
}

function collectLinks(tokens: readonly Token[], into: Map<string, GuideSource>) {
  for (const token of tokens) {
    if (token.type === 'link') {
      const link = token as Tokens.Link;
      if (/^https?:\/\//iu.test(link.href) && !into.has(link.href)) {
        let host = link.href;
        try {
          host = new URL(link.href).hostname.replace(/^www\./u, '');
        } catch {
          // Keep the raw href as its own label.
        }
        into.set(link.href, { url: link.href, host, label: plainText(link.tokens) || host });
      }
    }
    if (token.type === 'table') {
      const table = token as Tokens.Table;
      for (const cell of [...table.header, ...table.rows.flat()]) collectLinks(cell.tokens, into);
    }
    if (token.type === 'list') for (const item of (token as Tokens.List).items) collectLinks(item.tokens, into);
    if ('tokens' in token && Array.isArray(token.tokens)) collectLinks(token.tokens, into);
  }
}

function countWords(text: string): number {
  return text.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

export function parseGuide(markdown: string): ParsedGuide {
  const tokens = marked.lexer(markdown);
  const faqStart = tokens.findIndex((token) => token.type === 'heading' && (token as Tokens.Heading).depth === 2 && FAQ_HEADING.test((token as Tokens.Heading).text.trim()));
  const bodyTokens = faqStart === -1 ? tokens : tokens.slice(0, faqStart);
  const faqTokens = faqStart === -1 ? [] : tokens.slice(faqStart + 1);

  const usedIds = new Set<string>(['short-answer', 'in-short', 'open-now', 'questions', 'sources', 'keep-reading']);
  const uniqueId = (text: string) => {
    const base = headingId(text);
    let id = base;
    for (let n = 2; usedIds.has(id); n += 1) id = `${base}-${n}`;
    usedIds.add(id);
    return id;
  };

  const headings: GuideHeading[] = [];
  const blocks = withCallouts(bodyTokens).map((block) => {
    if (block.type === 'heading') {
      const heading = block as Tokens.Heading;
      const text = smartQuotes(plainText(heading.tokens));
      const id = uniqueId(text);
      if (heading.depth === 2) headings.push({ id, text });
      return { ...heading, id } as Tokens.Heading & { id: string };
    }
    return block;
  });

  const faq: GuideFaqItem[] = [];
  for (const token of faqTokens) {
    if (token.type === 'heading' && (token as Tokens.Heading).depth === 3) {
      const question = smartQuotes(plainText((token as Tokens.Heading).tokens));
      faq.push({ id: uniqueId(question), question, answer: '', tokens: [] });
    } else if (faq.length && token.type !== 'space') {
      faq.at(-1)!.tokens.push(...withCallouts([token]));
    }
  }
  for (const item of faq) item.answer = plainText(item.tokens.filter((token): token is Token => token.type !== 'callout'));

  const links = new Map<string, GuideSource>();
  collectLinks(tokens, links);

  return {
    blocks,
    headings,
    faq,
    sources: [...links.values()],
    wordCount: countWords(plainText(tokens)),
  };
}

/** Minutes to read at an unhurried 230 words a minute. */
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 230));
}
