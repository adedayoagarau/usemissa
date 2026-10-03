import type { ManuscriptMatchInput } from "@missa/radar-adapters";

/** What the writer describes; shared by the server's first match and the form. */
export interface ManuscriptBrief {
  genre: ManuscriptMatchInput["genre"];
  wordCount: number;
  poemCount: number;
  aestheticTags: string[];
  compAuthors: string[];
  isDebutAuthor: boolean;
  allowSimultaneous: boolean;
  feeTolerance: NonNullable<ManuscriptMatchInput["feeTolerance"]>;
  minPayRate: NonNullable<ManuscriptMatchInput["minPayRate"]>;
}

export const DEFAULT_MANUSCRIPT_BRIEF: ManuscriptBrief = {
  genre: "fiction",
  wordCount: 3500,
  poemCount: 3,
  aestheticTags: ["fabulist", "lyric"],
  compAuthors: ["Carmen Maria Machado"],
  isDebutAuthor: true,
  allowSimultaneous: true,
  feeTolerance: "free_only",
  minPayRate: "all",
};

export function manuscriptMatchPayload(
  brief: ManuscriptBrief,
): ManuscriptMatchInput {
  const poetry = brief.genre === "poetry";
  return {
    genre: brief.genre,
    wordCount: poetry ? undefined : brief.wordCount,
    poemCount: poetry ? brief.poemCount : undefined,
    aestheticTags: brief.aestheticTags,
    compAuthors: brief.compAuthors,
    isDebutAuthor: brief.isDebutAuthor,
    allowSimultaneous: brief.allowSimultaneous,
    feeTolerance: brief.feeTolerance,
    minPayRate: brief.minPayRate,
  };
}
