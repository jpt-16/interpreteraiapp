import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

let client: GoogleGenAI | null = null;

/** Gemini client. The key is read from GEMINI_API_KEY on the server only. */
export function getGemini() {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/** JSON Schema accepted by Gemini's `responseJsonSchema` (no `$schema` key). */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const js = z.toJSONSchema(schema) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

const THINKING_LEVELS = new Set(["MINIMAL", "LOW", "MEDIUM", "HIGH"]);

/**
 * Generates structured JSON and validates it with Zod. Throws if the model
 * returns nothing (e.g. a safety block) or output that does not match.
 */
export async function generateJson<S extends z.ZodType>({
  model,
  system,
  prompt,
  schema,
  maxOutputTokens = 8192,
}: {
  model: string;
  system: string;
  prompt: string;
  schema: S;
  maxOutputTokens?: number;
}): Promise<{ data: z.infer<S>; model: string }> {
  const level = process.env.GEMINI_THINKING_LEVEL?.toUpperCase();
  const res = await getGemini().models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: toGeminiSchema(schema),
      maxOutputTokens,
      // Temperature is left at the model default (recommended for Gemini 3).
      ...(level && THINKING_LEVELS.has(level) ? { thinkingConfig: { thinkingLevel: level as never } } : {}),
    },
  });
  const text = res.text;
  if (!text) {
    throw new Error(`Gemini returned no content (${res.promptFeedback?.blockReason ?? res.candidates?.[0]?.finishReason ?? "unknown"})`);
  }
  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error(`Gemini output did not match the schema: ${parsed.error.message.slice(0, 300)}`);
  return { data: parsed.data, model: res.modelVersion ?? model };
}
