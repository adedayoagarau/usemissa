/**
 * Checks generated write-ups against their source facts with Jev, and decides
 * whether changed facts are worth an LLM rewrite.
 *
 * Scopes (see `decisionModeFromEnv`):
 * - `content_grounding` (DECISIONS_MODE_CONTENT_GROUNDING=live): a confidently
 *   unsupported sentence, or a confident truth problem in a field, holds an
 *   opportunity write-up for a person and drops that field from an
 *   organization profile before it is saved.
 * - `content_regenerate` (DECISIONS_MODE_CONTENT_REGENERATE=live): a confident
 *   "the change is not material" reuses the previous write-up's prose on fresh
 *   listing facts instead of calling the LLM again.
 *
 * In shadow mode, or without JEV_API_KEY, decisions are recorded (when
 * possible) and nothing else changes. Jev and ledger failures are logged and
 * ignored.
 */
import {
  CONTENT_GROUNDING_SCOPE,
  CONTENT_REGENERATE_SCOPE,
  buildGroundingPlan,
  contentRewriteNeeded,
  createPostgresDecisionLedger,
  decide,
  decisionModeFromEnv,
  groundingState,
  jevClientFromEnv,
  opportunityGeneratedFields,
  opportunitySourceFacts,
  organizationGeneratedFields,
  rewriteState,
  summarizeGrounding,
  type DecisionLedger,
  type DecisionMode,
  type JevClient,
  type Queryable,
} from "@missa/decisions";
import type {
  OpportunityContent,
  OpportunityContentBuildInput,
} from "@missa/radar-engine";
import type {
  OrganizationEditorialInput,
  OrganizationEditorialProfile,
} from "./editorialWriter.js";

export interface ContentDecisionDeps {
  client: JevClient;
  ledger?: DecisionLedger;
  groundingMode: DecisionMode;
  regenerateMode: DecisionMode;
  log?: (message: string, error?: unknown) => void;
}

export function contentDecisionDepsFromEnv(
  db: Queryable,
  env: Record<string, string | undefined> = process.env,
): ContentDecisionDeps {
  return {
    client: jevClientFromEnv(env),
    ledger: createPostgresDecisionLedger(db),
    groundingMode: decisionModeFromEnv(CONTENT_GROUNDING_SCOPE, env),
    regenerateMode: decisionModeFromEnv(CONTENT_REGENERATE_SCOPE, env),
    log: (message, error) =>
      console.warn(`[content-worker] ${message}`, error ?? ""),
  };
}

/** Stored on a write-up when live grounding finds a problem; review then holds it for a person. */
export interface ContentGroundingHold {
  status: "hold";
  reasons: string[];
  checkedAt: string;
}

export type GroundedOpportunityContent = OpportunityContent & {
  grounding?: ContentGroundingHold;
};

export type GroundedOrganizationProfile = Partial<
  Omit<OrganizationEditorialProfile, "generatedAt" | "writerVersion">
> &
  Pick<OrganizationEditorialProfile, "generatedAt" | "writerVersion"> & {
    /** Fields left out because the source does not support them. */
    groundingWithheld?: string[];
  };

function report(deps: ContentDecisionDeps, message: string, error?: unknown) {
  deps.log?.(message, error);
}

/**
 * Asks whether each sentence and field of an opportunity write-up is grounded
 * in the listing. Returns the content unchanged unless live grounding is
 * confident something is wrong, in which case it carries a hold.
 */
export async function groundOpportunityContent(
  deps: ContentDecisionDeps,
  input: {
    opportunityId: string;
    facts: OpportunityContentBuildInput;
    /** Source page text only; never a previous write-up. */
    sourceText?: string;
    content: OpportunityContent;
  },
): Promise<GroundedOpportunityContent> {
  if (!deps.client.available) return input.content;
  try {
    const fields = opportunityGeneratedFields(input.content);
    const plan = buildGroundingPlan({
      subjectType: "opportunity",
      fields,
      includeEvidenceCheck: true,
    });
    const source = opportunitySourceFacts({
      ...input.facts,
      sourceText: input.sourceText,
    });
    const result = await decide({
      client: deps.client,
      ledger: deps.ledger,
      mode: deps.groundingMode,
      subjectId: input.opportunityId,
      state: groundingState(source, fields),
      questions: plan.questions,
      evidenceUrl: input.facts.sourceUrl,
    });
    if (result.error)
      report(deps, `Grounding for ${input.opportunityId}: ${result.error}`);
    const summary = summarizeGrounding(plan, result.outcomes);
    if (summary.withheldFields.length === 0) return input.content;
    return {
      ...input.content,
      grounding: {
        status: "hold",
        reasons: summary.reasons,
        checkedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    report(deps, `Grounding failed for ${input.opportunityId}`, error);
    return input.content;
  }
}

/**
 * Checks an organization profile field by field. In live mode a field the
 * source confidently does not support is dropped before the profile is saved.
 */
export async function groundOrganizationProfile(
  deps: ContentDecisionDeps,
  input: {
    organizationId: string;
    source: OrganizationEditorialInput;
    profile: OrganizationEditorialProfile;
  },
): Promise<GroundedOrganizationProfile> {
  if (!deps.client.available) return input.profile;
  try {
    const fields = organizationGeneratedFields(input.profile);
    const plan = buildGroundingPlan({
      subjectType: "organization",
      fields,
      includeEvidenceCheck: true,
    });
    const result = await decide({
      client: deps.client,
      ledger: deps.ledger,
      mode: deps.groundingMode,
      subjectId: input.organizationId,
      state: groundingState({ ...input.source }, fields),
      questions: plan.questions,
      evidenceUrl: input.source.websiteUrl || null,
    });
    if (result.error)
      report(deps, `Grounding for ${input.organizationId}: ${result.error}`);
    const { withheldFields } = summarizeGrounding(plan, result.outcomes);
    if (withheldFields.length === 0) return input.profile;
    const profile: GroundedOrganizationProfile = { ...input.profile };
    for (const field of withheldFields)
      delete profile[field as keyof typeof profile];
    profile.groundingWithheld = withheldFields;
    return profile;
  } catch (error) {
    report(deps, `Grounding failed for ${input.organizationId}`, error);
    return input.profile;
  }
}

function factSnapshot(content: OpportunityContent): Record<string, unknown> {
  return {
    summary: content.summary,
    highlights: Object.fromEntries(
      (Array.isArray(content.highlights) ? content.highlights : []).map(
        (fact) => [fact.label, `${fact.value} (${fact.certainty})`],
      ),
    ),
    preparation: content.preparation,
    unknowns: content.unknowns,
    nextAction: content.nextAction,
  };
}

/**
 * True only when live regenerate decisions are confident the facts behind the
 * previous write-up have not changed in a way that matters.
 */
export async function shouldReuseEditorial(
  deps: ContentDecisionDeps,
  input: {
    opportunityId: string;
    previous: OpportunityContent;
    /** The deterministic content built from today's facts. */
    next: OpportunityContent;
    sourceText?: string;
  },
): Promise<boolean> {
  if (!deps.client.available) return false;
  try {
    const result = await decide({
      client: deps.client,
      ledger: deps.ledger,
      mode: deps.regenerateMode,
      subjectId: input.opportunityId,
      state: rewriteState({
        previousFacts: factSnapshot(input.previous),
        previousWriteUp: opportunityGeneratedFields(input.previous),
        currentFacts: factSnapshot(input.next),
        currentSourceText: input.sourceText,
      }),
      questions: [contentRewriteNeeded],
      evidenceUrl: input.next.sourceUrl,
    });
    if (result.error)
      report(
        deps,
        `Regenerate check for ${input.opportunityId}: ${result.error}`,
      );
    const outcome = result.outcomes[contentRewriteNeeded.key];
    return Boolean(outcome?.actionable && outcome.route === "reject");
  } catch (error) {
    report(deps, `Regenerate check failed for ${input.opportunityId}`, error);
    return false;
  }
}

/** Fresh listing facts with the previous write-up's prose carried over. */
export function reuseEditorial(
  next: OpportunityContent,
  previous: OpportunityContent,
): OpportunityContent {
  const editorial = {
    editorialHook: previous.editorialHook ?? next.editorialHook,
    curatorialOverview: previous.curatorialOverview ?? next.curatorialOverview,
    targetAudience: previous.targetAudience ?? next.targetAudience,
    thematicFocus: previous.thematicFocus ?? next.thematicFocus,
    insiderTips: previous.insiderTips ?? next.insiderTips,
    curatedChecklist: next.curatedChecklist,
  };
  return {
    ...next,
    builderVersion: previous.builderVersion,
    description: previous.description ?? next.description,
    ...editorial,
    editorial,
  };
}

type ReviewResult = {
  decision: "approved" | "needs-human" | "blocked" | "error";
  score: number;
  reasons: string[];
  checks: Record<string, unknown>;
};

/** A write-up live grounding held is never approved automatically. */
export function applyGroundingHold<T extends ReviewResult>(
  result: T,
  content: GroundedOpportunityContent,
): T {
  const hold = content.grounding;
  if (hold?.status !== "hold") return result;
  return {
    ...result,
    decision: result.decision === "approved" ? "needs-human" : result.decision,
    reasons: [
      ...result.reasons,
      "Generated text is not supported by the source and needs a person to check it.",
    ],
    checks: { ...result.checks, groundingHold: true },
  };
}
