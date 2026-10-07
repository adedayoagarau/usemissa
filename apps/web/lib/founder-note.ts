/**
 * The founder's note on About, in the founder's own words. The section stays
 * off the page while this is null, so nothing placeholder ever ships. See
 * docs/founder-note.md for the prompts and the rules.
 */
export type FounderNote = {
  /** Plain paragraphs, first person. */
  paragraphs: string[];
  /** The name the note is signed with. */
  name: string;
  /** One line under the name, for example "Founder, Missa". */
  role: string;
};

export const founderNote: FounderNote | null = null;
