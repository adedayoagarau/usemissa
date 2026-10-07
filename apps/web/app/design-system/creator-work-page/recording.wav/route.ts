/**
 * A few seconds of quiet tone for the work page review, so a recording can be
 * played without an upload. Generated, so nothing binary is stored.
 */
export function GET() {
  const rate = 8000;
  const seconds = 6;
  const samples = rate * seconds;
  const data = Buffer.alloc(44 + samples * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + samples * 2, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); // PCM
  data.writeUInt16LE(1, 22); // mono
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(samples * 2, 40);
  for (let at = 0; at < samples; at++) {
    const fade = Math.min(1, at / 800, (samples - at) / 800);
    data.writeInt16LE(
      Math.round(Math.sin((2 * Math.PI * 196 * at) / rate) * 2400 * fade),
      44 + at * 2,
    );
  }
  return new Response(data, {
    headers: {
      "content-type": "audio/wav",
      "cache-control": "public, max-age=3600",
    },
  });
}
