/**
 * Voiceover sync map.
 *
 * Measured from the waveform of `public/audio/voiceover-temitope-v4.mp3`
 * (ElevenLabs, voice "Temitope", eleven_v4 with audio tags, take D) using
 * `node scripts/measure-vo.mjs <file> 0.1 0.04`. Times are seconds inside the
 * audio file; VO_OFFSET shifts them onto the video timeline. If the
 * voiceover is regenerated, re-measure these and the whole film re-times
 * itself.
 */
export const FPS = 30;
export const VO_OFFSET = 0.5;
export const DURATION_SECONDS = 32;

export const VOICEOVER_FILE = "audio/voiceover-temitope-v4.mp3";

const vo = {
  grants: 0.2,
  residencies: 1.3,
  prizes: 2.5,
  openCalls: 3.55,
  scattered: 5.15, // [sighs] at 5.15, "They're scattered across the internet" 5.60-7.35
  deadline: 8.7, // "each with its own" 7.85, "deadline" 8.70
  fee: 9.5,
  rules: 9.9,
  together: 11.2, // "Missa" 11.20, "brings them together" 11.85-12.90
  compare: 13.25,
  openSource: 14.65,
  save: 16.35,
  track: 17.8,
  writers: 19.5, // "For writers" 19.50-20.30
  painters: 20.45,
  filmmakers: 21.2,
  musicians: 22.2, // "and musicians" 21.95-22.80
  missa: 23.35,
  layer: 24.2, // "The opportunity layer" 24.20-25.35, "for EVERY creator." 25.75-26.75
  forEvery: 25.75,
  end: 26.75,
} as const;

export type Cue = keyof typeof vo;

/** Video-timeline second at which a spoken cue begins. */
export const cue = (name: Cue): number => vo[name] + VO_OFFSET;

/** Scene windows on the video timeline, in seconds. */
export const scenes = {
  categories: { from: 0, to: cue("scattered") + 0.15 },
  scattered: { from: cue("scattered") + 0.15, to: cue("together") - 0.1 },
  product: { from: cue("together") - 0.1, to: cue("writers") - 0.25 },
  creators: { from: cue("writers") - 0.25, to: cue("missa") - 0.15 },
  end: { from: cue("missa") - 0.15, to: DURATION_SECONDS },
} as const;
