import { config } from "../config";

// Minimal client for the Supabase Data API (PostgREST) using the server-only secret key.
// The secret key bypasses Row Level Security, so it must never leave the backend.
// Docs: https://supabase.com/docs/guides/api

export class DatabaseError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export const isDatabaseConfigured = () => Boolean(config.supabaseUrl && config.supabaseSecretKey);

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const key = config.supabaseSecretKey as string;
  const base: Record<string, string> = { apikey: key, "Content-Type": "application/json", ...extra };
  // Legacy service_role keys are JWTs and must also be sent as a bearer token; new sb_secret_ keys go in `apikey` only.
  if (key.startsWith("eyJ")) base.Authorization = `Bearer ${key}`;
  return base;
}

/** Calls `${SUPABASE_URL}/rest/v1/${path}` and returns parsed JSON (or null for empty replies). */
export async function rest<T>(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
  if (!isDatabaseConfigured()) throw new DatabaseError("Database isn't configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY to backend/.env.", 503);
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers: headers(init.prefer ? { Prefer: init.prefer } : {}),
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  if (!response.ok) {
    const detail = (() => {
      try {
        return (JSON.parse(text) as { message?: string }).message;
      } catch {
        return undefined;
      }
    })();
    throw new DatabaseError(detail ?? `Supabase returned ${response.status}`, response.status);
  }
  return (text ? JSON.parse(text) : null) as T;
}

/** Verifies the URL and key with a metadata-only request. */
export async function checkDatabase(): Promise<"not set" | "valid" | "rejected" | "unreachable"> {
  if (!isDatabaseConfigured()) return "not set";
  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/`, { headers: headers(), signal: AbortSignal.timeout(10_000) });
    return response.ok ? "valid" : "rejected";
  } catch (error) {
    console.error("Supabase check failed:", (error as { cause?: { code?: string } }).cause?.code ?? (error as Error).message);
    return "unreachable";
  }
}
