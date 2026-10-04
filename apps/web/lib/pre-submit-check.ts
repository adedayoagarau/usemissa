/**
 * Pre-submit check: what Missa can honestly verify before a creator sends an
 * application, and what it cannot. Every check is Passed, Needs attention, or
 * Check manually; nothing unverified is reported as passed.
 */
export type PreSubmitMaterial = {
  kind: "work" | "answer" | "file";
  id: string;
  /** Requirement the material is linked to, when known. */
  requirement?: string;
  title: string;
  /** Text Missa holds: a saved answer, or a Work description. */
  text?: string;
  fileName?: string;
  mimeType?: string;
};

export type PreSubmitInput = {
  requirements: Array<{
    label: string;
    state: "missing" | "ready" | "complete";
    linked: boolean;
  }>;
  wordLimit?: { max: number; confidence: "confirmed" | "probable" | "unknown" };
  pageLimit?: { max: number; confidence: "confirmed" | "probable" | "unknown" };
  blindReview: boolean;
  /** Names that would identify the creator: display, given, family. */
  names: string[];
  materials: PreSubmitMaterial[];
};

export type PreSubmitCheck = {
  id: "materials" | "word-limit" | "page-limit" | "anonymity" | "file-types";
  label: string;
  status: "passed" | "attention" | "manual";
  detail: string;
  items?: string[];
};

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

const confidenceNote = (confidence: string) =>
  confidence === "confirmed"
    ? ""
    : " This limit comes from the listing; confirm it in the guidelines.";

function nameMatchers(names: string[]): RegExp[] {
  return [
    ...new Set(
      names.map((name) => name.trim()).filter((name) => name.length >= 3),
    ),
  ].map(
    (name) =>
      new RegExp(
        `(^|[^\\p{L}])${name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}($|[^\\p{L}])`,
        "iu",
      ),
  );
}

export function preSubmitChecks(input: PreSubmitInput): PreSubmitCheck[] {
  const checks: PreSubmitCheck[] = [];

  if (!input.requirements.length) {
    checks.push({
      id: "materials",
      label: "Required materials",
      status: "manual",
      detail:
        "No requirements are recorded for this call. Check the official guidelines.",
    });
  } else {
    const missing = input.requirements.filter(
      (item) => item.state === "missing",
    );
    checks.push(
      missing.length
        ? {
            id: "materials",
            label: "Required materials",
            status: "attention",
            detail: `${missing.length} of ${input.requirements.length} not ready yet.`,
            items: missing.map((item) => item.label),
          }
        : {
            id: "materials",
            label: "Required materials",
            status: "passed",
            detail: `All ${input.requirements.length} marked ready.`,
          },
    );
  }

  const texts = input.materials.filter((material) => material.text?.trim());
  const files = input.materials.filter(
    (material) => material.kind === "file" || material.fileName,
  );
  if (input.wordLimit) {
    const over = texts
      .map((material) => ({ material, words: countWords(material.text!) }))
      .filter(({ words }) => words > input.wordLimit!.max);
    const note = confidenceNote(input.wordLimit.confidence);
    if (over.length)
      checks.push({
        id: "word-limit",
        label: `Word limit · ${input.wordLimit.max}`,
        status: "attention",
        detail: `Over the limit.${note}`,
        items: over.map(
          ({ material, words }) => `${material.title}: ${words} words`,
        ),
      });
    else if (texts.length && !files.length)
      checks.push({
        id: "word-limit",
        label: `Word limit · ${input.wordLimit.max}`,
        status: "passed",
        detail: `Saved text is within the limit.${note}`,
      });
    else
      checks.push({
        id: "word-limit",
        label: `Word limit · ${input.wordLimit.max}`,
        status: "manual",
        detail: `${texts.length ? "Saved text is within the limit. " : ""}Missa doesn't count words inside files yet.${note}`,
      });
  }

  if (input.pageLimit)
    checks.push({
      id: "page-limit",
      label: `Page limit · ${input.pageLimit.max}`,
      status: "manual",
      detail: `Missa doesn't count pages yet. Check each file before you upload it.${confidenceNote(input.pageLimit.confidence)}`,
    });

  if (input.blindReview) {
    const matchers = nameMatchers(input.names);
    const found: string[] = [];
    for (const material of input.materials) {
      const places = [
        material.title ? ["title", material.title] : null,
        material.fileName ? ["file name", material.fileName] : null,
        material.text ? ["text", material.text] : null,
      ].filter((place): place is string[] => Boolean(place));
      for (const [where, value] of places)
        if (matchers.some((matcher) => matcher.test(value)))
          found.push(`${material.title}: your name is in the ${where}`);
    }
    checks.push(
      found.length
        ? {
            id: "anonymity",
            label: "Anonymous review",
            status: "attention",
            detail:
              "This call appears to read submissions anonymously. Remove your name before submitting.",
            items: found,
          }
        : {
            id: "anonymity",
            label: "Anonymous review",
            status: files.length ? "manual" : "passed",
            detail: files.length
              ? "No name found in titles, file names, or saved text. Missa can't read inside files yet: check headers, footers, and document properties."
              : "No name found in titles or saved text.",
          },
    );
  }

  if (files.length)
    checks.push({
      id: "file-types",
      label: "File types",
      status: "manual",
      detail:
        "This call's accepted file types aren't recorded. Check the guidelines.",
      items: files.map(
        (file) =>
          `${file.fileName ?? file.title}${file.mimeType ? ` · ${file.mimeType}` : ""}`,
      ),
    });

  return checks;
}
