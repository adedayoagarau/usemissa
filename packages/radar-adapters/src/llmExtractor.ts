import Anthropic from '@anthropic-ai/sdk';
import type {
  Clock,
  DeadlineInfo,
  EligibilityRule,
  Extractor,
  FeeInfo,
  OpportunityCandidate,
  OpportunityType,
  PageSnapshot,
  Source,
} from '@missa/radar-engine';
import {
  CLOSED_SIGNALS,
  CLOSING_SIGNALS,
  OPENING_SIGNALS,
  SUSPICIOUS_SIGNALS,
  findSignals,
  isPlausibleOpportunityDate,
  validateCandidate,
} from '@missa/radar-engine';

const OPPORTUNITY_TYPES: OpportunityType[] = [
  'open-call', 'magazine', 'grant', 'award', 'fellowship', 'residency',
  'festival', 'scholarship', 'conference', 'rfp', 'contest', 'pitch', 'other',
];

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: 'record_opportunity_fields',
  description: 'Record the structured fields extracted from an opportunity listing page. Leave a field absent (do not guess) if the page does not state it.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      organizationName: { type: 'string' },
      type: { type: 'string', enum: OPPORTUNITY_TYPES },
      genres: { type: 'array', items: { type: 'string' } },
      openDate: { type: 'string', description: 'ISO date (YYYY-MM-DD), only if the page states one' },
      deadlineDate: { type: 'string', description: 'ISO date (YYYY-MM-DD), only if the page states an exact deadline' },
      deadlineRolling: { type: 'boolean', description: 'true if submissions are rolling / accepted on an ongoing basis' },
      deadlineUntilFilled: { type: 'boolean', description: 'true if the call runs "until filled"' },
      feeDisclosed: { type: 'boolean' },
      feeAmountCents: { type: 'integer', description: 'Entry/application fee in cents; 0 if explicitly free' },
      feeCurrency: { type: 'string' },
      prize: { type: 'string' },
      eligibility: {
        type: 'array',
        items: {
          type: 'object',
          properties: { key: { type: 'string' }, value: { type: 'string' }, description: { type: 'string' } },
          required: ['key', 'description'],
        },
      },
      requiredMaterials: { type: 'array', items: { type: 'string' } },
      submissionUrl: { type: 'string' },
      contactEmailPresent: { type: 'boolean' },
      simultaneousAllowed: { type: 'boolean' },
    },
    required: ['type', 'genres', 'eligibility', 'requiredMaterials', 'contactEmailPresent'],
  },
};

interface ExtractionFields {
  title?: string;
  organizationName?: string;
  type?: string;
  genres?: string[];
  openDate?: string;
  deadlineDate?: string;
  deadlineRolling?: boolean;
  deadlineUntilFilled?: boolean;
  feeDisclosed?: boolean;
  feeAmountCents?: number;
  feeCurrency?: string;
  prize?: string;
  eligibility?: EligibilityRule[];
  requiredMaterials?: string[];
  submissionUrl?: string;
  contactEmailPresent?: boolean;
  simultaneousAllowed?: boolean;
}

export interface LlmExtractorOptions {
  apiKey?: string;
  model?: string;
  client?: Anthropic;
}

/**
 * LLM-assisted Extractor: the model reads page text and returns structured
 * fields via forced tool use (so output is always well-typed JSON, never
 * freeform prose to parse). Open/closed/suspicious-language signals are still
 * detected deterministically (`findSignals`), and every result passes through
 * `validateCandidate()` — the same guardrail the deterministic extractor uses.
 * This is the "not purely AI" rule from the strategy doc: the LLM proposes,
 * the validators dispose.
 */
export class LlmExtractor implements Extractor {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(private readonly clock: Clock, opts: LlmExtractorOptions = {}) {
    this.client = opts.client ?? new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model ?? 'claude-sonnet-5';
  }

  async extract(source: Source, snapshot: PageSnapshot): Promise<OpportunityCandidate> {
    const now = this.clock.now();
    const fields = await this.callModel(snapshot.content);
    const text = snapshot.content;

    const deadline = deadlineFrom(fields, now);
    const candidate: OpportunityCandidate = {
      sourceId: source.id,
      snapshotId: snapshot.id,
      url: source.url,
      extractedAt: now.toISOString(),
      title: fields.title ?? source.name,
      organizationName: fields.organizationName,
      type: isOpportunityType(fields.type) ? fields.type : 'open-call',
      genres: fields.genres ?? [],
      openDate: fields.openDate && isPlausibleOpportunityDate(fields.openDate, now) ? fields.openDate : undefined,
      deadline,
      fee: feeFrom(fields),
      prize: fields.prize,
      eligibility: fields.eligibility ?? [],
      requiredMaterials: fields.requiredMaterials ?? [],
      submissionUrl: fields.submissionUrl,
      contactEmailPresent: fields.contactEmailPresent ?? false,
      simultaneousAllowed: fields.simultaneousAllowed,
      openSignals: findSignals(text, OPENING_SIGNALS),
      closeSignals: findSignals(text, CLOSING_SIGNALS),
      closedSignals: findSignals(text, CLOSED_SIGNALS),
      suspiciousSignals: findSignals(text, SUSPICIOUS_SIGNALS),
      issues: [],
      extractionConfidence: 0,
    };
    return validateCandidate(candidate, now);
  }

  private async callModel(pageText: string): Promise<ExtractionFields> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'tool', name: EXTRACTION_TOOL.name },
      messages: [
        {
          role: 'user',
          content: `Extract the opportunity listing fields from this page text:\n\n${pageText.slice(0, 12_000)}`,
        },
      ],
    });
    const toolUse = message.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use');
    return (toolUse?.input as ExtractionFields) ?? {};
  }
}

function isOpportunityType(value: string | undefined): value is OpportunityType {
  return !!value && (OPPORTUNITY_TYPES as string[]).includes(value);
}

function deadlineFrom(fields: ExtractionFields, now: Date): DeadlineInfo {
  if (fields.deadlineDate && isPlausibleOpportunityDate(fields.deadlineDate, now)) {
    return { kind: 'exact', date: fields.deadlineDate };
  }
  if (fields.deadlineUntilFilled) return { kind: 'until-filled' };
  if (fields.deadlineRolling) return { kind: 'rolling' };
  return { kind: 'unknown' };
}

function feeFrom(fields: ExtractionFields): FeeInfo {
  if (!fields.feeDisclosed) return { disclosed: false };
  return { disclosed: true, amountCents: fields.feeAmountCents ?? 0, currency: fields.feeCurrency ?? 'USD' };
}
