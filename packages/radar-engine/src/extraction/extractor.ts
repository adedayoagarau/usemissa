import type {
  DeadlineInfo,
  EligibilityRule,
  OpportunityCandidate,
  OpportunityType,
  PageSnapshot,
  Source,
} from '../domain/types.js';
import type { Clock, Extractor } from '../ports.js';
import { parseDate } from './dates.js';
import { extractFee } from './fees.js';
import {
  CLOSED_SIGNALS,
  CLOSING_SIGNALS,
  OPENING_SIGNALS,
  SUSPICIOUS_SIGNALS,
  findSignals,
} from './signals.js';
import { validateCandidate } from './validate.js';

const TYPE_KEYWORDS: Array<[RegExp, OpportunityType]> = [
  [/\bfellowship\b/i, 'fellowship'],
  [/\bresidenc(y|ies)\b/i, 'residency'],
  [/\bgrant\b/i, 'grant'],
  [/\bscholarship\b/i, 'scholarship'],
  [/\bfestival\b/i, 'festival'],
  [/\b(conference|abstracts?)\b/i, 'conference'],
  [/\b(request for proposals|rfp)\b/i, 'rfp'],
  [/\b(contest|competition)\b/i, 'contest'],
  [/\b(prize|award)\b/i, 'award'],
  [/\b(magazine|journal|review|anthology)\b/i, 'magazine'],
  [/\bpitch(es)?\b/i, 'pitch'],
];

const GENRE_VOCAB = [
  'poetry', 'fiction', 'nonfiction', 'creative nonfiction', 'essay', 'short story',
  'flash fiction', 'translation', 'photography', 'painting', 'sculpture', 'film',
  'documentary', 'screenwriting', 'playwriting', 'music', 'dance', 'theater',
  'visual art', 'digital art', 'illustration', 'comics', 'memoir', 'hybrid',
];

const MATERIAL_VOCAB: Array<[RegExp, string]> = [
  [/\bbio(graphy)?\b/i, 'bio'],
  [/\bcover letter\b/i, 'cover letter'],
  [/\b(cv|r[eé]sum[eé])\b/i, 'cv'],
  [/\bartist statement\b/i, 'artist statement'],
  [/\bwork sample\b/i, 'work sample'],
  [/\bbudget\b/i, 'budget'],
  [/\bsynopsis\b/i, 'synopsis'],
  [/\bmanuscript\b/i, 'manuscript'],
  [/\bproject (proposal|description)\b/i, 'project proposal'],
];

const ELIGIBILITY_PATTERNS: Array<[RegExp, (m: RegExpExecArray) => EligibilityRule]> = [
  [/501\(c\)\(3\)/i, () => ({ key: 'nonprofit-status', value: '501c3', description: 'Requires 501(c)(3) nonprofit status' })],
  [/\bemerging (writers?|artists?|filmmakers?)\b/i, (m) => ({ key: 'career-stage', value: 'emerging', description: `Open to ${m[0].toLowerCase()}` })],
  [/\bstudents? (only|enrolled)\b/i, () => ({ key: 'career-stage', value: 'student', description: 'Open to students only' })],
  [/\b(?:residents? of|based in|living in) ([a-z][a-z .]+?)(?:[.,;]|$)/i, (m) => ({ key: 'location', value: m[1].trim().toLowerCase(), description: `Must be based in ${m[1].trim()}` })],
  [/\bminimum operating budget[^.\n]*\$\s?(\d{1,3}(?:,\d{3})*)/i, (m) => ({ key: 'min-operating-budget', value: m[1].replace(/,/g, ''), description: `Minimum operating budget $${m[1]}` })],
  [/\b(regional|world|national) premiere\b/i, (m) => ({ key: 'premiere-status', value: `${m[1].toLowerCase()}-premiere`, description: `Requires ${m[0].toLowerCase()}` })],
];

const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.]+\b/;
const SUBMIT_URL_RE = /https?:\/\/[^\s"')]*(?:submit|apply|form|submittable)[^\s"')]*/i;
const LABELED_URL_RE = /(?:submit (?:at|online|here)|apply at)[:\s]+(https?:\/\/[^\s"')]+)/i;

function extractDeadline(text: string, reference: Date): DeadlineInfo {
  if (/\buntil filled\b/i.test(text)) return { kind: 'until-filled', raw: 'until filled' };
  if (/\brolling (submissions|deadline|basis)\b/i.test(text)) return { kind: 'rolling', raw: 'rolling' };
  // Look for a date in the clause following a closing-signal phrase.
  const m = /(?:deadline|closes?(?: on)?|submissions close|applications? (?:are )?due|due by|reading period ends)[^.\n]*/i.exec(text);
  if (m) {
    const parsed = parseDate(m[0], reference);
    if (parsed) return { kind: parsed.yearInferred ? 'inferred' : 'exact', date: parsed.date, raw: m[0].trim() };
  }
  return { kind: 'unknown' };
}

function extractOpenDate(text: string, reference: Date): string | undefined {
  const m = /(?:opens?(?: on)?|opening|reading period begins|submissions open(?: on)?|applications open(?: on)?)[^.\n]*/i.exec(text);
  if (!m) return undefined;
  return parseDate(m[0], reference)?.date;
}

function extractTitle(text: string, source: Source): string | undefined {
  const labeled = /^\s*(?:title|call)\s*:\s*(.+)$/im.exec(text);
  if (labeled) return labeled[1].trim();
  const firstLine = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0);
  if (firstLine && firstLine.length <= 120) return firstLine.replace(/[#*]/g, '').trim();
  return source.name || undefined;
}

function extractOrganization(text: string, source: Source): string | undefined {
  const m = /(?:organization|run by|presented by|published by|hosted by)\s*[:\-]\s*([^\n.]+)/i.exec(text);
  if (m) return m[1].trim();
  return source.kind === 'organization-website' ? source.name : undefined;
}

function extractPrize(text: string): string | undefined {
  const m = /(?:prize|award|grant|winner receives|stipend)[^.\n]*\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?[^.\n]*/i.exec(text);
  return m ? m[0].trim() : undefined;
}

function extractSimultaneous(text: string): boolean | undefined {
  const m = /simultaneous submissions?[^.\n]*/i.exec(text);
  if (!m) return undefined;
  return !/\b(not|no)\b/i.test(m[0]);
}

/**
 * The built-in deterministic extractor. An LLM-assisted extractor can replace
 * it behind the same port, but its output must pass through the same
 * validateCandidate() — the "not purely AI" rule.
 */
export class DeterministicExtractor implements Extractor {
  constructor(private readonly clock: Clock) {}

  extract(source: Source, snapshot: PageSnapshot): OpportunityCandidate {
    const text = snapshot.content;
    const now = this.clock.now();
    const lower = text.toLowerCase();

    const type = TYPE_KEYWORDS.find(([re]) => re.test(text))?.[1] ?? 'open-call';
    const genres = GENRE_VOCAB.filter((g) => lower.includes(g));
    const eligibility: EligibilityRule[] = [];
    for (const [re, build] of ELIGIBILITY_PATTERNS) {
      const m = re.exec(text);
      if (m) eligibility.push(build(m));
    }
    const requiredMaterials = MATERIAL_VOCAB.filter(([re]) => re.test(text)).map(([, name]) => name);
    const submissionUrl = LABELED_URL_RE.exec(text)?.[1] ?? SUBMIT_URL_RE.exec(text)?.[0];

    const candidate: OpportunityCandidate = {
      sourceId: source.id,
      snapshotId: snapshot.id,
      url: source.url,
      extractedAt: now.toISOString(),
      title: extractTitle(text, source),
      organizationName: extractOrganization(text, source),
      type,
      genres,
      openDate: extractOpenDate(text, now),
      deadline: extractDeadline(text, now),
      fee: extractFee(text),
      prize: extractPrize(text),
      eligibility,
      requiredMaterials,
      submissionUrl,
      contactEmailPresent: EMAIL_RE.test(text),
      simultaneousAllowed: extractSimultaneous(text),
      openSignals: findSignals(text, OPENING_SIGNALS),
      closeSignals: findSignals(text, CLOSING_SIGNALS),
      closedSignals: findSignals(text, CLOSED_SIGNALS),
      suspiciousSignals: findSignals(text, SUSPICIOUS_SIGNALS),
      issues: [],
      extractionConfidence: 0,
    };
    return validateCandidate(candidate, now);
  }
}
