/**
 * Questions that check generated write-ups (opportunity dossiers and
 * organization profiles) against the facts they were written from. Jev never
 * rewrites the text: it says whether each sentence is supported, whether a
 * field restates a fact differently from the source, and whether the facts
 * changed enough to write again.
 *
 * Claim support is asked once per sentence. Each sentence gets its own key,
 * `content.claim_supported.<field>.s<index>`, and its ledger row carries
 * `<field>#<index>` as the field name, so rows group by field and sentence.
 * Field checks use `content.<check>.<field>` with the field as field name.
 */
import { defineQuestion } from "../questions.js";
import type {
  DecisionOutcome,
  JevState,
  QuestionDefinition,
} from "../types.js";

const NOUL_POLICY = {
  kind: "noul",
  acceptAtOrAbove: 0.9,
  rejectAtOrBelow: 0.1,
} as const;

/** Placeholders filled per field or sentence by `questionForField`. */
const FIELD = "{field}";
const SENTENCE = "{sentence}";

export const contentClaimSupported = defineQuestion({
  key: "content.claim_supported",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "noul",
    instructions: `Take this sentence from ${FIELD}: ${SENTENCE}. Is every factual claim in it stated in source? Advice that asserts nothing about this opportunity or organization counts as supported. A claim that is only plausible, or inferred from the kind of organization, is not supported.`,
    criteria: {
      true: "Source states every factual claim in the sentence, or the sentence makes no claim about this opportunity or organization.",
      false:
        "The sentence states something about this opportunity or organization that source does not state.",
    },
  },
  policy: NOUL_POLICY,
});

export const contentStatesFactDifferingFromSource = defineQuestion({
  key: "content.states_fact_differing_from_source",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "noul",
    instructions: `Does ${FIELD} state a deadline, fee, prize, award amount or location that differs from source?`,
    criteria: {
      true: "The text gives a deadline, fee, prize or location that does not match source.",
      false:
        "Every deadline, fee, prize and location in the text matches source, or the text gives none.",
    },
  },
  policy: NOUL_POLICY,
});

export const contentMissingFactTurnedPositive = defineQuestion({
  key: "content.missing_fact_turned_positive",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "noul",
    instructions: `Does ${FIELD} turn a fact source leaves out into a positive claim, such as "no fee", "open to all", "no restrictions" or "fully funded" when source does not say so?`,
    criteria: {
      true: "The text presents something source does not state as a positive fact.",
      false:
        "The text leaves facts source does not state unstated, or marks them as not stated.",
    },
  },
  policy: NOUL_POLICY,
});

export const contentInfersReaderFeelings = defineQuestion({
  key: "content.infers_reader_feelings",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "noul",
    instructions: `Does ${FIELD} tell the reader what they feel, want or hope for, such as "you'll love", "if you dream of" or "perfect for anyone eager to"?`,
    criteria: {
      true: "The text states or assumes the reader's feelings or wishes.",
      false:
        "The text describes the opportunity without assuming the reader's feelings.",
    },
  },
  policy: NOUL_POLICY,
});

export const contentPromotionalPromise = defineQuestion({
  key: "content.promotional_promise",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "noul",
    instructions: `Does ${FIELD} promise an outcome or use promotional language, such as career impact, recognition, acceptance chances, "unique", "exciting" or "life-changing"?`,
    criteria: {
      true: "The text promises an outcome or uses promotional language.",
      false: "The text describes what is offered without promising outcomes.",
    },
  },
  policy: NOUL_POLICY,
});

export const contentIdentityClaimNotInSource = defineQuestion({
  key: "content.identity_claim_not_in_source",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "noul",
    instructions: `Does ${FIELD} state who the organization is, its history, founding, reputation, standing, past winners or alumni, or who it is for (identity, nationality, career stage), when source does not state it?`,
    criteria: {
      true: "The text makes an identity, history, reputation or eligibility claim that source does not state.",
      false:
        "Every identity, history, reputation and eligibility claim in the text is stated in source, or there are none.",
    },
  },
  policy: NOUL_POLICY,
});

export const contentVoiceCompliance = defineQuestion({
  key: "content.voice_compliance",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "score",
    instructions: `Rate ${FIELD} against Missa's voice: plain, specific and familiar. On-voice text names things, dates, amounts and requirements in short ordinary sentences. Off-voice text is promotional, vague, ornate, performs warmth, uses journey language, rhetorical triplets or false contrast.`,
    criteria: ["off-voice", "acceptable", "on-voice"],
  },
  policy: { kind: "score", minConfidence: 0.85 },
});

export const contentRewriteNeeded = defineQuestion({
  key: "content.rewrite_needed",
  version: 1,
  subjectType: "opportunity",
  fieldName: "content",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "before.facts were the facts when before.writeUp was written. after.facts and after.sourceText are the facts now. Is a change material enough that before.writeUp must be written again? Material: a deadline, fee, prize, location, eligibility, required material, opportunity type or status changed, or after states something that makes before.writeUp wrong or leaves out a key fact. Not material: wording, ordering, formatting or check times.",
    criteria: {
      true: "A change makes the existing write-up wrong or leaves out a key fact.",
      false:
        "The changes do not affect anything the write-up says or should say.",
    },
  },
  policy: NOUL_POLICY,
});

export const contentEnoughEvidenceToWrite = defineQuestion({
  key: "content.enough_evidence_to_write",
  version: 1,
  subjectType: "opportunity",
  fieldName: "content",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "Does source state enough to write a factual paragraph about this opportunity or organization: what it is, who runs it and what it offers or asks for? Names and dates alone are not enough.",
    criteria: {
      true: "Source states what it is, who runs it and what it offers or asks for.",
      false: "Source is too thin to write about without guessing.",
    },
  },
  policy: NOUL_POLICY,
});

/** Field checks asked once per generated field. */
export const FIELD_CHECKS = {
  states_fact_differing_from_source: contentStatesFactDifferingFromSource,
  missing_fact_turned_positive: contentMissingFactTurnedPositive,
  infers_reader_feelings: contentInfersReaderFeelings,
  promotional_promise: contentPromotionalPromise,
  identity_claim_not_in_source: contentIdentityClaimNotInSource,
  voice_compliance: contentVoiceCompliance,
} as const;
export type FieldCheck = keyof typeof FIELD_CHECKS;

/**
 * Field checks whose confident "yes" means the text says something untrue or
 * unsupported. The rest (feelings, promotion, voice) are recorded only.
 */
export const TRUTH_CHECKS: readonly FieldCheck[] = [
  "states_fact_differing_from_source",
  "missing_fact_turned_positive",
  "identity_claim_not_in_source",
];

export const WRITING_QUESTIONS: QuestionDefinition[] = [
  contentClaimSupported,
  ...Object.values(FIELD_CHECKS),
  contentRewriteNeeded,
  contentEnoughEvidenceToWrite,
];

export type WritingSubjectType = "opportunity" | "organization";

function snakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

/**
 * Copies a template definition for one field (and optionally one sentence),
 * filling its placeholders. The copy keeps the template's version, so a
 * wording change still needs one version bump on the template.
 */
export function questionForField(
  definition: QuestionDefinition,
  target: {
    subjectType: WritingSubjectType;
    field: string;
    sentenceIndex?: number;
    sentence?: string;
  },
): QuestionDefinition {
  const fieldKey = snakeCase(target.field);
  const indexed = target.sentenceIndex !== undefined;
  const fill = (text: string) =>
    text
      .replaceAll(FIELD, `generated.${target.field}`)
      .replaceAll(SENTENCE, JSON.stringify(target.sentence ?? ""));
  const { question } = definition;
  return defineQuestion({
    ...definition,
    key: `${definition.key}.${fieldKey}${indexed ? `.s${target.sentenceIndex}` : ""}`,
    subjectType: target.subjectType,
    fieldName: indexed
      ? `${target.field}#${target.sentenceIndex}`
      : target.field,
    question: { ...question, instructions: fill(question.instructions) },
  } as QuestionDefinition);
}

/** Same definition, asked about another subject type. */
function forSubject(
  definition: QuestionDefinition,
  subjectType: WritingSubjectType,
): QuestionDefinition {
  return definition.subjectType === subjectType
    ? definition
    : defineQuestion({ ...definition, subjectType });
}

// Words that end in a full stop without ending a sentence.
const ABBREVIATIONS = new Set([
  "e.g",
  "i.e",
  "etc",
  "vs",
  "dr",
  "mr",
  "mrs",
  "ms",
  "st",
  "no",
  "inc",
  "ltd",
  "co",
  "jr",
  "sr",
  "prof",
  "approx",
  "u.s",
  "u.k",
  "mt",
  "ft",
  "ave",
  "dept",
  "est",
]);

/**
 * Splits prose into sentences. Line breaks always end a sentence; full stops
 * after abbreviations and initials, and inside numbers, do not.
 */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  for (const line of text.split(/\n+/)) {
    const paragraph = line.replace(/\s+/g, " ").trim();
    if (!paragraph) continue;
    let start = 0;
    const ending = /[.!?…]+["'”’)\]]*(?= |$)/g;
    let match: RegExpExecArray | null;
    while ((match = ending.exec(paragraph))) {
      const end = match.index + match[0].length;
      const rest = paragraph.slice(end).trimStart();
      if (rest) {
        const word = (
          paragraph.slice(start, match.index).split(" ").pop() ?? ""
        )
          .replace(/^["'“‘(\[]+/, "")
          .toLowerCase();
        const abbreviation =
          match[0].startsWith(".") &&
          (ABBREVIATIONS.has(word) || /^[a-z]$/.test(word));
        if (abbreviation || !/^["'“‘(\[]?[A-Z0-9]/.test(rest)) continue;
      }
      const sentence = paragraph.slice(start, end).trim();
      if (sentence) sentences.push(sentence);
      start = end;
    }
    const tail = paragraph.slice(start).trim();
    if (tail) sentences.push(tail);
  }
  return sentences;
}

/** Generated text by field; list fields keep one entry per item. */
export type GeneratedFields = Record<string, string[]>;

function texts(...values: unknown[]): string[] {
  return values.flatMap((value) =>
    typeof value === "string"
      ? value.trim()
        ? [value.trim()]
        : []
      : Array.isArray(value)
        ? texts(...value)
        : [],
  );
}

/** The fields an opportunity write-up's writer produced. */
export function opportunityGeneratedFields(content: {
  editorialHook?: string;
  curatorialOverview?: string;
  targetAudience?: { careerStages?: string[]; idealCandidate?: string };
  thematicFocus?: string;
  insiderTips?: string[];
}): GeneratedFields {
  const stages = texts(content.targetAudience?.careerStages);
  const fields: GeneratedFields = {
    editorialHook: texts(content.editorialHook),
    curatorialOverview: texts(content.curatorialOverview),
    targetAudience: [
      ...texts(content.targetAudience?.idealCandidate),
      ...(stages.length ? [`Career stages named: ${stages.join(", ")}.`] : []),
    ],
    thematicFocus: texts(content.thematicFocus),
    insiderTips: texts(content.insiderTips),
  };
  return Object.fromEntries(
    Object.entries(fields).filter(([, items]) => items.length > 0),
  );
}

/** The fields an organization profile's writer produced. */
export function organizationGeneratedFields(profile: {
  overview?: string;
  demeanor?: string;
  reputationSummary?: string;
  notableAlumni?: string[];
  submissionGuidance?: string;
}): GeneratedFields {
  const fields: GeneratedFields = {
    overview: texts(profile.overview),
    demeanor: texts(profile.demeanor),
    reputationSummary: texts(profile.reputationSummary),
    notableAlumni: texts(profile.notableAlumni),
    submissionGuidance: texts(profile.submissionGuidance),
  };
  return Object.fromEntries(
    Object.entries(fields).filter(([, items]) => items.length > 0),
  );
}

const MAX_TEXT = 2_000;

/** Drops empty values and caps long text so state stays compact. */
export function compactFacts(
  facts: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(facts)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      const trimmed = value.replace(/\s+/g, " ").trim();
      if (trimmed)
        out[key] =
          trimmed.length > MAX_TEXT
            ? `${trimmed.slice(0, MAX_TEXT)}…`
            : trimmed;
    } else if (Array.isArray(value)) {
      if (value.length) out[key] = value;
    } else if (typeof value === "object") {
      const nested = compactFacts(value as Record<string, unknown>);
      if (Object.keys(nested).length) out[key] = nested;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Source facts for an opportunity write-up, from what the writer was given. */
export function opportunitySourceFacts(input: {
  title: string;
  type: string;
  status?: string;
  organizationName?: string;
  discipline?: string;
  genres?: string[];
  deadline?: { kind?: string; date?: string; raw?: string };
  fee?: { status?: string; amountCents?: number; currency?: string };
  prize?: string;
  location?: string;
  eligibilitySummary?: string;
  readingPeriodKind?: string;
  requiredMaterials?: Array<{ label: string; limit?: string }>;
  acceptedFormats?: string[];
  sourceText?: string;
  guidelinesText?: string;
}): Record<string, unknown> {
  return compactFacts({
    title: input.title,
    type: input.type,
    status: input.status,
    organization: input.organizationName,
    discipline: input.discipline,
    genres: input.genres,
    deadline: input.deadline,
    fee: input.fee,
    prize: input.prize,
    location: input.location,
    eligibility: input.eligibilitySummary,
    readingPeriod: input.readingPeriodKind,
    requiredMaterials: input.requiredMaterials,
    acceptedFormats: input.acceptedFormats,
    sourceText: input.sourceText,
    guidelinesText: input.guidelinesText,
  });
}

/** Jev state for grounding: the source facts and the generated text by field. */
export function groundingState(
  source: Record<string, unknown>,
  generated: GeneratedFields,
): JevState {
  return {
    source: compactFacts(source),
    generated: Object.fromEntries(
      Object.entries(generated).map(([field, items]) => [
        field,
        items.join("\n"),
      ]),
    ),
  };
}

/** Jev state for the regenerate gate. */
export function rewriteState(input: {
  previousFacts: Record<string, unknown>;
  previousWriteUp: GeneratedFields;
  currentFacts: Record<string, unknown>;
  currentSourceText?: string;
}): JevState {
  return {
    before: {
      facts: compactFacts(input.previousFacts),
      writeUp: Object.fromEntries(
        Object.entries(input.previousWriteUp).map(([field, items]) => [
          field,
          items.join("\n"),
        ]),
      ),
    },
    after: compactFacts({
      facts: input.currentFacts,
      sourceText: input.currentSourceText,
    }),
  };
}

export interface GroundingPlan {
  subjectType: WritingSubjectType;
  questions: QuestionDefinition[];
  sentences: Array<{ field: string; index: number; text: string; key: string }>;
  fieldChecks: Array<{ field: string; check: FieldCheck; key: string }>;
  /** Sentences past the per-field cap, which were not asked about. */
  unchecked: Record<string, number>;
  evidenceKey: string | null;
}

/**
 * Builds every grounding question for one write-up: one claim question per
 * sentence (capped per field), the field checks per field, and optionally the
 * enough-evidence question for the record.
 */
export function buildGroundingPlan(input: {
  subjectType: WritingSubjectType;
  fields: GeneratedFields;
  maxSentencesPerField?: number;
  includeEvidenceCheck?: boolean;
}): GroundingPlan {
  const cap = input.maxSentencesPerField ?? 12;
  const plan: GroundingPlan = {
    subjectType: input.subjectType,
    questions: [],
    sentences: [],
    fieldChecks: [],
    unchecked: {},
    evidenceKey: null,
  };
  for (const [field, items] of Object.entries(input.fields)) {
    const sentences = items.flatMap((item) => splitSentences(item));
    if (sentences.length === 0) continue;
    sentences.slice(0, cap).forEach((text, index) => {
      const definition = questionForField(contentClaimSupported, {
        subjectType: input.subjectType,
        field,
        sentenceIndex: index,
        sentence: text,
      });
      plan.questions.push(definition);
      plan.sentences.push({ field, index, text, key: definition.key });
    });
    if (sentences.length > cap) plan.unchecked[field] = sentences.length - cap;
    for (const [check, template] of Object.entries(FIELD_CHECKS) as Array<
      [FieldCheck, QuestionDefinition]
    >) {
      const definition = questionForField(template, {
        subjectType: input.subjectType,
        field,
      });
      plan.questions.push(definition);
      plan.fieldChecks.push({ field, check, key: definition.key });
    }
  }
  if (input.includeEvidenceCheck) {
    const definition = forSubject(
      contentEnoughEvidenceToWrite,
      input.subjectType,
    );
    plan.questions.push(definition);
    plan.evidenceKey = definition.key;
  }
  return plan;
}

export interface FieldGrounding {
  /** Sentence indexes Jev judged unsupported (any route but unavailable). */
  unsupportedSentences: number[];
  /** Field checks Jev answered yes to. */
  flags: FieldCheck[];
  voice: string | null;
  /** True when a confident, actionable answer says the field is untrue or unsupported. */
  withhold: boolean;
}

export interface GroundingSummary {
  fields: Record<string, FieldGrounding>;
  /** Fields with an actionable truth problem; empty in shadow mode. */
  withheldFields: string[];
  /** Plain reasons for admins, one per withheld field. */
  reasons: string[];
  enoughEvidence: boolean | null;
}

/**
 * Reads grounding outcomes back by field. Only actionable outcomes (live mode,
 * confident) can withhold a field: a confident "unsupported" sentence or a
 * confident yes on a truth check.
 */
export function summarizeGrounding(
  plan: GroundingPlan,
  outcomes: Record<string, DecisionOutcome>,
): GroundingSummary {
  const fields: Record<string, FieldGrounding> = {};
  const field = (name: string) =>
    (fields[name] ??= {
      unsupportedSentences: [],
      flags: [],
      voice: null,
      withhold: false,
    });
  const reasonsByField = new Map<string, string>();

  for (const sentence of plan.sentences) {
    const outcome = outcomes[sentence.key];
    const entry = field(sentence.field);
    if (!outcome || outcome.route === "unavailable") continue;
    if (outcome.answer === "false")
      entry.unsupportedSentences.push(sentence.index);
    if (outcome.actionable && outcome.route === "reject") {
      entry.withhold = true;
      if (!reasonsByField.has(sentence.field))
        reasonsByField.set(
          sentence.field,
          `${sentence.field}: a sentence is not supported by the source.`,
        );
    }
  }
  for (const check of plan.fieldChecks) {
    const outcome = outcomes[check.key];
    const entry = field(check.field);
    if (!outcome || outcome.route === "unavailable") continue;
    if (check.check === "voice_compliance") {
      entry.voice = outcome.answer;
      continue;
    }
    if (outcome.answer === "true") entry.flags.push(check.check);
    if (
      TRUTH_CHECKS.includes(check.check) &&
      outcome.actionable &&
      outcome.route === "apply"
    ) {
      entry.withhold = true;
      if (!reasonsByField.has(check.field))
        reasonsByField.set(
          check.field,
          check.check === "states_fact_differing_from_source"
            ? `${check.field}: states a fact that differs from the source.`
            : `${check.field}: makes a claim the source does not state.`,
        );
    }
  }

  const evidence = plan.evidenceKey ? outcomes[plan.evidenceKey] : undefined;
  const withheldFields = Object.entries(fields)
    .filter(([, entry]) => entry.withhold)
    .map(([name]) => name);
  return {
    fields,
    withheldFields,
    reasons: withheldFields.map((name) => reasonsByField.get(name)!),
    enoughEvidence:
      evidence && evidence.route !== "unavailable"
        ? evidence.answer === "true"
        : null,
  };
}

/** Scope names for `decisionModeFromEnv`. */
export const CONTENT_GROUNDING_SCOPE = "content_grounding";
export const CONTENT_REGENERATE_SCOPE = "content_regenerate";
