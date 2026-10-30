import { config, integrations } from "./config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { DatabaseError, isDatabaseConfigured } from "./db/supabase";
import authRoutes from "./routes/auth";
import clientRoutes from "./routes/client";
import postingsRoutes from "./routes/postings";
import healthRoutes from "./routes/health";
import placesRoutes from "./routes/places";
import seekerRoutes from "./routes/seeker";

const app = express();

app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

/** Accounts and saved data need the database and a JWT secret; say so plainly when they're missing. */
function requireAccountsSetup(_req: Request, res: Response, next: NextFunction) {
  if (!isDatabaseConfigured() || !config.jwtSecret) {
    res.status(503).json({ error: "not-configured", message: "Accounts aren't set up on the server yet (database or JWT secret missing in backend/.env)." });
    return;
  }
  next();
}

app.use("/api/health", healthRoutes);
app.use("/api/places", placesRoutes);
app.use("/api/auth", requireAccountsSetup, authRoutes);
app.use("/api/seeker", requireAccountsSetup, seekerRoutes);
app.use("/api/client", requireAccountsSetup, clientRoutes);
app.use("/api/postings", requireAccountsSetup, postingsRoutes);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "not-found", message: "No such API endpoint." });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if ((err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "bad-request", message: "Request body must be valid JSON." });
    return;
  }
  if (err instanceof DatabaseError) {
    console.error(`Database error (${err.status}):`, err.message);
    if (err.status === 404 && /could not find the table/i.test(err.message)) {
      const marketplace = /business_profiles|postings|applications/.test(err.message);
      res.status(503).json({
        error: "not-configured",
        message: marketplace
          ? "Business postings aren't set up in the database yet. Run backend/src/db/migrations/0004_marketplace.sql in the Supabase SQL Editor."
          : "The database tables haven't been created yet. Run backend/src/db/migrations/0002_supabase_schema.sql in the Supabase SQL Editor.",
      });
      return;
    }
    if (/could not find the '(status|notes|follow_up_on|updated_at)' column/i.test(err.message)) {
      res.status(503).json({ error: "not-configured", message: "The lead tracker isn't set up in the database yet. Run backend/src/db/migrations/0003_lead_tracker.sql in the Supabase SQL Editor." });
      return;
    }
    res.status(503).json({ error: "database", message: "The database didn't respond properly. Try again in a moment." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "server-error", message: "Something went wrong on the server." });
});

app.listen(config.port, () => {
  const status = Object.entries(integrations())
    .map(([name, on]) => `${name}: ${on ? "configured" : "not set"}`)
    .join(", ");
  console.log(`LeadScout API listening on http://localhost:${config.port} (${status}, jwt secret: ${config.jwtSecret ? "set" : "not set"})`);
});
