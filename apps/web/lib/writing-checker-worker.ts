import {
  LocalLinter,
  createBinaryModuleFromUrl,
  SuggestionKind,
  Dialect,
} from "harper.js";
import type { WritingCheck, WritingCheckPreferences } from "./writing-checker";

type Request = { id: number; kind: "setup" | "check"; text: string; preferences?: WritingCheckPreferences };
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage(
    value:
      { id: number; checks: WritingCheck[] } | { id: number; error: string },
  ): void;
};

// LocalLinter is local to this dedicated worker, never the browser's UI thread.
const binary = createBinaryModuleFromUrl(
  new URL("./harper_wasm_slim_bg.wasm", import.meta.url).href,
  "slim",
);
let linter: LocalLinter | undefined;
let queue = Promise.resolve();

async function check(text: string, preferences?: WritingCheckPreferences): Promise<WritingCheck[]> {
  if (!linter) throw new Error("The writing checker has not started.");
  if (!text) return [];
  await linter.setDialect((preferences?.dialect ?? Dialect.American) as Dialect);
  await linter.clearWords();
  await linter.importWords(preferences?.words ?? []);
  const config = await linter.getDefaultLintConfig();
  for (const rule of preferences?.disabledRules ?? []) if (rule in config) config[rule] = false;
  await linter.setLintConfig(config);
  await linter.clearIgnoredLints();
  for (const hash of preferences?.ignoredHashes ?? []) if (/^\d+$/.test(hash)) await linter.ignoreLintHash(BigInt(hash));
  const groups = await linter.organizedLints(text, { language: "plaintext" });
  const lints = Object.values(groups).flat();
  const results: WritingCheck[] = [];
  try {
    for (const [rule, group] of Object.entries(groups)) {
      for (const lint of group) {
        const hash = (await linter.contextHash(text, lint)).toString();
        if (preferences?.ignoredHashes.includes(hash)) continue;
        const span = lint.span();
        let start: number;
        let end: number;
        try {
          // harper.js 2.10 spans are already UTF-16 (verified against its problem text).
          start = span.start;
          end = span.end;
        } finally {
          span.free();
        }
        if (start === undefined || end === undefined || end < start) {
          throw new Error(
            "The writing checker returned an invalid text range.",
          );
        }
        const original = text.slice(start, end);
        if (original !== lint.get_problem_text()) {
          throw new Error("The writing checker returned a mismatched text range.");
        }
        const suggestions = lint.suggestions();
        const replacements: string[] = [];
        try {
          for (const suggestion of suggestions) {
            const kind = suggestion.kind();
            const replacement =
              kind === SuggestionKind.Remove
                ? ""
                : kind === SuggestionKind.InsertAfter
                  ? original + suggestion.get_replacement_text()
                  : suggestion.get_replacement_text();
            if (!replacements.includes(replacement))
              replacements.push(replacement);
          }
        } finally {
          for (const suggestion of suggestions) suggestion.free();
        }
        results.push({
          start,
          end,
          message: lint.message(),
          replacements,
          rule,
          hash,
        });
      }
    }
    return results.sort((a, b) => a.start - b.start || a.end - b.end);
  } finally {
    for (const lint of lints) lint.free();
  }
}

scope.onmessage = ({ data }) => {
  // One active request keeps linter state and WASM allocations isolated.
  queue = queue.then(async () => {
    try {
      if (data.kind === "setup") {
        linter = new LocalLinter({ binary });
        await linter.setup();
        scope.postMessage({ id: data.id, checks: [] });
      } else {
        scope.postMessage({ id: data.id, checks: await check(data.text, data.preferences) });
      }
    } catch (error) {
      scope.postMessage({
        id: data.id,
        error:
          error instanceof Error ? error.message : "Writing checks failed.",
      });
    }
  });
};
