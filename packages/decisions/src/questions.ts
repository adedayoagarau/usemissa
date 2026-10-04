import type { QuestionDefinition } from "./types.js";

const KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

/** Returns every problem with a definition; empty when it is valid. */
export function validateQuestion(definition: QuestionDefinition): string[] {
  const problems: string[] = [];
  const { question, policy } = definition;
  if (!KEY_PATTERN.test(definition.key))
    problems.push(`Key must be dotted snake_case: ${definition.key}`);
  if (!Number.isInteger(definition.version) || definition.version < 1)
    problems.push("Version must be a positive integer");
  if (!question.instructions.trim()) problems.push("Instructions are empty");
  if (question.type !== policy.kind)
    problems.push(
      `Policy ${policy.kind} does not fit a ${question.type} question`,
    );

  if (question.type === "choice") {
    const options = Object.keys(question.criteria);
    if (options.length < 2)
      problems.push("A choice needs at least two options");
    if (options.length > 255)
      problems.push("A choice may have at most 255 options");
    if (policy.kind === "choice") {
      for (const option of policy.alwaysReview ?? []) {
        if (!options.includes(option))
          problems.push(`alwaysReview names an undeclared option: ${option}`);
      }
      if (policy.minProbability <= 0 || policy.minProbability > 1)
        problems.push("minProbability must be in (0, 1]");
    }
  }
  if (question.type === "score") {
    if (question.criteria.length < 2 || question.criteria.length > 10)
      problems.push("A score needs 2 to 10 levels");
    if (
      policy.kind === "score" &&
      (policy.minConfidence <= 0 || policy.minConfidence > 1)
    ) {
      problems.push("minConfidence must be in (0, 1]");
    }
  }
  if (question.type === "noul" && policy.kind === "noul") {
    if (!(policy.rejectAtOrBelow < 0.5 && policy.acceptAtOrAbove > 0.5)) {
      problems.push("A noul policy must reject below 0.5 and accept above 0.5");
    }
  }
  return problems;
}

/** Validates at definition time so a bad question fails at import, not in production. */
export function defineQuestion<Q extends QuestionDefinition>(definition: Q): Q {
  const problems = validateQuestion(definition);
  if (problems.length > 0) {
    throw new Error(
      `Invalid question ${definition.key}: ${problems.join("; ")}`,
    );
  }
  return Object.freeze(definition);
}

export function questionRegistry(
  definitions: QuestionDefinition[],
): ReadonlyMap<string, QuestionDefinition> {
  const registry = new Map<string, QuestionDefinition>();
  for (const definition of definitions) {
    if (registry.has(definition.key))
      throw new Error(`Duplicate question key: ${definition.key}`);
    registry.set(definition.key, definition);
  }
  return registry;
}
