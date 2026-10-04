import { GenericHtmlAdapter } from "./html.js";
import { type AdapterContext, type ExtractionResult, type PageSnapshot, type SourceAdapter } from "../contracts.js";
import { destinationConfig } from "../destinations.js";
import type { ModelExtractionGate } from "../extractGate.js";
import { normalizeModelDeadlineFacts } from "../modelDeadlineFacts.js";

const OPPORTUNITY_TYPES = new Set(["open-call", "magazine", "grant", "award", "fellowship", "residency", "festival", "scholarship", "conference", "rfp", "contest", "pitch", "other"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Field names the resolver merges with deterministic evidence instead of dropping when HTML rules found the same field. */
const MERGED_FIELD_NAMES = new Set(["deadlineTier", "deadlineClock", "deadlineStage"]);

interface DeepSeekFields {
  title?: unknown;
  organization?: unknown;
  opportunityType?: unknown;
  deadlineDate?: unknown;
  deadlineKind?: unknown;
  deadlineTime?: unknown;
  deadlineTimezone?: unknown;
  deadlineTiers?: unknown;
  stages?: unknown;
  fee?: unknown;
  prize?: unknown;
  description?: unknown;
  eligibility?: unknown;
  submissionUrl?: unknown;
  officialUrl?: unknown;
}

export interface DeepSeekHtmlAdapterOptions {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  base?: SourceAdapter;
  fetchImpl?: typeof fetch;
  /** Optional Jev gate (scope `extract_gate`); without it every eligible page calls the model. */
  extractionGate?: ModelExtractionGate;
}

/** DeepSeek proposes fields; v2 keeps the page snapshot and never publishes the model output directly. */
export class DeepSeekHtmlAdapter implements SourceAdapter {
  readonly id = "deepseek-html-v2";
  private readonly base: SourceAdapter;
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;
  private readonly extractionGate?: ModelExtractionGate;

  constructor(options: DeepSeekHtmlAdapterOptions = {}) {
    this.base = options.base ?? new GenericHtmlAdapter();
    this.apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY ?? "";
    this.endpoint = options.endpoint ?? `${process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"}/chat/completions`;
    this.model = options.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.extractionGate = options.extractionGate;
  }

  canHandle(source: AdapterContext["source"]): boolean {
    return this.base.canHandle(source);
  }

  fetch(context: AdapterContext): Promise<PageSnapshot> {
    return this.base.fetch(context);
  }

  async extract(context: AdapterContext, snapshot: PageSnapshot): Promise<ExtractionResult> {
    const deterministic = await this.base.extract(context, snapshot);
    if (!this.apiKey) return { ...deterministic, warnings: [...deterministic.warnings, "DeepSeek API key is not configured; deterministic extraction used"] };
    if (destinationConfig(context.source).pageRole === "landing") return { ...deterministic, warnings: [...deterministic.warnings, "DeepSeek deferred: landing-page fields are not opportunity authority; detail destinations must be fetched"] };
    let modelFields = await this.reusableModelFields(context, snapshot);
    const reused = Boolean(modelFields);
    if (!modelFields) {
      let fields: DeepSeekFields;
      try {
        fields = await this.callModel(snapshot);
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 160) : "unknown DeepSeek error";
        return { ...deterministic, warnings: [...deterministic.warnings, `DeepSeek extraction failed; deterministic extraction retained (${message})`] };
      }
      modelFields = normalizeFields(fields, snapshot);
      this.extractionGate?.afterModel(context, snapshot, modelFields);
    }
    const deterministicNames = new Set(deterministic.fields.map((field) => field.fieldName));
    return {
      fields: [...deterministic.fields, ...modelFields.filter((field) => MERGED_FIELD_NAMES.has(field.fieldName) || !deterministicNames.has(field.fieldName))],
      candidateLinks: deterministic.candidateLinks,
      warnings: [
        ...deterministic.warnings,
        "DeepSeek output is shadow evidence and requires deterministic validation/review",
        ...(reused ? ["DeepSeek fields reused from the previous extraction of this page; no new opportunity facts were found"] : []),
      ],
    };
  }

  /** Jev failures never block extraction: the model is called as before. */
  private async reusableModelFields(context: AdapterContext, snapshot: PageSnapshot): Promise<ExtractionResult["fields"] | undefined> {
    if (!this.extractionGate) return undefined;
    try {
      return await this.extractionGate.beforeModel(context, snapshot);
    } catch {
      return undefined;
    }
  }

  private async callModel(snapshot: PageSnapshot): Promise<DeepSeekFields> {
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        max_tokens: 2200,
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Return JSON only. Extract only facts explicitly stated on the source page. Use null for unknown values. Dates must be exact ISO dates only; never infer a year. A directory or repost is evidence, not the opportunity owner: organization must name the host, and officialUrl must be the host's first-party program or application page. Never return the directory URL as officialUrl when a first-party page is present. Classify a residency program as residency even if the page uses generic contest language. deadlineDate is the final close. Give a close time only when the page states it, with the zone exactly as stated. Example JSON: {\"title\":null,\"organization\":null,\"opportunityType\":null,\"deadlineDate\":null,\"deadlineTime\":null,\"deadlineTimezone\":null,\"deadlineKind\":\"unknown\",\"deadlineTiers\":[],\"stages\":[],\"fee\":null,\"prize\":null,\"description\":null,\"eligibility\":null,\"submissionUrl\":null,\"officialUrl\":null}" },
          { role: "user", content: `Return JSON with these keys: title, organization, opportunityType, deadlineDate, deadlineTime, deadlineTimezone, deadlineKind, deadlineTiers, stages, fee, prize, description, eligibility, submissionUrl, officialUrl. opportunityType must be one of open-call, magazine, grant, award, fellowship, residency, festival, scholarship, conference, rfp, contest, pitch, other or null. deadlineKind must be exact, rolling, year-round, seasonal, until-filled, conflicting, or unknown. deadlineTime is the stated close time as HH:MM (24-hour) and deadlineTimezone is its zone as an IANA name or the abbreviation on the page (ET, PT, GMT, BST, AoE); both null when no time is stated. deadlineTiers lists each dated entry window with its own fee: [{"tier":"early|regular|late|extended|final|other","label":"text from the page","closesOn":"YYYY-MM-DD","closesTime":"HH:MM or null","timezone":"zone or null","feeAmount":number or null,"feeCurrency":"ISO code or null"}]. stages lists other dated steps of this call: [{"kind":"letter-of-intent|full-application|shortlist|interview|notification|decision|event|other","label":"text from the page","dueOn":"YYYY-MM-DD"}]. Use [] when none are stated. Page URL: ${snapshot.finalUrl}\n\nPage text:\n${stripHtml(snapshot.html).slice(0, 12_000)}` },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`DeepSeek extraction HTTP ${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek extraction returned empty JSON content");
    return JSON.parse(content.replace(/^```json\s*/i, "").replace(/\s*```$/, "")) as DeepSeekFields;
  }
}

function stripHtml(value: string): string {
  return value.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeFields(fields: DeepSeekFields, snapshot: PageSnapshot): ExtractionResult["fields"] {
  const output: ExtractionResult["fields"] = [];
  const push = (fieldName: string, rawValue: string, normalizedValue: unknown, confidence: number) => {
    output.push({ fieldName, rawValue, normalizedValue, confidence, provenance: { adapterId: "deepseek-html-v2", method: "deepseek-json-shadow", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
  };
  const add = (fieldName: string, value: string | undefined, confidence = 0.65) => {
    if (value) push(fieldName, value, value, confidence);
  };
  add("title", text(fields.title));
  add("organization", text(fields.organization));
  const type = text(fields.opportunityType);
  if (type && OPPORTUNITY_TYPES.has(type)) add("opportunityType", type);
  const deadline = text(fields.deadlineDate);
  if (deadline && ISO_DATE.test(deadline)) add("deadline", deadline, 0.6);
  const kind = text(fields.deadlineKind);
  if (kind && ["exact", "rolling", "year-round", "seasonal", "until-filled", "conflicting", "unknown"].includes(kind)) add("deadlineKind", kind, 0.6);
  const facts = normalizeModelDeadlineFacts(fields);
  for (const tier of facts.tiers) push("deadlineTier", `${tier.label}: ${tier.date}`, tier, 0.6);
  for (const stage of facts.stages) push("deadlineStage", `${stage.label}: ${stage.dueOn}`, stage, 0.6);
  if (facts.clock) push("deadlineClock", `${facts.clock.date} ${facts.clock.time} ${facts.clock.timezone}`, facts.clock, 0.6);
  add("fee", text(fields.fee));
  add("prize", text(fields.prize));
  add("description", text(fields.description));
  add("eligibility", Array.isArray(fields.eligibility) ? fields.eligibility.map(String).join("; ") : text(fields.eligibility));
  const submissionUrl = text(fields.submissionUrl);
  if (submissionUrl) {
    try { if (["http:", "https:"].includes(new URL(submissionUrl).protocol)) add("submissionUrl", submissionUrl); } catch { /* invalid model URL is discarded */ }
  }
  const officialUrl = text(fields.officialUrl);
  if (officialUrl) {
    try { if (["http:", "https:"].includes(new URL(officialUrl).protocol)) add("officialUrl", officialUrl); } catch { /* invalid model URL is discarded */ }
  }
  return output;
}
