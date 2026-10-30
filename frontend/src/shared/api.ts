// Thin client for the LeadScout backend (proxied to :4000 by Vite in development).
// The session is an httpOnly cookie, so requests are same-origin and carry it automatically.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
  }
}

const SERVER_DOWN = "Can't reach the LeadScout server. Make sure the backend is running, then try again.";

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: init.method ?? "GET",
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(SERVER_DOWN, 0, "unreachable");
  }

  // A non-JSON reply means the request never reached the backend (the dev proxy answers when it's down).
  const isJson = response.headers.get("content-type")?.includes("application/json");
  if (!response.ok) {
    if (!isJson) throw new ApiError(SERVER_DOWN, response.status, "unreachable");
    const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new ApiError(body?.message ?? "Something went wrong. Try again.", response.status, body?.error ?? "error");
  }
  if (response.status === 204 || !isJson) return undefined as T;
  return (await response.json()) as T;
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong. Try again.");
