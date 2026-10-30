import { config } from "../config";

// Gemini via the REST API (no SDK). Models are tried in order: the first is preferred; the others take over when
// it is overloaded (503), rate-limited (429) or unavailable to this key (404/400).
const MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"];
const ENDPOINT = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export class AiUnavailableError extends Error {}

export const isAiConfigured = () => Boolean(config.geminiKey);

/** Asks Gemini for JSON matching `schema` (OpenAPI subset). Returns the parsed object and the model that answered. */
export async function generateJson<T>(prompt: string, schema: object, maxOutputTokens = 800): Promise<{ data: T; model: string }> {
  if (!config.geminiKey) throw new AiUnavailableError("AI analysis isn't set up on the server (GEMINI_API_KEY missing).");

  let lastProblem = "no model answered";
  for (const model of MODELS) {
    let response: globalThis.Response;
    try {
      response = await fetch(ENDPOINT(model), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: schema, maxOutputTokens, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      lastProblem = `${model}: ${(error as { cause?: { code?: string } }).cause?.code ?? (error as Error).message}`;
      continue;
    }

    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      lastProblem = `${model}: HTTP ${response.status} ${detail?.error?.message ?? ""}`.trim();
      console.error("Gemini:", lastProblem);
      if ([400, 404, 429, 500, 503].includes(response.status)) continue;
      break; // 401/403: the key itself is the problem; other models won't help
    }

    const body = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    try {
      return { data: JSON.parse(text) as T, model };
    } catch {
      lastProblem = `${model}: reply wasn't valid JSON`;
      console.error("Gemini:", lastProblem);
    }
  }
  throw new AiUnavailableError(`The AI service didn't answer (${lastProblem}).`);
}
