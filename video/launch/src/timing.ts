/**
 * Voiceover sync map for "Talent's your department".
 *
 * Measured from the waveform of `public/audio/voiceover-script1-lyan.mp3`
 * (ElevenLabs eleven_v4, voice "Lyan", take 2 of 4) with
 * `node scripts/measure-vo.mjs <file> 0.04 0.3` (phrases) and `0.1 0.05`
 * (words inside phrases). Times are seconds inside the audio file; VO_OFFSET
 * shifts them onto the video timeline. Swap the voiceover → re-measure these.
 */
export const FPS = 30;
export const VO_OFFSET = 0.6;
export const DURATION_SECONDS = 33;

export const VOICEOVER_FILE = "audio/voiceover-script1-lyan.mp3";

const vo = {
  open: 0.15, // "Some people will tell you the art world runs on talent."
  talent: 2.2, //   ...the word "talent"
  helps: 4.1, // "Talent helps."
  mostly: 5.5, // "But mostly…"
  runs: 6.6, // "…it runs on deadlines."
  deadlines: 7.3, //   ...the word "deadlines"
  grant: 8.5, // "Grant deadlines."
  residency: 9.8, // "Residency deadlines."
  magazine: 11.5, // "That magazine that only reads submissions in March."
  march: 13.65, //   ...the word "March"
  missOne: 14.8, // "Miss one,"
  waitYear: 15.75, // "and you wait a year."
  missa: 17.3, // "Missa finds the opportunities"
  fit: 18.95, // "that fit what you make,"
  reminds: 20.45, // "and reminds you"
  closes: 21.25, // "before every one of them closes."
  department: 23.4, // "Talent's your department."
  ours: 25.1, // "Deadlines are ours."
  name: 26.9, // "Missa."
  tagline: 27.75, // "Opportunities for every creator."
  end: 29.7,
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
