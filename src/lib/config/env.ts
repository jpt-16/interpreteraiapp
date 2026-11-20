import "server-only";

/**
 * Server-side view of which integrations are configured.
 * Secrets are read only on the server and never sent to clients.
 */
export const GEMINI_MODELS = {
  /** Evaluation: structured JSON with reasoning over meaning units. */
  eval: () => process.env.GEMINI_EVAL_MODEL || "gemini-3.8-flash",
  /** Passage writing for AI-generated exercises. */
  generate: () => process.env.GEMINI_GENERATE_MODEL || process.env.GEMINI_EVAL_MODEL || "gemini-3.8-flash",
  /** Audio → text for recorded renditions. */
  stt: () => process.env.GEMINI_STT_MODEL || process.env.GEMINI_EVAL_MODEL || "gemini-3.8-flash",
  /** Text → speech for source passages. */
  tts: () => process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts",
};

export function integrationStatus() {
  const gemini = Boolean(process.env.GEMINI_API_KEY);
  const evalProvider = (process.env.EVALUATION_PROVIDER ?? "auto").toLowerCase();
  const sttPref = process.env.STT_PROVIDER?.toLowerCase();
  const ttsPref = process.env.TTS_PROVIDER?.toLowerCase();

  const sttProvider =
    sttPref ?? (gemini ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : process.env.DEEPGRAM_API_KEY ? "deepgram" : "device");
  const ttsProvider =
    ttsPref ?? (gemini ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : process.env.ELEVENLABS_API_KEY ? "elevenlabs" : "device");

  const sttReady =
    (sttProvider === "gemini" && gemini) ||
    (sttProvider === "openai" && Boolean(process.env.OPENAI_API_KEY)) ||
    (sttProvider === "deepgram" && Boolean(process.env.DEEPGRAM_API_KEY));
  const ttsReady =
    (ttsProvider === "gemini" && gemini) ||
    (ttsProvider === "openai" && Boolean(process.env.OPENAI_API_KEY)) ||
    (ttsProvider === "elevenlabs" && Boolean(process.env.ELEVENLABS_API_KEY));

  const evalLive = gemini && evalProvider !== "heuristic";
  return {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    evaluation: {
      provider: evalLive ? "gemini" : "demo-heuristic",
      model: evalLive ? GEMINI_MODELS.eval() : null,
      live: evalLive,
    },
    passageGeneration: { live: gemini },
    stt: { provider: sttReady ? sttProvider : "device", live: sttReady },
    tts: { provider: ttsReady ? ttsProvider : "device", live: ttsReady },
    recordingPurge: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.CRON_SECRET),
  };
}

export type IntegrationStatus = ReturnType<typeof integrationStatus>;
