/**
 * Public-domain poetry lines shown on the 404 page, themed around being
 * lost, found, going home, and the unknown. One is picked deterministically
 * from the broken path, the same way blobatar picks an avatar from it — the
 * same dead link always surfaces the same line.
 */
export type NotFoundPoem = {
  lines: string[];
  attribution: string;
};

export const NOT_FOUND_POEMS: NotFoundPoem[] = [
  { lines: ["I’m Nobody! Who are you?", "Are you – Nobody – too?"], attribution: "Emily Dickinson, “I’m Nobody! Who are you?”" },
  { lines: ["Two roads diverged in a wood, and I—", "I took the one less traveled by,"], attribution: "Robert Frost, “The Road Not Taken”" },
  { lines: ["Does the road wind up-hill all the way?", "Yes, to the very end."], attribution: "Christina Rossetti, “Up-Hill”" },
  { lines: ["I am a part of all that I have met;"], attribution: "Alfred, Lord Tennyson, “Ulysses”" },
  { lines: ["To strive, to seek, to find, and not to yield."], attribution: "Alfred, Lord Tennyson, “Ulysses”" },
  { lines: ["Home is the sailor, home from sea,", "And the hunter home from the hill."], attribution: "Robert Louis Stevenson, “Requiem”" },
  { lines: ["We grow accustomed to the Dark –", "When Light is put away –"], attribution: "Emily Dickinson, “We grow accustomed to the Dark”" },
  { lines: ["I too am not a bit tamed, I too am untranslatable,"], attribution: "Walt Whitman, “Song of Myself”" },
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (Math.imul(hash, 31) + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function pickNotFoundPoem(seed: string): NotFoundPoem {
  const index = hashSeed(seed || "/") % NOT_FOUND_POEMS.length;
  return NOT_FOUND_POEMS[index];
}
