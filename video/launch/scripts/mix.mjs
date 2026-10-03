// Mix a voiceover over a music bed: the music ducks under the voice, fades out
// at the end, and the result is mastered to -14 LUFS (social platform target).
// Usage: node scripts/mix.mjs <voice> <music> <out> [voiceOffsetSeconds=0.5] [musicGainDb=-8] [lengthSeconds=32]
// Requires ffmpeg on PATH.
import { spawnSync } from "node:child_process";

const [voice, music, out, offsetArg = "0.5", gainArg = "-8", lengthArg = "32"] = process.argv.slice(2);
if (!voice || !music || !out) {
  console.error("Usage: node scripts/mix.mjs <voice> <music> <out> [voiceOffset] [musicGainDb] [length]");
  process.exit(1);
}

const delayMs = Math.round(Number(offsetArg) * 1000);
const length = Number(lengthArg);
const fadeStart = Math.max(0, length - 2);

const filter = [
  `[0:a]adelay=${delayMs}|${delayMs},apad,atrim=0:${length},asplit=2[voice][key]`,
  `[1:a]apad,atrim=0:${length},volume=${gainArg}dB,afade=t=in:d=0.4,afade=t=out:st=${fadeStart}:d=2[bed]`,
  // duck the bed by up to ~8 dB while the voice speaks, recovering in the gaps
  `[bed][key]sidechaincompress=threshold=0.02:ratio=5:attack=15:release=350:makeup=1[ducked]`,
  `[ducked][voice]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[out]`,
].join(";");

const result = spawnSync(
  "ffmpeg",
  ["-v", "error", "-y", "-i", voice, "-i", music, "-filter_complex", filter, "-map", "[out]", "-ar", "48000", "-b:a", "256k", out],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
