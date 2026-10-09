/** Client-safe playback choices. Generation is an explicit action. */
export type ReadAloudPlan = "free" | "plus" | "pro";
export const READ_ALOUD_MONTHLY_CHARACTERS: Record<ReadAloudPlan, number | null> = { free: 5_000, plus: 100_000, pro: null };
export const READ_ALOUD_MAX_CHARACTERS = 4_000;
export const DEFAULT_READ_ALOUD_VOICE = "af_heart";
export const READ_ALOUD_VOICES = [
  { id: "af_heart", label: "Heart · US English" },
  { id: "af_bella", label: "Bella · US English" },
  { id: "am_michael", label: "Michael · US English" },
  { id: "bf_emma", label: "Emma · British English" },
  { id: "bm_george", label: "George · British English" },
] as const;
export type ReadAloudVoice = (typeof READ_ALOUD_VOICES)[number]["id"];
export type ReadAloudInput = { text: string; voice: ReadAloudVoice; speed: number };

export function parseReadAloudInput(value: unknown): ReadAloudInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.text !== "string" || !input.text.trim() || input.text.length > READ_ALOUD_MAX_CHARACTERS) return null;
  const voice = input.voice ?? DEFAULT_READ_ALOUD_VOICE;
  if (!READ_ALOUD_VOICES.some((item) => item.id === voice)) return null;
  const speed = input.speed ?? 1;
  if (typeof speed !== "number" || !Number.isFinite(speed) || speed < 0.75 || speed > 1.5) return null;
  return { text: input.text, voice: voice as ReadAloudVoice, speed };
}
