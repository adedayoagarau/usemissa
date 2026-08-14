import type { ExtractionResult } from "./contracts.js";
import type { OpportunityContent } from "@missa/radar-engine";

type WriterInput = {
  title: string;
  organization?: string;
  type: string;
  deadline?: string | null;
  authoritativeUrl: string;
  fields: ExtractionResult["fields"];
};

type WriterPayload = {
  summary?: unknown;
  highlights?: unknown;
  preparation?: unknown;
  unknowns?: unknown;
  nextAction?: unknown;
};

function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

function list(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const result = text(item, maxLength);
    return result ? [result] : [];
  }).slice(0, maxItems);
}

function facts(value: unknown, sourceUrl: string): OpportunityContent["highlights"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { label?: unknown; value?: unknown; certainty?: unknown };
    const label = text(row.label, 80);
    const factValue = text(row.value, 240);
    if (!label || !factValue) return [];
    return [{ label, value: factValue, sourceUrl, certainty: row.certainty === "unknown" ? "unknown" as const : "confirmed" as const }];
  }).slice(0, 8);
}

export async function writeWithDeepSeek(input: WriterInput, options: { apiKey?: string; fetchImpl?: typeof fetch } = {}): Promise<OpportunityContent> {
  const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DeepSeek writing requires DEEPSEEK_API_KEY");
  const fetchImpl = options.fetchImpl ?? fetch;
  const factsForPrompt = input.fields.map((field) => ({ name: field.fieldName, value: field.normalizedValue ?? field.rawValue, confidence: field.confidence })).slice(-40);
  const response = await fetchImpl(process.env.DEEPSEEK_WRITER_ENDPOINT ?? "https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_WRITER_MODEL ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      temperature: 0,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Write a concise opportunity page using only the verified facts provided. Never invent eligibility, dates, fees, prizes, people, winners, or outcomes. Use an explicit unknown when a fact is absent. Return JSON only with summary, highlights [{label,value,certainty}], preparation [string], unknowns [string], nextAction." },
        { role: "user", content: JSON.stringify({ title: input.title, organization: input.organization ?? null, type: input.type, deadline: input.deadline ?? null, authoritativeUrl: input.authoritativeUrl, verifiedFacts: factsForPrompt }) },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`DeepSeek writing HTTP ${response.status}`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const raw = body.choices?.[0]?.message?.content;
  if (!raw) throw new Error("DeepSeek writing returned empty content");
  let payload: WriterPayload;
  try { payload = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "")) as WriterPayload; } catch { throw new Error("DeepSeek writing returned invalid JSON"); }
  const summary = text(payload.summary, 600);
  const nextAction = text(payload.nextAction, 300);
  const highlights = facts(payload.highlights, input.authoritativeUrl);
  const preparation = list(payload.preparation, 8, 240);
  const unknowns = list(payload.unknowns, 8, 240);
  if (!summary || summary.length < 40 || !nextAction || highlights.length < 2 || preparation.length < 1) throw new Error("DeepSeek writing failed the content shape checks");
  const generatedAt = new Date().toISOString();
  return { builderVersion: "deepseek-writer-v1", summary, highlights, preparation, unknowns, nextAction, sourceUrl: input.authoritativeUrl, generatedAt, review: { status: "pending", score: 0, reasons: [], checks: { writer: "deepseek", verifiedFacts: factsForPrompt.length } } };
}
