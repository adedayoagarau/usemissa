/**
 * Jev wiring for the Radar workers' operational choices: whether to re-run
 * the LLM extractor on a changed page (scope `radar_extract_gate`), how long
 * to wait before a lifecycle recheck or retry (`recheck`), how long to wait
 * before an enrichment retry (`enrichment_retry`), and whether a discovered
 * source is worth verifying (`source_discovery`).
 *
 * Every helper here is a no-op without JEV_API_KEY, and in shadow mode only
 * records decisions. Live answers may only save work; see
 * `@missa/decisions` sets/operations.ts for the exact limits.
 */
import type { Pool } from "pg";
import type { ExtractionGate, PageSnapshot, Source } from "@missa/radar-engine";
import {
  askOperations,
  confidentNo,
  createPostgresDecisionLedger,
  operationsDeciderFromEnv,
  OperationsUsage,
  retryState,
  retryWillSucceed,
  visibleText,
  worthExtracting,
  worthExtractingState,
  wouldAct,
  type HostHistory,
  type OperationsDecider,
  type OperationsScope,
} from "@missa/decisions";

export type { OperationsDecider } from "@missa/decisions";

/** A decider recording into `data_decisions`, or undefined without JEV_API_KEY. */
export function radarOperationsDecider(
  pool: Pool,
): OperationsDecider | undefined {
  return operationsDeciderFromEnv({
    ledger: createPostgresDecisionLedger(pool),
  });
}

/** Writes one usage line per scope, then clears the counts for the next tick. */
export function logOperationsUsage(
  usage: OperationsUsage | undefined,
  logger: Pick<Console, "info"> = console,
): void {
  if (!usage) return;
  for (const line of usage.summary()) logger.info(line);
  usage.reset();
}

/**
 * Engine gate before the LLM extractor: a changed page with no new or changed
 * opportunity facts keeps its current opportunity instead of a new model call.
 */
export function createJevRadarExtractionGate(
  decider: OperationsDecider,
  usage = new OperationsUsage(),
): ExtractionGate & { usage: OperationsUsage } {
  const scope: OperationsScope = "radar_extract_gate";
  return {
    usage,
    async shouldExtract(
      source: Source,
      previous: PageSnapshot | undefined,
      next: PageSnapshot,
    ): Promise<boolean> {
      if (!previous) {
        usage.made(scope);
        return true;
      }
      usage.asked(scope);
      const outcomes = await askOperations(decider, scope, {
        subjectId: source.url,
        evidenceUrl: source.url,
        state: worthExtractingState({
          pageRole: source.kind,
          url: source.url,
          previousText: visibleText(previous.content),
          currentText: visibleText(next.content),
        }),
        questions: [worthExtracting],
      });
      const outcome = outcomes?.[worthExtracting.key];
      if (confidentNo(outcome)) {
        usage.skipped(scope);
        return false;
      }
      usage.made(scope, wouldAct(outcome, "reject"));
      return true;
    },
  };
}

/** Recent fetch results per host, kept for one worker tick. */
export class HostHistoryTracker {
  private hosts = new Map<string, HostHistory>();

  static hostOf(url: string): string | null {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }

  record(url: string, ok: boolean): void {
    const host = HostHistoryTracker.hostOf(url);
    if (!host) return;
    const entry = this.hosts.get(host) ?? {
      recentSuccesses: 0,
      recentFailures: 0,
    };
    if (ok) entry.recentSuccesses += 1;
    else entry.recentFailures += 1;
    this.hosts.set(host, entry);
  }

  get(url: string): HostHistory {
    const host = HostHistoryTracker.hostOf(url);
    return {
      ...((host && this.hosts.get(host)) || {
        recentSuccesses: 0,
        recentFailures: 0,
      }),
    };
  }
}

/** HTTP status inside an error string such as "http-503" or "HTTP 404". */
export function httpStatusOf(error: string): number | null {
  const match = /\bhttp[- ]?(\d{3})\b/i.exec(error);
  return match ? Number(match[1]) : null;
}

/**
 * Asks whether a failed job's retry will succeed. Returns true only when a
 * live, confident "no" says the retry should wait for the longest existing
 * delay; false keeps today's delay.
 */
export async function retryShouldWaitLongest(
  decider: OperationsDecider | undefined,
  scope: Extract<OperationsScope, "recheck" | "enrichment_retry">,
  input: {
    subjectId: string;
    url: string;
    error: string;
    attempts: number;
    hosts?: HostHistoryTracker;
  },
  usage?: OperationsUsage,
): Promise<boolean> {
  if (!decider) return false;
  usage?.asked(scope);
  const outcomes = await askOperations(decider, scope, {
    subjectId: input.subjectId,
    state: retryState({
      errorKind: input.error,
      httpStatus: httpStatusOf(input.error),
      attempts: input.attempts,
      host: HostHistoryTracker.hostOf(input.url),
      hostHistory: input.hosts?.get(input.url),
    }),
    questions: [retryWillSucceed],
  });
  const outcome = outcomes?.[retryWillSucceed.key];
  if (confidentNo(outcome)) {
    usage?.skipped(scope);
    return true;
  }
  usage?.made(scope, wouldAct(outcome, "reject"));
  return false;
}
