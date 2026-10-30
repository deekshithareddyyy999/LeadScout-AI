import "dotenv/config";

// Every integration is optional so the server starts with an empty .env; endpoints report what's missing.
// Secrets are read here only and must never be sent to the browser or written to logs.
// Keys belong in backend/.env — never paste a key value into this file.
const optional = (name: string) => process.env[name]?.trim() || null;

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  // Supabase Data API over HTTPS. Used instead of a direct Postgres connection, which some networks block.
  supabaseUrl: optional("SUPABASE_URL")?.replace(/\/+$/, "") ?? null,
  supabaseSecretKey: optional("SUPABASE_SECRET_KEY"),
  // Signs the httpOnly session cookie.
  jwtSecret: optional("JWT_SECRET"),
  googlePlacesKey: optional("GOOGLE_PLACES_API_KEY"),
  geminiKey: optional("GEMINI_API_KEY"),
  openRouterKey: optional("OPENROUTER_API_KEY"),
};

export const integrations = () => ({
  supabase: Boolean(config.supabaseUrl && config.supabaseSecretKey),
  googlePlaces: Boolean(config.googlePlacesKey),
  gemini: Boolean(config.geminiKey),
  openRouter: Boolean(config.openRouterKey),
});
