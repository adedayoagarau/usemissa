import type {
  DecisionMode,
  DecisionOutcome,
  JevAnswer,
  QuestionDefinition,
} from "./types.js";

function clampProbability(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : null;
}

function unavailable(
  definition: QuestionDefinition,
  reason: string,
): DecisionOutcome {
  return {
    questionKey: definition.key,
    questionVersion: definition.version,
    kind: definition.question.type,
    route: "unavailable",
    answer: null,
    probability: null,
    confidence: null,
    distribution: {},
    actionable: false,
    reason,
  };
}

/**
 * Turns one Jev answer into what Missa does with it, using the question's own
 * policy. Anything malformed, off-option or under threshold goes to review,
 * never to apply.
 */
export function routeAnswer(
  definition: QuestionDefinition,
  answer: JevAnswer | undefined,
  mode: DecisionMode,
): DecisionOutcome {
  if (!answer)
    return unavailable(definition, "Jev returned no answer for this question");
  if (answer.type !== definition.question.type) {
    return unavailable(
      definition,
      `Jev answered ${answer.type}, expected ${definition.question.type}`,
    );
  }

  const base = {
    questionKey: definition.key,
    questionVersion: definition.version,
    kind: definition.question.type,
  } as const;
  const finish = (
    outcome: Omit<
      DecisionOutcome,
      "questionKey" | "questionVersion" | "kind" | "actionable"
    >,
  ): DecisionOutcome => ({
    ...base,
    ...outcome,
    actionable:
      mode === "live" &&
      (outcome.route === "apply" || outcome.route === "reject"),
  });

  if (answer.type === "noul" && definition.policy.kind === "noul") {
    const probability = clampProbability(answer.noul);
    if (probability === null)
      return unavailable(definition, "Jev returned no probability");
    const { acceptAtOrAbove, rejectAtOrBelow } = definition.policy;
    const route =
      probability >= acceptAtOrAbove
        ? "apply"
        : probability <= rejectAtOrBelow
          ? "reject"
          : "review";
    return finish({
      route,
      answer: probability >= 0.5 ? "true" : "false",
      probability,
      confidence: Math.abs(probability - 0.5) * 2,
      distribution: { true: probability, false: 1 - probability },
    });
  }

  if (
    answer.type === "choice" &&
    definition.policy.kind === "choice" &&
    definition.question.type === "choice"
  ) {
    const options = definition.question.criteria;
    const distribution = Object.fromEntries(
      Object.entries(answer.probabilities ?? {})
        .map(([option, value]) => [option, clampProbability(value)] as const)
        .filter(
          (entry): entry is readonly [string, number] => entry[1] !== null,
        ),
    );
    if (!Object.hasOwn(options, answer.choice)) {
      return {
        ...unavailable(
          definition,
          `Jev chose an undeclared option: ${answer.choice}`,
        ),
        distribution,
      };
    }
    const probability = distribution[answer.choice] ?? null;
    const confidence = clampProbability(answer.confidence);
    const forcedReview =
      definition.policy.alwaysReview?.includes(answer.choice) ?? false;
    const route =
      !forcedReview &&
      probability !== null &&
      probability >= definition.policy.minProbability
        ? "apply"
        : "review";
    return finish({
      route,
      answer: answer.choice,
      probability,
      confidence,
      distribution,
    });
  }

  if (
    answer.type === "score" &&
    definition.policy.kind === "score" &&
    definition.question.type === "score"
  ) {
    const levels = definition.question.criteria;
    const distribution: Record<string, number> = {};
    for (const [index, value] of Object.entries(answer.probabilities ?? {})) {
      const label = levels[Number(index)];
      const probability = clampProbability(value);
      if (label !== undefined && probability !== null)
        distribution[label] = probability;
    }
    const topIndex = Object.entries(answer.probabilities ?? {}).sort(
      (left, right) => (right[1] ?? 0) - (left[1] ?? 0),
    )[0]?.[0];
    const label = topIndex === undefined ? undefined : levels[Number(topIndex)];
    if (label === undefined)
      return unavailable(definition, "Jev returned no usable score level");
    const confidence = clampProbability(answer.confidence);
    const route =
      confidence !== null && confidence >= definition.policy.minConfidence
        ? "apply"
        : "review";
    return finish({
      route,
      answer: label,
      probability: distribution[label] ?? null,
      confidence,
      distribution,
    });
  }

  return unavailable(
    definition,
    "Question policy does not match the question type",
  );
}

export function unavailableOutcome(
  definition: QuestionDefinition,
  reason: string,
): DecisionOutcome {
  return unavailable(definition, reason);
}
