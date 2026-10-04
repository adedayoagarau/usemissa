/**
 * Operations: questions that decide whether a worker should spend money or a
 * fetch at all — re-run a model extraction, retry a failed request, recheck a
 * listing, verify a discovered source, or close a dead link.
 *
 * Page-content questions are `public` (scraped pages and search results).
 * Scheduling questions are `operational` (job and fetch metadata only).
 *
 * Scopes (set `DECISIONS_MODE_<SCOPE>=live` one at a time):
 * - `extract_gate`       ingestion-v2, before the DeepSeek field extraction.
 * - `radar_extract_gate` radar-worker, before the LLM extractor.
 * - `recheck`            lifecycle reconciler retry and recheck intervals.
 * - `enrichment_retry`   enrichment worker retry delay.
 * - `source_discovery`   source promotion pre-fetch check and verdict.
 * - `link_check`         daily freshness dead-link check.
 *
 * Live callers may only save work: skip a model call by reusing an earlier
 * extraction, lengthen an interval inside its existing bounds, skip fetches
 * for a confident non-source, reject a confident reject, or close a link
 * whose HEAD request is failing now. They never shorten an interval, accept
 * a source, or publish anything.
 */
import { decide, decisionModeFromEnv } from "../decide.js";
import { jevClientFromEnv, type JevClient } from "../jevClient.js";
import type { DecisionLedger } from "../ledger.js";
import { defineQuestion } from "../questions.js";
import type {
  DecisionMode,
  DecisionOutcome,
  JevState,
  QuestionDefinition,
} from "../types.js";

const NOUL_POLICY = {
  kind: "noul",
  acceptAtOrAbove: 0.9,
  rejectAtOrBelow: 0.1,
} as const;

export const OPERATIONS_SCOPES = [
  "extract_gate",
  "radar_extract_gate",
  "recheck",
  "enrichment_retry",
  "source_discovery",
  "link_check",
] as const;
export type OperationsScope = (typeof OPERATIONS_SCOPES)[number];

export const worthExtracting = defineQuestion({
  key: "operations.worth_extracting",
  version: 1,
  subjectType: "page",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "The state shows a page's role, its URL, and the lines of visible text removed and added since the last extraction. Does the current page state new or changed opportunity facts?",
    criteria: {
      true: "An added or removed line states an opportunity fact: title, organizer, deadline or dates, fee, prize, eligibility, how to apply, or whether the call is open or closed.",
      false:
        "Only navigation, page furniture, counters, timestamps, ads, related links or other text that states no opportunity fact changed.",
    },
  },
  policy: NOUL_POLICY,
});

export const RECHECK_CADENCE_HOURS = {
  "6h": 6,
  "1d": 24,
  "3d": 72,
  "7d": 168,
  "30d": 720,
} as const;
export type RecheckCadence = keyof typeof RECHECK_CADENCE_HOURS;

export const recheckCadence = defineQuestion({
  key: "operations.recheck_cadence",
  version: 1,
  subjectType: "opportunity",
  dataClass: "operational",
  question: {
    type: "choice",
    instructions:
      "The state shows how far away the stated deadline is (if one is stated), a summary of how this listing changed across recent checks, and the source kind. How soon is a recheck likely to find a change worth recording?",
    criteria: {
      "6h": "Within hours: the deadline is days away or the page changes several times a day.",
      "1d": "Within a day: the deadline is within about two weeks or the page changed in the last checks.",
      "3d": "Within a few days: the call is open and changes occasionally.",
      "7d": "Within a week or more: recent checks found no change and no deadline is near.",
      "30d":
        "Within a month or more: the call is closed, archived, or has not changed across many checks.",
    },
  },
  policy: { kind: "choice", minProbability: 0.85 },
});

export const retryWillSucceed = defineQuestion({
  key: "operations.retry_will_succeed",
  version: 1,
  subjectType: "job",
  dataClass: "operational",
  question: {
    type: "noul",
    instructions:
      "The state shows the error kind and HTTP status of a failed fetch, how many times it has been attempted, and this host's recent results. Will retrying soon succeed?",
    criteria: {
      true: "The error looks temporary (timeout, rate limit, 5xx, network reset) and the host has answered other requests recently.",
      false:
        "The error looks lasting (gone, forbidden, blocked, robots refusal, unsupported content, challenge page) or the same failure repeated across attempts.",
    },
  },
  policy: NOUL_POLICY,
});

export const SEARCH_RESULT_SOURCE_LEVELS = [
  "not-a-source",
  "maybe",
  "likely",
  "clearly-an-opportunity-source",
] as const;

export const searchResultIsSource = defineQuestion({
  key: "operations.search_result_is_source",
  version: 1,
  subjectType: "source_candidate",
  dataClass: "public",
  question: {
    type: "score",
    instructions:
      "The state shows a search result's URL, title and snippet. How likely is this page to list or announce open calls, grants, residencies, prizes or other opportunities that creators apply to? Judge only from what the result states.",
    criteria: [...SEARCH_RESULT_SOURCE_LEVELS],
  },
  policy: { kind: "score", minConfidence: 0.85 },
});

export const sourcePromotion = defineQuestion({
  key: "operations.source_promotion",
  version: 1,
  subjectType: "source_candidate",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "The state shows the verification evidence for a candidate source page: HTTP status, content type, robots and terms results, the opportunity and action signals found, and the checker's reason. Should Missa add this page as a source to watch?",
    criteria: {
      accept:
        "The page states opportunities and how to apply, and robots and terms allow checking it.",
      reject:
        "The page is not an opportunity source, is gone, or robots or terms refuse automated checks.",
      "needs-human":
        "The evidence is incomplete or conflicting, so a person should look.",
    },
  },
  // Accepting a source stays a person's or the deterministic checker's call.
  policy: {
    kind: "choice",
    minProbability: 0.85,
    alwaysReview: ["accept", "needs-human"],
  },
});

export const linkShouldClose = defineQuestion({
  key: "operations.link_should_close",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "The state shows the HTTP status of a listing's guidelines link, where it redirected, and a short snippet of the page it returned. Does this show the opportunity page is gone?",
    criteria: {
      true: "The page states it was not found, removed or no longer available, or the link now redirects to an unrelated home or index page.",
      false:
        "The page still shows the opportunity, or the failure looks temporary (rate limit, server error, bot check).",
    },
  },
  policy: NOUL_POLICY,
});

export const operationsQuestions: QuestionDefinition[] = [
  worthExtracting,
  recheckCadence,
  retryWillSucceed,
  searchResultIsSource,
  sourcePromotion,
  linkShouldClose,
];

// ── State builders ──────────────────────────────────────────────────────

const MAX_DIFF_LINES = 30;
const MAX_DIFF_CHARS = 1_500;

/** Visible text of an HTML page: no scripts, styles or tags, whitespace collapsed. */
export function visibleText(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function textLines(text: string): string[] {
  return text
    .split(/\n|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function boundedLines(lines: string[]): string[] {
  const output: string[] = [];
  let chars = 0;
  for (const line of lines) {
    if (output.length >= MAX_DIFF_LINES || chars >= MAX_DIFF_CHARS) break;
    const clipped = line.slice(0, Math.max(0, MAX_DIFF_CHARS - chars));
    output.push(clipped);
    chars += clipped.length;
  }
  return output;
}

/** Lines removed from and added to a page's visible text, bounded for Jev. */
export function textDiff(
  previous: string,
  current: string,
): { removed: string[]; added: string[] } {
  const before = textLines(previous);
  const after = textLines(current);
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    removed: boundedLines(before.filter((line) => !afterSet.has(line))),
    added: boundedLines(after.filter((line) => !beforeSet.has(line))),
  };
}

export function worthExtractingState(input: {
  pageRole: string;
  url: string;
  previousText: string;
  currentText: string;
}): JevState {
  const diff = textDiff(input.previousText, input.currentText);
  return {
    page_role: input.pageRole,
    url: input.url,
    text_identical: input.previousText === input.currentText,
    removed_lines: diff.removed,
    added_lines: diff.added,
  };
}

export function recheckCadenceState(input: {
  hoursUntilDeadline?: number | null;
  status?: string | null;
  changeHistory: string;
  sourceKind?: string | null;
}): JevState {
  const hours = input.hoursUntilDeadline;
  return {
    deadline:
      hours === undefined || hours === null || !Number.isFinite(hours)
        ? "not stated"
        : hours < 0
          ? "passed"
          : `${Math.round(hours / 24)} days away`,
    listing_status: input.status ?? "unknown",
    change_history: input.changeHistory.slice(0, 300),
    source_kind: input.sourceKind ?? "unknown",
  };
}

export interface HostHistory {
  recentSuccesses: number;
  recentFailures: number;
}

export function retryState(input: {
  errorKind: string;
  httpStatus?: number | null;
  attempts: number;
  host?: string | null;
  hostHistory?: HostHistory;
}): JevState {
  return {
    error_kind: input.errorKind.slice(0, 160),
    http_status: input.httpStatus ?? null,
    attempts: input.attempts,
    host: input.host ?? null,
    host_recent_successes: input.hostHistory?.recentSuccesses ?? 0,
    host_recent_failures: input.hostHistory?.recentFailures ?? 0,
  };
}

export function searchResultState(input: {
  url: string;
  title?: string | null;
  snippet?: string | null;
  proposedKind?: string | null;
}): JevState {
  return {
    url: input.url,
    title: (input.title ?? "").slice(0, 240),
    snippet: (input.snippet ?? "").slice(0, 500),
    proposed_kind: input.proposedKind ?? null,
  };
}

export function sourcePromotionState(evidence: {
  candidateUrl: string;
  finalUrl?: string;
  httpStatus?: number;
  contentType?: string;
  title?: string;
  robots: string;
  terms: string;
  callSignals: string[];
  canonicalUrl?: string;
  reason: string;
}): JevState {
  return {
    url: evidence.finalUrl ?? evidence.candidateUrl,
    title: evidence.title ?? null,
    http_status: evidence.httpStatus ?? null,
    content_type: evidence.contentType ?? null,
    robots: evidence.robots,
    terms: evidence.terms,
    signals: evidence.callSignals,
    has_canonical_link: Boolean(evidence.canonicalUrl),
    checker_reason: evidence.reason.slice(0, 300),
  };
}

export function linkCloseState(input: {
  url: string;
  status: number | "network-error";
  redirectTarget?: string | null;
  snippet?: string | null;
}): JevState {
  return {
    url: input.url,
    http_status: input.status,
    redirected_to:
      input.redirectTarget && input.redirectTarget !== input.url
        ? input.redirectTarget
        : null,
    page_snippet: (input.snippet ?? "").slice(0, 600),
  };
}

// ── Live-mode helpers ───────────────────────────────────────────────────

/** True when a live, confident noul answer is "no". */
export function confidentNo(outcome: DecisionOutcome | undefined): boolean {
  return Boolean(outcome?.actionable && outcome.route === "reject");
}

/** True when a live, confident noul answer is "yes". */
export function confidentYes(outcome: DecisionOutcome | undefined): boolean {
  return Boolean(outcome?.actionable && outcome.route === "apply");
}

/** True when the answer would be acted on in live mode (for shadow savings counts). */
export function wouldAct(
  outcome: DecisionOutcome | undefined,
  route: "apply" | "reject",
): boolean {
  return outcome?.route === route;
}

/**
 * Returns the longer of today's interval and the decided cadence, never more
 * than `maxHours` and never shorter than today's. A cadence that would push
 * the next check past a stated deadline is ignored.
 */
export function lengthenedIntervalHours(input: {
  currentHours: number;
  outcome: DecisionOutcome | undefined;
  maxHours: number;
  hoursUntilDeadline?: number | null;
}): number {
  const { currentHours, outcome } = input;
  if (!outcome?.actionable || outcome.route !== "apply" || !outcome.answer)
    return currentHours;
  const proposed =
    RECHECK_CADENCE_HOURS[outcome.answer as RecheckCadence] ?? undefined;
  if (proposed === undefined || proposed <= currentHours) return currentHours;
  const deadline = input.hoursUntilDeadline;
  if (
    deadline !== undefined &&
    deadline !== null &&
    deadline >= 0 &&
    proposed >= deadline
  )
    return currentHours;
  return Math.max(currentHours, Math.min(proposed, input.maxHours));
}

// ── Asking and counting ─────────────────────────────────────────────────

export interface OperationsDecider {
  readonly client: JevClient;
  readonly ledger?: DecisionLedger;
  /** Returns the decision mode for a scope; shadow unless set live. */
  mode(scope: OperationsScope): DecisionMode;
  logger?: Pick<Console, "warn">;
}

/**
 * Builds a decider from JEV_* and DECISIONS_MODE* variables. Returns undefined
 * without JEV_API_KEY, so callers skip every decision and keep today's logic.
 */
export function operationsDeciderFromEnv(
  options: {
    ledger?: DecisionLedger;
    env?: Record<string, string | undefined>;
    logger?: Pick<Console, "warn">;
  } = {},
): OperationsDecider | undefined {
  const env = options.env ?? process.env;
  const client = jevClientFromEnv(env);
  if (!client.available) return undefined;
  return {
    client,
    ledger: options.ledger,
    mode: (scope) => decisionModeFromEnv(scope, env),
    logger: options.logger ?? console,
  };
}

/**
 * Asks Jev and never throws. Returns null when Jev is not configured, so the
 * caller keeps today's logic untouched.
 */
export async function askOperations(
  decider: OperationsDecider | undefined,
  scope: OperationsScope,
  input: {
    subjectId: string;
    state: JevState;
    questions: QuestionDefinition[];
    evidenceUrl?: string | null;
  },
): Promise<Record<string, DecisionOutcome> | null> {
  if (!decider?.client.available) return null;
  try {
    const result = await decide({
      client: decider.client,
      ledger: decider.ledger,
      mode: decider.mode(scope),
      subjectId: input.subjectId,
      state: input.state,
      questions: input.questions,
      evidenceUrl: input.evidenceUrl,
    });
    if (result.error)
      decider.logger?.warn(
        `[missa-decisions] scope=${scope} ${result.error.slice(0, 200)}`,
      );
    return result.outcomes;
  } catch (error) {
    decider.logger?.warn(
      `[missa-decisions] scope=${scope} decision failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Freshness dead-link check (scope `link_check`). True only for a live,
 * confident "gone" while the link's HEAD request is failing now (an HTTP
 * error status or a network error); a working link is never closed.
 */
export async function linkShouldCloseNow(
  decider: OperationsDecider | undefined,
  input: {
    subjectId: string;
    url: string;
    status: number | "network-error";
    redirectTarget?: string | null;
    snippet?: string | null;
  },
  usage?: OperationsUsage,
): Promise<boolean> {
  if (!decider) return false;
  const headFailing = input.status === "network-error" || input.status >= 400;
  usage?.asked("link_check");
  const outcomes = await askOperations(decider, "link_check", {
    subjectId: input.subjectId,
    evidenceUrl: input.url,
    state: linkCloseState(input),
    questions: [linkShouldClose],
  });
  const outcome = outcomes?.[linkShouldClose.key];
  if (headFailing && confidentYes(outcome)) {
    usage?.skipped("link_check");
    return true;
  }
  usage?.made("link_check", headFailing && wouldAct(outcome, "apply"));
  return false;
}

interface ScopeUsage {
  asked: number;
  made: number;
  skipped: number;
  shadowWouldSkip: number;
}

/**
 * Per-tick counts of costly work done (`made`) and avoided (`skipped`), plus
 * the work a shadow answer would have avoided, so savings show in logs.
 */
export class OperationsUsage {
  private scopes = new Map<OperationsScope, ScopeUsage>();

  private entry(scope: OperationsScope): ScopeUsage {
    let usage = this.scopes.get(scope);
    if (!usage) {
      usage = { asked: 0, made: 0, skipped: 0, shadowWouldSkip: 0 };
      this.scopes.set(scope, usage);
    }
    return usage;
  }

  asked(scope: OperationsScope): void {
    this.entry(scope).asked += 1;
  }

  made(scope: OperationsScope, wouldHaveSkipped = false): void {
    const usage = this.entry(scope);
    usage.made += 1;
    if (wouldHaveSkipped) usage.shadowWouldSkip += 1;
  }

  skipped(scope: OperationsScope): void {
    this.entry(scope).skipped += 1;
  }

  get(scope: OperationsScope): ScopeUsage {
    return { ...this.entry(scope) };
  }

  /** One log line per scope that saw work; empty when nothing was counted. */
  summary(): string[] {
    return [...this.scopes.entries()]
      .filter(([, usage]) => usage.asked + usage.made + usage.skipped > 0)
      .map(
        ([scope, usage]) =>
          `[missa-decisions] usage scope=${scope} jev_calls=${usage.asked} made=${usage.made} skipped=${usage.skipped} shadow_would_skip=${usage.shadowWouldSkip}`,
      );
  }

  reset(): void {
    this.scopes.clear();
  }
}
