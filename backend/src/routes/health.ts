import { Router } from "express";
import { config, integrations } from "../config";
import { checkDatabase } from "../db/supabase";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

/** Which integrations have keys configured (booleans only — never the keys). */
router.get("/", (_req, res) => {
  res.json({ ok: true, integrations: integrations() });
});

/** Verifies the Supabase URL and secret key. */
router.get(
  "/db",
  asyncHandler(async (_req, res) => {
    res.json({ supabase: await checkDatabase() });
  })
);

type KeyCheck = "not set" | "valid" | "rejected" | "unreachable";

async function checkKey(url: string, headers: Record<string, string>): Promise<KeyCheck> {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    return response.ok ? "valid" : "rejected";
  } catch (error) {
    console.error(`Key check failed for ${new URL(url).host}:`, (error as Error).message);
    return "unreachable";
  }
}

/** Verifies the AI keys with free, metadata-only calls (no model tokens are used). */
router.get(
  "/ai",
  asyncHandler(async (_req, res) => {
    const [gemini, openRouter] = await Promise.all([
      config.geminiKey
        ? checkKey("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { "x-goog-api-key": config.geminiKey })
        : Promise.resolve<KeyCheck>("not set"),
      config.openRouterKey
        ? checkKey("https://openrouter.ai/api/v1/key", { Authorization: `Bearer ${config.openRouterKey}` })
        : Promise.resolve<KeyCheck>("not set"),
    ]);
    res.json({ gemini, openRouter });
  })
);

export default router;
