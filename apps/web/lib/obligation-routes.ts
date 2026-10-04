import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CreatorConflictError,
  CreatorIdempotencyConflictError,
  creatorPoolFor,
  ObligationNotFoundError,
  ObligationValidationError,
} from "@missa/radar-adapters";
import type { Pool } from "pg";

/** Shared parsing and error mapping for the obligation and planning routes. */

export const planningHeaders = { "Cache-Control": "private, no-store" };

export function planningJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: planningHeaders });
}

export function planningPoolOrNull(): Pool | null {
  return process.env.DATABASE_URL ? creatorPoolFor(process.env.DATABASE_URL) : null;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.");
const effort = z.number().min(0).max(999).nullable();
const policy = z.enum(["keep", "absorb", "ignore"]);

export const obligationCreateSchema = z.union([
  z.object({
    templates: z.enum(["preparation", "acceptance"]),
    trackedId: z.string().min(1).max(200).optional(),
    opportunityId: z.string().min(1).max(200).optional(),
  }).refine((value) => Boolean(value.trackedId || value.opportunityId), { message: "Choose a saved application." }),
  z.object({
    trackedId: z.string().min(1).max(200).optional(),
    opportunityId: z.string().min(1).max(200).optional(),
    kind: z.enum(["start-by", "sub-deadline", "personal-target", "obligation"]).optional(),
    label: z.string().trim().min(1).max(200),
    anchor: z.enum(["deadline", "stage", "accepted", "fixed"]).optional(),
    anchorStageId: z.string().min(1).max(200).optional(),
    offsetDays: z.number().int().min(-730).max(730).optional(),
    dueOn: isoDate.optional(),
    bufferPolicy: policy.optional(),
    effortHours: effort.optional(),
  }),
]);

export const obligationUpdateSchema = z.object({
  label: z.string().trim().min(1).max(200).optional(),
  dueOn: isoDate.optional(),
  offsetDays: z.number().int().min(-730).max(730).optional(),
  bufferPolicy: policy.optional(),
  effortHours: effort.optional(),
  state: z.enum(["open", "done", "skipped"]).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "Choose something to change." });

/** The Idempotency-Key header, or an error message for a missing or oversized key. */
export function idempotencyKeyFrom(request: Request): { key: string } | { error: string } {
  const key = request.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!key || key.length > 200) return { error: "Refresh and try again." };
  return { key };
}

/** The If-Match revision, or null when it is missing or not a positive whole number. */
export function ifMatchRevision(request: Request): number | null {
  const revision = Number(request.headers.get("If-Match")?.replace(/"/g, ""));
  return Number.isSafeInteger(revision) && revision >= 1 ? revision : null;
}

export function obligationError(error: unknown, fallback: string, current?: unknown) {
  if (error instanceof ObligationValidationError) return planningJson({ error: error.message }, 400);
  if (error instanceof ObligationNotFoundError) return planningJson({ error: error.message }, 404);
  if (error instanceof CreatorConflictError)
    return planningJson(
      {
        error: "This step changed in another session. Review it and try again.",
        conflict: { action: "refresh-and-retry", expectedRevision: error.expectedRevision, actualRevision: error.actualRevision },
        ...(current ? { current } : {}),
      },
      409,
    );
  if (error instanceof CreatorIdempotencyConflictError) return planningJson({ error: error.message }, 409);
  return planningJson({ error: fallback }, 503);
}

export const planningPreferencesSchema = z.object({
  weeklyHoursAvailable: z.number().min(0).max(168).nullable(),
  defaultBufferDays: z.number().int().min(0).max(30),
  materialEffort: z
    .record(z.string().min(1).max(60), z.number().min(0).max(999))
    .refine((value) => Object.keys(value).length <= 40, { message: "Keep effort estimates to 40 kinds of material." })
    .default({}),
  defaultDeadlineOffsets: z.array(z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(7), z.literal(14)])).max(5),
  goneQuietDays: z.number().int().min(7).max(90),
  deadlineDayAlarm: z.boolean(),
  openingAlerts: z.boolean(),
  dailyNoticeCap: z.number().int().min(1).max(20),
  /** 0 when nothing has been saved yet. */
  expectedRevision: z.number().int().min(0),
});

export type PlanningPreferencesBody = z.infer<typeof planningPreferencesSchema>;

/** Validate a planning preferences save; the message is customer copy. */
export function parsePlanningPreferences(body: unknown):
  | { ok: true; expectedRevision: number; input: Omit<PlanningPreferencesBody, "expectedRevision"> }
  | { ok: false; error: string } {
  const parsed = planningPreferencesSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "Choose valid planning settings." };
  const { expectedRevision, ...input } = parsed.data;
  return { ok: true, expectedRevision, input };
}
