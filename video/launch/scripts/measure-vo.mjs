// Print the voiced segments of a voiceover so src/timing.ts can be re-synced.
// Usage: node scripts/measure-vo.mjs public/audio/voiceover.mp3 [thresholdRatio=0.04] [minGap=0.1]
// Requires ffmpeg on PATH. Expect one segment per scripted phrase (17 for the current script).
import { spawnSync } from "node:child_process";

const [file, ratioArg = "0.04", gapArg = "0.1"] = process.argv.slice(2);
if (!file) {
  console.error("Usage: node scripts/measure-vo.mjs <audio> [thresholdRatio] [minGap]");
  process.exit(1);
}

const sampleRate = 16000;
const pcm = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(sampleRate), "-f", "s16le", "-"], {
  maxBuffer: 1 << 28,
}).stdout;
const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));

const window = 800; // 50 ms
const rms = [];
for (let i = 0; i < samples.length; i += window) {
  let sum = 0;
  const end = Math.min(i + window, samples.length);
  for (let j = i; j < end; j++) sum += samples[j] * samples[j];
  rms.push(Math.sqrt(sum / (end - i)));
}

const threshold = Math.max(...rms) * Number(ratioArg);
const segments = [];
let start = null;
rms.forEach((value, index) => {
  const t = (index * window) / sampleRate;
  if (value > threshold && start === null) start = t;
  if (value <= threshold && start !== null) {
    segments.push([start, t]);
    start = null;
  }
});
if (start !== null) segments.push([start, (rms.length * window) / sampleRate]);

const merged = [];
for (const segment of segments) {
  const last = merged.at(-1);
  if (last && segment[0] - last[1] < Number(gapArg)) last[1] = segment[1];
  else merged.push([...segment]);
}

merged.forEach(([a, b], i) => console.log(`${String(i + 1).padStart(2)}  ${a.toFixed(2)} – ${b.toFixed(2)}  (${(b - a).toFixed(2)}s)`));
console.log(`${merged.length} segments, ${(samples.length / sampleRate).toFixed(2)}s total`);
