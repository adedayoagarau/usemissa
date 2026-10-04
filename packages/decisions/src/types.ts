/**
 * Shapes for Jev (TypeSafe AI) System One requests and responses, and for the
 * versioned questions Missa asks it. Jev never writes text: every answer is a
 * probability over options declared here, so each question carries its own
 * routing policy that turns a probability into apply, review or reject.
 */

export interface NoulQuestion {
  type: "noul";
  instructions: string;
  criteria?: { true: string; false: string };
}

export interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  /** Option id → what the option means. At most 255 options. */
  criteria: Record<string, string>;
}

export interface ScoreQuestion {
  type: "score";
  instructions: string;
  /** Ordered levels, lowest first. Between 2 and 10 levels. */
  criteria: string[];
}

export type JevQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion;
export type QuestionKind = JevQuestion["type"];

export type JevState = string | Record<string, unknown> | unknown[];

export interface NoulAnswer {
  type: "noul";
  noul: number;
}

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface ScoreAnswer {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}

export type JevAnswer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface JevResponse {
  model: string;
  answers: Record<string, JevAnswer>;
  usage?: { input_tokens: number; output_tokens: number };
  elapsed?: number;
}

/**
 * Who may see the state a question sends. Creator-private state (emails,
 * manuscripts, submissions, messages) must never leave Missa until a
 * no-retention agreement with the processor is in place, so the client
 * refuses it unless explicitly allowed.
 */
export type DataClass = "public" | "operational" | "creator-private";

export interface NoulPolicy {
  kind: "noul";
  /** At or above this probability the answer is applied as true. */
  acceptAtOrAbove: number;
  /** At or below this probability the answer is applied as false. */
  rejectAtOrBelow: number;
}

export interface ChoicePolicy {
  kind: "choice";
  /** The chosen option's probability must reach this to apply. */
  minProbability: number;
  /** Options that always go to a person, whatever the probability. */
  alwaysReview?: string[];
}

export interface ScorePolicy {
  kind: "score";
  minConfidence: number;
}

export type RoutingPolicy = NoulPolicy | ChoicePolicy | ScorePolicy;

export interface QuestionDefinition<Q extends JevQuestion = JevQuestion> {
  /** Stable dotted key, e.g. "opportunity.fee_status". */
  key: string;
  /** Bump whenever instructions, criteria or policy change. */
  version: number;
  /** The record type the question is about, e.g. "opportunity". */
  subjectType: string;
  /** Database field the answer fills, when it fills one. */
  fieldName?: string;
  dataClass: DataClass;
  question: Q;
  policy: RoutingPolicy;
}

/** What Missa does with an answer. */
export type DecisionRoute = "apply" | "review" | "reject" | "unavailable";

/**
 * shadow: record the decision, never act on it.
 * live: callers may act when route is apply or reject.
 */
export type DecisionMode = "shadow" | "live";

export interface DecisionOutcome {
  questionKey: string;
  questionVersion: number;
  kind: QuestionKind;
  route: DecisionRoute;
  /** Most likely answer. Noul: "true" or "false". Choice: option id. Score: level label. */
  answer: string | null;
  /** Probability of the reported answer (Noul: probability of true). */
  probability: number | null;
  confidence: number | null;
  distribution: Record<string, number>;
  /** True only in live mode for apply or reject routes. */
  actionable: boolean;
  reason?: string;
}
