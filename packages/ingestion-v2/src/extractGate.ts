import {
  askOperations,
  confidentNo,
  OperationsUsage,
  visibleText,
  worthExtracting,
  worthExtractingState,
  wouldAct,
  type OperationsDecider,
} from "@missa/decisions";
import type {
  AdapterContext,
  ExtractionResult,
  PageSnapshot,
} from "./contracts.js";
import { destinationConfig } from "./destinations.js";

export const EXTRACT_GATE_SCOPE = "extract_gate";

type ModelFields = ExtractionResult["fields"];

export interface ModelExtractionGate {
  /** Fields to reuse instead of calling the model, or undefined to call it. */
  beforeModel(
    context: AdapterContext,
    snapshot: PageSnapshot,
  ): Promise<ModelFields | undefined>;
  /** Remembers the model's fields for this page so a later pass can reuse them. */
  afterModel(
    context: AdapterContext,
    snapshot: PageSnapshot,
    fields: ModelFields,
  ): void;
  readonly usage: OperationsUsage;
}

interface CachedExtraction {
  contentHash: string;
  text: string;
  fields: ModelFields;
}

/**
 * Asks Jev whether a page re-fetched since its last model extraction states
 * new or changed opportunity facts (scope `extract_gate`). In live mode a
 * confident "no" reuses the earlier model fields, re-pointed at the current
 * snapshot, instead of calling DeepSeek again.
 *
 * Review-mode replays (the candidate replay gate) only reuse fields extracted
 * from byte-identical page content, so every replay pass still rests on a
 * model reading of exactly the text it reports.
 *
 * The earlier extraction is held in memory, bounded by `maxEntries`; after a
 * restart the first pass always calls the model.
 */
export function createJevModelExtractionGate(
  decider: OperationsDecider,
  options: { maxEntries?: number } = {},
): ModelExtractionGate {
  const maxEntries = options.maxEntries ?? 2_000;
  const cache = new Map<string, CachedExtraction>();
  const usage = new OperationsUsage();

  return {
    usage,
    async beforeModel(context, snapshot) {
      const key = context.source.url;
      const previous = cache.get(key);
      if (!previous) {
        usage.made(EXTRACT_GATE_SCOPE);
        return undefined;
      }
      const currentText = visibleText(snapshot.html);
      usage.asked(EXTRACT_GATE_SCOPE);
      const outcomes = await askOperations(decider, EXTRACT_GATE_SCOPE, {
        subjectId: key,
        evidenceUrl: snapshot.finalUrl || key,
        state: worthExtractingState({
          pageRole: destinationConfig(context.source).pageRole ?? "unknown",
          url: snapshot.finalUrl || key,
          previousText: previous.text,
          currentText,
        }),
        questions: [worthExtracting],
      });
      const outcome = outcomes?.[worthExtracting.key];
      const replaySafe =
        context.run.mode !== "review" ||
        previous.contentHash === snapshot.contentHash;
      if (confidentNo(outcome) && replaySafe) {
        usage.skipped(EXTRACT_GATE_SCOPE);
        return previous.fields.map((field) => ({
          ...field,
          provenance: {
            ...field.provenance,
            sourceUrl: snapshot.finalUrl,
            snapshotId: snapshot.id,
          },
        }));
      }
      usage.made(EXTRACT_GATE_SCOPE, wouldAct(outcome, "reject"));
      return undefined;
    },
    afterModel(context, snapshot, fields) {
      const key = context.source.url;
      cache.delete(key);
      cache.set(key, {
        contentHash: snapshot.contentHash,
        text: visibleText(snapshot.html),
        fields,
      });
      while (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
    },
  };
}
