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
  { lines: ["I wandered lonely as a cloud", "That floats on high o’er vales and hills,"], attribution: "William Wordsworth, “I Wandered Lonely as a Cloud”" },
  { lines: ["The woods are lovely, dark and deep,", "But I have promises to keep,"], attribution: "Robert Frost, “Stopping by Woods on a Snowy Evening”" },
  { lines: ["Nothing beside remains. Round the decay", "Of that colossal wreck, boundless and bare", "The lone and level sands stretch far away."], attribution: "Percy Bysshe Shelley, “Ozymandias”" },
  { lines: ["And we are here as on a darkling plain", "Swept with confused alarms of struggle and flight,", "Where ignorant armies clash by night."], attribution: "Matthew Arnold, “Dover Beach”" },
  { lines: ["Turning and turning in the widening gyre", "The falcon cannot hear the falconer;", "Things fall apart; the centre cannot hold;"], attribution: "William Butler Yeats, “The Second Coming”" },
  { lines: ["Was it a vision, or a waking dream?", "Fled is that music:—Do I wake or sleep?"], attribution: "John Keats, “Ode to a Nightingale”" },
  { lines: ["“Ride, boldly ride,”", "The shade replied,—", "“If you seek for Eldorado!”"], attribution: "Edgar Allan Poe, “Eldorado”" },
  { lines: ["Afoot and light-hearted I take to the open road,", "Healthy, free, the world before me,"], attribution: "Walt Whitman, “Song of the Open Road”" },
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
