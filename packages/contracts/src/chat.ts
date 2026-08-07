import { z } from "zod";

const httpUrlSchema = z
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "Expected an http(s) URL");

export const chatPostInputSchema = z.object({
  conversationId: z.string().trim().min(1).max(128).optional(),
  organizationId: z.string().trim().min(1).max(128).optional(),
  message: z.string().trim().min(1).max(2_000),
});

export const chatEvidenceSchema = z.object({
  opportunityId: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(240),
  url: httpUrlSchema,
  checkedAt: z.iso.datetime(),
  organizationConfirmed: z.boolean(),
});

export const chatResultSchema = z.object({
  id: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(240),
  organizationName: z.string().trim().max(240).optional(),
  status: z.string().trim().min(1).max(64),
  type: z.string().trim().min(1).max(64),
  deadline: z.object({
    kind: z.string().trim().min(1).max(64),
    date: z.iso.date().optional(),
    raw: z.string().trim().max(500).optional(),
  }),
  fee: z.object({
    status: z.enum(["no-fee", "paid", "unknown"]),
    amountCents: z.number().int().min(0).optional(),
    currency: z.string().trim().length(3).optional(),
  }),
  source: chatEvidenceSchema,
});

export const chatAssistantPayloadSchema = z.object({
  intent: z.literal("opportunity-search"),
  engine: z.literal("deterministic-baseline"),
  answer: z.string().trim().min(1).max(4_000),
  search: z.object({
    query: z.string().trim().max(200).optional(),
    types: z.array(z.string().trim().min(1).max(64)).max(8),
    feeStatus: z.enum(["no-fee", "paid", "unknown"]).optional(),
    sort: z.string().trim().min(1).max(64),
  }),
  results: z.array(chatResultSchema).max(8),
  evidence: z.array(chatEvidenceSchema).max(8),
});

export const chatMessageSchema = z.object({
  id: z.string().trim().min(1).max(128),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  sequence: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  metadata: z.record(z.string(), z.unknown()),
});

export const chatTurnResponseSchema = z.object({
  conversationId: z.string().trim().min(1).max(128),
  runId: z.string().trim().min(1).max(128),
  status: z.enum(["running", "completed", "failed", "blocked"]),
  idempotent: z.boolean(),
  messages: z.array(chatMessageSchema),
  payload: chatAssistantPayloadSchema.optional(),
});

export type ChatPostInput = z.infer<typeof chatPostInputSchema>;
export type ChatEvidence = z.infer<typeof chatEvidenceSchema>;
export type ChatResult = z.infer<typeof chatResultSchema>;
export type ChatAssistantPayload = z.infer<typeof chatAssistantPayloadSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatTurnResponse = z.infer<typeof chatTurnResponseSchema>;
