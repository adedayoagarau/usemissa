import { createHash } from "node:crypto";
import type { DestinationCandidate } from "./destinations.js";

export const INGESTION_V2_VERSION = "v2-shadow-0.1";

export type IngestionTrigger = "manual" | "scheduled" | "backfill" | "shadow";
export type IngestionMode = "shadow" | "review" | "promote";
export type IngestionRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type IngestionFailureCode = "robots-disallowed" | "blocked" | "not-found" | "timeout" | "invalid-content" | "model-error" | "database-error" | "unknown";

export interface SourceDefinition {
  id: string;
  name: string;
  url: string;
  adapterId: string;
  kind: "organization-website" | "directory" | "feed" | "api" | "profile";
  geography: string[];
  opportunityTypes: string[];
  config: Record<string, unknown>;
}

export interface IngestionRun {
  id: string;
  sourceId: string;
  trigger: IngestionTrigger;
  mode: IngestionMode;
  status: IngestionRunStatus;
  createdAt: string;
}

export interface PageSnapshot {
  id: string;
  runId: string;
  sourceId: string;
  url: string;
  finalUrl: string;
  fetchedAt: string;
  statusCode: number;
  contentType: string | null;
  contentHash: string;
  html: string;
  rendered: boolean;
}

export interface ExtractedField {
  fieldName: string;
  rawValue: string | null;
  normalizedValue: unknown;
  confidence: number;
  provenance: {
    adapterId: string;
    method: string;
    sourceUrl: string;
    snapshotId: string;
  };
}

export interface ExtractionResult {
  fields: ExtractedField[];
  candidateLinks: DestinationCandidate[];
  warnings: string[];
}

export interface AdapterContext {
  run: IngestionRun;
  source: SourceDefinition;
  snapshot?: PageSnapshot;
}

export interface SourceAdapter {
  readonly id: string;
  canHandle(source: SourceDefinition): boolean;
  fetch(context: AdapterContext): Promise<PageSnapshot>;
  extract(context: AdapterContext, snapshot: PageSnapshot): Promise<ExtractionResult>;
}

export class IngestionFailure extends Error {
  constructor(public readonly code: IngestionFailureCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "IngestionFailure";
  }
}

export function classifyIngestionFailure(error: unknown): IngestionFailureCode {
  if (error instanceof IngestionFailure) return error.code;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("robots.txt disallows")) return "robots-disallowed";
  if (message.includes("http 401") || message.includes("http 403") || message.includes("http 429") || message.includes("blocked")) return "blocked";
  if (message.includes("http 404") || message.includes("http 410") || message.includes("not found")) return "not-found";
  if (message.includes("timeout") || message.includes("timed out") || message.includes("abort")) return "timeout";
  if (message.includes("json") || message.includes("content-type") || message.includes("invalid content")) return "invalid-content";
  if (message.includes("deepseek") || message.includes("model")) return "model-error";
  if (message.includes("database") || message.includes("postgres") || message.includes("redis")) return "database-error";
  return "unknown";
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** PostgreSQL text cannot store NUL bytes that occasionally appear in fetched source bodies. */
export function sanitizeSourceText(value: string): string {
  return value.replace(/\u0000/g, "");
}

export function createRunId(sourceId: string, now = new Date()): string {
  return `ingv2_${sha256(`${sourceId}:${now.toISOString()}:${Math.random()}`).slice(0, 24)}`;
}

export function createSnapshotId(runId: string, url: string, requestSignature = ""): string {
  return `snap_${sha256(`${runId}:${url}:${requestSignature}`).slice(0, 24)}`;
}
