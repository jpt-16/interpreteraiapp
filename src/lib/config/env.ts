import "server-only";

/**
 * Server-side view of which integrations are configured.
 * Secrets are read only here (and in the adapters) and never sent to the client.
 */
export function integrationStatus() {
  const anthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const evalProvider = (process.env.EVALUATION_PROVIDER ?? "auto").toLowerCase();
  const sttProvider = process.env.STT_PROVIDER?.toLowerCase() ?? (process.env.OPENAI_API_KEY ? "openai" : process.env.DEEPGRAM_API_KEY ? "deepgram" : "browser");
  const ttsProvider = process.env.TTS_PROVIDER?.toLowerCase() ?? (process.env.ELEVENLABS_API_KEY ? "elevenlabs" : process.env.OPENAI_API_KEY ? "openai" : "browser");

  const sttReady =
    (sttProvider === "openai" && Boolean(process.env.OPENAI_API_KEY)) ||
    (sttProvider === "deepgram" && Boolean(process.env.DEEPGRAM_API_KEY));
  const ttsReady =
    (ttsProvider === "openai" && Boolean(process.env.OPENAI_API_KEY)) ||
    (ttsProvider === "elevenlabs" && Boolean(process.env.ELEVENLABS_API_KEY));

  return {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    evaluation: {
      provider: evalProvider === "heuristic" || !anthropic ? "demo-heuristic" : "anthropic",
      model: anthropic && evalProvider !== "heuristic" ? evalModel() : null,
      live: anthropic && evalProvider !== "heuristic",
    },
    passageGeneration: { live: anthropic },
    stt: { provider: sttReady ? sttProvider : "browser", live: sttReady },
    tts: { provider: ttsReady ? ttsProvider : "browser", live: ttsReady },
    recordingPurge: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.CRON_SECRET),
  };
}

export type IntegrationStatus = ReturnType<typeof integrationStatus>;

export function evalModel() {
  return process.env.ANTHROPIC_EVAL_MODEL || "claude-opus-5-5";
}
