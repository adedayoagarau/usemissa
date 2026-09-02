import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  creatorCommandEnvelope,
  CreatorConflictError,
  CreatorIdempotencyConflictError,
  CreatorLibraryConflictError,
  CreatorLibraryValidationError,
} from "@missa/radar-adapters";

export const creatorLibraryHeaders = { "Cache-Control": "private, no-store" };
export const creatorLibraryJson = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: creatorLibraryHeaders });

export function libraryEnvelope(request: Request, accountId: string, commandType: string, payload: unknown, expectedRevision: unknown, create = false) {
  const key = request.headers.get("Idempotency-Key")?.trim() ?? "";
  const revision = create ? 1 : Number(expectedRevision);
  if (!key || key.length > 200 || !Number.isSafeInteger(revision) || revision < 1) return undefined;
  return creatorCommandEnvelope(accountId, commandType, key, payload, revision);
}

export function libraryId(prefix: string, idempotencyKey?: string | null): string {
  return `${prefix}_${idempotencyKey ? createHash("sha256").update(`${prefix}:${idempotencyKey}`).digest("hex").slice(0, 32) : randomUUID()}`;
}

export function creatorLibraryError(error: unknown) {
  const errorName = error instanceof Error ? error.name : "";
  if (error instanceof CreatorConflictError || error instanceof CreatorIdempotencyConflictError || errorName === "CreatorConflictError" || errorName === "CreatorIdempotencyConflictError") return creatorLibraryJson({ error: (error as Error).message, conflict: { action: "refresh-and-retry" } }, 409);
  if (error instanceof CreatorLibraryConflictError || errorName === "CreatorLibraryConflictError") return creatorLibraryJson({ error: (error as Error).message }, 409);
  if (error instanceof CreatorLibraryValidationError || errorName === "CreatorLibraryValidationError") return creatorLibraryJson({ error: (error as Error).message }, (error as Error).message.includes("not found") ? 404 : 400);
  return creatorLibraryJson({ error: "We could not update your Library." }, 500);
}
