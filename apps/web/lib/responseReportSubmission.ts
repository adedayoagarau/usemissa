import type { SubmissionTelemetryInput } from "@missa/radar-adapters";

const WINDOW_MS = 60 * 60_000;
const LIMIT_PER_ACCOUNT = 10;
const LIMIT_PER_IP = 30;
const history = new Map<string, number[]>();

function consume(key: string, limit: number, now: number): number | undefined {
  const recent = (history.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= limit)
    return Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0]!)) / 1000));
  recent.push(now);
  history.set(key, recent);
  return undefined;
}

/**
 * Limits response reports per account and per network address. The limiter
 * keeps these keys in memory only; they are never stored with a report.
 */
export function consumeResponseReportRateLimit(input: {
  accountId: string;
  ip: string;
}): number | undefined {
  const now = Date.now();
  const retryAfter =
    consume(`account:${input.accountId}`, LIMIT_PER_ACCOUNT, now) ??
    consume(`ip:${input.ip}`, LIMIT_PER_IP, now);
  if (history.size > 4_000) {
    for (const [key, values] of history) {
      if (!values.length || now - values.at(-1)! >= WINDOW_MS)
        history.delete(key);
    }
  }
  return retryAfter;
}

/** Test hook: clears in-memory limiter state. */
export function resetResponseReportRateLimit(): void {
  history.clear();
}

const OUTCOMES = ["accepted", "rejected", "withdrawn", "pending"] as const;
const REJECTION_TYPES = ["form", "tiered_personal", "editor_note"] as const;
const GENRES = ["fiction", "poetry", "nonfiction", "hybrid"] as const;
const MAX_RESPONSE_DAYS = 3 * 365;

function isoDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) ? null : value;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

export type ResponseReportResult = {
  status: number;
  body: Record<string, unknown>;
  retryAfter?: number;
};

/**
 * Validates and stores one response report. Reports need a signed-in account
 * so they can be rate limited, but the stored report carries no account
 * identifier.
 */
export async function submitResponseReport(input: {
  body: unknown;
  account: { id: string } | undefined;
  ip: string;
  today?: string;
  recordReport: (
    report: SubmissionTelemetryInput,
  ) => Promise<{ success: boolean; newMedianDays: number | null }>;
  consumeRateLimit?: typeof consumeResponseReportRateLimit;
}): Promise<ResponseReportResult> {
  if (!input.account) {
    return { status: 401, body: { error: "Sign in to report a response." } };
  }

  const retryAfter = (input.consumeRateLimit ?? consumeResponseReportRateLimit)(
    {
      accountId: input.account.id,
      ip: input.ip,
    },
  );
  if (retryAfter !== undefined) {
    return {
      status: 429,
      retryAfter,
      body: { error: "Too many reports in a short time. Try again later." },
    };
  }

  const body =
    input.body && typeof input.body === "object"
      ? (input.body as Record<string, unknown>)
      : null;
  const profileId =
    typeof body?.profileId === "string" ? body.profileId.trim() : "";
  if (!body || !profileId) {
    return { status: 400, body: { error: "Choose a magazine to report on." } };
  }

  const submittedDate = isoDate(body.submittedDate);
  if (!submittedDate) {
    return {
      status: 400,
      body: { error: "Add the date you sent the work (YYYY-MM-DD)." },
    };
  }
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  if (submittedDate > today) {
    return {
      status: 400,
      body: { error: "The date sent can’t be in the future." },
    };
  }

  const outcome = oneOf(body.outcome, OUTCOMES);
  const decisionDate =
    outcome === "pending" ? null : isoDate(body.decisionDate);
  if (outcome && outcome !== "pending" && !decisionDate) {
    return { status: 400, body: { error: "Add the date you heard back." } };
  }
  if (decisionDate && (decisionDate < submittedDate || decisionDate > today)) {
    return {
      status: 400,
      body: {
        error: "The decision date must fall between the date sent and today.",
      },
    };
  }

  // Response time always comes from the two dates, never from the request.
  const responseDays = decisionDate
    ? Math.round(
        (Date.parse(decisionDate) - Date.parse(submittedDate)) / 86_400_000,
      )
    : null;
  if (responseDays != null && responseDays > MAX_RESPONSE_DAYS) {
    return {
      status: 400,
      body: { error: "Reports are limited to responses within three years." },
    };
  }

  const feePaid = Number(body.feePaidCents ?? 0);
  const result = await input.recordReport({
    profileId,
    genre: oneOf(body.genre, GENRES),
    submittedDate,
    decisionDate,
    responseDays,
    outcome,
    rejectionType:
      outcome === "rejected"
        ? oneOf(body.rejectionType, REJECTION_TYPES)
        : null,
    feePaidCents: Number.isFinite(feePaid)
      ? Math.min(Math.max(0, Math.round(feePaid)), 100_000)
      : 0,
  });

  if (!result.success) {
    return {
      status: 503,
      body: { error: "We could not save your report. Try again later." },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      message: "Report saved. Thank you.",
      newMedianDays: result.newMedianDays,
    },
  };
}
