/**
 * Voiceover sync map.
 *
 * Phrase boundaries were measured from the waveform of
 * `public/audio/voiceover-temitope.mp3` (ElevenLabs, voice "Temitope",
 * eleven_multilingual_v2): 17 voiced segments, one per scripted phrase.
 * Times are seconds inside the audio file; VO_OFFSET shifts them onto the
 * video timeline. If the voiceover is regenerated, re-measure these and the
 * whole film re-times itself.
 */
export const FPS = 30;
export const VO_OFFSET = 0.5;
export const DURATION_SECONDS = 32;

const vo = {
  grants: 0.05,
  residencies: 0.75,
  prizes: 2.1,
  openCalls: 3.2,
  scattered: 4.65,
  deadline: 7.9, // "each with its own deadline" 7.00-8.50
  fee: 8.8,
  rules: 9.4,
  together: 10.55, // "Missa brings them together." 10.55-11.95
  compare: 12.25,
  openSource: 13.8,
  save: 15.7,
  track: 17.05,
  writers: 19.05,
  painters: 20.1,
  filmmakers: 21.1,
  musicians: 22.05, // "filmmakers and musicians" 21.10-22.85
  missa: 23.6,
  layer: 25.1, // "The opportunity layer for every creator." 25.10-27.55
  end: 27.55,
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
