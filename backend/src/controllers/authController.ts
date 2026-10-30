import { Request, Response } from "express";
import { config } from "../config";
import { DatabaseError, rest } from "../db/supabase";
import { hashPassword, verifyPassword } from "../utils/password";
import { signAuthToken, UserDomain } from "../utils/jwt";

export const COOKIE_NAME = "authToken";
const REMEMBER_SECONDS = 30 * 24 * 60 * 60; // "Keep signed in for 30 days"
const SESSION_SECONDS = 12 * 60 * 60; // token lifetime when not remembered (cookie also ends with the browser session)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DOMAIN_LABELS: Record<UserDomain, string> = { client: "Business / Client", provider: "Solution Provider", bi: "Seeker" };

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  organization: string | null;
  domain: UserDomain;
  created_at: string;
}

/** New Seekers search Google Places when the server has a key; the free OpenStreetMap servers are often overloaded. */
export const defaultDataSource = () => (config.googlePlacesKey ? "google" : "osm");

function isValidDomain(value: unknown): value is UserDomain {
  return value === "client" || value === "provider" || value === "bi";
}

function setAuthCookie(res: Response, user: UserRow, remember: boolean) {
  const token = signAuthToken({ userId: user.id, domain: user.domain }, remember ? REMEMBER_SECONDS : SESSION_SECONDS);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: REMEMBER_SECONDS * 1000 } : {}),
  });
}

/** Shape the frontend's User type expects. Never includes the password hash. */
function toPublicUser(user: UserRow) {
  return {
    email: user.email,
    fullName: user.full_name,
    organization: user.organization ?? "",
    domain: user.domain,
    createdAt: user.created_at,
  };
}

async function findByEmail(email: string): Promise<UserRow | undefined> {
  const rows = await rest<UserRow[]>(`users?email=eq.${encodeURIComponent(email)}&select=*`);
  return rows[0];
}

export async function register(req: Request, res: Response) {
  const { email, password, fullName, organization = "", domain, remember = true } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || typeof fullName !== "string" || typeof organization !== "string" || !isValidDomain(domain)) {
    return res.status(400).json({ error: "bad-request", message: "Email, password, full name and a valid workspace are required." });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalizedEmail)) return res.status(400).json({ error: "bad-request", message: "Enter a valid email address." });
  if (password.length < 8 || password.length > 200) return res.status(400).json({ error: "bad-request", message: "Password must be at least 8 characters." });
  if (!fullName.trim()) return res.status(400).json({ error: "bad-request", message: "Enter your full name." });

  if (await findByEmail(normalizedEmail)) {
    return res.status(409).json({ error: "exists", message: "An account with this email already exists. Log in instead." });
  }

  let user: UserRow;
  try {
    const rows = await rest<UserRow[]>("users?select=*", {
      method: "POST",
      prefer: "return=representation",
      body: { email: normalizedEmail, password_hash: await hashPassword(password), full_name: fullName.trim(), organization: organization.trim() || null, domain },
    });
    user = rows[0];
  } catch (error) {
    // Two registrations racing for the same email hit the unique constraint.
    if (error instanceof DatabaseError && error.status === 409) {
      return res.status(409).json({ error: "exists", message: "An account with this email already exists. Log in instead." });
    }
    throw error;
  }

  // Seekers start with a profile seeded from their sign-up details ("Professional title" → title).
  if (user.domain === "bi") {
    await rest("seeker_profiles", {
      method: "POST",
      prefer: "return=minimal",
      body: { user_id: user.id, full_name: user.full_name, title: user.organization ?? "", data_source: defaultDataSource() },
    });
  }

  setAuthCookie(res, user, remember !== false);
  return res.status(201).json(toPublicUser(user));
}

export async function login(req: Request, res: Response) {
  const { email, password, domain, remember = true } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || !isValidDomain(domain)) {
    return res.status(400).json({ error: "bad-request", message: "Email, password and a valid workspace are required." });
  }

  const user = await findByEmail(email.trim().toLowerCase());
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: "invalid-credentials", message: "Incorrect email or password." });
  }
  if (user.domain !== domain) {
    return res.status(403).json({
      error: "wrong-workspace",
      message: `This email is registered as a ${DOMAIN_LABELS[user.domain]} account, not ${DOMAIN_LABELS[domain]}.`,
    });
  }

  setAuthCookie(res, user, remember !== false);
  return res.json(toPublicUser(user));
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME);
  return res.status(204).send();
}

export async function me(req: Request, res: Response) {
  const rows = await rest<UserRow[]>(`users?id=eq.${req.auth!.userId}&select=*`);
  const user = rows[0];
  if (!user) {
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ error: "unauthenticated", message: "Not signed in." });
  }
  return res.json(toPublicUser(user));
}
