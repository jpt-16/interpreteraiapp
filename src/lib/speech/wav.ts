/** Wraps raw 16-bit little-endian PCM in a WAV container so every client can play it directly. */
export function pcmToWav(pcm: Uint8Array, sampleRate = 24000, channels = 1): Uint8Array {
  const bytesPerSample = 2;
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const write = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  write(0, "RIFF");
  v.setUint32(4, 36 + pcm.byteLength, true);
  write(8, "WAVE");
  write(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels * bytesPerSample, true);
  v.setUint16(32, channels * bytesPerSample, true);
  v.setUint16(34, 16, true);
  write(36, "data");
  v.setUint32(40, pcm.byteLength, true);
  const out = new Uint8Array(44 + pcm.byteLength);
  out.set(new Uint8Array(header), 0);
  out.set(pcm, 44);
  return out;
}

/** Natural-language pacing hint for TTS models that take style instructions instead of a speed value. */
export function paceInstruction(rate: number) {
  if (rate >= 1.12) return "at a fast, brisk pace";
  if (rate >= 1.04) return "at a slightly quick pace";
  if (rate <= 0.92) return "at a slow, measured pace";
  if (rate <= 0.97) return "at a slightly unhurried pace";
  return "at a natural conversational pace";
}
