import { inputHash } from "./hash.js";
import type { JevClient } from "./jevClient.js";
import { decisionRecordFromOutcome, type DecisionLedger } from "./ledger.js";
import { routeAnswer, unavailableOutcome } from "./routing.js";
import type {
  DecisionMode,
  DecisionOutcome,
  JevQuestion,
  JevState,
  QuestionDefinition,
} from "./types.js";

export interface DecideInput {
  client: JevClient;
  /** Omit to decide without recording (previews, tests). */
  ledger?: DecisionLedger;
  mode: DecisionMode;
  subjectId: string;
  state: JevState;
  questions: QuestionDefinition[];
  evidenceUrl?: string | null;
}

export interface DecideResult {
  /** Keyed by question key. */
  outcomes: Record<string, DecisionOutcome>;
  model: string | null;
  inputHash: string;
  error?: string;
}

/**
 * Asks every question about one record in a single Jev call, routes each
 * answer by its own policy and records the result. Never throws for Jev
 * failures: outcomes come back "unavailable" so callers keep their current
 * behaviour.
 */
export async function decide(input: DecideInput): Promise<DecideResult> {
  const hash = inputHash(input.state);
  const outcomes: Record<string, DecisionOutcome> = {};
  const sendable: QuestionDefinition[] = [];

  for (const definition of input.questions) {
    if (outcomes[definition.key])
      throw new Error(`Question asked twice: ${definition.key}`);
    if (!input.client.available) {
      outcomes[definition.key] = unavailableOutcome(
        definition,
        "Jev is not configured",
      );
    } else if (!input.client.canSend(definition.dataClass)) {
      outcomes[definition.key] = unavailableOutcome(
        definition,
        "Creator-private data may not be sent to Jev",
      );
    } else {
      sendable.push(definition);
      outcomes[definition.key] = unavailableOutcome(definition, "Pending");
    }
  }
  if (sendable.length === 0) return { outcomes, model: null, inputHash: hash };

  const questions: Record<string, JevQuestion> = {};
  const idFor = new Map<string, string>();
  sendable.forEach((definition, index) => {
    const id = `q${index}`;
    idFor.set(definition.key, id);
    questions[id] = definition.question;
  });

  let response;
  try {
    response = await input.client.evaluate(input.state, questions);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    for (const definition of sendable) {
      outcomes[definition.key] = unavailableOutcome(definition, message);
    }
    return { outcomes, model: null, inputHash: hash, error: message };
  }

  for (const definition of sendable) {
    outcomes[definition.key] = routeAnswer(
      definition,
      response.answers[idFor.get(definition.key)!],
      input.mode,
    );
  }

  if (input.ledger) {
    const usage = response.usage
      ? { ...response.usage, questions: sendable.length }
      : null;
    const records = sendable
      .filter((definition) => outcomes[definition.key]!.route !== "unavailable")
      .map((definition) =>
        decisionRecordFromOutcome({
          definition,
          outcome: outcomes[definition.key]!,
          subjectId: input.subjectId,
          inputHash: hash,
          mode: input.mode,
          model: response.model,
          evidenceUrl: input.evidenceUrl,
          usage,
        }),
      );
    try {
      await input.ledger.record(records);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        outcomes,
        model: response.model,
        inputHash: hash,
        error: `Ledger write failed: ${message}`,
      };
    }
  }

  return { outcomes, model: response.model, inputHash: hash };
}

/** Reads DECISIONS_MODE_<KEY> or DECISIONS_MODE; anything but "live" is shadow. */
export function decisionModeFromEnv(
  scope: string,
  env: Record<string, string | undefined> = process.env,
): DecisionMode {
  const scoped =
    env[`DECISIONS_MODE_${scope.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`];
  return (scoped ?? env.DECISIONS_MODE) === "live" ? "live" : "shadow";
}
