import pg from "pg";
import { NextResponse } from "next/server";
import {
  missaPostgresPoolConfig,
  type DeadlineFactsDeadlineInput,
  type DeadlineTierInput,
  type OpportunityStageInput,
} from "@missa/radar-adapters";

/**
 * Shared plumbing for the admin and organization deadline-facts routes: one
 * pool, one body parser, one error mapping. Both routes write the same tables
 * through `replaceOpportunityDeadlineFacts`, differing only in `source`.
 */

const { Pool } = pg;
let poolInstance: pg.Pool | null = null;

export function deadlineFactsPool(): pg.Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!poolInstance) {
    poolInstance = new Pool({
      ...missaPostgresPoolConfig(process.env.DATABASE_URL, "creator"),
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    });
  }
  return poolInstance;
}

export const deadlineFactsHeaders = { "cache-control": "private, no-store" };

export type DeadlineFactsBody = {
  tiers: DeadlineTierInput[];
  stages: OpportunityStageInput[];
  deadline?: DeadlineFactsDeadlineInput;
  sourceUrl?: string;
  expectedRevision?: string;
};

function optionalString(value: unknown, max: number): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Parse a PUT body; shape errors become a 400 and value rules are checked by the writer. */
export function parseDeadlineFactsBody(raw: unknown, ifMatch?: string | null): DeadlineFactsBody | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Send the fee tiers and stages to save." };
  const body = raw as Record<string, unknown>;
  if (!Array.isArray(body.tiers) || !Array.isArray(body.stages)) return { error: "Send the fee tiers and stages as lists." };
  const tiers = body.tiers.map((item) => {
    const tier = (item ?? {}) as Record<string, unknown>;
    return {
      tier: tier.tier as DeadlineTierInput["tier"],
      label: typeof tier.label === "string" ? tier.label : "",
      closesOn: typeof tier.closesOn === "string" ? tier.closesOn : "",
      closesTime: optionalString(tier.closesTime, 5),
      timezone: optionalString(tier.timezone, 64),
      feeCents: typeof tier.feeCents === "number" ? tier.feeCents : tier.feeCents === null ? null : undefined,
      feeCurrency: optionalString(tier.feeCurrency, 3),
      confidence: tier.confidence === "probable" ? "probable" as const : "confirmed" as const,
    };
  });
  const stages = body.stages.map((item) => {
    const stage = (item ?? {}) as Record<string, unknown>;
    return {
      kind: stage.kind as OpportunityStageInput["kind"],
      label: typeof stage.label === "string" ? stage.label : "",
      dueOn: typeof stage.dueOn === "string" ? stage.dueOn : "",
      dueTime: optionalString(stage.dueTime, 5),
      timezone: optionalString(stage.timezone, 64),
      confidence: stage.confidence === "probable" ? "probable" as const : "confirmed" as const,
    };
  });
  let deadline: DeadlineFactsDeadlineInput | undefined;
  if (body.deadline && typeof body.deadline === "object") {
    const value = body.deadline as Record<string, unknown>;
    deadline = {
      ...("date" in value ? { date: optionalString(value.date, 10) ?? null } : {}),
      ...("time" in value ? { time: optionalString(value.time, 5) ?? null } : {}),
      ...("timezone" in value ? { timezone: optionalString(value.timezone, 64) ?? null } : {}),
    };
  }
  const sourceUrl = optionalString(body.sourceUrl, 1_000) ?? undefined;
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") return { error: "The source link must start with http or https." };
    } catch {
      return { error: "The source link is not a valid web address." };
    }
  }
  const expectedRevision = (typeof body.expectedRevision === "string" ? body.expectedRevision : ifMatch?.replace(/^W\//u, "").replace(/"/gu, ""))?.trim() || undefined;
  return { tiers, stages, ...(deadline ? { deadline } : {}), ...(sourceUrl ? { sourceUrl } : {}), ...(expectedRevision ? { expectedRevision } : {}) };
}

/** Map writer errors to responses with calm, specific copy. */
export function deadlineFactsErrorResponse(error: unknown): NextResponse {
  if (error instanceof Error) {
    if (error.name === "ValidationError") return NextResponse.json({ error: error.message }, { status: 400, headers: deadlineFactsHeaders });
    if (error.name === "NotFoundError") return NextResponse.json({ error: "This opportunity could not be found." }, { status: 404, headers: deadlineFactsHeaders });
    if (error.name === "ConflictError") {
      const current = (error as Error & { current?: unknown }).current;
      return NextResponse.json({ error: error.message, current }, { status: 409, headers: deadlineFactsHeaders });
    }
    if (error.name === "UnavailableError") return NextResponse.json({ error: "Dates and fee tiers cannot be edited here yet." }, { status: 503, headers: deadlineFactsHeaders });
    // The publication gate refuses a past deadline on a published record.
    if (/publication|deadline/iu.test(error.message) && /past|gate|refus/iu.test(error.message)) {
      return NextResponse.json({ error: "A published opportunity cannot have a deadline in the past." }, { status: 400, headers: deadlineFactsHeaders });
    }
  }
  return NextResponse.json({ error: "The dates could not be saved. Your edits remain here; try again." }, { status: 503, headers: deadlineFactsHeaders });
}
