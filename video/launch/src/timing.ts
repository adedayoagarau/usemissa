/**
 * Voiceover sync map for "Talent's your department".
 *
 * Measured from the waveform of `public/audio/voiceover-script1-storyteller.mp3`
 * (ElevenLabs eleven_v4, voice "Warm, Grounded Storyteller", take 1) with
 * `node scripts/measure-vo.mjs <file> 0.04 0.18` (phrases) and `0.1 0.05`
 * (words inside phrases). Times are seconds inside the audio file; VO_OFFSET
 * shifts them onto the video timeline. Swap the voiceover → re-measure these.
 */
export const FPS = 30;
export const VO_OFFSET = 0.6;
export const DURATION_SECONDS = 33;

export const VOICEOVER_FILE = "audio/voiceover-script1-storyteller.mp3";

const vo = {
  open: 0.15, // "Some people will tell you the art world runs on talent."
  talent: 1.8, //   ...the word "talent"
  helps: 3.4, // "Talent helps."
  mostly: 4.65, // "But mostly…"
  runs: 5.6, // "…it runs on deadlines."
  deadlines: 6.05, //   ...the word "deadlines"
  grant: 7.45, // "Grant deadlines."
  residency: 8.6, // "Residency deadlines."
  magazine: 10.2, // "That magazine that only reads submissions in March."
  march: 12.05, //   ...the word "March"
  missOne: 13.3, // "Miss one,"
  waitYear: 14.1, // "and you wait a year."
  missa: 16.0, // "Missa finds the opportunities"
  fit: 17.5, // "that fit what you make,"
  reminds: 18.75, // "and reminds you"
  closes: 19.8, // "before every one of them closes."
  department: 21.9, // "Talent's your department."
  ours: 23.8, // "Deadlines are ours."
  name: 25.7, // "Missa."
  tagline: 26.65, // "Opportunities for every creator."
  end: 28.3,
} as const;

export type Cue = keyof typeof vo;

/** Video-timeline second at which a spoken cue begins. */
export const cue = (name: Cue): number => vo[name] + VO_OFFSET;

/** Scene windows on the video timeline, in seconds. */
export const scenes = {
  talent: { from: 0, to: cue("mostly") - 0.1 },
  deadlines: { from: cue("mostly") - 0.1, to: cue("missa") - 0.2 },
  missa: { from: cue("missa") - 0.2, to: cue("department") - 0.15 },
  handled: { from: cue("department") - 0.15, to: cue("name") - 0.2 },
  end: { from: cue("name") - 0.2, to: DURATION_SECONDS },
} as const;

/** Burned-in captions: every spoken line, for muted autoplay. */
export const captions: Array<{ text: string; from: Cue; to: Cue | number }> = [
  { text: "Some people will tell you the art world runs on talent.", from: "open", to: "helps" },
  { text: "Talent helps.", from: "helps", to: "mostly" },
  { text: "But mostly, it runs on deadlines.", from: "mostly", to: "grant" },
  { text: "Grant deadlines.", from: "grant", to: "residency" },
  { text: "Residency deadlines.", from: "residency", to: "magazine" },
  { text: "That magazine that only reads submissions in March.", from: "magazine", to: "missOne" },
  { text: "Miss one, and you wait a year.", from: "missOne", to: "missa" },
  { text: "Missa finds the opportunities that fit what you make,", from: "missa", to: "reminds" },
  { text: "and reminds you before every one of them closes.", from: "reminds", to: "department" },
  { text: "Talent's your department.", from: "department", to: "ours" },
  { text: "Deadlines are ours.", from: "ours", to: "name" },
];
